// banc-n101.js — [GO N° 101 · 15/11/2026] (ETAT n° 101) le levier GARDÉ de la paire (ps.pairLeverage, par mode) n'avait aucune commande visible : son seul
// écrivain, 03 changePairLev, n'était appelé que par le panneau 03 (#pairPosButtons, display:none) → AVAX ×2 de l'EV ne pouvait plus être remis à ×1.
// Désormais la fiche MAN (10h openManDetail, ouverte par les briques MAN) a une section « ⚡ Levier de la paire » (− ×N +) qui passe par ce même écrivain.
// Chaque essai fait tourner le VRAI texte de l'app en vm et ÉCHOUE sur le code d'avant (BANC_ROOT=<copie du commit 733ed6a> node banc-n101.js), sauf G, C et F.
// Données (app) : backup du pont du 15/11 12:52 — EV : index ×0, AVAX mise 60, réglée ×2, position SHORT de la voix (95,99 $) ; AA et RE : AVAX ×1.
//   B1  VRAI 10h openManDetail : AVAX de l'EV (position de la voix) → la section dit ×2, « en EV », « Levier général ×0 : aucun emprunt, ×2 inactif » ;
//       ses boutons − / + appellent _manPairLev ; paire SANS position (« Ton trade » affiché) → la section est là aussi, après « Ton trade », avant les consignes
//   B2  VRAI _manPairLev(−1) (→ VRAI 03 changePairLev) : AVAX de l'EV passe à ×1, écran « ×1 » vert, note sans « inactif » ; RIEN d'autre ne bouge
//       (les 3 portefeuilles comparés champ par champ : argent, positions, autres paires, AA et RE)
//   B3  le lecteur prend le nouveau réglage : VRAI 02 applyBotSuggestion (« ✓ Appliquer ») sur AVAX → openPosition voit ×1 (avant : ×2) ; mise et levier rendus
//   B4  bornes de 03 (1 … 20) : − à ×1 reste ×1, + monte, 20 plafonne ; index ≥ 1 → note sans « inactif »
//   B5  par mode : AA à l'écran → seul l'AA change, note « en AA » ; l'EV garde son réglage
//   B6  VRAI 10h _manRefreshTick : fiche ouverte, le réglage change ailleurs (mode, index) → la valeur et la note suivent sans rouvrir la fiche
//   G   garde : 02, 03, 07, 09b1, 09b2, 09c, 09f2, 09j, 10e, 15b au texte d'avant (empreintes du commit 733ed6a)
//   C   écrivains : ps.pairLeverage n'est écrit durablement que par 03 changePairLev ; ses appelants : 03 _startHold (panneau masqué) et 10h _manPairLev seuls
//   F   garde : banc-fixtures/n101-retours.json redonne 10h du commit 733ed6a au caractère près
// Ce qui se voit sur la vraie page (backup chargé, fiche AVAX de l'EV, −) : node rejeu/sonde_n101.js --root . --avant <copie> --backup <b>
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const sansN101 = require('./banc-fixtures/sans-n101.js');
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
const F = { s02: 'js/02-state-init.js', s03: 'js/03-per-pair-position-buttons-controls-buid.js', s10h: 'js/10h-pont-fullpower-bricks.js' };
const C = {}; Object.keys(F).forEach(k => { C[k] = rd(F[k]); });

// ── DOM minimal ──
function mkEl(id) {
  const cls = new Set();
  return { id: id || '', style: {}, dataset: {}, value: '', _h: '', className: '', children: [], textContent: '',
    get innerHTML() { return this._h; }, set innerHTML(v) { this._h = String(v); if (v === '') this.children = []; },
    classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) },
    appendChild(e) { this.children.push(e); return e; } };
}
// les éléments écrits par innerHTML (id="…") deviennent trouvables, avec leur texte et leur couleur de départ
function indexHtml(DOM) {
  Object.values(DOM.base).forEach(root => (function walk(e) {
    const re = /<(\w+)[^>]*\bid="([^"]+)"[^>]*>([^<]*)/g; let m;
    while ((m = re.exec(e._h))) { if (!DOM.els[m[2]]) { const x = mkEl(m[2]); x.textContent = m[3]; const col = /color:([^;"]+)/.exec(m[0]); if (col) x.style.color = col[1]; DOM.els[m[2]] = x; } }
    e.children.forEach(walk);
  })(root));
}
// (app) backup du pont du 15/11 12:52 : les 3 portefeuilles réduits à ce que lisent les fonctions essayées
const PAIRES = ['BTC/USDT', 'ETH/USDT', 'AVAX/USDT', 'DOT/USDT'];
function wallets() {
  const ps = (stake, lev, px) => ({ price: px, stake: stake, pairLeverage: lev, trades: [], pnl24h: 0, totalTrades: 0, winTrades: 0, totalPnlUsd: 0 });
  const mk = (trading, stake, avaxLev, pos) => ({ tradingAccount: trading, leverage: 0, leverageBorrowed: 0, leverageReserve: 0, cashAccount: 0, openPositions: pos,
    pairStates: { 'BTC/USDT': ps(stake, 1, 65283.32), 'ETH/USDT': ps(stake, 1, 1825.38), 'AVAX/USDT': ps(stake, avaxLev, 7.228), 'DOT/USDT': ps(stake, 1, 0.734) } });
  return { sim: mk(121.24601674582286, 0, 1, []), real: mk(1145.42, 0, 1, []),
    paperReal: mk(1115.200044076849, 60, 2, [{ id: 'pmwdxqjbiavax', pair: 'AVAX/USDT', side: 'short', auto: false, _voix: 'tendance', stakeUsdt: 95.99, entryPrice: 8.339, totalExposure: 95.99, levBorrowed: 0, pnlUsdt: 15.2, pnl: 13.2 }]) };
}
function world(o) {
  o = o || {};
  const calls = { toast: [], open: [], intervals: [] };
  const DOM = { els: {}, base: {} };
  ['pairDetailOverlay', 'pairDetailTitle', 'pairDetailBody'].forEach(id => { DOM.els[id] = DOM.base[id] = mkEl(id); });
  const S = { tradingMode: o.mode || 'paperReal', botAutoMode: false, walletStore: wallets(), taxConfig: { region: 'XX', regions: { XX: { inclusion: 0, rate: 0 } } }, chainLog: [] };
  const ctx = { S, Math, Number, Object, Array, String, JSON, Date, isFinite, parseFloat, parseInt, isNaN, Error, Set, console,
    PAIRS: Object.fromEntries(PAIRES.map(p => [p, { sym: p.split('/')[0], color: '#fff', dec: 3 }])),
    document: { getElementById: id => DOM.els[id] || null, createElement: () => mkEl(), activeElement: null },
    showToast: (m, d, l) => calls.toast.push({ m, l }),
    setInterval: (fn, ms) => { calls.intervals.push(fn); return 7; }, clearInterval: () => {},
    // doubles de la fiche (éprouvée par banc-manu.js) : le plan du système, les prix, les avis
    _manPlan: p => (o.plan && o.plan === p) ? { stake: 30, free: 300, dir: 'long', lv: { long: { tp: 1, sl: 0.5 }, short: { tp: 1, sl: 0.5 } } } : null,
    _manSystemHtml: () => '<div>système</div>', _manFmtPx: (p, x) => String(x), _manPreviewHtml: () => '', _manWarnHtml: () => '', _manPreview: () => {},
    _isCloseRow: () => false,
    // « ✓ Appliquer » : ce que l'ouvreur VOIT au moment de l'appel
    openPosition: (pair, side) => { const ps = S.pairStates[pair]; calls.open.push({ pair, side, lev: ps.pairLeverage, stake: ps.stake }); return null; },
    getCapitalSummary: () => ({ free: 1000 }), _tradingCapitalBase: () => S.tradingAccount };
  ctx.window = ctx; ctx.calls = calls; ctx.DOM = DOM;
  vm.createContext(ctx);
  const wf = C.s02.match(/\nvar _WALLET_ACCESSOR_FIELDS = \[[\s\S]*?\];/); assert.ok(wf, '02 _WALLET_ACCESSOR_FIELDS');
  vm.runInContext(wf[0] + '\n' + ['_walletKey', '_walletFor', '_activeWallet', '_installWalletAccessors', '_modeLab', 'applyBotSuggestion'].map(n => need(C.s02, n)).join('\n')
    + '\n' + need(C.s03, 'changePairLev') + '\nlet _currentDetailPair = null; let _manRefreshT = null;\n'
    + ['_manPairLevParts', '_manPairLevHtml', '_manPairLevSync', '_manPairLev', '_manRefreshTick', 'openManDetail'].map(n => fnSrc(C.s10h, n) || '').join('\n')
    + '\n_installWalletAccessors();', ctx);
  return ctx;
}
const lev = (W, mode, pair) => W.S.walletStore[mode].pairStates[pair || 'AVAX/USDT'].pairLeverage;
const fiche = (W, pair) => { W.openManDetail(pair); indexHtml(W.DOM); return W.DOM.base.pairDetailBody.children.map(c => c._h); };
const section = secs => secs.find(h => h.includes('⚡ Levier de la paire'));

console.log('▶ banc-n101 · levier gardé de la paire dans la fiche MAN' + (process.env.BANC_ROOT ? ' · BANC_ROOT=' + ROOT : ''));

T('B1 · fiche AVAX de l\'EV (position de la voix) : section « ⚡ Levier de la paire » ×2, en EV, « ×2 inactif » à l\'index ×0, boutons − / + ; paire sans position : après « Ton trade », avant les consignes', () => {
  const W = world(), secs = fiche(W, 'AVAX/USDT'), s = section(secs);
  assert.ok(secs.some(h => h.includes('Position de la voix tendance')), 'témoin : la fiche montre la position de la voix');
  assert.ok(s, 'section absente : ' + secs.map(h => h.slice(0, 40)).join(' | '));
  assert.ok(s.includes('id="manPairLev_AVAX_USDT"') && s.includes('>×2</span>'), 'valeur ×2');
  assert.ok(s.includes('en EV') && s.includes('Levier général ×0 : aucun emprunt, ×2 inactif.'), 'note EV / inactif : ' + s);
  assert.ok(s.includes('onclick="_manPairLev(\'AVAX/USDT\',-1)"') && s.includes('onclick="_manPairLev(\'AVAX/USDT\',1)"'), 'boutons − / +');
  assert.strictEqual(W.window._manPairLev, W._manPairLev, 'appelable depuis le HTML (window)');
  const W2 = world({ plan: 'BTC/USDT' }), s2 = fiche(W2, 'BTC/USDT');
  const iT = s2.findIndex(h => h.includes('Ton trade')), iL = s2.findIndex(h => h.includes('⚡ Levier de la paire')), iC = s2.findIndex(h => h.includes('Consignes garde-fou'));
  assert.ok(iT >= 0 && iL === iT + 1 && iC === iL + 1, 'ordre Ton trade → Levier → Consignes : ' + [iT, iL, iC]);
  assert.ok(s2[iL].includes('>×1</span>') && !s2[iL].includes('inactif'), 'BTC ×1, rien d\'inactif');
});

T('B2 · − : AVAX de l\'EV passe à ×1 (écran ×1 vert, note sans « inactif ») ; rien d\'autre ne bouge dans les 3 portefeuilles', () => {
  const W = world(); fiche(W, 'AVAX/USDT');
  const avant = JSON.parse(JSON.stringify(W.S.walletStore));
  W._manPairLev('AVAX/USDT', -1);
  assert.strictEqual(lev(W, 'paperReal'), 1, 'EV AVAX ×1');
  const v = W.DOM.els.manPairLev_AVAX_USDT, n = W.DOM.els.manPairLevNote_AVAX_USDT;
  assert.strictEqual(v.textContent, '×1'); assert.strictEqual(v.style.color, 'var(--up)');
  assert.ok(n.textContent.includes('en EV') && !n.textContent.includes('inactif'), n.textContent);
  const apres = JSON.parse(JSON.stringify(W.S.walletStore)); avant.paperReal.pairStates['AVAX/USDT'].pairLeverage = 1;
  assert.deepStrictEqual(apres, avant, 'un seul champ a changé');
});

T('B3 · « ✓ Appliquer » (VRAI 02 applyBotSuggestion) prend le nouveau réglage : ×2 avant, ×1 après ; mise et levier de la paire rendus', () => {
  const W = world();
  W.applyBotSuggestion('AVAX/USDT', 'short', 50);
  W._manPairLev && W._manPairLev('AVAX/USDT', -1);
  W.applyBotSuggestion('AVAX/USDT', 'short', 50);
  assert.deepStrictEqual(W.calls.open.map(c => c.lev), [2, 1], 'levier vu par openPosition : ' + JSON.stringify(W.calls.open));
  assert.strictEqual(W.S.walletStore.paperReal.pairStates['AVAX/USDT'].stake, 60, 'mise rendue');
});

T('B4 · bornes de 03 : − à ×1 reste ×1, + monte, 20 plafonne ; index ≥ 1 : note sans « inactif »', () => {
  const W = world(); fiche(W, 'BTC/USDT'); const avant = JSON.parse(JSON.stringify(W.S.walletStore));
  W._manPairLev('BTC/USDT', -1); assert.strictEqual(lev(W, 'paperReal', 'BTC/USDT'), 1);
  W._manPairLev('BTC/USDT', 1); assert.strictEqual(lev(W, 'paperReal', 'BTC/USDT'), 2);
  assert.ok(W.DOM.els.manPairLevNote_BTC_USDT.textContent.includes('×2 inactif'), 'index ×0 : inactif');
  assert.strictEqual(W.DOM.els.manPairLev_BTC_USDT.style.color, 'var(--gold)');
  for (let i = 0; i < 30; i++) W._manPairLev('BTC/USDT', 1);
  assert.strictEqual(lev(W, 'paperReal', 'BTC/USDT'), 20, 'plafond de 03');
  avant.paperReal.pairStates['BTC/USDT'].pairLeverage = 20; assert.deepStrictEqual(JSON.parse(JSON.stringify(W.S.walletStore)), avant, 'en montant : seul le levier de BTC a changé (mise, argent, autres modes)');
  W.S.walletStore.paperReal.leverage = 1; W._manPairLev('BTC/USDT', -1);
  assert.strictEqual(W.DOM.els.manPairLev_BTC_USDT.textContent, '×19');
  assert.ok(!W.DOM.els.manPairLevNote_BTC_USDT.textContent.includes('inactif'), 'index ×1 : actif');
});

T('B5 · par mode : AA à l\'écran → seul l\'AA change (note « en AA ») ; l\'EV garde ×2', () => {
  const W = world({ mode: 'sim' }); fiche(W, 'AVAX/USDT');
  assert.ok(W.DOM.els.manPairLevNote_AVAX_USDT.textContent.includes('en AA'));
  W._manPairLev('AVAX/USDT', 1);
  assert.deepStrictEqual([lev(W, 'sim'), lev(W, 'paperReal'), lev(W, 'real')], [2, 2, 1]);
  W._manPairLev('AVAX/USDT', -1);
  assert.deepStrictEqual([lev(W, 'sim'), lev(W, 'paperReal'), lev(W, 'real')], [1, 2, 1]);
});

T('B6 · VRAI _manRefreshTick : fiche ouverte, l\'index, le réglage ou le mode change → valeur et note suivent sans rouvrir la fiche', () => {
  const W = world(); fiche(W, 'AVAX/USDT'); W.DOM.els.manSys_AVAX_USDT = mkEl('manSys_AVAX_USDT');
  assert.strictEqual(W.calls.intervals.length, 1, 'rafraîchissement armé');
  W.S.walletStore.paperReal.leverage = 1; W.calls.intervals[0]();
  assert.ok(!W.DOM.els.manPairLevNote_AVAX_USDT.textContent.includes('inactif'), 'index ×1 : la note suit');
  W.S.walletStore.paperReal.pairStates['AVAX/USDT'].pairLeverage = 3; W.calls.intervals[0]();
  assert.strictEqual(W.DOM.els.manPairLev_AVAX_USDT.textContent, '×3', 'réglage changé ailleurs : la valeur suit');
  const W2 = world(); fiche(W2, 'BTC/USDT'); W2.DOM.els.manSys_BTC_USDT = mkEl('manSys_BTC_USDT');
  W2.S.walletStore.sim.pairStates['BTC/USDT'].pairLeverage = 4; W2.S.tradingMode = 'sim'; W2.calls.intervals[0]();
  assert.strictEqual(W2.DOM.els.manPairLev_BTC_USDT.textContent, '×4', 'AA à l\'écran : son réglage');
  assert.ok(W2.DOM.els.manPairLevNote_BTC_USDT.textContent.includes('en AA'));
});

T('G · garde : 02, 03, 07, 09b1, 09b2, 09c, 09f2, 09j, 10e, 15b au texte d\'avant (empreintes du commit 733ed6a)', () => {
  const H = { 'js/02-state-init.js': '9f458ee895a6c0bc', 'js/03-per-pair-position-buttons-controls-buid.js': 'edeb1cf93142e44b', 'js/07-v90-mode-bunker-sos.js': '037d807afdbdafed',
    'js/09b1-build-snapshot.js': '393c4df7cf1df426', 'js/09b2-save-load.js': '246e0b7eb4e21195', 'js/09j-helpers.js': '469be1c86f4a9337', 'js/09f2-bricks-man.js': 'd88b74ad5e9d428c',
    'js/10e-helpers-adaptatifs.js': 'c79bbfdff68a816f', 'js/15b-tendance-reelle.js': '08582a20cd8f495a' };
  Object.keys(H).forEach(f => assert.strictEqual(h16(require('./banc-fixtures/sans-n106.js')(require('./banc-fixtures/sans-n80.js')(require('./banc-fixtures/sans-n108.js')(require('./banc-fixtures/sans-n109.js')(rd(f), f), f), f), f)), H[f], f + ' a changé'));   // [GO N° 106 · 15/11/2026] hors go n° 106 (08, 09b2 : amplitude de l'école, banc-n106.js)   // [GO N° 80 · 15/11/2026] hors go n° 80 (15b : liquidation de la poche au prix de la liquidation, banc-n80.js) · [GO N° 108 · 15/11/2026] hors go n° 108 (15b : liquidation propre de l'EV relue sur les bougies 1 h, banc-fixtures/sans-n108.js)   // [GO N° 109 · 20/11/2026] hors go n° 109 (03 : note prouvée, banc-fixtures/sans-n109.js)
  assert.ok(!/pairLeverage/.test(rd('js/09c-auto-open.js')), '09c ne lit pas le levier de la paire');
});

T('C · écrivains et appelants : ps.pairLeverage écrit durablement par 03 changePairLev seul ; changePairLev ← 03 _startHold, 10h _manPairLev', () => {
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f).concat(['AURA8_v118.html']);
  const ecr = [], app = [], man = [];
  files.forEach(f => rd(f).split('\n').forEach((l, i) => {
    if (/pairLeverage\s*=[^=]/.test(l)) ecr.push(f.replace(/^js\//, '').slice(0, 3) + ':' + l.trim().slice(0, 60));
    if (/changePairLev\(/.test(l) && !/function changePairLev/.test(l)) app.push(f.replace(/^js\//, '').slice(0, 3));
    if (/_manPairLev\(/.test(l) && !/function _manPairLev/.test(l)) man.push(f.replace(/^js\//, '').slice(0, 3));
  }));
  // temporaires (posés puis rendus dans un finally) : 03 _openProposedPosition, 07 manuInvert, 10e _openManTrade ; durable : 03 changePairLev
  assert.strictEqual(ecr.length, 7, JSON.stringify(ecr));
  assert.ok(ecr.filter(e => e.startsWith('03-')).length === 3 && ecr.filter(e => e.startsWith('07-')).length === 2 && ecr.filter(e => e.startsWith('10e')).length === 2, JSON.stringify(ecr));
  assert.deepStrictEqual(app.sort(), ['03-', '03-', '10h'], 'appelants de changePairLev : ' + JSON.stringify(app));
  assert.deepStrictEqual(man.sort(), ['10h', '10h'], 'appelants de _manPairLev (les 2 boutons de la fiche) : ' + JSON.stringify(man));
});

T('F · garde : banc-fixtures/n101-retours.json redonne 10h du commit 733ed6a au caractère près', () => {
  if (process.env.BANC_ROOT) return;   // code d'avant : rien à retirer
  const f = 'js/10h-pont-fullpower-bricks.js', s = rd(f);
  assert.notStrictEqual(h16(s), 'f1581cfb8e57c944', 'la retouche manque');
  assert.strictEqual(h16(sansN101(s, f)), 'f1581cfb8e57c944', 'autre chose a bougé');
});

console.log((fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
