// banc-horloge-mode.js — [HORLOGE PAR MODE · 01/10/2026] VERSION 20261001a
// Rams (01/10 20:51, « Go ») sur ma proposition : « l'horloge par mode en premier : petite correction qui rend ses cycles perdus à chacun des deux
// modes (EV et RE) ». EV et RE partageaient la mémoire de la dernière bougie close vue par paire (S.realPairCycle) : la première porte qui voyait
// la bougie la prenait, l'autre mode n'avait pas de cycle. Maintenant l'horloge est dans le portefeuille de chaque mode (accesseur, 02), et ce qui
// est appris d'une bougie l'est une fois (03).
// Code RÉEL en vm : bloc des portefeuilles et accesseurs de 02 (installés comme dans l'app), portes RÉELLES 10g (EV) et 08 (RE, qui aiguille EV vers
// 10g) entrelacées sous des minuteries de cadences différentes, bloc de la décision commune de 03 (_dcForwardJudge, _dcSnapVotes, _thNote, _vjNote).
// Dents : les mêmes portes sur l'ANCIENNE horloge (une seule pour les deux modes) reproduisent la course mesurée (backup 29/09, rejeu EV + RE).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 60)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 60)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 60)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const J = x => JSON.parse(JSON.stringify(x));
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s08 = rd('js/08-learning-history-render.js'), s10g = rd('js/10g-resolveur-ev-csv.js'),
  s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'), html = rd('AURA8_v118.html');
const WALLET = between(s02, 'function _freshWallet() {', 'function setBotMode(isAuto) {', false);
const ISRL = between(s02, 'function _isRealLike() {', 'window._isRealLike = _isRealLike;', false);
const GATE_EV = between(s10g, 'function _resolvePaperRealCycle(pair, ps) {', 'window._resolvePaperRealCycle = _resolvePaperRealCycle;', false);
const GATE_RE = between(s08, 'function resolvePairCycle(pair, ps) {', "if(typeof resolvePairCycle==='function') window.resolvePairCycle = resolvePairCycle;", false);
const DC = between(s03, "const _DC_BOTS = ['scalper_bot_v1', 'arb_bot_v1', 'dca_bot_v1'];", 'window._thNote = _thNote;', false);
const RESET = s02.split('\n').filter(l => l.includes("['paperReal', 'real'].forEach(function (_m) { try { _walletFor(_m).realPairCycle = {}; } catch (e) {} });"));
const F = 900000, H = 3600000, TFMS = { '15m': F, '1h': H }, PAIRS3 = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
console.log('▶ banc-horloge-mode');

// Un monde : S de départ (comme l'app au chargement : realPairCycle simple), puis — horloge par mode — le bloc RÉEL des portefeuilles de 02, qui
// installe les accesseurs exactement comme dans l'app ; sans lui, l'ancienne horloge (une seule pour les deux modes).
function world(perMode) {
  const S = { tradingMode: 'paperReal', paperRealTimeframe: '15m', realTimeframe: '15m', paperRealActivePairs: {}, realActivePairs: {}, paperRealKillSwitch: {}, realKillSwitch: {},
    paperRealConfig: { cooldownMs: 0 }, paperRealLastClose: {}, realCandles: {}, realPairCycle: {}, fullPowerMode: false, pairStates: {}, openPositions: [] };
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, console, window: {}, Date: { now: () => c.__now }, __now: 0, PAIRS: {}, cores: [], fetches: 0 };
  c._resolvePairCycleCore = (pair, ps) => { c.cores.push({ m: S.tradingMode, p: pair, k: S.realPairCycle[pair], t: c.__now, ps: ps }); };
  c._fetchAndBootstrapRealCandles = () => { c.fetches++; };
  vm.createContext(c);
  vm.runInContext((perMode ? WALLET + '\n' : '') + ISRL + '\n' + GATE_EV + '\n' + GATE_RE, c);
  return c;
}
// Bougies réelles fabriquées : 40 closes avant t0 + celle en cours, pour chaque pas de temps ; une nouvelle à chaque frontière.
const kl = (ts, px) => ({ ts, o: px, h: px * 1.001, l: px * 0.999, c: px, v: 1 });
function feed(c, pairs, t0) { pairs.forEach(p => { c.S.realCandles[p] = {}; Object.keys(TFMS).forEach(tf => { const f = TFMS[tf], a = []; for (let i = 40; i >= 0; i--) a.push(kl(Math.floor(t0 / f) * f - i * f, 100)); c.S.realCandles[p][tf] = a; }); }); }
// Le battement : chaque seconde, chaque mode en marche décompte la minuterie de chaque paire (cadence propre au mode et à la paire, comme ps.cycleMax) ;
// à zéro, le cycle de la paire passe par la porte RÉELLE du mode (08 resolvePairCycle → EV : 10g), S.tradingMode basculé comme le multiplexeur.
function beat(c, o) {
  const S = c.S, t0 = o.t0, ord = o.order || ['real', 'paperReal'];
  S.paperRealTimeframe = o.tfE || '15m'; S.realTimeframe = o.tfR || '15m';
  o.pairs.forEach(p => { S.paperRealActivePairs[p] = true; S.realActivePairs[p] = true; });
  feed(c, o.pairs, t0);
  const tm = { paperReal: {}, real: {} }, ps = { paperReal: {}, real: {} };
  o.pairs.forEach(p => { ps.paperReal[p] = { mode: 'paperReal' }; ps.real[p] = { mode: 'real' }; });
  for (let t = t0; t < t0 + o.hours * H; t += 1000) {
    c.__now = t;
    if (t > t0) o.pairs.forEach(p => Object.keys(TFMS).forEach(tf => { if (t % TFMS[tf] === 0) c.S.realCandles[p][tf].push(kl(t, 100)); }));
    if (o.hook) o.hook(t);
    const order = (typeof ord === 'function') ? ord(t) : ord;
    order.forEach(m => o.pairs.forEach(p => {
      tm[m][p] = (tm[m][p] === undefined ? o.cad[m][p] : tm[m][p]) - 1;
      if (tm[m][p] > 0) return;
      tm[m][p] = o.cad[m][p]; S.tradingMode = m; c.resolvePairCycle(p, ps[m][p]);
    }));
  }
  S.tradingMode = 'paperReal';
  return ps;
}
// Bougies closes attendues pour un pas de temps : de celle close à t0 à la dernière close avant la fin
const closed = (t0, hours, tf) => { const f = TFMS[tf], out = []; for (let k = Math.floor(t0 / f) * f - f; k + f < t0 + hours * H; k += f) out.push(k); return out; };
const ks = (c, m, p) => c.cores.filter(x => x.m === m && x.p === p).map(x => x.k);
const T0 = Math.floor(1790000000000 / H) * H;
const CAD = { paperReal: { 'BTC/USDT': 120, 'ETH/USDT': 40, 'SOL/USDT': 60 }, real: { 'BTC/USDT': 50, 'ETH/USDT': 50, 'SOL/USDT': 60 } };   // backup 29/09 : EV BTC 120 s, RE BTC 50 s ; EV ETH 40 s, RE ETH 50 s

T('H1 · 02 réel : S.realPairCycle devient un accesseur du portefeuille du MODE traité (installé comme dans l\'app) — chaque mode a son horloge, persistée avec son portefeuille ; un portefeuille d\'avant est complété ; une affectation ne touche que le mode traité ; le retour pré-réel remet à zéro EV et RE', () => {
  const c = world(true), S = c.S;
  const d = Object.getOwnPropertyDescriptor(S, 'realPairCycle'); assert.ok(d && typeof d.get === 'function' && typeof d.set === 'function', 'accesseur installé');
  assert.ok(c._WALLET_ACCESSOR_FIELDS.includes('realPairCycle') && c._WALLET_ACCESSOR_FIELDS.includes('pairStates'));
  ['sim', 'paperReal', 'real'].forEach(m => assert.deepStrictEqual(J(S.walletStore[m].realPairCycle), {}, m + ' : horloge vide au départ'));
  S.tradingMode = 'paperReal'; S.realPairCycle['BTC/USDT'] = 111;
  S.tradingMode = 'real'; assert.strictEqual(S.realPairCycle['BTC/USDT'], undefined, 'RE ne voit pas l\'horloge EV'); S.realPairCycle['BTC/USDT'] = 222;
  S.tradingMode = 'paperReal'; assert.strictEqual(S.realPairCycle['BTC/USDT'], 111);
  assert.deepStrictEqual([S.walletStore.paperReal.realPairCycle['BTC/USDT'], S.walletStore.real.realPairCycle['BTC/USDT']], [111, 222], 'rangées dans le portefeuille de chaque mode (sauvé entier : 09b1 walletStore)');
  assert.ok(/\n\s*walletStore:\s+S\.walletStore,/.test(s9b1) && s9b2.includes("if (snap.walletStore && typeof snap.walletStore === 'object') S.walletStore = snap.walletStore;"), 'walletStore sauvé et relu entier');
  // affectation : le mode traité seulement (portes 10g / 08 : « if (!S.realPairCycle) S.realPairCycle = {} »)
  S.tradingMode = 'real'; S.realPairCycle = {}; assert.deepStrictEqual([S.walletStore.paperReal.realPairCycle['BTC/USDT'], J(S.walletStore.real.realPairCycle)], [111, {}]);
  // portefeuille d'avant (sauvegarde du 29/09 : pas de champ) : complété au chargement (_ensureWalletStore réel)
  delete S.walletStore.real.realPairCycle; S.tradingMode = 'real'; assert.strictEqual(S.realPairCycle, undefined);
  c._ensureWalletStore(); assert.deepStrictEqual(J(S.walletStore.real.realPairCycle), {}, 'complété'); assert.strictEqual(S.walletStore.paperReal.realPairCycle['BTC/USDT'], 111, 'EV intact');
  // retour pré-réel (02, ligne RÉELLE) : le mode est déjà AA quand il remet les horloges à zéro → EV et RE remis à zéro, AA intact
  assert.strictEqual(RESET.length, 1, 'ligne de remise à zéro unique dans 02');
  S.walletStore.sim.realPairCycle = { x: 1 }; S.walletStore.real.realPairCycle = { 'BTC/USDT': 5 }; S.tradingMode = 'sim';
  vm.runInContext(RESET[0], c);
  assert.deepStrictEqual([J(S.walletStore.paperReal.realPairCycle), J(S.walletStore.real.realPairCycle), J(S.walletStore.sim.realPairCycle)], [{}, {}, { x: 1 }]);
  const rb = codeStrict(between(s02, '    // 4. Réinitialiser les modes spéciaux', '    // 5. UI refresh', false));
  const rbCode = rb.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');   // sans les commentaires de fin de ligne
  assert.ok(rb.indexOf("S.tradingMode = 'sim';") < rb.indexOf(RESET[0].trim().slice(0, 40)) && !/S\.realPairCycle\s*=\s*\{\}/.test(rbCode), 'retour pré-réel : plus d\'affectation à l\'horloge du mode courant (AA) à la place de celles d\'EV et RE');
});

T('H2 · portes RÉELLES 10g (EV) et 08 (RE) entrelacées, cadences du backup du 29/09 (EV BTC 120 s / RE 50 s, EV ETH 40 s / RE 50 s, SOL 60 s / 60 s), 15 min tous les deux, 6 h : chaque mode a son cycle à CHAQUE bougie close de chaque paire, une fois, dans l\'ordre, et lit SA bougie — dents : sur l\'ancienne horloge, une bougie = un seul mode, toujours le même par paire', () => {
  const exp = closed(T0, 6, '15m');
  const c = world(true); beat(c, { t0: T0, hours: 6, pairs: PAIRS3, cad: CAD });
  ['paperReal', 'real'].forEach(m => PAIRS3.forEach(p => assert.deepStrictEqual(ks(c, m, p), exp, m + ' ' + p + ' : chaque bougie close, une fois, dans l\'ordre')));
  assert.strictEqual(c.cores.length, 2 * 3 * exp.length);
  // l'horloge lue par 03 au cycle (_thNote, _vjNote, _mktOpen : S.realPairCycle[pair]) est celle du mode : la bougie qui vient de clore
  c.cores.forEach(x => assert.ok(x.ps.mode === x.m, 'le cycle reçoit la paire de SON mode'));
  // l'ordre de passage des modes ne change rien (le multiplexeur traite le mode affiché en dernier ; ici aussi l'inverse, et en alternance)
  [['paperReal', 'real'], t => ((t / 1000) % 2 ? ['real', 'paperReal'] : ['paperReal', 'real'])].forEach(order => {
    const c2 = world(true); beat(c2, { t0: T0, hours: 6, pairs: PAIRS3, cad: CAD, order });
    ['paperReal', 'real'].forEach(m => PAIRS3.forEach(p => assert.deepStrictEqual(ks(c2, m, p), exp, 'ordre ' + (typeof order === 'function' ? 'alterné' : order.join('>')) + ' · ' + m + ' ' + p)));
  });
  // DENTS : l'ancienne horloge (une seule) — même battement, mêmes portes
  const o = world(false); beat(o, { t0: T0, hours: 6, pairs: PAIRS3, cad: CAD });
  PAIRS3.forEach(p => {
    const e = ks(o, 'paperReal', p), r = ks(o, 'real', p);
    assert.deepStrictEqual(e.concat(r).sort((a, b) => a - b), exp, p + ' : ancienne horloge — chaque bougie dans UN seul mode');
  });
  assert.deepStrictEqual([ks(o, 'paperReal', 'BTC/USDT').length, ks(o, 'real', 'ETH/USDT').length], [0, 0], 'ancienne horloge : EV n\'a jamais BTC (RE plus rapide), RE n\'a jamais ETH (EV plus rapide) — le backup du 29/09');
});

T('H3 · pas de temps différents (EV 15 min, RE 1 h), 6 h : EV a ses 25 bougies, RE ses 7 — dents : sur l\'ancienne horloge, RE n\'a presque rien (la bougie 15 min plus récente masque la bougie 1 h)', () => {
  const c = world(true); beat(c, { t0: T0, hours: 6, pairs: PAIRS3, cad: CAD, tfE: '15m', tfR: '1h' });
  PAIRS3.forEach(p => { assert.deepStrictEqual(ks(c, 'paperReal', p), closed(T0, 6, '15m'), 'EV ' + p); assert.deepStrictEqual(ks(c, 'real', p), closed(T0, 6, '1h'), 'RE ' + p); });
  const o = world(false); beat(o, { t0: T0, hours: 6, pairs: PAIRS3, cad: CAD, tfE: '15m', tfR: '1h' });
  PAIRS3.forEach(p => assert.ok(ks(o, 'real', p).length <= 1, 'ancienne horloge : RE ' + p + ' ' + ks(o, 'real', p).length));
});

// Décision commune RÉELLE (03) : jugement à la bougie suivante, photo des votes, trades virtuels notés, marché
function dc(o) {
  o = o || {};
  const S = Object.assign({ tradingMode: 'paperReal', paperRealTimeframe: '15m', realTimeframe: '15m', chainLog: [], realPairCycle: {}, realCandles: {}, pairStates: {}, agents: [], _realJudgments: 0 }, o.S || {});
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, console, window: {}, Date: { now: () => c.__now }, __now: o.now || 0, __px: {}, __age: {}, PAIRS: {}, lfo: [], fj: [], __run: { paperReal: true, real: true },
    FIT_WINDOW: 60, FIT_MIN_N: 5, FIT_KEEP: 240, _fitWindow: () => 60, _ownStakeCostPct: () => 0.275, nowStr: () => '12:00:00' };
  c._fitJudge = (v, s, w) => { c.fj.push([v && v.id, s, w]); return 0; };
  c.learnFromOutcome = (src, mv, pair) => { c.lfo.push([S.tradingMode, src, pair, mv, J(c.window.__voteOverride)]); };
  c._rcLastPrice = p => c.__px[p] || 0; c._rcPriceAge = p => (c.__age[p] === undefined ? 0 : c.__age[p]);
  c._isModeRunning = m => !!c.__run[m];
  vm.createContext(c); vm.runInContext(DC, c);
  return { c, S, run: code => vm.runInContext(code, c) };
}
const PAIR = 'SOL/USDT', K = Math.floor(1790000000000 / H) * H;

T('H4 · _dcForwardJudge réel : EV et RE sur le même pas de temps — les votes photographiés à une bougie sont jugés UNE fois, par le premier mode qui arrive (agents, composite, marché) ; seulement sur les 4 bougies qui suivent au plus ; photo d\'avant cette version, d\'un autre pas de temps ou périmée : pas jugée ; marque = l\'ensemble des bougies jugées (pas un plafond), sauvé avec dcThreshold ; deux pas de temps : le plus court en marche nourrit le cerveau ; AA inchangé', () => {
  const t = dc(), snap = (k, tf) => ({ px: 100, t: 0, votes: { a1: 0.5, a2: -0.3 }, comp: 0.3, mk: 0.2, k: k, tf: tf });
  const judge = (mode, ps, kNow, pair) => { t.S.tradingMode = mode; t.S.realPairCycle = { [pair || PAIR]: kNow }; t.c.__ps = ps; return t.run('_dcForwardJudge("' + (pair || PAIR) + '", __ps)'); };
  const n = () => [t.c.lfo.length, t.c.fj.filter(x => x[0] === 'composite').length, t.c.fj.filter(x => x[0] === 'marche').length];
  // bougie K, 15 min : RE arrive le premier (bougie K + F close), EV ensuite → un seul jugement, celui de RE
  assert.strictEqual(judge('real', { price: 101, _voteSnap: snap(K, '15m') }, K + F), 1); assert.deepStrictEqual(n(), [1, 1, 1], 'agents, composite, marché : jugés une fois');
  assert.deepStrictEqual(t.c.lfo[0].slice(0, 3), ['real', 'cycle', PAIR]); assert.ok(Math.abs(t.c.lfo[0][3] - 1) < 1e-9); assert.deepStrictEqual(t.c.lfo[0][4], { pair: PAIR, votes: { a1: 0.5, a2: -0.3 } }, 'les votes de la photo');
  assert.strictEqual(judge('paperReal', { price: 101, _voteSnap: snap(K, '15m') }, K + F), 0); assert.deepStrictEqual(n(), [1, 1, 1], 'EV : déjà jugée par RE');
  assert.deepStrictEqual(J(t.S.dcThreshold.fwdK[PAIR]), [K]);
  // la bougie de la photo elle-même (même cycle) : rien ; deux bougies : jugée ; trois et plus (app gelée, mode sans cycle) : non, sans marque
  assert.strictEqual(judge('paperReal', { price: 101, _voteSnap: snap(K + F, '15m') }, K + F), 0, 'photo de cette bougie-ci');
  assert.strictEqual(judge('paperReal', { price: 101, _voteSnap: snap(K + F, '15m') }, K + 3 * F), 1, 'deux bougies : une porte a pu en sauter une');
  assert.strictEqual(judge('real', { price: 101, _voteSnap: snap(K - 7 * F, '15m') }, K - 3 * F, 'DOT/USDT'), 1, 'quatre bougies (app ralentie en arrière-plan) : jugée');
  assert.strictEqual(judge('real', { price: 101, _voteSnap: snap(K + 2 * F, '15m') }, K + 7 * F), 0, 'cinq bougies : périmée (app gelée)');
  assert.ok(J(t.S.dcThreshold.fwdK[PAIR]).indexOf(K + 2 * F) < 0, 'une photo périmée ne marque rien');
  // L'ENSEMBLE des bougies jugées, pas la plus récente : une photo plus ancienne que la dernière jugée, que personne n'a jugée, l'est (RE en pause, EV a sauté une bougie)
  assert.strictEqual(judge('paperReal', { price: 101, _voteSnap: snap(K + 4 * F, '15m') }, K + 5 * F), 1);
  assert.strictEqual(judge('real', { price: 101, _voteSnap: snap(K + 3 * F, '15m') }, K + 5 * F), 1, 'K + 3F : jamais jugée, plus ancienne que K + 4F');
  assert.strictEqual(judge('paperReal', { price: 101, _voteSnap: snap(K + 3 * F, '15m') }, K + 5 * F), 0);
  // photo d'un autre pas de temps (le mode a changé de pas de temps) : non ; photo d'avant cette version (sans bougie) : non (une fois, au déploiement)
  assert.strictEqual(judge('real', { price: 101, _voteSnap: snap(K, '1h') }, K + F, 'XRP/USDT'), 0, 'photo 1 h, mode en 15 min (paire jamais jugée)');
  assert.strictEqual(judge('real', { price: 101, _voteSnap: { px: 100, t: 0, votes: { a1: 0.5 }, comp: 0.3 } }, K + 5 * F), 0);
  // autre paire : sa propre marque ; mouvement nul : rien, sans marque
  assert.strictEqual(judge('real', { price: 101, _voteSnap: snap(K, '15m') }, K + F, 'BTC/USDT'), 1);
  const before = J(t.S.dcThreshold.fwdK); assert.strictEqual(judge('paperReal', { price: 100, _voteSnap: snap(K + 5 * F, '15m') }, K + 6 * F), 0); assert.deepStrictEqual(J(t.S.dcThreshold.fwdK), before);
  // mémoire bornée (96 bougies par paire)
  for (let i = 0; i < 120; i++) judge('paperReal', { price: 101, _voteSnap: snap(K + (10 + i) * F, '15m') }, K + (11 + i) * F, 'ETH/USDT');
  assert.strictEqual(t.S.dcThreshold.fwdK['ETH/USDT'].length, 96);
  // la marque persiste avec dcThreshold (sauvé et relu entier) : après rechargement, EV ne rejuge pas la bougie K + 4F
  assert.ok(s9b1.includes('dcThreshold: S.dcThreshold || null,') && s9b2.includes("if (snap.dcThreshold && typeof snap.dcThreshold === 'object')"));
  const t2 = dc({ S: { dcThreshold: J(t.S.dcThreshold) } }); t2.S.tradingMode = 'paperReal'; t2.S.realPairCycle = { [PAIR]: K + 5 * F }; t2.c.__ps = { price: 99, _voteSnap: snap(K + 4 * F, '15m') };
  assert.strictEqual(t2.run('_dcForwardJudge("' + PAIR + '", __ps)'), 0); assert.strictEqual(t2.c.lfo.length, 0);
  // deux pas de temps : EV 15 min en marche → RE 1 h ne juge pas (le cerveau se tient sur 15 min) ; EV arrêté → RE juge
  const t3 = dc({ S: { realTimeframe: '1h' } }); t3.S.tradingMode = 'real'; t3.S.realPairCycle = { [PAIR]: K + H }; t3.c.__ps = { price: 101, _voteSnap: snap(K, '1h') };
  assert.strictEqual(t3.run('_dcForwardJudge("' + PAIR + '", __ps)'), 0); assert.strictEqual(t3.c.lfo.length, 0, 'EV 15 min en marche');
  t3.c.__run.paperReal = false; assert.strictEqual(t3.run('_dcForwardJudge("' + PAIR + '", __ps)'), 1, 'EV arrêté : RE 1 h nourrit le cerveau');
  const t4 = dc({ S: { realTimeframe: '1h' } }); t4.S.tradingMode = 'paperReal'; t4.S.realPairCycle = { [PAIR]: K + F }; t4.c.__ps = { price: 101, _voteSnap: snap(K, '15m') };
  assert.strictEqual(t4.run('_dcForwardJudge("' + PAIR + '", __ps)'), 1, 'EV 15 min juge, RE 1 h en marche ou non');
  // AA (l'école ne note pas, learnFromOutcome sort en AA) : comme avant — appelé, aucune marque
  const t5 = dc(); t5.S.tradingMode = 'sim'; t5.c.__ps = { price: 101, _voteSnap: { px: 100, t: 0, votes: { a1: 0.5 }, comp: 0.3 } };
  assert.strictEqual(t5.run('_dcForwardJudge("' + PAIR + '", __ps)'), 1); assert.strictEqual(t5.c.lfo[0][0], 'sim'); assert.ok(!(t5.S.dcThreshold && t5.S.dcThreshold.fwdK), 'AA : aucune marque');
});

T('H5 · _dcSnapVotes réel : en EV / RE la photo des votes porte la bougie close du cycle (horloge du mode) et le pas de temps DU MODE ; en AA, non', () => {
  const t = dc(), ps = { price: 100, roster: { votes: { a1: 0.4 } } }; t.c.__ps = ps;
  t.S.tradingMode = 'paperReal'; t.S.realTimeframe = '1h'; t.S.realPairCycle = { [PAIR]: K }; t.run('_dcSnapVotes("' + PAIR + '", __ps, 0.2)');
  assert.deepStrictEqual([ps._voteSnap.k, ps._voteSnap.tf, ps._voteSnap.comp, ps._voteSnap.px], [K, '15m', 0.2, 100], 'EV : son pas de temps (15 min), pas celui de RE'); assert.deepStrictEqual(J(ps._voteSnap.votes), { a1: 0.4 });
  t.S.tradingMode = 'real'; t.S.realPairCycle = { [PAIR]: K - H }; t.run('_dcSnapVotes("' + PAIR + '", __ps, 0.2)');
  assert.deepStrictEqual([ps._voteSnap.k, ps._voteSnap.tf], [K - H, '1h']);
  t.S.realPairCycle = {}; t.run('_dcSnapVotes("' + PAIR + '", __ps, 0.2)'); assert.ok(!('k' in ps._voteSnap) && !('tf' in ps._voteSnap), 'pas encore de bougie close vue : pas de marque');
  t.S.tradingMode = 'sim'; t.S.realPairCycle = { [PAIR]: K }; t.run('_dcSnapVotes("' + PAIR + '", __ps, 0.2)'); assert.ok(!('k' in ps._voteSnap) && !('tf' in ps._voteSnap), 'AA');
});

T('H6 · _thNote et _vjNote réels : même pas de temps — une note par (paire, bougie), le premier mode ; deux pas de temps — le seuil se tient par pas de temps (la note 1 h n\'est plus refusée par la note 15 min de la même heure, qui attend ses horizons jusqu\'à 4 h) mais le bilan des voix suit le plus court en marche', () => {
  const K0 = K;
  const ser = (tf, n) => { const f = TFMS[tf], a = []; for (let i = -2; i <= n; i++) a.push({ ts: K0 + i * f, o: 50, h: 50.1, l: 49.9, c: 50 }); return a; };
  const t = dc({ now: K0 + F + 60000, S: { realCandles: { [PAIR]: { '15m': ser('15m', 1), '1h': ser('1h', 0) } }, pairStates: { [PAIR]: { price: 50 } } } });
  t.c.__px[PAIR] = 50; const P = t.S.pairStates[PAIR];
  const vjSet = () => { P._dcVj = { t: t.c.__now, v: [['a1', 0.5], ['a2', -0.3]], C1: 0.2, Ch: 0.2 }; };
  t.S.tradingMode = 'paperReal'; t.S.realPairCycle = { [PAIR]: K0 }; vjSet();
  assert.strictEqual(t.run('_thNote("' + PAIR + '", 0.4, 2, 2)'), true); assert.strictEqual(t.run('_vjNote("' + PAIR + '", 2, 2)'), true);
  assert.strictEqual(t.run('_thNote("' + PAIR + '", 0.4, 2, 2)'), false); assert.strictEqual(t.run('_vjNote("' + PAIR + '", 2, 2)'), false);
  t.S.tradingMode = 'real'; t.S.realTimeframe = '15m'; vjSet();
  assert.strictEqual(t.run('_thNote("' + PAIR + '", 0.4, 2, 2)'), false, 'RE 15 min, même bougie : déjà notée par EV'); assert.strictEqual(t.run('_vjNote("' + PAIR + '", 2, 2)'), false);
  // une heure plus tard, RE en 1 h : SA bougie K0 (1 h) close, la note 15 min K0 attend encore ses horizons
  t.c.__now = K0 + H + 60000; t.S.realCandles[PAIR]['1h'] = ser('1h', 1); t.S.realCandles[PAIR]['15m'] = ser('15m', 4); t.S.realTimeframe = '1h'; t.S.realPairCycle = { [PAIR]: K0 }; vjSet();
  assert.ok(t.S.dcThreshold.pend.some(q => q.p === PAIR && q.k === K0 && q.tf === '15m'), 'la note 15 min de K0 attend toujours');
  assert.strictEqual(t.run('_thNote("' + PAIR + '", 0.4, 2, 2)'), true, 'seuil : note 1 h de la bougie K0');
  assert.deepStrictEqual(J(t.S.dcThreshold.pend.filter(q => q.p === PAIR && q.k === K0).map(q => q.tf).sort()), ['15m', '1h']);
  assert.strictEqual(t.S.dcThreshold.pendC.filter(q => q.p === PAIR && q.k === K0).length, 2, 'le sens contraire suit');
  assert.strictEqual(t.run('_thNote("' + PAIR + '", 0.4, 2, 2)'), false, '1 h, même bougie : une fois');
  // voix : EV 15 min en marche → RE 1 h ne note pas (même sans note 15 min en attente : c'est la règle du pas de temps, pas le dédoublonnage)
  t.S.dcThreshold.pendV = []; vjSet();
  assert.strictEqual(t.run('_vjNote("' + PAIR + '", 2, 2)'), false, 'EV 15 min en marche : le bilan des voix se tient sur 15 min');
  t.c.window.AuraChrono = { getCurrentMode: () => 'paperReal' }; t.c.__run.paperReal = false; t.S.dcThreshold.pendV = []; vjSet();
  assert.strictEqual(t.run('_vjNote("' + PAIR + '", 2, 2)'), false, 'EV en pause mais AFFICHÉ (le battement le traite) : il nourrit toujours le cerveau');
  t.c.window.AuraChrono = { getCurrentMode: () => 'sim' }; assert.strictEqual(t.run('_vjNote("' + PAIR + '", 2, 2)'), true, 'EV arrêté et pas affiché : RE 1 h tient le bilan');
  // au JUGEMENT (_vjJudge) : une note 1 h faite pendant que RE tenait le bilan n'y est pas versée une fois qu'EV 15 min est revenu en jeu (marquée jugée quand même)
  const entry = f => ({ p: PAIR, k: K0, t: 0, f: f, v: [[t.S.dcThreshold.vIds.indexOf('a1'), 500]], dO: 0, dH: 0, a: [0, 0, 0, 0, 0], wB: -1, wH: -1,
    L: { p: PAIR, tf: f === H ? '1h' : '15m', f: f, x: [1, 2, 3, 4, 5], n: [0.4, 0.4, 0.4, 0.4, 0.4], s: 0, s0: 0, px: 50, d: 1, cap: 2, hit: 0 },
    S: { p: PAIR, tf: f === H ? '1h' : '15m', f: f, x: [1, 2, 3, 4, 5], n: [-0.4, -0.4, -0.4, -0.4, -0.4], s: 0, s0: 0, px: 50, d: -1, cap: 2, hit: 0 } });
  t.S.dcThreshold.vHz = {}; t.S.dcThreshold.pendV = [entry(H)]; t.c.__run.paperReal = true; t.S.tradingMode = 'real';
  t.run('_vjJudge(S.dcThreshold)'); assert.deepStrictEqual([t.S.dcThreshold.pendV.length, J(t.S.dcThreshold.vHz)], [0, {}], 'note 1 h : jugée, pas versée (le cerveau est en 15 min)');
  t.S.dcThreshold.pendV = [entry(F)]; t.run('_vjJudge(S.dcThreshold)'); assert.deepStrictEqual(J(t.S.dcThreshold.vHz.a1.map(x => x.length)), [2, 2, 2, 2, 2], 'note 15 min : versée');
  t.c.__run.paperReal = false; t.c.window.AuraChrono = null; t.S.dcThreshold.vHz = {}; t.S.dcThreshold.pendV = [entry(H)]; t.run('_vjJudge(S.dcThreshold)');
  assert.deepStrictEqual(J(t.S.dcThreshold.vHz.a1.map(x => x.length)), [2, 2, 2, 2, 2], 'EV hors jeu : la note 1 h est versée');
});

// Monde complet : portefeuilles + portes (02, 10g, 08) + décision commune (03) dans le même contexte ; le cycle de chaque paire juge la photo
// précédente puis en prend une nouvelle (ordre de 10f : _dcForwardJudge … _dcSnapVotes)
function full() {
  const c = world(true); c.lfo = []; c.fj = []; c.judged = []; c.__px = {}; c.__age = {};
  Object.assign(c, { FIT_WINDOW: 60, FIT_MIN_N: 5, FIT_KEEP: 240, _fitWindow: () => 60, _ownStakeCostPct: () => 0.275, nowStr: () => '' });
  c._fitJudge = (v, s, w) => { c.fj.push([v && v.id]); return 0; };
  c.learnFromOutcome = (src, mv, pair) => { c.lfo.push([c.S.tradingMode, pair, mv]); };
  c._rcLastPrice = p => c.__px[p] || 0; c._rcPriceAge = () => 0;
  vm.runInContext(DC, c);
  c._setModeRunning('paperReal', true); c._setModeRunning('real', true);
  const pxOf = t => 100 + (Math.floor(t / F) % 5);   // le prix change à chaque bougie
  c._resolvePairCycleCore = (pair, ps) => {
    const sk = ps._voteSnap && ps._voteSnap.k, n0 = c.lfo.length;
    ps.price = pxOf(c.__now); c.__px[pair] = ps.price;
    c._dcForwardJudge(pair, ps);
    if (c.lfo.length > n0) c.judged.push([c.S.tradingMode, pair, sk]);
    ps.roster = { votes: { a1: 0.4 } }; c._dcSnapVotes(pair, ps, 0.3);
    c.cores.push({ m: c.S.tradingMode, p: pair, k: c.S.realPairCycle[pair] });
  };
  return c;
}

T('H7 · chaîne réelle portes → jugement → photo, EV et RE en 15 min, 8 h, cadences du 29/09 ; EV saute une bougie d\'ETH (mouvement > 3 %, porte 10g) puis RE est en pause la suivante (coupe-circuit) : les votes de CHAQUE bougie sont jugés exactement une fois — y compris ceux qu\'un seul mode a photographiés', () => {
  const c = full(), kA = T0 + 8 * F, ETH = 'ETH/USDT';
  const hook = t => {
    if (t === kA + F) { const a = c.S.realCandles[ETH]['15m'], last = a[a.length - 1]; last.c = last.o * 1.05; last.h = last.c; }   // bougie en cours après la clôture de kA : +5 % → EV saute kA
    if (t === kA + 2 * F) c.S.realKillSwitch[ETH] = { paused: true };   // RE en pause pendant kA + F
    if (t === kA + 3 * F) c.S.realKillSwitch[ETH] = { paused: false };
  };
  beat(c, { t0: T0, hours: 8, pairs: PAIRS3, cad: CAD, hook });
  const exp = closed(T0, 8, '15m');
  assert.ok(!ks(c, 'paperReal', ETH).includes(kA) && ks(c, 'real', ETH).includes(kA), 'EV a sauté kA, RE l\'a eue');
  assert.ok(!ks(c, 'real', ETH).includes(kA + F) && ks(c, 'paperReal', ETH).includes(kA + F), 'RE a sauté kA + F (pause), EV l\'a eue');
  PAIRS3.forEach(p => {
    const cnt = {}; c.judged.filter(x => x[1] === p).forEach(x => { cnt[x[2]] = (cnt[x[2]] || 0) + 1; });
    exp.slice(0, -1).forEach(k => assert.strictEqual(cnt[k], 1, p + ' : votes de la bougie ' + ((k - T0) / F) + ' jugés ' + (cnt[k] || 0) + ' fois'));
    assert.ok(Object.values(cnt).every(v => v === 1), p + ' : jamais deux fois');
  });
  assert.deepStrictEqual(c.judged.filter(x => x[1] === ETH && x[2] === kA).map(x => x[0]), ['real'], 'kA : photographiée par RE seul, jugée par lui');
});

T('H8 · marché réel (03) : même pas de temps — le premier mode joue la manche de la bougie (mises, T$), l\'autre la SUIT (mêmes parts, même prix, même voix, aucune mise) ; à la résolution les T$ ne sont payés qu\'une fois ; compteurs et journal disent « suivie » ; deux pas de temps : le mode au pas le plus long n\'ouvre pas de manche tant que l\'autre est en marche', () => {
  const ser = n => { const a = []; for (let i = 40; i >= 0; i--) a.push({ ts: K - i * F, o: 100, h: 100.1, l: 99.9, c: 100 }); return a; };
  const mkt = (o) => {
    const t = dc({ now: K + 60000, S: Object.assign({ paperRealActivePairs: { [PAIR]: true }, realActivePairs: { [PAIR]: true }, realCandles: { [PAIR]: { '15m': ser(), '1h': ser() } } }, o || {}) });
    t.c.__px[PAIR] = 100;
    t.S.agents = [{ id: 'A', fitness: 1000, _judgments: [] }, { id: 'B', fitness: 500, _judgments: [] }];
    const psE = { price: 100, qYes: 100, qNo: 100, roster: { votes: { A: 0.4, B: -0.2 } } }, psR = { price: 100, qYes: 100, qNo: 100, roster: { votes: { A: 0.4, B: -0.2 } } };
    t.S.walletStore = { paperReal: { pairStates: { [PAIR]: psE } }, real: { pairStates: { [PAIR]: psR } } };
    t.c.__psE = psE; t.c.__psR = psR;
    return { t, psE, psR };
  };
  const cyc = (t, mode, ps) => { t.S.tradingMode = mode; t.S.realPairCycle = { [PAIR]: t.__k }; t.S.pairStates = { [PAIR]: ps }; return t.run('_mktCycle("' + PAIR + '", ' + (ps === t.c.__psE ? '__psE' : '__psR') + ')'); };
  // EV d'abord, RE ensuite (même bougie, même pas de temps)
  let { t, psE, psR } = mkt(); t.__k = K - F;
  assert.strictEqual(cyc(t, 'paperReal', psE), 2, 'EV mise (A, B)');
  const wA = t.S.agents[0].mktWallet, wB = t.S.agents[1].mktWallet;
  t.c.__px[PAIR] = 101; assert.strictEqual(cyc(t, 'real', psR), 0, 'RE ne mise pas'); t.c.__px[PAIR] = 100;   // RE arrive quand le prix a bougé : la manche reste celle d'EV (prix d'ouverture 100)
  assert.deepStrictEqual([psR.mkt.fw, psR.mkt.n, psR.mkt.vol, Object.keys(psR.mkt.pos).length, psR.mkt.x, psR.mkt.p0], [1, 2, 0, 0, psE.mkt.x, psE.mkt.p0], 'RE suit la manche d\'EV');
  assert.deepStrictEqual([psR.qYes, psR.qNo], [psE.qYes, psE.qNo], 'mêmes parts → même prix');
  assert.deepStrictEqual([t.S.agents[0].mktWallet, t.S.agents[1].mktWallet], [wA, wB], 'les T$ ne sont pris qu\'une fois');
  t.S.tradingMode = 'real'; t.S.pairStates = { [PAIR]: psR }; const vR = t.run('_mktVote("' + PAIR + '")'); t.S.tradingMode = 'paperReal'; t.S.pairStates = { [PAIR]: psE }; const vE = t.run('_mktVote("' + PAIR + '")');
  assert.ok(Math.abs(vR - vE) < 1e-12 && Math.abs(vE) > 0.03, 'même voix dans les deux décisions');
  // résolution : la bougie K close en hausse (suivante contiguë) → EV paie, RE (suivie) ne paie rien
  const a = t.S.realCandles[PAIR]['15m']; a[a.length - 1].c = 101; a.push({ ts: K + F, o: 101, h: 101, l: 101, c: 101 }); t.__k = K; t.c.__now = K + F + 30000;
  const posA = J(psE.mkt.pos.A);
  cyc(t, 'paperReal', psE); cyc(t, 'real', psR);
  assert.ok(Math.abs(t.S.agents[0].mktGain - (posA[0] - posA[2])) < 1e-9 && t.S.agents[0].mktN === 1, 'A payé une fois');
  assert.deepStrictEqual([t.S.mktStats.E.fw, t.S.mktStats.R.fw, t.S.mktStats.R.vol, t.S.mktStats.R.n], [0, 1, 0, 1], 'compteurs : RE a suivi une manche, sans mise');
  assert.deepStrictEqual(J(t.S.mktLog.map(x => [x[1], x[4], x[8]])), [['E', 1, 0], ['R', 1, 1]], 'journal : la manche de RE est dite suivie');
  // et dans l'autre sens : RE d'abord, EV suit
  ({ t, psE, psR } = mkt()); t.__k = K - F; assert.strictEqual(cyc(t, 'real', psR), 2); assert.strictEqual(cyc(t, 'paperReal', psE), 0); assert.strictEqual(psE.mkt.fw, 1);
  // deux pas de temps : RE 1 h ne joue pas tant qu'EV 15 min est en marche ; EV arrêté → RE joue
  ({ t, psE, psR } = mkt({ realTimeframe: '1h' })); t.__k = K - H; assert.strictEqual(cyc(t, 'real', psR), 0); assert.ok(!psR.mkt, 'RE 1 h : pas de manche');
  t.c.__run.paperReal = false; assert.strictEqual(cyc(t, 'real', psR), 2, 'EV arrêté : RE 1 h joue sa manche'); assert.ok(!psR.mkt.fw);
  // une manche d'EV d'une AUTRE bougie (plus ancienne, pas encore soldée) n'est pas suivie : RE joue la sienne
  ({ t, psE, psR } = mkt()); t.__k = K - F; psE.mkt = { open: true, tf: '15m', x: K - F, p0: 100, n: 3 }; psE.qYes = 150; assert.strictEqual(cyc(t, 'real', psR), 2, 'autre bougie de sortie : pas suivie'); assert.ok(!psR.mkt.fw);
  // un suiveur ne se suit pas lui-même : la manche suivie n'est jamais un modèle
  ({ t, psE, psR } = mkt()); t.__k = K - F; psE.mkt = { open: true, fw: 1, tf: '15m', x: K, p0: 100, n: 3 }; psE.qYes = 150; assert.strictEqual(cyc(t, 'real', psR), 2, 'manche « suivie » chez EV : RE joue la sienne');
});

T('H9 · 02 réel : changer le pas de temps d\'un mode remet SON horloge à zéro (sinon pas de cycle jusqu\'à ce qu\'une bougie du nouveau pas dépasse l\'ancienne) ; même pas de temps : rien ; porte réelle : le cycle suit aussitôt', () => {
  const c = world(true), S = c.S;
  c.renderSettingsPanel = () => {}; c._updateRealModeBanner = () => {};
  vm.runInContext(between(s02, 'function setPaperRealTimeframe(tf) {', 'window.setPaperRealTimeframe = setPaperRealTimeframe;', false) + '\n' + between(s02, 'function setRealTimeframe(tf) {', 'window.setRealTimeframe = setRealTimeframe;', false), c);
  S.walletStore.paperReal.realPairCycle = { 'BTC/USDT': 5 }; S.walletStore.real.realPairCycle = { 'BTC/USDT': 7 };
  c.setPaperRealTimeframe('15m'); assert.deepStrictEqual(J(S.walletStore.paperReal.realPairCycle), { 'BTC/USDT': 5 }, 'même pas de temps : rien');
  c.setPaperRealTimeframe('1h'); assert.deepStrictEqual([J(S.walletStore.paperReal.realPairCycle), J(S.walletStore.real.realPairCycle)], [{}, { 'BTC/USDT': 7 }]);
  c.setRealTimeframe('4h'); assert.deepStrictEqual(J(S.walletStore.real.realPairCycle), {}); assert.deepStrictEqual([S.paperRealTimeframe, S.realTimeframe], ['1h', '4h']);
  // porte réelle : EV en 15 min a vu la bougie de 11:15 ; passé en 1 h à 11:20 → cycle sur la bougie 1 h close (10:00) dès la minuterie suivante
  const g = world(true), t0 = T0 + 11 * H + 20 * 60000; g.renderSettingsPanel = () => {}; g._updateRealModeBanner = () => {};
  vm.runInContext(between(s02, 'function setPaperRealTimeframe(tf) {', 'window.setPaperRealTimeframe = setPaperRealTimeframe;', false), g);
  g.S.paperRealActivePairs = { 'BTC/USDT': true }; g.S.paperRealTimeframe = '15m'; feed(g, ['BTC/USDT'], t0); g.__now = t0;
  g.S.tradingMode = 'paperReal'; g.S.realPairCycle['BTC/USDT'] = Math.floor(t0 / F) * F - F;
  g.setPaperRealTimeframe('1h'); g.resolvePairCycle('BTC/USDT', {});
  assert.deepStrictEqual(g.cores.map(x => x.k), [Math.floor(t0 / H) * H - H], 'cycle sur la dernière bougie 1 h close, tout de suite');
});

T('H10 · textes : en-têtes 02, 03, 11b (VERSION 20261001a) ; HTML : 81 × 20261001a, plus de 20260930a ; les portes 10g / 08 et les lecteurs de 03 lisent S.realPairCycle comme avant (c\'est l\'accesseur du mode) ; nulle part ailleurs', () => {
  const HD = '// [HORLOGE PAR MODE · 01/10/2026] VERSION 20261001a';
  assert.ok(s02.split('\n').slice(0, 2).some(l => l.startsWith(HD)) && s03.split('\n').slice(0, 2).some(l => l.startsWith(HD)) && rd('js/11b-ecran-appris.js').startsWith(HD));   // [DÉGEL DES VOIX · 02/10/2026] 02 et 03 relivrés : en-tête HORLOGE en 2e ligne
  assert.strictEqual(html.split('20261004a').length - 1, 82); assert.strictEqual(html.split('20261002a').length - 1, 0); assert.strictEqual(html.split('20261001a').length - 1, 0); assert.strictEqual(html.split('20260930a').length - 1, 0);   // [DÉGEL DES VOIX · 02/10/2026] HTML au jeton 20261002a
  assert.ok(GATE_EV.includes('const lastSeenTs = (S.realPairCycle && S.realPairCycle[pair]) || 0;') && GATE_EV.includes('S.realPairCycle[pair] = closedTs;'));
  assert.ok(GATE_RE.includes('const lastSeenTs = (S.realPairCycle && S.realPairCycle[pair]) || 0;') && GATE_RE.includes('S.realPairCycle[pair] = closedTs;'));
  const files = html.match(/src="js\/[^"?]+/g).map(x => x.slice(5)), who = {};
  files.forEach(f => codeStrict(rd(f)).split('\n').forEach(l => { if (/realPairCycle/.test(l)) who[f] = (who[f] || 0) + 1; }));
  assert.deepStrictEqual(who, { 'js/02-state-init.js': 6, 'js/03-per-pair-position-buttons-controls-buid.js': 5, 'js/08-learning-history-render.js': 3, 'js/10g-resolveur-ev-csv.js': 3 }, JSON.stringify(who));
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + ' ✅ · ' + fail + ' ❌');
process.exit(fail ? 1 : 0);
