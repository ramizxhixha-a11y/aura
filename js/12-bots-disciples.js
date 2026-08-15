// ▓▓▓ VERSION 20260815b ▓▓▓
// 12-bots-disciples.js — Disciples des bots (architecture Rams, 15/08/2026)
// ════════════════════════════════════════════════════════════════════════
// VISION (édictée par Rams, 15/08) :
//  · Chaque bot a 3 SIÈGES de disciples — des hybrides dédiés qui l'aident à décider
//    (consultation : étape C). Le surplus de T$ du bot au-dessus de 1600 est VERSÉ à
//    ses disciples SELON LEUR MÉRITE (hook _payBotSurplus, appelé par 02).
//  · Les hybrides SANS maître forment la PÉPINIÈRE (≥7) : ils se nourrissent du
//    surplus de tous (redistribution de 02) et sont la relève.
//  · SUCCESSION : quand l'Évolueur recycle un disciple, le MEILLEUR de la pépinière
//    prend le siège en HÉRITANT du savoir du défunt (mémoire + compétence×paire) —
//    parfaitement formé pour sa tâche. Le nouveau-né repart en pépinière.
// Sièges possiblement vacants tant que la pépinière est petite : ils se remplissent
// à mesure, la pépinière reste toujours ≥ 7 (règle Rams).
// ════════════════════════════════════════════════════════════════════════

var _DISCIPLE_BOTS = ['exec_bot_v1','risk_bot_v1','arb_bot_v1','scalper_bot_v1','fiscal_bot_v1','dca_bot_v1','rescue_bot_v1','rebalance_bot_v1','smart_sizer_v1'];
var _PEPINIERE_MIN = 7;

function _assignableHybrids() {
  return (S.agents || []).filter(function (a) {
    return !a.isBot && !a.isMeta && String(a.name || '').indexOf('Hybrid') === 0;
  });
}
function _allSeatIds() {
  var ids = [];
  Object.values(S.botDisciples || {}).forEach(function (arr) { (arr || []).forEach(function (id) { if (id) ids.push(id); }); });
  return ids;
}
function _pepiniere() {
  var seated = new Set(_allSeatIds());
  return _assignableHybrids().filter(function (a) { return !seated.has(a.id); });
}

// ── Assignation initiale / comblement des sièges ────────────────────────
function _ensureDisciples() {
  if (!S.botDisciples) S.botDisciples = {};
  _DISCIPLE_BOTS.forEach(function (b) { if (!Array.isArray(S.botDisciples[b])) S.botDisciples[b] = [null, null, null]; });
  // nettoyer les sièges pointant vers des ids disparus
  var liveIds = new Set((S.agents || []).map(function (a) { return a.id; }));
  Object.keys(S.botDisciples).forEach(function (b) {
    S.botDisciples[b] = S.botDisciples[b].map(function (id) { return (id && liveIds.has(id)) ? id : null; });
  });
  // combler : les bots par fitness décroissante choisissent d'abord ; la pépinière
  // fournit ses meilleurs, sans jamais descendre sous _PEPINIERE_MIN.
  var bots = (S.agents || []).filter(function (a) { return a.isBot && _DISCIPLE_BOTS.indexOf(a.id) !== -1; })
    .sort(function (x, y) { return (y.fitness || 0) - (x.fitness || 0); });
  var assigned = 0;
  for (var round = 0; round < 3; round++) {
    for (var i = 0; i < bots.length; i++) {
      var seats = S.botDisciples[bots[i].id];
      if (seats[round]) continue;
      var pep = _pepiniere().sort(function (x, y) { return (y.fitness || 0) - (x.fitness || 0); });
      if (pep.length <= _PEPINIERE_MIN) return _logAssign(assigned);
      seats[round] = pep[0].id;
      assigned++;
    }
  }
  _logAssign(assigned);
}
function _logAssign(n) {
  if (!n) return;
  try {
    if (S.chainLog) {
      S.chainLog.push({ icon: '🎓', desc: 'Disciples : ' + n + ' siège(s) pourvu(s) · pépinière ' + _pepiniere().length + ' hybride(s) libre(s)', hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
  } catch (e) {}
}

// ── Versement du surplus d'un bot à SES disciples, au mérite ────────────
// Appelé par redistributeFitness (02). Retourne le montant réellement versé ;
// le reste (bot sans disciples) reste dans le pot pépinière de 02.
window._payBotSurplus = function (bot, surplus) {
  try {
    if (!S.botDisciples || !bot || !(surplus > 0)) return 0;
    var ids = (S.botDisciples[bot.id] || []).filter(Boolean);
    if (!ids.length) return 0;
    var ds = ids.map(function (id) { return (S.agents || []).find(function (a) { return a.id === id; }); }).filter(Boolean);
    if (!ds.length) return 0;
    // mérite = taux d'alignement global (corrections vs erreurs), plancher 0.5
    var weights = ds.map(function (a) {
      var h = a.corrections || 0, m = a.errors || 0;
      return 0.5 + ((h + m) >= 5 ? h / (h + m) : 0.5);
    });
    var wSum = weights.reduce(function (x, y) { return x + y; }, 0);
    var paid = 0;
    ds.forEach(function (a, i) {
      var part = surplus * weights[i] / wSum;
      var before = a.fitness || 0;
      a.fitness = Math.min(2000, before + part);
      paid += (a.fitness - before);
    });
    return paid;
  } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} return 0; }
};

// ── Succession : un disciple recyclé → l'héritier de la pépinière prend le siège ──
window._onAgentEvolved = function (deadId, prevName, memory, skillCopy) {
  try {
    if (!S.botDisciples) return;
    var seatBot = null, seatIdx = -1;
    Object.keys(S.botDisciples).forEach(function (b) {
      var i = S.botDisciples[b].indexOf(deadId);
      if (i !== -1) { seatBot = b; seatIdx = i; }
    });
    if (!seatBot) return;   // pas un disciple : rien à faire
    var pep = _pepiniere().filter(function (a) { return a.id !== deadId; })
      .sort(function (x, y) { return (y.fitness || 0) - (x.fitness || 0); });
    if (!pep.length) return;   // pépinière vide : le nouveau-né garde le siège
    var heir = pep[0];
    S.botDisciples[seatBot][seatIdx] = heir.id;   // le nouveau-né (deadId) repart en pépinière
    // Héritage du savoir : compétence×paire fusionnée + mémoire transmise
    var cells = 0;
    if (skillCopy) {
      if (!S.agentPairSkill) S.agentPairSkill = {};
      if (!S.agentPairSkill[heir.id]) S.agentPairSkill[heir.id] = {};
      Object.keys(skillCopy).forEach(function (pair) {
        if (!S.agentPairSkill[heir.id][pair]) S.agentPairSkill[heir.id][pair] = { w: 0, l: 0 };
        S.agentPairSkill[heir.id][pair].w += skillCopy[pair].w || 0;
        S.agentPairSkill[heir.id][pair].l += skillCopy[pair].l || 0;
        cells++;
      });
    }
    if (memory && memory.length) heir.memory = (heir.memory || []).concat(memory).slice(-20);
    var botAgent = (S.agents || []).find(function (a) { return a.id === seatBot; });
    if (S.chainLog) {
      S.chainLog.push({ icon: '🎓', desc: 'Héritage : ' + heir.name + ' reprend le siège de feu ' + prevName + ' auprès de ' + (botAgent ? botAgent.name : seatBot) + ' · savoir transféré (' + cells + ' paires, ' + (memory ? memory.length : 0) + ' souvenirs)', hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
  } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
};

// ── Boot ─────────────────────────────────────────────────────────────────
(function _disciplesBoot() {
  var _t = 0;
  var _iv = setInterval(function () {
    _t++;
    var ready = false;
    try { ready = !!window._stateReady; } catch (e) {}
    if (!ready && _t < 240) return;
    clearInterval(_iv);
    try { _ensureDisciples(); } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
    // comblement périodique (nouveaux hybrides, sièges libérés) : toutes les 5 min
    setInterval(function () { try { _ensureDisciples(); } catch (e) {} }, 300000);
  }, 500);
})();
window._ensureDisciples = _ensureDisciples;
