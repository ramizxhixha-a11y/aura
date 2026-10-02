// ana_decision.js — la décision (pesée vivante, sens dH) contre le mouvement D à chaque horizon : dérive du marché, part d'achats, justesse équilibrée
// (moyenne des justesses sur les hausses et sur les baisses), avantage net de la dérive E[dH·(D − D̄)] — par variante, sur toute la fenêtre puis
// par moitié (1re moitié : les poids des voix viennent encore de leur record d'avant ; utile pour voir une transition).
// [OUTILS · 02/10/2026] VERSION 20261002a · sauvé du bac à sable de la session (dg_dec.js + dg_dec2.js). Mode d'emploi : PASSATION-AURA8.md, « Démarrage de session », point 8.
// usage : node rejeu/ana_decision.js <variante> [variante…]   → rejeu/out/ana_decision.json
'use strict';
const fs = require('fs'), path = require('path'); const OUT = path.join(__dirname, 'out'), HZ = [1, 2, 4, 8, 16];
// sorties d'une variante dans rejeu/out : <variante>_s<tirage>_w<fenêtre>.json, toutes celles présentes
const _outs = V => fs.readdirSync(OUT).map(f => { const x = f.match(/^(.+)_s(\d+)_w(\d+)\.json$/); return (x && x[1] === V) ? { f: path.join(OUT, f), s: Number(x[2]), w: Number(x[3]) } : null; }).filter(Boolean).sort((a, b) => a.s - b.s || a.w - b.w);
const R = (x, d) => (x === null || !isFinite(x)) ? null : Math.round(x * Math.pow(10, d)) / Math.pow(10, d);
function dec(V, half) {
  const rows = HZ.map(() => []); let buy = 0, n = 0;
  for (const o of _outs(V)) { const d = JSON.parse(fs.readFileSync(o.f, 'utf8')), mid = d.tM + (d.tEnd - d.tM) / 2;
    (d.result.vjLog || []).filter(q => q.t >= d.tM && q.dH && (!half || (half === 1 ? q.t < mid : q.t >= mid))).forEach(q => { n++; if (q.dH > 0) buy++; HZ.forEach((h, i) => { const a = q.L.n[i], b = q.S.n[i]; if (typeof a === 'number' && typeof b === 'number') rows[i].push([q.dH, (a - b) / 2]); }); }); }
  return { decisions: n, achats: R(buy / n, 3), hz: rows.map(r => { const m = r.reduce((s, x) => s + x[1], 0) / r.length; const up = r.filter(x => x[1] > 0), dn = r.filter(x => x[1] < 0);
    const accU = up.filter(x => x[0] > 0).length / up.length, accD = dn.filter(x => x[0] < 0).length / dn.length;
    return { n: r.length, derive: R(m, 4), justesse: R(r.filter(x => x[0] * x[1] > 0).length / r.length, 3), equilibree: R((accU + accD) / 2, 3), horsDerive: R(r.reduce((s, x) => s + x[0] * (x[1] - m), 0) / r.length, 4) }; }) };
}
if (!process.argv[2]) { console.error('usage : node rejeu/ana_decision.js <variante> [variante…]'); process.exit(2); }
const out = {}; process.argv.slice(2).forEach(V => { out[V] = dec(V); out[V].moities = [dec(V, 1), dec(V, 2)]; console.log(V, 'décisions', out[V].decisions, 'achats', out[V].achats);
  out[V].hz.forEach((x, i) => console.log('  ', ['15m', '30m', '1h', '2h', '4h'][i], JSON.stringify(x), '| moitiés : équilibrée', out[V].moities[0].hz[i].equilibree, '/', out[V].moities[1].hz[i].equilibree)); });
fs.writeFileSync(path.join(OUT, 'ana_decision.json'), JSON.stringify(out, null, 1));
