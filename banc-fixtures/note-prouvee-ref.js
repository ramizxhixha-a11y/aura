// banc-fixtures/note-prouvee-ref.js — [GO N° 109 · 20/11/2026] RÉFÉRENCE de la note prouvée, écrite d'après la règle R2 de la porte
// (rejeu/porte_n109.py, en-tête), SANS lire 03 : E = Σ s·w / Σ w ; E ≤ 0 → E ; sinon p = (E + 1) / 2, effectif de Kish n = (Σ w)² / Σ w²
// (repli : le nombre de jugements), borne basse de Wilson à 95 % (z = 1,96) ; borne > 0,5 → 2·borne − 1, sinon 0. Note = 350 + 1 000 × E,
// arrondie, bornée 50–2 000. Les bancs qui épinglaient la note brute (350 + 1 000 × E) calculent ici ce que la note prouvée doit rendre.
'use strict';
function wilsonLo(p, n) { const z = 1.96; return (p + z * z / (2 * n) - z * Math.sqrt(Math.max(0, p * (1 - p) / n + z * z / (4 * n * n)))) / (1 + z * z / n); }
function E(sw, se, sw2, n) {
  const e = sw > 0 ? se / sw : 0;
  if (e <= 0) return e;
  const k = sw2 > 0 ? sw * sw / sw2 : n;
  const lo = wilsonLo((e + 1) / 2, k);
  return lo > 0.5 ? 2 * lo - 1 : 0;
}
const note = e => Math.max(50, Math.min(2000, Math.round(350 + 1000 * e)));
// jugements [{s, w}] : les W derniers ; null sous 5
function deJugements(js, W) {
  const L = js.slice(-W); if (L.length < 5) return null;
  let sw = 0, se = 0, sw2 = 0; L.forEach(j => { sw += j.w; se += j.s * j.w; sw2 += j.w * j.w; });
  return note(E(sw, se, sw2, L.length));
}
// record aux horizons : 5 listes à plat [v, D, v, D, …] ; null si un horizon a moins de 5 jugements dans la fenêtre
function deRecord(Jv, W) {
  let s = 0;
  for (const L of Jv) {
    const n = Math.min(L.length >> 1, W); if (n < 5) return null;
    let a = 0, b = 0, b2 = 0;
    for (let j = Math.max(0, L.length - 2 * W); j + 1 < L.length; j += 2) { const x = L[j] * L[j + 1]; a += x; b += Math.abs(x); b2 += x * x; }
    s += E(b, a, b2, n);
  }
  return note(s / Jv.length);
}
module.exports = { wilsonLo, E, note, deJugements, deRecord };
