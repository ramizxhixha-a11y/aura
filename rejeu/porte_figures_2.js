// [GO FIGURES 2 · 14/11/2026] rejeu/porte_figures_2.js — la porte du retrait des figures d'avant (Rams 14/11 19:31 « Go figure 2 », n° 74 du registre).
// RÈGLES ÉCRITES AVANT TOUTE DONNÉE (lignes 1 à 36, empreinte sha-256 vérifiée plus bas ; on ne les retouche pas pour faire passer quoi que ce soit).
// Question : faut-il RETIRER de la décision les figures d'avant — 08 getTechSignals, bloc « signals.pattern » nourri par 06 _detectPatterns(closes)
//   (clôtures seules, poids = sa confiance, il entre dans atScore → scouts, conseils, portes) — sans rien mettre à la place (les figures corrigées
//   ont été refusées par rejeu/porte_figures.js le 27/10) ? L'écran « Patterns chartistes » n'est pas touché.
// Données : celles de la porte TALENT (passation, point 9), inchangées — 12 paires, bougies 15 min Binance du 11/10/2024 au 30/09/2026 (talent_get.sh
//   2024-10 → 2026-09), frais 0,26 %, horizons 15 min / 1 h / 4 h / 24 h, génomes de départ, deux lectures : bougies closes (« c ») et --encours 1 (« e »,
//   la bougie qui s'ouvre, comme l'app vivante). Aucune autre donnée, aucune choisie après coup.
// Code rejoué : celui du commit 7f7233a (token 20261114g), empreinte des extraits de rejeu/talent.js = c6e02dbf439ec63f. Rejeux, chacun dans les deux lectures :
//   R2 (--figures 1) : les voix de l'app telles qu'elles sont livrées (avec les figures d'avant) ; le fichier .fig donne la voix « figures_avant » seule.
//   R4 (--sans-figures 1) : les mêmes voix, getTechSignals sans aucune figure (« const _pats = null; », une seule ancre dans getTechSignals, sinon arrêt).
//   Chaque rejeu analysé par rejeu/talent_ana.py (règles du 03/10, non retouchées).
// Témoin (CLAUDE.md, règle 10) : la porte doit VOIR une différence avant de conclure — T1 = part des bougies × paires où figures_avant parle (R2 .fig ≠ 0) ;
//   T2 = part des votes changés de R2 à R4, voix par voix. Si T1 = 0 ou si aucune voix ne change de R2 à R4, dans l'une des lectures : porte AVEUGLE,
//   aucun verdict, rien n'est retiré.
// Verdict :
//   ENTRE (le bloc des figures est retiré de getTechSignals) si, dans les DEUX lectures :
//   (a) figures_avant n'est TALENT à aucun horizon (z ≥ 3,2 et brut > 0 les deux années, talent_ana.py) ;
//   (b) aucune qualité de R2 n'est perdue dans R4 : pour chaque voix et chaque horizon, « talent » et « rentable » (net > 0 sur l'année 2 au test 2,
//       ≥ 30 trades) comptés SÉPARÉMENT — une qualité présente dans R2 doit l'être dans R4 (même voix, même horizon, même lecture) ;
//   (c) la décision commune apprise (test 3) ne perd rien : à chaque horizon où celle de R2 est rentable (joue_an2 : net > 0, ≥ 30 trades), celle de R4
//       l'est aussi.
//   N'ENTRE PAS sinon : la décision garde les figures d'avant ; les mesures sont dites à Rams telles quelles.
//   Dit, ne décide rien : qualités gagnées de R2 à R4 ; chiffres de la décision commune ; parole et talent de figures_avant.
// Non couvert par ces rejeux (dit à Rams, pas compté) : 10f / 10h « techBonus » (+0,04 par signal technique d'accord avec le sens, plafond 0,25) qui
//   perd la voix de la figure quand elle était d'accord ; l'AA (bougies fabriquées) ; news, gros trades, carnet, liquidations (aucune archive).
// Un rejeu absent, incomplet, d'un autre code, d'autres données ou d'autres options : dit, pas remplacé ; la porte ne conclut pas.
// Fidélité de la livraison (après un ENTRE) : le code livré, rejoué SANS option sur les mêmes données et tranches, doit rendre des votes IDENTIQUES À
//   L'OCTET à R4 dans les deux lectures (option --livre DIR de ce fichier : rejeux l2c_a/_b, l2e_a/_b) ; sinon la livraison n'est pas celle qui a passé.
//
//
//
//
//
//
// (fin des règles)
'use strict';
const REGLES_SHA = '3ca0d0e03989184982f9464050029c50c2421df6222735dbdd13d0a4605b034e';   // lignes 1–36, écrites le 14/11/2026 18:36:11 UTC, avant toute donnée
// usage : node rejeu/porte_figures_2.js --runs DIR --data DIR [--livre DIR]
//   DIR des rejeux : r2c_a, r2c_b, r2e_a, r2e_b (+ .fig), r4c_a, r4c_b, r4e_a, r4e_b de rejeu/talent.js ; DIR des données : la sortie de rejeu/talent_prep.py.
//   --livre DIR : rejeux du code livré sans option (l2c_a, l2c_b, l2e_a, l2e_b) → contrôle de fidélité. Écrit DIR/verdict.json. Lance talent_ana.py.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const ROOT = path.join(__dirname, '..');
const head = fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 36).join('\n') + '\n';
if (crypto.createHash('sha256').update(head).digest('hex') !== REGLES_SHA) { console.error('⛔ les règles (lignes 1–36) ont changé depuis leur écriture : la porte ne conclut pas'); process.exit(3); }
if (!A.runs || !A.data) { console.error('usage : --runs DIR --data DIR [--livre DIR]'); process.exit(2); }
const CODE_PORTE = 'c6e02dbf439ec63f';
const R = A.runs, rel = [];
const DATA_TS = (() => { const k = JSON.parse(fs.readFileSync(path.join(A.data, 'BTC.json'), 'utf8')).k; const t = {}; [961, 35520].forEach(i => { t[i] = k[i] && k[i][0]; }); if (k.length !== 70080) rel.push('données : ' + k.length + ' bougies au lieu de 70 080'); return t; })();
const meta = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
const f32 = (d, f) => { const b = fs.readFileSync(path.join(d, f)); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
// 1. chaque rejeu : présent, complet, même code, mêmes données, bonnes options
const check = (d, n, o, code) => {
  const ext = o.fig ? ['', '.fig'] : [''];
  for (const e of ext) {
    try {
      const a = meta(d, n + '_a' + e + '.json'), b = meta(d, n + '_b' + e + '.json');
      if (a.from !== 961 || a.to !== 35520 || b.from !== 35520 || b.to !== 70080) rel.push(`${n}${e} : tranches ${a.from}–${a.to} / ${b.from}–${b.to}`);
      [a, b].forEach((m, h) => {
        if (code && m.codeSha !== code) rel.push(`${n}${e} : code ${m.codeSha} ≠ ${code}`);
        const nV = m.voices.length, nP = m.pairs.length, f = path.join(d, n + (h ? '_b' : '_a') + e);
        if (!fs.existsSync(f) || fs.statSync(f).size !== (m.to - m.from) * nP * nV * 4) rel.push(`${n}${e} : binaire absent ou incomplet (${f})`);
        if (m.ts0 !== DATA_TS[m.from]) rel.push(`${n}${e} : données d'un autre rejeu (ts0 ${m.ts0} ≠ ${DATA_TS[m.from]})`);
        if (m.encours !== o.enc || !!m.figuresDecision || !!m.sansFigures !== o.sf || m.genome !== 'départ' || m.carnet) rel.push(`${n}${e} : options ${JSON.stringify({ enc: m.encours, fd: m.figuresDecision, sf: m.sansFigures, g: m.genome, c: m.carnet })}`);
      });
    } catch (err) { rel.push(`${n}${e} : absent ou illisible (${err.message})`); }
  }
};
const RUNS = { r2c: { enc: false, sf: false, fig: true }, r2e: { enc: true, sf: false, fig: true }, r4c: { enc: false, sf: true }, r4e: { enc: true, sf: true } };
for (const [n, o] of Object.entries(RUNS)) check(R, n, o, CODE_PORTE);
if (rel.length) { console.log('⛔ REJEUX NON CONFORMES — aucune conclusion :\n  ' + rel.join('\n  ')); fs.writeFileSync(path.join(R, 'verdict.json'), JSON.stringify({ conclu: false, raisons: rel }, null, 1)); process.exit(1); }
// 2. témoins
const out = { regles: REGLES_SHA, code: CODE_PORTE, temoin: {}, ana: {}, verdict: {} };
for (const L of ['c', 'e']) {
  const g = [...f32(R, `r2${L}_a.fig`), ...f32(R, `r2${L}_b.fig`)]; let pa = 0;
  for (let i = 0; i < g.length; i += 2) if (g[i]) pa++;
  const nI = g.length / 2;
  const m = meta(R, `r2${L}_a.json`), nV = m.voices.length, a = [f32(R, `r2${L}_a`), f32(R, `r2${L}_b`)], b = [f32(R, `r4${L}_a`), f32(R, `r4${L}_b`)], ch = {};
  m.voices.forEach(v => { ch[v] = 0; });
  a.forEach((x, h) => { const y = b[h]; if (x.length !== y.length) throw new Error('R2 / R4 de tailles différentes'); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) ch[m.voices[i % nV]]++; });
  const nPerV = (a[0].length + a[1].length) / nV;
  out.temoin[L] = { T1_figures_avant_parle: pa / nI, T2_votes_changes: Object.fromEntries(Object.entries(ch).map(([v, c]) => [v, c / nPerV])) };
}
const aveugle = ['c', 'e'].some(L => out.temoin[L].T1_figures_avant_parle === 0 || !Object.values(out.temoin[L].T2_votes_changes).some(x => x > 0));
// 3. analyses (règles du 03/10, talent_ana.py inchangé)
const ana = (bins) => { cp.execFileSync('python3', ['-I', path.join(ROOT, 'rejeu/talent_ana.py'), A.data, ...bins.map(b => path.join(R, b))], { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 26 });
  return JSON.parse(fs.readFileSync(path.join(R, bins[0]) + '.ana.json', 'utf8')); };
for (const L of ['c', 'e']) {
  out.ana['R1' + L] = ana([`r2${L}_a.fig`, `r2${L}_b.fig`]);
  out.ana['R2' + L] = ana([`r2${L}_a`, `r2${L}_b`]);
  out.ana['R4' + L] = ana([`r4${L}_a`, `r4${L}_b`]);
}
// 4. verdict
const acquis = (rec) => Object.entries((rec && rec.h) || {}).flatMap(([h, x]) => [x.talent ? h + ' talent' : null, x.rentable ? h + ' rentable' : null]).filter(Boolean);
const rentC = (c) => Object.entries(c || {}).filter(([, x]) => x.joue_an2 && x.joue_an2.n >= 30 && x.joue_an2.net_pb > 0).map(([h]) => h);
for (const L of ['c', 'e']) {
  const figT = Object.entries(out.ana['R1' + L].voix.figures_avant.h || {}).filter(([, x]) => x.talent).map(([h]) => h);
  const perdus = [], gagnes = [];
  for (const [v, rec] of Object.entries(out.ana['R2' + L].voix)) {
    const av = acquis(rec), ap = acquis(out.ana['R4' + L].voix[v]);
    av.forEach(k => { if (!ap.includes(k)) perdus.push(v + ' ' + k); });
    ap.forEach(k => { if (!av.includes(k)) gagnes.push(v + ' ' + k); });
  }
  const c2 = rentC(out.ana['R2' + L].commune), c4 = rentC(out.ana['R4' + L].commune);
  out.verdict[L] = { a_figures_avant_talent: figT, b_perdus: perdus, c_commune_perdue: c2.filter(h => !c4.includes(h)), dit_gagnes: gagnes, dit_commune_rentable_R2: c2, dit_commune_rentable_R4: c4 };
}
out.conclu = !aveugle;
out.entre = !aveugle && ['c', 'e'].every(L => out.verdict[L].a_figures_avant_talent.length === 0 && out.verdict[L].b_perdus.length === 0 && out.verdict[L].c_commune_perdue.length === 0);
// 5. fidélité de la livraison (après un ENTRE)
if (A.livre) {
  const rl = rel.length;
  // (relecture adverse du 14/11) le rejeu « livré » doit être celui du code de CE dépôt (empreinte de rejeu/talent.js --sha 1), et pas celui de la porte
  const SHA_DEPOT = cp.execFileSync('node', [path.join(ROOT, 'rejeu/talent.js'), '--sha', '1']).toString().trim();
  if (SHA_DEPOT === CODE_PORTE) rel.push('--livre : le dépôt a encore le code d\'avant (' + SHA_DEPOT + ') — rien n\'est livré');
  check(A.livre, 'l2c', { enc: false, sf: false }, SHA_DEPOT); check(A.livre, 'l2e', { enc: true, sf: false }, SHA_DEPOT);
  const fid = { raisons: rel.slice(rl), identique: {}, codeDepot: SHA_DEPOT };
  if (!fid.raisons.length) for (const L of ['c', 'e']) for (const h of ['a', 'b']) {
    const x = fs.readFileSync(path.join(R, `r4${L}_${h}`)), y = fs.readFileSync(path.join(A.livre, `l2${L}_${h}`)), mx = meta(R, `r4${L}_${h}.json`), my = meta(A.livre, `l2${L}_${h}.json`);
    fid.identique[L + h] = x.equals(y) && JSON.stringify(mx.voices) === JSON.stringify(my.voices);
    fid.codeLivre = my.codeSha;
  }
  fid.ok = !fid.raisons.length && Object.values(fid.identique).length === 4 && Object.values(fid.identique).every(Boolean);
  out.fidelite = fid;
}
fs.writeFileSync(path.join(R, 'verdict.json'), JSON.stringify(out, null, 1));
const pc = x => (x * 100).toFixed(1) + ' %', H = { 1: '15 min', 4: '1 h', 16: '4 h', 96: '24 h' }, sg = x => (x > 0 ? '+' : '') + x.toFixed(1);
console.log(`PORTE FIGURES 2 · règles ${REGLES_SHA.slice(0, 8)}… · code ${CODE_PORTE}`);
for (const L of ['c', 'e']) {
  const t = out.temoin[L], v = out.verdict[L];
  console.log(`  ${L === 'c' ? 'bougies closes' : 'bougie en cours'} : T1 figures_avant parle ${pc(t.T1_figures_avant_parle)} · T2 votes changés : ` +
    (Object.entries(t.T2_votes_changes).filter(([, x]) => x > 0).map(([k, x]) => k + ' ' + pc(x)).join(', ') || 'aucun'));
  const rec = out.ana['R1' + L].voix.figures_avant;
  console.log(`    figures_avant  ` + Object.entries(rec.h).map(([h, x]) => `${H[h]} z ${sg(x.z)}` + (x.talent ? ' TALENT' : '')).join(' | '));
  for (const k of ['R2', 'R4']) console.log(`    commune ${k} : ` + Object.entries(out.ana[k + L].commune).map(([h, x]) => `${H[h]} ` + (x.joue_an2 ? `net ${sg(x.joue_an2.net_pb)} pb (${x.joue_an2.n} tr.)` : 'aucun seuil an1')).join(' | '));
  console.log(`    (a) figures_avant talent : ${v.a_figures_avant_talent.join(', ') || 'aucun'} · (b) perdus : ${v.b_perdus.join(', ') || 'aucun'} · (c) commune perdue : ${v.c_commune_perdue.join(', ') || 'aucune'} · gagnés (dit) : ${v.dit_gagnes.join(', ') || 'aucun'}`);
}
console.log(aveugle ? '⛔ porte AVEUGLE : aucun verdict, rien n\'est retiré' : (out.entre ? '✅ ENTRE : les figures d\'avant sortent de getTechSignals' : '❌ N\'ENTRE PAS : la décision garde les figures d\'avant'));
if (out.fidelite) console.log(out.fidelite.ok ? `✅ FIDÉLITÉ : le code livré (${out.fidelite.codeLivre}) rend les votes de R4 à l'octet (4 tranches)` : '⛔ FIDÉLITÉ : ' + JSON.stringify(out.fidelite));
