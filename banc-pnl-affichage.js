// banc-pnl-affichage.js — [P&L AFFICHAGE · 17/09/2026] VERSION 20260917c
// Micro-mission affichage P&L (spec Rams 13/09) + vérité du portfolio au boot (audit #23).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début absente : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin absente'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s07 = rd('js/07-v90-mode-bunker-sos.js');
const renderSrc = () => { const i = s07.indexOf('function renderPairPnl() {'); const j = s07.indexOf('\n}\n', i); assert.ok(i > 0 && j > i); return s07.slice(i, j + 2); };
// DOM minimal : chaque id → un stub {style, textContent, innerHTML} ; le conteneur des barres reçoit le scaffold
function mkDom() {
  const els = {}; const bars = { innerHTML: '', querySelectorAll: () => [] };
  const document = { getElementById: id => { if (id === 'pairPnlBars') return bars; if (!els[id]) els[id] = { style: {}, textContent: '', innerHTML: '' }; return els[id]; } };
  return { document, els, bars };
}
function run(S, PAIRS) {
  const dom = mkDom();
  const ctx = { S, PAIRS, document: dom.document, Math, Number, Object, isFinite, goPage: () => {} };
  vm.createContext(ctx);
  vm.runInContext(renderSrc(), ctx);
  vm.runInContext('renderPairPnl()', ctx);
  return dom;
}
const PAIRS = { 'BTC/USDT': { color: '#f7931a' }, 'ETH/USDT': { color: '#627eea' } };
console.log('▶ banc-pnl-affichage');
T('D1 · scaffold : noms de paires 18px (même police, couleur cfg.color), colonne 100px, ligne live présente et masquée sans position', () => {
  const S = { pairStates: { 'BTC/USDT': { totalPnlUsd: -0.29, totalPnlPct: 0, totalTrades: 3, winTrades: 1, price: 100 }, 'ETH/USDT': { totalPnlUsd: 1.2, totalPnlPct: 0, totalTrades: 4, winTrades: 3, price: 50 } }, openPositions: [] };
  const dom = run(S, PAIRS);
  assert.ok(dom.bars.innerHTML.includes('grid-template-columns:100px 1fr 60px'));
  assert.ok(dom.bars.innerHTML.includes('class="pb-name" style="font-size:18px;font-weight:700;color:#f7931a;">BTC<'));
  assert.strictEqual((dom.bars.innerHTML.match(/font-size:10px/g) || []).length, 0, 'plus de 10px');
  assert.ok(dom.bars.innerHTML.includes('id="pb_live_BTC_USDT" style="display:none;'));
  assert.strictEqual(dom.els['pb_live_BTC_USDT'].style.display, 'none'); assert.strictEqual(dom.els['pb_badge_BTC_USDT'].style.display, 'none');
  assert.strictEqual(dom.els['pb_usd_BTC_USDT'].textContent, '-$0.29'); assert.strictEqual(dom.els['pb_usd_ETH_USDT'].textContent, '+$1.20');
  assert.strictEqual(dom.els['pb_meta_ETH_USDT'].textContent, '4t · 75%');
});
T('D2 · position bot ouverte : cumul réalisé INCHANGÉ, badge « 🤖 ↑ mise $5.43 », latent live « ● $0.12 » vert (gain) sans signe ; perte → rouge ; manuelle → 👤 ; pnlUsdt absent → calculé depuis le prix', () => {
  const S = { pairStates: { 'BTC/USDT': { totalPnlUsd: -0.29, totalPnlPct: 0, totalTrades: 3, winTrades: 1, price: 100 }, 'ETH/USDT': { totalPnlUsd: 1.2, totalPnlPct: 0, totalTrades: 4, winTrades: 3, price: 49 } },
    openPositions: [{ pair: 'BTC/USDT', side: 'long', auto: true, stakeUsdt: 5.4274, entryPrice: 99, pnlUsdt: 0.12 }, { pair: 'ETH/USDT', side: 'short', auto: false, stakeUsdt: 10, entryPrice: 50 }] };
  const dom = run(S, PAIRS);
  assert.strictEqual(dom.els['pb_usd_BTC_USDT'].textContent, '-$0.29', 'le cumul ne bouge pas');
  assert.strictEqual(dom.els['pb_badge_BTC_USDT'].textContent, '🤖 ↑ mise $5.43'); assert.strictEqual(dom.els['pb_badge_BTC_USDT'].style.display, '');
  assert.strictEqual(dom.els['pb_live_BTC_USDT'].innerHTML, '<span class="pb-dot">●</span> $0.12'); assert.strictEqual(dom.els['pb_live_BTC_USDT'].style.color, 'var(--up)'); assert.strictEqual(dom.els['pb_live_BTC_USDT'].style.display, '');
  // short ETH manuel : entrée 50, prix 49 → +2 % × 10 $ = +0,20 $ (gain sur un short) ; pnlUsdt absent → calculé
  assert.strictEqual(dom.els['pb_badge_ETH_USDT'].textContent, '👤 ↓ mise $10.00');
  assert.strictEqual(dom.els['pb_live_ETH_USDT'].innerHTML, '<span class="pb-dot">●</span> $0.20'); assert.strictEqual(dom.els['pb_live_ETH_USDT'].style.color, 'var(--up)');
  // perte → rouge, sans signe
  S.openPositions[0].pnlUsdt = -0.07; const dom2 = run(S, PAIRS);
  assert.strictEqual(dom2.els['pb_live_BTC_USDT'].innerHTML, '<span class="pb-dot">●</span> $0.07'); assert.strictEqual(dom2.els['pb_live_BTC_USDT'].style.color, 'var(--down)');
});
T('S1 · CSS : point qui bat (.pb-dot / pbPulse) ; aucune légende ni ligne « en cours » ajoutée ; 09b2 : recalage du portfolio au boot = _computePortfolio (mises engagées incluses)', () => {
  const css = rd('css/06-page-dashboard.css'); assert.ok(css.includes('.pb-dot{display:inline-block;animation:pbPulse') && css.includes('@keyframes pbPulse'));
  const r = renderSrc();
  assert.strictEqual(/en cours|légende|legende/i.test(codeStrict(r)), false, 'pas de texte ajouté');
  const c9 = codeStrict(rd('js/09b2-save-load.js'));
  assert.ok(c9.includes("var _wpf = (typeof _computePortfolio === 'function') ? _computePortfolio(_w) :"));
  assert.strictEqual(c9.includes("var _wpf = (_w.cashAccount||0) + (_w.tradingAccount||0);"), false);
  const c2 = codeStrict(rd('js/02-state-init.js')); assert.ok(c2.includes('return (o.cashAccount || 0) + (o.tradingAccount || 0) + eng;'), '_computePortfolio canonique inchangé');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
