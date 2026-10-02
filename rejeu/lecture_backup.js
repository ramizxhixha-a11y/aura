// lecture_backup.js — lecture SEULE d'un backup réel de Rams : période, continuité des données (trous), trades virtuels jugés, voix, marché…
// (écrit pour le diagnostic du 29/09 — claude/DIAGNOSTIC-APP-REELLE-2909.md).
// [OUTILS · 02/10/2026] VERSION 20261002a · sauvé du bac à sable de la session. Mode d'emploi : PASSATION-AURA8.md, « Démarrage de session », point 8.
// usage : node rejeu/lecture_backup.js <aura_guardian_full_….json>
'use strict';
const F = process.argv[2]; if (!F) { console.error('usage : node rejeu/lecture_backup.js <aura_guardian_full_….json>'); process.exit(2); }
const j = JSON.parse(require('fs').readFileSync(require('path').resolve(F), 'utf8')), S = j.aura, T = S.dcThreshold || {}, HZ = ['15m', '30m', '1h', '2h', '4h'], BLK = 4 * 3600000, FEE = 0.275;
const iso = ms => new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const out = {};
// 1 · période et continuité : trades virtuels jugés (rec : [c, t_s, tf_min, n15m, n30m, n1h, n2h, n4h])
const rec = (T.rec || []).filter(r => Array.isArray(r) && isFinite(r[1]));
const ts = rec.map(r => r[1] * 1000).sort((a, b) => a - b);
out.periode = { premier: iso(ts[0]), dernier: iso(ts[ts.length - 1]), backup: j.savedAt, n: rec.length };
const hours = {}; ts.forEach(t => { const h = Math.floor(t / 3600000); hours[h] = (hours[h] || 0) + 1; });
const h0 = Math.floor(ts[0] / 3600000), h1 = Math.floor(Date.parse(j.savedAt) / 3600000); const gaps = []; let run = null;
for (let h = h0; h <= h1; h++) { if (!hours[h]) { if (!run) run = { de: h, a: h }; else run.a = h; } else if (run) { gaps.push(run); run = null; } } if (run) gaps.push(run);
out.continuite = { heures: h1 - h0 + 1, heuresAvecTrades: Object.keys(hours).length, trous: gaps.filter(g => g.a - g.de + 1 >= 2).map(g => iso(g.de * 3600000) + ' → ' + (g.a - g.de + 1) + ' h') };
// 2 · la décision (sens décidé) et le sens contraire : net par horizon, erreur type par créneau de 4 h
const stat = rows => { const n = rows.length; if (n < 10) return null; const m = rows.reduce((a, r) => a + r.v, 0) / n; const bl = {}; rows.forEach(r => { const b = Math.floor(r.t / BLK); (bl[b] = bl[b] || { n: 0, s: 0 }); bl[b].n++; bl[b].s += r.v; }); const B = Object.keys(bl).length; const v = Object.values(bl).reduce((a, c) => a + Math.pow(c.s - m * c.n, 2), 0) / (n * n) * (B / Math.max(1, B - 1)); return { n, creneaux: B, moy: +m.toFixed(3), se: +Math.sqrt(v).toFixed(3), t: +(m / Math.sqrt(v)).toFixed(1) }; };
out.decision = {}; out.contraire = {};
HZ.forEach((hz, i) => {
  out.decision[hz] = { tous: stat(rec.filter(r => typeof r[3 + i] === 'number').map(r => ({ t: r[1] * 1000, v: r[3 + i] }))), 'conv≥0,3': stat(rec.filter(r => typeof r[3 + i] === 'number' && r[0] >= 0.3).map(r => ({ t: r[1] * 1000, v: r[3 + i] }))) };
  const rc = (T.recC || []).filter(r => Array.isArray(r) && typeof r[3 + i] === 'number');
  out.contraire[hz] = stat(rc.map(r => ({ t: (r[1] + 1700000000) * 1000, v: r[3 + i] / 10000 })));
});
// ce que l'app a elle-même conclu (règle apprise : la queue la plus proche d'une preuve, par horizon)
const near = R => (R && R['15'] && Array.isArray(R['15'].hz)) ? R['15'].hz.map((x, i) => ({ h: HZ[i], ouvert: !!x.open, proche: x.near ? { niveau: x.near.level, n: x.near.n, creneaux: x.near.blocks, moy: +x.near.mean.toFixed(3), se: +x.near.se.toFixed(3), exige: +(x.near.crit || 0).toFixed(1) } : null })) : null;
out.regle = near(T.rules); out.regleContraire = near(T.rulesC);
// 3 · les voix : vHz[id][h] = [v, D, v, D, …] (v = vote × 1000, D = (net long − net short)/2 × 10000), les 240 derniers par horizon
const vIds = T.vIds || [], vHz = T.vHz || {};
out.voix = Object.keys(vHz).map(id => {
  const R = vHz[id], L0 = R[0] || [], votes = []; for (let k = 0; k < L0.length; k += 2) votes.push(L0[k]);
  const cnt = {}; votes.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; }); const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0] || [0, 0];
  const o = { voix: id, votes: votes.length, valeurs: Object.keys(cnt).length, 'valeur la plus fréquente': (top[0] / 1000) + ' (' + Math.round(100 * top[1] / Math.max(1, votes.length)) + ' %)', 'butée ±1': Math.round(100 * votes.filter(v => Math.abs(v) >= 1000).length / Math.max(1, votes.length)) + ' %', 'long %': Math.round(100 * votes.filter(v => v > 0).length / Math.max(1, votes.length)) + ' %' };
  HZ.forEach((hz, i) => { const L = R[i] || []; let n = 0, s = 0, s2 = 0, ok = 0; for (let k = 0; k < L.length; k += 2) { const v = L[k], D = L[k + 1] / 10000; const x = Math.sign(v) * D - FEE; n++; s += x; s2 += x * x; if (Math.sign(v) === Math.sign(D)) ok++; } if (n < 20) { o[hz] = '—'; return; } const m = s / n, sd = Math.sqrt(Math.max(0, s2 / n - m * m)); o[hz] = (m >= 0 ? '+' : '') + m.toFixed(2) + ' (' + Math.round(100 * ok / n) + ' %)'; });
  return o;
}).sort((a, b) => b.votes - a.votes);
out.voixSansJugement = vIds.filter(id => !vHz[id]);
// dernières voix entendues (file en attente : chaque paire, le dernier cycle noté)
const pv = (T.pendV || []).slice(-12), last = {}; pv.forEach(q => (q.v || []).forEach(([i, x]) => { const id = vIds[i] || '#' + i; (last[id] = last[id] || []).push(x / 1000); }));
out.voixDernierCycle = Object.keys(last).map(id => id + ' ' + last[id].map(x => (x >= 0 ? '+' : '') + x.toFixed(2)).join(' '));
out.voixJamaisEntendues = (S.agents || []).map(a => a.id).filter(id => vIds.indexOf(id) < 0);
// 4 · les poids des voix et la fitness (règles comparées par l'app)
out.pesee = T.vRules && T.vRules['15'] ? { mode: T.vRules['15'].mode, hz: T.vRules['15'].hz.map(x => ({ h: HZ[TH_i(x.h)], n: x.n, moy: x.mean === null ? null : +x.mean.toFixed(3), se: x.se === null ? null : +x.se.toFixed(3), mieux: x.better, pire: x.worse })) } : null;
function TH_i(h) { return [1, 2, 4, 8, 16].indexOf(h); }
// 5 · évolution
const E = S.evoRule || {}, obs = (E.obs || []).filter(Array.isArray);
out.evolution = { observations: obs.length, parSource: ['R', 'B', 'M'].reduce((a, s) => { const x = obs.filter(o => (o[7] === 'B' || o[7] === 'M' ? o[7] : 'R') === s); a[s] = { n: x.length, ecartMoyen: x.length ? +(x.reduce((q, o) => q + o[2], 0) / x.length / 10000).toFixed(3) : null }; return a; }, {}), fitnessAuPlancher: obs.filter(o => o[1] === 50).length, regle: E.rule ? { n: E.rule.n, creneaux: E.rule.blocks, gain: !!E.rule.gain, nuisance: !!E.rule.harm } : null, opRule: E.opRule ? { politique: E.opRule.policy, R: E.opRule.R && E.opRule.R.n, B: E.opRule.B && E.opRule.B.n, M: E.opRule.M && E.opRule.M.n } : null,
  premiere: obs.length ? iso(obs[0][0] * 1000) : null, derniere: obs.length ? iso(obs[obs.length - 1][0] * 1000) : null, essaisOuverts: Object.keys(S.evoTrials || {}).length };
const recent = (S.evoMerit && S.evoMerit.recent) || []; out.evolution.verdicts = recent.reduce((a, x) => { a[x.verdict] = (a[x.verdict] || 0) + 1; return a; }, {});
// 6 · sièges : fitness, jugements
out.sieges = (S.agents || []).map(a => ({ id: a.id, fitness: Math.round(a.fitness), jugements: (a._judgments || []).length, marche: a.lmsrWallet !== undefined ? Math.round(a.lmsrWallet) : null }));
console.log(JSON.stringify(out, null, 1));
