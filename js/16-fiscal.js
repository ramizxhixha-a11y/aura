// js/16-fiscal.js — [GO FISCAL · 07/10/2026] VERSION 20261007b
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// IMPÔT BELGE SUR LES PLUS-VALUES, APPLIQUÉ TRADE PAR TRADE (demande Rams 07/10/2026)
// « appliquer le juste calcul, précisément comme la loi stipule : MANU normal (trades LONG, sans levier) → 10 000 € de
//   gains par an exonérés ; spéculatif (AUTO, levier) → sans exonération. À chaque fin de trade, si gain, le taux est
//   transféré dans le dépôt fiscal ; un historique détaillé gardé à la page fiscale ; le bot fiscal analyse et met à jour. »
//
// LA LOI (relue le 07/10/2026 — sources dans FISC_BE.sources) :
//   · Loi du 03/04/2026 (MB 21/04/2026), plus-values réalisées depuis le 01/01/2026, crypto-actifs compris (stablecoins
//     inclus : un échange crypto → USDT est une cession). Circulaire 2026/C/74 du 22/07/2026.
//   · Gestion normale du patrimoine privé : 10 %. Exonération de base 10 000 € par an et par contribuable ; exonération
//     complémentaire 1 000 € par an reportée quand la base n'est pas (ou peu) utilisée — à concurrence de la part non
//     utilisée, au plus 1 000 € —, utilisable au plus 5 × 1 000 € la même année, le solde continue d'être reporté
//     (exemple de l'administration : rien de 2026 à 2031 → 6 000 € reportés, 5 000 € utilisables en 2032, 1 000 €
//     reportés en 2033). Montants indexés chaque année. Moins-values déduites la même année, dans le même régime, sans
//     report. Aucun frais ni taxe d'achat ou de vente n'est déduit.
//   · Hors gestion normale / spéculatif (CIR 92 art. 90, 1°) : 33 % + additionnels communaux, AUCUNE exonération. Montant
//     net = brut moins les frais (art. 97) ; pertes de la même année compensées, pertes des 5 périodes antérieures
//     déduites (art. 103). Indices cités par la circulaire pour les crypto : part du patrimoine en crypto, recours à un
//     financement (emprunt), processus automatisés / logiciels (bots de trading) — appréciés ensemble, par le fisc.
//   · Les trois régimes ne se compensent pas entre eux.
//
// LA RÈGLE DE RAMS (07/10/2026), appliquée à chaque fermeture :
//   MANU (ouvert par toi) + LONG + aucun emprunt (pas de levier)  →  régime NORMAL 10 %, avec exonération
//   AUTO (ouvert par un bot), SHORT (vente à découvert = crypto empruntée) ou levier  →  SPÉCULATIF 33 %, sans exonération
//   C'est une classification de prudence : seul le fisc qualifie, au vu de l'ensemble. Le registre la rend lisible.
//
// LE CALCUL (en euros, à la manière de la loi, sur l'ANNÉE CIVILE belge) :
//   gain légal d'un trade = valeur en € reçue − valeur en € payée, au cours USD→EUR de l'app à l'ouverture (pos._fxIn) et à
//   la fermeture ; résultat au prix réellement exécuté (le glissement est dans le prix), frais de courtage exclus.
//   normal : impôt = 10 % × [ max(0, net + hors AURA − exonération) − max(0, hors AURA − exonération) ]  (part d'AURA)
//   spéculatif : impôt = 33 % × (1 + commune) × max(0, plus-values − moins-values − frais − pertes reportées)
//   provision = impôt dû de l'année À CE JOUR. À chaque fermeture le dépôt fiscal est remis à ce montant : un gain y
//   verse sa part, une perte du même régime en rend (la loi la déduit). Au 1er janvier l'année est close (dû figé,
//   exonération complémentaire et pertes spéculatives reportées), une nouvelle s'ouvre.
//
// ÉCRANS : js/16b-fiscal-ecran.js (régime en cours, onglet ⚖ Impôt, fiche MAN, CSV) — ce fichier-ci calcule et tient le dépôt.
// CHAQUE MODE A SON REGISTRE (wallet.fiscal : AA, EV, RE séparés, comme les comptes). SEUL LE RE EST DÛ AU FISC ; l'EV
// montre le même calcul sur l'argent simulé. Le registre s'ouvre au premier trade fermé après cette livraison.
//
// HORS DE PORTÉE (dit, pas caché) : la DÉCISION des bots lit toujours detectFiscalRegime / fiscalBotAdvicePerPair (02)
// INCHANGÉS — y brancher ce registre changerait les ouvertures : porte TALENT d'abord. Le gain ou la perte de change sur
// l'USDT gardé entre deux trades n'est pas suivi (seule la durée de chaque trade l'est).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════

var FISC_BE = {
  rateNormal: 0.10,
  rateSpec:   0.33,
  specLossYears: 5,
  // montants indexés chaque année : seuls ceux de 2026 sont publiés au 07/10/2026 → une année sans montants prend les
  // derniers connus et le bot fiscal le dit (« montants indexés de AAAA à confirmer »)
  years: { 2026: { base: 10000, comp: 1000, compCap: 5000 } },
  reviewed: '2026-10-07',
  sources: [
    ['Loi du 03/04/2026 — RSM', 'https://www.rsm.global/belgium/fr/insights/loi-introduisant-une-taxe-sur-les-plus-values-des-actifs-financiers-principales-caracteristiques-et-considerations-pratiques'],
    ['Circulaire 2026/C/74 — KPMG', 'https://kpmg.com/be/fr/insights/my-tax-compass/people-services-insights/administrative-guidance-on-capital-gains-tax-published.html'],
    ['Analyse de la taxe — Claeys & Engels', 'https://www.claeysengels.be/sites/default/files/2026-04/Newsletter%20-%20Analysis%20de%20la%20nouvelle%20taxe%20sur%20les%20plus-values_0.pdf'],
    ['CIR 92 art. 90 1°, 97, 103 — C. const. 124/2023', 'https://www.dekamer.be/doc/juri2/doc/0000001958/cc_2023-124-fr.pdf']
  ]
};

var _FISC_MODE_LBL = { sim: 'AA', paperReal: 'EV', real: 'RE' };
var _FISC_HIST_MAX = { sim: 300, paperReal: 300, real: 1500 };   // chaque fermeture est AUSSI gardée sans limite dans la base IndexedDB des frais (02 saveFeeRecord : régime, gain €, mode)

function _fiscNum(v) { v = Number(v); return isFinite(v) ? v : 0; }

// Année civile belge d'un instant (le fisc compte en heure de Bruxelles, pas en UTC).
function _fiscYearOf(ts) {
  try {
    var s = new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', year: 'numeric' }).format(new Date(ts));
    var y = parseInt(s, 10); if (isFinite(y)) return y;
  } catch (e) {}
  return new Date(ts).getFullYear();
}

function _fiscAmounts(y) {
  var ks = Object.keys(FISC_BE.years).map(Number).sort(function (a, b) { return a - b; });
  var k = ks[0];
  ks.forEach(function (v) { if (v <= y) k = v; });
  var a = FISC_BE.years[k];
  return { year: k, pending: k !== y, base: a.base, comp: a.comp, compCap: a.compCap };
}

// Cours USD→EUR de l'app (02 fetchUsdEurRate, open.er-api.com, toutes les 2 min en ligne). Le 0,92 par défaut de 02 n'est PAS
// un cours : tant qu'aucun cours n'a été reçu dans la session (relance, hors ligne), le registre prend le dernier cours reçu
// (gardé dans ses réglages, sauvegardés) et le signale ; 0,92 seulement s'il n'en a jamais reçu.
function _fiscFx() {
  var cfg = _fiscCfg();
  var r = Number(S && S.usdEurRate), seen = Number(S && S._usdEurLastFetch) > 0;
  if (seen && isFinite(r) && r > 0) { if (cfg.fxGood !== r) cfg.fxGood = r; return { r: r, fallback: false }; }
  var g = Number(cfg.fxGood);
  return (isFinite(g) && g > 0) ? { r: g, fallback: true } : { r: 0.92, fallback: true };
}

// Réglages communs aux trois registres : additionnels communaux (% de l'impôt à 33 %, taux de ta commune) et plus-values
// nettes réalisées HORS AURA (Quantfury, banque…) par année — elles partagent l'exonération (une par contribuable).
function _fiscCfg() {
  if (!S.fiscalCfg || typeof S.fiscalCfg !== 'object') S.fiscalCfg = { commune: 0, ext: {} };
  if (!S.fiscalCfg.ext || typeof S.fiscalCfg.ext !== 'object') S.fiscalCfg.ext = {};
  if (!isFinite(Number(S.fiscalCfg.commune))) S.fiscalCfg.commune = 0;
  return S.fiscalCfg;
}

// ── RÉGIME D'UN TRADE (règle de Rams) ──────────────────────────────────────────────────────────────────────────────
function _fiscRegimeOf(pos) {
  if (!pos) return { regime: 'spec', why: ['trade inconnu'] };
  var why = [];
  if (pos.auto === true) why.push('AUTO (bot)');
  if (pos.side !== 'long') why.push('SHORT (vente à découvert = crypto empruntée)');
  var lev = _fiscNum(pos.levBorrowed), st = _fiscNum(pos.stakeUsdt), ex = _fiscNum(pos.totalExposure);
  if (lev > 0 || ex > st + 1e-9) why.push('levier (emprunt ' + Math.max(lev, ex - st).toFixed(2) + ' $)');
  return why.length ? { regime: 'spec', why: why } : { regime: 'normal', why: ['MANU · LONG · sans levier'] };
}

// ── GAIN LÉGAL EN EUROS ────────────────────────────────────────────────────────────────────────────────────────────
// N = exposition (ce qui a été acheté, ou vendu à découvert), g = résultat au prix exécuté (P&L moins le glissement).
// LONG  : reçu (N + g) au cours de sortie − payé N au cours d'entrée.
// SHORT : reçu N au cours d'entrée − payé (N − g) au rachat, au cours de sortie.
function _fiscGainEur(side, N, pnlUsd, slipUsd, fxIn, fxOut) {
  var g = _fiscNum(pnlUsd) - _fiscNum(slipUsd);
  N = _fiscNum(N);
  return side === 'long' ? (N + g) * fxOut - N * fxIn : N * fxIn - (N - g) * fxOut;
}

function _fiscNewYear(y, carry) {
  return {
    y: y, n: 0, nN: 0, nS: 0,
    normal: { gain: 0, loss: 0 },          // € — plus-values / moins-values du régime 10 %
    spec:   { gain: 0, loss: 0, fee: 0 },  // € — régime 33 %, frais déduits (art. 97)
    feesUsd: 0, slipUsd: 0,                // coûts réels de l'année ($)
    provUsd: 0, shortUsd: 0,               // provision tenue au dépôt fiscal ; manque non couvert (compte vide)
    dueEur: 0, fxLast: 0,
    carryIn: {
      comp: Math.max(0, _fiscNum(carry && carry.comp)),
      specLoss: ((carry && carry.specLoss) || []).filter(function (e) { return e && e.y >= y - FISC_BE.specLossYears && e.eur > 0; })
                 .map(function (e) { return { y: e.y, eur: e.eur }; })
    },
    pairs: {}, closed: false, closedTs: 0, carryOut: null, paid: false, paidTs: 0
  };
}

// ── IMPÔT DÛ D'UNE ANNÉE (fonction pure : rien n'est modifié) ──────────────────────────────────────────────────────
function _fiscDue(yr, cfg, isReal) {
  var a = _fiscAmounts(yr.y);
  var N = yr.normal.gain - yr.normal.loss;
  var G = isReal ? _fiscNum(cfg && cfg.ext && cfg.ext[yr.y]) : 0;      // hors AURA : seulement pour l'argent réel
  var compAvail = Math.min(a.compCap, Math.max(0, _fiscNum(yr.carryIn && yr.carryIn.comp)));
  var E = a.base + compAvail;
  var tot = Math.max(0, N + G - E), extOnly = Math.max(0, G - E);
  // part d'AURA ; une perte AURA qui baisse l'impôt des gains hors AURA ne la rend pas négative (économie affichée)
  var taxableN = Math.max(0, tot - extOnly), extSaving = FISC_BE.rateNormal * Math.max(0, extOnly - tot);
  var taxN = FISC_BE.rateNormal * taxableN;
  var usedBase = Math.min(a.base, Math.max(0, N + G));
  var usedComp = Math.min(compAvail, Math.max(0, N + G - a.base));
  var Sn = yr.spec.gain - yr.spec.loss - yr.spec.fee;
  var prior = ((yr.carryIn && yr.carryIn.specLoss) || []).reduce(function (s, e) { return s + _fiscNum(e.eur); }, 0);
  var usedLoss = Sn > 0 ? Math.min(prior, Sn) : 0;
  var taxableS = Math.max(0, Sn - usedLoss);
  var commune = Math.max(0, _fiscNum(cfg && cfg.commune));
  var rateS = FISC_BE.rateSpec * (1 + commune / 100);
  var taxS = rateS * taxableS;
  return {
    a: a, N: N, G: G, compAvail: compAvail, E: E, left: Math.max(0, E - Math.max(0, N + G)),
    taxableN: taxableN, taxN: taxN, extSaving: extSaving, usedBase: usedBase, usedComp: usedComp,
    S: Sn, prior: prior, usedLoss: usedLoss, taxableS: taxableS, commune: commune, rateS: rateS, taxS: taxS,
    due: taxN + taxS
  };
}

// ── CLÔTURE D'UNE ANNÉE : dû figé, reports calculés ───────────────────────────────────────────────────────────────
function _fiscCloseYear(L, yr, cfg, isReal) {
  var d = _fiscDue(yr, cfg, isReal);
  yr.dueEur = d.due;
  // exonération complémentaire : la part non utilisée de la base, au plus 1 000 €, s'ajoute ; ce qui a servi s'en va
  var accr = Math.min(d.a.comp, Math.max(0, d.a.base - d.usedBase));
  L.carry.comp = Math.max(0, _fiscNum(yr.carryIn.comp) - d.usedComp) + accr;
  // pertes spéculatives : consommées des plus anciennes aux plus récentes ; la perte nette de l'année s'ajoute ; 5 ans
  var rem = d.usedLoss, list = yr.carryIn.specLoss.map(function (e) { return { y: e.y, eur: e.eur }; });
  list.sort(function (p, q) { return p.y - q.y; });
  list.forEach(function (e) { var t = Math.min(e.eur, rem); e.eur -= t; rem -= t; });
  if (d.S < 0) list.push({ y: yr.y, eur: -d.S });
  L.carry.specLoss = list.filter(function (e) { return e.eur > 1e-9 && e.y >= yr.y + 1 - FISC_BE.specLossYears; });
  yr.closed = true; yr.closedTs = Date.now();
  yr.carryOut = { comp: L.carry.comp, specLoss: L.carry.specLoss.map(function (e) { return { y: e.y, eur: e.eur }; }) };
  return d;
}

// ── REGISTRE D'UN MODE ────────────────────────────────────────────────────────────────────────────────────────────
function _fiscWallet(mode) { return (typeof _walletFor === 'function') ? _walletFor(mode) : null; }
function _fiscLedger(mode, create) {
  var w = _fiscWallet(mode); if (!w) return null;
  if (!w.fiscal || typeof w.fiscal !== 'object') {
    if (!create) return null;
    w.fiscal = { v: 1, openedAt: Date.now(), firstYear: _fiscYearOf(Date.now()), rev: 0, years: {}, carry: { comp: 0, specLoss: [] }, hist: [] };
  }
  return w.fiscal;
}

// Ouvre l'année y ; ferme d'abord toutes les années passées (y compris celles où l'app n'a fait aucun trade : une année
// vide reporte aussi son exonération complémentaire). Retourne l'année y et la liste des années closes à l'instant.
function _fiscRoll(L, y, cfg, isReal) {
  var first = _fiscNum(L.firstYear) || y, closed = [];
  for (var k = first; k < y; k++) {
    if (!L.years[k]) L.years[k] = _fiscNewYear(k, L.carry);
    if (!L.years[k].closed) { _fiscCloseYear(L, L.years[k], cfg, isReal); closed.push(k); }
  }
  if (!L.years[y]) L.years[y] = _fiscNewYear(y, L.carry);
  return { yr: L.years[y], closed: closed };
}

function _fiscLog(w, amount, source, extra) {
  if (!w.fiscalReserveLog) w.fiscalReserveLog = [];
  var e = { amount: amount, source: source, ts: Date.now(), time: (typeof nowStr === 'function' ? nowStr() : '') };
  if (extra) for (var k in extra) e[k] = extra[k];
  w.fiscalReserveLog.unshift(e);
  if (w.fiscalReserveLog.length > 200) w.fiscalReserveLog.length = 200;
}

// Le dépôt ne peut pas tenir plus que ce qu'il contient (remise à zéro manuelle de la réserve, 03) : les provisions
// non payées sont ramenées au dépôt réel, l'année en cours d'abord. Le manque réapparaît au prochain réajustement.
function _fiscReconcile(L, w) {
  var ys = Object.keys(L.years).map(Number).sort(function (a, b) { return b - a; });
  var held = ys.reduce(function (s, k) { var yr = L.years[k]; return s + (yr.paid ? 0 : _fiscNum(yr.provUsd)); }, 0);
  var dep = Math.max(0, _fiscNum(w.fiscalReserveAccount));
  var over = held - dep;
  if (!(over > 1e-9)) return 0;
  ys.forEach(function (k) {
    var yr = L.years[k]; if (yr.paid || over <= 0) return;
    var t = Math.min(over, _fiscNum(yr.provUsd)); yr.provUsd -= t; over -= t;
    yr.shortUsd = _fiscNum(yr.shortUsd) + t;   // ce qui manque sera recomplété (année close : _fiscSettleClosed)
  });
  return held - dep;
}

// Remet la provision de l'année au dû (en $ au cours du moment) : trading → dépôt si elle monte, dépôt → trading si elle
// baisse. Borné par l'argent réellement présent ; le manque est gardé (yr.shortUsd) et le bot fiscal réessaie.
function _fiscRebalance(L, w, yr, fx, source, extra) {
  _fiscReconcile(L, w);
  var target = _fiscNum(yr.dueEur) / fx;
  var delta = target - _fiscNum(yr.provUsd);
  var moved = 0;
  if (delta > 1e-9) {
    var take = Math.min(delta, Math.max(0, _fiscNum(w.tradingAccount)));
    w.tradingAccount = _fiscNum(w.tradingAccount) - take;
    w.fiscalReserveAccount = _fiscNum(w.fiscalReserveAccount) + take;
    yr.provUsd = _fiscNum(yr.provUsd) + take;
    moved = take;
  } else if (delta < -1e-9) {
    var give = Math.min(-delta, _fiscNum(yr.provUsd), Math.max(0, _fiscNum(w.fiscalReserveAccount)));
    w.fiscalReserveAccount = _fiscNum(w.fiscalReserveAccount) - give;
    w.tradingAccount = _fiscNum(w.tradingAccount) + give;
    yr.provUsd = _fiscNum(yr.provUsd) - give;
    moved = -give;
  }
  yr.shortUsd = Math.max(0, target - _fiscNum(yr.provUsd));
  yr.fxLast = fx;
  if (Math.abs(moved) >= 0.005) {
    var src = moved > 0 ? (source === 'trade' ? 'tax_trade_close' : 'tax_adjust') : (source === 'trade' ? 'tax_release' : 'tax_adjust');
    var ex = { year: yr.y }; if (extra) for (var k in extra) ex[k] = extra[k];
    _fiscLog(w, moved, src, ex);
  }
  return moved;
}

// Années passées non payées : une année qui vient d'être close voit sa provision remise au dû figé ; une année close à
// laquelle il manquait de l'argent (compte vide à l'époque) est recomplétée. Au cours du moment.
function _fiscSettleClosed(L, w, y, fx, justClosed) {
  _fiscReconcile(L, w);   // d'abord : une provision que le dépôt ne tient plus devient un manque à recompléter
  var m = 0;
  Object.keys(L.years).map(Number).sort(function (a, b) { return a - b; }).forEach(function (k) {
    var v = L.years[k];
    if (k < y && v.closed && !v.paid && (justClosed.indexOf(k) >= 0 || _fiscNum(v.shortUsd) > 1e-9))
      m += _fiscRebalance(L, w, v, fx, 'adjust', { why: 'clôture ' + k });
  });
  return m;
}

// ── À LA FERMETURE D'UN TRADE (appelé par recordFees, 02, dans le mode de la position) ─────────────────────────────
// fees = { tradingFee, slipFee } de recordFees ; exitPx = prix de sortie. Retourne le mouvement du dépôt ($, signé).
function _fiscOnClose(pos, pnlUsd, fees, exitPx) {
  var mode = (typeof _walletKey === 'function') ? _walletKey() : 'sim';
  var w = _fiscWallet(mode); if (!w || !pos) return { movedUsd: 0 };
  var L = _fiscLedger(mode, true), cfg = _fiscCfg(), isReal = mode === 'real';
  var now = Date.now(), y = _fiscYearOf(now);
  var fxo = _fiscFx(), fxOut = fxo.r;
  var ro = _fiscRoll(L, y, cfg, isReal), yr = ro.yr;
  _fiscSettleClosed(L, w, y, fxOut, ro.closed);
  var fxIn = (isFinite(Number(pos._fxIn)) && Number(pos._fxIn) > 0) ? Number(pos._fxIn) : fxOut;
  var rg = _fiscRegimeOf(pos);
  var N = _fiscNum(pos.totalExposure) || _fiscNum(pos.stakeUsdt);
  var tf = _fiscNum(fees && fees.tradingFee), sf = _fiscNum(fees && fees.slipFee);
  var gainEur = _fiscGainEur(pos.side, N, pnlUsd, sf, fxIn, fxOut);
  var feeEur = tf * fxOut;
  // la provision déjà tenue est d'abord réévaluée au cours du moment (mouvement « réajustement », pas imputé au trade) :
  // ce que le trade verse ou rend est SA part marginale de l'impôt de l'année, rien d'autre
  var d0 = _fiscDue(yr, cfg, isReal).due;
  yr.dueEur = d0;
  _fiscRebalance(L, w, yr, fxOut, 'adjust', { why: 'cours €' });
  var bucket = rg.regime === 'normal' ? yr.normal : yr.spec;
  if (gainEur >= 0) bucket.gain += gainEur; else bucket.loss += -gainEur;
  if (rg.regime === 'spec') yr.spec.fee += feeEur;
  yr.n++; if (rg.regime === 'normal') yr.nN++; else yr.nS++;
  yr.feesUsd += tf; yr.slipUsd += sf;
  var d1 = _fiscDue(yr, cfg, isReal);
  yr.dueEur = d1.due;
  var moved = _fiscRebalance(L, w, yr, fxOut, 'trade', { pair: pos.pair, regime: rg.regime });
  var pp = yr.pairs[pos.pair] || (yr.pairs[pos.pair] = { n: 0, nN: 0, nS: 0, gN: 0, gS: 0, feeUsd: 0, slipUsd: 0, movedUsd: 0, win: 0 });
  pp.n++; if (rg.regime === 'normal') { pp.nN++; pp.gN += gainEur; } else { pp.nS++; pp.gS += gainEur - feeEur; }
  pp.feeUsd += tf; pp.slipUsd += sf; pp.movedUsd += moved; if (gainEur > 0) pp.win++;
  var q = function (v) { return Math.round(_fiscNum(v) * 1e6) / 1e6; };   // 6 décimales : le registre reste léger (sauvé toutes les 10 s)
  var h = {
    t: now, y: y, p: pos.pair, s: pos.side === 'long' ? 'L' : 'S', a: pos.auto === true ? 1 : 0,
    lv: q(Math.max(_fiscNum(pos.levBorrowed), N - _fiscNum(pos.stakeUsdt))), r: rg.regime === 'normal' ? 'n' : 's',
    x0: _fiscNum(pos.entryPrice), x1: _fiscNum(exitPx), N: q(N), st: q(pos.stakeUsdt), pu: q(pnlUsd), sl: q(sf), fe: q(tf),
    fi: fxIn, fo: fxOut, ff: fxo.fallback ? 1 : 0, g: q(gainEur), fE: q(rg.regime === 'spec' ? feeEur : 0),
    d0: q(d0), d1: q(d1.due), mv: q(moved), sh: q(yr.shortUsd), hm: (_fiscNum(pos.entryTs) > 0 ? now - _fiscNum(pos.entryTs) : 0)
  };
  L.hist.unshift(h);
  var cap = _FISC_HIST_MAX[mode] || 300;
  if (L.hist.length > cap) L.hist.length = cap;
  L.rev++;
  return { movedUsd: moved, regime: rg.regime, why: rg.why, gainEur: gainEur, feeEur: feeEur, dueBefore: d0, dueAfter: d1.due };
}

// ── RÉAJUSTEMENT (bot fiscal, toutes les 10 min ; réglage modifié) : nouvelle année, cours €, réglages, manque ─────────
function _fiscAdjust(mode, why) {
  if (!S.taxConfig || S.taxConfig.region !== 'BE') return 0;   // autre région : le registre ne bouge pas d'argent
  var L = _fiscLedger(mode, false); if (!L) return 0;
  var w = _fiscWallet(mode), cfg = _fiscCfg(), isReal = mode === 'real';
  var y = _fiscYearOf(Date.now()), fx = _fiscFx().r;
  var ro = _fiscRoll(L, y, cfg, isReal), yr = ro.yr;
  var moved = _fiscSettleClosed(L, w, y, fx, ro.closed);
  yr.dueEur = _fiscDue(yr, cfg, isReal).due;
  moved += _fiscRebalance(L, w, yr, fx, 'adjust', { why: why || 'réajustement' });
  if (Math.abs(moved) > 1e-9 || ro.closed.length) L.rev++;
  return moved;
}
function _fiscAdjustAll(why) {
  var m = 0;
  ['sim', 'paperReal', 'real'].forEach(function (k) { try { m += _fiscAdjust(k, why); } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} } });
  return m;
}

// Année close et payée : sa provision quitte le dépôt (l'impôt est réglé). Deux touches (pas de confirm() bloquant).
function _fiscMarkPaid(mode, y) {
  var L = _fiscLedger(mode, false); if (!L || !L.years[y]) return false;
  var yr = L.years[y]; if (!yr.closed || yr.paid) return false;
  var w = _fiscWallet(mode);
  var out = Math.min(_fiscNum(yr.provUsd), Math.max(0, _fiscNum(w.fiscalReserveAccount)));
  w.fiscalReserveAccount = _fiscNum(w.fiscalReserveAccount) - out;
  _fiscLog(w, -out, 'tax_paid', { year: y });
  yr.paid = true; yr.paidTs = Date.now(); yr.paidUsd = out; yr.provUsd = 0; yr.shortUsd = 0;
  L.rev++;
  return true;
}


// Une perte latente qui baisserait vraiment l'impôt de l'année si elle était réalisée maintenant (même régime).
function _fiscHarvest(mode) {
  var w = _fiscWallet(mode); if (!w) return null;
  var L = _fiscLedger(mode, false), cfg = _fiscCfg(), isReal = mode === 'real';
  var y = _fiscYearOf(Date.now());
  var yr = (L && L.years[y]) ? L.years[y] : null;
  if (!yr) return null;
  var base = _fiscDue(yr, cfg, isReal).due;
  if (!(base > 0)) return null;
  var fx = _fiscFx().r, fc = (S && S.feeConfig) || {};
  var best = null;
  (w.openPositions || []).forEach(function (p) {
    var ps = (w.pairStates && w.pairStates[p.pair]) || (S.pairStates && S.pairStates[p.pair]);
    var px = ps && ps.price > 0 ? ps.price : 0;
    if (!(px > 0) || !(p.entryPrice > 0)) return;
    var N = _fiscNum(p.totalExposure) || _fiscNum(p.stakeUsdt);
    var pct = p.side === 'long' ? (px - p.entryPrice) / p.entryPrice : (p.entryPrice - px) / p.entryPrice;
    var pnl = Math.max(-_fiscNum(p.stakeUsdt), N * pct);
    if (!(pnl < 0)) return;
    var stake = _fiscNum(p.stakeUsdt);
    var tf = stake * (_fiscNum(fc.takerRate) * 2), sf = stake * _fiscNum(fc.slippage) * 2;
    var rg = _fiscRegimeOf(p);
    var fxIn = (_fiscNum(p._fxIn) > 0) ? _fiscNum(p._fxIn) : fx;
    var g = _fiscGainEur(p.side, N, pnl, sf, fxIn, fx);
    var cp = JSON.parse(JSON.stringify(yr));
    var b = rg.regime === 'normal' ? cp.normal : cp.spec;
    if (g >= 0) b.gain += g; else b.loss += -g;
    if (rg.regime === 'spec') cp.spec.fee += tf * fx;
    var sav = base - _fiscDue(cp, cfg, isReal).due;
    if (sav > 0.005 && (!best || sav > best.savingEur)) best = { pos: p, pair: p.pair, regime: rg.regime, savingEur: sav, savingUsd: sav / fx, pnlUsd: pnl };
  });
  return best;
}

// Impôt dû de l'année en cours à ce jour, en $ au cours du moment (02 calcTaxProvision : pages Frais, CSV, santé du trading).
function _fiscDueNowUsd(mode) {
  var L = _fiscLedger(mode, false); if (!L) return 0;
  var yr = L.years[_fiscYearOf(Date.now())]; if (!yr) return 0;
  return _fiscDue(yr, _fiscCfg(), mode === 'real').due / _fiscFx().r;
}

// Impôt de l'année qui bougerait (en $, signé) si TOUTES les positions ouvertes du mode fermaient maintenant : + versé
// au dépôt, − rendu (borné par la provision tenue). Pour le « net en poche » de l'accueil (07).
function _fiscLatentTaxUsd(mode) {
  var w = _fiscWallet(mode); if (!w) return 0;
  var pos = w.openPositions || []; if (!pos.length) return 0;
  var L = _fiscLedger(mode, false), cfg = _fiscCfg(), isReal = mode === 'real';
  var y = _fiscYearOf(Date.now());
  var yr = (L && L.years[y]) ? L.years[y] : _fiscNewYear(y, L ? L.carry : null);
  var fx = _fiscFx().r, fc = (S && S.feeConfig) || {};
  var cp = JSON.parse(JSON.stringify(yr));
  pos.forEach(function (p) {
    var ps = (w.pairStates && w.pairStates[p.pair]) || null;
    var px = ps && ps.price > 0 ? ps.price : 0;
    if (!(px > 0) || !(p.entryPrice > 0)) return;
    var N = _fiscNum(p.totalExposure) || _fiscNum(p.stakeUsdt), stake = _fiscNum(p.stakeUsdt);
    var pct = p.side === 'long' ? (px - p.entryPrice) / p.entryPrice : (p.entryPrice - px) / p.entryPrice;
    var pnl = Math.max(-stake, N * pct);
    var tf = stake * _fiscNum(fc.takerRate) * 2, sf = stake * _fiscNum(fc.slippage) * 2;
    var rg = _fiscRegimeOf(p);
    var g = _fiscGainEur(p.side, N, pnl, sf, (_fiscNum(p._fxIn) > 0 ? _fiscNum(p._fxIn) : fx), fx);
    var b = rg.regime === 'normal' ? cp.normal : cp.spec;
    if (g >= 0) b.gain += g; else b.loss += -g;
    if (rg.regime === 'spec') cp.spec.fee += tf * fx;
  });
  var dUsd = (_fiscDue(cp, cfg, isReal).due - _fiscDue(yr, cfg, isReal).due) / fx;
  return dUsd >= 0 ? dUsd : -Math.min(-dUsd, _fiscNum(yr.provUsd));
}

// Passe du bot fiscal : années, cours, réglages, manque — toutes les 10 min (rien à chaque tick).
function _fiscBotPass() {
  try { if (typeof S === 'undefined' || !S || !S.walletStore) return; _fiscAdjustAll('passe du bot fiscal'); } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} }
}
try { if (typeof window !== 'undefined' && !window.__fiscPassIv) window.__fiscPassIv = setInterval(_fiscBotPass, 600000); } catch (e) {}

try {
  window.FISC_BE = FISC_BE;
  window._fiscYearOf = _fiscYearOf; window._fiscAmounts = _fiscAmounts; window._fiscCfg = _fiscCfg; window._fiscFx = _fiscFx;
  window._fiscRegimeOf = _fiscRegimeOf; window._fiscGainEur = _fiscGainEur; window._fiscNewYear = _fiscNewYear;
  window._fiscDue = _fiscDue; window._fiscCloseYear = _fiscCloseYear; window._fiscRoll = _fiscRoll; window._fiscLedger = _fiscLedger;
  window._fiscOnClose = _fiscOnClose; window._fiscAdjust = _fiscAdjust; window._fiscAdjustAll = _fiscAdjustAll; window._fiscMarkPaid = _fiscMarkPaid;
  window._fiscHarvest = _fiscHarvest; window._fiscDueNowUsd = _fiscDueNowUsd; window._fiscLatentTaxUsd = _fiscLatentTaxUsd; window._fiscBotPass = _fiscBotPass;
} catch (e) {}
