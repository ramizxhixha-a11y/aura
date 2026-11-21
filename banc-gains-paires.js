// banc-gains-paires.js — [GO LIBÉRER · 21/11/2026] js/18c-gains-paires.js : « Mes paires » montre le vrai résultat (Rams 21/11 08:52, 08:59, 09:50).
// VRAI texte de 07 renderPairPnl, de 02 (_isCloseRow, _closeRowUsd, _computePortfolio, _computePortfolioSans, _levCashDebt, _feesDueOf, _pnlBasis)
// et du module, en vm, sur l'EV du backup du pont du 21/11 09:50 (banc-fixtures/gains-paires-ev-20261121.json). Attendus calculés à part (Python).
//   G1  grand chiffre = résultat réel : ton argent 2 372,94 $ (réserve d'impôt comprise) − versements 2 258,87 $ = « +$114.07 » vert ; témoin : 07 seul
//       affiche le compteur, « -$36.01 » (−35,00 sur la capture de 09:49, avant la fermeture d'ETH à −1,01)
//   G2  chaque paire = journal fiscal depuis le 10/10 : AVAX +23.46 (4t · 50 %), BTC +18.87 (6t · 50 %), XRP +12.16 ; barres vertes, tri décroissant ;
//       « paires : 61 fermetures depuis le 10/10 · brut »
//   G3  aujourd'hui : « Aujourd'hui +$221.18 · 24 fermetures » ; BTC auj. +$19.19, ETH auj. +$18.51 ; lignes « open » et d'hier écartées
//   G4  mode sans versement (AA) : le grand chiffre reste celui de 07 ; journal absent : les paires gardent le compteur ; historique coupé → « ≥ » ;
//       rien n'est écrit dans S
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const MOD = rd('js/18c-gains-paires.js'), S07 = rd('js/07-v90-mode-bunker-sos.js'), S02 = rd('js/02-state-init.js');
const FX = JSON.parse(rd('banc-fixtures/gains-paires-ev-20261121.json'));
let pass = 0, fail = 0;
function T(n, fn) { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + '\n      ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); } }
function fnText(src, name) {
  const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); } }
  throw new Error('fin de ' + name);
}
let D = {};
function el(id, attrs) {
  const e = Object.assign({ id, style: {}, textContent: '', children: [], parentNode: null, previousElementSibling: null, dataset: {} }, attrs || {});
  e.appendChild = c => { if (c.parentNode) c.parentNode.children = c.parentNode.children.filter(x => x !== c); c.parentNode = e; e.children.push(c); if (c.id) D[c.id] = c; return c; };
  e.insertBefore = (c, ref) => { c.parentNode = e; const i = e.children.indexOf(ref); e.children.splice(i < 0 ? 0 : i, 0, c); if (c.id) D[c.id] = c; return c; };
  e.querySelectorAll = () => e.children.filter(c => c.pairbar);
  e.querySelector = sel => { const m = /data-pairbar="([^"]+)"/.exec(sel); return m ? e.children.find(c => c.pairbar === m[1]) || null : null; };
  return e;
}
function boot(opts) {
  opts = opts || {}; D = {};
  const left = el('left'), lab = el('lab', { textContent: 'P&L Cumulé · Toutes Paires' }), gUsd = el('globalPnlUsd');
  left.appendChild(lab); left.appendChild(gUsd); gUsd.previousElementSibling = lab;
  const right = el('right'); right.appendChild(el('globalPnlTrades'));
  const bars = el('pairPnlBars'); D.pairPnlBars = bars;
  const P = opts.pairs || JSON.parse(JSON.stringify(FX.pairs));
  Object.keys(P).forEach(p => { const k = p.replace('/', '_'), row = el('row_' + k, { pairbar: p }); bars.appendChild(row);
    const col = el('col_' + k); row.appendChild(col); ['pb_fill_', 'pb_usd_', 'pb_meta_', 'pb_badge_', 'pb_live_'].forEach(x => col.appendChild(el(x + k))); });
  const PAIRS = {}; Object.keys(P).forEach(p => PAIRS[p] = { color: '#fff' });
  const W = Object.assign(JSON.parse(JSON.stringify(FX.wallet)), opts.wallet || {});
  const S = Object.assign({ tradingMode: opts.mode || 'paperReal', pairStates: P, walletStore: {} }, W);
  S.walletStore[S.tradingMode] = W;
  const now = FX.now;
  const c = { S, PAIRS, Math, Number, isFinite, Object, Array, JSON, String, console, Infinity,
    Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } },
    document: { getElementById: id => D[id] || null, createElement: () => el('') } };
  c.window = c; vm.createContext(c);
  vm.runInContext(['_isCloseRow', '_closeRowUsd', '_computePortfolio', '_computePortfolioSans', '_levCashDebt', '_feesDueOf', '_pnlBasis', '_walletFor'].filter(n => n !== '_walletFor').map(n => fnText(S02, n)).join('\n')
    + '\nfunction _activeWallet(){ return S.walletStore[S.tradingMode]; }\nfunction _walletFor(m){ return S.walletStore[m]; }\n'
    + fnText(S07, 'renderPairPnl') + '\nwindow.renderPairPnl = renderPairPnl;', c);
  if (opts.module !== false) vm.runInContext(MOD, c);
  vm.runInContext('renderPairPnl()', c);
  return { c, S, bars };
}
T('G1 résultat réel +$114.07 (2 372,94 − 2 258,87) ; témoin 07 seul : -$36.01', () => {
  boot();
  assert.strictEqual(D.globalPnlUsd.textContent, '+$114.07'); assert.strictEqual(D.globalPnlUsd.style.color, 'var(--up)');
  assert.strictEqual(D.lab.textContent, 'Résultat réel · ton argent');
  assert.strictEqual(D.globalPnlReel.textContent, 'Ton argent $2,372.94 (réserve d\'impôt comprise) − tes versements $2,258.87');
  boot({ module: false });
  assert.strictEqual(D.globalPnlUsd.textContent, '-$36.01'); assert.ok(!D.globalPnlReel);   // la capture de 09:49 disait −35,00 : ETH fermé ensuite à −1,01
});
T('G2 paires = journal fiscal depuis le 10/10 : AVAX +23.46, BTC +18.87, XRP +12.16 ; barres vertes, tri décroissant', () => {
  const { bars } = boot();
  assert.strictEqual(D.pb_usd_AVAX_USDT.textContent, '+$23.46'); assert.strictEqual(D.pb_meta_AVAX_USDT.textContent, '4t · 50%');
  assert.strictEqual(D.pb_usd_BTC_USDT.textContent, '+$18.87'); assert.strictEqual(D.pb_meta_BTC_USDT.textContent, '6t · 50%');
  assert.strictEqual(D.pb_usd_XRP_USDT.textContent, '+$12.16');
  assert.strictEqual(D.pb_fill_AVAX_USDT.style.width, '100%'); assert.strictEqual(D.pb_fill_BTC_USDT.style.background, '#00e87a');
  assert.deepStrictEqual(bars.children.map(r => r.pairbar.split('/')[0]), ['AVAX', 'DOT', 'ETH', 'BNB', 'DOGE', 'BTC', 'LINK', 'ADA', 'PEPE', 'SOL', 'XRP']);
  assert.strictEqual(D.globalPnlTrades.textContent, 'paires : 61 fermetures depuis le 10/10 · brut');
});
T('G3 aujourd\'hui +$221.18 · 24 fermetures ; BTC +$19.19, ETH +$18.51 ; lignes open / d\'hier écartées', () => {
  const { c } = boot();
  assert.strictEqual(D.globalPnlToday.textContent, 'Aujourd\'hui +$221.18 · 24 fermetures');
  assert.strictEqual(D.pb_today_BTC_USDT.textContent, 'auj. +$19.19'); assert.strictEqual(D.pb_today_ETH_USDT.textContent, 'auj. +$18.51');
  const m0 = c.window._gainsPaires.minuit(FX.now);
  const j = c.window._gainsPaires.duJour({ trades: [{ type: 'open', ts: m0 + 1000 }, { type: 'position', ts: m0 - 1000, pnlUsdt: 50 }, { type: 'tendance', ts: m0 + 5, pnlUsdt: 2 }] }, m0);
  assert.strictEqual(j.n, 1); assert.strictEqual(j.usd, 2);
});
T('G4 sans versement : chiffre de 07 ; sans journal : compteur des paires ; coupé → « ≥ » ; S intact', () => {
  boot({ wallet: { ownFundsInjected: 0 } });
  assert.strictEqual(D.globalPnlUsd.textContent, '-$36.01'); assert.strictEqual(D.lab.textContent, 'P&L Cumulé · Toutes Paires');
  boot({ wallet: { fiscal: { hist: [] } } });
  assert.strictEqual(D.pb_usd_BTC_USDT.textContent, '-$6.31', 'sans journal : le compteur de 07');
  const P = JSON.parse(JSON.stringify(FX.pairs)); const m0 = new Date(FX.now); m0.setHours(0, 0, 0, 0);
  P['BTC/USDT'].trades = Array.from({ length: 30 }, (_, i) => ({ type: 'position', ts: m0.getTime() + 1000 + i, pnlUsdt: 1 }));
  const avant = JSON.stringify(P);
  const { S } = boot({ pairs: P });
  assert.strictEqual(D.pb_today_BTC_USDT.textContent, 'auj. ≥ +$30.00'); assert.ok(D.globalPnlToday.textContent.includes('≥'));
  assert.strictEqual(JSON.stringify(S.pairStates), avant, 'S modifié');
});
console.log('\n' + (fail ? '❌ ' + pass + '/' + (pass + fail) + ' tests passés — ' + fail + ' ÉCHEC(S)' : '✅ ' + pass + '/' + pass + ' tests passés'));
process.exit(fail ? 1 : 0);
