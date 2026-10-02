// ana_voix.js — rejeu : code d'avant (A) contre code à livrer (B), mêmes fenêtres, mêmes tirages (écrit pour le DÉGEL DES VOIX, 20261002a).
// [OUTILS · 02/10/2026] VERSION 20261002a · sauvé du bac à sable de la session. Mode d'emploi : PASSATION-AURA8.md, « Démarrage de session », point 8.
// Par voix (votes notés aux horizons, vjLog) : part des cycles où elle parle, part d'achats, valeurs distinctes, même valeur que la paire voisine
// au même instant (même bougie), même valeur qu'au cycle précédent de la paire ; justesse aux horizons E_h = Σ v·D / Σ |v·D| (D = (net long − net
// short) / 2). Décision : trades virtuels jugés (thr.rec) et justesse du sens de la pesée vivante (dH × D). Apprentissage, marché, erreurs.
// usage : node rejeu/ana_voix.js <variante A> <variante B>   → rejeu/out/ana_voix_<A>_<B>.json
'use strict';
const fs = require('fs'), path = require('path'); const OUT = path.join(__dirname, 'out'), F = 900000, HZ = [1, 2, 4, 8, 16];
const [A, B] = [process.argv[2], process.argv[3]]; if (!A || !B) { console.error('usage : node rejeu/ana_voix.js <variante A> <variante B>'); process.exit(2); }
// sorties d'une variante dans rejeu/out : <variante>_s<tirage>_w<fenêtre>.json, toutes celles présentes
const _outs = V => fs.readdirSync(OUT).map(f => { const x = f.match(/^(.+)_s(\d+)_w(\d+)\.json$/); return (x && x[1] === V) ? { f: path.join(OUT, f), s: Number(x[2]), w: Number(x[3]) } : null; }).filter(Boolean).sort((a, b) => a.s - b.s || a.w - b.w);
const R = (x, d) => (x === null || x === undefined || !isFinite(x)) ? null : Math.round(x * Math.pow(10, d)) / Math.pow(10, d);
function load(V) {
  return _outs(V).map(o => Object.assign(JSON.parse(fs.readFileSync(o.f, 'utf8')), { s: o.s, w: o.w }));
}
function analyse(V) {
  const W = load(V), voices = {}, dec = { n: 0, hz: HZ.map(() => ({ n: 0, s: 0, ok: 0 })) }, rec = HZ.map(() => ({ n: 0, s: 0 })), out = { fenetres: W.length, cycles: 0, erreurs: 0, erreursPage: 0, trades: 0, lfo: 0, notes: 0, rec: 0, mkt: { n: 0, vol: 0, fw: 0 } };
  W.forEach(d => {
    const r = d.result, tM = d.tM, ids = (r.thr && r.thr.vIds) || [];
    out.erreurs += r.terrN || 0; out.erreursPage += (d.pageErrors || []).filter(x => !/Wake Lock/.test(String(x))).length; out.trades += (r.trades || []).length + (r.reTrades || 0);
    out.lfo += (r.lfo || []).filter(x => x[2] >= tM).length;
    const st = (r.mkt && r.mkt.stats) || {}; ['E', 'R'].forEach(m => { const x = st[m] || {}; out.mkt.n += x.n || 0; out.mkt.vol += x.vol || 0; out.mkt.fw += x.fw || 0; });
    ((r.thr && r.thr.rec) || []).filter(x => x[1] * 1000 >= tM).forEach(x => { out.rec++; HZ.forEach((h, i) => { const v = x[3 + i]; if (typeof v === 'number') { rec[i].n++; rec[i].s += v; } }); });
    const L = (r.vjLog || []).filter(q => q.t >= tM); out.notes += L.length; out.cycles += L.length;
    const prev = {}, group = {};
    L.forEach(q => {
      const Ds = HZ.map((h, i) => (typeof q.L.n[i] === 'number' && typeof q.S.n[i] === 'number') ? (q.L.n[i] - q.S.n[i]) / 2 : null);
      if (q.dH) { dec.n++; Ds.forEach((D, i) => { if (D !== null) { dec.hz[i].n++; dec.hz[i].s += q.dH * D; if (q.dH * D > 0) dec.hz[i].ok++; } }); }
      const vm = {}; q.v.forEach(e => { const id = ids[e[0]]; if (typeof id === 'string') vm[id] = e[1] / 1000; });
      const g = (group[Math.floor(q.t / F)] = group[Math.floor(q.t / F)] || []); g.push(vm);
      Object.keys(Object.assign({}, vm, prev[q.p] || {})).forEach(id => { voices[id] = voices[id] || { cyc: 0, spoke: 0, buy: 0, vals: new Set(), samePrev: 0, prevN: 0, E: HZ.map(() => [0, 0]), sameX: 0, xN: 0 }; });
      Object.keys(voices).forEach(id => {
        const o = voices[id], v = vm[id] || 0; o.cyc++;
        if (Math.abs(v) >= 0.03) { o.spoke++; if (v > 0) o.buy++; o.vals.add(Math.round(v * 1000)); Ds.forEach((D, i) => { if (D !== null) { o.E[i][0] += v * D; o.E[i][1] += Math.abs(v * D); } }); }
        const pv = prev[q.p] ? (prev[q.p][id] || 0) : null; if (pv !== null && (Math.abs(v) >= 0.03 || Math.abs(pv) >= 0.03)) { o.prevN++; if (Math.round(v * 1000) === Math.round(pv * 1000)) o.samePrev++; }
      });
      prev[q.p] = vm;
    });
    Object.values(group).forEach(g => { if (g.length < 2) return; Object.keys(voices).forEach(id => { const vals = g.map(vm => Math.round((vm[id] || 0) * 1000)).filter(x => Math.abs(x) >= 30); if (vals.length < 2) return; const o = voices[id]; o.xN++; if (vals.every(x => x === vals[0])) o.sameX++; }); });
  });
  const V2 = {}; Object.keys(voices).sort().forEach(id => { const o = voices[id];
    V2[id] = { parle: R(o.spoke / Math.max(1, o.cyc), 3), achat: o.spoke ? R(o.buy / o.spoke, 3) : null, valeurs: o.vals.size, memeEntrePaires: o.xN ? R(o.sameX / o.xN, 3) : null, memeQuAvant: o.prevN ? R(o.samePrev / o.prevN, 3) : null, E: o.E.map(e => e[1] > 0 ? R(e[0] / e[1], 3) : null), votes: o.spoke }; });
  out.voix = V2;
  out.decision = { cycles: dec.n, sensJuste: dec.hz.map(x => x.n ? R(x.ok / x.n, 3) : null), avantFraisPct: dec.hz.map(x => x.n ? R(x.s / x.n, 4) : null) };
  out.tradesVirtuels = { n: out.rec, netMoyenPct: rec.map(x => x.n ? R(x.s / x.n, 4) : null) };
  out.mkt.vol = R(out.mkt.vol, 0);
  return out;
}
const a = analyse(A), b = analyse(B);
const res = { avant: A, apres: B, [A]: a, [B]: b };
fs.writeFileSync(path.join(OUT, 'ana_voix_' + A + '_' + B + '.json'), JSON.stringify(res, null, 1));
const KEY = ['security_v1', 'harmonic_v1', 'sentiment_v2', 'contrarian_v2', 'mean_rev_v1', 'corr_v1', 'breakout_v1', 'volume_v1', 'trend_v2', 'swing_v2', 'hedge_v2', 'macro_v1', 'nlp_v1', 'fundamental_v1', 'scalper_bot_v1', 'arb_bot_v1', 'composite', 'marche'];
console.log('fenêtres', a.fenetres, b.fenetres, '| cycles notés', a.cycles, b.cycles, '| erreurs', a.erreurs, b.erreurs, a.erreursPage, b.erreursPage, '| trades', a.trades, b.trades);
console.log('jugements bougie suivante', a.lfo, b.lfo, '| trades virtuels jugés', a.rec, b.rec, '| marché manches', a.mkt.n, b.mkt.n, 'T$', a.mkt.vol, b.mkt.vol);
console.log('décision sens juste', JSON.stringify(a.decision.sensJuste), '→', JSON.stringify(b.decision.sensJuste));
console.log('décision avant frais %', JSON.stringify(a.decision.avantFraisPct), '→', JSON.stringify(b.decision.avantFraisPct));
console.log('trades virtuels net %', JSON.stringify(a.tradesVirtuels.netMoyenPct), '→', JSON.stringify(b.tradesVirtuels.netMoyenPct));
KEY.forEach(id => { const x = a.voix[id], y = b.voix[id]; const f = o => o ? ('parle ' + o.parle + ' achat ' + o.achat + ' val ' + o.valeurs + ' =paires ' + o.memeEntrePaires + ' =avant ' + o.memeQuAvant + ' E ' + JSON.stringify(o.E)) : '—'; console.log(id.padEnd(15), f(x), '\n'.padEnd(17), f(y)); });
