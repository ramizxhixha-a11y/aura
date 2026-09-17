// [ATTRIBUTION PAR SOURCE · 17/09/2026] VERSION 20260917f
// ═══ PHASE 2 · A2 BUS D'INTELLIGENCE + A5 ATTRIBUTION PAR SOURCE DE DONNÉES ═══
// Question à laquelle ce module répond, et à laquelle rien ne répondait : QUELLE DONNÉE rapporte de l'argent ?
// L'attribution livrée le 16/09 (`20260916d`) pèse les SIÈGES (qui vote bien sur quelle paire, dans quel régime).
// Celle-ci mesure les SOURCES : le composite technique (14 indicateurs), le prix (scouts sur bougies), le flux
// d'ordres et le carnet Binance, les news, le fondamental, les figures harmoniques. Deux sièges peuvent lire la même
// donnée ; une source peut être excellente sur BTC et nuisible sur PEPE.
//
// LECTURE SEULE : aucune décision ne lit S.attribution. Ce module n'ouvre, ne ferme et ne pondère rien. Il enregistre.
// Quand la mesure aura du volume (quelques centaines de trades), elle pourra devenir un poids — sur décision de Rams.
//
// A2 · le bus : à chaque analyse d'une paire (03, après la publication de ps.roster), _intelPublish range ce que
// CHAQUE SOURCE disait à cet instant (score agrégé de ses sièges, pondéré par leur poids dans le consensus) dans un
// anneau horodaté ps.intelLog (40 derniers, RAM seulement, jamais sauvegardé).
// A5 · l'attribution : à la clôture (02 closePosition, le seul entonnoir), _attributionRecord retrouve dans l'anneau
// ce que les sources disaient À L'OUVERTURE de la position, et crédite chaque source du P&L réalisé si son score
// était du bon côté, le débite sinon. S.attribution[src][mode] = { n, wins, sumPnl, sumAbs } — persisté (09b1/09b2).
'use strict';

// Quelle source chaque siège lit vraiment (état du 17/09/2026, après 1b-b et le flux Binance A14).
// Les 7 conseillers ne sont PAS des sources : ils mélangent les scouts et le composite technique — les compter
// ferait voter deux fois la même donnée.
var INTEL_SOURCES = {
  technique:   ['__tech'],                                                   // getTechSignals : 14 indicateurs sur les klines (atScore)
  prix:        ['sentiment_v2', 'volatility_v1', 'corr_v1', 'geopolitic_v1', 'onchain_v1', 'breakout_v1'],   // dérivés des bougies
  flux:        ['flow_v1', 'whale_v1'],                                      // @trade (quantité + côté preneur) + carnet depth
  volume:      ['volume_v1'],                                                // volume réel des klines
  news:        ['nlp_v1'],                                                   // 10e7-news-nlp
  fondamental: ['macro_v1', 'fundamental_v1'],                               // neutralisés S3 — mesurés quand même
  harmonique:  ['harmonic_v1']                                               // figures (06)
};
var INTEL_KEEP = 40;   // ~40 analyses par paire : couvre largement la vie d'une position

// A2 — range l'état des sources pour une paire. votes : { id: {vote|score} } ; weights : { id: {w} } (ps.roster).
function _intelPublish(pair, votes, weights, atScore) {
  try {
    if (typeof S === 'undefined' || !S || !S.pairStates) return null;
    var ps = S.pairStates[pair]; if (!ps) return null;
    var bySrc = {};
    Object.keys(INTEL_SOURCES).forEach(function (src) {
      var ids = INTEL_SOURCES[src], sum = 0, wsum = 0;
      ids.forEach(function (id) {
        if (id === '__tech') { if (isFinite(atScore)) { sum += Number(atScore); wsum += 1; } return; }
        var v = votes ? votes[id] : null; if (!v) return;
        var sc = Number(v.score); if (!isFinite(sc)) sc = Number(v.vote);
        if (!isFinite(sc)) return;
        var w = (weights && weights[id] && isFinite(weights[id].w)) ? Number(weights[id].w) : 1;
        sum += sc * w; wsum += Math.abs(w);
      });
      if (wsum > 0) bySrc[src] = Math.max(-1, Math.min(1, sum / wsum));
    });
    if (!Object.keys(bySrc).length) return null;
    var log = ps.intelLog || (ps.intelLog = []);
    log.push({ t: Date.now(), s: bySrc });
    if (log.length > INTEL_KEEP) log.splice(0, log.length - INTEL_KEEP);
    ps.intel = { t: log[log.length - 1].t, s: bySrc };   // dernier état, pour lecture directe
    return bySrc;
  } catch (e) { return null; }
}

// Ce que les sources disaient à l'instant ts (± 15 min) pour cette paire ; sans ts, le dernier état connu.
// Attention : isFinite(null) vaut TRUE en JS (Number(null) = 0) — un ts absent doit être testé explicitement, sinon
// « instant 0 » serait comparé à l'anneau et ne trouverait jamais rien (défaut trouvé par le banc, 17/09).
function _intelRead(pair, ts) {
  try {
    var ps = (S && S.pairStates) ? S.pairStates[pair] : null; if (!ps) return null;
    var log = ps.intelLog || [];
    if (!log.length) return null;
    if (ts === null || ts === undefined || !isFinite(ts) || Number(ts) <= 0) return log[log.length - 1].s;
    var best = null, bestD = Infinity;
    log.forEach(function (e) { var d = Math.abs(e.t - ts); if (d < bestD) { bestD = d; best = e; } });
    return (best && bestD <= 900000) ? best.s : null;
  } catch (e) { return null; }
}

// A5 — à la clôture : crédite chaque source selon ce qu'elle disait à l'ouverture.
// pnlPct : P&L réalisé en % (signé). Retourne le nombre de sources créditées, 0 si l'ouverture n'est pas retrouvée.
function _attributionRecord(pos, pnlPct) {
  try {
    if (!pos || !isFinite(pnlPct)) return 0;
    var mode = (typeof S !== 'undefined' && S && S.tradingMode) ? S.tradingMode : 'sim';
    if (mode === 'sim') return 0;                      // [ÉCOLE 17/09] l'AA ne note pas : bougies fabriquées
    // L'attribution exige l'instant d'OUVERTURE : sans lui, on créditerait les sources pour un avis qu'elles
    // n'avaient pas encore. Une position sans horodatage n'est donc pas attribuée du tout.
    var openTs = Number(pos.openedAt || pos.entryTs || 0);
    if (!isFinite(openTs) || openTs <= 0) return 0;
    var snap = _intelRead(pos.pair, openTs);
    if (!snap) return 0;
    var isLong = pos.side === 'long', n = 0;
    if (!S.attribution) S.attribution = {};
    Object.keys(snap).forEach(function (src) {
      var sc = Number(snap[src]);
      if (!isFinite(sc) || Math.abs(sc) < 0.05) return;   // une source sans avis n'est ni créditée ni punie
      var aligned = (sc > 0) === isLong;
      var signed = aligned ? pnlPct : -pnlPct;
      var bucket = S.attribution[src] || (S.attribution[src] = {});
      var b = bucket[mode] || (bucket[mode] = { n: 0, wins: 0, sumPnl: 0, sumAbs: 0 });
      b.n++; if (signed > 0) b.wins++;
      b.sumPnl = Math.round((b.sumPnl + signed) * 1e4) / 1e4;
      b.sumAbs = Math.round((b.sumAbs + Math.abs(pnlPct)) * 1e4) / 1e4;
      n++;
    });
    return n;
  } catch (e) { return 0; }
}

// Lecture : [{ src, n, winRate, avgPnl, sumPnl }] triée du meilleur au pire, pour le mode demandé (défaut : courant).
function _attributionSummary(mode) {
  try {
    var mk = mode || ((typeof S !== 'undefined' && S && S.tradingMode) ? S.tradingMode : 'paperReal');
    var out = [];
    Object.keys((S && S.attribution) || {}).forEach(function (src) {
      var b = S.attribution[src] && S.attribution[src][mk];
      if (!b || !b.n) return;
      out.push({ src: src, n: b.n, winRate: Math.round(b.wins / b.n * 100), avgPnl: Math.round(b.sumPnl / b.n * 1e3) / 1e3, sumPnl: Math.round(b.sumPnl * 100) / 100 });
    });
    out.sort(function (a, b) { return b.avgPnl - a.avgPnl; });
    return out;
  } catch (e) { return []; }
}

window.INTEL_SOURCES = INTEL_SOURCES;
window._intelPublish = _intelPublish;
window._intelRead = _intelRead;
window._attributionRecord = _attributionRecord;
window._attributionSummary = _attributionSummary;
