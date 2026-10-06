// banc-voix-tendance.js — [VOIX TENDANCE LONGUE · 07/10/2026] js/15-voix-tendance.js, exécuté tel quel dans une vm.
//   A. FIDÉLITÉ : BTC et ETH, 418 lundis (10/2018 → 09/2026), prix des archives Binance 1 h — la poche de l'app doit prendre
//      LES MÊMES décisions et fermer LES MÊMES trades, au même prix et au même résultat net, que la référence indépendante
//      rejeu/voix_tendance_ref.py (fixture banc-fixtures/voix-tendance-btc-eth.json, construite depuis la table de la porte).
//   B. CAS LIMITES : EV en pause, prix de repli (bougie 00:00 absente), données absentes, panne réseau + nouvel essai, liquidation
//      d'un SHORT (prix en direct, puis heures de sommeil), signal nul, paire retirée, barème lu dans S.feeConfig.
//   C. PAS D'INTERFÉRENCE : rien d'autre que S.tendance et le journal ne bouge ; le module n'appelle aucun ouvreur / fermeur de l'app.
//   D. PERSISTANCE : tendance dans buildSnapshot (09b1), applySnap (09b2) et _APPLYSNAP_MANIFEST ; barre et script dans le HTML.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = __dirname;
const SRC = fs.readFileSync(path.join(ROOT, 'js/15-voix-tendance.js'), 'utf8');
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'banc-fixtures/voix-tendance-btc-eth.json'), 'utf8'));
const DAY = 86400000, H = 3600000, WEEK = 7 * DAY;
let ok = 0, ko = 0;
const t = (name, cond, info) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { ko++; console.log('  ❌ ' + name + (info !== undefined ? ' — ' + info : '')); } };

function makeCtx(o) {
  const sb = { console, __clock: { t: o.t0 || 0 }, __px: {}, __ev: { running: true }, __net: { fail: {}, calls: [] }, __kl: o.kl || {}, __hi: o.hi || {} };
  sb.window = sb;
  sb.setInterval = () => 0; sb.clearInterval = () => {}; sb.setTimeout = () => 0;
  sb.fetch = (url) => {
    sb.__net.calls.push(url);
    const q = Object.fromEntries(new URL(url).searchParams);
    const sy = q.symbol;
    if (sb.__net.fail[sy]) return Promise.reject(new Error('réseau coupé (banc)'));
    if (sb.__hold) { const hold = sb.__hold; return hold.then(() => sb.fetch(url)); }   // réponse retenue (banc : réseau qui traîne)
    const res = (body, st) => Promise.resolve({ ok: (st || 200) < 400, status: st || 200, json: () => Promise.resolve(body) });
    if (url.includes('ticker/price')) { const p = sb.__px[sy]; return res(p ? { symbol: sy, price: String(p.px) } : {}, p ? 200 : 400); }
    const K = sb.__kl[sy] || {};                       // { ts : [o, h, l, c] } bougies 1 h
    const keys = Object.keys(K).map(Number).sort((a, b) => a - b);
    const row = (ts) => [ts, String(K[ts][0]), String(K[ts][1]), String(K[ts][2]), String(K[ts][3]), '0', ts + H - 1];
    const now = sb.__clock.t;
    if (q.limit === '1' && q.startTime) { const k = keys.find(x => x >= Number(q.startTime) && x <= now); return res(k !== undefined ? [row(k)] : []); }
    if (q.limit === '1' && q.endTime) { const c = keys.filter(x => x <= Number(q.endTime)); return res(c.length ? [row(c[c.length - 1])] : []); }
    if (q.limit === '1000') {                          // contrôle de liquidation : heures ouvertes depuis startTime, jusqu'à maintenant
      const hs = Object.keys(sb.__hi[sy] || {}).map(Number).filter(x => x >= Number(q.startTime) && x <= now).sort((a, b) => a - b).slice(0, 1000);
      return res(hs.map(x => [x, '1', String(sb.__hi[sy][x]), '1', '1', '0', x + H - 1]));
    }
    return res([], 400);
  };
  sb._isModeRunning = (m) => m === 'paperReal' && !!sb.__ev.running;
  sb._rcPriceAge = (p) => sb.__px[p.replace('/', '')] ? sb.__clock.t - sb.__px[p.replace('/', '')].ts : Infinity;
  sb._rcLastPrice = (p) => sb.__px[p.replace('/', '')] ? sb.__px[p.replace('/', '')].px : 0;
  sb.rndHash = () => 'h'; sb.nowStr = () => '00:00';
  sb._walletFor = () => sb.__wallet; sb._computePortfolio = (w) => (w.cashAccount || 0) + (w.tradingAccount || 0);
  vm.createContext(sb);
  vm.runInContext('Date.now = function () { return __clock.t; };' +
    'const CG_FIAT = { EUR: "eur", GBP: "gbp" };' +
    'const S = ' + JSON.stringify(o.S) + ';' +
    'var __wallet = { cashAccount: 40, tradingAccount: 77, openPositions: [] }; window.__wallet = __wallet;' +
    'window._stateReady = true;', sb);
  vm.runInContext(SRC, sb, { filename: 'js/15-voix-tendance.js' });
  return sb;
}
const baseS = (pairs) => ({ feeConfig: { makerRate: 0.001, takerRate: 0.001, fundingRate: 0.00005, slippage: 0.0003 },
  paperRealActivePairs: pairs, chainLog: [], openPositions: [{ id: 'sentinelle', pair: 'BTC/USDT', side: 'long', stakeUsdt: 5 }],
  walletStore: { paperReal: { tradingAccount: 77, cashAccount: 40 } }, tradingAccount: 77, cashAccount: 40, agents: [{ id: 1, fitness: 900 }] });
const run = (sb, code) => vm.runInContext(code, sb);
const tick = (sb) => run(sb, 'window._tl.tick()');

(async () => {
  console.log('▶ A. Fidélité à la référence indépendante (BTC + ETH, 418 lundis, archives Binance)');
  {
    const kl = {};
    for (const p of ['BTC', 'ETH']) { kl[p + 'USDT'] = {}; for (const [ts, v] of Object.entries(FX.prices[p])) kl[p + 'USDT'][ts] = [v, v, v, v]; }
    const sb = makeCtx({ S: baseS({ 'BTC/USDT': true, 'ETH/USDT': true, 'EUR/USDT': true }), kl, t0: FX.mondays[0] });
    const before = JSON.stringify(run(sb, '({ o: S.openPositions, w: S.walletStore, ta: S.tradingAccount, c: S.cashAccount, a: S.agents, f: S.feeConfig })'));
    let sigKO = 0, sigN = 0, firstBad = null;
    for (let i = 0; i < FX.mondays.length; i++) {
      const w = FX.mondays[i];
      sb.__clock.t = w + 30000;
      for (const p of ['BTC', 'ETH']) { const v = FX.prices[p][String(w)]; if (v) sb.__px[p + 'USDT'] = { px: v, ts: sb.__clock.t }; else delete sb.__px[p + 'USDT']; }
      await tick(sb);
      for (const p of ['BTC', 'ETH']) {
        const want = FX.signals[p][i], d = run(sb, 'S.tendance.dec["' + p + '/USDT"]');
        sigN++;
        const got = (d && d.w === w) ? d.s : undefined;
        if (!(got === want || (want === null && got === null))) { sigKO++; if (!firstBad) firstBad = p + ' ' + new Date(w).toISOString().slice(0, 10) + ' attendu ' + want + ' obtenu ' + got; }
      }
    }
    t('décision du lundi identique à la porte : ' + (sigN - sigKO) + '/' + sigN, sigKO === 0, firstBad);
    const hist = run(sb, 'S.tendance.hist'), exp = FX.trades;
    t('même nombre de trades fermés : ' + hist.length + ' / ' + exp.length, hist.length === exp.length);
    let bad = 0, firstT = null, sum = 0, sumE = 0;
    const byKey = new Map(exp.map(x => [x.p + '/USDT|' + x.w0, x]));
    for (const h of hist) {
      const e = byKey.get(h.p + '|' + h.w0);
      const okT = e && h.s === e.s && h.x0 === e.x0 && h.x1 === e.x1 && Math.abs(h.net - e.net) < 1e-12 && h.t1 >= e.t1 && h.t1 - e.t1 <= 60000;
      if (!okT) { bad++; if (!firstT) firstT = JSON.stringify({ h, e }); }
      sum += h.net; if (e) sumE += e.net;
    }
    t('chaque trade : même sens, même lundi, même prix d\'entrée et de sortie, même net (à 1e-12)', bad === 0, firstT);
    t('somme des nets identique : ' + (sum * 100).toFixed(4) + ' % / ' + (sumE * 100).toFixed(4) + ' %', Math.abs(sum - sumE) < 1e-9);
    const tot = run(sb, 'S.tendance.tot'), pos = run(sb, 'S.tendance.pos');
    t('cumul de la poche = somme des nets / 2 paires (mise 1/2 non composée) et jamais tronqué', Math.abs(tot.net - sum / 2) < 1e-9 && tot.n === hist.length);
    const openOK = ['BTC', 'ETH'].every(p => { const e = FX.open[p], g = pos[p + '/USDT']; return (!e && !g) || (e && g && g.x0 === e[1] && (g.side === 'long' ? 1 : -1) === e[0]); });
    t('positions encore tenues à la fin = référence', openOK, JSON.stringify(pos));
    t('le coût d\'un trade = 2 × (taker + glissement) de S.feeConfig = 0,26 %', hist.every(h => Math.abs(h.c - 0.0026) < 1e-15));
    t('EUR/USDT (fiat de 02) hors de la voix', !run(sb, 'S.tendance.dec["EUR/USDT"]') && run(sb, 'window._tl.universe().join()') === 'BTC/USDT,ETH/USDT');
    const after = JSON.stringify(run(sb, '({ o: S.openPositions, w: S.walletStore, ta: S.tradingAccount, c: S.cashAccount, a: S.agents, f: S.feeConfig })'));
    t('8 ans de décisions : positions de l\'app, comptes, agents, barème INCHANGÉS', before === after);
    const keys = run(sb, 'Object.keys(S).sort().join()');
    t('seules clés de S touchées : tendance (+ journal)', keys === 'agents,cashAccount,chainLog,feeConfig,openPositions,paperRealActivePairs,tendance,tradingAccount,walletStore', keys);
    t('journal écrit (📈 / 📉 / ✅ / ↩), borné à 100', run(sb, 'S.chainLog.length') === 100 && run(sb, 'S.chainLog.every(function(l){ return /Tendance longue/.test(l.desc); })'));
    const sm = run(sb, 'window._tl.summary()');
    t('résumé : total = réalisé + latent, $ à la taille du compte EV (117 $)', Math.abs(sm.total - sm.real - sm.lat) < 1e-12 && sm.eqEV === 117 && sm.nU === 2);
  }

  console.log('▶ B. Cas limites');
  {
    const w1 = Date.UTC(2026, 8, 28), w2 = w1 + WEEK, w3 = w2 + WEEK, w4 = w3 + WEEK, L = 28 * DAY;
    t('lundi 00:00 UTC : 05/10/2026 00:00 → lui-même ; dimanche 04/10 23:59:59 → 28/09', (() => {
      const sb = makeCtx({ S: baseS({}) }); return run(sb, 'window._tl.mondayOf(' + Date.UTC(2026, 9, 5) + ')') === Date.UTC(2026, 9, 5) &&
        run(sb, 'window._tl.mondayOf(' + (Date.UTC(2026, 9, 5) - 1000) + ')') === w1 && run(sb, 'window._tl.mondayOf(' + (Date.UTC(2026, 9, 7, 21, 48)) + ')') === Date.UTC(2026, 9, 5); })());
    const kl = { SOLUSDT: {}, XRPUSDT: {}, ADAUSDT: {} };
    const put = (s, ts, o, c) => { kl[s][ts] = [o, Math.max(o, c), Math.min(o, c), c === undefined ? o : c]; };
    // SOL : SHORT puis signal nul ; XRP : 00:00 absente (repli 23:00) ; ADA : 28 j avant introuvable (paire « trop jeune »)
    put('SOLUSDT', w1 - L, 200); put('SOLUSDT', w1, 100); put('SOLUSDT', w2 - L, 300); put('SOLUSDT', w2, 120); put('SOLUSDT', w3 - L, 90); put('SOLUSDT', w3, 90);
    put('SOLUSDT', w4 - L, 500); put('SOLUSDT', w4, 110);
    put('XRPUSDT', w1 - L, 1); put('XRPUSDT', w1 - H, 1.5, 2); put('XRPUSDT', w1 + H, 2.1); put('ADAUSDT', w1, 1);
    const S0 = baseS({ 'SOL/USDT': true, 'XRP/USDT': true, 'ADA/USDT': true });
    const sb = makeCtx({ S: S0, kl, t0: w1 + H + 30000 });
    sb.__ev.running = false;
    await tick(sb);
    t('EV en pause : rien de décidé, rien d\'ouvert', Object.keys(run(sb, 'S.tendance.dec')).length === 0 && Object.keys(run(sb, 'S.tendance.pos')).length === 0);
    sb.__ev.running = true;
    sb.__net.fail.ADAUSDT = true;
    sb.__px.SOLUSDT = { px: 101, ts: sb.__clock.t };
    sb.__px.XRPUSDT = { px: 2.05, ts: 0 };          // prix de l'app périmé → le module demande le prix Binance du moment (ticker)
    await tick(sb);
    const p1 = run(sb, 'S.tendance.pos');
    t('SOL 28 j −50 % → SHORT ouvert au prix du moment (101), mise 1/3', p1['SOL/USDT'] && p1['SOL/USDT'].side === 'short' && p1['SOL/USDT'].x0 === 101 && p1['SOL/USDT'].n === 3);
    t('XRP : bougie 00:00 absente (01:00 existe) → clôture de 23:00 (2) ; 28 j avant 1 → LONG au prix Binance du moment (2,05)', p1['XRP/USDT'] && p1['XRP/USDT'].side === 'long' && p1['XRP/USDT'].x0 === 2.05 && run(sb, 'S.tendance.dec["XRP/USDT"].pW') === 2 && sb.__net.calls.some(u => u.includes('ticker/price?symbol=XRPUSDT')));
    t('panne réseau ADA : rien décidé, nouvel essai programmé', !run(sb, 'S.tendance.dec["ADA/USDT"]') && /ADA/.test(run(sb, 'window._tlStatus.err')));
    const nCalls = sb.__net.calls.length; delete sb.__net.fail.ADAUSDT;
    sb.__clock.t += 30000; await tick(sb);
    t('avant 2 min : ADA n\'est pas redemandée', !sb.__net.calls.slice(nCalls).some(u => u.includes('ADAUSDT')));
    sb.__clock.t += 120000; await tick(sb);
    t('après 2 min : ADA redemandée → 28 j avant introuvable = « données absentes », rien ouvert', /données absentes/.test(run(sb, 'S.tendance.dec["ADA/USDT"].why')) && !run(sb, 'S.tendance.pos["ADA/USDT"]'));
    // liquidation en direct
    sb.__px.SOLUSDT = { px: 202.5, ts: sb.__clock.t };
    await tick(sb);
    const h1 = run(sb, 'S.tendance.hist');
    t('SHORT SOL liquidé quand le prix double : −100 % de sa mise, journal 💥', !run(sb, 'S.tendance.pos["SOL/USDT"]') && h1.length === 1 && h1[0].net === -1 && h1[0].x1 === 202 &&
      run(sb, 'S.chainLog.some(function(l){ return l.icon === "💥"; })') && run(sb, 'S.tendance.tot.liq') === 1);
    sb.__clock.t += 3 * H; await tick(sb);
    t('même semaine : pas rouvert après la liquidation', !run(sb, 'S.tendance.pos["SOL/USDT"]'));
    // lundi 2 : SOL 28 j encore négatif → SHORT rouvert ; liquidation pendant le sommeil (plus haut d'une heure close)
    sb.__clock.t = w2 + 30000; sb.__px.SOLUSDT = { px: 120, ts: sb.__clock.t }; sb.__px.XRPUSDT = { px: 2.2, ts: sb.__clock.t };
    put('XRPUSDT', w2 - L, 1); put('XRPUSDT', w2, 2.2);
    await tick(sb);
    t('lundi suivant, signal toujours SHORT → SHORT rouvert à 120', run(sb, 'S.tendance.pos["SOL/USDT"].side') === 'short' && run(sb, 'S.tendance.pos["SOL/USDT"].x0') === 120);
    t('XRP toujours LONG : tenu, aucun trade', run(sb, 'S.tendance.dec["XRP/USDT"].why') === 'tenue' && run(sb, 'S.tendance.hist').length === 1);
    sb.__hi.SOLUSDT = { [w2 + 5 * H]: 180, [w2 + 30 * H]: 241, [w2 + 31 * H]: 150 };
    sb.__clock.t = w2 + 40 * H; sb.__px.SOLUSDT = { px: 150, ts: sb.__clock.t };
    await tick(sb);
    const h2 = run(sb, 'S.tendance.hist');
    t('tablette endormie : plus haut 241 ≥ 2 × 120 à w+30 h → liquidé à cette heure-là', h2.length === 2 && h2[1].net === -1 && h2[1].t1 === w2 + 30 * H && h2[1].why.startsWith('liquidation'));
    // lundi 3 : signal nul → rien ; lundi 4 : SHORT ; XRP retirée de l'EV → fermée
    sb.__clock.t = w3 + 30000; sb.__px.SOLUSDT = { px: 90, ts: sb.__clock.t }; sb.__px.XRPUSDT = { px: 2.5, ts: sb.__clock.t };
    put('XRPUSDT', w3 - L, 1); put('XRPUSDT', w3, 2.5);
    run(sb, 'S.feeConfig.takerRate = 0.002');
    run(sb, 'delete S.paperRealActivePairs["XRP/USDT"]');
    await tick(sb);
    t('SOL signal nul (90 = 90) : rien d\'ouvert', !run(sb, 'S.tendance.pos["SOL/USDT"]') && run(sb, 'S.tendance.dec["SOL/USDT"].why') === 'signal nul');
    const h3 = run(sb, 'S.tendance.hist'), xr = h3[h3.length - 1];
    t('XRP retirée de l\'EV → fermée au prix du moment (2,5)', !run(sb, 'S.tendance.pos["XRP/USDT"]') && xr.p === 'XRP/USDT' && xr.why.startsWith('paire retirée') && Math.abs(xr.x1 - 2.5) < 1e-12);
    t('barème relu dans S.feeConfig à la sortie : 0,13 % entrée + 0,23 % sortie', Math.abs(xr.c - (0.0013 + 0.0023)) < 1e-15);
    sb.__clock.t = w4 + 30000; sb.__px.SOLUSDT = { px: 110, ts: sb.__clock.t };
    await tick(sb);
    t('lundi 4 : SHORT SOL, mise 1/2 (XRP sortie de la voix)', run(sb, 'S.tendance.pos["SOL/USDT"].side') === 'short' && run(sb, 'S.tendance.pos["SOL/USDT"].n') === 2);
    sb.__ev.running = false; sb.__px.SOLUSDT = { px: 230, ts: sb.__clock.t + 3600000 }; sb.__clock.t += 3600000;
    await tick(sb);
    t('EV en pause : la liquidation (le marché) reste vérifiée', !run(sb, 'S.tendance.pos["SOL/USDT"]') && run(sb, 'S.tendance.tot.liq') === 3);
    const net = run(sb, 'S.tendance.hist').reduce((a, h) => a + h.net / h.n, 0);
    t('cumul = Σ net / mise de chaque trade', Math.abs(run(sb, 'S.tendance.tot.net') - net) < 1e-12);
  }

  console.log('▶ B2. Relecture adverse du 07/10 : horloge, sommeil, restauration, battement bloqué');
  {
    const w = Date.UTC(2026, 9, 5), L = 28 * DAY;
    const mk = (extra) => { const kl = { BTCUSDT: {} }; kl.BTCUSDT[w - L] = [100, 100, 100, 100]; kl.BTCUSDT[w - H] = [80, 80, 80, 80]; Object.assign(kl.BTCUSDT, extra || {});
      return makeCtx({ S: baseS({ 'BTC/USDT': true }), kl, t0: w + 30000 }); };
    // a. horloge en avance / Binance pas encore au lundi : jamais le repli sur la bougie de dimanche
    let sb = mk();
    sb.__px.BTCUSDT = { px: 81, ts: sb.__clock.t };
    await tick(sb);
    t('lundi 00:00 pas encore chez Binance : rien décidé (pas de repli sur dimanche 23:00), nouvel essai', !run(sb, 'S.tendance.dec["BTC/USDT"]') && /pas encore chez Binance/.test(run(sb, 'window._tlStatus.err')));
    sb.__kl.BTCUSDT[w] = [90, 90, 90, 90]; sb.__clock.t += 150000; sb.__px.BTCUSDT = { px: 91, ts: sb.__clock.t };
    await tick(sb);
    t('2 min 30 plus tard : P_w = ouverture de 00:00 (90), SHORT à 91', run(sb, 'S.tendance.dec["BTC/USDT"].pW') === 90 && run(sb, 'S.tendance.pos["BTC/USDT"].side') === 'short' && run(sb, 'S.tendance.pos["BTC/USDT"].x0') === 91);
    // b. horloge ramenée avant le lundi : la semaine précédente n'est pas redécidée
    const nTr = run(sb, 'S.tendance.hist.length'), calls = sb.__net.calls.length;
    sb.__clock.t = w - 2 * H;
    await tick(sb);
    t('horloge ramenée à dimanche : rien redécidé, rien fermé, aucun appel de décision', run(sb, 'S.tendance.dec["BTC/USDT"].w') === w && run(sb, 'S.tendance.hist.length') === nTr &&
      run(sb, 'S.tendance.pos["BTC/USDT"].side') === 'short' && !sb.__net.calls.slice(calls).some(u => u.includes('limit=1&')) && /horloge/.test(run(sb, 'window._tlStatus.err')));
    // c. l'heure d'entrée n'est pas relue ; d. pages de 1 000 h après des semaines de sommeil
    sb.__clock.t = w + 30000;
    const x0 = run(sb, 'S.tendance.pos["BTC/USDT"].x0'), hi = { [w]: 3 * x0 };
    for (let k = 1; k <= 1500; k++) hi[w + k * H] = (k === 1200 ? 2 * x0 + 1 : x0 * 1.1);
    sb.__hi.BTCUSDT = hi;
    sb.__clock.t = w + 2 * H; sb.__px.BTCUSDT = { px: x0, ts: sb.__clock.t };
    await tick(sb);
    t('plus haut de l\'heure d\'entrée (peut dater d\'avant l\'entrée) : pas de liquidation', run(sb, 'S.tendance.pos["BTC/USDT"]') !== undefined && run(sb, 'S.tendance.tot.liq') === 0);
    sb.__clock.t = w + 1501 * H; sb.__px.BTCUSDT = { px: x0, ts: 0 };
    await tick(sb);
    const lq = run(sb, 'S.tendance.hist').filter(h => h.why.startsWith('liquidation'));
    t('62 jours de sommeil : 2 pages de 1 000 h lues, liquidé à l\'heure 1 200', lq.length === 1 && lq[0].t1 === w + 1200 * H && lq[0].net === -1);
    // e. décision tardive : SHORT liquidé APRÈS lundi 00:00, EV en pause le lundi → pas rouvert la même semaine
    sb = mk({ [w]: [90, 90, 90, 90] });
    sb.__px.BTCUSDT = { px: 91, ts: sb.__clock.t };
    await tick(sb);
    const w2 = w + WEEK; sb.__kl.BTCUSDT[w2 - L] = [100, 100, 100, 100]; sb.__kl.BTCUSDT[w2] = [95, 95, 95, 95]; sb.__kl.BTCUSDT[w2 + 34 * H] = [96, 96, 96, 96];
    sb.__hi.BTCUSDT = { [w2 + 10 * H]: 200 };
    sb.__ev.running = false; sb.__clock.t = w2 + 30000; sb.__px.BTCUSDT = { px: 95, ts: sb.__clock.t };
    await tick(sb);
    sb.__ev.running = true; sb.__clock.t = w2 + 34 * H + 30000; sb.__px.BTCUSDT = { px: 96, ts: sb.__clock.t };
    await tick(sb);
    t('EV en pause lundi, SHORT liquidé lundi 10:00 : décision tardive = pas rouvert cette semaine', !run(sb, 'S.tendance.pos["BTC/USDT"]') && run(sb, 'S.tendance.tot.liq') === 1 &&
      /liquidée cette semaine/.test(run(sb, 'S.tendance.dec["BTC/USDT"].why')));
    const w3 = w2 + WEEK; sb.__kl.BTCUSDT[w3 - L] = [100, 100, 100, 100]; sb.__kl.BTCUSDT[w3] = [97, 97, 97, 97];
    sb.__clock.t = w3 + 30000; sb.__px.BTCUSDT = { px: 97, ts: sb.__clock.t };
    await tick(sb);
    t('lundi suivant, signal SHORT : rouvert', run(sb, 'S.tendance.pos["BTC/USDT"].side') === 'short' && run(sb, 'S.tendance.pos["BTC/USDT"].x0') === 97);
    // f. sauvegarde restaurée pendant un battement : l'ancien battement n'écrit pas dans la poche restaurée
    sb = mk({ [w]: [90, 90, 90, 90] });
    sb.__px.BTCUSDT = { px: 91, ts: sb.__clock.t };
    let release; sb.__hold = new Promise(r => { release = r; });
    const pending = run(sb, 'window._tl.tick()');
    run(sb, 'S.tendance = { v: 1, depuis: 1, pos: {}, dec: {}, hist: [], tot: { net: 0, netL: 0, n: 0, win: 0, liq: 0 } }');
    sb.__hold = null; release(); await pending;
    t('restauration en plein battement : la poche restaurée reste intacte', Object.keys(run(sb, 'S.tendance.pos')).length === 0 && Object.keys(run(sb, 'S.tendance.dec')).length === 0);
    await tick(sb);
    t('battement suivant : décision prise dans la poche restaurée', run(sb, 'S.tendance.pos["BTC/USDT"].side') === 'short');
    // g. réseau qui ne répond jamais : battement abandonné après 5 min, le suivant décide
    sb = mk({ [w]: [90, 90, 90, 90] });
    sb.__px.BTCUSDT = { px: 91, ts: sb.__clock.t };
    sb.__hold = new Promise(() => {});
    run(sb, 'window._tl.tick()');
    sb.__clock.t += 60000; const r1 = await tick(sb);
    sb.__hold = null; sb.__clock.t += 5 * 60000; sb.__px.BTCUSDT = { px: 92, ts: sb.__clock.t };
    const r2 = await tick(sb);
    t('appel Binance bloqué : battement suivant refusé tant qu\'il est récent, abandonné après 5 min, décision prise', r1 === false && r2 === true &&
      run(sb, 'S.tendance.pos["BTC/USDT"].x0') === 92 && /abandonné/.test(run(sb, 'window._tlStatus.err')));
    t('chaque appel Binance porte un délai (AbortSignal.timeout, 10 s)', /AbortSignal\.timeout\(FETCH_MS\)/.test(SRC) && /var FETCH_MS = 10000;/.test(SRC));
    const s02 = fs.readFileSync(path.join(ROOT, 'js/02-state-init.js'), 'utf8');
    const ek = s02.indexOf("['tendance',         /^Tendance longue \\u00b7 /],"), et = s02.indexOf("['sortie_trailing',");
    t('journal des événements (02) : les lignes de la voix ont leur nature « tendance », avant « fermeture »', ek > 0 && ek < et && /^Tendance longue · /.test('Tendance longue · BTC/USDT SHORT fermé (retournement)'));
  }

  console.log('▶ C. Le module ne touche à rien d\'autre');
  {
    const code = SRC.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    for (const f of ['openPositions', 'openPosition(', 'closePosition(', 'autoOpenPosition', 'tradingAccount', 'cashAccount', 'leverage', 'recordFees', 'agents', 'fitness', 'dcThreshold', 'saveState', 'localStorage', 'indexedDB'])
      t('aucun « ' + f + ' » dans le code', !code.includes(f));
    t('écrit seulement S.tendance et S.chainLog', !/S\.(?!tendance|chainLog|feeConfig|paperRealActivePairs)\w+\s*=[^=]/.test(code) && !/S\.(?!tendance|chainLog)\w+\.(push|splice)\(/.test(code));
  }

  console.log('▶ D. Persistance et écran');
  {
    const b1 = fs.readFileSync(path.join(ROOT, 'js/09b1-build-snapshot.js'), 'utf8'), b2 = fs.readFileSync(path.join(ROOT, 'js/09b2-save-load.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'AURA8_v118.html'), 'utf8');
    t('buildSnapshot (09b1) : tendance: S.tendance', /\btendance: S\.tendance \|\| null,/.test(b1));
    t('applySnap (09b2) : S.tendance = snap.tendance', /if \(snap\.tendance && typeof snap\.tendance === 'object'\)\s+S\.tendance\s+= snap\.tendance;/.test(b2));
    t('_APPLYSNAP_MANIFEST contient tendance', /window\._APPLYSNAP_MANIFEST = \[[^\]]*'tendance'/.test(b2));
    t('HTML : barre tlBar (compteur, P&L, grille) et bouton → _tlToggle', ['id="tlBar"', 'id="tlBarCounter"', 'id="tlBarPnl"', 'id="tlGrid"', 'window._tlToggle'].every(x => html.includes(x)));
    const i14 = html.indexOf('src="js/14-enregistreur.js'), i15 = html.indexOf('src="js/15-voix-tendance.js');
    t('HTML : js/15-voix-tendance.js chargé une fois, après 14', i15 > i14 && i14 > 0 && html.split('src="js/15-voix-tendance.js').length === 2);
  }
  console.log('\n' + (ko ? '❌ ' : '✅ ') + ok + '/' + (ok + ko) + ' tests passés');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('❌ exception : ' + (e && e.stack || e)); process.exit(1); });
