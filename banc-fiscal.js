// banc-fiscal.js — [GO FISCAL · 07/10/2026] js/16-fiscal.js (registre fiscal belge), exécuté tel quel dans une vm.
//   A. FIDÉLITÉ : 49 scénarios (19 écrits à la main, une règle chacun ; 30 tirés au hasard sur 2026 → 2033, 1 592 événements)
//      rejoués par le module ; après CHAQUE événement : trading, dépôt, provision / dû / manque / clos / payé de chaque année,
//      reports — IDENTIQUES (à 1e-7) à la référence indépendante rejeu/fiscal_ref.py, écrite d'après rejeu/fiscal_spec.md
//      sans lire le module (banc-fixtures/fiscal-scenarios.json → fiscal-expected.json).
//   (js/16-fiscal.js = le calcul et le dépôt ; js/16b-fiscal-ecran.js = les écrans — chargés tous les deux dans la vm)
//   B. RÈGLES : classement d'un trade, gain en euros (LONG / SHORT, cours d'entrée et de sortie), année de Bruxelles.
//   C. FERMETURE RÉELLE : recordFees (02, texte réel) + registre — frais réglés une fois, impôt versé au dépôt une fois,
//      rien d'autre ne bouge ; le partage caisse / trading de closePosition prend le net après frais ET impôt réels.
//   D. LA DÉCISION N'EST PAS TOUCHÉE : detectFiscalRegime, fiscalBotAdvicePerPair, le cumul annuel qu'elles lisent et les
//      réserves anti-négatif sont octet pour octet ceux du commit 97d1095 ; recordFees nourrit toujours ce cumul.
//   E. ÉCRAN ET PERSISTANCE : onglet ⚖ Impôt par défaut, page rendue, fiche MAN, carte d'accueil, réglages sauvegardés.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = __dirname;
const SRC = fs.readFileSync(path.join(ROOT, 'js/16-fiscal.js'), 'utf8');
const SRCB = fs.readFileSync(path.join(ROOT, 'js/16b-fiscal-ecran.js'), 'utf8');
const S02 = fs.readFileSync(path.join(ROOT, 'js/02-state-init.js'), 'utf8');
let ok = 0, ko = 0;
const t = (name, cond, info) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { ko++; console.log('  ❌ ' + name + (info !== undefined ? ' — ' + info : '')); } };
const near = (a, b, e) => Math.abs(a - b) <= (e || 1e-7) * Math.max(1, Math.abs(b));

function makeCtx(mode) {
  const sb = { console, __clock: { t: Date.UTC(2026, 9, 7) }, Intl };
  sb.window = sb;
  sb.setInterval = () => 0; sb.clearInterval = () => {}; sb.setTimeout = () => 0;
  sb.nowStr = () => '00:00'; sb.showToast = () => {}; sb.saveState = () => {};
  vm.createContext(sb);
  vm.runInContext(
    'const __RealDate = Date;' +
    'Date = class extends __RealDate { constructor(...a) { if (a.length) super(...a); else super(__clock.t); } static now() { return __clock.t; } };' +
    'const S = { tradingMode: ' + JSON.stringify(mode || 'real') + ', usdEurRate: 0.9, _usdEurLastFetch: 1, botAutoMode: false, taxConfig: { region: "BE" },' +
    '  feeConfig: { makerRate: 0.001, takerRate: 0.001, fundingRate: 0.00005, slippage: 0.0003 }, chainLog: [], pairStates: {},' +
    '  walletStore: { sim: { tradingAccount: 0, fiscalReserveAccount: 0, fiscalReserveLog: [], openPositions: [] },' +
    '                 paperReal: { tradingAccount: 0, fiscalReserveAccount: 0, fiscalReserveLog: [], openPositions: [] },' +
    '                 real: { tradingAccount: 0, fiscalReserveAccount: 0, fiscalReserveLog: [], openPositions: [] } } };' +
    'function _walletKey(m) { var k = m || S.tradingMode; return (k === "paperReal" || k === "real") ? k : "sim"; }' +
    'function _walletFor(m) { return S.walletStore[_walletKey(m)]; }', sb);
  vm.runInContext(SRC, sb, { filename: 'js/16-fiscal.js' });
  vm.runInContext(SRCB, sb, { filename: 'js/16b-fiscal-ecran.js' });
  return sb;
}
const run = (sb, code) => vm.runInContext(code, sb);

(async () => {
  console.log('▶ A. Fidélité : 49 scénarios contre la référence indépendante (rejeu/fiscal_ref.py)');
  {
    const SC = JSON.parse(fs.readFileSync(path.join(ROOT, 'banc-fixtures/fiscal-scenarios.json'), 'utf8'));
    const EX = JSON.parse(fs.readFileSync(path.join(ROOT, 'banc-fixtures/fiscal-expected.json'), 'utf8'));
    let steps = 0, bad = 0, firstBad = '';
    SC.forEach((sc, si) => {
      const sb = makeCtx(sc.mode);
      sb.__sc = sc;
      run(sb, 'var __w = _walletFor(__sc.mode); __w.tradingAccount = __sc.start.trading; __w.fiscalReserveAccount = __sc.start.fiscal;' +
              'S.fiscalCfg = JSON.parse(JSON.stringify(__sc.cfg));');
      const exp = EX[si].steps;
      let scBad = 0;
      sc.events.forEach((ev, ei) => {
        sb.__ev = ev;
        if (ev.t) sb.__clock.t = ev.t;
        let moved = 0;
        if (ev.type === 'close') moved = run(sb, 'S.usdEurRate = __ev.fx; S.tradingMode = __sc.mode; _fiscOnClose(__ev.pos, __ev.pnlUsd, { tradingFee: __ev.tradingFee, slipFee: __ev.slipFee }, __ev.exitPx || 0).movedUsd');
        else if (ev.type === 'adjust') moved = run(sb, 'S.usdEurRate = __ev.fx; _fiscAdjust(__sc.mode, "banc")');
        else if (ev.type === 'cfg') moved = run(sb, 'S.usdEurRate = __ev.fx; var __c = _fiscCfg(); if (__ev.commune !== undefined) __c.commune = __ev.commune;' +
                                                    'if (__ev.ext) for (var __k in __ev.ext) __c.ext[__k] = __ev.ext[__k]; _fiscAdjust(__sc.mode, "banc")');
        else if (ev.type === 'trading') run(sb, '__w.tradingAccount = __ev.set');
        else if (ev.type === 'fiscal') run(sb, '__w.fiscalReserveAccount = __ev.set');
        else if (ev.type === 'pay') run(sb, '_fiscMarkPaid(__sc.mode, __ev.year)');
        const got = JSON.parse(run(sb, 'JSON.stringify((function(){ var L = __w.fiscal, y = {}; if (L) Object.keys(L.years).forEach(function(k){ var v = L.years[k];' +
          'y[k] = { prov: v.provUsd, due: v.dueEur, short: v.shortUsd, closed: v.closed, paid: v.paid }; });' +
          'return { trading: __w.tradingAccount, fiscal: __w.fiscalReserveAccount, years: y, carry: L ? { comp: L.carry.comp, specLoss: L.carry.specLoss.map(function(e){ return [e.y, e.eur]; }) } : { comp: 0, specLoss: [] } }; })())'));
        const e = exp[ei];
        const diffs = [];
        if (!near(moved || 0, e.moved)) diffs.push('moved ' + moved + ' ≠ ' + e.moved);
        if (!near(got.trading, e.trading)) diffs.push('trading ' + got.trading + ' ≠ ' + e.trading);
        if (!near(got.fiscal, e.fiscal)) diffs.push('dépôt ' + got.fiscal + ' ≠ ' + e.fiscal);
        const ky = Object.keys(e.years).sort().join(','), gy = Object.keys(got.years).sort().join(',');
        if (ky !== gy) diffs.push('années ' + gy + ' ≠ ' + ky);
        else Object.keys(e.years).forEach(k => {
          const a = got.years[k], b = e.years[k];
          ['prov', 'due', 'short'].forEach(f => { if (!near(a[f], b[f])) diffs.push(k + '.' + f + ' ' + a[f] + ' ≠ ' + b[f]); });
          ['closed', 'paid'].forEach(f => { if (!!a[f] !== !!b[f]) diffs.push(k + '.' + f); });
        });
        if (!near(got.carry.comp, e.carry.comp)) diffs.push('report ' + got.carry.comp + ' ≠ ' + e.carry.comp);
        if (got.carry.specLoss.length !== e.carry.specLoss.length || got.carry.specLoss.some((x, i) => x[0] !== e.carry.specLoss[i][0] || !near(x[1], e.carry.specLoss[i][1])))
          diffs.push('pertes reportées ' + JSON.stringify(got.carry.specLoss) + ' ≠ ' + JSON.stringify(e.carry.specLoss));
        steps++;
        if (diffs.length) { bad++; scBad++; if (!firstBad) firstBad = '#' + si + ' « ' + sc.name + ' » événement ' + ei + ' (' + ev.type + ') : ' + diffs.slice(0, 3).join(' ; '); }
      });
      if (si < 19) t('[' + si + '] ' + sc.name, scBad === 0, scBad + ' événement(s) divergent(s)');
    });
    t('30 scénarios tirés au hasard (2026 → 2033, AA / EV / RE, années vides, minuit du 31/12 à Bruxelles, manques, remises à zéro, payé)', bad === 0, firstBad);
    t('aucun événement divergent sur ' + steps + ' (après chaque événement : comptes, années, reports)', bad === 0 && steps > 1500, bad + ' / ' + steps);
  }

  console.log('▶ B. Règles : classement, gain en euros, année de Bruxelles');
  {
    const sb = makeCtx('real');
    const rg = (p) => JSON.parse(run(sb, 'JSON.stringify(_fiscRegimeOf(' + JSON.stringify(p) + '))'));
    t('MANU + LONG + sans emprunt → normal', rg({ auto: false, side: 'long', stakeUsdt: 50, levBorrowed: 0, totalExposure: 50 }).regime === 'normal');
    t('AUTO (bot) → spéculatif', rg({ auto: true, side: 'long', stakeUsdt: 50, levBorrowed: 0, totalExposure: 50 }).regime === 'spec');
    t('SHORT à la main → spéculatif (crypto empruntée)', rg({ auto: false, side: 'short', stakeUsdt: 50, levBorrowed: 0, totalExposure: 50 }).regime === 'spec');
    t('LONG à la main avec emprunt JIT (levBorrowed) → spéculatif', rg({ auto: false, side: 'long', stakeUsdt: 50, levBorrowed: 10, totalExposure: 50 }).regime === 'spec');
    t('LONG à la main, exposition > mise (levier ×2) → spéculatif, raison dite', (() => { const r = rg({ auto: false, side: 'long', stakeUsdt: 50, levBorrowed: 0, totalExposure: 100 }); return r.regime === 'spec' && /levier/.test(r.why.join()); })());
    const g = (side, N, p, s, fi, fo) => run(sb, '_fiscGainEur(' + [JSON.stringify(side), N, p, s, fi, fo].join(',') + ')');
    t('LONG : reçu (N + P − glissement) × cours sortie − N × cours entrée', near(g('long', 1000, 50, 1, 0.9, 0.85), 1049 * 0.85 - 900));
    t('SHORT : N × cours entrée − (N − P + glissement) × cours sortie', near(g('short', 1000, 50, 1, 0.9, 0.85), 900 - 951 * 0.85));
    t('même cours : gain = (P − glissement) × cours', near(g('long', 1000, 20, 0.6, 0.9, 0.9), 19.4 * 0.9));
    const yr = (iso) => run(sb, '_fiscYearOf(' + Date.parse(iso) + ')');
    t('31/12/2026 23:30 à Bruxelles → 2026', yr('2026-12-31T22:30:00Z') === 2026);
    t('01/01/2027 00:30 à Bruxelles (encore 2026 en UTC) → 2027', yr('2026-12-31T23:30:00Z') === 2027);
    t('exonération 2026 : 10 000 € + report ≤ 5 000 € ; années sans table → montants 2026, signalés', (() => { const a = JSON.parse(run(sb, 'JSON.stringify([_fiscAmounts(2026), _fiscAmounts(2029)])')); return a[0].base === 10000 && a[0].compCap === 5000 && !a[0].pending && a[1].pending && a[1].base === 10000; })());
    t('perte AURA qui baisse l\'impôt hors AURA : part d\'AURA = 0, économie dite (RE)', (() => {
      const d = JSON.parse(run(sb, 'var __y = _fiscNewYear(2026, null); __y.normal.loss = 1800; JSON.stringify(_fiscDue(__y, { commune: 0, ext: { 2026: 12000 } }, true))'));
      return d.taxN === 0 && near(d.extSaving, 180);
    })());
    t('33 % + additionnels communaux 7,5 % = 35,475 %', near(JSON.parse(run(sb, 'JSON.stringify(_fiscDue(_fiscNewYear(2026, null), { commune: 7.5, ext: {} }, false))')).rateS, 0.33 * 1.075));
  }

  console.log('▶ B2. Cours €, région, réévaluation');
  {
    const sb = makeCtx('real');
    sb.__clock.t = Date.parse('2026-10-07T10:00:00Z');
    run(sb, 'S.walletStore.real.tradingAccount = 1000;');
    const P = (side, auto, fxIn) => JSON.stringify({ pair: 'BTC/USDT', side, auto, stakeUsdt: 100, levBorrowed: 0, totalExposure: 100, entryPrice: 60000, _fxIn: fxIn });
    run(sb, 'S.usdEurRate = 0.86; _fiscOnClose(' + P('long', true, 0.86) + ', 30, { tradingFee: 0.2, slipFee: 0.06 }, 0)');
    const prov1 = run(sb, 'S.walletStore.real.fiscal.years[2026].provUsd');
    // relance : 0,92 par défaut, aucun cours reçu → le registre garde le dernier cours reçu (0,86), signalé
    run(sb, 'S.usdEurRate = 0.92; S._usdEurLastFetch = 0;');
    const fx = JSON.parse(run(sb, 'JSON.stringify(_fiscFx())'));
    t('relance sans cours reçu : le 0,92 par défaut n\'est pas pris pour un cours — dernier cours reçu 0,86, signalé', fx.r === 0.86 && fx.fallback === true);
    const r2 = JSON.parse(run(sb, 'JSON.stringify(_fiscOnClose(' + P('long', true, 0.86) + ', -0.5, { tradingFee: 0.2, slipFee: 0.06 }, 0))'));
    t('une perte de −0,5 $ fermée juste après la relance reste une perte en € (pas +2,5 € de gain fantôme)', r2.gainEur < 0, r2.gainEur);
    t('… et l\'historique la marque « cours € de repli »', run(sb, 'S.walletStore.real.fiscal.hist[0].ff') === 1);
    run(sb, 'S.usdEurRate = 0.88; S._usdEurLastFetch = 1;');
    const before = run(sb, 'S.walletStore.real.fiscal.years[2026].provUsd');
    const r3 = JSON.parse(run(sb, 'JSON.stringify(_fiscOnClose(' + P('long', true, 0.88) + ', 0.5, { tradingFee: 0.2, slipFee: 0.06 }, 0))'));
    const after = run(sb, 'S.walletStore.real.fiscal.years[2026].provUsd');
    t('cours 0,86 → 0,88 puis un gain de 0,5 $ : la réévaluation n\'est pas imputée au trade (sa part = 33 % × son gain net seulement)', near(r3.movedUsd, 0.33 * ((0.5 - 0.06) * 0.88 - 0.2 * 0.88) / 0.88) && Math.abs((after - before) - r3.movedUsd) > 1e-6, r3.movedUsd + ' / ' + (after - before));
    t('journal : la réévaluation est un « réajustement » (cours €), pas un impôt du trade', JSON.parse(run(sb, 'JSON.stringify(S.walletStore.real.fiscalReserveLog.slice(0, 3).map(function(e){ return e.source + ":" + (e.why || e.pair); }))')).some(x => /^tax_adjust:cours/.test(x)));
    t('historique compact : pas de texte stocké, raison reconstruite', run(sb, '"w" in S.walletStore.real.fiscal.hist[0]') === false && /AUTO \(bot\)/.test(run(sb, '_fiscWhy(S.walletStore.real.fiscal.hist[0])')));
    // autre région : le registre ne bouge pas d'argent
    run(sb, 'S.taxConfig.region = "FR"; S.usdEurRate = 0.80;');
    const tr0 = run(sb, 'S.walletStore.real.tradingAccount');
    const mv = run(sb, '_fiscAdjustAll("banc")');
    t('région ≠ BE : la passe du bot fiscal ne déplace rien', mv === 0 && run(sb, 'S.walletStore.real.tradingAccount') === tr0);
    t('provision du premier trade = 33 % × (gain au prix exécuté − frais)', near(prov1, 0.33 * ((30 - 0.06) * 0.86 - 0.2 * 0.86) / 0.86));
  }

  console.log('▶ C. Fermeture réelle : recordFees (02, texte réel) + registre');
  {
    const grab = (name) => { const i = S02.indexOf('function ' + name + '('); const j = S02.indexOf('\n}\n', i); return S02.slice(i, j + 2); };
    const sb = makeCtx('paperReal');
    run(sb, 'var PAIRS = { "BTC/USDT": { sym: "BTC" } }; var __saved = []; function saveFeeRecord(r) { __saved.push(r); }' +
            'function _computePortfolio() { return (S.walletStore.paperReal.cashAccount || 0) + S.walletStore.paperReal.tradingAccount; }' +
            'var __addNet = []; function addAnnualNetRealised(x) { __addNet.push(x); }' +
            'S.fees = { totalTradingFees: 0, totalSlippage: 0, totalGross: 0, totalTaxProvision: 0, totalPnlGross: 0, totalPnlNet: 0, tradeCount: 0, feeReserveAccount: 0, feeLog: [], byPair: {} };' +
            'S.antiNegReserve = 0; S.antiNegReserveLog = [];');
    // accesseurs comme 02 : S.tradingAccount / S.fiscalReserveAccount = portefeuille du mode actif
    run(sb, '["tradingAccount","fiscalReserveAccount","fiscalReserveLog","cashAccount","antiNegReserve"].forEach(function(f){ var w = S.walletStore.paperReal; if (f === "antiNegReserve") w[f] = 0;' +
            ' Object.defineProperty(S, f, { configurable: true, get: function(){ return _walletFor()[f]; }, set: function(v){ _walletFor()[f] = v; } }); });' +
            'S.walletStore.paperReal.tradingAccount = 1000; S.walletStore.paperReal.cashAccount = 0; S.walletStore.paperReal.antiNegReserve = 0.26;');
    run(sb, grab('releaseTradeReserve'));
    run(sb, grab('recordFees'));
    sb.__clock.t = Date.parse('2026-10-07T10:00:00Z');
    // trade 1 : bot, LONG, +20 $ sur 100 $ (réserve de frais 0,26 $ posée à l'ouverture) → spéculatif 33 %
    const r1 = JSON.parse(run(sb, 'JSON.stringify(recordFees("BTC/USDT", 100, 20, "taker", 0.26, { pair: "BTC/USDT", side: "long", auto: true, stakeUsdt: 100, levBorrowed: 0, totalExposure: 100, entryPrice: 60000, _fxIn: 0.9, entryTs: __clock.t - 600000 }, 61200))'));
    const w1 = JSON.parse(run(sb, 'JSON.stringify(S.walletStore.paperReal)'));
    const fee = 100 * 0.001 * 2, slip = 100 * 0.0003 * 2;
    const taxE = 0.33 * ((20 - slip) * 0.9 - fee * 0.9);
    t('frais : 0,26 $ réglés par la réserve posée à l\'ouverture, aucun manque sur le trading', near(r1.totalFee, 0.26) && near(r1.feeShortfall, 0) && near(w1.antiNegReserve, 0));
    t('impôt spéculatif 33 % × (gain au prix exécuté − frais) = ' + taxE.toFixed(4) + ' € → ' + (taxE / 0.9).toFixed(4) + ' $ au dépôt', near(r1.taxAmount, taxE / 0.9) && near(w1.fiscalReserveAccount, taxE / 0.9));
    t('trading = avant − impôt, une seule fois (le P&L est crédité par closePosition, pas ici)', near(w1.tradingAccount, 1000 - taxE / 0.9));
    t('journal du dépôt : « tax_trade_close » BTC/USDT, régime spéculatif', w1.fiscalReserveLog[0] && w1.fiscalReserveLog[0].source === 'tax_trade_close' && w1.fiscalReserveLog[0].regime === 'spec');
    t('plus de détour par la réserve anti-négatif (antiNegTaxPart) pour l\'impôt', !w1.antiNegTaxPart && JSON.parse(run(sb, 'JSON.stringify(S.antiNegReserveLog)')).every(e => e.source !== 'tax_provision_session'));
    t('le cumul de l\'estimateur de la décision reçoit toujours pnl − frais (20 − 0,26)', near(JSON.parse(run(sb, 'JSON.stringify(__addNet)'))[0], 19.74));
    t('feeLog : taxAmount = mouvement du dépôt, régime noté, holdMs / ts / notional inchangés', (() => { const e = JSON.parse(run(sb, 'JSON.stringify(S.fees.feeLog[0])')); return near(e.taxAmount, taxE / 0.9) && e.regime === 'spec' && e.notional === 100 && typeof e.ts === 'number'; })());
    // trade 2 : bot, perte −30 $ sans réserve → la perte du même régime rend l'impôt
    const before2 = JSON.parse(run(sb, 'JSON.stringify(S.walletStore.paperReal)'));
    const r2 = JSON.parse(run(sb, 'JSON.stringify(recordFees("BTC/USDT", 100, -30, "taker", 0, { pair: "BTC/USDT", side: "long", auto: true, stakeUsdt: 100, levBorrowed: 0, totalExposure: 100, entryPrice: 61000, _fxIn: 0.9, entryTs: __clock.t - 600000 }, 59170))'));
    const w2 = JSON.parse(run(sb, 'JSON.stringify(S.walletStore.paperReal)'));
    t('perte spéculative : impôt de l\'année rendu au trading (dépôt → 0), frais sur le trading', near(r2.taxAmount, -taxE / 0.9) && near(w2.fiscalReserveAccount, 0) && near(w2.tradingAccount, before2.tradingAccount - r2.feeShortfall + taxE / 0.9));
    // trade 3 : MANU LONG sans levier, +50 $ → normal, sous l'exonération : 0
    const r3 = JSON.parse(run(sb, 'JSON.stringify(recordFees("BTC/USDT", 100, 50, "taker", 0, { pair: "BTC/USDT", side: "long", auto: false, stakeUsdt: 100, levBorrowed: 0, totalExposure: 100, entryPrice: 60000, _fxIn: 0.9 }, 63000))'));
    t('MANU LONG sans levier : régime normal, sous les 10 000 € → 0 au dépôt', r3.fisc.regime === 'normal' && near(r3.taxAmount, 0));
    const L = JSON.parse(run(sb, 'JSON.stringify(S.walletStore.paperReal.fiscal)'));
    t('registre EV : 3 trades 2026 (2 spéculatifs, 1 normal), historique et paire tenus', L.years['2026'].n === 3 && L.years['2026'].nS === 2 && L.years['2026'].nN === 1 && L.hist.length === 3 && L.years['2026'].pairs['BTC/USDT'].n === 3);
    t('le registre est celui du mode de la position (EV), RE et AA intacts', !JSON.parse(run(sb, 'JSON.stringify(S.walletStore.real)')).fiscal && !JSON.parse(run(sb, 'JSON.stringify(S.walletStore.sim)')).fiscal);
    // région autre que BE : aucune provision
    run(sb, 'S.taxConfig.region = "FR"');
    const r4 = JSON.parse(run(sb, 'JSON.stringify(recordFees("BTC/USDT", 100, 500, "taker", 0, { pair: "BTC/USDT", side: "long", auto: true, stakeUsdt: 100, levBorrowed: 0, totalExposure: 100, entryPrice: 60000 }, 90000))'));
    t('région ≠ BE : aucun impôt provisionné (la page le dit)', r4.taxAmount === 0 && !r4.fisc);
    // closePosition : le partage prend le net réel
    const cp = S02.slice(S02.indexOf('function closePosition('), S02.indexOf('\n}\n', S02.indexOf('function closePosition(')));
    t('closePosition : P&L crédité au trading, PUIS recordFees(…, pos, cur), PUIS la caisse prend sa part du net réel', /S\.tradingAccount = Math\.max\(0, S\.tradingAccount \+ netPnl\);[\s\S]{0,700}const _rf = recordFees\(pos\.pair, pos\.stakeUsdt, realisedUsd, exitType, pos\._reservedAmount, pos, cur\)[\s\S]{0,300}_trulyNet = Math\.max\(0, netPnl - \(Number\(_rf\.totalFee\) \|\| 0\) - _taxAmount\)/.test(cp));
    t('closePosition : plus d\'estimation de frais de sortie ni d\'impôt déduite avant recordFees (double débit retiré)', !/_exitFee/.test(cp) && !/_computeMarginalTax/.test(cp) && (cp.match(/recordFees\(/g) || []).length === 1);
    t('_computeMarginalTax retirée de tout le code (plus aucun lecteur)', !fs.readdirSync(path.join(ROOT, 'js')).some(f => /\.js$/.test(f) && fs.readFileSync(path.join(ROOT, 'js', f), 'utf8').split('\n').some(l => !/^\s*\/\//.test(l) && /_computeMarginalTax\s*\(/.test(l))));
  }

  console.log('▶ D. La décision n\'est pas touchée (texte identique au commit 97d1095)');
  {
    const H = { detectFiscalRegime: '5fc1bef8068f4ba1', fiscalBotAdvicePerPair: '65e61f058d61bb1e', getAnnualNetRealised: '39e449646ee35923',
                addAnnualNetRealised: 'f3a62e03c4119cee', _fiscalYearKey: '97c485441b02837d', estimateTradeReserve: '401d7c60b6941022',
                releaseTradeReserve: '5b861a59ead70c85', holdTradeReserve: '44b0edc14fe506b3', validateAntiNegative: '2aa7c47155f4d4e3' };
    const grab = (name) => { const i = S02.indexOf('function ' + name + '('); const j = S02.indexOf('\n}\n', i); return S02.slice(i, j + 2); };
    Object.keys(H).forEach(n => t(n + ' (02) inchangée', crypto.createHash('sha256').update(grab(n)).digest('hex').slice(0, 16) === H[n]));
    const s10f = fs.readFileSync(path.join(ROOT, 'js/10f-resolveur-cycle.js'), 'utf8'), s10 = fs.readFileSync(path.join(ROOT, 'js/10-fin-bloc-restauration-v93.js'), 'utf8');
    t('10f et 10 : la porte d\'ouverture lit toujours detectFiscalRegime + fiscalBotAdvicePerPair', [s10f, s10].every(s => /const _frBE = \(typeof detectFiscalRegime === 'function'\)/.test(s) && /fiscalBotAdvicePerPair\(pair, _tpGuess\)/.test(s)));
    const code16 = (SRC + '\n' + SRCB).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    for (const f of ['openPosition(', 'closePosition(', 'autoOpenPosition', 'S.agents', 'fitness', 'dcThreshold', 'detectFiscalRegime', 'fiscalBotAdvicePerPair', 'pendingActions'])
      t('16 : aucun « ' + f + ' »', !code16.includes(f));
    const s03 = fs.readFileSync(path.join(ROOT, 'js/03-per-pair-position-buttons-controls-buid.js'), 'utf8');
    const bf = s03.slice(s03.indexOf('function botFiscal() {'), s03.indexOf('\n}\n', s03.indexOf('function botFiscal() {')));
    t('bot fiscal : analyse et statut seulement — aucune proposition, aucun pari de mérite, aucune contribution, statut « idle » comme avant', !/pendingActions\.unshift|_botPredict|contributions\+\+|'active'/.test(bf) && /_fiscHarvest\(_mode\)/.test(bf));
    const th = S02.slice(S02.indexOf('function computeTradingHealth() {'), S02.indexOf('\n}\n', S02.indexOf('function computeTradingHealth() {')));
    t('santé du trading : en Belgique l\'impôt (au dépôt) n\'est pas une dette → pas d\'appel de marge sur un écart de cours €', /if \(S\.taxConfig && S\.taxConfig\.region === 'BE'\) \{ \/\* taxDue reste 0 \*\/ \}/.test(th));
    const s9b2 = fs.readFileSync(path.join(ROOT, 'js/09b2-save-load.js'), 'utf8');
    t('purge : le journal du dépôt (écrit en tête) garde ses 50 plus RÉCENTS dans les trois modes', /_wf\.fiscalReserveLog = _wf\.fiscalReserveLog\.slice\(0, 50\)/.test(s9b2) && !/cutEnd\(S\.fiscalReserveLog/.test(s9b2));
    t('base IndexedDB des frais : chaque fermeture garde mode, régime et gain € (historique sans limite)', /mode: S\.tradingMode, regime: fisc \? fisc\.regime : null, gainEur: fisc \? fisc\.gainEur : null/.test(S02));
    t('cours d\'entrée posé seulement si un cours a été reçu (02 et 09c)', [S02, fs.readFileSync(path.join(ROOT, 'js/09c-auto-open.js'), 'utf8')].every(x => x.includes("_fxIn:") && x.includes("(Number(S._usdEurLastFetch) > 0 && Number(S.usdEurRate) > 0) ? Number(S.usdEurRate) : null")));
    t('16 n\'écrit que le registre, le trading, le dépôt, son journal et ses réglages', !/\bS\.(?!fiscalCfg\b)\w+\s*=[^=]/.test(code16) && !/\bw\.(?!fiscal\b|tradingAccount\b|fiscalReserveAccount\b|fiscalReserveLog\b)\w+\s*=[^=]/.test(code16));
  }

  console.log('▶ E. Écran et persistance');
  {
    const html = fs.readFileSync(path.join(ROOT, 'AURA8_v118.html'), 'utf8');
    const b1 = fs.readFileSync(path.join(ROOT, 'js/09b1-build-snapshot.js'), 'utf8'), b2 = fs.readFileSync(path.join(ROOT, 'js/09b2-save-load.js'), 'utf8');
    const i15 = html.indexOf('src="js/15-voix-tendance.js'), i16 = html.indexOf('src="js/16-fiscal.js');
    t('HTML : js/16-fiscal.js chargé une fois, après 15', i16 > i15 && i15 > 0 && html.split('src="js/16-fiscal.js').length === 2);
    const i16b = html.indexOf('src="js/16b-fiscal-ecran.js');
    t('HTML : js/16b-fiscal-ecran.js chargé une fois, juste après 16 ; chaque fichier ≤ 500 lignes', i16b > i16 && html.split('src="js/16b-fiscal-ecran.js').length === 2 && SRC.split('\n').length <= 500 && SRCB.split('\n').length <= 500);
    t('HTML : onglet ⚖ Impôt actif par défaut, son panneau visible, « Frais » masqué', /class="agent-tab active" id="ftab-tax"/.test(html) && /<div id="fpanel-tax">/.test(html) && /<div id="fpanel-global" style="display:none;">/.test(html));
    t('buildSnapshot (09b1) : fiscalCfg ; registres dans walletStore', /\bfiscalCfg: S\.fiscalCfg \|\| null,/.test(b1) && /walletStore:\s+S\.walletStore,/.test(b1));
    t('applySnap (09b2) : S.fiscalCfg = snap.fiscalCfg ; manifeste', /if \(snap\.fiscalCfg && typeof snap\.fiscalCfg === 'object'\)\s+S\.fiscalCfg\s+= snap\.fiscalCfg;/.test(b2) && /window\._APPLYSNAP_MANIFEST = \[[^\]]*'fiscalCfg'/.test(b2));
    const s10h = fs.readFileSync(path.join(ROOT, 'js/10h-pont-fullpower-bricks.js'), 'utf8'), s09k = fs.readFileSync(path.join(ROOT, 'js/09k-init.js'), 'utf8');
    t('fiche MAN vivante (10h openManDetail) : section « Régime fiscal »', /fiscSection\.innerHTML = _fiscManNote\(pair, manualPos\)/.test(s10h));
    t('carte d\'accueil « Régime fiscal » : la règle du registre (_fiscHomeCard), plus detectFiscalRegime', /_fiscHomeCard\(\)/.test(s09k) && !s09k.split('\n').some(l => !/^\s*\/\//.test(l) && /detectFiscalRegime/.test(l)));
    // rendu de la page sur un registre rempli
    const sb = makeCtx('real');
    sb.__clock.t = Date.parse('2026-10-07T10:00:00Z');
    run(sb, 'S.walletStore.real.tradingAccount = 500; S.fiscalCfg = { commune: 7, ext: { 2026: 0 } };' +
            '_fiscOnClose({ pair: "ETH/USDT", side: "long", auto: false, stakeUsdt: 200, levBorrowed: 0, totalExposure: 200, entryPrice: 2500, _fxIn: 0.9 }, 30, { tradingFee: 0.4, slipFee: 0.12 }, 2875);' +
            '_fiscOnClose({ pair: "SOL/USDT", side: "short", auto: true, stakeUsdt: 100, levBorrowed: 0, totalExposure: 100, entryPrice: 150, _fxIn: 0.9 }, 12, { tradingFee: 0.2, slipFee: 0.06 }, 132);' +
            'var __el = { innerHTML: "", childElementCount: 0, contains: function(){ return false; } };' +
            'var document = { activeElement: null, getElementById: function(){ return null; } };' +
            '_fiscRenderPage(__el); __el.childElementCount = 1;');
    const page = run(sb, '__el.innerHTML');
    ['Registre 2026', 'Dépôt fiscal', 'Impôt dû 2026', 'Régime en cours', 'Normal · 10 %', 'Spéculatif · 35,3 %', 'Bot fiscal', 'Par crypto', 'ETH/USDT', 'SOL/USDT', 'Historique 2026 · 2 trades', '👤 MAN', '🤖 AUTO', 'Réglages fiscaux', 'La loi appliquée', 'argent réel — dû au fisc']
      .forEach(x => t('page ⚖ Impôt : « ' + x + ' »', page.includes(x)));
    t('page : rien de « NaN » ni « undefined »', !/NaN|undefined/.test(page));
    run(sb, '__el.innerHTML = "x"; _fiscRenderPage(__el);');
    t('page : pas reconstruite si rien n\'a changé (anti-clignotement)', run(sb, '__el.innerHTML') === 'x');
    const card = JSON.parse(run(sb, 'JSON.stringify(_fiscHomeCard())'));
    t('carte d\'accueil en MANU : « 10 % », exonération restante dite', card.val === '10 %' && /exonération restante/.test(card.sub));
    run(sb, 'S.botAutoMode = true');
    const card2 = JSON.parse(run(sb, 'JSON.stringify(_fiscHomeCard())'));
    t('carte d\'accueil en AUTO : « 35,3 % » (33 % + commune 7 %), spéculatif', card2.val === '35,3 %' && /Spéculatif/.test(card2.sub));
    const man = run(sb, '_fiscManNote("BTC/USDT", null)');
    t('fiche MAN : LONG ×1 → normal 10 % ; SHORT ou levier → spéculatif', /LONG, levier ×1 → normal 10 %/.test(man) && /SHORT ou levier &gt; 1 → spéculatif/.test(man));
    const ins = JSON.parse(run(sb, 'JSON.stringify(_fiscInsights("real"))')).map(x => x[1]).join(' | ');
    t('bot fiscal : exonération restante, coût de la spéculation, jours avant clôture', /Reste .* ne coûte rien/.test(ins) && /En MANU LONG sans levier/.test(ins) && /avant la clôture 2026/.test(ins));
    t('bot fiscal (RE) : pas d\'avertissement « simulation »', !/simulé/.test(ins));
  }

  console.log('\n' + (ko ? '❌ ' : '✅ ') + ok + '/' + (ok + ko) + ' tests passés');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('❌ exception : ' + (e && e.stack || e)); process.exit(1); });
