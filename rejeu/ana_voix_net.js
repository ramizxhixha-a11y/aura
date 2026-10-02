// ana_voix_net.js — si l'on suivait le sens d'une seule voix (ou de la décision), que rapporterait le trade virtuel, net de frais, à chaque horizon ?
// Rejeux du code livré ; net = L.n[h] si vote > 0, S.n[h] si vote < 0 (frais 0,275 % aller-retour et perte max comprises, calculés par l'app).
// Erreur type par créneau de 4 h en temps ABSOLU (les tirages rejouent les mêmes marchés : même créneau = même grappe ; paires corrélées).
// [OUTILS · 02/10/2026] VERSION 20261002a · sauvé du bac à sable de la session. Mode d'emploi : PASSATION-AURA8.md, « Démarrage de session », point 8.
// usage : node rejeu/ana_voix_net.js <variante> [variante…]   (toutes les fenêtres et tous les tirages présents) → rejeu/out/ana_voix_net.json
'use strict';
const fs = require('fs'), path = require('path'); const OUT = path.join(__dirname, 'out');
// sorties d'une variante dans rejeu/out : <variante>_s<tirage>_w<fenêtre>.json, toutes celles présentes
const _outs = V => fs.readdirSync(OUT).map(f => { const x = f.match(/^(.+)_s(\d+)_w(\d+)\.json$/); return (x && x[1] === V) ? { f: path.join(OUT, f), s: Number(x[2]), w: Number(x[3]) } : null; }).filter(Boolean).sort((a, b) => a.s - b.s || a.w - b.w);
const VS = process.argv.slice(2); if (!VS.length) { console.error('usage : node rejeu/ana_voix_net.js <variante> [variante…]'); process.exit(2); }
const HZ = ['15m', '30m', '1h', '2h', '4h'], BLK = 4 * 3600000;
const acc = {};
const add = (id, h, net, t) => { const a = acc[id] = acc[id] || HZ.map(() => ({ n: 0, s: 0, bl: {} })); const x = a[h]; x.n++; x.s += net; const b = Math.floor(t / BLK); const c = x.bl[b] = x.bl[b] || { n: 0, s: 0 }; c.n++; c.s += net; };
for (const V of VS) for (const o of _outs(V)) {
  const f = o.f;
  const r = JSON.parse(fs.readFileSync(f, 'utf8')).result, ids = (r.thr && r.thr.vIds) || [];
  (r.vjLog || []).forEach(q => {
    for (let h = 0; h < 5; h++) {
      const l = q.L && q.L.n ? q.L.n[h] : null, s = q.S && q.S.n ? q.S.n[h] : null; if (l === null || s === null || l === undefined || s === undefined) continue;
      (q.v || []).forEach(([i, x]) => { if (!x) return; add(ids[i] || '#' + i, h, x > 0 ? l : s, q.t); });
      if (q.dH) add('DÉCISION (pesée horizons)', h, q.dH > 0 ? l : s, q.t);
      if (q.dO) add('DÉCISION (pesée bougie)', h, q.dO > 0 ? l : s, q.t);
      add('toujours long', h, l, q.t); add('toujours short', h, s, q.t);
    }
  });
}
// erreur type de la moyenne par grappes (créneaux de 4 h) : var = Σ_b (S_b − m n_b)² / n² × B/(B−1)
const stat = x => { const m = x.s / x.n, bs = Object.values(x.bl), B = bs.length; const v = bs.reduce((a, c) => a + Math.pow(c.s - m * c.n, 2), 0) / (x.n * x.n) * (B / Math.max(1, B - 1)); return { m, se: Math.sqrt(v), B, n: x.n }; };
const rows = Object.keys(acc).map(id => { const o = { voix: id }; acc[id].forEach((x, h) => { if (x.n < 50) { o[HZ[h]] = '—'; return; } const st = stat(x); o[HZ[h]] = (st.m >= 0 ? '+' : '') + st.m.toFixed(3) + ' ± ' + st.se.toFixed(3) + ' (' + (st.m / st.se).toFixed(1) + ')'; }); o.n4h = acc[id][4].n; o.creneaux = stat(acc[id][4]).B; return o; })
  .sort((a, b) => b.n4h - a.n4h);
console.log('net % par trade en suivant le sens de la voix — moyenne ± erreur type par créneau de 4 h (t) — ' + VS.join(', '));
console.table(rows);
fs.writeFileSync(path.join(OUT, 'ana_voix_net.json'), JSON.stringify({ VS, rows }, null, 1));
