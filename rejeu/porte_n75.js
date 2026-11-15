// PORTE du registre n° 75 — GO N° 75, 15/11/2026 — RÈGLES FIGÉES AVANT TOUTE MESURE (lignes 1 à 36)
// Question : corriger l'argent propre de 02 _tradingCapitalBase (base du levier ×N : réserve, plafond d'emprunt, emprunt de l'index, emprunt « juste à
// temps ») change-t-il ce que le BOT décide sur les vraies données de Rams ? Et la correction agit-elle vraiment sur ses états réels ?
// Le défaut : base = caisse + trading + mises engagées − S.leverageBorrowed. La dette totale compte la part « exposition » des positions ouvertes
// (pos.levBorrowed − 02 _posLevCash(pos)), qui n'est jamais entrée dans l'argent : l'argent propre est sous-estimé de cette part tant qu'elle existe.
// La correction (une ligne) : base = caisse + trading + mises engagées − 02 _levCashDebt(S) (la dette versée en argent, que lisent déjà la solvabilité,
// le Bunker, le « net en poche » et la base du P&L). Rien d'autre ne change dans le code ; les commentaires suivent.
// Code avant = commit 40742a4 (token 20261115a), extrait dans rejeu/out/n75/code_avant ; code après = le dossier de travail.
// Règle de décision (celle de GO TALENT, rejeu/porte_registre.js) : une correction lue par la décision, qui ne lit pas le marché, n'entre que si elle laisse
// la décision du bot telle quelle sur les vraies données — sinon ce serait un changement de décision sans talent prouvé.
// Données (fixées ici, aucune choisie après coup) :
//  D1 l'état vivant du pont : le backup demandé par `node rejeu/pont.js backup` pendant la mission (le 1er qui répond) — les 3 modes.
//  D2 les backups du Drive : pour chaque jour du 17/10 au 15/11 qui en a, le DERNIER nom aura_guardian_full_AAAAMMJJ-HHMMSS.json du jour (date du nom),
//     plus 20261020-035156 (AA au levier ×10, déjà pris par go talent et go n° 61). Un fichier absent ou illisible est dit, pas remplacé.
// Mesures M0, M1 : vrai texte des fonctions de 02, 09j, 09c, extrait par nom des deux dossiers, exécuté en vm sur une COPIE de chaque état, chaque mode.
//  M0 TÉMOIN — la porte VOIT-elle la correction ? Par état et par mode : E = Σ part « exposition » des positions ouvertes ; _tradingCapitalBase avant /
//     après. « Correction active » = base après ≠ base avant (à 1e-9 $). Dit aussi (informatif) : trades fermés à part « exposition » dans l'historique.
//  M1 — ce que le BOT lit et fait, avant / après :
//     (a) 02 syncLeverageReserve puis 02 estimateStakes → ps.stake et ps._leverageBonus de chaque paire ;
//     (b) par paire, comme 09c : 02 borrowLeverage(ps._leverageBonus) → montant ; 09j validateTotalExposure(ps.stake, montant, 0,5 puis 0,8) → ok ;
//         02 ensureLeverageCoverForTrade(ps.stake) → action et montant ; repli 09c « trading < 2 planchers » → min(50, 10 % de la réserve) ;
//     (c) l'anticipation du bot (09c : 02 setLeverageByBot de l'index + 1 jusqu'au plafond, arrêt au 1er cran où validateTotalExposure(ps.stake, 0) passe)
//         → le cran retenu et l'emprunt fait (applyAutoLeverageBorrow), ou le refus P6.
//     « Décision différente » = un ok, une action, une mise, un bonus, un cran ou un montant emprunté différent (à 1e-9 $). La réserve seule n'en est pas une.
//  M2 — vraie page : rejeu/sonde_modes.js, backup 20261020-035156, AA à l'écran, AUTO / MANU tels que le backup, 2 h simulées, graine 1, avec la mesure
//     injectée rejeu/sondes/n75-m2.js : ouvertures et fermetures du bot (mode, paire, sens, mise, emprunt, part en argent) et, chaque seconde, E de chaque
//     mode. Code avant contre code après, même graine ; comparé seulement si le code avant, joué deux fois, donne deux fois la même liste (sinon « non
//     déterministe », ne compte pas). Témoin de M2 : secondes où E > 0 dans le code après.
// Verdict :
//  ENTRE si la porte voit (M0 : au moins un état réel où la correction est active, ou M2 : au moins une seconde E > 0) ET si aucune décision du bot ne
//  diffère (M1 : 0 ; M2 : identique ou non déterministe).
//  N'ENTRE PAS si une décision du bot diffère (M1 ou M2) : n° 75 reste au registre avec la différence mesurée ; rien n'est livré dans le code de l'app.
//  NON PROUVÉ si la porte ne voit rien (ni M0 ni M2) : elle serait aveugle ; rien n'est livré dans le code de l'app.
//  On ne retouche ni ces règles, ni les données, ni la correction pour la faire passer ; une mesure ajoutée après coup est dite « hors règles ».
// Ce que la porte NE dit PAS : si l'app gagne de l'argent ; ce que Rams décide lui-même (levier, ouvertures à la main : AUTO / MANU, Rams seul).
// Empreinte de ces 36 lignes : sha-256 dans PASSATION-AURA8.md (section GO N° 75), avec l'heure UTC d'écriture.
'use strict';
// ── mesure (écrite après l'en-tête, après son empreinte) ──
// usage : node rejeu/porte_n75.js [--avant rejeu/out/n75/code_avant] [--apres .] [--d1 <backup du pont>] [--d2 rejeu/backups/n75] [--m2 rejeu/out/n75]
//         [--out rejeu/out/n75/verdict.json]
// M0, M1 : vrai texte des fonctions (extrait par nom des deux dossiers), exécuté en vm sur une copie de chaque état ; M2 : lit les sorties de
// rejeu/sonde_modes.js --inject rejeu/sondes/n75-m2.js (m2_apres.json, m2_avant.json, m2_avant_bis.json).
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const RACINE = path.join(__dirname, '..');
const AVANT = A.avant || path.join(__dirname, 'out/n75/code_avant'), APRES = A.apres || RACINE;
const D1 = A.d1 || path.join(__dirname, 'backups/pont/aura_guardian_full_20261115-014135.json');   // le 1er backup du pont qui a répondu (15/11 00:41 UTC)
const D2DIR = A.d2 || path.join(__dirname, 'backups/n75'), M2DIR = A.m2 || path.join(__dirname, 'out/n75'), OUT = A.out || path.join(M2DIR, 'verdict.json');
const D2 = ['20261017-230838', '20261018-231602', '20261019-215033', '20261020-214342', '20261021-034540', '20261026-231837', '20261027-210236', '20261028-060435',
  '20261029-223131', '20261030-013131', '20261105-182646', '20261107-205835', '20261108-210050', '20261110-214859', '20261111-155225', '20261112-224331',
  '20261113-222247', '20261114-222804', '20261115-012901', '20261020-035156'].map(n => path.join(D2DIR, 'aura_guardian_full_' + n + '.json'));
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); if (!m) return null;
  const start = m.index + m[1].length, st = [];
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) {
    const c = src[i], n2 = src[i + 1], top = st[st.length - 1];
    if (top === 't') { if (c === '\\') { i++; continue; } if (c === '`') { st.pop(); continue; } if (c === '$' && n2 === '{') { st.push('x'); i++; } continue; }
    if (top === 'x' && c === '}') { st.pop(); continue; }
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
const R = { regles_sha256: h(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 36).join('\n') + '\n'), donnees: {}, M0: {}, M1: {}, M2: {}, verdict: null };
const NOMS = { 'js/02-state-init.js': ['_computePortfolio', '_posLevCash', '_levCashDebt', '_tradingCapitalBase', 'syncLeverageReserve', 'applyAutoLeverageBorrow',
  'setLeverageByBot', 'ensureLeverageCoverForTrade', 'estimateStakes', 'borrowLeverage', 'repayLeverage', '_livePairs', 'lmsrP', 'fmt$', 'fmt$2', 'nowStr', 'rndHash'],
  'js/03-per-pair-position-buttons-controls-buid.js': ['_mktOn', '_mktPrice', '_mktP'],
  'js/09j-helpers.js': ['validateInvestmentCapProvisioned', 'validateTotalExposure'], 'js/09c-auto-open.js': ['_stakeFloor', '_stakeRound'] };
function texte(root) { return Object.keys(NOMS).map(f => { const s = rd(root, f); return NOMS[f].map(n => { const t = fnSrc(s, n); if (!t) throw new Error(f + ' : ' + n + ' introuvable (' + root + ')'); return t; }).join('\n'); }).join('\n') + '\nvar MKT_B = 100;\n'; }
const V = { avant: texte(AVANT), apres: texte(APRES) };
const clone = o => JSON.parse(JSON.stringify(o));
function etat(bk, mode) { const S = clone(bk); const w = clone(bk.walletStore[mode] || {}); Object.keys(w).forEach(k => { S[k] = w[k]; }); S.tradingMode = mode; S.openPositions = S.openPositions || []; S.chainLog = []; return S; }
// Math.random figé : les journaux de borrowLeverage / P9 tirent au sort leur écriture, jamais une décision ; deux variantes doivent tirer pareil
function monde(variante, S) { let g = 1; const rnd = () => { g = (g * 16807) % 2147483647; return (g - 1) / 2147483646; };
  const M = Object.create(Math); M.random = rnd;
  const PAIRS = {}; Object.keys(S.pairStates || {}).forEach(p => { PAIRS[p] = { sym: p.split('/')[0], dec: 2 }; });
  const c = { S, PAIRS, Math: M, Number, Object, Array, JSON, isFinite, Date, String, console: { warn() {}, log() {} }, window: {}, showToast() {} };
  vm.createContext(c); vm.runInContext(V[variante] + '\nvar S = this.S;', c); return c; }
const egal = (a, b) => (typeof a === 'number' && typeof b === 'number') ? (Math.abs(a - b) <= 1e-9 || a === b) : JSON.stringify(a) === JSON.stringify(b);
const r2 = x => Math.round(x * 100) / 100;
const expo = S => (S.openPositions || []).reduce((s, p) => { const tot = Math.max(0, Number(p && p.levBorrowed) || 0); if (!(tot > 0)) return s;
  let cash; if (p._levCash !== undefined && p._levCash !== null && isFinite(Number(p._levCash))) cash = Math.min(tot, Math.max(0, Number(p._levCash)));
  else { const st = Number(p.stakeUsdt) || 0, ex = Number(p.totalExposure) || st; cash = Math.min(tot, Math.max(0, tot - Math.max(0, ex - st))); }
  return s + (tot - cash); }, 0);
function frais(o, acc) { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(x => { if (x && typeof x === 'object' && 'exposure' in x && 'notional' in x) { acc.n++; if ((Number(x.exposure) || 0) > (Number(x.notional) || 0) + 0.01) acc.expo++; } else frais(x, acc); }); return; }
  Object.keys(o).forEach(k => frais(o[k], acc)); }
// ce que le bot lit et fait, sur une copie de l'état, dans une variante
function bot(variante, base) {
  const out = {};
  const c0 = monde(variante, clone(base)); out.base = c0._tradingCapitalBase(); c0.syncLeverageReserve(); out.reserve = c0.S.leverageReserve;
  c0.estimateStakes(); const paires = c0._livePairs();
  out.paires = {};
  paires.forEach(p => { const ps = c0.S.pairStates[p] || {}; const st = Number(ps.stake) || 0, lb = Number(ps._leverageBonus) || 0; const o = out.paires[p] = { stake: st, bonus: lb };
    // (b) comme 09c : emprunt du bonus puis contrôle de capital
    const cb = monde(variante, clone(base)); cb.syncLeverageReserve(); const emp = cb.borrowLeverage(lb, p); o.emprunt = emp;
    o.vte05 = cb.validateTotalExposure(st, emp, 0.5).ok; o.vte08 = cb.validateTotalExposure(st, emp, 0.8).ok;
    const cj = monde(variante, clone(base)); cj.syncLeverageReserve(); const j = cj.ensureLeverageCoverForTrade(st, p); o.jit = [j.action, Number(j.borrowed) || 0];
    const cf = monde(variante, clone(base)); cf.syncLeverageReserve();
    o.repli = (Number(cf.S.tradingAccount) || 0) < cf._stakeFloor() * 2 ? ((cf.S.leverageReserve || 0) >= 20 ? Math.max(cf._stakeFloor(), Math.min(50, cf._stakeRound(cf.S.leverageReserve * 0.10))) : 'suspendu') : null;
    // (c) l'anticipation du bot : du cran suivant au plafond, arrêt au 1er cran où le contrôle passe
    const ca = monde(variante, clone(base)); ca.syncLeverageReserve(); const ix0 = Number(ca.S.leverage) || 0, mx = Number(ca.S.leverageMaxMult) || 10, d0 = Number(ca.S.leverageBorrowed) || 0;
    o.anticipe = null;
    for (let i = ix0 + 1; i <= mx; i++) { const r = ca.setLeverageByBot(i, 'porte n75'); const v = ca.validateTotalExposure(st, 0);
      if (r && r.ok === false) { o.anticipe = ['refus', i, r.action, r.reason]; break; }
      if (v.ok) { o.anticipe = ['cran', i, (Number(ca.S.leverageBorrowed) || 0) - d0]; break; } }
    if (!o.anticipe) o.anticipe = ['aucun', (Number(ca.S.leverageBorrowed) || 0) - d0];
  });
  return out;
}
const fichiers = [['D1', D1]].concat(D2.map(f => ['D2', f]));
const M0 = { etats: 0, actifs: 0, exemples: [], fraisExpo: 0, fraisN: 0 }, M1 = { etats: 0, lectures: 0, differences: 0, exemples: [] };
fichiers.forEach(([dn, f]) => {
  const nom = path.basename(f).replace('aura_guardian_full_', '').replace('.json', '');
  if (!fs.existsSync(f)) { R.donnees[nom] = 'ABSENT'; return; }
  let env; try { env = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { R.donnees[nom] = 'ILLISIBLE'; return; }
  const bk = env.aura; R.donnees[nom] = dn;
  ['sim', 'paperReal', 'real'].forEach(mode => {
    if (!bk.walletStore || !bk.walletStore[mode]) return;
    const base = etat(bk, mode); M0.etats++; M1.etats++;
    const acc = { n: 0, expo: 0 }; frais(bk.walletStore[mode], acc); M0.fraisN += acc.n; M0.fraisExpo += acc.expo;
    const av = bot('avant', base), ap = bot('apres', base), E = expo(base);
    const actif = !egal(av.base, ap.base);
    if (actif) { M0.actifs++; if (M0.exemples.length < 12) M0.exemples.push({ nom, mode, E: r2(E), positions: base.openPositions.length, levier: base.leverage || 0, dette: r2(Number(base.leverageBorrowed) || 0),
      baseAvant: r2(av.base), baseApres: r2(ap.base), reserveAvant: r2(av.reserve), reserveApres: r2(ap.reserve) }); }
    Object.keys(av.paires).forEach(p => { const a = av.paires[p], b = ap.paires[p] || {};
      ['stake', 'bonus', 'emprunt', 'vte05', 'vte08', 'jit', 'repli', 'anticipe'].forEach(k => { M1.lectures++;
        if (!egal(a[k], b[k])) { M1.differences++; if (M1.exemples.length < 15) M1.exemples.push({ nom, mode, paire: p, lecture: k, avant: a[k], apres: b[k], E: r2(E) }); } }); });
  });
});
R.M0 = M0; R.M1 = M1;
// M2 — vraie page (sorties de la sonde des modes)
(function () {
  const lit = n => { const f = path.join(M2DIR, n); if (!fs.existsSync(f)) return null; try { return JSON.parse(fs.readFileSync(f, 'utf8')).probe || null; } catch (e) { return null; } };
  const ap = lit('m2_apres.json'), av = lit('m2_avant.json'), av2 = lit('m2_avant_bis.json');
  if (!ap) { R.M2 = { etat: 'absent' }; return; }
  const liste = p => JSON.stringify(p ? p.ouvertures : null) + '|' + JSON.stringify(p ? p.fermetures : null);
  const det = av && av2 && liste(av) === liste(av2);
  R.M2 = { secondesE: ap.secondesE, Emax: ap.Emax, ouvertures: ap.ouvertures.length, fermetures: ap.fermetures.length, ouverturesAvant: av ? av.ouvertures.length : null,
    comparaison: !av ? 'absent' : (!det ? 'non déterministe' : (liste(av) === liste(ap) ? 'identique' : 'DIFFÉRENT')), erreurs: ap.erreurs };
  if (R.M2.comparaison === 'DIFFÉRENT') { const i = ap.ouvertures.findIndex((x, k) => JSON.stringify(x) !== JSON.stringify(av.ouvertures[k])); R.M2.premiereDifference = { rang: i, avant: av.ouvertures[i] || null, apres: ap.ouvertures[i] || null }; }
})();
// Verdict (règles lignes 29–34)
const voit = R.M0.actifs > 0 || (R.M2.secondesE || 0) > 0;
const diff = R.M1.differences > 0 || R.M2.comparaison === 'DIFFÉRENT';
R.verdict = !voit ? 'NON PROUVÉ' : (diff ? "N'ENTRE PAS" : 'ENTRE');
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
console.log('règles sha-256 ' + R.regles_sha256);
console.log('données : ' + Object.keys(R.donnees).length + ' fichiers (' + Object.values(R.donnees).filter(x => x === 'D1' || x === 'D2').length + ' lus)');
console.log('M0 témoin : ' + M0.actifs + ' état(s) sur ' + M0.etats + ' où la correction est active · frais à part « exposition » dans les journaux : ' + M0.fraisExpo + ' / ' + M0.fraisN);
console.log('M1 : ' + M1.differences + ' décision(s) du bot différente(s) sur ' + M1.lectures + ' lectures');
console.log('M2 : ' + JSON.stringify(R.M2));
console.log('VERDICT : ' + R.verdict + '  → ' + OUT);
