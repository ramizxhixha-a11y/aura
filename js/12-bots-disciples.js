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

// ── (C) Catalogue des tâches par bot — le VOTE assigne chaque tâche au disciple ──
// le plus méritant (élection rejouée toutes les 10 min : un disciple qui faiblit
// perd sa tâche au profit d'un frère).
var _BOT_TASKS = {
  exec_bot_v1:      ['timing d\u2019ex\u00e9cution', 'lecture volatilit\u00e9', 'taille des chunks'],
  risk_bot_v1:      ['cumul exposition', 'corr\u00e9lation', 'drawdown'],
  arb_bot_v1:       ['d\u00e9tection divergence', 'force corr\u00e9lation', 'timing convergence'],
  scalper_bot_v1:   ['signal LMSR', 'volatilit\u00e9 scalp', 'timing entr\u00e9e'],
  fiscal_bot_v1:    ['timing harvest', 's\u00e9lection perte', 'impact fiscal'],
  dca_bot_v1:       ['d\u00e9tection range', 'bas de range', 'r\u00e9gime plat'],
  rescue_bot_v1:    ['seuil drawdown', 'timing flatten', 'gravit\u00e9'],
  rebalance_bot_v1: ['skew portefeuille', 's\u00e9lection paire', 'timing'],
  smart_sizer_v1:   ['win-rate', 'sharpe par paire', 'kelly']
};

// Mérite d'un disciple : taux d'alignement global (le même que le versement) + conf
function _discipleMerit(a) {
  var h = a.corrections || 0, m = a.errors || 0;
  var rate = (h + m) >= 5 ? h / (h + m) : 0.5;
  return rate * 0.7 + (a.conf || 0.5) * 0.3;
}

// ── Élection des tâches : les disciples d'un bot sont classés par mérite (le vote),
// la tâche 1 (principale) va au plus méritant, etc. Journalisée si changement. ──
function _electTasks() {
  try {
    if (!S.botDisciples) return;
    if (!S.discipleTasks) S.discipleTasks = {};
    var changes = [];
    Object.keys(S.botDisciples).forEach(function (botId) {
      var tasks = _BOT_TASKS[botId] || [];
      var ds = (S.botDisciples[botId] || []).filter(Boolean)
        .map(function (id) { return (S.agents || []).find(function (a) { return a.id === id; }); })
        .filter(Boolean)
        .sort(function (x, y) { return _discipleMerit(y) - _discipleMerit(x); });
      ds.forEach(function (a, i) {
        var task = tasks[i] || tasks[tasks.length - 1] || 'g\u00e9n\u00e9raliste';
        if (S.discipleTasks[a.id] !== task) {
          S.discipleTasks[a.id] = task;
          changes.push(a.name + ' \u2192 \u00ab ' + task + ' \u00bb');
        }
      });
    });
    if (changes.length && S.chainLog) {
      S.chainLog.push({ icon: '\ud83d\uddf3', desc: 'Vote des t\u00e2ches : ' + changes.slice(0, 4).join(' \u00b7 ') + (changes.length > 4 ? ' \u00b7 +' + (changes.length - 4) : ''), hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
  } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
}

// ── Consultation : le bot demande l'avis de SES disciples sur (paire, side) ──
// Chaque disciple pèse par sa confiance × (1 + bonus compétence sur LA paire).
// side connu : accord/désaccord directionnel → mod \u2208 [0.85, 1.15].
// side null (Sizer) : cohérence interne des disciples → confiance dans le sizing.
// Les bots de PROTECTION n'appellent jamais ceci : leurs gardes ne s'adoucissent pas.
window._consultDisciples = function (botId, pair, side) {
  var out = { mod: 1.0, up: 0, down: 0, detail: '' };
  try {
    var ids = (S.botDisciples && S.botDisciples[botId] || []).filter(Boolean);
    if (!ids.length) return out;
    var num = 0, den = 0;
    ids.forEach(function (id) {
      var a = (S.agents || []).find(function (x) { return x.id === id; });
      if (!a) return;
      var dir = (a.score || 0) > 0.02 ? 1 : (a.score || 0) < -0.02 ? -1 : 0;
      if (!dir) return;
      var w = (a.conf || 0.5);
      var sk = S.agentPairSkill && S.agentPairSkill[id] && S.agentPairSkill[id][pair];
      if (sk && (sk.w + sk.l) >= 10) w *= (1 + Math.max(-0.4, Math.min(0.5, (sk.w / (sk.w + sk.l) - 0.5))));
      if (side === 'long' || side === 'short') {
        var want = side === 'long' ? 1 : -1;
        num += dir * want * w; den += w;
        if (dir * want > 0) out.up++; else out.down++;
      } else {
        num += dir * w; den += w;   // cohérence interne (Sizer)
        if (dir > 0) out.up++; else out.down++;
      }
    });
    if (den > 0) {
      var net = num / den;
      if (side === 'long' || side === 'short') out.mod = Math.max(0.85, Math.min(1.15, 1 + net * 0.15));
      else out.mod = Math.max(0.9, Math.min(1.1, 1 + Math.abs(net) * 0.1 * (Math.abs(net) > 0.5 ? 1 : -1)));
      out.detail = out.up + '\u2191' + out.down + '\u2193 \u00d7' + out.mod.toFixed(2);
    }
  } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
  return out;
};

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
    try { _electTasks(); } catch (e) {}
    // comblement périodique (5 min) + réélection des tâches (10 min)
    setInterval(function () { try { _ensureDisciples(); } catch (e) {} }, 300000);
    setInterval(function () { try { _electTasks(); } catch (e) {} }, 600000);
  }, 500);
})();
window._ensureDisciples = _ensureDisciples;


// ════════════════════════════════════════════════════════════════════════
// [(D) FILIATION VISIBLE · 15/08/2026] Décorateur des pages DAO et Agents :
//  · disciple  → « 🎓 disciple de {Bot} · “{tâche}” »
//  · bot       → « 🎓 N disciple(s) : noms »
//  · libre     → « 🌱 pépinière »
// Injection idempotente sous chaque ligne (wrow_{id} au DAO, at_{id} sur Agents),
// veilleur 3 s (survit aux re-rendus), zéro modification des templates existants.
// ════════════════════════════════════════════════════════════════════════
function _filiationLabel(a) {
  try {
    if (a.isMeta) return null;
    if (a.isBot) {
      var ids = (S.botDisciples && S.botDisciples[a.id] || []).filter(Boolean);
      if (!ids.length) return { txt: '\ud83c\udf93 aucun disciple (p\u00e9pini\u00e8re insuffisante)', col: '#667' };
      var names = ids.map(function (id) {
        var d = (S.agents || []).find(function (x) { return x.id === id; });
        return d ? String(d.name).replace('Hybrid ', '') : '?';
      });
      return { txt: '\ud83c\udf93 ' + ids.length + ' disciple(s) : ' + names.join(', '), col: '#5cd6c0' };
    }
    if (String(a.name || '').indexOf('Hybrid') !== 0) return null;   // Contrarian etc. : rien
    var master = null;
    Object.keys(S.botDisciples || {}).forEach(function (b) {
      if ((S.botDisciples[b] || []).indexOf(a.id) !== -1) master = b;
    });
    if (master) {
      var bAgent = (S.agents || []).find(function (x) { return x.id === master; });
      var task = (S.discipleTasks && S.discipleTasks[a.id]) || '';
      return { txt: '\ud83c\udf93 disciple de ' + (bAgent ? bAgent.name : master) + (task ? ' \u00b7 \u00ab ' + task + ' \u00bb' : ''), col: '#b48cff' };
    }
    return { txt: '\ud83c\udf31 p\u00e9pini\u00e8re', col: '#7bd88f' };
  } catch (e) { return null; }
}

function _decorateFiliation() {
  try {
    if (typeof S === 'undefined' || !S || !S.agents) return;
    S.agents.forEach(function (a) {
      var lab = _filiationLabel(a);
      ['wrow_', 'at_'].forEach(function (prefix) {
        var host = document.getElementById(prefix + a.id);
        if (!host) return;
        var fid = 'fil_' + prefix + a.id;
        var el = document.getElementById(fid);
        if (!lab) { if (el) el.remove(); return; }
        if (!el) {
          el = document.createElement('div');
          el.id = fid;
          el.style.cssText = 'font-size:8px;margin-top:2px;letter-spacing:.02em;';
          if (prefix === 'wrow_') {
            var inner = host.querySelector('div[style*="flex:1"]') || host;
            inner.appendChild(el);
          } else {
            host.insertAdjacentElement('afterend', el);
          }
        }
        if (el.textContent !== lab.txt) el.textContent = lab.txt;
        el.style.color = lab.col;
      });
    });
  } catch (e) {}
}
setInterval(function () { try { _decorateFiliation(); } catch (e) {} }, 3000);
