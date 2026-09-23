// [VÉRITÉ DES RÈGLES · 23/09/2026] VERSION 20260923f · armedAt/baseMean conservés à l'armement, _ruleTruth : trades de la paire depuis l'armement vs avant, sorties dues à la règle
// [CORRECTIFS CHEMINS · 23/09/2026] VERSION 20260923e · plafonds appris : un verdict « nuisible » expire après 20 trades sans échantillon (re-test)
// [STOP APPRIS · 23/09/2026] VERSION 20260923b · stop appris par paire (_stopEvalPair/_stopRefresh/_stopExit) + preuve stable sur les deux moitiés (_halfStable) pour gain et stop
// [GAIN APPRIS · 23/09/2026] VERSION 20260923a · repères de rendu dans le chemin (grille m|f) + règle de gain apprise par paire (_gainEvalPair/_gainRefresh/_gainExit)
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
// [GAIN APPRIS · 23/09/2026] repères de « rendu » : pour chaque case de la grille (m = pic atteint en %, f = fraction du
// pic gardée), le P&L au PREMIER instant où le pic a atteint m ET le P&L est retombé à f × pic. Ces repères rendent la
// règle « une fois m atteint, sortir à f × pic » REJOUABLE EXACTEMENT sur la mémoire (elle aurait fermé là, pas ailleurs).
// La grille est un menu ; la paire choisit la case sur preuve, ou aucune.
var GAIN_M = [0.2, 0.3, 0.5, 0.8], GAIN_F = [0.3, 0.5, 0.7];
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
      if (P.mfe > 0) {                                   // repères de rendu (posés une seule fois, au premier déclenchement)
        var gb = P.gb || (P.gb = {});
        for (var gi = 0; gi < GAIN_M.length; gi++) {
          if (P.mfe < GAIN_M[gi]) continue;
          for (var gj = 0; gj < GAIN_F.length; gj++) {
            var key = GAIN_M[gi] + '|' + GAIN_F[gj];
            if (gb[key] === undefined && pct <= GAIN_F[gj] * P.mfe) gb[key] = Math.round(pct * 1000) / 1000;
          }
        }
      }
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
      var changed = (!!r !== !!old) || (r && old && r.H !== old.H);
      if (r) { r.t = Date.now(); _ruleArmStamp(r, old, changed, p, mem); S.horizonRules[p] = r; } else delete S.horizonRules[p];
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
// [CORRECTIFS CHEMINS · 23/09/2026] RE-TEST : un niveau jugé nuisible abaisse le plafond, donc plus aucun trade ne s'ouvre à
// ce niveau, donc son échantillon ne se renouvelle jamais — le verdict était définitif (backup 23/09 : total = 1 sur 9
// cas, sans issue). Désormais un verdict dont le dernier échantillon date de plus de CAP_RETEST trades clos expire :
// le niveau redevient « inconnu », le plafond peut remonter d'un cran, et le niveau est rejugé sur des cas frais.
var CAP_RETEST = 20;
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
    var lastIdx = -1; for (var q = closed.length - 1; q >= 0; q--) { if (closed[q][field] === k - 1) { lastIdx = q; break; } }
    if (lastIdx >= 0 && (closed.length - 1 - lastIdx) >= CAP_RETEST) { status[k] = 'unknown'; out.retest = k; continue; }   // verdict expiré : à rejuger
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

// ═══ [GAIN APPRIS · 23/09/2026] GARDER CE QUE LA POSITION A TOUCHÉ (« go », Rams 23/09) ═══
// Backup 22/09, 13 premiers chemins : somme des pics +5,16 %, somme des résultats +0,66 % — le système gardait 13 % de
// ses meilleurs moments (6 trades sur 9 ayant atteint +0,30 % ont fini sous +0,10). Le breakeven (45 % du chemin vers un
// objectif ATR ≈ 1,3 %) et le trailing (60 %) s'arment vers +0,6 / +0,8 % : au-dessus de ce que le système capture.
// Règle apprise PAR PAIRE, sur ses GAIN_WINDOW derniers chemins : pour chaque case (m, f) de la grille, rejeu exact —
// si le repère gb[m|f] existe, la règle aurait fermé là ; sinon le trade a fini comme il a fini. On retient la case au
// meilleur gain moyen ; elle ne s'arme que si n ≥ GAIN_MIN_N, gain moyen > 0, et amélioration sur ≥ GAIN_MIN_BETTER des
// trades où elle aurait agi. Elle se désarme dès que ses chemins ne le prouvent plus. Exécution : 10f, avant les niveaux.
var GAIN_WINDOW = 30, GAIN_MIN_N = 8, GAIN_MIN_BETTER = 0.6;
// [STOP APPRIS · 23/09/2026] preuve STABLE DANS LE TEMPS : quand la fenêtre a ≥ 16 chemins, la règle doit avoir rapporté
// sur CHACUNE des deux moitiés (l'ancienne et la récente) — une case qui n'a gagné que sur un épisode n'est pas une règle.
function _halfStable(deltas) {
  if (deltas.length < 16) return true;
  var h = Math.floor(deltas.length / 2), a = 0, b = 0;
  for (var i = 0; i < deltas.length; i++) { if (i < h) a += deltas[i]; else b += deltas[i]; }
  return a > 0 && b > 0;
}
function _gainEvalPair(pair, trades) {
  var closed = (trades || []).filter(function (t) { return t && t.pair === pair && t.closedAt && isFinite(t.pnlPct) && t.path && isFinite(t.path.mfe); }).slice(-GAIN_WINDOW);
  if (closed.length < GAIN_MIN_N) return null;
  var best = null;
  GAIN_M.forEach(function (m) { GAIN_F.forEach(function (f) {
    var key = m + '|' + f, sum = 0, acted = 0, better = 0, deltas = [];
    closed.forEach(function (t) {
      var gb = t.path.gb || {}, fin = Number(t.pnlPct), d = 0;
      if (gb[key] !== undefined) { var out = Number(gb[key]); d = out - fin; acted++; if (out > fin) better++; }
      sum += d; deltas.push(d);
    });
    var gain = sum / closed.length;
    if (best === null || gain > best.gain) best = { m: m, f: f, gain: gain, acted: acted, better: better, deltas: deltas };
  }); });
  if (!best || !(best.gain > 0) || best.acted < 1) return null;
  if (best.better / best.acted < GAIN_MIN_BETTER) return null;
  if (!_halfStable(best.deltas)) return null;
  return { m: best.m, f: best.f, n: closed.length, acted: best.acted, better: Math.round(100 * best.better / best.acted), gain: Math.round(best.gain * 1000) / 1000 };
}
function _gainRefresh(pair) {
  try {
    var mem = (S && S.tradeContextMemory) || [];
    if (!S.gainRules) S.gainRules = {};
    var pairs = pair ? [pair] : Object.keys(S.pairStates || {});
    pairs.forEach(function (p) {
      var r = _gainEvalPair(p, mem), old = S.gainRules[p] || null;
      var changed = (!!r !== !!old) || (r && old && (r.m !== old.m || r.f !== old.f));
      if (r) { r.t = Date.now(); _ruleArmStamp(r, old, changed, p, mem); S.gainRules[p] = r; } else delete S.gainRules[p];
      if (changed && S.chainLog) {
        try {
          S.chainLog.push({ icon: '\uD83D\uDD12', desc: r ? ('Gain appris \u00b7 ' + p + ' \u00b7 pic \u2265 +' + r.m + ' % \u2192 garder ' + Math.round(r.f * 100) + ' % du pic (' + r.n + ' chemins, +' + r.gain + ' %/trade, mieux ' + r.better + ' % des fois)') : ('Gain d\u00e9sarm\u00e9 \u00b7 ' + p + ' \u00b7 ses chemins ne le prouvent plus'), hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : new Date().toLocaleTimeString() });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        } catch (e) {}
      }
    });
    return Object.keys(S.gainRules).length;
  } catch (e) { return 0; }
}
// Décision (10f) : { why } si la règle armée de la paire dit de fermer — pic ≥ m et P&L retombé à f × pic — sinon null.
function _gainExit(pos, pnlPct) {
  try {
    var r = S && S.gainRules && pos && S.gainRules[pos.pair]; if (!r) return null;
    var mfe = pos._path && Number(pos._path.mfe);
    if (!(mfe >= r.m) || !(pnlPct <= r.f * mfe)) return null;
    return { why: 'Gain appris \u00b7 pic +' + mfe.toFixed(2) + ' % \u2192 sortie \u00e0 ' + Math.round(r.f * 100) + ' % du pic (' + r.n + ' chemins)' };
  } catch (e) { return null; }
}

// ═══ [STOP APPRIS · 23/09/2026] LE STOP DE LA PAIRE, DÉCIDÉ PAR SES CREUX (« go », Rams 23/09) ═══
// Le stop est à 2 ATR pour toutes les paires (bras A/B) — de −0,5 % (BTC, EUR) à −2 % (PEPE, AVAX) : les pertes vont au
// bout pendant que les gains font +0,3. Chaque chemin garde son creux (mae) : une paire peut rejouer EXACTEMENT « et si
// mon stop avait été à −d » — si le creux a atteint −d, le trade aurait fermé là (premier passage) ; sinon il a fini
// comme il a fini. Une règle apprise ne ferme jamais plus tard que la réalité, donc le rejeu est exact. Même mécanique
// que le gain appris : grille, meilleure case, armée sur preuve (n ≥ 8, gain > 0, mieux ≥ 60 % des fois où elle agit,
// stable sur les deux moitiés), désarmée sinon. Elle S'AJOUTE au stop ATR (qui reste la borne extérieure).
var STOP_D = [0.4, 0.6, 0.8, 1.2];
function _stopEvalPair(pair, trades) {
  var closed = (trades || []).filter(function (t) { return t && t.pair === pair && t.closedAt && isFinite(t.pnlPct) && t.path && isFinite(t.path.mae); }).slice(-GAIN_WINDOW);
  if (closed.length < GAIN_MIN_N) return null;
  var best = null;
  STOP_D.forEach(function (d) {
    var sum = 0, acted = 0, better = 0, deltas = [];
    closed.forEach(function (t) {
      var fin = Number(t.pnlPct), mae = Number(t.path.mae), dl = 0;
      if (mae <= -d && fin < -d + 1e-9) { dl = (-d) - fin; acted++; if (dl > 0) better++; }       // aurait fermé à −d
      else if (mae <= -d && fin >= -d) { dl = (-d) - fin; acted++; }                             // aurait coupé un trade qui a remonté : perte de la règle
      sum += dl; deltas.push(dl);
    });
    var gain = sum / closed.length;
    if (best === null || gain > best.gain) best = { d: d, gain: gain, acted: acted, better: better, deltas: deltas };
  });
  if (!best || !(best.gain > 0) || best.acted < 1) return null;
  if (best.better / best.acted < GAIN_MIN_BETTER) return null;
  if (!_halfStable(best.deltas)) return null;
  return { d: best.d, n: closed.length, acted: best.acted, better: Math.round(100 * best.better / best.acted), gain: Math.round(best.gain * 1000) / 1000 };
}
function _stopRefresh(pair) {
  try {
    var mem = (S && S.tradeContextMemory) || [];
    if (!S.stopRules) S.stopRules = {};
    var pairs = pair ? [pair] : Object.keys(S.pairStates || {});
    pairs.forEach(function (p) {
      var r = _stopEvalPair(p, mem), old = S.stopRules[p] || null;
      var changed = (!!r !== !!old) || (r && old && r.d !== old.d);
      if (r) { r.t = Date.now(); _ruleArmStamp(r, old, changed, p, mem); S.stopRules[p] = r; } else delete S.stopRules[p];
      if (changed && S.chainLog) {
        try {
          S.chainLog.push({ icon: '\uD83D\uDED1', desc: r ? ('Stop appris \u00b7 ' + p + ' \u00b7 fermer \u00e0 \u2212' + r.d + ' % (' + r.n + ' chemins, +' + r.gain + ' %/trade, mieux ' + r.better + ' % des fois)') : ('Stop d\u00e9sarm\u00e9 \u00b7 ' + p + ' \u00b7 ses chemins ne le prouvent plus'), hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : new Date().toLocaleTimeString() });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        } catch (e) {}
      }
    });
    return Object.keys(S.stopRules).length;
  } catch (e) { return 0; }
}
function _stopExit(pos, pnlPct) {
  try {
    var r = S && S.stopRules && pos && S.stopRules[pos.pair]; if (!r) return null;
    if (!(pnlPct <= -r.d)) return null;
    return { d: r.d, why: 'Stop appris \u2212' + r.d + ' % (' + r.n + ' chemins)' };
  } catch (e) { return null; }
}

// ═══ [VÉRITÉ DES RÈGLES · 23/09/2026] UNE RÈGLE ARMÉE TIENT-ELLE SA PROMESSE ? (« go », Rams 23/09) ═══
// Chaque règle s'arme sur une promesse de rejeu (« +0,21 %/trade »). Personne ne vérifiait ce qui se passe APRÈS.
// Ici : à l'armement, la règle garde armedAt et baseMean (moyenne du P&L des trades de la paire dans la fenêtre qui
// l'a armée) ; tant que la règle reste la même, ces deux valeurs sont conservées d'un recalcul à l'autre. _ruleTruth
// compare ensuite les trades de la paire clos DEPUIS l'armement (tous, pas seulement ceux où la règle a agi) à baseMean,
// et compte les sorties dues à la règle (10f pose pos._ruleExit, 09d1 le copie dans la mémoire). Lecture seule.
function _ruleArmStamp(r, old, changed, pair, mem) {
  try {
    if (old && !changed && isFinite(old.armedAt)) { r.armedAt = old.armedAt; r.baseMean = old.baseMean; return r; }
    var win = (mem || []).filter(function (t) { return t && t.pair === pair && t.closedAt && isFinite(t.pnlPct); }).slice(-30);
    r.armedAt = Date.now();
    r.baseMean = win.length ? Math.round(win.reduce(function (a, t) { return a + Number(t.pnlPct); }, 0) / win.length * 1000) / 1000 : 0;
    return r;
  } catch (e) { return r; }
}
function _ruleTruth(pair, kind) {
  try {
    var rules = kind === 'gain' ? S.gainRules : kind === 'stop' ? S.stopRules : S.horizonRules;
    var r = rules && rules[pair]; if (!r || !isFinite(r.armedAt)) return null;
    var since = (S.tradeContextMemory || []).filter(function (t) { return t && t.pair === pair && t.closedAt && t.closedAt >= r.armedAt && isFinite(t.pnlPct); });
    var acted = since.filter(function (t) { return t.ruleExit && t.ruleExit.kind === kind; }).length;
    var mean = since.length ? Math.round(since.reduce(function (a, t) { return a + Number(t.pnlPct); }, 0) / since.length * 1000) / 1000 : null;
    return { n: since.length, acted: acted, mean: mean, before: r.baseMean, delta: (mean === null || !isFinite(r.baseMean)) ? null : Math.round((mean - r.baseMean) * 1000) / 1000, promise: r.gain };
  } catch (e) { return null; }
}
window._ruleArmStamp = _ruleArmStamp; window._ruleTruth = _ruleTruth;
window._stopEvalPair = _stopEvalPair; window._stopRefresh = _stopRefresh; window._stopExit = _stopExit; window._halfStable = _halfStable;
window._gainEvalPair = _gainEvalPair; window._gainRefresh = _gainRefresh; window._gainExit = _gainExit;
window._pathRecord = _pathRecord; window._horizonEvalPair = _horizonEvalPair; window._horizonRefresh = _horizonRefresh; window._horizonExit = _horizonExit;

window._intelPublish = _intelPublish;
window._intelRead = _intelRead;
window._attributionRecord = _attributionRecord;
window._attributionSummary = _attributionSummary;
