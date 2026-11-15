// PORTE des parties MANUELLES de n° 61 et n° 87 — GO N° 61, 15/11/2026 — RÈGLES FIGÉES AVANT TOUTE MESURE (lignes 1 à 45)
// Question : corriger le contrôle de capital des ouvertures MANUELLES (n° 61) et le « libre » des suggestions manuelles (n° 87) change-t-il ce
// que le BOT décide (ouvrir, sens, mise, levier, fermer) sur les vraies données de Rams ? Et la correction agit-elle vraiment sur ses états réels ?
// La correction : 09j validateManualExposure (NOUVELLE) = validateTotalExposure, sauf la phase 5 sans levier, dont le plafond devient le trading
// (déjà débité des mises engagées par 02 openPosition) ; lue par 02 openPosition, 03 _openProposedPosition et 07 manuInvert à la place de
// validateTotalExposure ; 09j getCapitalSummary().free = caisse + trading (sans retrancher une 2e fois les mises). Le bot garde ses chemins.
// Code avant = commit 918ae59 (token 20261114i, main au 15/11 00:15), extrait dans rejeu/out/n61/code_avant ; code après = le dossier de travail.
// Données (fixées ici, aucune choisie après coup) :
//  D1 l'état vivant du pont : le backup demandé par `node rejeu/pont.js backup` pendant la mission (le 1er qui répond) — les 3 modes.
//  D2 les backups du Drive (aura_guardian_full_AAAAMMJJ-HHMMSS.json) : le PREMIER et le DERNIER de chacun des jours 04/10, 05/10, 17/10, 20/10,
//     14/11 (heure du nom ; d'une paire écrite à une seconde d'écart, le nom le plus ancien), plus 20261020-035156 (AA au levier ×10, mesure M6
//     de go talent) : 11 fichiers. Un fichier absent ou illisible est dit, pas remplacé.
//  D3 pour M4 : le dernier backup de D2 dont botAutoMode est true (sinon le dernier de D2, dit).
// Mesures :
//  M0 TÉMOIN — la porte VOIT-elle une différence ? Sur D1 + D2, chaque mode, chaque paire : ce que le BOT lit (09j validateInvestmentCapProvisioned
//     pour la mise ps.stake et pour 30 % du trading (plafond d'02 estimateStakes) ; 09j validateTotalExposure(mise, ps._leverageBonus, conviction
//     0,5 puis 0,8) comme 09c) avec le code avant ET avec la « correction entière » (le plafond sans levier = trading dans la fonction PARTAGÉE,
//     ce que go talent a refusé). Une réponse différente (ok, cap, available, phase5) = une différence vue.
//  M1 — mêmes lectures du bot, code avant contre code après. « Décision différente » = une réponse différente (à 1e-9 $ près).
//  M2 — la correction AGIT-elle ? Sur D1 + D2, chaque mode : pour chaque paire, le contrôle de l'ouverture manuelle (02 openPosition : refus si
//     !ok ET available < la moitié de la mise) pour les mises 10 $, ps.stake (si > 0), 25 %, 50 %, 100 % du trading, levier de la paire ; avant
//     (validateTotalExposure) contre après (validateManualExposure). Compte « refus → accord » et « accord → refus » ; et getCapitalSummary().free,
//     la mise de 02 applyBotSuggestion (min(⌊libre × 0,3⌋, mise proposée)), avant / après.
//  M3 — textes et appels (vrai code des deux dossiers) : (a) au caractère près, avant = après pour 02 estimateStakes, 09j
//     validateInvestmentCapProvisioned et validateTotalExposure, et les fichiers entiers 09c, 10f, 15, 15b ; (b) validateManualExposure n'est
//     appelée QUE par 02 openPosition, 03 _openProposedPosition, 07 manuInvert ; (c) 02 openPosition n'est appelée que par des chemins manuels
//     (quickOpen, applyBotSuggestion, 10e _openManTrade, 03 _openProposedPosition, 07 manuInvert) et par 15b avec { voix: true } (contrôle
//     sauté, inchangé) ; (d) `.free` de getCapitalSummary n'est lu que par 02 applyBotSuggestion et 03 (panneau de la paire), applyBotSuggestion
//     seulement depuis un bouton (onclick). Recherche sur tous les scripts chargés par le HTML, le HTML et js/native-bridge.js.
//  M4 — vraie page (rejeu/sonde_modes.js, D3, AA à l'écran, 2 h simulées, graine 1, code après) avec une mesure injectée qui compte les appels de
//     validateManualExposure, les lectures de getCapitalSummary().free et les contrôles du bot (validateTotalExposure depuis 09c) ; témoin : au
//     moins 1 contrôle du bot. M4b : la liste des ouvertures et fermetures du bot, code avant contre code après, même graine — seulement si le code
//     avant, joué deux fois, donne deux fois la même liste (sinon M4b est dit « non déterministe » et ne compte pas).
// Verdict :
//  ENTRE si M0 voit au moins une différence, M1 n'en montre aucune, M3 (a)–(d) tiennent, M4 compte 0 appel manuel pendant le jeu du bot avec au
//  moins 1 contrôle du bot, M4b est identique (ou dit non déterministe), et M2 montre au moins un « refus → accord » réel et 0 « accord → refus ».
//  N'ENTRE PAS si une décision du bot diffère (M1, M4b), si un chemin du bot lit la correction (M3, M4) ou si M2 montre un « accord → refus ».
//  NON PROUVÉ si M0 ne voit rien ou si M4 n'a aucun contrôle du bot : la porte serait aveugle, rien n'est livré comme prouvé.
//  On ne retouche ni ces règles, ni les données, ni la correction pour la faire passer ; une mesure ajoutée après coup est dite « hors règles ».
// Ce que la porte NE dit PAS : si l'app gagne de l'argent ; si Rams doit ouvrir à la main ; les parties « bot » de n° 61 et n° 87 (02 estimateStakes,
// 09c, 09j partagée) restent au registre telles que go talent les a refusées.
// Empreinte de ces 45 lignes : sha-256 dans PASSATION-AURA8.md (section GO N° 61), avec l'heure UTC d'écriture.
'use strict';
// ── mesure (écrite après l'en-tête, après son empreinte) ──
// usage : node rejeu/porte_n61.js [--avant rejeu/out/n61/code_avant] [--apres .] [--d1 <backup du pont>] [--d2 rejeu/backups/n61] [--m4 rejeu/out/n61]
//         [--out rejeu/out/n61/verdict.json]
// M0, M1, M2 : vrai texte des fonctions de 09j (extrait par nom des deux dossiers), exécuté en vm sur chaque état ; M3 : textes et appels ;
// M4 / M4b : lit les sorties de rejeu/sonde_modes.js --inject rejeu/sondes/n61-m4.js (m4_apres.json, m4_avant.json, m4_avant_bis.json).
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const RACINE = path.join(__dirname, '..');
const AVANT = A.avant || path.join(__dirname, 'out/n61/code_avant'), APRES = A.apres || RACINE;
const D1 = A.d1 || path.join(__dirname, 'backups/pont/aura_guardian_full_20261115-002600.json');
const D2DIR = A.d2 || path.join(__dirname, 'backups/n61'), M4DIR = A.m4 || path.join(__dirname, 'out/n61'), OUT = A.out || path.join(M4DIR, 'verdict.json');
const D2 = ['20261004-030019', '20261004-210405', '20261005-000505', '20261005-210810', '20261017-020445', '20261017-230836', '20261020-005111', '20261020-214340',
  '20261114-012251', '20261114-222803', '20261020-035156'].map(n => path.join(D2DIR, 'aura_guardian_full_' + n + '.json'));
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); if (!m) return null;
  const start = m.index + m[1].length, st = [];
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) {
    const c = src[i], n2 = src[i + 1], top = st[st.length - 1];
    if (top === 't') { if (c === '\\') { i++; continue; } if (c === '`') { st.pop(); continue; } if (c === '$' && n2 === '{') { st.push('x'); i++; } continue; }
    if (c === '/' && n2 === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && n2 === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'") { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '`') { st.push('t'); continue; }
    if (c === '{') { st.push('b'); continue; }
    if (c === '}') { st.pop(); if (!st.length) return src.slice(start, i + 1); }
  }
  throw new Error('fin introuvable : ' + name);
}
const rd = (root, f) => fs.readFileSync(path.join(root, f), 'utf8');
const h = s => crypto.createHash('sha256').update(s).digest('hex');
const R = { regles_sha256: h(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 43).join('\n') + '\n'), donnees: {}, M0: {}, M1: {}, M2: {}, M3: {}, M4: {}, verdict: null };
// les trois variantes de ce que le BOT lit (09j) ; « entière » = la fonction partagée corrigée (refusée le 20/10)
const s9jAv = rd(AVANT, 'js/09j-helpers.js'), s9jAp = rd(APRES, 'js/09j-helpers.js');
const NOMS = ['validateInvestmentCapProvisioned', 'validateTotalExposure', 'getCapitalSummary'];
const texte = (s, plus) => NOMS.concat(plus || []).map(n => fnSrc(s, n)).filter(Boolean).join('\n');
const ANCRE = '  const cap = Math.max(0, (S.tradingAccount || 0) - engaged);';
if (s9jAv.split(ANCRE).length !== 2) throw new Error('ancre de la correction entière absente');
const V = { avant: texte(s9jAv), apres: texte(s9jAp, ['validateManualExposure']), entiere: texte(s9jAv).replace(ANCRE, '  const cap = Math.max(0, S.tradingAccount || 0);') };
const clone = o => JSON.parse(JSON.stringify(o));
function etat(bk, mode) { const S = clone(bk); const w = clone(bk.walletStore[mode] || {}); Object.keys(w).forEach(k => { S[k] = w[k]; }); S.tradingMode = mode; S.openPositions = S.openPositions || []; return S; }
function monde(variante, S) { const c = { S, Math, Number, Object, Array, isFinite, window: {} }; vm.createContext(c); vm.runInContext(V[variante] + '\nvar S = this.S;', c); return c; }
const pareil = (a, b) => JSON.stringify(a) === JSON.stringify(b) || (a && b && ['ok', 'cap', 'available', 'phase5', 'phase5Mode', 'phase5Cap', 'mode', 'autoCap'].every(k => {
  const x = a[k], y = b[k]; return (typeof x === 'number' && typeof y === 'number') ? Math.abs(x - y) <= 1e-9 || (x === y) : x === y; }));
const r2 = x => Math.round(x * 100) / 100;
const fichiers = [['D1', D1]].concat(D2.map(f => ['D2', f]));
const M0 = { lectures: 0, differences: 0, exemples: [] }, M1 = { lectures: 0, differences: 0, exemples: [] };
const M2 = { essais: 0, refusAccord: 0, accordRefus: 0, exemples: [], libre: [] };
fichiers.forEach(([dn, f]) => {
  const nom = path.basename(f).replace('aura_guardian_full_', '').replace('.json', '');
  if (!fs.existsSync(f)) { R.donnees[nom] = 'ABSENT'; return; }
  let env; try { env = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { R.donnees[nom] = 'ILLISIBLE'; return; }
  const bk = env.aura; R.donnees[nom] = dn;
  ['sim', 'paperReal', 'real'].forEach(mode => {
    if (!bk.walletStore || !bk.walletStore[mode]) return;
    const base = etat(bk, mode), T = Number(base.tradingAccount) || 0, paires = Object.keys(base.pairStates || {});
    // M0 / M1 : ce que lit le bot, pour chaque paire
    const lectures = [];
    paires.forEach(p => { const ps = base.pairStates[p] || {}, st = Number(ps.stake) || 0, lb = Number(ps._leverageBonus) || 0;
      [st > 0 ? st : null, T * 0.30].filter(x => x != null && x > 0).forEach(x => { lectures.push(['validateInvestmentCapProvisioned(' + x + ')', p]); lectures.push(['validateTotalExposure(' + x + ', ' + lb + ', 0.5)', p]); lectures.push(['validateTotalExposure(' + x + ', ' + lb + ', 0.8)', p]); }); });
    const rep = {}; ['avant', 'apres', 'entiere'].forEach(v => { const c = monde(v, clone(base)); rep[v] = lectures.map(([code]) => vm.runInContext(code, c)); });
    lectures.forEach(([code, p], i) => {
      M1.lectures++; M0.lectures++;
      if (!pareil(rep.avant[i], rep.apres[i])) { M1.differences++; if (M1.exemples.length < 10) M1.exemples.push({ nom, mode, p, code, avant: rep.avant[i], apres: rep.apres[i] }); }
      if (!pareil(rep.avant[i], rep.entiere[i])) { M0.differences++; if (M0.exemples.length < 6) M0.exemples.push({ nom, mode, p, code, avant: rep.avant[i], entiere: rep.entiere[i] }); }
    });
    // M2 : le contrôle d'une ouverture à la main (02 openPosition : refus si !ok ET available < mise / 2), paires sans position
    const cAv = monde('avant', clone(base)), cAp = monde('apres', clone(base));
    paires.filter(p => !base.openPositions.some(x => x && x.pair === p)).forEach(p => {
      const ps = base.pairStates[p] || {}, lev = Math.max(1, Number(ps.pairLeverage) || 1);
      [10, Number(ps.stake) || 0, T * 0.25, T * 0.5, T].filter((x, i, a) => x > 0 && a.indexOf(x) === i).forEach(x => {
        // 02 openPosition emprunte la part du levier AVANT le contrôle, par 02 borrowLeverage : rien à l'index ×0, rien sous 10 $, borné par la réserve
        // [corrigé après la relecture du 15/11, hors règles : la 1re version ajoutait la part entière même à l'index ×0 — sous-comptait les « refus → accord »]
        const lbDem = x * (lev - 1), lbRes = Math.min(Number(base.leverageReserve) || 0, lbDem), lb = ((Number(base.leverage) || 0) >= 1 && lbRes >= 10) ? lbRes : 0;
        [cAv, cAp].forEach(c => { c.S.leverageBorrowed = (Number(base.leverageBorrowed) || 0) + lb; });
        const a = cAv.validateTotalExposure(x, lb), b = cAp.validateManualExposure(x, lb);
        const ra = !a.ok && a.available < x * 0.5, rb = !b.ok && b.available < x * 0.5;
        M2.essais++;
        if (ra && !rb) { M2.refusAccord++; if (M2.exemples.length < 12) M2.exemples.push({ nom, mode, p, mise: r2(x), trading: r2(T), engage: r2(base.openPositions.reduce((s, q) => s + (Number(q.stakeUsdt) || 0), 0)), avant: r2(a.available) }); }
        if (!ra && rb) M2.accordRefus++;
      });
    });
    // M2b (AJOUTÉE APRÈS LA RELECTURE, hors règles) : « ✓ Appliquer » (02 applyBotSuggestion) jusqu'à l'ouverture — mise demandée, contrôle de capital,
    // puis ce qu'openPosition peut dépenser (trading, + emprunt « juste à temps » base × index − dette à l'index ≥ 1) ; avant / après
    { const ix = Number(base.leverage) || 0, eng = base.openPositions.reduce((s, q) => s + (Number(q.stakeUsdt) || 0), 0);
      const baseCap = Math.max(0, (Number(base.cashAccount) || 0) + T + eng - (Number(base.leverageBorrowed) || 0));
      const ouvrable = T + (ix >= 1 ? Math.max(0, baseCap * Math.min(ix, Number(base.leverageMaxMult) || 10) - (Number(base.leverageBorrowed) || 0)) : 0);
      const fAv = monde('avant', clone(base)).getCapitalSummary().free, fAp = monde('apres', clone(base)).getCapitalSummary().free;
      const cA = monde('avant', clone(base)), cB = monde('apres', clone(base));
      paires.filter(p => !base.openPositions.some(x => x && x.pair === p)).forEach(p => { [Number((base.pairStates[p] || {}).stake) || 0, 100, 1000].filter((x, i, a) => x > 0 && a.indexOf(x) === i).forEach(sug => {
        const sa = Math.min(Math.floor(fAv * 0.3), sug), sb = Math.min(Math.floor(fAp * 0.3), sug, Math.floor(ouvrable));
        const passe = (c, fn, s) => { const r = c[fn](s, 0); return !!(r.ok || r.available >= s * 0.5); };
        const okA = sa >= 5 && passe(cA, 'validateTotalExposure', sa) && sa <= ouvrable, okB = sb >= 5 && passe(cB, 'validateManualExposure', sb) && sb <= ouvrable;
        M2.appliquer = M2.appliquer || { essais: 0, accordRefus: 0, refusAccord: 0, miseChangee: 0, exemples: [] }; const Q = M2.appliquer; Q.essais++;
        if (okA && !okB) Q.accordRefus++; if (!okA && okB) Q.refusAccord++;
        if (okA && okB && sa !== sb) { Q.miseChangee++; if (Q.exemples.length < 6) Q.exemples.push({ nom, mode, p, propose: sug, avant: sa, apres: sb }); }
      }); }); }
    if (base.openPositions.length) { const la = monde('avant', clone(base)).getCapitalSummary().free, lb2 = monde('apres', clone(base)).getCapitalSummary().free;
      M2.libre.push({ nom, mode, positions: base.openPositions.length, libreAvant: r2(la), libreApres: r2(lb2), appliquerAvant: Math.floor(la * 0.3), appliquerApres: Math.floor(lb2 * 0.3) }); }
  });
});
R.M0 = M0; R.M1 = M1; R.M2 = M2;
// M3 — textes et appels
(function () {
  const t = (root, f, n) => n ? fnSrc(rd(root, f), n) : rd(root, f);
  const a = [['js/02-state-init.js', 'estimateStakes'], ['js/09j-helpers.js', 'validateInvestmentCapProvisioned'], ['js/09j-helpers.js', 'validateTotalExposure'],
    ['js/09c-auto-open.js'], ['js/10f-resolveur-cycle.js'], ['js/15-voix-tendance.js'], ['js/15b-tendance-reelle.js']].map(([f, n]) => ({ f, n: n || '(fichier)', egal: t(AVANT, f, n) === t(APRES, f, n) }));
  const html = rd(APRES, 'AURA8_v118.html');
  const files = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(APRES, f)));
  if (!files.includes('js/native-bridge.js')) files.push('js/native-bridge.js');
  const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  const appelants = (re) => { const out = new Set(); files.map(f => [f, rd(APRES, f)]).concat([['HTML', inline]]).forEach(([f, s]) => {
    const fns = [...s.matchAll(/\nfunction ([\w$]+)\s*\(/g)].map(m => [m.index, m[1]]);
    for (const m of s.matchAll(re)) { const line = s.slice(s.lastIndexOf('\n', m.index) + 1, s.indexOf('\n', m.index)); if (/^\s*\/\//.test(line)) continue;
      const before = fns.filter(x => x[0] < m.index).pop(); out.add(f + ':' + (before ? before[1] : '(haut)')); } }); return [...out].sort(); };
  const b = appelants(/validateManualExposure\s*\(/g).filter(x => x !== 'js/09j-helpers.js:validateManualExposure');
  const c = appelants(/\bopenPosition\s*\(/g).filter(x => x !== 'js/02-state-init.js:openPosition');
  const s15b = rd(APRES, 'js/15b-tendance-reelle.js'), voix = [...s15b.matchAll(/openPosition\(([^)]*)\)/g)].map(m => m[1]);
  const libre = []; appelants(/getCapitalSummary\(\)/g).forEach(fx => { const [f, n] = fx.split(':'); if (f === 'js/09j-helpers.js') return;
    const body = fnSrc(f === 'HTML' ? inline : rd(APRES, f), n) || '', vars = [...body.matchAll(/(?:const|let|var)\s+([\w$]+)\s*=\s*(?:typeof getCapitalSummary === 'function' \? )?getCapitalSummary\(\)/g)].map(m => m[1]);
    if (/getCapitalSummary\(\)\.free/.test(body) || vars.some(v => new RegExp('\\b' + v + '\\.free\\b').test(body))) libre.push(fx); });
  const ab = appelants(/applyBotSuggestion\s*\(/g).filter(x => !/:applyBotSuggestion$/.test(x));
  const MAN = ['js/02-state-init.js:applyBotSuggestion', 'js/02-state-init.js:quickOpen', 'js/10e-helpers-adaptatifs.js:_openManTrade', 'js/03-per-pair-position-buttons-controls-buid.js:_openProposedPosition', 'js/07-v90-mode-bunker-sos.js:manuInvert'];
  R.M3 = { a, b, c, voix, libre, appliquer: ab,
    ok_a: a.every(x => x.egal),
    ok_b: JSON.stringify(b) === JSON.stringify(['js/02-state-init.js:openPosition', 'js/03-per-pair-position-buttons-controls-buid.js:_openProposedPosition', 'js/07-v90-mode-bunker-sos.js:manuInvert']),
    ok_c: c.every(x => MAN.includes(x) || x === 'js/15b-tendance-reelle.js:' + x.split(':')[1]) && voix.every(v => /voix: true/.test(v)),
    ok_d: JSON.stringify(libre.sort()) === JSON.stringify(['js/02-state-init.js:applyBotSuggestion', 'js/03-per-pair-position-buttons-controls-buid.js:updatePairAnalysisPanels'])
      && ab.length === 1 && /^js\/07/.test(ab[0]) && /onclick="applyBotSuggestion\(/.test(rd(APRES, 'js/07-v90-mode-bunker-sos.js')) };
})();
// M4 / M4b — sorties de la sonde
(function () {
  const lit = n => { const f = path.join(M4DIR, 'm4_' + n + '.json'); if (!fs.existsSync(f)) return null; try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); return (o.result && o.result.probe) || o.probe || null; } catch (e) { return null; } };
  const ap = lit('apres'), av = lit('avant'), av2 = lit('avant_bis');
  if (!ap) { R.M4 = { absent: true }; return; }
  const liste = p => JSON.stringify(p ? p.ouvertures : null) + '|' + (p ? p.fermetures.length : -1);
  const det = av && av2 && liste(av) === liste(av2);
  R.M4 = { vme: ap.vme, vmeDe: ap.vmeDe, libre: ap.libre, libreDe: ap.libreDe, controlesBot: ap.vteBot, autres: ap.vteAutre, vteDe: ap.vteDe, ouvertures: ap.ouvertures.length, fermetures: ap.fermetures.length,
    M4b: !av ? 'absent' : (!det ? 'non déterministe' : (liste(av) === liste(ap) ? 'identique' : 'DIFFÉRENT')), ouverturesAvant: av ? av.ouvertures.length : null };
})();
// verdict (règles des lignes 1 à 43 ; l'en-tête dit « 45 » : erreur de compte, laissée telle quelle)
(function () {
  const M4 = R.M4, M3 = R.M3;
  if (R.M0.differences === 0 || M4.absent || !(M4.controlesBot >= 1)) { R.verdict = 'NON PROUVÉ — porte aveugle (' + (R.M0.differences === 0 ? 'M0 ne voit rien' : 'M4 sans contrôle du bot') + ')'; return; }
  const botDiff = R.M1.differences > 0 || M4.M4b === 'DIFFÉRENT', botLit = !(M3.ok_a && M3.ok_b && M3.ok_c && M3.ok_d) || M4.vme > 0 || (M4.libre > 0 && Object.keys(M4.libreDe).some(k => !/applyBotSuggestion|updatePairAnalysisPanels/.test(k)));
  if (botDiff || botLit || R.M2.accordRefus > 0) { R.verdict = 'N\'ENTRE PAS — ' + [botDiff && 'décision du bot différente', botLit && 'un chemin du bot lit la correction', R.M2.accordRefus > 0 && 'accord → refus'].filter(Boolean).join(', '); return; }
  if (R.M2.refusAccord < 1) { R.verdict = 'N\'ENTRE PAS — M2 : la correction n\'agit sur aucun état réel'; return; }
  R.verdict = 'ENTRE';
})();
R.horsRegles = [
  'M1 est vrai par construction : les deux fonctions que lit le bot ont le même texte avant / après (M3 a). Que le bot ne lise pas la correction repose sur M3 (statique) et M4 (dynamique, mince : 1 contrôle du bot en 2 h, en AA ; 0 trade en EV).',
  'M4 : un 1er passage (rejeu/out/n61/m4_v1) attribuait les lectures de .free à « js/03-…:? » (flèche anonyme dans un forEach) ; la sonde prend désormais la 1re fonction NOMMÉE de la pile (updatePairAnalysisPanels) et M4 a été rejoué. Avec le verdict tel qu\'écrit, le 1er passage aurait donné N\'ENTRE PAS.',
  'Verdict : les lectures de .free par l\'affichage 03 updatePairAnalysisPanels (lecteur admis par M3 d, panneau masqué) sont mises à part — interprétation écrite après les règles.',
  'M2 : l\'emprunt de la part à levier est modelé comme 02 borrowLeverage (corrigé après la relecture ; la 1re version sous-comptait les « refus → accord »).',
  'M2b ajoutée après la relecture : « ✓ Appliquer » jusqu\'à l\'ouverture (la 1re version de la correction pouvait transformer un accord en refus avec une grosse caisse ; bornée depuis par ce qu\'openPosition peut ouvrir).',
  'M4 rejoué une 3e fois (rejeu/out/n61/m4_v2 = 2e passage) après la borne de « ✓ Appliquer » et deux commentaires (02, 07) : code après = la livraison.'];
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
// résultat compact versionné (rejeu/out/ n'est pas suivi par git)
fs.writeFileSync(path.join(__dirname, 'porte_n61.resultat.json'), JSON.stringify({ regles_sha256: R.regles_sha256, donnees: R.donnees,
  M0: { lectures: R.M0.lectures, differences: R.M0.differences, exemple: R.M0.exemples[0] }, M1: { lectures: R.M1.lectures, differences: R.M1.differences },
  M2: { essais: R.M2.essais, refusAccord: R.M2.refusAccord, accordRefus: R.M2.accordRefus, exemples: R.M2.exemples, libre: R.M2.libre, appliquer: R.M2.appliquer },
  M3: { a: R.M3.ok_a, b: R.M3.ok_b, c: R.M3.ok_c, d: R.M3.ok_d, appelsManuels: R.M3.b, ouvreurs: R.M3.c, libre: R.M3.libre, appliquer: R.M3.appliquer }, M4: R.M4,
  verdict: R.verdict, horsRegles: R.horsRegles }, null, 1) + '\n');
console.log(JSON.stringify({ regles: R.regles_sha256.slice(0, 16), donnees: R.donnees, M0: { lectures: R.M0.lectures, differences: R.M0.differences, ex: R.M0.exemples[0] },
  M1: { lectures: R.M1.lectures, differences: R.M1.differences }, M2: { essais: R.M2.essais, refusAccord: R.M2.refusAccord, accordRefus: R.M2.accordRefus, ex: R.M2.exemples.slice(0, 3), libre: R.M2.libre },
  M3: { a: R.M3.ok_a, b: R.M3.ok_b, c: R.M3.ok_c, d: R.M3.ok_d, appelsManuels: R.M3.b, ouvreurs: R.M3.c, libre: R.M3.libre }, M4: R.M4, appliquer: R.M2.appliquer, verdict: R.verdict }, null, 1));
