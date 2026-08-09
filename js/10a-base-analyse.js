// ▓▓▓ VERSION 20260809k ▓▓▓
// 10a-base-analyse.js — Fondations : purge doublons storage, phrases lettres, état détail, volatilité & multiplicateurs par paire
// [DÉCOUPE 10 · 09/08/2026] Tranche BYTE-IDENTIQUE de 10-fin-bloc-restauration-v93.js
// (lignes 1-222 de l'original). Aucun code réécrit. Ordre de chargement OBLIGATOIRE :
// 10a → 10h, à la place exacte de l'ancien fichier 10 dans le HTML.

// [NETTOYAGE PERF 26/07/2026] depot automatique RETIRE + garde-fou perte max sans minuterie propre (appele par le battement principal toutes les 3 s) · [ENGAGEMENT QUASI-TOTAL 26/07/2026] la mise = part du capital LIBRE (compte - frais - engage) / emplacements restants, plancher = reglage UI, modulee par la qualite de la paire — plus d argent qui dort · [ALLOCATION PAR QUALITE 26/07/2026] le capital va ou le bot gagne : esperance apprise > +0.03 %/trade = mise x1.8, < -0.15 %/trade = quart de mise + conviction +0.12, sinon normale — plafond global inchange · [DISJONCTEUR PAR PAIRE 26/07/2026] une paire dont l esperance apprise (totalPnlPct/totalTrades) est < -0.15 %/trade sur >=15 trades exige +0.12 de conviction et n engage qu un quart de la mise — SOL/AVAX/DOGE/ETH concentraient 89 % des pertes ; reversible seul · [DEPOT AUTOMATIQUE 26/07/2026] l app depose seule : 2 min apres chargement (preuve de code frais) puis toutes les 30 min — plus aucun geste requis · [PONT · NOUVELLE BOITE 12/07/2026] l ancienne boite webhook a expire (404) : nouvelle boite a48904e7, testee en reel (POST + relecture) · [RYTHME 08/07/2026] effet volatilite plafonne x1.6 dans le cycle adaptatif : fini le 120s constant, la conviction accelere le rythme (40-90s) · [FIX MISES 08/07/2026] le stake historique 10 (defaut d epoque sur 16/16 paires) n est plus pris pour un choix utilisateur + l exposition ENGAGEE se soustrait a nouveau du plafond global · [POLITIQUE CAPITAL A+C · Rams 06/07/2026] quasi-totalite investie (cap = compte − max(1$,2%), remplace 50%) + porte LEVIER si conviction >=0.85 et index levier >=x1 (emprunt du manque via 09c, rembourse a la cloture) · [MISES PROPORTIONNELLES] plancher RELATIF (5 % du compte, min 2, override utilisateur respecte) au lieu du plancher fixe 10 qui faisait 20 % du capital par trade + CAP d exposition globale 50 % du compte · [LAISSER COURIR] le timeout ne coupe plus les positions en marche vers leur TP (protegees breakeven au-dela de 45 % du TP) : fin des 13/41 sorties quasi nulles qui mangeaient l edge brut +0.29 en frais · [GARDE-FOU PERTE MAX] balayage 1 s de toutes les positions de tous les modes en play : fermeture immediate si perte prix > 2x le SL (borne 1.5-3 %) — la regle Rams 'stop si perte trop importante' + le fix des queues SOL -7.38/ETH -3.92 · [REGLES REEL v2] filtre bases solides pour le Reel : conviction pleine >=0.40 (jamais la zone exploratoire) ET expectancy apprise AA+EV positive de la paire, sinon abstention
// [PONT CLAUDE v4.0 · DEPOT SANS TOKEN] sans token configure, Export = POST simple vers une boite fixe (teste en reel avec le fichier de 938 Ko, relu intact par Claude) : zero compte, zero collage, zero configuration ; token GitHub reste prioritaire si present · chaque verdict affiche a quel compte GitHub appartient le token (GET /user) : un fine-grained d un autre compte que ramizxhixha-a11y ne pourra JAMAIS ecrire, quelles que soient ses permissions · la version du pont s affiche dans la barre (Pont v3.6) et dans chaque toast d erreur — preuve du 05/07 : la PWA a execute du code perime toute la soiree pendant que les fixes etaient en ligne · chaque erreur affiche les 12 premiers caracteres du token UTILISE par l app (ghp_=classic, github_pat_=fine-grained) — identification definitive du token en cause · le champ token n est plus pre-rempli : l ancien placeholder •••• faisait IGNORER en silence les nouveaux tokens colles (cause des 3 echecs identiques) — desormais tout collage est enregistre, confirme a l ecran, et teste aussitot · sha lu via le LISTING racine (le fichier ~1 Mo pouvait faire echouer la lecture directe du sha) + chaque refus affiche LE MESSAGE BRUT DE GITHUB a l ecran (capture = cause exacte) · sans token : feuille de partage Android (fonctionne en PWA) -> envoyer aura_live.json directement a l appli Claude ; token = envoi repo 1 clic ; dernier recours telechargement · le token est teste des le collage (verdict precis : ecrit OK / lit sans ecrire / repo invisible / mal colle) + verdicts 401 vs 403 distincts a l envoi · Export pour Claude : avec token GitHub (⚙, fine-grained repo aura Contents RW) le fichier est POUSSE au repo en 1 clic (zero telechargement/upload/commit — requis en PWA ou le download Blob est ignore) ; sans token : telechargement classique · 05/07/2026
// [AGRESSIVITE · validee par Rams 05/07/2026] seuil d engagement 0.40 -> 0.30 avec zone exploratoire a mise reduite (50-100%) + anti-stagnation actif sur ce gate + TP plancher 0.6% + SL 1.4x hors bruit (plancher 0.45%) + seuil LMSR sans double comptage fiscal · 05/07/2026
// [FIX] plus de log/toast 'BOT LONG' fantome quand l'ouverture est bloquee (garde mode REEL) ou echoue · 05/07/2026
// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 10/10 · VERSION 126 · 10/06/2026 (boutons répartition portefeuille)
// Contient : fin-bloc-restauration-v93, bloc-restauration-v94, fin-bloc-restauration-v94
//
// ★ v125 (01/06/2026) — SUPPRESSION SYSTÈME nexusInternal_*
//   • Système de snapshots manuels en localStorage entièrement supprimé.
//   • Le vrai backup historique est dans aura_backups (IndexedDB, géré par 03).
//   • Le snapshot vivant est dans nexus_state_v2 (LS+IDB, géré par 09b2).
//   • Économie : 3 Mo de localStorage libérés en permanence.
//   • Supprimé : createInternalSnapshot, listInternalSnapshots,
//     restoreInternalSnapshot, _maybeCreateAutoSnapshot, _refreshSnapshotsList,
//     _snapshotActionCreate, _snapshotActionRestore, _SNAP_INTERNAL_KEYS,
//     _AUTO_SNAP_INTERVAL, _lastAutoSnapTs, _snapRotationIdx.
//   • Appel createInternalSnapshot dans _netwatchTick remplacé par saveState.
//   • Purge automatique au démarrage : nexusInternal_1 ajouté à la liste.
//
// ★ v124 (01/06/2026) — SUPPRESSION SYSTÈME _p5MultiStorageSave
//   • Suppression de _p5MultiStorageSave, _p5AdaptiveLoop, _p5AdaptiveInterval
//     (écrivaient nexusSnap_A en doublon avec saveState).
//   • Suppression de _p5LastAdaptiveSave et _SNAP_KEYS (orphelines).
//   • Économie : ~1.5 Mo de localStorage.
//
// ★ v123 (01/06/2026) — NETTOYAGE
//   • Suppression de _installPackContinuite (56 lignes mortes, jamais appelée).
//   • Suppression de _autoSaveInterval et _packContinuiteInstalled (variables
//     utilisées uniquement par la fonction supprimée).
//   • Les hooks de continuité (pagehide/freeze/beforeunload/visibilitychange)
//     sont désormais dans 09b2-save-load.js v123 avec écriture SYNCHRONE.
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
// FIN BLOC RESTAURATION v93
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// AURA8 v94 · DÉBUT BLOC RESTAURATION COMPLÉMENTAIRE (93 fonctions)
// ════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
// AURA8 v94 · BLOC RESTAURATION COMPLET (93 fonctions)
// Total restauré v93+v94 = 152 fonctions
// ════════════════════════════════════════════════════════════════════════

// ── Variables module-level supplémentaires ──
const _LT_PHRASES = {
  champion_win: [
    "Ce mois a été le mien. {wr}% de trades gagnants, et je ne compte pas m'arrêter là.",
    "J'ai trouvé mon rythme. {wr}% de WR sur {trades} trades — c'est du travail, pas de la chance.",
    "Si tu me fais confiance, je te le rends. {wr}% ce mois. Continue à me laisser opérer.",
  ],
  champion_mixed: [
    "J'ai alterné le bon et le moins bon. Mais mes {trades} trades m'ont appris quelque chose.",
    "Le marché a été capricieux. Mon WR de {wr}% reflète une période de recalibration.",
    "Ni mon meilleur mois, ni le pire. Je m'adapte. C'est ce que je fais.",
  ],
  survivor: [
    "J'ai survécu. Certains de mes collègues n'ont pas eu cette chance.",
    "Ma fitness est à {fitness}T$. Pas brillant, mais je suis encore là.",
    "Les marchés difficiles m'ont mis à l'épreuve. J'en sors plus prudent.",
  ],
  rising: [
    "Je monte. Ma fitness a progressé ce mois. Je commence à comprendre les patterns.",
    "Quelque chose a changé dans ma façon de lire les signaux. Mes résultats le montrent.",
    "Je ne suis pas encore au sommet, mais le chemin est clair devant moi.",
  ],
  observer: [
    "Je n'ai pas beaucoup agi ce mois. Mais j'ai observé. L'observation, c'est aussi du travail.",
    "Peu de trades, beaucoup d'apprentissage. C'est parfois la bonne stratégie.",
  ],
};

// Purge des anciennes clés obsolètes au premier chargement
// v125 : système nexusInternal_* supprimé entièrement (le vrai backup est aura_backups en IDB,
// le snapshot vivant est nexus_state_v2). nexusInternal_1 prenait 3 Mo de localStorage pour rien.
(function _purgeStorageDoublons() {
  const obsoletes = [
    'nexusSnap_A','nexusSnap_B','nexusSnap_C','nexusSnap_latest',
    'nexusInternal_1','nexusInternal_2','nexusInternal_3','nexusInternal_4','nexusInternal_5'
  ];
  obsoletes.forEach(k => { try { localStorage.removeItem(k); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} } });
  try { sessionStorage.removeItem('nexusSnap_current'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
})();

let _currentDetailPair = null;
let _pendingClosePair = null;
let _settingsPulseTimer = null;

// ── 9 fonctions depuis v91 ──

function _computeVolatilityScore(pair) {
  const ps = (S.pairStates && S.pairStates[pair]) || null;
  if (!ps) return null;
  
  // Méthode 1 : ATR sur 20 bougies (en % du prix)
  let atrPct = 0, atrAbs = 0;
  let atrValid = false;
  try {
    let candles = null;
    const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
    if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= 20) {
      candles = S.realCandles[pair][tf];
    } else if (ps.candles && ps.candles.length >= 20) {
      candles = ps.candles;
    }
    if (candles && candles.length >= 20) {
      const recent = candles.slice(-20);
      let trSum = 0;
      for (let i = 1; i < recent.length; i++) {
        const high = recent[i].h || recent[i].c;
        const low = recent[i].l || recent[i].c;
        const prevClose = recent[i-1].c;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trSum += tr;
      }
      atrAbs = trSum / (recent.length - 1);
      const lastClose = recent[recent.length - 1].c;
      if (lastClose > 0) {
        atrPct = (atrAbs / lastClose) * 100;
        atrValid = true;
      }
    }
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  
  // Méthode 2 : Écart-type des prix sur 20 bougies (en % du prix)
  let stdPct = 0;
  let stdValid = false;
  try {
    let candles = null;
    const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
    if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= 20) {
      candles = S.realCandles[pair][tf];
    } else if (ps.candles && ps.candles.length >= 20) {
      candles = ps.candles;
    }
    if (candles && candles.length >= 20) {
      const closes = candles.slice(-20).map(k => k.c).filter(c => isFinite(c) && c > 0);
      if (closes.length >= 10) {
        const mean = closes.reduce((a,b) => a+b, 0) / closes.length;
        const variance = closes.reduce((a,b) => a + (b-mean)**2, 0) / closes.length;
        const std = Math.sqrt(variance);
        if (mean > 0) {
          stdPct = (std / mean) * 100;
          stdValid = true;
        }
      }
    }
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  
  // Méthode 3 : Mouvement 24h absolu
  let move24Pct = 0;
  let move24Valid = false;
  if (typeof ps.pnl24h === 'number' && isFinite(ps.pnl24h)) {
    move24Pct = Math.abs(ps.pnl24h);
    move24Valid = true;
  }
  
  // Combinaison pondérée 40/30/30
  let totalWeight = 0;
  let weightedSum = 0;
  if (atrValid)    { weightedSum += atrPct * 0.4;    totalWeight += 0.4; }
  if (stdValid)    { weightedSum += stdPct * 0.3;    totalWeight += 0.3; }
  if (move24Valid) { weightedSum += move24Pct * 0.3; totalWeight += 0.3; }
  
  if (totalWeight === 0) return null;
  const score = weightedSum / totalWeight;
  return { score: score, atrAbs: atrAbs };
}
window._computeVolatilityScore = _computeVolatilityScore;
if(typeof _computeVolatilityScore==='function') window._computeVolatilityScore = _computeVolatilityScore;

function _getMarketVolatilityMedian() {
  const activePairs = (typeof _getActiveRealPairs === 'function') ? _getActiveRealPairs() : [];
  if (activePairs.length === 0) return 2.0;
  const scores = activePairs
    .map(p => _computeVolatilityScore(p))
    .filter(r => r !== null && isFinite(r.score) && r.score > 0)
    .map(r => r.score);
  if (scores.length === 0) return 2.0;
  scores.sort((a,b) => a - b);
  const mid = Math.floor(scores.length / 2);
  return scores.length % 2 === 0 ? (scores[mid-1] + scores[mid]) / 2 : scores[mid];
}
window._getMarketVolatilityMedian = _getMarketVolatilityMedian;
if(typeof _getMarketVolatilityMedian==='function') window._getMarketVolatilityMedian = _getMarketVolatilityMedian;

function _getPairBonusMultiplier(pair) {
  const cfg = S.paperRealConfig || {};
  const maxBonus = cfg.bonusMultiplierMax || 1.5;
  const stats = (S.paperRealStats || {})[pair];
  if (!stats || stats.trades < 10) return 1.0;
  const wr = stats.trades > 0 ? stats.wins / stats.trades : 0.5;
  const pnl = stats.pnlNet || 0;
  if (wr <= 0.60 || pnl <= 0) return 1.0;
  let bonus = 1.0;
  bonus += Math.min(0.3, (wr - 0.60) * 1.5);
  bonus += Math.min(0.2, pnl / 200);
  bonus = Math.min(maxBonus, bonus);
  if (!S.adaptiveState) S.adaptiveState = {};
  if (!S.adaptiveState.lastBonusMultipliers) S.adaptiveState.lastBonusMultipliers = {};
  S.adaptiveState.lastBonusMultipliers[pair] = bonus;
  return bonus;
}
window._getPairBonusMultiplier = _getPairBonusMultiplier;
if(typeof _getPairBonusMultiplier==='function') window._getPairBonusMultiplier = _getPairBonusMultiplier;

function _getPairPerformanceMultiplier(pair) {
  const stats = (S.paperRealStats || {})[pair];
  if (!stats || stats.trades < 10) return 1.0;
  const wr = stats.trades > 0 ? stats.wins / stats.trades : 0.5;
  const pnl = stats.pnlNet || 0;
  if (wr < 0.40 && pnl < 0) {
    const penalty = Math.min(0.5, Math.abs(pnl) / 200);
    return Math.max(0.5, 1.0 - penalty);
  }
  return 1.0;
}
window._getPairPerformanceMultiplier = _getPairPerformanceMultiplier;
if(typeof _getPairPerformanceMultiplier==='function') window._getPairPerformanceMultiplier = _getPairPerformanceMultiplier;