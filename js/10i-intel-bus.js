// [PLAFONDS APPRIS · 22/09/2026] VERSION 20260922b · plafonds appris (emplacements en tout / par sens) : _capEval, _capRefresh, _capFor
// [MÉMOIRE DES CHEMINS · 22/09/2026] VERSION 20260922a · mémoire des chemins (_pathRecord) + horizon auto-armé par paire (_horizonEvalPair/_horizonRefresh/_horizonExit)
// [CORRECTIF ATTRIBUTION · 19/09/2026] VERSION 20260919a · _intelPublish lit les votes au format réel (nombres) — sans quoi seule la source « technique » était mesurée
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
        // [CORRECTIF · 19/09/2026] ps.roster.votes[id] est un NOMBRE (03 : scouts → res.score, conseil → ±|score|
        // selon le vote, gardiens → −0,5 / −0,2 / +0,05), pas un objet. La version du 17/09 lisait v.score sur un
        // nombre : undefined → toutes les sources sauf le composite technique étaient ignorées (backup 19/09 : seule
        // « technique » avait des enregistrements, n = 8). L'objet reste accepté par sécurité si la forme change.
        var v = votes ? votes[id] : null;
        if (v === null || v === undefined) return;
        var sc = (typeof v === 'number') ? v : Number(v.score);
        if (!isFinite(sc) && v && typeof v === 'object') sc = Number(v.vote);
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
// ═══ [MÉMOIRE DES CHEMINS · 22/09/2026] APPRENDRE DU CHEMIN, PAS DE LA CLÔTURE (« go », Rams 22/09) ═══
// Backup 21/09 : les positions tenues plus de 2 h perdent sur 6 paires sur 7 (≈ −2 % chacune), mais c'est en partie
// mécanique — les gagnantes sortent vite (TP, trailing), les perdantes traînent jusqu'à un stop lointain. Une clôture
// ne dit pas ce que valait la position à 2 h. Le chemin, si. Rejoué en marchant sur les 162 trades, un organe « mise
// selon l'espérance passée de la paire » aurait PERDU PLUS (−12,84 → −16,89 $) : l'espérance passée d'une paire est
// du bruit à cette taille. Le temps est le seul signal qui tient sur toutes les paires — on le mesure donc au chemin.
//
// 1 · _pathRecord (battement, toute position ouverte, tous modes) : pos._path = { mfe, mae, at: { 15, 30, 60, 120,
//     240 } } — P&L (% de la mise) au pic, au creux, et à chaque jalon d'âge (posé une seule fois, au premier tick
//     qui le dépasse). À la clôture (02 → _enrichTradeContextOnClose 09d1), le chemin est copié dans la mémoire des
//     trades (`path`). Coût : une lecture de ps.price par position et par seconde. Rien n'est décidé ici.
// 2 · _horizonRules (recalculé à chaque clôture EV/RE de la paire, et au boot) : pour chaque paire et chaque jalon
//     H ∈ {60, 120, 240}, sur ses HZ_WINDOW derniers trades EV/RE dont le chemin porte at[H] < 0 (encore négative
//     à H) : combien ont fini PIRE qu'à H, et de combien. La règle s'arme seulement si n ≥ HZ_MIN_N, si au moins
//     HZ_MIN_WORSE d'entre elles ont fini pire, et si fermer à H aurait rapporté en moyenne (final − at[H] < 0).
//     Le plus petit H qui prouve est retenu. La règle se désarme d'elle-même dès que ses chemins ne le prouvent plus.
//     C'est le rejeu « et si j'avais fermé à H » sur les chemins RÉELS — la preuve est une précondition de la règle.
// 3 · _horizonExit (10f _botExitSweep, positions bot) : une position de la paire encore négative à H est fermée.
//     Sans chemins, aucune règle : rien ne change tant que le système n'a pas ses propres preuves.
var PATH_MARKS = [15, 30, 60, 120, 240];
var HZ_MARKS = [60, 120, 240], HZ_WINDOW = 30, HZ_MIN_N = 8, HZ_MIN_WORSE = 0.6;
function _pathRecord() {
  try {
    if (!S || !S.openPositions || !S.pairStates) return 0;
    var now = Date.now(), n = 0;
    S.openPositions.forEach(function (pos) {
      if (!pos || !pos.pair) return;
      var ps = S.pairStates[pos.pair], px = ps ? Number(ps.price) : 0, entry = Number(pos.entryPrice), t0 = Number(pos.openedAt);
      if (!(px > 0) || !(entry > 0) || !(t0 > 0)) return;
      var pct = (pos.side === 'long' ? (px - entry) / entry : (entry - px) / entry) * 100;
      if (!isFinite(pct)) return;
      var P = pos._path || (pos._path = { mfe: 0, mae: 0, at: {} });
      if (pct > P.mfe) P.mfe = Math.round(pct * 1000) / 1000;
      if (pct < P.mae) P.mae = Math.round(pct * 1000) / 1000;
      var ageMin = (now - t0) / 60000;
      for (var i = 0; i < PATH_MARKS.length; i++) {
        var m = PATH_MARKS[i];
        if (ageMin >= m && P.at[m] === undefined) P.at[m] = Math.round(pct * 1000) / 1000;
      }
      n++;
    });
    return n;
  } catch (e) { return 0; }
}
// Évalue la règle d'horizon d'UNE paire sur sa mémoire ; retourne { H, n, worse, gain } ou null.
function _horizonEvalPair(pair, trades) {
  var closed = (trades || []).filter(function (t) { return t && t.pair === pair && t.closedAt && isFinite(t.pnlPct) && t.path && t.path.at; });
  closed = closed.slice(-HZ_WINDOW);
  for (var i = 0; i < HZ_MARKS.length; i++) {
    var H = HZ_MARKS[i], neg = [];
    closed.forEach(function (t) { var a = t.path.at[H]; if (isFinite(a) && a < 0) neg.push({ atH: a, fin: Number(t.pnlPct) }); });
    if (neg.length < HZ_MIN_N) continue;
    var worse = 0, delta = 0;
    neg.forEach(function (x) { if (x.fin < x.atH) worse++; delta += x.fin - x.atH; });
    var fracWorse = worse / neg.length, meanDelta = delta / neg.length;
    if (fracWorse >= HZ_MIN_WORSE && meanDelta < 0) return { H: H, n: neg.length, worse: Math.round(fracWorse * 100), gain: Math.round(-meanDelta * 100) / 100 };
  }
  return null;
}
// Recalcule toutes les règles depuis la mémoire des trades ; journalise armements et désarmements.
function _horizonRefresh(pair) {
  try {
    var mem = (S && S.tradeContextMemory) || [];
    if (!S.horizonRules) S.horizonRules = {};
    var pairs = pair ? [pair] : Object.keys(S.pairStates || {});
    pairs.forEach(function (p) {
      var r = _horizonEvalPair(p, mem), old = S.horizonRules[p] || null;
      if (r) { r.t = Date.now(); S.horizonRules[p] = r; } else delete S.horizonRules[p];
      var changed = (!!r !== !!old) || (r && old && r.H !== old.H);
      if (changed && S.chainLog) {
        try {   // le journal ne doit jamais faire tomber les règles
          S.chainLog.push({ icon: '\u23F3', desc: r ? ('Horizon appris \u00b7 ' + p + ' \u00b7 fermer si encore n\u00e9gative \u00e0 ' + r.H + ' min (' + r.n + ' chemins, ' + r.worse + ' % finissent pire, +' + r.gain + ' % en moyenne)') : ('Horizon d\u00e9sarm\u00e9 \u00b7 ' + p + ' \u00b7 ses chemins ne le prouvent plus'), hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : new Date().toLocaleTimeString() });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        } catch (e) {}
      }
    });
    return Object.keys(S.horizonRules).length;
  } catch (e) { return 0; }
}
// Décision pour une position (lue par 10f) : { H, why } si la règle armée de sa paire dit de fermer, sinon null.
function _horizonExit(pos, pnlPct, now) {
  try {
    var r = S && S.horizonRules && pos && S.horizonRules[pos.pair];
    if (!r || !(pnlPct < 0)) return null;
    var ageMin = ((now || Date.now()) - Number(pos.openedAt || 0)) / 60000;
    if (!(ageMin >= r.H)) return null;
    return { H: r.H, why: 'Horizon appris ' + r.H + ' min (' + r.n + ' chemins, ' + r.worse + ' % finissent pire)' };
  } catch (e) { return null; }
}

// ═══ [PLAFONDS APPRIS · 22/09/2026] COMBIEN DE POSITIONS EN MÊME TEMPS — LE SYSTÈME DÉCIDE (« go apprenant », Rams 22/09) ═══
// Deux chiffres étaient posés à la main : maxConcurrentPos = 3 (config EV, époque du compte à 100 $) et le plafond de
// sens = 2 (ma barrière du 21/09). Rams : « pourquoi 3 et pas le nombre de paires que le système possède ? » Réponse :
// aucune raison. Ici les deux plafonds — en tout, et par sens (long / short séparément) — sont APPRIS par paliers :
//   · chaque trade garde combien de positions étaient déjà ouvertes à son ouverture (10c openTotal / openSameDir) ;
//   · le niveau k est « nuisible » si ≥ CAP_MIN_N trades ouverts en tant que k-ième position PERDENT en moyenne, font
//     pire que les trades ouverts avec moins de compagnie (référence, même fenêtre), et ce pour ≥ CAP_MIN_WORSE d'entre
//     eux ; il est « prouvé » si ≥ CAP_MIN_N et pas nuisible — un k-ième qui gagne encore, même un peu moins que les
//     autres, ajoute du résultat au livre : il n'est pas nuisible ;
//   · le plafond part de la config (là où le système est), monte d'un niveau à chaque niveau prouvé, redescend sous le
//     premier niveau nuisible ; plancher 1, plafond = nombre de paires actives du mode. Revérifié à chaque clôture.
// Pas onze d'un coup : sans preuve, onze positions de 50 $ font 550 $ exposés au même creux. Le palier n'est pas une
// barrière, c'est la vitesse à laquelle le système se fait confiance avec ses propres chiffres.
var CAP_MIN_N = 8, CAP_MIN_WORSE = 0.6, CAP_WINDOW = 30;
function _capEval(kind, trades, start, ceiling) {
  var field = (kind === 'total') ? 'openTotal' : 'openSameDir';
  var closed = (trades || []).filter(function (t) {
    if (!t || !t.closedAt || !isFinite(t.pnlPct) || !isFinite(t[field])) return false;
    if (kind === 'total') return true;
    var isLong = String(t.side).toLowerCase().indexOf('long') === 0 || t.side === 'buy';
    return (kind === 'long') === isLong;
  });
  var out = { level: Math.max(1, start | 0), start: start | 0, ceiling: ceiling | 0, harmful: null, proven: [], n: {} };
  var mean = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; };
  var status = {};
  for (var k = 2; k <= Math.max(2, ceiling); k++) {
    var sample = closed.filter(function (t) { return t[field] === k - 1; }).slice(-CAP_WINDOW).map(function (t) { return Number(t.pnlPct); });
    var base = closed.filter(function (t) { return t[field] < k - 1; }).slice(-CAP_WINDOW).map(function (t) { return Number(t.pnlPct); });
    out.n[k] = sample.length;
    if (sample.length < CAP_MIN_N || base.length < CAP_MIN_N) { status[k] = 'unknown'; continue; }
    var mb = mean(base), ms = mean(sample), worse = sample.filter(function (v) { return v < mb; }).length / sample.length;
    status[k] = (ms < 0 && ms < mb && worse >= CAP_MIN_WORSE) ? 'harmful' : 'proven';
    if (status[k] === 'proven') out.proven.push(k);
  }
  var firstHarm = null;
  for (var k2 = 2; k2 <= Math.max(2, ceiling); k2++) if (status[k2] === 'harmful') { firstHarm = k2; break; }
  if (firstHarm !== null) { out.harmful = firstHarm; out.level = Math.max(1, firstHarm - 1); }
  else { var lv = Math.max(1, start | 0); while (lv < ceiling && status[lv] === 'proven') lv++; out.level = Math.min(Math.max(1, lv), Math.max(1, ceiling)); }
  return out;
}
function _capCeiling() {
  try {
    var mode = S.tradingMode;
    if (mode === 'paperReal' || mode === 'real') { var n = Object.keys(S.paperRealActivePairs || {}).filter(function (p) { return S.paperRealActivePairs[p]; }).length; return Math.max(1, n); }
    return Math.max(1, Object.keys((typeof PAIRS !== 'undefined' && PAIRS) || {}).length);
  } catch (e) { return 3; }
}
function _capStart() { try { return Math.max(1, (S.paperRealConfig && S.paperRealConfig.maxConcurrentPos) || 3); } catch (e) { return 3; } }
function _capRefresh() {
  try {
    var mem = (S && S.tradeContextMemory) || [], start = _capStart(), ceiling = _capCeiling();
    if (!S.capRules) S.capRules = {};
    ['total', 'long', 'short'].forEach(function (kind) {
      var r = _capEval(kind, mem, start, ceiling), old = S.capRules[kind];
      r.t = Date.now();
      if (old && old.level !== r.level && S.chainLog) {
        try {
          var lab = kind === 'total' ? 'en tout' : ('m\u00eame sens ' + kind.toUpperCase());
          var why = r.harmful ? ('le ' + r.harmful + 'e a nui sur ' + r.n[r.harmful] + ' cas') : ('le ' + old.level + 'e n\u2019a pas nui sur ' + (r.n[old.level] || 0) + ' cas');
          S.chainLog.push({ icon: '\uD83E\uDE9C', desc: 'Emplacements appris \u00b7 ' + lab + ' \u00b7 ' + old.level + ' \u2192 ' + r.level + ' (' + why + ')', hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : new Date().toLocaleTimeString() });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        } catch (e) {}
      }
      S.capRules[kind] = r;
    });
    return S.capRules;
  } catch (e) { return null; }
}
// Lecture (09c / 10e) : le plafond courant pour 'total', 'long' ou 'short' ; sans règle calculée → le départ (config).
function _capFor(kind) {
  try { var r = S && S.capRules && S.capRules[kind]; return (r && isFinite(r.level)) ? r.level : _capStart(); } catch (e) { return 3; }
}
window._capEval = _capEval; window._capRefresh = _capRefresh; window._capFor = _capFor; window._capCeiling = _capCeiling;
window._pathRecord = _pathRecord; window._horizonEvalPair = _horizonEvalPair; window._horizonRefresh = _horizonRefresh; window._horizonExit = _horizonExit;

window._intelPublish = _intelPublish;
window._intelRead = _intelRead;
window._attributionRecord = _attributionRecord;
window._attributionSummary = _attributionSummary;
