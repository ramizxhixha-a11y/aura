// PORTE TALENT des corrections du registre n° 56, 57, 61, 65 — GO TALENT, 20/10/2026 — RÈGLES FIGÉES AVANT TOUTE MESURE (lignes 1 à 32)
// Question : chaque correction change-t-elle ce que le BOT décide (ouvrir, sens, mise, levier, fermer) sur les vraies données de Rams ?
// Le talent de la décision est mesuré ailleurs (portes TALENT / SOURCE : aucun) ; ces corrections ne lisent pas le marché. Elles ne peuvent donc entrer
// que si elles laissent la décision du bot telle quelle sur les vraies données : sinon ce serait un changement de décision sans talent prouvé.
// Code avant = commit 91b6cdd (token 20261019b), copié dans rejeu/code_avant ; code après = les 5 fichiers touchés par GO TALENT (02, 09b2, 09e, 09j, 10h).
// Données (fixées ici, aucune choisie après coup) :
//  D1 l'état réel du 20/10/2026 01:09 (backup du pont, rejeu/backups/pont/aura_guardian_full_20261020-010957.json) : les 3 modes, toutes les paires.
//  D2 le rejeu réel (rejeu/harness.js, EV + RE ensemble, graine 1, réglages par défaut de l'outil) sur les fenêtres consécutives des backups de Rams
//     du 19/10 12:38 → 15:49 → 18:50 → 21:50 (Drive) et du pont 20/10 01:09 : 4 fenêtres. Un backup absent ou illisible est dit, pas remplacé.
//  D3 l'histoire réelle de l'EV : toutes les lignes de trades de l'EV dans D1 (12/09 → 19/10).
// Mesures :
//  M1 (D1, vrai texte des fonctions en vm) : par mode, ce que la décision lit — _computePortfolio, _tradingCapitalBase, validateInvestmentCapProvisioned
//     et validateTotalExposure pour la mise que le bot proposerait (ps.stake de chaque paire), le drawdown du stop Plein Régime, les deux migrations —
//     avant et après ; « décision différente » = un refus devenu accord (ou l'inverse), une mise ou un emprunt différent, un stop déclenché ou non.
//  M2 (D2) : par mode, la liste des décisions du bot (ouvertures : paire, sens, mise, levier ; fermetures : paire, raison, prix) et l'argent final,
//     avant et après, même graine. Différence = un élément de ces listes qui n'est pas identique (mises et argent à 1e-9 $ près).
//  M3 (D3) : ouvertures de l'EV avec levier ; ouvertures où la règle sans levier d'avant (mise ≤ trading − mises engagées) aurait refusé ce que celle
//     d'après accepte, bornée par le plus petit portefeuille de la période (le trading à l'instant n'est pas gardé) ; Plein Régime vu dans D1.
//  M4 (vm, états absents des données : levier actif, Plein Régime allumé, grosses positions manuelles) : ce que chaque correction y change, chiffré,
//     dont le sens de l'argent engagé par le bot (plus / moins / pareil) — DIT à Rams, ne décide pas.
// Verdict, par correction :
//  ENTRE si M1, M2 et M3 ne montrent AUCUNE décision du bot différente : sur les vraies données elle ne touche pas la décision (aucun talent ajouté ni
//  retiré) ; elle rend justes l'argent et les gardes dans les états de M4, dits à Rams.
//  N'ENTRE PAS si une seule décision du bot diffère dans M1, M2 ou M3 : elle reste au registre avec la différence mesurée.
//  Une correction entre entière ou n'entre pas ; on ne retouche ni ces règles, ni les données, ni les corrections pour la faire passer. Si M2 ne
//  produit aucune décision du bot (0 ouverture dans les deux variantes), M2 est dit « vide » et le verdict repose sur M1 et M3, sans plus.
// Ce que la porte NE dit PAS : si l'app gagne de l'argent (non : la décision n'a aucune information, ETAT § 1) ; ce que Rams décide lui-même
// (ses ouvertures manuelles, ses boutons Plein Régime et levier : AUTO / MANU, Rams seul).
// Empreinte de ces 32 lignes : sha-256 dans PASSATION-AURA8.md (section GO TALENT), avec l'heure UTC d'écriture.
'use strict';
// ── mesure (écrite après l'en-tête) ──
// usage : node rejeu/porte_registre.js [--avant rejeu/code_avant] [--apres .] [--d1 <backup D1>] [--m2 rejeu/out/porte] [--out rejeu/out/porte/verdict.json]
// M1, M3, M4 : vrai texte des fonctions (extrait par nom des fichiers js/ des deux variantes), exécuté en vm sur l'état de D1.
// M2 : lit les sorties de rejeu/harness.js (avant_wK.json / apres_wK.json) écrites par la session (4 fenêtres, une à la fois).
const fs = require('fs'), vm = require('vm'), path = require('path');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const RACINE = path.join(__dirname, '..');
const AVANT = A.avant || path.join(__dirname, 'code_avant'), APRES = A.apres || RACINE;
const D1 = A.d1 || path.join(__dirname, 'backups/pont/aura_guardian_full_20261020-010957.json');
const M2DIR = A.m2 || path.join(__dirname, 'out/porte'), OUT = A.out || path.join(M2DIR, 'verdict.json');
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
function iife(src, name) {   // une migration « une fois » : (function NAME(){ … })();
  const i = src.indexOf('(function ' + name + '(){'); if (i < 0) throw new Error('migration absente : ' + name);
  const j = src.indexOf('})();', i); return src.slice(i, j + 5);
}
const FICHIERS = ['js/02-state-init.js', 'js/03-per-pair-position-buttons-controls-buid.js', 'js/09b2-save-load.js', 'js/09e-guards.js', 'js/09j-helpers.js', 'js/10h-pont-fullpower-bricks.js', 'js/10g-resolveur-ev-csv.js'];
const FONCTIONS = ['_posLevCash', '_levCashDebt', '_computePortfolio', '_computePortfolioSans', '_tradingCapitalBase', '_checkPaperRealStakeLimit',
  'guardianCheck', 'botRescue', 'validateInvestmentCapProvisioned', 'validateTotalExposure', '_fpEquity', '_fpEmergencyCheck', 'enableFullPowerMode', 'disableFullPowerMode', '_oneShotEtatVecu', '_oneShotEpargne'];
function charge(root) {
  const src = FICHIERS.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  const morceaux = FONCTIONS.map(n => fnSrc(src, n)).filter(Boolean);
  return { texte: morceaux.join('\n') + '\n', src, a: FONCTIONS.filter(n => fnSrc(src, n)) };
}
const V = { avant: charge(AVANT), apres: charge(APRES) };
const bk = JSON.parse(fs.readFileSync(D1, 'utf8')).aura;
const NOM = { sim: 'AA', paperReal: 'EV', real: 'RE' };
const clone = o => JSON.parse(JSON.stringify(o));
// S d'un mode : champs du portefeuille du mode (comme les accesseurs de 02) + champs globaux du backup
function etat(mode, retouche) {
  const S = clone(bk); const w = clone(bk.walletStore[mode]);
  Object.keys(w).forEach(k => { S[k] = w[k]; }); S.tradingMode = mode; S.chainLog = []; S.agents = S.agents || [];
  if (retouche) retouche(S); return S;
}
function ctx(variante, S, ls) {
  const traces = { closes: [], toasts: [], disable: 0 };
  const c = { S, console, Math, JSON, Number, Object, Array, String, isFinite, Date,
    window: {}, document: { getElementById: () => null },
    localStorage: ls || { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); } },
    showToast: (m) => traces.toasts.push(String(m)), rndHash: () => 'h', nowStr: () => '00:00',
    closePosition: (id) => { traces.closes.push(id); const i = S.openPositions.findIndex(p => p.id === id); if (i >= 0) { const p = S.openPositions[i]; S.tradingAccount += (p.stakeUsdt || 0) + (p.pnlUsdt || 0); S.openPositions.splice(i, 1); } },
    renderHome() {}, updateStreakBadge() {}, renderAgentsSection() {},
    _getPairAdaptiveProfile: () => ({ stakePct: 5 }), _checkCorrelationLimit: () => null, _getSharpeAllocMult: () => 1, _botPredict() {}, _genomeOf: () => ({}), _setBot() {},
    _stateReady: true, setInterval: (f) => { f(); return 1; }, clearInterval() {}, saveState() {} };   // _stateReady : les migrations attendent l'état chargé
  c.window = c; vm.createContext(c);
  vm.runInContext(V[variante].texte, c);
  c.__t = traces; return c;
}
const ecart = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
const R = { regles_sha256: null, M1: {}, M2: {}, M3: {}, M4: {}, verdict: {} };
// l'en-tête figé fait 31 lignes (sa 1re ligne dit « 1 à 32 » : erreur de compte, laissée telle quelle) — sha-256 de `head -31` = a13c0715…d56e57
try { R.regles_sha256 = require('crypto').createHash('sha256').update(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 31).join('\n') + '\n').digest('hex'); } catch (e) {}

// ── M1 : état réel D1, ce que la décision lit, avant / après ──
const diff1 = { 56: [], 57: [], 61: [], 65: [] };
['sim', 'paperReal', 'real'].forEach(mode => {
  const ligne = {};
  ['avant', 'apres'].forEach(v => {
    const S = etat(mode); const c = ctx(v, S);
    const r = { portefeuille: c._computePortfolio(), base: c._tradingCapitalBase(), paires: {} };
    S.portfolio = r.portefeuille;
    Object.keys(S.pairStates || {}).forEach(p => {
      const ps = S.pairStates[p]; const mise = Number(ps.stake) || 0; const essai = mise > 0 ? mise : 0.30 * Math.max(10, S.tradingAccount);   // mise du bot, sinon la plus grande que estimateStakes permet
      const p5 = c.validateInvestmentCapProvisioned(essai), te = c.validateTotalExposure(essai, 0, 0.5);
      r.paires[p] = { essai: +essai.toFixed(6), p5ok: p5.ok, te: te.ok, plafond5: mode === 'paperReal' ? c._checkPaperRealStakeLimit(essai, p, 'long') : null };
    });
    const fpAvant = S.fullPowerMode === true; c._fpEmergencyCheck(); r.fp = { allume: fpAvant, stop: c.__t.closes.length };
    ligne[v] = r;
  });
  R.M1[NOM[mode]] = ligne;
  if (ecart(ligne.avant.portefeuille, ligne.apres.portefeuille) || ecart(ligne.avant.base, ligne.apres.base)) diff1[56].push(NOM[mode] + ' portefeuille/base');
  Object.keys(ligne.avant.paires).forEach(p => {
    const a = ligne.avant.paires[p], b = ligne.apres.paires[p];
    if (a.p5ok !== b.p5ok || a.te !== b.te) diff1[61].push(NOM[mode] + ' ' + p);
    if (ecart(a.plafond5, b.plafond5)) diff1[56].push(NOM[mode] + ' ' + p + ' plafond 5 %');
  });
  if (ecart(ligne.avant.fp, ligne.apres.fp)) diff1[57].push(NOM[mode]);
});
// migrations sur l'état réel D1 (drapeaux absents : le pire cas, localStorage perdu)
const mig = {};
['avant', 'apres'].forEach(v => {
  const S = etat('paperReal', s => { s._restoredSavedAt = bk.savedAt; }); const c = ctx(v, S);
  vm.runInContext(iife(V[v].src, '_etage1Migration') + '\n' + iife(V[v].src, '_upgradeFeeRates'), c);
  mig[v] = { maxPos: S.paperRealConfig.maxConcurrentPos, frais: S.feeConfig };
});
R.M1.migrations = mig; if (ecart(mig.avant, mig.apres)) diff1[65].push('migrations sur D1');
R.M1.differences = diff1;

// ── M3 : histoire réelle de l'EV (D1) ──
// Lignes de trades de l'EV : type « open » = ouverture (sens buy / sell), type « position » = fermeture. Portefeuille de la période : les débuts et fins
// de journée de pnlPeriod.history depuis le jour de la première ligne (le trading à l'instant n'est pas gardé). La caisse à l'instant non plus : la
// caisse du jour de D1 est prise (6,58 $). Règle d'avant : refus si mise > trading − mises engagées ; d'après : refus si mise > trading.
(function () {
  const w = bk.walletStore.paperReal, lignes = [];
  Object.keys(w.pairStates || {}).forEach(p => ((w.pairStates[p] || {}).trades || []).forEach(t => lignes.push(Object.assign({ pair: p }, t))));
  lignes.sort((x, y) => (x.ts || 0) - (y.ts || 0));
  const ouvertures = lignes.filter(t => t.type === 'open'), fermetures = lignes.filter(t => t.type === 'position');
  const j0 = ouvertures.length ? new Date(ouvertures[0].ts).toISOString().slice(0, 10) : '9999';
  const jours = ((w.pnlPeriod || {}).history || []).filter(h => h && h.date >= j0);
  const pfJour = {}; jours.forEach(h => { pfJour[h.date] = Math.min(Number(h.start) || Infinity, Number(h.end) || Infinity); });
  const pfMin = jours.length ? Math.min.apply(null, jours.map(h => pfJour[h.date])) : null, caisse = Number(w.cashAccount) || 0;
  const ouv = {}; let pire = null; const signal = [], signalJour = [];
  lignes.forEach(t => {
    if (t.type === 'position') { delete ouv[t.pair]; return; }
    if (t.type !== 'open') return;
    const eng = Object.keys(ouv).reduce((s, k) => s + ouv[k], 0), mise = Number(t.stakeUsdt) || 0;
    const tr = pfMin != null ? pfMin - caisse - eng : null;   // borne de la règle (portefeuille le plus petit de la période)
    if (tr != null && mise > tr - eng && mise <= tr) signal.push({ pair: t.pair, ts: t.ts, eng: +eng.toFixed(2), mise: +mise.toFixed(2), tradingBorne: +tr.toFixed(2) });
    const pj = pfJour[new Date(t.ts).toISOString().slice(0, 10)];   // lecture plus serrée, HORS règle : le portefeuille du jour de la ligne
    if (pj != null && isFinite(pj)) { const trj = pj - caisse - eng; if (mise > trj - eng && mise <= trj) signalJour.push({ pair: t.pair, ts: t.ts, eng: +eng.toFixed(2), mise: +mise.toFixed(2), tradingJour: +trj.toFixed(2) }); }
    if (!pire || eng + mise > pire.eng + pire.mise) pire = { pair: t.pair, ts: t.ts, eng: +eng.toFixed(2), mise: +mise.toFixed(2) };
    ouv[t.pair] = mise;
  });
  R.M3 = { lignes: lignes.length, ouvertures: ouvertures.length, fermetures: fermetures.length, avecLevier: lignes.filter(t => (Number(t.levBorrowed) || 0) > 0).length,
    pleinRegimeDansD1: bk.fullPowerMode === true, portefeuilleMin: pfMin, plusGrosEngagement: pire,
    ouverturesQueLaRegleDavantRefuserait: signal.length, signalees: signal.slice(0, 40),
    lectureDuJour_horsRegle: { n: signalJour.length, lignes: signalJour.slice(0, 40) },
    fait: 'chaque ligne est une ouverture FAITE sous la règle d\'avant (02 openPosition et 09c passent par validateTotalExposure → phase 5) : elle ne l\'a pas refusée',
    limite: 'l\'historique ne garde que les ouvertures faites : un refus du bot n\'y laisse aucune ligne' };
})();

// ── M4 : états absents des données (vm, vrai texte des fonctions) — dit à Rams, ne décide pas ──
(function () {
  const ev = () => etat('paperReal');
  const own0 = (() => { const S = ev(); return ctx('avant', S)._computePortfolio(); })();
  const sc = {};
  // (a) levier ×1 de l'index : emprunt « juste à temps » versé en ARGENT au trading (dette en argent = emprunt), comme 02 applyAutoLeverageBorrow
  sc.levierArgent = {};
  ['avant', 'apres'].forEach(v => {
    const S = ev(); const B = own0; S.leverage = 1; S.leverageBorrowed = B; S._autoLevBorrowed = B; S.tradingAccount += B;
    const c = ctx(v, S); const pf = c._computePortfolio(); S.portfolio = pf;
    sc.levierArgent[v] = { emprunt: +B.toFixed(2), portefeuille: +pf.toFixed(2), base: +c._tradingCapitalBase().toFixed(2), plafondMiseEV5pc: +c._checkPaperRealStakeLimit(1e9, 'BTC/USDT', 'long').toFixed(2) };
  });
  // (b) une position du bot avec BONUS de levier (part « exposition », jamais versée au trading) : 500 $
  sc.levierExposition = {};
  ['avant', 'apres'].forEach(v => {
    const S = ev(); const st = 50; S.tradingAccount -= st; S.leverage = 1; S.leverageBorrowed = 500;
    S.openPositions = [{ id: 'x', pair: 'BTC/USDT', side: 'long', auto: true, stakeUsdt: st, levBorrowed: 500, _levCash: 0, totalExposure: st + 500, pnlUsdt: 0 }];
    const c = ctx(v, S); const base = c._tradingCapitalBase();
    sc.levierExposition[v] = { portefeuille: +c._computePortfolio().toFixed(2), base: +base.toFixed(2), reserveLevierX10: +(base * 10).toFixed(2) };
  });
  // (c) Plein Régime allumé (bouton de Rams ou levier du bot), puis les ouvertures du bot une à une, chacune au plafond de 5 % du portefeuille
  //     (3 positions au plus : paperRealConfig.maxConcurrentPos), sans aucun mouvement de prix ; puis une vraie perte de 6 % du capital
  sc.pleinRegime = {};
  ['avant', 'apres'].forEach(v => {
    const S = ev(); const c = ctx(v, S); S.portfolio = c._computePortfolio();
    c.enableFullPowerMode(); const init = S._fpInitialCapital; const pas = [];
    for (let i = 1; i <= 3 && !c.__t.closes.length; i++) {
      const mise = 0.05 * c._computePortfolio(); S.tradingAccount -= mise;
      S.openPositions.push({ id: 'bot' + i, pair: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'][i - 1], side: 'long', auto: true, stakeUsdt: mise, pnlUsdt: 0 });
      c._fpEmergencyCheck(); pas.push({ ouverture: i, mise: +mise.toFixed(2), stop: c.__t.closes.length > 0, fermees: c.__t.closes.length, pleinRegime: S.fullPowerMode === true });
    }
    let r2 = null;
    if (!c.__t.closes.length) { S.openPositions[0].pnlUsdt = -0.06 * init; c._fpEmergencyCheck(); r2 = { stop: c.__t.closes.length > 0, fermees: c.__t.closes.length }; }
    sc.pleinRegime[v] = { capitalInitial: +init.toFixed(2), ouvertures: pas, vraiePerte6pc: r2 };
  });
  // (e) migrations « une fois » : localStorage perdu, état VÉCU où Rams a réglé 1 position simultanée et des frais à 0,08 %
  sc.migrationsEtatVecu = {};
  ['avant', 'apres'].forEach(v => {
    const S = etat('paperReal', s2 => { s2._restoredSavedAt = bk.savedAt; s2.paperRealConfig.maxConcurrentPos = 1; s2.feeConfig.makerRate = 0.0008; s2.feeConfig.takerRate = 0.0008; });
    const c = ctx(v, S); vm.runInContext(iife(V[v].src, '_etage1Migration') + '\n' + iife(V[v].src, '_upgradeFeeRates'), c);
    sc.migrationsEtatVecu[v] = { maxPos: S.paperRealConfig.maxConcurrentPos, maker: S.feeConfig.makerRate, taker: S.feeConfig.takerRate };
  });
  // (f) [ajouté après la relecture, C3 / C4] sous levier, les deux autres lecteurs de S.portfolio dans la décision : gardien de risque (03 guardianCheck,
  //     65 % du portefeuille) et Rescue Bot (03 botRescue, −12 % du point de départ) ; puis une dette plus grande que l'avoir (portefeuille borné à 0)
  sc.levierGardiens = {};
  ['avant', 'apres'].forEach(v => {
    const S = ev(); S.leverage = 1; S.leverageBorrowed = own0; S._autoLevBorrowed = own0; S.tradingAccount += own0 - 700;
    S.openPositions = [{ id: 'a', pair: 'BTC/USDT', side: 'long', stakeUsdt: 700, levBorrowed: 0, auto: true, pnlUsdt: 0 }];
    const c = ctx(v, S); S.portfolio = c._computePortfolio(); const g = c.guardianCheck('risk_bot_v1', 'LONG', 'ETH/USDT', 10).status;
    const R = ev(); R.leverage = 1; R.leverageBorrowed = own0; R._autoLevBorrowed = own0; R.tradingAccount += own0 - 300; R._startPortfolio = own0; R.botFleet = { rescue_bot_v1: { contributions: 0 } };
    R.openPositions = [{ id: 'r', pair: 'BTC/USDT', side: 'long', stakeUsdt: 300, levBorrowed: 0, auto: true, pnlUsdt: 0 }];
    const cr = ctx(v, R); R.portfolio = cr._computePortfolio() - 140; const rr = cr.botRescue();
    const D = ev(); D.tradingAccount = 0; D.cashAccount = 6.58; D.leverage = 1; D.leverageBorrowed = 30; D.openPositions = [{ id: 'd', pair: 'BTC/USDT', stakeUsdt: 10, levBorrowed: 0, auto: true, pnlUsdt: 0 }];
    const cdd = ctx(v, D); D.portfolio = cdd._computePortfolio();
    sc.levierGardiens[v] = { gardienRisque700: g, rescuePerte140: (rr && rr.action) || null, rescueFermees: cr.__t.closes.length,
      detteSupAvoir: { portefeuille: +D.portfolio.toFixed(2), plafond5pcPourMise50: +cdd._checkPaperRealStakeLimit(50, 'BTC/USDT', 'long').toFixed(2), gardienRisque: cdd.guardianCheck('risk_bot_v1', 'LONG', 'BTC/USDT', 5).status } };
  });
  // (d) grosse position MANUELLE de Rams (900 $), puis la plus grande mise que estimateStakes donnerait au bot (30 % du trading)
  sc.grossePositionManuelle = {};
  ['avant', 'apres'].forEach(v => {
    const S = ev(); const m = 900; S.tradingAccount -= m;
    S.openPositions = [{ id: 'man', pair: 'ETH/USDT', side: 'long', auto: false, stakeUsdt: m, pnlUsdt: 0 }];
    const c = ctx(v, S); const k = 0.30 * Math.max(10, S.tradingAccount); const p5 = c.validateInvestmentCapProvisioned(k), te = c.validateTotalExposure(k, 0, 0.5);
    sc.grossePositionManuelle[v] = { trading: +S.tradingAccount.toFixed(2), miseBot: +k.toFixed(2), plafondPhase5: +p5.cap.toFixed(2), accordee: te.ok };
  });
  R.M4 = sc;
})();

// ── M2 : rejeu réel (sorties de rejeu/harness.js) ──
(function () {
  const f = fs.existsSync(M2DIR) ? fs.readdirSync(M2DIR) : [];
  const ks = [...new Set(f.map(n => (n.match(/^(?:avant|apres)_w(\d+)\.json$/) || [])[1]).filter(Boolean))].sort((a, b) => a - b);   // les fichiers « _bis » sont le contrôle
  const fen = {}; let vide = true, diff = false;
  ks.forEach(k => {
    const pa = path.join(M2DIR, 'avant_w' + k + '.json'), pb = path.join(M2DIR, 'apres_w' + k + '.json');
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) { fen['w' + k] = 'incomplète'; return; }
    const a = JSON.parse(fs.readFileSync(pa, 'utf8')), b = JSON.parse(fs.readFileSync(pb, 'utf8'));
    const dec = r => decisions(r);
    const da = dec(a), db = dec(b);
    if (da.ouvertures.length || db.ouvertures.length || da.fermetures.length || db.fermetures.length || da.re.trades || db.re.trades) vide = false;
    // la RÈGLE (M2) : listes de décisions du bot (ouvertures, fermetures, RE) et argent final ; l'empreinte du résultat entier est dite à part (hors règle)
    const regle = x => ({ ouvertures: x.ouvertures, fermetures: x.fermetures, re: x.re, argent: x.argent });
    const d = ecart(regle(da), regle(db)); if (d) diff = true;
    fen['w' + k] = { avant: resume(da), apres: resume(db), identique: !d, resultatEntierIdentique_horsRegle: da.tout === db.tout };
    const pc = path.join(M2DIR, 'avant_w' + k + '_bis.json');   // contrôle : le MÊME code rejoué deux fois (le harnais est-il déterministe ?)
    if (fs.existsSync(pc)) { const dc = decisions(JSON.parse(fs.readFileSync(pc, 'utf8'))); fen['w' + k].controle_avant_bis = { decisionsIdentiques: !ecart(regle(da), regle(dc)), resultatEntierIdentique: da.tout === dc.tout, decisionsNotees: dc.decisionsNotees }; }
  });
  R.M2 = { fenetres: fen, vide: ks.length ? vide : null, difference: diff };
})();
function decisions(r) {   // sortie de rejeu/harness.js : result.trades / open / pos (EV), reTrades / rePos (RE), argent de fin, et TOUT le résultat
  const x = r.result || {};
  const ouvertures = [].concat((x.open || []).map(t => ['EV', t.pair, t.side, t.stakeUsdt, t.levBorrowed || 0]), (x.pos || []).map(t => ['EV', t.pair, t.side, t.stakeUsdt, t.levBorrowed || 0]));
  const fermetures = (x.trades || []).map(t => ['EV', t.pair, t.side, t.reason || t.why || '', t.price || t.exit || 0, t.stakeUsdt || 0]);
  return { ouvertures, fermetures, re: { positions: x.rePos, trades: x.reTrades }, argent: x.end || null, decisionsNotees: ((x.thr || {}).rec || []).length,
    // empreinte du résultat ENTIER (journal des décisions notées, marché, votes, chaîne, sièges, argent) : deux rejeux identiques au caractère près
    tout: require('crypto').createHash('sha256').update(JSON.stringify(x)).digest('hex') };
}
function resume(d) { return { ouvertures: d.ouvertures.length, fermetures: d.fermetures.length, re: d.re, argent: d.argent && d.argent.portfolio, decisionsNotees: d.decisionsNotees, empreinte: d.tout.slice(0, 16) }; }

// ── M5 (AJOUTÉ APRÈS LA RELECTURE ADVERSE, hors règles figées) : n° 61 tel qu'il était proposé ──
// La relecture (agent séparé, 20/10) a montré un chemin que M1 / M2 / M3 ne pouvaient pas voir : 02 estimateStakes rogne ps.stake à la phase 5, et 10f
// prend ps.stake pour plancher de la mise du bot. M3 était aveugle : sa borne (91,26 $, le 13/09) date d'avant l'apport de 1 033 $ du 17/09.
(function () {
  const s9j = fs.readFileSync(path.join(AVANT, 'js/09j-helpers.js'), 'utf8');
  const v61 = fnSrc(s9j, 'validateInvestmentCapProvisioned');
  const p61 = v61.replace('const cap = Math.max(0, (S.tradingAccount || 0) - engaged);', 'const cap = Math.max(0, S.tradingAccount || 0);');
  const s02 = fs.readFileSync(path.join(AVANT, 'js/02-state-init.js'), 'utf8');
  const P = Object.keys(bk.walletStore.paperReal.pairStates || {}), tenues = P.slice(0, 7), T = 625, E = 449.5;   // état calqué sur l'EV du 17/10 (7 positions, 449,50 $ engagés)
  const r = {};
  [['avant', v61], ['propose', p61]].forEach(([nom, txt]) => {
    const S = { tradingMode: 'paperReal', cashAccount: 6.58, tradingAccount: T, leverage: 0, leverageBorrowed: 0, leverageReserve: (T + E + 6.58) * 10, agents: [], pairStates: {},
      paperRealConfig: { maxStakePct: 5 }, openPositions: tenues.map((p, i) => ({ id: 'o' + i, pair: p, stakeUsdt: E / 7, totalExposure: E / 7, auto: true })) };
    const libre = P.find(p => !tenues.includes(p)); P.forEach(p => { S.pairStates[p] = { _p: p === libre ? 0.95 : 0.5, stake: 0 }; });
    const c = { S, Math, Number, Object, Array, PAIRS: Object.fromEntries(P.map(p => [p, {}])), lmsrP: ps => ps._p, rndHash: () => 'h', nowStr: () => '00:00', borrowLeverage: () => 0, console: { log() {}, warn() {} } };
    vm.createContext(c); vm.runInContext([fnSrc(s02, '_livePairs'), fnSrc(s02, '_tradingCapitalBase'), txt, fnSrc(s02, 'estimateStakes')].join('\n'), c);
    try { c.estimateStakes(); r[nom] = { paire: libre, psStake: +(Number(S.pairStates[libre].stake) || 0).toFixed(2) }; } catch (e) { r[nom] = { erreur: String(e).slice(0, 120) }; }
  });
  // dans l'histoire de l'EV : ouvertures où la phase 5 d'avant rognait la plus grande mise d'estimateStakes (30 % du trading) : engagé > 70 % du trading du jour
  const w = bk.walletStore.paperReal, lignes = [], pfJour = {};
  ((w.pnlPeriod || {}).history || []).forEach(h => { pfJour[h.date] = Math.min(Number(h.start) || Infinity, Number(h.end) || Infinity); });
  Object.keys(w.pairStates || {}).forEach(p => ((w.pairStates[p] || {}).trades || []).forEach(t => lignes.push(Object.assign({ pair: p }, t))));
  lignes.sort((x, y) => (x.ts || 0) - (y.ts || 0));
  const ouv = {}, etats = [];
  lignes.forEach(t => {
    if (t.type === 'position') { delete ouv[t.pair]; return; } if (t.type !== 'open') return;
    const eng = Object.keys(ouv).reduce((a, k) => a + ouv[k], 0), j = new Date(t.ts).toISOString().slice(0, 10), pf = pfJour[j];
    if (pf != null && isFinite(pf)) { const tr = pf - (Number(w.cashAccount) || 0) - eng; if (eng > 0.7 * tr) etats.push({ jour: j, pair: t.pair, eng: +eng.toFixed(2), tradingJour: +tr.toFixed(2) }); }
    ouv[t.pair] = Number(t.stakeUsdt) || 0;
  });
  R.M5 = { estimateStakes: r, etatsDeLHistoire: { n: etats.length, lignes: etats.slice(0, 20) } };
})();

// ── M6 (AJOUTÉ APRÈS LA RELECTURE, hors règles figées) : n° 56 tel qu'il était proposé, sur l'AA RÉELLE de Rams au levier ×10 ──
// Backup du Drive du 20/10 03:51 (heure de la tablette) : AA à l'index ×10 (6 282,96 $ empruntés au trading, posés par Rams), 3 positions du bot de
// 307 à 341 $. La correction proposée (portefeuille = argent à soi, borné à 0) y change la réponse du gardien de risque (03 guardianCheck risk_bot_v1).
(function () {
  const D4 = A.d4 || path.join(__dirname, 'backups/drive-0351/aura_guardian_full_20261020-035156.json');
  if (!fs.existsSync(D4)) { R.M6 = 'backup absent : ' + D4; return; }
  const b4 = JSON.parse(fs.readFileSync(D4, 'utf8')).aura;
  const s02 = fs.readFileSync(path.join(AVANT, 'js/02-state-init.js'), 'utf8'), s03 = fs.readFileSync(path.join(AVANT, 'js/03-per-pair-position-buttons-controls-buid.js'), 'utf8');
  const pAvant = fnSrc(s02, '_computePortfolio');
  const p56 = pAvant.replace('return (o.cashAccount || 0) + (o.tradingAccount || 0) + eng;', 'return Math.max(0, (o.cashAccount || 0) + (o.tradingAccount || 0) + eng - _levCashDebt(o, null));');
  if (p56 === pAvant) { R.M6 = 'ancre absente'; return; }
  const r = {};
  [['avant', pAvant], ['propose', p56]].forEach(([nom, txt]) => {
    const S = clone(b4); Object.assign(S, clone(b4.walletStore.sim)); S.tradingMode = 'sim';
    const c = { S, Math, Number, Object, Array, JSON, _botPredict() {}, _genomeOf: () => ({}), _setBot() {}, showToast() {}, closePosition() {} };
    vm.createContext(c); vm.runInContext([fnSrc(s02, '_posLevCash'), fnSrc(s02, '_levCashDebt'), txt, fnSrc(s03, 'guardianCheck')].join('\n'), c);
    S.portfolio = c._computePortfolio();
    r[nom] = { levier: S.leverage, emprunt: +(+S.leverageBorrowed).toFixed(2), portefeuille: +S.portfolio.toFixed(2), gardienRisquePourMise340: c.guardianCheck('risk_bot_v1', 'LONG', 'BTC/USDT', 340).status };
  });
  R.M6 = r;
})();

// ── verdict (règles des lignes 1 à 31) ──
[56, 57, 61, 65].forEach(n => {
  const d1 = R.M1.differences[n].length > 0;
  const d2 = R.M2.difference === true;   // le rejeu compare les 4 corrections ensemble : une différence y est attribuée à chacune tant qu'elle n'est pas séparée
  const d3 = (n === 61 && R.M3.ouverturesQueLaRegleDavantRefuserait > 0) || ((n === 56 || n === 57) && (R.M3.avecLevier > 0 || R.M3.pleinRegimeDansD1));
  R.verdict[n] = (d1 || d2 || d3) ? 'N\'ENTRE PAS' : 'ENTRE';
  if (n === 61) R.verdict[n] = 'N\'ENTRE PAS — relecture adverse (M5) : la mise du bot change sur des états vécus par l\'EV, que M1 / M2 / M3 ne pouvaient pas voir ; 09j laissé tel quel';
  if (n === 56) R.verdict[n] = 'N\'ENTRE PAS — M6 : sur l\'AA réelle de Rams au levier ×10 (20/10 03:51), le gardien de risque passe de « approve » à « veto » ; le choix (le levier grossit-il les mises du bot ?) est à Rams ; 02 laissé tel quel';
  R.verdict[n + '_pourquoi'] = { M1: R.M1.differences[n], M2: R.M2.vide ? 'vide' : (d2 ? 'différence' : 'identique'), M3: d3 ? 'différence' : 'aucune' };
});
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
console.log(JSON.stringify({ regles: R.regles_sha256 && R.regles_sha256.slice(0, 16), M6: R.M6, M5: R.M5 && { estimateStakes: R.M5.estimateStakes, etats: R.M5.etatsDeLHistoire.n }, M1: R.M1.differences, M2: { vide: R.M2.vide, difference: R.M2.difference, fenetres: Object.keys(R.M2.fenetres).length }, M3: { lignes: R.M3.lignes, ouvertures: R.M3.ouvertures, levier: R.M3.avecLevier, refus: R.M3.ouverturesQueLaRegleDavantRefuserait, pire: R.M3.plusGrosEngagement, pfMin: R.M3.portefeuilleMin }, verdict: R.verdict }, null, 1));
