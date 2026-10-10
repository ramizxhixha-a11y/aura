// banc-modes-separes.js — [MODES SÉPARÉS · 10/10/2026] VERSION 20261010b
// Depuis que l'école (AA) trade derrière l'écran de l'EV (ÉCOLE VIVANTE, matin du 10/10), ce qu'un mode fait hors écran se mêlait à ce que l'utilisateur regarde.
// Sondes du 10/10 sur la vraie app : 17 à 97 lignes du journal écrites par un mode qui n'était pas à l'écran, aucune marquée ; toasts de l'EV sur l'écran de l'AA
// sans leur mode ; UN SEUL état anti-revenge pour les trois modes (une perte de 2,7 % de l'AA a tenu l'EV et le RE fermés 900 s) ; cumul de l'estimateur fiscal
// nourri par les fermetures des trois modes ; compteurs du journal (11b) tous modes confondus.
// Ce banc éprouve, sur le CODE RÉEL en vm :
//  S1 · 02 _modeBehind / _screenMode / _modeLab (qui agit, qui est à l'écran)        S2 · 06 anti-revenge : un état par mode, effets d'écran pour le mode affiché seul
//  S3 · 02 _chainStamp / _eventNote / _eventSummary (la ligne porte son mode)        S4 · 08 renderChain : la pastille AA / EV / RE des lignes d'un autre mode
//  S5 · 08 showToast / _toastModeTag (étiquette, école silencieuse derrière)          S6 · 02 estimateur fiscal : un cumul par mode
//  S8 · 11b journal : les compteurs du mode à l'écran                                S9 / S10 · 10f _lossCapSweep et 04 executePending disent leur bascule (textes)
// (S7, l'amplitude de l'école : banc-ecole-vivante A4.) Dents : BANC_ROOT=<ancien code> node banc-modes-separes.js → les tests du changement échouent.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); assert.ok(m, 'fonction absente : ' + name);
  const start = m.index + m[1].length, st = [];
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) {
    const c = src[i], n2 = src[i + 1], top = st[st.length - 1];
    if (top === 't') { if (c === '\\') { i++; continue; } if (c === '`') { st.pop(); continue; } if (c === '$' && n2 === '{') { st.push('x'); i++; } continue; }
    if (c === '/' && n2 === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && n2 === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'") { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '`') { st.push('t'); continue; }
    if (c === '{') { st.push('b'); continue; }
    if (c === '}') { st.pop(); if (!st.length) return src.slice(start, i + 1); }
  }
  throw new Error('fin introuvable : ' + name);
}
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 60)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 60)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 60)); return s.slice(i, incl ? j + b.length : j); };
const opt = fn => { try { return fn(); } catch (e) { return '/* absent : ' + String(e && e.message || e).slice(0, 60) + ' */'; } };
const J = x => JSON.parse(JSON.stringify(x));   // les objets nés dans un contexte vm ont d'autres prototypes : comparés par valeur
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
const s02 = rd('js/02-state-init.js'), s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'), s06 = rd('js/06-v63-patterns-chartistes.js'), s08 = rd('js/08-learning-history-render.js'),
  s10f = rd('js/10f-resolveur-cycle.js'), s11b = rd('js/11b-ecran-appris.js');
const WALLETKEY = fnSrc(s02, '_walletKey');
const MODEFN = opt(() => between(s02, 'function _modeBehind() {', 'window._modeBehind = _modeBehind;', true));
// Un contexte : S (mode en cours), window = le contexte (drapeaux _bgResolve / _bgFrom), Date pilotée (now), DOM minimal qui note ce qu'on lui fait
function ctx(S, extra) {
  const dom = { els: {}, shown: [], blocked: [] };
  const el = id => dom.els[id] || (dom.els[id] = { id, style: {}, textContent: '', innerHTML: '', disabled: false, classList: { add: k => dom.shown.push(id + '+' + k), remove: k => dom.shown.push(id + '-' + k), toggle: () => {} } });
  const c = { S, Math, Number, Object, Array, String, JSON, isFinite, parseFloat, console, PAIRS: { 'BTC/USDT': {}, 'ETH/USDT': {} },
    now: 1760000000000, timers: [], toasts: [], sounds: [],
    document: { getElementById: id => (extra && extra.noDom) ? null : el(id), querySelectorAll: () => [] },
    navigator: { vibrate: () => true }, playSound: s => c.sounds.push(s), showToast: m => c.toasts.push(String(m)),
    setInterval: fn => { c.timers.push(fn); return c.timers.length; }, clearInterval: () => {} };
  c.Date = new Proxy(Date, { construct: (t, a) => (a.length ? new t(...a) : new t(c.now)), get: (t, k) => (k === 'now' ? (() => c.now) : t[k]) });
  c.window = c; c.dom = dom; Object.assign(c, extra || {});
  vm.createContext(c);
  vm.runInContext(WALLETKEY + '\n' + MODEFN, c);
  return { c, S, run: code => vm.runInContext(code, c), behind: (from, mode) => { c._bgResolve = true; c._bgFrom = from; S.tradingMode = mode; }, screen: mode => { c._bgResolve = false; c._bgFrom = undefined; S.tradingMode = mode; } };
}

console.log('▶ banc-modes-separes');
T('S1 · 02 _modeBehind / _screenMode / _modeLab RÉELS : sans bascule, le mode en cours est celui de l\'écran ; pendant une bascule (_bgResolve + _bgFrom), le mode en cours agit DERRIÈRE l\'écran de _bgFrom ; drapeau sans provenance lisible → le mode en cours ; AA / EV / RE', () => {
  const w = ctx({ tradingMode: 'paperReal' });
  assert.deepStrictEqual([w.run('_modeBehind()'), w.run('_screenMode()')], [false, 'paperReal']);
  w.behind('paperReal', 'sim'); assert.deepStrictEqual([w.run('_modeBehind()'), w.run('_screenMode()')], [true, 'paperReal']);
  w.behind('sim', 'real'); assert.deepStrictEqual([w.run('_modeBehind()'), w.run('_screenMode()')], [true, 'sim']);
  w.c._bgFrom = 'bidon'; assert.strictEqual(w.run('_screenMode()'), 'real', 'provenance illisible : le mode en cours');
  w.c._bgResolve = 'oui'; assert.strictEqual(w.run('_modeBehind()'), false, 'seul true vaut');
  w.screen('real'); assert.deepStrictEqual([w.run('_modeBehind()'), w.run('_screenMode()')], [false, 'real']);
  assert.deepStrictEqual(['sim', 'paperReal', 'real', undefined, 'autre'].map(m => w.run('_modeLab(' + JSON.stringify(m) + ')')), ['AA', 'EV', 'RE', 'RE', 'AA'], 'sans argument : le mode en cours (ici real)');
});

// ── S2 · anti-revenge (06) : le bloc RÉEL, de l'état par mode au rendu des réglages ──
const RV = opt(() => between(s06, 'const _rvStates = {};', 'window.renderAntiRevengeSection = renderAntiRevengeSection;', true));
function rvWorld(mode) {
  const S = { tradingMode: mode || 'paperReal', pairStates: { 'BTC/USDT': { trades: [{ type: 'position', ts: 1760000000000 - 1000, pnlUsdt: -20 }] } }, chainLog: [], tradingAccount: 1000 };   // une perte juste avant : série de 1 (le message de l'écran la nomme)
  const w = ctx(S); w.run(RV); return w;
}
T('S2a · EV à l\'écran, perte de 2 % (−20 $) : l\'EV est bloquée 15 min, l\'AA et le RE restent LIBRES ; l\'écran reçoit le refroidissement (message, voile, boutons, son, compte à rebours) et le journal sa ligne', () => {
  const w = rvWorld('paperReal');
  w.run("checkAntiRevenge(-20, -2, 'BTC/USDT')");
  assert.deepStrictEqual(['sim', 'paperReal', 'real'].map(m => w.run('isRevengeBlocked(' + JSON.stringify(m) + ')')), [false, true, false]);
  assert.strictEqual(w.run('isRevengeBlocked()'), true, 'sans argument : le mode en cours');
  const st = w.run("_rvState('paperReal')"); assert.ok(st.active && st.end === w.c.now + 15 * 60000 && st.lastLoss === w.c.now);
  assert.ok(w.c.dom.shown.includes('revengeBlock+show'), 'voile'); assert.ok(w.c.dom.els.rvMsg.textContent.includes('Tu viens de perdre $20.00 sur BTC'), 'message');
  assert.strictEqual(w.c.dom.els.forceBtn.disabled, true, 'boutons'); assert.deepStrictEqual(w.c.sounds, ['alert']); assert.strictEqual(w.c.timers.length, 1, 'compte à rebours');
  assert.deepStrictEqual(J(w.S.chainLog.map(l => l.desc + ' · ' + l.m)), ['Anti-revenge activé · 15min · après perte $20.00 · paperReal'], 'la ligne dit son mode'); assert.strictEqual(w.S.antiRevengeCfg.blockCount, 1);
});
T('S2b · AA en play DERRIÈRE l\'écran de l\'EV, même perte : l\'AA est bloquée, l\'EV et le RE restent LIBRES ; rien à l\'écran (ni voile, ni boutons, ni son, ni compte à rebours), la ligne du journal seule ; avant : un seul état, les trois modes fermés 900 s', () => {
  const w = rvWorld('paperReal'); w.behind('paperReal', 'sim');
  w.run("checkAntiRevenge(-20, -2, 'BTC/USDT')");
  assert.deepStrictEqual(['sim', 'paperReal', 'real'].map(m => w.run('isRevengeBlocked(' + JSON.stringify(m) + ')')), [true, false, false]);
  w.screen('paperReal'); assert.strictEqual(w.run('isRevengeBlocked()'), false, 'l\'EV à l\'écran peut ouvrir'); assert.strictEqual(w.run("_rvState('sim').active"), true);
  assert.deepStrictEqual(w.c.dom.shown, []); assert.strictEqual(Object.keys(w.c.dom.els).length, 0, 'aucun élément touché'); assert.deepStrictEqual(w.c.sounds, []); assert.strictEqual(w.c.timers.length, 0);
  assert.deepStrictEqual(J(w.S.chainLog.map(l => l.icon + ' ' + l.desc + ' · ' + l.m)), ['🛑 Anti-revenge activé · 15min · après perte $20.00 · sim']); assert.strictEqual(w.S.antiRevengeCfg.blockCount, 1);
});
T('S2c · les trois états vivent côte à côte et expirent chacun à leur heure ; unlockRevenge (bouton de l\'écran) ne lève que le mode AFFICHÉ, et seulement après son heure ; une petite perte (−0,5 %, −2 $) ne bloque pas mais date la perte du mode', () => {
  const w = rvWorld('paperReal');
  w.run("checkAntiRevenge(-20, -2, 'BTC/USDT')");                                  // EV bloquée jusqu'à now + 15 min
  w.c.now += 5 * 60000; w.behind('paperReal', 'sim'); w.run("checkAntiRevenge(-20, -2, 'BTC/USDT')");   // AA bloquée jusqu'à now + 20 min
  w.c.now += 1000; w.behind('paperReal', 'real'); w.run("checkAntiRevenge(-2, -0.5, 'BTC/USDT')");       // RE : petite perte
  assert.deepStrictEqual(['sim', 'paperReal', 'real'].map(m => w.run('isRevengeBlocked(' + JSON.stringify(m) + ')')), [true, true, false]);
  assert.strictEqual(w.run("_rvState('real').lastLoss"), w.c.now, 'la petite perte est datée pour le RE'); assert.strictEqual(w.run("_rvState('real').active"), false);
  w.screen('paperReal'); w.run('unlockRevenge()'); assert.strictEqual(w.run('isRevengeBlocked()'), true, 'levée avant l\'heure');
  w.c.now += 10 * 60000;   // EV : 15 min + 1 s passées ; AA : encore 5 min
  w.run('unlockRevenge()');
  assert.deepStrictEqual(['sim', 'paperReal', 'real'].map(m => w.run('isRevengeBlocked(' + JSON.stringify(m) + ')')), [true, false, false], 'la levée de l\'écran (EV) ne touche pas l\'AA');
  assert.ok(w.c.dom.shown.includes('revengeBlock-show') && w.c.toasts.some(t => t.startsWith('✅ Blocage levé')));
  w.c.now += 5 * 60000 + 1;
  assert.deepStrictEqual(['sim', 'paperReal', 'real'].map(m => w.run('isRevengeBlocked(' + JSON.stringify(m) + ')')), [false, false, false], 'expiration de l\'AA à son heure');
  // relecture adverse du 10/10 soir : un état expiré que personne n'a relu (aucun bot n'a voulu ouvrir) doit quand même laisser passer la perte suivante
  const w2 = rvWorld('paperReal'); w2.run("checkAntiRevenge(-20, -2, 'BTC/USDT')"); w2.c.now += 16 * 60000; w2.run("checkAntiRevenge(-30, -3, 'ETH/USDT')");
  const st2 = w2.run("_rvState('paperReal')"); assert.ok(st2.active && st2.end === w2.c.now + 15 * 60000, 'réarmé après expiration'); assert.strictEqual(w2.S.antiRevengeCfg.blockCount, 2);
});
T('S2d · réglages (renderAntiRevengeSection RÉEL) : « Actuellement bloqué » par mode — AA / EV / RE, OUI avec les minutes restantes ou non ; le nombre de blocages reste commun', () => {
  const w = rvWorld('paperReal'); w.run("checkAntiRevenge(-20, -2, 'BTC/USDT')"); w.behind('paperReal', 'sim'); w.run("checkAntiRevenge(-20, -2, 'BTC/USDT')"); w.screen('real');
  w.c.now += 60000; w.run('renderAntiRevengeSection()');
  const h = w.c.dom.els.antiRevengeSection.innerHTML;
  assert.ok(/Actuellement bloqué · AA<\/span><span[^>]*>OUI · encore 14 min/.test(h), 'AA'); assert.ok(/Actuellement bloqué · EV<\/span><span[^>]*>OUI · encore 14 min/.test(h), 'EV');
  assert.ok(/Actuellement bloqué · RE<\/span><span[^>]*>non/.test(h), 'RE'); assert.ok(h.includes('Blocages effectués')); assert.strictEqual(w.S.antiRevengeCfg.blockCount, 2);
});
T('S2e · textes 06 : plus aucune variable d\'état unique (_rvActive, _rvEndTime, _rvLastLossTs) ; _rvOf lu dans checkAntiRevenge, triggerAntiRevenge, isRevengeBlocked, unlockRevenge, le compte à rebours ; 02 closePosition signale l\'anti-revenge sans exception de mode', () => {
  const c6 = codeStrict(s06);
  ['_rvActive', '_rvEndTime', '_rvLastLossTs'].forEach(v => assert.ok(!c6.includes(v), 'variable unique encore là : ' + v));
  assert.ok(c6.includes('const st  = _rvOf();') && c6.includes('const st   = _rvOf();') && c6.includes('const st = _rvOf(mode);') && c6.includes('const _stCd = _rvOf();') && c6.includes('const st = _rvOf();'));
  assert.ok(c6.includes("window.isRevengeBlocked = function(mode) {") && c6.includes("window._rvState = function(mode) {"));
  assert.ok(codeStrict(fnSrc(s06, 'checkAntiRevenge')).includes('if (st.active && Date.now() >= st.end) st.active = false;'), 'expiration en tête');
  assert.strictEqual(codeStrict(fnSrc(s06, 'triggerAntiRevenge')).split(',m:_walletKey(S.tradingMode)});').length - 1, 2, 'la ligne du journal porte son mode aux deux sites');
  const cp = codeStrict(fnSrc(s02, 'closePosition'));
  assert.ok(/if \(typeof checkAntiRevenge === 'function'\) \{\s*try \{ checkAntiRevenge\(realisedUsd, realisedPct, pos\.pair\); \} catch\(e\) \{\}\s*\}/.test(cp), 'closePosition : signal inconditionnel');
  assert.ok(!cp.includes('_aaBehind') && !cp.includes('_behind && typeof checkAntiRevenge'), 'ancienne exception de l\'AA derrière');
});

// ── S3 · journal (02) : le relais RÉEL sur S.chainLog.push ──
const EVT = opt(() => between(s02, 'const EVENT_KINDS = [', 'window._eventKind = _eventKind;', false));
function evWorld(mode) { const S = { tradingMode: mode || 'paperReal', chainLog: [] }; const w = ctx(S); w.run(EVT); assert.strictEqual(w.run('_installChainTap()'), true); return w; }
T('S3a · EV à l\'écran : une ligne de TRADE (fermeture, ouverture, sortie, refus, argent, bunker) porte m = paperReal ; une ligne d\'apprentissage ou de réseau ne porte rien ; les compteurs du jour comptent aussi PAR MODE (st._m), le journal durable garde m ; le veto est compté, pas gardé', () => {
  const w = evWorld('paperReal');
  w.run("S.chainLog.push({ icon: '🔴', desc: 'Fermé BTC/USDT LONG | +1.20% | +$0.36' }, { icon: '🧬', desc: 'Génome muté · BTC/USDT' }, { icon: '📡', desc: 'Connexion rétablie' }, { icon: '⛔', desc: 'Veto · RSI 99' }, { icon: '▶', desc: 'Position 1/3 · ETH/USDT · short' }, { icon: '🏰', desc: 'Bunker activé · SOS' })");
  assert.deepStrictEqual(J(w.S.chainLog.map(l => l.m || '-')), ['paperReal', '-', '-', 'paperReal', 'paperReal', '-'], 'trades marqués ; apprentissage, réseau, bunker (l\'app entière) non');
  const day = Object.keys(w.S.eventStats)[0], st = w.S.eventStats[day];
  assert.deepStrictEqual(J(st), { fermeture: 1, evolution: 1, reseau: 1, veto: 1, ouverture: 1, bunker: 1, _m: { paperReal: { fermeture: 1, veto: 1, ouverture: 1 } } });
  assert.deepStrictEqual(J(w.S.eventLog.map(e => e.k + ':' + (e.m || '-'))), ['fermeture:paperReal', 'evolution:-', 'reseau:-', 'ouverture:paperReal', 'bunker:-'], 'veto compté, pas gardé ; m gardé');
  const sum = J(w.run('_eventSummary(3)')); assert.deepStrictEqual(sum.total, { fermeture: 1, evolution: 1, reseau: 1, veto: 1, ouverture: 1, bunker: 1 }, '_m n\'est pas une nature'); assert.strictEqual(sum.dernier.length, 3);
});
T('S3b · AA en play DERRIÈRE l\'écran de l\'EV : TOUTES ses lignes portent m = sim (apprentissage compris) ; une ligne qui porte déjà un mode le garde ; une valeur qui n\'est pas un objet passe sans exception ; la poche « Tendance longue » n\'est pas marquée à l\'écran', () => {
  const w = evWorld('paperReal'); w.behind('paperReal', 'sim');
  w.run("S.chainLog.push({ icon: '🧬', desc: 'Génome muté · BTC/USDT' }, { icon: '🔴', desc: 'Fermé BTC/USDT LONG | −0.70% | −$0.21' }, { icon: '💤', desc: 'Rêve · 3 scénarios', m: 'real' }, 'texte nu', null)");
  assert.deepStrictEqual(J(w.S.chainLog.map(l => (l && l.m) || '-')), ['sim', 'sim', 'real', '-', '-']);
  w.screen('paperReal'); w.run("S.chainLog.push({ icon: '🪙', desc: 'Tendance longue · BTC fermé +2 %' })");
  assert.strictEqual(w.S.chainLog[5].m, undefined, 'la poche à part n\'est d\'aucun mode');
  const st = w.S.eventStats[Object.keys(w.S.eventStats)[0]]; assert.deepStrictEqual(J(st._m), { sim: { evolution: 1, fermeture: 1 }, real: { evolution: 1 } }, 'le rêve marqué real est compté chez le RE'); assert.strictEqual(st.tendance, 1);
});
T('S3c · textes 02 : EVENT_MODE_KINDS (natures de trade), _chainStamp posé AVANT le rangement dans le relais, exporté ; _eventSummary saute _m', () => {
  const c2 = codeStrict(s02);
  assert.ok(c2.includes('const EVENT_MODE_KINDS = { sortie_trailing: 1, sortie_zombie: 1, sortie_consensus: 1, sortie_tp: 1, sortie_sl: 1, fermeture: 1, veto: 1, ouverture: 1, argent: 1 };'));
  const tap = codeStrict(fnSrc(s02, '_installChainTap')); assert.ok(tap.indexOf('_chainStamp(arguments[i])') < tap.indexOf('Array.prototype.push.apply') && tap.indexOf('Array.prototype.push.apply') < tap.indexOf('_eventNote(arguments[i])'));
  assert.ok(c2.includes('window._chainStamp = _chainStamp;') && codeStrict(fnSrc(s02, '_eventSummary')).includes("if (k === '_m') return;"));
});

// ── S4 · renderChain (08) RÉEL : la pastille des lignes d'un autre mode ──
T('S4 · renderChain RÉEL, EV à l\'écran : la ligne de l\'AA porte la pastille « AA » (couleur de l\'AA), celle du RE « RE », celle de l\'EV et celle sans mode n\'en portent pas ; AA à l\'écran : c\'est l\'EV qui est nommée', () => {
  const RC = fnSrc(s08, 'renderChain');
  const mk = mode => { const S = { tradingMode: mode, currentPage: 4, pairStates: {}, chainLog: [
    { icon: '🔴', desc: 'Fermé PEPE/USDT LONG | −0.70%', hash: 'abcdef123456', time: '21:00:00', m: 'sim' }, { icon: '🔴', desc: 'Fermé BTC/USDT SHORT | +1.00%', hash: 'abcdef123457', time: '21:00:01', m: 'paperReal' },
    { icon: '⛔', desc: 'Perte max · RE', hash: 'abcdef123458', time: '21:00:02', m: 'real' }, { icon: '🧠', desc: 'Apprentissage', hash: 'abcdef123459', time: '21:00:03' }] };
    const w = ctx(S); w.c._chainFilter = 'all'; w.run('let _chainFilter = "all";\n' + RC + '\nrenderChain();'); return w.c.dom.els.mobileChainList.innerHTML; };
  const h = mk('paperReal'), rows = h.split('class="chain-row"').slice(1);
  assert.strictEqual(rows.length, 4);
  const chip = r => { const m = r.match(/<span class="chain-mode"[^>]*>([A-Z]{2})<\/span>/); return m ? m[1] : null; };
  assert.deepStrictEqual(rows.map(chip), [null, 'RE', null, 'AA'], 'ordre inversé : la plus récente d\'abord');   // Apprentissage, RE, EV, AA
  assert.ok(rows[1].includes('border:1px solid var(--down)') && rows[3].includes('border:1px solid var(--ice)'), 'couleurs');
  assert.ok(rows[3].includes('<span class="chain-mode"') && rows[3].indexOf('</span>Fermé PEPE') > 0, 'pastille devant le texte, texte intact');
  assert.deepStrictEqual(mk('sim').split('class="chain-row"').slice(1).map(chip), [null, 'RE', 'EV', null]);
});

// ── S5 · showToast (08) RÉEL ──
const TOAST = fnSrc(s08, 'showToast') + '\n' + opt(() => fnSrc(s08, '_toastModeTag'));
function toastWorld(mode) { const S = { tradingMode: mode, toastVerbose: false }; const w = ctx(S, { shown: [], _showToast_orig: (m, d) => w.c.shown.push([m, d]) }); w.run(TOAST); return w; }
T('S5a · mode à l\'écran : rien ne change (info silencieux, user / critical affichés tels quels, anti-doublon 1,5 s)', () => {
  const w = toastWorld('paperReal');
  w.run("showToast('⚠ ETH/USDT SHORT ouvert', 3000, 'user'); showToast('bot', 2800, 'info'); showToast('⚠ ETH/USDT SHORT ouvert', 3000, 'user'); showToast('❌ erreur', 4000, 'critical')");
  assert.deepStrictEqual(w.c.shown, [['⚠ ETH/USDT SHORT ouvert', 3000], ['❌ erreur', 4000]]); assert.strictEqual(w.S._silencedCount, 1);
});
T('S5b · EV derrière l\'écran de l\'AA : ses messages user / critical s\'affichent ÉTIQUETÉS « [EV] » après l\'icône de tête ; l\'ÉCOLE derrière un autre écran : seul le critique passe (étiqueté « [AA] »), le reste est compté silencieux', () => {
  const w = toastWorld('sim'); w.behind('sim', 'paperReal');
  w.run("showToast('⚠️ ETH/USDT SHORT ouvert', 3000, 'user'); showToast('sans icône', 3000, 'user'); showToast('bot', 2800, 'info')");
  w.behind('sim', 'real'); w.run("showToast('⛔ Perte max · RE', 3000, 'critical')");
  w.behind('paperReal', 'sim'); w.run("showToast('🧹 Anti-zombie · PEPE', 3000, 'user'); showToast('⛔ Perte max · AA', 3000, 'user'); showToast('💥 Erreur école', 3000, 'critical')");
  assert.deepStrictEqual(w.c.shown.map(x => x[0]), ['⚠️ [EV] ETH/USDT SHORT ouvert', '[EV] sans icône', '⛔ [RE] Perte max · RE', '💥 [AA] Erreur école']);
  assert.strictEqual(w.S._silencedCount, 3, 'info de l\'EV + deux messages de routine de l\'école');
  assert.deepStrictEqual(['⛔ Perte max', '⚠️ x', '🛑 y', 'z', '🧹 Anti-zombie'].map(m => w.run('_toastModeTag(' + JSON.stringify(m) + ", 'sim')")), ['⛔ [AA] Perte max', '⚠️ [AA] x', '🛑 [AA] y', '[AA] z', '🧹 [AA] Anti-zombie']);
});

// ── S6 · estimateur fiscal (02) : un cumul par mode ──
const FISC = ['_fiscalYearKey', '_fiscalYearBox', 'getAnnualNetRealised', 'addAnnualNetRealised'].map(n => opt(() => fnSrc(s02, n))).join('\n');
T('S6 · getAnnualNetRealised / addAnnualNetRealised RÉELS : l\'AA ajoute +10 puis −3, l\'EV −2 : l\'EV lit −2 (pas +5), le RE 0, le total des modes 5 ; un S.fiscalYear d\'avant (sans byMode) est complété ; changement d\'année : tout repart ; l\'estimateur lit ce cumul, les fermetures le nourrissent', () => {
  const w = ctx({ tradingMode: 'sim' }); w.run(FISC);
  w.run('addAnnualNetRealised(10); addAnnualNetRealised(-3)'); w.behind('sim', 'paperReal'); w.run('addAnnualNetRealised(-2)');
  assert.strictEqual(w.run('getAnnualNetRealised()'), -2, 'EV'); w.screen('sim'); assert.strictEqual(w.run('getAnnualNetRealised()'), 7, 'AA'); w.screen('real'); assert.strictEqual(w.run('getAnnualNetRealised()'), 0, 'RE');
  assert.deepStrictEqual(J(w.S.fiscalYear), { year: new Date(w.c.now).getFullYear(), netRealisedEur: 5, byMode: { sim: 7, paperReal: -2 } });
  w.S.fiscalYear = { year: new Date(w.c.now).getFullYear(), netRealisedEur: 100 }; assert.strictEqual(w.run('getAnnualNetRealised()'), 0, 'ancien cumul sans détail : rien pour ce mode'); assert.deepStrictEqual(J(w.S.fiscalYear.byMode), {});
  w.c.now += 366 * 86400000; assert.strictEqual(w.run('addAnnualNetRealised(1)'), 1); assert.strictEqual(w.S.fiscalYear.netRealisedEur, 1, 'nouvelle année');
  const c2 = codeStrict(s02); assert.ok(codeStrict(fnSrc(s02, 'fiscalBotAdvicePerPair')).includes("const annual = (typeof getAnnualNetRealised === 'function') ? getAnnualNetRealised() : 0;"));
  assert.ok(codeStrict(fnSrc(s02, 'recordFees')).includes("if (typeof addAnnualNetRealised === 'function') addAnnualNetRealised(netGain);")); assert.strictEqual(c2.split('addAnnualNetRealised(').length - 1, 2, 'un seul nourrisseur');
});

// ── S8 · écran 11b : les compteurs du mode à l'écran ──
T('S8 · panneau 11b RÉEL, EV à l\'écran : un jour au détail complet montre les ouvertures / fermetures / sorties / refus de l\'EV seule (réseau commun) ; un jour sans détail, ou au détail incomplet, garde son total marqué « * » avec la note ; AA à l\'écran : ses propres comptes ; titre « · EV »', () => {
  const src = s11b.replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const mk = mode => { const S = { tradingMode: mode, paperRealActivePairs: { 'BTC/USDT': true }, tradeContextMemory: [], gainRules: {}, stopRules: {}, horizonRules: {}, capRules: {}, _lossStreaks: {},
    eventStats: { '2026-10-08': { ouverture: 4, fermeture: 3 }, '2026-10-09': { ouverture: 6, fermeture: 5, reseau: 2, _m: { sim: { ouverture: 4, fermeture: 5 }, paperReal: { ouverture: 1 } } },
      '2026-10-10': { ouverture: 9, fermeture: 7, sortie_zombie: 2, veto: 30, reseau: 1, _m: { sim: { ouverture: 7, fermeture: 6, sortie_zombie: 2, veto: 30 }, paperReal: { ouverture: 2, fermeture: 1 } } } } };
    const w = ctx(S, { _attributionSummary: () => [], _capCeiling: () => 12 }); w.run(src); return w.run('_learnedPanelHtml()'); };
  const h = mk('paperReal'), j = h.slice(h.indexOf('JOURNAL'));
  assert.ok(j.includes('· événements comptés par jour · EV'), 'titre');
  assert.ok(j.includes('>10-10<') && j.includes('>ouverture 2 · fermeture 1 · reseau 1<'), 'jour complet : l\'EV seule, réseau commun — ' + j.slice(0, 600));
  assert.ok(j.includes('>10-09 *<') && j.includes('>ouverture 6 · fermeture 5 · reseau 2<'), 'détail incomplet (fermetures 5 pour l\'AA seule) : total marqué');
  assert.ok(j.includes('>10-08 *<') && j.includes('>ouverture 4 · fermeture 3<') && j.includes('* tous modes confondus (compté avant le détail par mode)'), 'jour d\'avant');
  const a = mk('sim'), ja = a.slice(a.indexOf('JOURNAL'));
  assert.ok(ja.includes('· AA') && ja.includes('>ouverture 7 · fermeture 6 · zombie 2 · reseau 1 · veto 30<'), 'AA à l\'écran — ' + ja.slice(0, 600));
  assert.ok(!/S\.\w+\s*=[^=]/.test(codeStrict(src).split('function _learnedPanelHtml')[1].split('\nfunction ')[0]), '11b : lecture seule');
});

// ── S9 / S10 · les bascules disent leur provenance ──
T('S9 · 10f _lossCapSweep : la bascule pose _bgFrom (le mode de l\'écran) et _bgResolve, puis rend les deux drapeaux tels qu\'ils étaient ; le fragment RÉEL exécuté : drapeaux posés pendant, rendus après (y compris quand une bascule englobante était déjà en cours)', () => {
  const i0 = s10f.indexOf('window._lossCapSweep = function _lossCapSweep() {'); assert.ok(i0 > 0, '_lossCapSweep absent'); const c = codeStrict(s10f.slice(i0));
  const A = 'var _sw = (_m !== _disp), _b0 = window._bgResolve, _f0 = window._bgFrom;', B = 'if (_sw) { window._bgFrom = _disp; S.tradingMode = _m; window._bgResolve = true; }', C = 'if (_sw) { S.tradingMode = _disp; window._bgResolve = _b0; window._bgFrom = _f0; }';
  assert.ok(c.includes(A) && c.includes(B) && c.includes(C) && c.indexOf(A) < c.indexOf(B) && c.indexOf(B) < c.indexOf(C), 'textes 10f');
  const w = ctx({ tradingMode: 'paperReal' }); w.c._bgResolve = false; w.c._bgFrom = undefined;
  const frag = (m) => 'var _disp = S.tradingMode, _m = ' + JSON.stringify(m) + '; ' + A + ' ' + B + ' var seen = [S.tradingMode, _modeBehind(), _screenMode()]; ' + C + ' seen.concat([S.tradingMode, window._bgResolve, window._bgFrom]);';
  const F = m => J(w.run(frag(m)).map(v => v === undefined ? '-' : v));
  assert.deepStrictEqual(F('sim'), ['sim', true, 'paperReal', 'paperReal', false, '-']);
  assert.deepStrictEqual(F('paperReal'), ['paperReal', false, 'paperReal', 'paperReal', false, '-'], 'pas de bascule pour le mode affiché');
  w.behind('paperReal', 'sim'); assert.deepStrictEqual(F('real'), ['real', true, 'sim', 'sim', true, 'paperReal'], 'bascule englobante (théorique : 08 appelle le balayage hors du multiplexeur, drapeau à faux) rendue telle quelle');
});
T('S10 · 04 executePending : la bascule vers le mode de la proposition pose _bgFrom = le mode de l\'écran, et _bgResolve ; 08 simTick : _bgFrom = _mDisp ; 02 _screenMode ne lit que ces deux drapeaux', () => {
  const c4 = codeStrict(fnSrc(s04, 'executePending')), c8 = codeStrict(s08);
  assert.ok(c4.includes('if (_sw) { window._bgFrom = _m0; S.tradingMode = action.mode; window._bgResolve = true; }') && c4.includes('finally { if (_sw) { S.tradingMode = _m0; window._bgResolve = false; } }'));
  assert.ok(c8.includes('if (_isBg) { window._bgFrom = _mDisp; S.tradingMode = _m; window._bgResolve = true; }') && c8.includes('if (_isBg) { S.tradingMode = _mDisp; window._bgResolve = false; }'));
  const op = codeStrict(fnSrc(s02, 'openPosition')), ao = codeStrict(fnSrc(rd('js/09c-auto-open.js'), 'autoOpenPosition'));
  assert.ok(op.includes("if (!((typeof _modeBehind === 'function') && _modeBehind())) {\n    updatePairBtnStates();\n    renderPositions();\n    if(S.currentPage===4) renderChain();\n  }"), '02 openPosition : rendus pour le mode affiché');
  assert.ok(ao.includes("if (!((typeof _modeBehind === 'function') && _modeBehind())) {\n    updatePairBtnStates();") && ao.includes("    if (typeof _updateCloseAllBadge === 'function') _updateCloseAllBadge();\n  }"), '09c autoOpenPosition : rendus pour le mode affiché');
  assert.ok(codeStrict(s02).includes("function _screenMode() { try { const f = window._bgFrom; return (window._bgResolve === true && (f === 'sim' || f === 'paperReal' || f === 'real')) ? f : _walletKey(S.tradingMode); } catch (e) { return 'sim'; } }"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
