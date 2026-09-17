// banc-skill-borne.js — mission SKILL BORNÉ 06/09/2026 (agentPairSkill exponentiel)
// Extraction des fonctions/blocs réels des fichiers livrés, S isolé par test (factory).
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const rd = f => fs.readFileSync(f, 'utf8');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const between = (s, a, b) => { const i = s.indexOf(a); if (i < 0) throw new Error('no start ' + a.slice(0, 40)); const j = s.indexOf(b, i); if (j < 0) throw new Error('no end'); return s.slice(i, j); };
const clone = o => JSON.parse(JSON.stringify(o));

// ---------- 1. _saneSkill (09b2) ----------
const s09 = rd('js/09b2-save-load.js');
const saneSrc = between(s09, '    const _saneSkill = (t, cap) => {', '    if (snap.agentPairSkill)');
const saneCtx = {}; vm.createContext(saneCtx); vm.runInContext(saneSrc + ' this._saneSkill = _saneSkill;', saneCtx);
const sane = saneCtx._saneSkill;
{
  const out = sane({ a: { 'BTC/USDT': { w: 1e85, l: 6.6e84 }, 'ETH/USDT': { w: 10, l: 5 } }, b: { 'X': { w: NaN, l: 3 } } }, 500);
  ok(out.a['BTC/USDT'].w === 0 && out.a['BTC/USDT'].l === 0, 'cellule 1e85 → 0/0');
  ok(out.a['ETH/USDT'].w === 10 && out.a['ETH/USDT'].l === 5, 'cellule saine intacte');
  ok(out.b.X.w === 0 && out.b.X.l === 0, 'NaN → 0/0');
  const h = sane({ a: { P: { w: 600, l: 300 } } }, 500).a.P;
  ok(h.w === 300 && h.l === 150, 'halving 900 → 450, ratio 2:1 préservé');
  const c = sane({ a: { P: { w: 1500, l: 600 } } }, 500).a.P;
  ok(c.w === 0 && c.l === 0, '2100 > 4×500 = corrompu → 0/0');
  const e = sane({ a: { P: { w: 1000, l: 1000 } } }, 500).a.P;
  ok(e.w === 250 && e.l === 250, '2000 = 4×cap exactement : pas corrompu, halving ×2 → 250/250');
  ok(JSON.stringify(sane(null, 500)) === '{}', 'null → {}');
  ok(JSON.stringify(sane({ a: {} }, 500)) === '{"a":{}}', 'agent sans cellule conservé vide');
  const neg = sane({ a: { P: { w: -5, l: 3 } } }, 500).a.P; ok(neg.w === 0 && neg.l === 0, 'négatif → 0/0');
  ok(sane(sane({ a: { P: { w: 700, l: 100 } } }, 500), 500).a.P.w === 350, 'idempotent (2e passage sans effet)');
  ok(s09.includes('S.discipleTaskSkill = _saneSkill(snap.discipleTaskSkill, 500)'), '09b2 discipleTaskSkill assaini');
  ok(s09.includes('S.agentPairSkill    = _saneSkill(snap.agentPairSkill, 500)'), '09b2 agentPairSkill assaini');
}

// ---------- 2. triggerEvolution (07) + _onAgentEvolved (12) — [1c-FULL 16/09] le savoir reste avec le siège ----------
const s07 = rd('js/07-v90-mode-bunker-sos.js'), s12 = rd('js/12-bots-disciples.js');
const evoSrc = between(s07, 'function triggerEvolution(weak) {', 'buildAgentCards(); patchAgentCards();\n}') + 'buildAgentCards(); patchAgentCards();\n}';
const heirSrc = between(s12, 'window._onAgentEvolved = function (deadId, prevName, memory, skillCopy) {', '\n(function _disciplesBoot');
function mkAgent(id, fit) { return { id, name: 'A' + id, type: 'x·y', source: 'a/b', fitness: fit, score: 0.3, conf: 0.6, color: '#fff', memory: [], errors: 0, corrections: 0, streak: 0, regimeFitness: {} }; }
function mkCtx(withHeir) {
  const S = { agents: [], evoLog: [], chainLog: [], cycle: 5, _lastEvolutionAt: 0, agentPairSkill: {}, discipleTaskSkill: {}, botDisciples: { bot1: ['s1', 's2', 's3'] } };
  for (let i = 1; i <= 3; i++) S.agents.push(mkAgent('s' + i, 400));
  for (let i = 1; i <= 7; i++) S.agents.push(mkAgent('p' + i, 300 + i * 10));
  const ctx = { S, window: {}, showToast() {}, buildAgentCards() {}, patchAgentCards() {}, Math, Date, console, JSON, Number, Object, Set, Array };
  ctx.window._decErr = e => { throw e; };
  vm.createContext(ctx);
  vm.runInContext('function detectMarketRegime(){return "range";}\nfunction nowStr(){return "t";}\nfunction bumpVersion(){}\nfunction rndHash(){return "h";}\n' + evoSrc + '\nthis.triggerEvolution = triggerEvolution;', ctx);
  if (withHeir) vm.runInContext('function _pepiniere(){ return S.agents.filter(a => !Object.keys(S.botDisciples).some(b => S.botDisciples[b].indexOf(a.id) !== -1)); }\n' + heirSrc, ctx);
  return ctx;
}
// [1c-FULL · 16/09/2026] règle Rams 16/09 : le savoir reste avec le siège ; la succession ne déplace que l'affectation.
{ // le siège recyclé GARDE tout ; _onAgentEvolved reçoit (id, nom) sans copie
  const ctx = mkCtx(false); const S = ctx.S; let got = 'unset';
  ctx.window._onAgentEvolved = (id, name, mem, copy) => { got = { id, name, mem, copy }; };
  S.agentPairSkill.s1 = { 'BTC/USDT': { w: 30, l: 10 } }; S.discipleTaskSkill.s1 = { direction: { w: 8, l: 2 } };
  S.agents[0].memory = [{ pair: 'BTC/USDT', won: true }]; S.agents[0].regimeFitness = { calm: { wins: 3, total: 5, sumPnl: 1.2 } };
  S.agents.forEach(a => { if (a.id !== 's1') a.fitness = 1300; });   // tout candidat du tournoi vaut 1300 → naissance 650
  ctx.triggerEvolution(S.agents[0]);
  ok(got && got.id === 's1' && got.mem === undefined && got.copy === undefined, '_onAgentEvolved(id, nom) : aucune copie envoyée');
  ok(S.agentPairSkill.s1['BTC/USDT'].w === 30 && S.agentPairSkill.s1['BTC/USDT'].l === 10, '07 : agentPairSkill du siège CONSERVÉ');
  ok(S.discipleTaskSkill.s1.direction.w === 8, '07 : discipleTaskSkill du siège CONSERVÉ');
  ok(S.agents[0].memory.length === 1 && S.agents[0].regimeFitness.calm.total === 5, '07 : mémoire et regimeFitness du siège CONSERVÉES');
  ok(S.agents[0].fitness === 650, 'fitness de naissance = max(350, moyenne des parents 1300 / 2) = 650 (' + S.agents[0].fitness + ')');
  ok(S.agents[0].streak === 0 && S.agents[0].fitnessHistory[S.agents[0].fitnessHistory.length - 1] === 650, 'série remise à zéro, historique de fitness continué');
}
{ // plancher 350 quand les parents sont faibles
  const ctx = mkCtx(false); const S = ctx.S;
  ctx.triggerEvolution(S.agents[1]);
  ok(S.agents[1].fitness === 350, 'parents ≤ 700 de moyenne → plancher 350 (' + S.agents[1].fitness + ')');
}
{ // succession : l'héritier prend le siège auprès du bot, chacun garde son savoir
  const ctx = mkCtx(true); const S = ctx.S;
  S.agentPairSkill.p7 = { P: { w: 300, l: 300 } }; S.agentPairSkill.s1 = { P: { w: 5, l: 5 } };
  S.agents.find(a => a.id === 'p7').memory = [{ m: 1 }]; S.agents[0].memory = [{ m: 'seat' }];
  ctx.window._onAgentEvolved('s1', 'feu');
  ok(S.botDisciples.bot1[0] === 'p7', 'héritier = meilleur de la pépinière (p7)');
  ok(S.agentPairSkill.p7.P.w === 300 && S.agentPairSkill.p7.P.l === 300, '12 : compétence de l\'héritier intacte (aucune fusion)');
  ok(S.agentPairSkill.s1.P.w === 5 && S.agents[0].memory[0].m === 'seat', '12 : le siège recyclé garde compétence et mémoire');
  ok(S.agents.find(a => a.id === 'p7').memory.length === 1, '12 : mémoire de l\'héritier intacte');
}
{ // RÉGRESSION : 300 successions, la masse ne peut plus exploser (rien n'est dupliqué ; plafond 500 de 03 sur l'accumulation réelle)
  const ctx = mkCtx(true); const S = ctx.S;
  const s03b = rd('js/03-per-pair-position-buttons-controls-buid.js');
  vm.runInContext('this.acc = function(a, pair, signalStrength, aligned){' + between(s03b, '    if (pair && signalStrength > 0.05) {', '    const prevFitness   = a.fitness;') + '};', ctx);
  for (let i = 0; i < 300; i++) {
    S._lastEvolutionAt = 0;
    const seat = S.botDisciples.bot1[i % 3];
    const a = S.agents.find(x => x.id === seat);
    for (let k = 0; k < 60; k++) ctx.acc(a, 'BTC/USDT', 0.5, k % 3 !== 0);
    ctx.triggerEvolution(a);
  }
  let mx = 0, fin = true, cellsN = 0;
  Object.keys(S.agentPairSkill).forEach(id => Object.keys(S.agentPairSkill[id]).forEach(k => { const c = S.agentPairSkill[id][k]; cellsN++; mx = Math.max(mx, c.w + c.l); fin = fin && isFinite(c.w) && isFinite(c.l); }));
  ok(fin, '300 successions : toutes les cellules finies');
  ok(mx <= 500 && mx >= 250, '300 successions : masse max ' + mx + ' dans [250, 500] (plafond 03, rien dupliqué)');
  ok(cellsN <= 10, '300 successions : ' + cellsN + ' cellules (une par siège, aucune copie)');
}

// ---------- 3. accumulation (03) ----------
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js');
const accSrc = between(s03, '    if (pair && signalStrength > 0.05) {', '    const prevFitness   = a.fitness;');
{
  const ctx = { S: { agents: [{ id: 'a1' }], agentPairSkill: {} }, window: { _decErr: e => { throw e; } }, Object, Set, Math };
  vm.createContext(ctx);
  vm.runInContext('this.acc = function(a, pair, signalStrength, aligned){' + accSrc + '};', ctx);
  for (let i = 0; i < 1200; i++) ctx.acc({ id: 'a1' }, 'BTC/USDT', 0.5, i % 3 !== 0);
  const c = ctx.S.agentPairSkill.a1['BTC/USDT'];
  ok(c.w + c.l <= 500 && c.w + c.l >= 250, '03 : 1200 événements → cellule bornée (' + (c.w + c.l) + ')');
  ok(Math.abs(c.w / (c.w + c.l) - 2 / 3) < 0.02, '03 : ratio 2/3 préservé (' + (c.w / (c.w + c.l)).toFixed(3) + ')');
  ctx.acc({ id: 'a1' }, 'BTC/USDT', 0.01, true);
  ok(c.w + c.l === ctx.S.agentPairSkill.a1['BTC/USDT'].w + ctx.S.agentPairSkill.a1['BTC/USDT'].l, 'signal faible ignoré (garde existante)');
}
// ---------- 4. jury (12) ----------
const jurySrc = between(s12, '    pos._jury.forEach(function (j) {', '  } catch (e) { try{window._decErr');
{
  const ctx = { S: { discipleTaskSkill: {} }, Math };
  vm.createContext(ctx);
  vm.runInContext('this.jury = function(pos, verdicts){' + jurySrc + '};', ctx);
  for (let i = 0; i < 1500; i++) ctx.jury({ _jury: [{ id: 'd1', angle: 'direction', ans: 1 }] }, { direction: i % 4 === 0 ? -1 : 1 });
  const t = ctx.S.discipleTaskSkill.d1.direction;
  ok(t.w + t.l <= 500, '12 jury : 1500 verdicts → cellule bornée (' + (t.w + t.l) + ')');
  ok(Math.abs(t.w / (t.w + t.l) - 0.75) < 0.02, '12 jury : ratio 3/4 préservé');
}
// ---------- 5. structure ----------
{ const _h = rd('AURA8_v118.html'), _tk = (_h.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]; ok(_tk && _h.split('v=' + _tk).length - 1 === 79, 'HTML 79 ressources au token courant ' + _tk); }   // [1c-FULL 16/09] pin figé sur 20260906i depuis le 06/09 : le banc s'arrêtait ici, sections 2-4 jamais rejouées
ok(s12.split('\n').length <= 501, '12 ≤ 500 lignes (' + (s12.split('\n').length - 1) + ')');
console.log('banc-skill-borne : ' + n + '/' + n + ' OK');
