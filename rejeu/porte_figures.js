// [GO FIGURES · 26/10/2026] rejeu/porte_figures.js — la porte des figures corrigées (Rams 26/10 20:25 : « Corrige les figures »).
// RÈGLES ÉCRITES AVANT TOUTE DONNÉE (lignes 1 à 30, empreinte sha-256 vérifiée plus bas ; on ne les retouche pas pour faire passer quoi que ce soit).
// Question : les figures lues sur les vraies bougies (06 _detectCandlePatterns : ouverture, haut, bas, clôture des bougies CLOSES) doivent-elles
//   remplacer, dans la décision (08 getTechSignals : signals.pattern → atScore → scouts, conseils, portes), les figures d'avant (06 _detectPatterns sur
//   les seules clôtures) ? L'écran, lui, passe aux vraies bougies sans porte : il ne décide rien.
// Données : celles de la porte TALENT (passation, point 9), inchangées — 12 paires, bougies 15 min Binance du 11/10/2024 au 30/09/2026 (talent_get.sh
//   2024-10 → 2026-09), frais 0,26 %, horizons 15 min / 1 h / 4 h / 24 h, génomes de départ, deux lectures : bougies closes, et --encours 1 (la bougie
//   qui s'ouvre, comme l'app vivante). Aucune autre donnée, aucune choisie après coup.
// Rejeux (rejeu/talent.js, code de l'app tel qu'il est dans le commit livré, extrait par ancres, en vm), chacun dans les deux lectures :
//   R1 (option --figures 1, même passage que R2) : deux voix seules, à chaque bougie et chaque paire — « figures_avant » = la meilleure figure d'avant
//      telle que getTechSignals la lit (_detectPatterns(_closes(candles)) : +conf haussière, −conf baissière, 0 si neutre ou rien) ; « figures_ohlc » =
//      la même chose avec _detectCandlePatterns(candles).
//   R2 (sans option de décision) : les voix de l'app avec les figures d'avant (le code livré).
//   R3 (--figures-decision 1) : les mêmes voix, getTechSignals lisant _detectCandlePatterns(candles) à la place de _detectPatterns(closes) — une seule
//      ancre, sinon arrêt.
//   Chaque rejeu analysé par rejeu/talent_ana.py (règles du 03/10, non retouchées).
// Témoin (CLAUDE.md, règle 10) : la porte doit VOIR une différence avant de conclure — T1 = part des bougies × paires où figures_ohlc ≠ figures_avant
//   (R1) ; T2 = part des votes changés de R2 à R3, voix par voix. Si T1 = 0 ou si aucune voix ne change de R2 à R3 : porte AVEUGLE, aucun verdict,
//   rien n'entre dans la décision.
// Verdict :
//   ENTRE (getTechSignals lit les figures corrigées) si, dans les DEUX lectures : (a) figures_ohlc est TALENT (z ≥ 3,2 et brut > 0 les deux années) ET
//   rentable (net > 0 sur l'année 2 au test 2, ≥ 30 trades) au MÊME horizon, à au moins un horizon ; ET (b) aucune voix TALENT ou rentable dans R2 ne
//   l'est plus dans R3 (même horizon, même lecture).
//   N'ENTRE PAS sinon : la décision garde les figures d'avant (rien n'est retiré, point 9) ; les mesures sont dites à Rams telles quelles.
//   Dit, ne décide rien : le talent de figures_avant. La retirer de la décision serait un autre changement, avec sa propre porte.
// Un rejeu absent, incomplet ou d'un autre code (token) : dit, pas remplacé ; la porte ne conclut pas.
//
//
//
// (fin des règles)
'use strict';
const REGLES_SHA = '10d5d0a893816026b224367a7910db7f7abb88545d71b8d541c221ac3db159ff';   // lignes 1–30, écrites le 26/10/2026 19:34:01 UTC, avant toute donnée
// usage : node rejeu/porte_figures.js --runs DIR --data DIR   (DIR des rejeux : r2c_a, r2c_b, r2e_*, r3c_*, r3e_* de rejeu/talent.js ; DIR des données :
//   la sortie de rejeu/talent_prep.py). Écrit DIR/verdict.json. Lance rejeu/talent_ana.py (python3) sur chaque rejeu.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const ROOT = path.join(__dirname, '..');
const head = fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 30).join('\n') + '\n';
if (crypto.createHash('sha256').update(head).digest('hex') !== REGLES_SHA) { console.error('⛔ les règles (lignes 1–30) ont changé depuis leur écriture : la porte ne conclut pas'); process.exit(3); }
if (!A.runs || !A.data) { console.error('usage : --runs DIR --data DIR'); process.exit(2); }
const R = A.runs, rel = [];
const SHA = cp.execFileSync('node', [path.join(ROOT, 'rejeu/talent.js'), '--sha', '1']).toString().trim();
const RUNS = { r2c: { enc: false, fd: false }, r2e: { enc: true, fd: false }, r3c: { enc: false, fd: true }, r3e: { enc: true, fd: true } };
const meta = f => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
const f32 = f => { const b = fs.readFileSync(path.join(R, f)); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
// 1. chaque rejeu : présent, complet, même code que celui-ci, bonnes options (sinon dit, et la porte ne conclut pas)
for (const [n, o] of Object.entries(RUNS)) {
  const ext = n.startsWith('r2') ? ['', '.fig'] : [''];
  for (const e of ext) {
    try {
      const a = meta(n + '_a' + e + '.json'), b = meta(n + '_b' + e + '.json');
      if (a.from !== 961 || a.to !== 35520 || b.from !== 35520 || b.to !== 70080) rel.push(`${n}${e} : tranches ${a.from}–${a.to} / ${b.from}–${b.to}`);
      [a, b].forEach(m => {
        if (m.codeSha !== SHA) rel.push(`${n}${e} : code ${m.codeSha} ≠ code livré ${SHA}`);
        if (m.encours !== o.enc || m.figuresDecision !== o.fd || m.genome !== 'départ' || m.carnet) rel.push(`${n}${e} : options ${JSON.stringify({ enc: m.encours, fd: m.figuresDecision, g: m.genome, c: m.carnet })}`);
      });
    } catch (err) { rel.push(`${n}${e} : absent ou illisible (${err.message})`); }
  }
}
if (rel.length) { console.log('⛔ REJEUX NON CONFORMES — aucune conclusion :\n  ' + rel.join('\n  ')); fs.writeFileSync(path.join(R, 'verdict.json'), JSON.stringify({ conclu: false, raisons: rel }, null, 1)); process.exit(1); }
// 2. témoins
const out = { regles: REGLES_SHA, code: SHA, temoin: {}, ana: {}, verdict: {} };
for (const L of ['c', 'e']) {
  const g = [...f32(`r2${L}_a.fig`), ...f32(`r2${L}_b.fig`)]; let d = 0, pa = 0, po = 0;
  for (let i = 0; i < g.length; i += 2) { if (g[i] !== g[i + 1]) d++; if (g[i]) pa++; if (g[i + 1]) po++; }
  const nI = g.length / 2;
  const m = meta(`r2${L}_a.json`), nV = m.voices.length, a = [f32(`r2${L}_a`), f32(`r2${L}_b`)], b = [f32(`r3${L}_a`), f32(`r3${L}_b`)], ch = {};
  m.voices.forEach(v => { ch[v] = 0; });
  a.forEach((x, h) => { const y = b[h]; if (x.length !== y.length) throw new Error('R2 / R3 de tailles différentes'); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) ch[m.voices[i % nV]]++; });
  const nPerV = (a[0].length + a[1].length) / nV;
  out.temoin[L] = { T1_figures_differentes: d / nI, figures_avant_parle: pa / nI, figures_ohlc_parle: po / nI, T2_votes_changes: Object.fromEntries(Object.entries(ch).map(([v, c]) => [v, c / nPerV])) };
}
const aveugle = ['c', 'e'].some(L => out.temoin[L].T1_figures_differentes === 0 || !Object.values(out.temoin[L].T2_votes_changes).some(x => x > 0));
// 3. analyses (règles du 03/10, talent_ana.py inchangé)
const ana = (bins) => { cp.execFileSync('python3', ['-I', path.join(ROOT, 'rejeu/talent_ana.py'), A.data, ...bins.map(b => path.join(R, b))], { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 26 });
  return JSON.parse(fs.readFileSync(path.join(R, bins[0]) + '.ana.json', 'utf8')); };
for (const L of ['c', 'e']) {
  out.ana['R1' + L] = ana([`r2${L}_a.fig`, `r2${L}_b.fig`]);
  out.ana['R2' + L] = ana([`r2${L}_a`, `r2${L}_b`]);
  out.ana['R3' + L] = ana([`r3${L}_a`, `r3${L}_b`]);
}
// 4. verdict
const passe = (rec) => Object.entries((rec && rec.h) || {}).filter(([, x]) => x.talent && x.rentable).map(([h]) => h);
const acquis = (rec) => Object.entries((rec && rec.h) || {}).filter(([, x]) => x.talent || x.rentable).map(([h, x]) => h + (x.talent ? 'T' : '') + (x.rentable ? 'R' : ''));
for (const L of ['c', 'e']) {
  const a = passe(out.ana['R1' + L].voix.figures_ohlc), perdus = [];
  for (const [v, rec] of Object.entries(out.ana['R2' + L].voix)) {
    const av = acquis(rec), ap = acquis(out.ana['R3' + L].voix[v]);
    av.forEach(k => { if (!ap.includes(k)) perdus.push(v + ' ' + k); });
  }
  out.verdict[L] = { a_figures_ohlc_talent_et_rentable: a, b_perdus: perdus, avant_figures_talent_et_rentable: passe(out.ana['R1' + L].voix.figures_avant) };
}
out.conclu = !aveugle;
out.entre = !aveugle && ['c', 'e'].every(L => out.verdict[L].a_figures_ohlc_talent_et_rentable.length > 0 && out.verdict[L].b_perdus.length === 0);
fs.writeFileSync(path.join(R, 'verdict.json'), JSON.stringify(out, null, 1));
const pc = x => (x * 100).toFixed(1) + ' %';
console.log(`PORTE FIGURES · règles ${REGLES_SHA.slice(0, 8)}… · code ${SHA}`);
for (const L of ['c', 'e']) {
  const t = out.temoin[L];
  console.log(`  ${L === 'c' ? 'bougies closes' : 'bougie en cours'} : T1 figures différentes ${pc(t.T1_figures_differentes)} (avant parle ${pc(t.figures_avant_parle)}, corrigées ${pc(t.figures_ohlc_parle)}) · T2 votes changés : ` +
    Object.entries(t.T2_votes_changes).filter(([, x]) => x > 0).map(([v, x]) => v + ' ' + pc(x)).join(', '));
  const H = { 1: '15 min', 4: '1 h', 16: '4 h', 96: '24 h' };
  for (const v of ['figures_avant', 'figures_ohlc']) {
    const rec = out.ana['R1' + L].voix[v];
    console.log(`    ${v.padEnd(14)} parle ${pc(rec.parle)} | ` + Object.entries(rec.h).map(([h, x]) => `${H[h]} z ${x.z.toFixed(1)} brut ${x.an1.brut_pb.toFixed(1)}/${x.an2.brut_pb.toFixed(1)}` + (x.talent ? ' TALENT' : '') + (x.joue_an2 ? ` → an2 net ${x.joue_an2.net_pb.toFixed(1)} pb (${x.joue_an2.n} tr.)` : ' → aucun seuil rentable an1')).join(' | '));
  }
  console.log(`    (a) figures_ohlc talent ET rentable : ${out.verdict[L].a_figures_ohlc_talent_et_rentable.join(', ') || 'aucun horizon'} · (b) acquis perdus R2 → R3 : ${out.verdict[L].b_perdus.join(', ') || 'aucun'}`);
}
console.log(aveugle ? '⛔ porte AVEUGLE : aucun verdict, rien n\'entre' : (out.entre ? '✅ ENTRE : getTechSignals lit les figures corrigées' : '❌ N\'ENTRE PAS : la décision garde les figures d\'avant'));
