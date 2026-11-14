// banc-css-fiscal.js — [GO CSS · écran 6 · 14/11/2026] écran Fiscal par priorité (Rams 14/11 15:56 « Go css », maquette montrée, « Ok » 16:15) — affichage seul.
// Lit le VRAI HTML, le VRAI CSS et fait tourner le VRAI texte de 08 (bloc « PAGE 5 — FISCAL ») avec les VRAIS 16 (registre) et 16b (écran du registre)
// et la vraie 02 calcTaxProvision, en vm, sur un DOM juste assez vrai (innerHTML compte ses écritures).
// Sur le code d'avant (BANC_ROOT=<copie du commit afa04d9>) : F1 à F10 ÉCHOUENT ; G PASSE (garde : ce que d'autres lisent est resté).
//   F1  #page5 : 4 tuiles = les onglets (ftab-tax actif, -global, -pairs, -outils ; chiffre fzV_, ligne fzS_) ; panneaux Impôt, Frais, Paires, Export, Réglages ; plus d'onglets ni de .sec-header
//   F2  switchFiscalTab : 🧰 Outils = Export + Réglages ; « export » / « settings » y mènent ; la tuile active suit ; renderFiscal sans onglet = la tuile active
//   F3  💸 Frais : brut signé (avant « $21.02 » pour −21,02), frais, impôt, net = brut − frais − impôt ; réserve frais ≠ réserve fiscale ; sous-lignes vraies ; jours
//   F4  💱 Paires : un tableau trié par coût (funding de chaque paire, paire retirée, hors paire, impôt de l'année), total = 💸 Frais ; plus d'« Optimisation » ni de « LMSR » ; prochain trade : AUTO et EV non tenue seulement
//   F4b 💸 Frais avec impôt dû > 0, réserve fiscale ≠ réserve frais, impôt rendu / versé, seuil des frais élevés
//   F5  🧰 Export : 5 exports (registre compris) ; plus de « Données à exporter » (2e P&L net sans le funding)
//   F6  ⚙ Réglages : commune, hors AURA, frais, région ; jamais rebâti pendant une saisie ni sans changement (avant : à chaque battement) ; .fee-total-sum au format français
//   F7  Frais, Paires, Export : rebâtis seulement si ce qu'ils montrent change (avant : 5 passages = 5 écritures)
//   F8  ⚖ Impôt (16b) : ordre de la maquette, historique par jour (10 puis « Tout voir »), volets fermés et mémorisés, réglages sortis ; dollars « $1 000,00 »
//   F9  css/33-fiscal-zones.css chargé en dernier au token ; chaque règle visée à #page5 ; plancher 11 px ; 4 tuiles, téléphone 2
//   F10 tuiles : impôt dû et régime, frais et net, paires et la plus coûteuse, exports et région
//   G   ce que d'autres lisent : [id^="ftab-"].active (08 battement), goPage(5) → renderFiscal, taxPanel, renderFiscalTax / saveFeeSettings / selectRegion / renderFiscalMini
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.message || e).split('\n').slice(0, 3).join('\n     ')); } }
function fnSrc(src, name) {
  const m = new RegExp('(^|\\n)function ' + name + '\\s*\\(').exec(src); assert.ok(m, 'fonction absente : ' + name);
  const start = m.index + m[1].length; let d = 0;
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && !--d) return src.slice(start, i + 1); }
  throw new Error('fin introuvable : ' + name);
}

const html = rd('AURA8_v118.html');
const TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const p5 = html.slice(html.lastIndexOf('<div', html.indexOf('id="page5"')), html.indexOf('<!-- /pages -->'));
const idsOf = s => [...s.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const s02 = rd('js/02-state-init.js'), s08 = rd('js/08-learning-history-render.js'), S16 = rd('js/16-fiscal.js'), S16B = rd('js/16b-fiscal-ecran.js');
const FISC08 = s08.slice(s08.indexOf('// PAGE 5 — FISCAL'), s08.indexOf('// v3.1 — INTELLIGENCE BANNER'));
const CSS = (() => { try { return rd('css/33-fiscal-zones.css'); } catch (e) { return ''; } })();

// ── le monde : un mode EV vu au backup du 14/11 13:26 (frais, résultat) et un registre rempli par le VRAI 16 ──
const D0 = Date.UTC(2026, 9, 17, 13, 0), J = 864e5;
function monde(o) {
  o = o || {};
  const els = {}, store = { d: {}, sets: 0 };
  const mk = id => { const cls = new Set(); const e = { id, style: {}, textContent: '', _html: '', nbSet: 0, tagName: 'DIV',
    classList: { contains: c => cls.has(c), add: c => cls.add(c), remove: c => cls.delete(c), toggle: (c, on) => { on = on === undefined ? !cls.has(c) : !!on; on ? cls.add(c) : cls.delete(c); return on; } },
    contains: x => !!x && (x === e || x._in === e.id) };
    Object.defineProperty(e, 'innerHTML', { get: () => e._html, set: v => { e._html = String(v); e.nbSet++; } });
    Object.defineProperty(e, 'childElementCount', { get: () => (e._html ? 1 : 0) }); return e; };
  idsOf(p5).forEach(id => { els[id] = mk(id); const m = p5.match(new RegExp('class="([^"]*)" id="' + id + '"')); if (m) m[1].split(' ').forEach(c => els[id].classList.add(c)); });
  const tiles = () => Object.values(els).filter(e => /^ftab-/.test(e.id));
  const doc = { activeElement: null, getElementById: id => els[id] || null,
    querySelector: sel => (/\.active/.test(sel) ? (tiles().find(e => e.classList.contains('active')) || null) : (sel === '#taxSettings .fee-total-sum' ? (els.__sum || null) : null)),
    querySelectorAll: sel => (/fz-tile|ftab-/.test(sel) ? tiles() : []) };
  const fees = { totalTradingFees: 45.25042836520347, totalFunding: 0.34855912757415836, totalSlippage: 13.575128509561038, totalGross: 59.17411600233917, totalTaxProvision: 0,
    totalPnlGross: -21.024702517023407, totalPnlNet: -79.85025939178792, tradeCount: 375, feeReserveAccount: 58.825556874764494,
    byPair: { 'ETH/USDT': { tradingFees: 10.4924, slippage: 3.1477, gross: 13.6857, tax: 0, pnlGross: 3.3316, pnlNet: -10.3086, trades: 27 },
              'ADA/USDT': { tradingFees: 4.8725, slippage: 1.4618, gross: 6.3343, tax: 0, pnlGross: -4.5279, pnlNet: -10.8621, trades: 42 },
              'PEPE/USDT': { tradingFees: 4.1639, slippage: 1.2492, gross: 5.4131, tax: 0, pnlGross: -6.8341, pnlNet: -12.2472, trades: 32 } },
    feeLog: [{ pair: 'ETH/USDT', notional: 1000, tradingFee: 2, slipFee: 0.6, totalFee: 2.6, taxAmount: 0, pnlGross: -1.99, pnlNet: -4.59, regime: 'spec', ts: D0 + 9 * J + 8 * 36e5, time: '23:09:52' },
             { pair: 'ETH/USDT', notional: 86.6, tradingFee: 0.17, slipFee: 0.05, totalFee: 0.23, taxAmount: 0, pnlGross: 0.18, pnlNet: -0.05, regime: 'spec', ts: D0 + 9 * J + 7 * 36e5, time: '22:01:52' },
             { pair: 'XRP/USDT', notional: 79.9, tradingFee: 0.16, slipFee: 0.05, totalFee: 0.21, taxAmount: 0, pnlGross: -0.62, pnlNet: -0.83, regime: 'normal', ts: D0, time: '15:23:16' }] };
  const sb = { console, Intl, __clock: { t: Date.UTC(2026, 10, 14, 12, 26) }, setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, nowStr: () => '00:00', showToast: () => {}, saveState() {},
    document: doc, els, store, localStorage: { getItem: k => (k in store.d ? store.d[k] : null), setItem: (k, v) => { store.sets++; store.d[k] = String(v); } },
    PAIRS: { 'ETH/USDT': { color: '#627eea' }, 'ADA/USDT': { color: '#0033ad' }, 'PEPE/USDT': { color: '#3d9970' }, 'BTC/USDT': { color: '#f7931a' } },
    exportTradesCSV() {}, exportFeesCSV() {}, exportSummaryCSV() {}, exportFullJSON() {}, downloadFile() {}, _decErr() {} };
  sb.window = sb; vm.createContext(sb);
  vm.runInContext('const __RealDate = Date; Date = class extends __RealDate { constructor(...a) { if (a.length) super(...a); else super(__clock.t); } static now() { return __clock.t; } };'
    + 'var S = { tradingMode: "paperReal", usdEurRate: 0.9, _usdEurLastFetch: 1, botAutoMode: true, fiscalCfg: { commune: 0, ext: {} },'
    + ' taxConfig: { region: "BE", regions: { BE: { label: "🇧🇪 Belgique", method: "Normal 10% / Spéc. 33%", note: "Loi du 03/04/2026", rate: 0.10, inclusion: 1 }, FR: { label: "🇫🇷 France", method: "PFU", note: "", rate: 0.314, inclusion: 1 }, CH: { label: "🇨🇭 Suisse", method: "Exonéré", note: "", rate: 0, inclusion: 1 } } },'
    + ' feeConfig: { makerRate: 0.001, takerRate: 0.001, fundingRate: 0.00005, slippage: 0.0003 }, chainLog: [], pairStates: { "ETH/USDT": { stake: 0 }, "ADA/USDT": { stake: 0 }, "PEPE/USDT": { stake: 0 }, "BTC/USDT": { stake: 0 } },'
    + ' openPositions: [], tradingAccount: 1115.41, fiscalReserveAccount: 0, fiscalReserveLog: [], antiNegReserve: 0, ownFundsInjected: 2258.87, leverageTotalFees: 0, paperRealConfig: { maxConcurrentPos: 3 },'
    + ' fees: ' + JSON.stringify(fees) + ','
    + ' walletStore: { sim: { tradingAccount: 0, fiscalReserveAccount: 0, fiscalReserveLog: [], openPositions: [] }, paperReal: { tradingAccount: 1115.41, fiscalReserveAccount: 0, fiscalReserveLog: [], openPositions: [] }, real: { tradingAccount: 0, fiscalReserveAccount: 0, fiscalReserveLog: [], openPositions: [] } } };'
    + 'function _walletKey(m) { var k = m || S.tradingMode; return (k === "paperReal" || k === "real") ? k : "sim"; }'
    + 'function _walletFor(m) { return S.walletStore[_walletKey(m)]; }', sb);
  vm.runInContext(S16, sb, { filename: 'js/16-fiscal.js' });
  vm.runInContext(S16B, sb, { filename: 'js/16b-fiscal-ecran.js' });
  vm.runInContext(fnSrc(s02, 'calcTaxProvision'), sb);
  vm.runInContext(FISC08, sb, { filename: 'js/08 (PAGE 5 — FISCAL)' });
  // 12 fermetures EV au registre (VRAI 16), sur 3 jours : 5 MAN LONG (normal), 7 AUTO SHORT (spéculatif ; monde riche : gagnants → impôt dû > 0)
  if (o.registre !== false) for (let i = 0; i < 12; i++) {
    sb.__clock.t = D0 + Math.floor(i / 5) * J + i * 6e5;
    vm.runInContext('_fiscOnClose({ pair: ' + JSON.stringify(['ETH/USDT', 'ADA/USDT', 'PEPE/USDT'][i % 3]) + ', side: ' + (i < 5 ? '"long", auto: false' : '"short", auto: true')
      + ', stakeUsdt: 1000, levBorrowed: 0, totalExposure: 1000, entryPrice: 100, _fxIn: 0.9 }, ' + (o.riche && i >= 5 ? 25 : (i % 2 ? 1.5 : -2)) + ', { tradingFee: 2, slipFee: 0.6 }, 100)', sb);
  }
  if (o.riche) vm.runInContext('(function () { var f = S.fees, bp = f.byPair;'
    + ' bp["ADA/USDT"].gross += 0.12; bp["PEPE/USDT"].gross += 0.07;'   // funding pendant la tenue (02 applyFundingFees : byPair.gross)
    + ' bp["GBP/USDT"] = { tradingFees: 0.9, slippage: 0.27, gross: 1.2, tax: 0, pnlGross: -0.3, pnlNet: -1.47, trades: 5 };'   // paire retirée de PAIRS (11) qui garde ses frais
    + ' var k = Object.keys(bp), s = function (x) { return k.reduce(function (a, p) { return a + bp[p][x]; }, 0); };'
    + ' f.totalTradingFees = s("tradingFees"); f.totalSlippage = s("slippage"); f.totalGross = s("gross") + 1.5; f.totalFunding = f.totalGross - f.totalTradingFees - f.totalSlippage;'   // + 1,50 $ d'intérêts du levier, hors paire (02 applyLeverageBorrowFees)
    + ' f.totalPnlGross = s("pnlGross"); f.totalPnlNet = s("pnlNet"); f.tradeCount = s("trades"); f.totalTaxProvision = 99;'   // cumul d'avant ≠ impôt dû de l'année
    + ' S.fiscalReserveAccount = 7.25; S.antiNegReserve = 3;'
    + ' f.feeLog.unshift({ pair: "ADA/USDT", notional: 50, tradingFee: 0.1, slipFee: 0.03, totalFee: 0.13, taxAmount: -1.5, pnlGross: -4, pnlNet: -2.63, regime: "spec", ts: __clock.t - 36e5 },'
    + '                  { pair: "ETH/USDT", notional: 50, tradingFee: 0.1, slipFee: 0.03, totalFee: 0.13, taxAmount: 0.66, pnlGross: 2, pnlNet: 1.21, regime: "spec", ts: __clock.t - 72e5 }); })()', sb);
  sb.__clock.t = Date.UTC(2026, 10, 14, 12, 26);
  return { sb, els, store, run: code => vm.runInContext(code, sb) };
}
const txt = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

console.log('▶ banc-css-fiscal · token ' + TOK + (process.env.BANC_ROOT ? ' · BANC_ROOT=' + ROOT : ''));

T('F1 #page5 : 4 tuiles = les onglets (⚖ Impôt actif, 💸 Frais, 💱 Paires, 🧰 Outils, chiffre et ligne) ; panneaux dans l\'ordre Impôt · Frais · Paires · Export · Réglages ; plus d\'onglets ni de titres figés', () => {
  const tiles = [...p5.matchAll(/<button class="fz-tile( active)?" id="ftab-([a-z]+)" onclick="switchFiscalTab\('([a-z]+)',this\)"><span class="fz-h">([^<]+)<\/span><em class="fz-v" id="fzV_([a-z]+)"><\/em><span class="fz-sub" id="fzS_([a-z]+)"><\/span><\/button>/g)];
  assert.deepStrictEqual(tiles.map(m => [m[2], !!m[1], m[3], m[5], m[6]]), [['tax', true, 'tax', 'tax', 'tax'], ['global', false, 'global', 'global', 'global'], ['pairs', false, 'pairs', 'pairs', 'pairs'], ['outils', false, 'outils', 'outils', 'outils']]);
  assert.deepStrictEqual(tiles.map(m => m[4]), ['⚖ Impôt', '💸 Frais', '💱 Paires', '🧰 Outils']);
  const pos = ['fiscBref', 'fpanel-tax', 'fpanel-global', 'fpanel-pairs', 'fpanel-export', 'fpanel-settings'].map(id => p5.indexOf('id="' + id + '"'));
  assert.ok(pos.every((p, i) => p > 0 && (!i || p > pos[i - 1])), 'ordre : ' + pos.join(' '));
  assert.ok(!/agent-tab|sec-header|fRegionBadge|fPeriodBadge|fTradeCount/.test(p5), 'onglets, titres figés et pastilles retirés');
  ['taxPanel', 'fiscalSummary', 'fiscalAlertZone', 'fiscalBreakdown', 'feeLog', 'feesByPair', 'exportPanel', 'taxSettings'].forEach(id => assert.ok(p5.includes('id="' + id + '"'), id));
  assert.ok(/<div id="fpanel-tax">/.test(p5) && ['global', 'pairs', 'export', 'settings'].every(t => p5.includes('<div id="fpanel-' + t + '" style="display:none;">')), 'Impôt visible à l\'ouverture');
});

T('F2 switchFiscalTab : 🧰 Outils montre Export puis Réglages ; « export » et « settings » y mènent ; la tuile active suit ; renderFiscal sans onglet rend la tuile active', () => {
  const W = monde();
  W.run('switchFiscalTab("outils")');
  const vis = () => ['tax', 'global', 'pairs', 'export', 'settings'].filter(t => W.els['fpanel-' + t].style.display !== 'none');
  assert.deepStrictEqual(vis(), ['export', 'settings']);
  assert.deepStrictEqual(Object.keys(W.els).filter(k => /^ftab-/.test(k) && W.els[k].classList.contains('active')), ['ftab-outils']);
  assert.ok(/Trades complets/.test(W.els.exportPanel.innerHTML) && /fxCommune/.test(W.els.taxSettings.innerHTML), 'les deux panneaux rendus');
  W.run('switchFiscalTab("settings")'); assert.deepStrictEqual(vis(), ['export', 'settings']);
  W.run('switchFiscalTab("global")'); assert.deepStrictEqual(vis(), ['global']);
  const n = W.els.fiscalSummary.nbSet; W.run('S.fees.tradeCount = 376; renderFiscal()'); assert.ok(W.els.fiscalSummary.nbSet === n + 1, 'renderFiscal() = l\'onglet de la tuile active (Frais)');
  W.run('switchFiscalTab("zzz")'); assert.deepStrictEqual(vis(), ['tax'], 'onglet inconnu : Impôt');
});

T('F3 💸 Frais : quatre chiffres (brut −$21,02 signé, frais, impôt, net −$80,20 = brut − frais − impôt) ; réserve frais séparée de la réserve fiscale ; sous-lignes vraies ; derniers frais par jour', () => {
  const W = monde(); W.run('renderFiscalGlobal()');
  const k = txt(W.els.fiscalSummary.innerHTML);
  assert.ok(/Résultat brut −\$21,02/.test(k), k); assert.ok(/Frais −\$59,17/.test(k)); assert.ok(/Impôt provisionné \$0,00/.test(k)); assert.ok(/Résultat net −\$80,20/.test(k));
  assert.ok(/cumul EV · 375 trades fermés/.test(k) && !/SESSION/.test(k));
  const b = txt(W.els.fiscalBreakdown.innerHTML);
  assert.ok(/Réserve frais · cumul des frais payés \$58,83/.test(b) && /Réserve fiscale dédiée \$0,00/.test(b) && !/Compte Réserve Fiscal/.test(b), b.slice(0, 300));
  assert.ok(/entrée taker · sortie maker ou taker selon la sortie/.test(b) && /0,005 % par 8 h/.test(b) && !/conviction|0\.01% par cycle/.test(b), 'sous-lignes');
  assert.ok(/Fonds propres injectés · exonérés \$2 258,87/.test(b.replace(/ | /g, ' ')), 'fonds propres');
  const l = W.els.feeLog.innerHTML;
  assert.strictEqual((l.match(/class="fz-day"/g) || []).length, 2, 'deux jours'); assert.ok(/net −\$4,59/.test(l) && /mise \$1.000,00/.test(l.replace(/ | /g, '.')), 'ligne de frais');
  assert.ok(/✅/.test(W.els.fiscalAlertZone.innerHTML), 'alertes');
});

T('F4 💱 Paires : un tableau trié par coût, funding de CHAQUE paire, paire retirée de PAIRS gardée (« retirée »), « Hors paire » (intérêts du levier), l\'impôt de l\'année, total = 💸 Frais (frais + impôt, net) ; plus d\'« Optimisation » ni de « LMSR »', () => {
  const W = monde({ riche: true }); W.sb._tlrTientEV = () => true;
  W.run('renderFiscalGlobal(); renderFiscalPairs(); _fzBref()');
  const h = W.els.feesByPair.innerHTML, row = n => { const m = h.match(new RegExp('<div class="fz-pt[^"]*"><span[^>]*>' + n + '[\\s\\S]*?</div>')); return m ? txt(m[0]).trim() : ''; };
  const rows = [...h.matchAll(/<div class="fz-pt[^"]*"><span[^>]*>([^<]+)/g)].map(m => m[1].trim());
  assert.deepStrictEqual(rows, ['Paire', 'ETH', 'ADA', 'PEPE', 'GBP', 'BTC', 'Hors paire', 'Impôt 2026', 'Total'], rows.join());
  assert.ok(/GBP · retirée/.test(row('GBP')), 'paire retirée : ' + row('GBP'));
  const v = JSON.parse(W.run('JSON.stringify({ fuA: S.fees.byPair["ADA/USDT"].gross - S.fees.byPair["ADA/USDT"].tradingFees - S.fees.byPair["ADA/USDT"].slippage, tax: calcTaxProvision(),'
    + ' frais: S.fees.totalGross, net: S.fees.totalPnlGross - S.fees.totalGross - calcTaxProvision() })'));
  assert.ok(v.tax > 1, 'impôt dû de l\'année > 0 : ' + v.tax);
  assert.ok(row('ADA').includes(W.run('_fiscUsd(-' + v.fuA + ')')), 'funding d\'ADA : ' + row('ADA'));
  assert.ok(/Hors paire −\$1,50 −\$1,50$/.test(row('Hors paire')), row('Hors paire'));
  assert.ok(row('Impôt 2026').endsWith(W.run('_fiscUsd(-' + v.tax + ')') + ' ' + W.run('_fiscUsd(-' + v.tax + ', true)')), row('Impôt 2026'));
  const tot = row('Total').split(' '), k = txt(W.els.fiscalSummary.innerHTML);
  assert.strictEqual(tot[tot.length - 1], W.run('_fiscUsd(' + v.net + ', true)'), 'total net = net de 💸 : ' + row('Total'));
  assert.ok(k.includes('Résultat net ' + tot[tot.length - 1]), '💸 dit le même net : ' + k);
  assert.ok(row('Total').includes(W.run('_fiscUsd(-(' + v.frais + ' + ' + v.tax + '))')), 'total coût = frais + impôt');
  assert.ok(!/Optimisation|LMSR|Prochain trade/.test(h), 'retirés');
  assert.ok(txt(W.els.fzV_pairs.innerHTML).trim() === '4', 'tuile : 4 paires avec des trades (GBP comprise) : ' + W.els.fzV_pairs.innerHTML);
  W.sb._tlrTientEV = () => false; W.run('renderFiscalPairs()');
  assert.ok(/Prochain trade d'un bot/.test(W.els.feesByPair.innerHTML), 'là où les bots ouvrent (AUTO, EV non tenue) : la ligne');
  W.run('S.botAutoMode = false; renderFiscalPairs()');
  assert.ok(!/Prochain trade/.test(W.els.feesByPair.innerHTML), 'MANU : les bots n\'ouvrent pas (09c:70), pas de ligne');
});

T('F4b 💸 Frais sur le monde riche : net = brut − frais − impôt DÛ (calcTaxProvision, pas le cumul totalTaxProvision) ; réserve frais et réserve fiscale séparées ; impôt rendu « +$1,50 », versé « −$0,66 » ; seuil « frais élevés » à 25 %', () => {
  const W = monde({ riche: true }); W.run('renderFiscalGlobal()');
  const v = JSON.parse(W.run('JSON.stringify({ tax: calcTaxProvision(), brut: S.fees.totalPnlGross, frais: S.fees.totalGross })')), k = txt(W.els.fiscalSummary.innerHTML);
  assert.ok(k.includes('Impôt provisionné ' + W.run('_fiscUsd(-' + v.tax + ')')) && k.includes('Résultat net ' + W.run('_fiscUsd(' + (v.brut - v.frais - v.tax) + ', true)')), k);
  const b = txt(W.els.fiscalBreakdown.innerHTML);
  assert.ok(/Réserve frais · cumul des frais payés \$58,83/.test(b) && /Réserve fiscale dédiée \$7,25/.test(b) && /Réserve anti-négatif · 0 trade couvert \$3,00/.test(b), b);
  const l = txt(W.els.feeLog.innerHTML);
  assert.ok(/impôt \+\$1,50 \(33 %\)/.test(l) && /impôt −\$0,66 \(33 %\)/.test(l), l.slice(0, 400));
  W.run('S.fees.totalPnlGross = 100; S.fees.totalGross = 26; _fzKeys.global = ""; renderFiscalGlobal()');
  assert.ok(/Frais élevés : 26,0 % du résultat brut/.test(txt(W.els.fiscalAlertZone.innerHTML)), txt(W.els.fiscalAlertZone.innerHTML));
  W.run('S.fees.totalGross = 24; renderFiscalGlobal()');
  assert.ok(!/Frais élevés/.test(txt(W.els.fiscalAlertZone.innerHTML)), 'sous 25 % : rien');
});

T('F5 🧰 Export : cinq exports (registre fiscal compris) ; plus de « Données à exporter »', () => {
  const W = monde(); W.run('renderFiscalExport()'); const h = W.els.exportPanel.innerHTML;
  assert.deepStrictEqual([...h.matchAll(/onclick="([a-zA-Z_]+)\(\)"/g)].map(m => m[1]), ['_fiscExportCsv', 'exportTradesCSV', 'exportFeesCSV', 'exportSummaryCSV', 'exportFullJSON']);
  assert.ok(/Registre fiscal EV/.test(h) && /CSV · 12 trades du registre/.test(h) && !/Données à exporter|P&amp;L Net|P&L Net/.test(h));
});

T('F6 ⚙ Réglages : commune, hors AURA, 4 frais, région ; pas rebâti sans changement ni pendant une saisie (avant : à chaque battement, le champ perdait le doigt) ; rebâti quand un frais change ; total aller-retour au format français', () => {
  const W = monde(); W.run('renderFiscalSettings()'); const h = W.els.taxSettings.innerHTML;
  ['fxCommune', 'fxExt', 'fee_makerRate', 'fee_takerRate', 'fee_slippage', 'fee_fundingRate'].forEach(id => assert.ok(h.includes('id="' + id + '"'), id));
  assert.ok(/onchange="_fiscSetCommune\(this\.value\)"/.test(h) && /onchange="_fiscSetExt\(this\.value\)"/.test(h) && /oninput="saveFeeSettings\(\)"/.test(h));
  assert.ok(/selectRegion\('FR'\)/.test(h) && /selectRegion\('CH'\)/.test(h) && !/selectRegion\('BE'\)/.test(h) && /Belgique/.test(h), 'région choisie en grand, les autres en boutons');
  assert.ok(/class="fee-total-sum"[^>]*>0,265 %/.test(h), 'total aller-retour');
  const n = W.els.taxSettings.nbSet; for (let i = 0; i < 5; i++) W.run('renderFiscalSettings()'); assert.strictEqual(W.els.taxSettings.nbSet, n, 'sans changement');
  W.run('S.feeConfig.takerRate = 0.002'); W.sb.document.activeElement = { tagName: 'INPUT', _in: 'taxSettings' };
  W.run('renderFiscalSettings()'); assert.strictEqual(W.els.taxSettings.nbSet, n, 'pendant une saisie : rien');
  W.sb.document.activeElement = null; W.run('renderFiscalSettings()'); assert.strictEqual(W.els.taxSettings.nbSet, n + 1, 'frais changé : rebâti');
});

T('F7 Frais, Paires, Export : 5 passages sans changement = une seule écriture (avant : 5) ; un trade de plus = rebâti', () => {
  const W = monde();
  [['renderFiscalGlobal', 'fiscalSummary'], ['renderFiscalPairs', 'feesByPair'], ['renderFiscalExport', 'exportPanel']].forEach(([f, id]) => {
    for (let i = 0; i < 5; i++) W.run(f + '()'); assert.strictEqual(W.els[id].nbSet, 1, f + ' : ' + W.els[id].nbSet);
  });
  W.run('S.fees.tradeCount++; S.fees.totalGross += 0.5; renderFiscalGlobal(); renderFiscalPairs(); renderFiscalExport()');
  assert.deepStrictEqual(['fiscalSummary', 'feesByPair', 'exportPanel'].map(id => W.els[id].nbSet), [2, 2, 2]);
  // chaque donnée montrée, changée seule, rebâtit son onglet (sinon : chiffre périmé à l'écran)
  const n = id => W.els[id].nbSet, chg = (code, f, id) => { const a = n(id); W.run(code + '; ' + f + '()'); assert.strictEqual(n(id), a + 1, code + ' → ' + f); };
  chg('S.fiscalReserveAccount = 4', 'renderFiscalGlobal', 'fiscalSummary');
  chg('S.antiNegReserve = 2', 'renderFiscalGlobal', 'fiscalSummary');
  chg('S.ownFundsInjected = 10', 'renderFiscalGlobal', 'fiscalSummary');
  chg('__clock.t = Date.UTC(2026, 10, 14, 13); _fiscOnClose({ pair: "ETH/USDT", side: "short", auto: true, stakeUsdt: 1000, levBorrowed: 0, totalExposure: 1000, entryPrice: 100, _fxIn: 0.9 }, 40, { tradingFee: 2, slipFee: 0.6 }, 100)', 'renderFiscalGlobal', 'fiscalSummary');   // impôt dû
  chg('S.fees.byPair["ADA/USDT"].pnlGross += 1; S.fees.totalPnlGross += 1', 'renderFiscalPairs', 'feesByPair');
  chg('S.fees.byPair["PEPE/USDT"].gross += 0.2', 'renderFiscalPairs', 'feesByPair');   // funding d'une paire (le total bouge aussi en vrai ; ici seule la paire)
  chg('S.tradingAccount = 500', 'renderFiscalPairs', 'feesByPair');   // mise de base du prochain trade (les bots ouvrent ici)
  W.run('renderFiscalSettings()'); chg('S.fiscalCfg.commune = 7', 'renderFiscalSettings', 'taxSettings');
});

T('F8 ⚖ Impôt (16b) : chiffres → bot fiscal → deux régimes → par crypto → historique par jour (10 puis « Tout voir (12) ») → volets fermés (dépôt, années, la loi) ; réglages sortis ; « $1 000,00 »', () => {
  const W = monde(); W.run('renderFiscalTax()'); const h = W.els.taxPanel.innerHTML;
  const at = s => h.indexOf(s), ord = ['fz-hero', 'Bot fiscal', 'Les deux régimes', 'Par crypto', 'Historique 2026', 'data-fold="depot"', 'data-fold="annees"', 'data-fold="loi"'].map(at);
  assert.ok(ord.every((p, i) => p > 0 && (!i || p > ord[i - 1])), 'ordre : ' + ord.join(' '));
  assert.ok(/Impôt dû 2026 à ce jour/.test(h) && /Régime en cours · AUTO/.test(h) && /Dépôt fiscal · provision 2026/.test(h));
  assert.strictEqual((h.match(/class="fz-tr"/g) || []).length, 10, '10 trades visibles'); assert.ok(/Tout voir \(12\)/.test(h)); assert.strictEqual((h.match(/class="fz-day"/g) || []).length, 3, '3 jours');
  assert.ok(!/<details[^>]*\sopen/.test(h), 'volets fermés'); assert.ok(!/fxCommune|fxExt|_fiscExportCsv/.test(h), 'réglages et export sortis');
  assert.ok(/Mets le taux de ta commune dans 🧰 Outils › Réglages fiscaux/.test(h) && !/ci-dessous/.test(h), 'le bot fiscal envoie vers 🧰 Outils (avant : « ci-dessous »)');
  assert.ok(/mise \$1.000,00/.test(h.replace(/ | /g, '.')), 'dollars au format français');
  W.run('_fiscFold("loi", true); _fiscUi.sig = ""; renderFiscalTax()');
  assert.ok(/data-fold="loi" open/.test(W.els.taxPanel.innerHTML) && JSON.parse(W.store.d.aura_fiscal_volets).loi === true, 'volet mémorisé');
  const W2 = monde({ registre: false }); W2.store.d.aura_fiscal_volets = '{"depot":true}';
  W2.run(S16B.replace(/\(function \(\) \{ try \{ var v = JSON\.parse/, '(function () { try { var v = JSON.parse')); W2.run('_fiscUi.sig = ""; renderFiscalTax()');
  assert.ok(/data-fold="depot" open/.test(W2.els.taxPanel.innerHTML), 'relu au chargement');
});

T('F9 css/33-fiscal-zones.css chargé en dernier au token ' + TOK + ' ; chaque règle visée à #page5 ; plancher 11 px ; 4 tuiles, téléphone 2', () => {
  const links = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"?]+)\?v=([0-9a-z]+)"/g)];
  const last = links[links.length - 1]; assert.ok(last && last[1] === 'css/33-fiscal-zones.css' && last[2] === TOK, 'dernier : ' + (last && last[1]));
  const css = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const sel = [...css.replace(/@media[^{]+\{/g, '').matchAll(/([^{}]+)\{[^{}]*\}/g)].map(m => m[1].trim()).filter(Boolean);
  assert.deepStrictEqual(sel.flatMap(s => s.split(',').map(x => x.trim())).filter(x => x && !x.startsWith('#page5')), [], 'sélecteurs hors #page5');
  const decl = [...css.matchAll(/\{([^{}]*)\}/g)].map(m => m[1]).join(';');
  assert.deepStrictEqual([...decl.matchAll(/font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/g)].map(m => +m[1]).filter(n => n < 11), [], 'tailles < 11 px');
  assert.ok(/#page5 \{[^}]*--fs-6: 11px/.test(css), 'variables --fs-* au plancher');
  assert.ok(/#page5 \.fz-bref \{[^}]*grid-template-columns: repeat\(4, 1fr\)/.test(css) && /@media \(max-width: 520px\)[\s\S]*#page5 \.fz-bref, #page5 \.fz-kpi \{ grid-template-columns: 1fr 1fr;/.test(css), '4 tuiles, téléphone 2');
  const cut = (s, a, z) => { const i = s.indexOf(a), j = s.indexOf(z, i); return i >= 0 && j > i ? s.slice(i, j) : ''; };
  const rendus = cut(FISC08, 'const _FZ_PANELS', 'function renderOpenPnlBanner') + cut(FISC08, 'function renderFiscalGlobal', 'function saveFeeSettings') + cut(S16B, 'function _fiscRenderPage', 'function _fiscToggleAll');
  assert.ok(rendus.length > 1000 && !/font-size:\s*([0-9]|10)(\.\d+)?px/.test(rendus), 'plus de taille < 11 px écrite en dur dans les rendus de l\'écran');
});

T('F10 tuiles : ⚖ « 0,00 € » et « 33 % · spéculatif » ; 💸 « −$59,17 » et le net ; 💱 3 paires, la plus coûteuse ETH ; 🧰 5 exports et la région', () => {
  const W = monde(); W.run('_fzBref()');
  const v = id => txt(W.els['fzV_' + id].innerHTML).trim(), s = id => txt(W.els['fzS_' + id].innerHTML).trim();
  assert.ok(/^0,00 €$/.test(v('tax').replace(/ | /g, ' ')) && /33 % · spéculatif · dépôt \$0,00/.test(s('tax')), v('tax') + ' / ' + s('tax'));
  assert.ok(v('global') === '−$59,17' && /375 trades · net −\$80,20/.test(s('global')), v('global') + ' / ' + s('global'));
  assert.ok(v('pairs') === '3' && /la plus coûteuse : ETH −\$13,69/.test(s('pairs')), v('pairs') + ' / ' + s('pairs'));
  assert.ok(v('outils') === '5 exports' && /Belgique · commune 0 %/.test(s('outils')), s('outils'));
  const n = W.els.fzV_global.nbSet; W.run('_fzBref(); _fzBref()'); assert.strictEqual(W.els.fzV_global.nbSet, n, 'écrit seulement si le texte change');
  W.run('S.taxConfig.region = "FR"; _fzBref()');
  assert.ok(v('tax') === '—' && /région FR : aucun impôt provisionné/.test(s('tax')), 'hors Belgique : ' + v('tax') + ' / ' + s('tax'));
});

T('G ce que d\'autres lisent : [id^="ftab-"] actif (08 battement), goPage(5) → renderFiscal, #taxPanel, renderFiscalTax / saveFeeSettings / selectRegion / renderFiscalMini globales ; 16b _fiscRenderPage, _fiscHomeCard', () => {
  assert.ok(/id="ftab-tax"/.test(p5) && /class="[^"]*\bactive\b[^"]*" id="ftab-tax"/.test(p5), 'ftab-tax actif');
  assert.ok(/if\(idx === 5\) \{ setTimeout\(\(\)=>\{ renderFiscal\(\); \}, 30\); \}/.test(s02), '02 goPage(5)');
  assert.ok(/document\.querySelector\('\[id\^="ftab-"\]\.active'\)/.test(s08), '08 battement : la tuile active par son id');
  ['renderFiscal', 'switchFiscalTab', 'renderFiscalTax', 'saveFeeSettings', 'selectRegion', 'renderFiscalMini', 'renderFiscalGlobal', 'renderFiscalPairs', 'renderFiscalExport', 'renderFiscalSettings']
    .forEach(f => assert.ok(new RegExp('(^|\\n)function ' + f + '\\s*\\(').test(s08), f));
  ['_fiscRenderPage', '_fiscHomeCard', '_fiscResSub', '_fiscManNote', '_fiscUsd'].forEach(f => assert.ok(new RegExp('(^|\\n)function ' + f + '\\s*\\(').test(S16B), f));
  assert.ok(p5.includes('id="taxPanel"'));
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
process.exit(fail ? 1 : 0);
