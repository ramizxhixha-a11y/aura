// banc-n86d.js — [GO N° 86D · 15/11/2026] les champs de saisie d'un prix (TP / SL) reçoivent les décimales du prix affiché (02 pxIn), plus 2 décimales sous dec 4.
// Chaque essai fait tourner le VRAI texte de l'app en vm et ÉCHOUE sur le code d'avant (BANC_ROOT=<copie du commit c52acfa> node banc-n86d.js), sauf les gardes G, C et F.
// Prix et décimales : les 12 paires du backup du pont du 15/11 11:18 (app) — DOT 0,734 (dec 2), EUR 1,0994 (dec 3), PEPE 0,00000404 (dec 6), BTC 65 424 (dec 0)…
// Règle d'un champ juste : le prix voulu à 5 chiffres significatifs près (|écart| ≤ 0,005 % du prix) ou au pas de Binance pour PEPE (1e-8), et du BON côté du prix.
//   S1  VRAI 08 setTpSl (fiche ✏️ de modification) : 12 paires × LONG / SHORT × TP / SL × 1, 2, 5, 10 % → champ = 02 pxIn du prix voulu, juste et du bon côté
//       (témoin : le setTpSl d'avant, rendu par banc-fixtures/sans-n86d.js, se trompe sur DOT, EUR, PEPE… et met le TP +1 % d'un LONG PEPE SOUS le prix)
//   S2  VRAI 08 openPosEdit → setTpSl → « ✓ Appliquer » (applyPosEdit) : PEPE LONG et DOT SHORT à la main → pos.tp / pos.sl = le prix voulu, du bon côté
//       (avant : PEPE tp = 0.000004 < prix — la vérification du TP de 07 learnFromOpenPositions, « cur >= pos.tp », est alors vraie au passage suivant)
//   P1  VRAI 03 _adjPropPct (panneau de la paire) : 12 paires × signal LONG / SHORT × TP / SL × 1, 2, 5 % → champ juste et du bon côté ; _recalcProposal appelé
//   P2  VRAI 03 updatePairAnalysisPanels (proposition préremplie) : les champs pinput_tp_ / pinput_sl_ = pxIn de tpVal / slVal (ATR posé par le banc)
//   G   garde : fichiers de la décision au texte d'avant (empreintes) ; dans 03 et 08, seules ces lignes ont bougé (via sans-n86d, test F)
//   C   appels : pxIn n'est lu par aucun fichier de la décision ; setTpSl ← boutons du HTML seulement ; _adjPropPct ← boutons de 03 seulement
//   F   garde : banc-fixtures/n86d-retours.json redonne 03 et 08 du commit c52acfa au caractère près
// Ce qui se voit à l'écran (la fiche ✏️, le TP « atteint » au passage suivant) est éprouvé sur la vraie page : node rejeu/sonde_n86d.js --root . --avant <copie> --backup <b>
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NOUVEAU = !process.env.BANC_ROOT;
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const sansN86d = require('./banc-fixtures/sans-n86d.js');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n     ')); } }
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); if (!m) return null;
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
const need = (src, n) => { const t = fnSrc(src, n); assert.ok(t, 'fonction absente : ' + n); return t; };
const F = { s02: 'js/02-state-init.js', s03: 'js/03-per-pair-position-buttons-controls-buid.js', s08: 'js/08-learning-history-render.js' };
const C = {}; Object.keys(F).forEach(k => { C[k] = rd(F[k]); });
const AV = { s03: sansN86d(C.s03, F.s03), s08: sansN86d(C.s08, F.s08) };   // le code d'avant (témoins) ; sur BANC_ROOT : identique au code lu
// (app) backup du pont du 15/11 11:18 : prix de pairStates (EV) et décimales (PAIRS de 02 + customPairs ; DOT : candidats de 02, dec 2)
const LIVE = { 'BTC/USDT': [65424, 0], 'ETH/USDT': [1827.41, 0], 'XRP/USDT': [0.9646, 4], 'SOL/USDT': [71.9, 2], 'DOGE/USDT': [0.05897, 4], 'ADA/USDT': [0.1541, 4],
  'AVAX/USDT': [7.269, 2], 'LINK/USDT': [9.24904, 2], 'DOT/USDT': [0.734, 2], 'PEPE/USDT': [0.00000404, 6], 'EUR/USDT': [1.0994, 3], 'BNB/USDT': [596.98002, 2] };
const PAIRS = {}; Object.keys(LIVE).forEach(p => { PAIRS[p] = { sym: p.split('/')[0], dec: LIVE[p][1] }; });
// un champ juste : à 5 chiffres significatifs près, ou au pas de Binance (1e-8) ; et du bon côté du prix
const juste = (v, voulu, prix, dessus) => Math.abs(v - voulu) <= Math.max(Math.abs(voulu) * 5e-5, 0.5e-8) + 1e-15 && (dessus ? v > prix : v < prix);
const pxInVm = () => { const c = { Math, Number, String, isFinite, parseFloat, PAIRS }; vm.createContext(c); vm.runInContext(need(C.s02, 'pxIn'), c); return c; };
const PXI = pxInVm();   // le VRAI pxIn de 02 (sur BANC_ROOT : celui du code d'avant, identique)
const el = (id) => ({ id, value: '', placeholder: '', textContent: '', innerHTML: '', readOnly: false, dataset: {}, style: {}, classList: { add() {}, remove() {} }, closest() { return null; }, parentElement: null });
function doc() { const E = {}; return { E, getElementById: (id) => (E[id] || (E[id] = el(id))) }; }

// ── 08 : la fiche ✏️ (openPosEdit, setTpSl, applyPosEdit) ────────────────────────────────────────────────────────────────────────────────────────────────────
function monde08(s08) {
  const D = doc(), seen = { toasts: [] };
  const c = { console, Math, Object, JSON, Array, Number, String, Date, isFinite, isNaN, parseFloat, parseInt, Intl, PAIRS, document: D,
    showToast: (m) => seen.toasts.push(String(m)), rndHash: () => 'h', nowStr: () => '00:00', fmt$2: (v) => '$' + Number(v).toFixed(2) };
  c.window = c; vm.createContext(c);
  vm.runInContext('var _pxFmt = {};\n' + need(C.s02, 'pxTxt') + '\n' + need(C.s02, 'pxIn') + '\n' +
    'var S = { openPositions: [], pairStates: {}, chainLog: [], tradingAccount: 1000 };\nlet _editModal = null;\n' +
    ['openPosEdit', 'closePosEditModal', 'applyPosEdit', 'setTpSl'].map(n => need(s08, n)).join('\n'), c, { filename: F.s08 });
  Object.keys(LIVE).forEach(p => { c.S.pairStates[p] = { price: LIVE[p][0] }; });
  return { c, D, seen };
}
function fiche(W, pair, side, extra) {
  const pos = Object.assign({ id: 'p_' + pair + '_' + side, pair, side, auto: false, entryPrice: LIVE[pair][0], stakeUsdt: 100, totalExposure: 100, tp: null, sl: null }, extra || {});
  W.c.S.openPositions.length = 0; W.c.S.openPositions.push(pos);
  vm.runInContext('openPosEdit(' + JSON.stringify(pos.id) + ')', W.c);
  return pos;
}
function balayage08(s08) {
  const W = monde08(s08), faux = [];
  Object.keys(LIVE).forEach(pair => ['long', 'short'].forEach(side => {
    fiche(W, pair, side); const cur = LIVE[pair][0];
    [1, 2, 5, 10].forEach(pct => ['tp', 'sl'].forEach(type => {
      vm.runInContext('setTpSl(null, ' + JSON.stringify(type) + ', ' + pct + ')', W.c);
      const champ = W.D.E[type === 'tp' ? 'peTpInput' : 'peSlInput'].value, v = parseFloat(champ);
      const haut = (side === 'long') === (type === 'tp');
      const voulu = haut ? cur * (1 + pct / 100) : cur * (1 - pct / 100);
      const attendu = PXI.pxIn(pair, voulu);
      const ok = juste(v, voulu, cur, haut); if (!ok || champ !== attendu) faux.push([pair, side, type, pct, champ, attendu, ok]);   // ok : juste mais pas le texte de pxIn
    }));
  }));
  return faux;
}

console.log('▶ banc-n86d · token ' + ((rd('AURA8_v118.html').match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]) + (NOUVEAU ? '' : ' · BANC_ROOT=' + ROOT));

T('S1 · VRAI 08 setTpSl : 12 paires × LONG / SHORT × TP / SL × 1, 2, 5, 10 % → champ = pxIn du prix voulu, juste et du bon côté (témoin : le setTpSl d\'avant se trompe)', () => {
  const faux = balayage08(C.s08);
  assert.deepStrictEqual(faux, [], faux.length + ' champs faux, dont : ' + JSON.stringify(faux.slice(0, 6)));
  if (NOUVEAU) {   // la règle VOIT le défaut : sur le texte d'avant, DOT, EUR et PEPE sont faux, et le TP +1 % d'un LONG PEPE est sous le prix
    const f0 = balayage08(AV.s08).filter(x => !x[6]), paires = [...new Set(f0.map(x => x[0]))].sort();   // les champs FAUX (écart ou mauvais côté), pas seulement un autre texte
    ['DOT/USDT', 'EUR/USDT', 'PEPE/USDT'].forEach(p => assert.ok(paires.includes(p), 'témoin : ' + p + ' juste sur le code d\'avant ? ' + paires));
    const pepe = f0.find(x => x[0] === 'PEPE/USDT' && x[1] === 'long' && x[2] === 'tp' && x[3] === 1);
    assert.ok(pepe && parseFloat(pepe[4]) < LIVE['PEPE/USDT'][0], 'témoin PEPE : ' + JSON.stringify(pepe));
    assert.ok(!paires.includes('BTC/USDT') && !paires.includes('ETH/USDT'), 'BTC / ETH étaient justes avant (2 décimales) : ' + paires);
  }
});

T('S2 · VRAI 08 openPosEdit → setTpSl → « ✓ Appliquer » : PEPE LONG (TP +1 %, SL −1 %) et DOT SHORT (TP +2 %, SL −5 %) → pos.tp / pos.sl justes, du bon côté', () => {
  const run = (s08) => {
    const W = monde08(s08), out = {};
    [['PEPE/USDT', 'long', 1, 1], ['DOT/USDT', 'short', 2, 5]].forEach(([pair, side, a, b]) => {
      const pos = fiche(W, pair, side);
      vm.runInContext('setTpSl(null, "tp", ' + a + '); setTpSl(null, "sl", ' + b + '); applyPosEdit();', W.c);
      out[pair] = { tp: pos.tp, sl: pos.sl, toast: W.seen.toasts[W.seen.toasts.length - 1] };
    });
    return out;
  };
  const r = run(C.s08), P = LIVE['PEPE/USDT'][0], Dp = LIVE['DOT/USDT'][0];
  assert.ok(juste(r['PEPE/USDT'].tp, P * 1.01, P, true) && juste(r['PEPE/USDT'].sl, P * 0.99, P, false), 'PEPE : ' + JSON.stringify(r['PEPE/USDT']));
  assert.ok(juste(r['DOT/USDT'].tp, Dp * 0.98, Dp, false) && juste(r['DOT/USDT'].sl, Dp * 1.05, Dp, true), 'DOT : ' + JSON.stringify(r['DOT/USDT']));
  assert.ok(/TP→\$0,0000040[89]/.test(r['PEPE/USDT'].toast) && /TP→\$0,7193/.test(r['DOT/USDT'].toast), 'toasts : ' + r['PEPE/USDT'].toast + ' | ' + r['DOT/USDT'].toast);
  if (NOUVEAU) { const r0 = run(AV.s08); assert.ok(r0['PEPE/USDT'].tp === 0.000004 && r0['PEPE/USDT'].tp < P, 'témoin : avant, TP de PEPE LONG = 0.000004 sous le prix : ' + JSON.stringify(r0['PEPE/USDT'])); }
});

// ── 03 : le panneau de la paire (_adjPropPct, updatePairAnalysisPanels) ────────────────────────────────────────────────────────────────────────────────────
function monde03(s03, signal, atr) {
  const D = doc(), seen = { recalc: 0 };
  const c = { console, Math, Object, JSON, Array, Number, String, Date, isFinite, isNaN, parseFloat, parseInt, Intl, PAIRS, document: D };
  c.window = c; vm.createContext(c);
  c.getCompositeSignal = () => ({ composite: signal === 'LONG' ? 0.6 : -0.6, signal, col: '#fff', strength: 'FORT', tech: { signals: {}, atScore: 0.5, raw: { stddev: { atr: null } } }, fund: { fundScore: 0.3 } });
  c.getCapitalSummary = () => ({ free: 1000, staked: 0, maxAllowed: 1000 });
  c._recalcProposal = () => { seen.recalc++; };
  vm.runInContext('var _pxFmt = {};\n' + need(C.s02, 'pxTxt') + '\n' + need(C.s02, 'pxIn') + '\n' +
    'var S = { openPositions: [], pairStates: {}, botAutoMode: false, tradingAccount: 2000, feeConfig: { takerRate: 0.001, slippage: 0.0003, fundingRate: 0 }, taxConfig: { region: "BE", regions: { BE: { inclusion: 1, rate: 0.33 } } } };\n' +
    ['_adjPropPct', 'updatePairAnalysisPanels', 'updateManualSuggestion'].map(n => need(s03, n)).join('\n'), c, { filename: F.s03 });
  Object.keys(LIVE).forEach(p => { c.S.pairStates[p] = { price: LIVE[p][0], pnl24h: 0, stake: 100, pairLeverage: 1 }; });
  c.__atr = atr; return { c, D, seen };
}
function balayage03(s03) {
  const faux = []; let recalc = 0;
  ['LONG', 'SHORT'].forEach(signal => {
    const W = monde03(s03, signal);
    Object.keys(LIVE).forEach(pair => { const k = pair.replace('/', '_'), cur = LIVE[pair][0];
      [1, 2, 5].forEach(pct => ['tp', 'sl'].forEach(field => {
        vm.runInContext('_adjPropPct(' + JSON.stringify(pair) + ', ' + JSON.stringify(field) + ', ' + pct + ')', W.c);
        const champ = W.D.E['pinput_' + field + '_' + k].value, v = parseFloat(champ), haut = (signal === 'LONG') === (field === 'tp');
        const voulu = haut ? cur * (1 + pct / 100) : cur * (1 - pct / 100);
        const ok = juste(v, voulu, cur, haut); if (!ok || champ !== PXI.pxIn(pair, voulu)) faux.push([pair, signal, field, pct, champ, ok]);
      }));
    });
    recalc += W.seen.recalc;
  });
  return { faux, recalc };
}

T('P1 · VRAI 03 _adjPropPct : 12 paires × signal LONG / SHORT × TP / SL × 1, 2, 5 % → champ juste et du bon côté ; _recalcProposal appelé à chaque fois', () => {
  const r = balayage03(C.s03);
  assert.deepStrictEqual(r.faux, [], r.faux.length + ' champs faux, dont : ' + JSON.stringify(r.faux.slice(0, 6)));
  assert.strictEqual(r.recalc, 12 * 2 * 3 * 2, 'recalculs');
  if (NOUVEAU) { const r0 = balayage03(AV.s03), paires = [...new Set(r0.faux.filter(x => !x[5]).map(x => x[0]))]; ['DOT/USDT', 'EUR/USDT', 'PEPE/USDT'].forEach(p => assert.ok(paires.includes(p), 'témoin : ' + p)); }
});

T('P2 · VRAI 03 updatePairAnalysisPanels : la proposition préremplie — champs pinput_tp_ / pinput_sl_ = pxIn de tpVal / slVal (ATR 1,5 % du prix), justes et du bon côté', () => {
  const run = (s03) => {
    const faux = [];
    ['LONG', 'SHORT'].forEach(signal => {
      const W = monde03(s03, signal); vm.runInContext('updatePairAnalysisPanels()', W.c);
      Object.keys(LIVE).forEach(pair => { const k = pair.replace('/', '_'), cur = LIVE[pair][0], h = (W.D.E['pproposal_' + k] || {}).innerHTML || '';
        const conv = 0.6, atr = cur * 0.015, tpD = atr * (1.5 + conv), slD = atr * (0.8 + conv * 0.5);
        const L = signal === 'LONG', tpV = L ? cur + tpD : cur - tpD, slV = L ? cur - slD : cur + slD;
        const lire = (f) => { const m = new RegExp('id="pinput_' + f + '_' + k + '" type="number" step="any" value="([^"]*)"').exec(h); return m ? m[1] : null; };
        const tp = lire('tp'), sl = lire('sl');
        const okT = tp !== null && juste(parseFloat(tp), tpV, cur, L), okS = sl !== null && juste(parseFloat(sl), slV, cur, !L);
        if (!okT || tp !== PXI.pxIn(pair, tpV)) faux.push([pair, signal, 'tp', tp, tpV, okT]);
        if (!okS || sl !== PXI.pxIn(pair, slV)) faux.push([pair, signal, 'sl', sl, slV, okS]);
      });
    });
    return faux;
  };
  const faux = run(C.s03);
  assert.deepStrictEqual(faux, [], faux.length + ' champs faux, dont : ' + JSON.stringify(faux.slice(0, 6)));
  if (NOUVEAU) { const f0 = run(AV.s03).filter(x => !x[5]), paires = [...new Set(f0.map(x => x[0]))]; ['DOT/USDT', 'EUR/USDT', 'PEPE/USDT'].forEach(p => assert.ok(paires.includes(p), 'témoin : ' + p + ' · ' + JSON.stringify(f0.slice(0, 3)))); }
});

T('G · garde : fichiers de la décision au texte d\'avant (empreintes du commit c52acfa) ; 02 pxIn inchangé', () => {
  const H = { 'js/02-state-init.js': '9f458ee895a6c0bc', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js': '56365f1615101466', 'js/07-v90-mode-bunker-sos.js': '037d807afdbdafed',
    'js/09c-auto-open.js': 'cb981dcbb9806d73', 'js/09j-helpers.js': '469be1c86f4a9337', 'js/10f-resolveur-cycle.js': '9935b3138d2a97b0', 'js/15-voix-tendance.js': '9757929e4b295254',
    'js/15b-tendance-reelle.js': '08582a20cd8f495a', 'js/16-fiscal.js': '18d61b55137bc8f3' };
  Object.keys(H).forEach(f => assert.strictEqual(h16(require('./banc-fixtures/sans-n80.js')(rd(f), f)), H[f], f + ' a changé'));   // [GO N° 80 · 15/11/2026] hors go n° 80 (15b : liquidation de la poche au prix de la liquidation, banc-n80.js)
});

T('C · appels : pxIn lu par aucun fichier de la décision ; setTpSl ← boutons du HTML ; _adjPropPct ← boutons de 03', () => {
  const js = fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f) && !/\.min\.js$/.test(f));
  ['09c-auto-open.js', '10f-resolveur-cycle.js', '15-voix-tendance.js', '15b-tendance-reelle.js', '09j-helpers.js', '04-v8-0-livraison-35-mode-max-permissif-v.js']
    .forEach(f => assert.ok(!/\bpxIn\(/.test(rd('js/' + f)), f + ' lit pxIn'));
  const html = rd('AURA8_v118.html'), appels = (re) => { const o = []; js.forEach(f => { (rd('js/' + f).match(re) || []).forEach(() => o.push(f)); }); (html.match(re) || []).forEach(() => o.push('HTML')); return o; };
  assert.deepStrictEqual(appels(/\bsetTpSl\(/g).sort(), ['08-learning-history-render.js'].concat(Array(8).fill('HTML')).sort(), 'appelants de setTpSl');
  assert.deepStrictEqual(appels(/\b_adjPropPct\(/g), Array(7).fill('03-per-pair-position-buttons-controls-buid.js'), 'appelants de _adjPropPct');
});

T('F · garde : banc-fixtures/n86d-retours.json redonne 03 et 08 du commit c52acfa au caractère près', () => {
  if (!NOUVEAU) return;   // code d'avant : rien à retirer
  const A = { 'js/03-per-pair-position-buttons-controls-buid.js': '117f962efbeb4f37', 'js/08-learning-history-render.js': 'e5b53d1146fba1b1' };
  Object.keys(A).forEach(f => { const s = require('./banc-fixtures/sans-n105.js')(require('./banc-fixtures/sans-n106.js')(rd(f), f), f); assert.notStrictEqual(h16(s), A[f], f + ' : la retouche manque'); assert.strictEqual(h16(sansN86d(s, f)), A[f], f + ' : autre chose a bougé'); });   // [GO N° 105 · 15/11/2026] hors go n° 105 (08, 09b2 : bornes de l'école, banc-n105.js)   // [GO N° 106 · 15/11/2026] hors go n° 106 (08, 09b2 : amplitude de l'école, banc-n106.js)
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exitCode = fail ? 1 : 0;
