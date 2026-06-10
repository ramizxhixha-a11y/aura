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
  obsoletes.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });
  try { sessionStorage.removeItem('nexusSnap_current'); } catch(e) {}
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
  } catch(e) {}
  
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
  } catch(e) {}
  
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

function _ltBuildAgentVoice(agent) {
  const fitness = Math.floor(agent.fitness||0);
  const wr      = (agent.trades||0)>0?Math.round((agent.wins||0)/(agent.trades||1)*100):50;
  const trades  = agent.trades||0;
  const name    = agent.name||'Agent Inconnu';
  const emoji   = agent.emoji||'🤖';

  let category, phrase;
  if(wr>=65&&fitness>=300)      { category='champion_win';   }
  else if(wr>=50&&fitness>=200) { category='champion_mixed'; }
  else if(fitness<100)          { category='survivor';       }
  else if(fitness>=200)         { category='rising';         }
  else                          { category='observer';       }

  phrase = _ltPickPhrase(_LT_PHRASES[category], {wr,trades,fitness});
  return {name:`${emoji} ${name}`, phrase, fitness, wr, trades};
}
if(typeof _ltBuildAgentVoice==='function') window._ltBuildAgentVoice = _ltBuildAgentVoice;

function _ltBuildLetter() {
  const agents  = [...(S.agents||[])].sort((a,b)=>(b.fitness||0)-(a.fitness||0));
  const top     = agents[0];
  if(!agents.length||!top) return null;

  const n       = S.totalTrades||0;
  const wr      = n>0?Math.round((S.winTrades||0)/n*100):null;
  const cap     = S.tradingAccount||0;
  const initCap = S.initialCapital||1000;
  const pnl     = cap-initCap;
  const pnlPct  = initCap>0?(pnl/initCap*100):0;
  const regime  = S._paperRealCurrentRegime||'calm';
  const pseudo  = S.avatar?.pseudo||'Trader';
  const allA    = agents.length;
  const topFit  = Math.floor(top.fitness||0);
  const topWr   = (top.trades||0)>0?Math.round((top.wins||0)/(top.trades||1)*100):50;
  const topName = (top.emoji||'🤖')+' '+(top.name||'Agent');

  const now  = new Date();
  const month= now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

  let opening, body1, body2, closing;

  if(pnlPct>=5&&wr&&wr>=60) {
    opening = `Ce mois a été marqué par une progression réelle. Avec ${n} trades à notre actif et un Win Rate collectif de ${wr}%, nous avons tenu notre rang.`;
    body1   = `Le portefeuille affiche ${pnl>=0?'+':''}$${pnl.toFixed(2)} depuis le début. Ce n'est pas le fruit du hasard — c'est le résultat de cycles d'apprentissage, d'adaptations constantes et d'une discipline que tu as su maintenir.`;
  } else if(pnlPct<-5||!wr||wr<45) {
    opening = `Ce mois a été difficile. Je dois te le dire honnêtement, sans détour.`;
    body1   = `Sur ${n} trades et un WR de ${wr||'—'}%, nous avons traversé une période de recalibration. Le capital a bougé de ${pnl>=0?'+':''}$${pnl.toFixed(2)}. Mais nous sommes toujours là, et c'est ce qui compte.`;
  } else {
    opening = `Un mois ordinaire n'est jamais vraiment ordinaire. ${n} trades. ${wr||'—'}% de réussite. Du travail accompli.`;
    body1   = `Le portefeuille se tient à $${cap.toFixed(2)}. Le régime de marché est resté ${regime.replace('_',' ').toUpperCase()} pendant une bonne partie du cycle. Nous avons appris à nous y adapter.`;
  }

  body2 = `Parmi nous ${allA} agents, c'est <em>${topName}</em> qui s'est le plus distingué ce mois, avec une fitness de <strong>${topFit}T$</strong> et un WR de <strong>${topWr}%</strong>. Il parle pour l'ensemble de la troupe.`;

  closing = pnlPct>=0
    ? `Nous ne tradinons pas pour le court terme, ${pseudo}. Nous construisons quelque chose. Continue à nous faire confiance.`
    : `Les marchés testent la patience avant de récompenser la discipline, ${pseudo}. Nous serons là au prochain cycle.`;

  const voices = agents.slice(1, Math.min(4, agents.length)).map(_ltBuildAgentVoice);

  return {top, topName, month, opening, body1, body2, closing, voices, wr, n, pnl, pnlPct, cap, pseudo};
}
if(typeof _ltBuildLetter==='function') window._ltBuildLetter = _ltBuildLetter;

function _ltPickPhrase(pool, vars) {
  const phrase = pool[Math.floor(Math.random()*pool.length)];
  return phrase.replace(/{(\w+)}/g, (_,k)=>vars[k]??'—');
}
if(typeof _ltPickPhrase==='function') window._ltPickPhrase = _ltPickPhrase;

function exportAgentLetter() {
  const data = _ltBuildLetter();
  if(!data) { showToast('⚠ Pas assez de données', 1500, 'warn'); return; }

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Lettre des Agents — AURA ∞ — ${data.month}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0a0a14;color:#c8c8d8;font-family:Georgia,serif;padding:30px;max-width:600px;margin:0 auto;font-size:11pt;line-height:1.8;}
.header{text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid rgba(167,139,250,.3);}
.from{font-size:16pt;font-weight:700;color:#a855f7;letter-spacing:.1em;}
.date{font-size:9pt;color:#555;margin-top:4px;letter-spacing:.1em;text-transform:uppercase;}
p{margin-bottom:14px;color:#b0b0c0;}
strong{color:#e0e0f0;}
em{color:#a855f7;font-style:normal;}
.voice{border-left:2px solid rgba(167,139,250,.4);padding:8px 14px;margin:8px 0;color:#888;font-style:italic;}
.voice-name{font-size:9pt;color:#a855f7;font-style:normal;font-weight:700;margin-bottom:2px;}
.sig{margin-top:24px;padding-top:16px;border-top:1px solid rgba(167,139,250,.2);}
.sig-name{font-size:13pt;font-weight:700;color:#a855f7;}
.sig-role{font-size:8pt;color:#555;letter-spacing:.1em;text-transform:uppercase;}
.footer{margin-top:30px;text-align:center;font-size:8pt;color:#333;border-top:1px solid #1a1a2e;padding-top:12px;}
</style>
<style>
/* AURA8 v95 · CSS modales et widgets restaurés (Phase B) */
.why-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.75); display: none; align-items: center; justify-content: center; padding: 20px 14px; backdrop-filter: blur(4px); }
.why-overlay.open { display: flex; }
.why-panel { width: 100%; max-width: 400px; background: var(--s1); border: 1px solid rgba(167,139,250,.35); border-radius: 16px; padding: 16px; box-shadow: 0 0 40px rgba(167,139,250,.15); max-height: 85vh; overflow-y: auto; }
.why-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.why-title { font-size: 14px; font-weight: 800; color: var(--pur); display: flex; align-items: center; gap: 6px; }
.why-close { font-size: 18px; color: var(--t3); cursor: pointer; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background .15s; }
.why-close:hover { background: rgba(255,255,255,.06); }
.diag-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75); display:none;align-items:flex-start;justify-content:center;padding:40px 12px; overflow-y:auto;backdrop-filter:blur(3px); transform:translateZ(0); -webkit-transform:translateZ(0); }
.diag-overlay.open { display:flex; }
.diag-panel { width:100%;max-width:420px;background:var(--s1);border:1px solid var(--border); border-radius:14px;padding:14px 14px 12px; }
.diag-head { display:flex;justify-content:space-between;align-items:center;margin-bottom:10px; }
.diag-title { font-size:14px;font-weight:800;color:var(--t1);display:flex;align-items:center;gap:6px; }
.diag-close { font-size:18px;color:var(--t3);cursor:pointer;width:26px;height:26px;display:flex;align-items:center;justify-content:center; }
.diag-section { margin:10px 0 4px;padding:8px 10px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:10px; }
.diag-label { color:var(--t2); }
.diag-val { font-family:var(--font-mono);font-weight:700; }
.diag-val.ok { color:var(--up); }
.diag-val.warn { color:var(--gold); }
.diag-val.crit { color:var(--down); }
.diag-val.neu { color:var(--ice); }
.pair-detail-overlay { position: fixed; inset: 0; z-index: 2050; background: rgba(6,8,12,0.7); backdrop-filter: blur(4px); display: none; justify-content: center; align-items: flex-start; padding: 16px 10px; overflow-y: auto; animation: fadeInOverlay .18s ease; }
.pair-detail-overlay.open { display: flex; }
.pair-detail-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
.pair-detail-close { font-size: 18px; color: var(--t3); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 8px; transition: background .15s, color .15s; }
.pair-detail-close:active { background: var(--s2); color: var(--t1); }
.close-confirm-overlay { position: fixed; inset: 0; z-index: 2200; background: rgba(0,0,0,0.65); backdrop-filter: blur(3px); display: none; justify-content: center; align-items: center; padding: 20px; }
.close-confirm-overlay.open { display: flex; }
.close-confirm-card { background: var(--s1); border: 1px solid var(--border); border-radius: 14px; padding: 16px; max-width: 320px; width: 100%; animation: slideUpPanel .22s ease; }
.close-confirm-title { font-size: 13px; font-weight: 800; color: var(--t1); margin-bottom: 6px; }
.close-confirm-body { font-size: 11px; color: var(--t2); margin-bottom: 12px; line-height: 1.4; }
.close-confirm-actions { display: flex; gap: 8px; }
.close-confirm-btn { flex: 1; padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; transition: background .15s; }
.close-confirm-btn.cancel { background: var(--s2); color: var(--t2); }
.close-confirm-btn.cancel:active { background: var(--s3); }
.close-confirm-btn.confirm { background: var(--down); color: white; }
.close-confirm-btn.confirm:active { background: #e02c58; }
#agentLetterSection { padding: 12px 0; }
#liveLabel { font-size: 9px; font-weight: 700; letter-spacing: .15em; color: var(--up); margin-left: 4px; vertical-align: middle; }
#pairDetailOverlay { display: none; position: fixed; inset: 0; z-index: 9998; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 20px; }
#pairDetailOverlay.open { display: flex; }
#pairDetailOverlay .pair-detail-card { background: var(--s2); border: 1px solid rgba(255,255,255,.06); border-radius: 14px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; padding: 16px; }
#pairDetailOverlay .pair-detail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
#pairDetailOverlay .pair-detail-close { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--s3); border-radius: 50%; cursor: pointer; color: var(--t2); font-size: 14px; }
#pairDetailBody { font-size: 12px; color: var(--t1); }
</style>
</head><body>
<div class="header">
  <div class="from">🤖 Tes Agents AURA ∞</div>
  <div class="date">Lettre de ${data.month}</div>
</div>
<p>${data.opening}</p>
<p>${data.body1}</p>
<p>${data.body2.replace(/<em>/g,'<em>').replace(/<strong>/g,'<strong>')}</p>
${data.voices.length>0?`<div style="margin:16px 0;">${data.voices.map(v=>`<div class="voice"><div class="voice-name">${v.name}</div>${v.phrase}</div>`).join('')}</div>`:''}
<p>${data.closing}</p>
<div class="sig">
  <div class="sig-name">${data.topName}</div>
  <div class="sig-role">Agent principal — AURA ∞</div>
</div>
<div class="footer">AURA ∞ — Adaptive Universal Risk Architect · ${data.month}</div>
</body></html>`;

  const win = window.open('','_blank','width=700,height=600');
  if(!win){ showToast('⚠ Autoriser les popups', 1500,'warn'); return; }
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(()=>win.print(), 500);
  showToast('📄 Lettre exportée', 2000, 'win');
}
window.exportAgentLetter = exportAgentLetter;
if(typeof exportAgentLetter==='function') window.exportAgentLetter = exportAgentLetter;

function renderAgentLetterSection() {
  const el  = document.getElementById('agentLetterSection');
  if(!el) return;

  const data = _ltBuildLetter();
  if(!data) {
    el.innerHTML=`<div class="lt-section"><div class="lt-title">📜 Lettre des Agents</div><div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Tes agents ont besoin de plus de données pour te écrire. Lance le bot !</div></div>`;
    return;
  }

  el.innerHTML = `
    <div class="lt-section">
      <div class="lt-title">📜 Lettre des Agents
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${data.month}</span>
      </div>

      <div class="lt-letter">
        <div class="lt-header">
          <div class="lt-from">🤖 Tes Agents AURA ∞</div>
          <div class="lt-date">Lettre de ${data.month}</div>
        </div>

        <p class="lt-p">${data.opening}</p>
        <p class="lt-p">${data.body1}</p>
        <p class="lt-p">${data.body2}</p>

        ${data.voices.length>0?`
        <div class="lt-agent-voices">
          ${data.voices.map(v=>`<div class="lt-voice">
            <div class="lt-voice-name">${v.name} · ${v.fitness}T$ · ${v.wr}% WR</div>
            "${v.phrase}"
          </div>`).join('')}
        </div>`:''}

        <p class="lt-p" style="margin-top:10px;">${data.closing}</p>

        <div class="lt-sig">
          <div class="lt-sig-name">${data.topName}</div>
          <div class="lt-sig-role">Agent principal — AURA ∞</div>
        </div>
      </div>

      <button class="lt-export-btn" onclick="exportAgentLetter()">
        📄 Exporter / Imprimer la lettre
      </button>

      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;line-height:1.4;">
        Générée depuis les vraies stats de tes agents · Unique à chaque session
      </div>
    </div>`;
}
window.renderAgentLetterSection = renderAgentLetterSection;
if(typeof renderAgentLetterSection==='function') window.renderAgentLetterSection = renderAgentLetterSection;

// ── 1 fonctions v91 récupérées via v69 (fallback NULL) ──

function _getPairAdaptiveProfile(pair) {
  const cfg = S.paperRealConfig || {};
  const baseStakePct = cfg.maxStakePct || 5.0;
  const slAtrMult = cfg.slAtrMultiplier || 2.0;
  
  const volResult = _computeVolatilityScore(pair);
  if (!volResult || volResult.score === null) {
    return {
      stakePct: baseStakePct * 0.6,
      slAtrMultiplier: slAtrMult,
      slAbsoluteAtr: null,
      score: null,
      relRatio: null,
      perfMult: 1.0
    };
  }
  
  const median = _getMarketVolatilityMedian();
  const ratio = volResult.score / median;
  
  let adaptedStakePct = baseStakePct / Math.max(0.5, ratio);
  adaptedStakePct = Math.min(baseStakePct, adaptedStakePct);
  adaptedStakePct = Math.max(0.5, adaptedStakePct);
  
  const perfMult = _getPairPerformanceMultiplier(pair);
  adaptedStakePct *= perfMult;
  
  let bonusMult = 1.0;
  if (typeof _getPairBonusMultiplier === 'function') {
    bonusMult = _getPairBonusMultiplier(pair);
    adaptedStakePct *= bonusMult;
  }
  
  return {
    stakePct: adaptedStakePct,
    slAtrMultiplier: slAtrMult,
    slAbsoluteAtr: volResult.atrAbs,
    score: volResult.score,
    relRatio: ratio,
    perfMult: perfMult,
    bonusMult: bonusMult,
    median: median
  };
}
window._getPairAdaptiveProfile = _getPairAdaptiveProfile;
if(typeof _getPairAdaptiveProfile==='function') window._getPairAdaptiveProfile = _getPairAdaptiveProfile;

// ── 83 fonctions depuis v69 ──

function _abAssignArm() {
  const cfg = S.paperRealConfig || {};
  if (!cfg.abTestingEnabled) return 'A';
  if (!S.abTesting) return 'A';
  const arm = S.abTesting.nextAssign || 'A';
  S.abTesting.nextAssign = (arm === 'A') ? 'B' : 'A';
  return arm;
}
window._abAssignArm = _abAssignArm;
if(typeof _abAssignArm==='function') window._abAssignArm = _abAssignArm;

function _abComputeVerdict() {
  if (!S.abTesting) return;
  const A = S.abTesting.armA;
  const B = S.abTesting.armB;
  
  const wrA = A.trades > 0 ? A.wins / A.trades : 0;
  const wrB = B.trades > 0 ? B.wins / B.trades : 0;
  const totalPnl = Math.abs(A.pnl) + Math.abs(B.pnl) || 1;
  const pnlScoreA = (A.pnl + Math.abs(Math.min(A.pnl, B.pnl))) / totalPnl;
  const pnlScoreB = (B.pnl + Math.abs(Math.min(A.pnl, B.pnl))) / totalPnl;
  const scoreA = 0.6 * wrA + 0.4 * pnlScoreA;
  const scoreB = 0.6 * wrB + 0.4 * pnlScoreB;
  
  const aWins = scoreA >= scoreB;
  const winner = aWins ? 'A' : 'B';
  const winnerArm = aWins ? A : B;
  
  const newRefParams = JSON.parse(JSON.stringify(winnerArm.params));
  
  const cfg = S.paperRealConfig || {};
  const strength = cfg.abTestingMutationStrength || 0.3;
  const newChallengerParams = {
    slAtrMult: _mutateValue(newRefParams.slAtrMult, strength, 1.0, 4.0),
    tpAtrMult: _mutateValue(newRefParams.tpAtrMult, strength, 0.8, 3.0),
    stakeFactor: _mutateValue(newRefParams.stakeFactor, strength * 0.5, 0.6, 1.4)
  };
  
  const verdict = {
    ts: Date.now(),
    generation: (S.abTesting.generation || 0) + 1,
    winner: winner,
    winnerScore: aWins ? +scoreA.toFixed(3) : +scoreB.toFixed(3),
    winnerWR: aWins ? +(wrA * 100).toFixed(1) : +(wrB * 100).toFixed(1),
    winnerPnl: aWins ? +A.pnl.toFixed(2) : +B.pnl.toFixed(2),
    loserScore: aWins ? +scoreB.toFixed(3) : +scoreA.toFixed(3),
    loserWR: aWins ? +(wrB * 100).toFixed(1) : +(wrA * 100).toFixed(1),
    loserPnl: aWins ? +B.pnl.toFixed(2) : +A.pnl.toFixed(2),
    newParams: JSON.parse(JSON.stringify(newRefParams)),
    newChallenger: JSON.parse(JSON.stringify(newChallengerParams))
  };
  
  S.abTesting.armA = { params: newRefParams, trades: 0, wins: 0, losses: 0, pnl: 0, label: 'A (référence)' };
  S.abTesting.armB = { params: newChallengerParams, trades: 0, wins: 0, losses: 0, pnl: 0, label: 'B (challenger)' };
  S.abTesting.generation = (S.abTesting.generation || 0) + 1;
  S.abTesting.lastVerdict = verdict;
  if (!S.abTesting.history) S.abTesting.history = [];
  S.abTesting.history.push(verdict);
  if (S.abTesting.history.length > 20) S.abTesting.history.shift();
  
  try {
    if (!S.chainLog) S.chainLog = [];
    S.chainLog.push({
      icon: '🧬',
      desc: 'A/B testing · Génération ' + verdict.generation + ' · Gagnant ' + winner + ' (' + verdict.winnerWR + '% WR · $' + verdict.winnerPnl + ')',
      hash: typeof rndHash==='function' ? rndHash() : '',
      time: typeof nowStr==='function' ? nowStr() : ''
    });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  } catch(e) {}
  
  try {
    if (typeof showToast === 'function') {
      showToast('🧬 A/B Gen ' + verdict.generation + ' · ' + winner + ' gagne (' + verdict.winnerWR + '%)', 5000, 'win');
    }
  } catch(e) {}
}
window._abComputeVerdict = _abComputeVerdict;
if(typeof _abComputeVerdict==='function') window._abComputeVerdict = _abComputeVerdict;

function _abGetParams(arm) {
  if (!S.abTesting) return null;
  if (arm === 'B' && S.abTesting.armB && S.abTesting.armB.params) {
    return S.abTesting.armB.params;
  }
  return (S.abTesting.armA && S.abTesting.armA.params) ? S.abTesting.armA.params : null;
}
window._abGetParams = _abGetParams;
if(typeof _abGetParams==='function') window._abGetParams = _abGetParams;

function _addTradeContextToMemory(ctx) {
  if (!ctx) return;
  if (!S.tradeContextMemory) S.tradeContextMemory = [];
  S.tradeContextMemory.push(ctx);
  if (S.tradeContextMemory.length > 500) {
    S.tradeContextMemory.shift();
  }
}
window._addTradeContextToMemory = _addTradeContextToMemory;
if(typeof _addTradeContextToMemory==='function') window._addTradeContextToMemory = _addTradeContextToMemory;

function _cancelForceClose() {
  _pendingClosePair = null;
  const overlay = document.getElementById('closeConfirmOverlay');
  if (overlay) overlay.classList.remove('open');
}
window._cancelForceClose = _cancelForceClose;
if(typeof _cancelForceClose==='function') window._cancelForceClose = _cancelForceClose;

function _captureTradeContext(pair, side, stakeUsdt) {
  if (S.tradingMode !== 'paperReal') return null;
  
  const now = Date.now();
  const date = new Date(now);
  
  const ctx = {
    contextId: 'ctx_' + now + '_' + Math.random().toString(36).slice(2, 8),
    pair: pair,
    side: side,
    stakeUsdt: stakeUsdt,
    openedAt: now,
    closedAt: null,
    pnlPct: null,
    pnlUsd: null,
    holdMinutes: null,
    won: null,
    hour: date.getHours(),
    dayOfWeek: date.getDay(),
    regime: (typeof detectMarketRegime === 'function') ? detectMarketRegime() : null,
    marketVolatilityMedian: (typeof _getMarketVolatilityMedian === 'function') ? _getMarketVolatilityMedian() : null,
    pairVolatility: null,
    pairRelRatio: null,
    pairPerfMult: 1.0,
    pairBonusMult: 1.0,
    indicators: _computeIndicatorsForContext(pair),
    topAgents: []
  };
  
  if (typeof _getPairAdaptiveProfile === 'function') {
    const profile = _getPairAdaptiveProfile(pair);
    if (profile) {
      ctx.pairVolatility = profile.score;
      ctx.pairRelRatio = profile.relRatio;
      ctx.pairPerfMult = profile.perfMult || 1.0;
      ctx.pairBonusMult = profile.bonusMult || 1.0;
    }
  }
  
  try {
    if (S.agents) {
      ctx.topAgents = [...S.agents]
        .filter(a => !a.isBot && !a.isMeta && Math.abs(a.score || 0) > 0.05)
        .sort((a, b) => Math.abs(b.score || 0) - Math.abs(a.score || 0))
        .slice(0, 5)
        .map(a => ({
          name: (a.name || '').split(' ')[0].slice(0, 20),
          score: +(a.score || 0).toFixed(2),
          fitness: a.fitness || 0
        }));
    }
  } catch(e) {}
  
  return ctx;
}
window._captureTradeContext = _captureTradeContext;
if(typeof _captureTradeContext==='function') window._captureTradeContext = _captureTradeContext;

function _checkAndRotatePeriods() {
  if (!S.pnlPeriod) S.pnlPeriod = { history: [] };
  if (!S.pnlPeriod.history) S.pnlPeriod.history = [];
  
  const todayKey = _getTodayKey();
  const weekKey = _getWeekKey();
  const monthKey = _getMonthKey();
  const currentPortfolio = S.portfolio || 0;
  
  if (S.pnlPeriod.todayDate !== todayKey) {
    if (S.pnlPeriod.todayDate && S.pnlPeriod.todayStartPortfolio !== null) {
      const startVal = S.pnlPeriod.todayStartPortfolio;
      const pnlUsd = currentPortfolio - startVal;
      const pnlPct = startVal > 0 ? (pnlUsd / startVal) * 100 : 0;
      S.pnlPeriod.history.push({
        date: S.pnlPeriod.todayDate,
        start: +startVal.toFixed(2),
        end: +currentPortfolio.toFixed(2),
        pnlUsd: +pnlUsd.toFixed(2),
        pnlPct: +pnlPct.toFixed(2)
      });
      if (S.pnlPeriod.history.length > 90) {
        S.pnlPeriod.history = S.pnlPeriod.history.slice(-90);
      }
    }
    S.pnlPeriod.todayDate = todayKey;
    S.pnlPeriod.todayStartPortfolio = currentPortfolio;
  }
  
  if (S.pnlPeriod.weekStart !== weekKey) {
    S.pnlPeriod.weekStart = weekKey;
    S.pnlPeriod.weekStartPortfolio = currentPortfolio;
  }
  
  if (S.pnlPeriod.monthStart !== monthKey) {
    S.pnlPeriod.monthStart = monthKey;
    S.pnlPeriod.monthStartPortfolio = currentPortfolio;
  }
}
window._checkAndRotatePeriods = _checkAndRotatePeriods;
if(typeof _checkAndRotatePeriods==='function') window._checkAndRotatePeriods = _checkAndRotatePeriods;

function _checkHedgingTrigger() {
  const cfg = S.paperRealConfig || {};
  if (!cfg.hedgingEnabled) return;
  if (S.tradingMode !== 'paperReal') return;
  
  if (S.adaptiveState && S.adaptiveState.hedgeActive) {
    const hedgeId = S.adaptiveState.hedgePositionId;
    const exists = (S.openPositions || []).some(p => p.id === hedgeId);
    if (!exists) {
      S.adaptiveState.hedgeActive = false;
      S.adaptiveState.hedgePositionId = null;
    }
    return;
  }
  
  const stress = _detectSystemicBearStress();
  const triggerStreak = cfg.hedgingTriggerBearStreak || 3;
  
  if (stress.streak >= triggerStreak) {
    const candidate = _findMostVolatilePair();
    if (!candidate) return;
    
    const totalCapital = S.b || 0;
    const hedgeStake = Math.max(10, totalCapital * (cfg.hedgingMaxAllocPct || 2.0) / 100);
    
    if (!S.adaptiveState) S.adaptiveState = {};
    S.adaptiveState.lastHedgeAction = {
      ts: Date.now(),
      action: 'trigger',
      candidate: candidate,
      stake: +hedgeStake.toFixed(2),
      reason: 'BEAR streak ' + stress.streak,
      regime: stress.regime
    };
    
    try {
      if (!S.chainLog) S.chainLog = [];
      S.chainLog.push({
        icon: '🛡️',
        desc: 'Hedge défensif suggéré · ' + candidate + ' SHORT · stake $' + hedgeStake.toFixed(2) + ' · ' + stress.streak + ' bougies BEAR',
        hash: typeof rndHash==='function' ? rndHash() : '',
        time: typeof nowStr==='function' ? nowStr() : ''
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    } catch(e) {}
    
    try {
      if (typeof showToast === 'function') {
        showToast('🛡️ Hedge suggéré sur ' + candidate.split('/')[0] + ' SHORT', 5000, 'warn');
      }
    } catch(e) {}
  }
}
window._checkHedgingTrigger = _checkHedgingTrigger;
if(typeof _checkHedgingTrigger==='function') window._checkHedgingTrigger = _checkHedgingTrigger;

function _checkReversalsAndClose() {
  if (S.tradingMode !== 'paperReal' || !S.openPositions) return;
  const cfg = S.paperRealConfig || {};
  if (!cfg.reversalDetectionEnabled) return;
  const minProfit = cfg.reversalEarlyCloseProfit || 0.5;
  
  S.openPositions.forEach(pos => {
    if (!pos.auto || !pos._paperRealMode) return;
    if (!pos.pair) return;
    const ps = S.pairStates ? S.pairStates[pos.pair] : null;
    if (!ps || !isFinite(ps.price)) return;
    const isLong = pos.side === 'long';
    const pnlPct = isLong 
      ? ((ps.price - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - ps.price) / pos.entryPrice) * 100;
    if (pnlPct < minProfit) return;
    const reversal = _detectReversal(pos.pair, pos.side);
    if (!reversal || !reversal.reversalDetected) return;
    if (reversal.confidence !== 'high' && pnlPct < 1.0) return;
    try {
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastReversalDetection = {
        pair: pos.pair,
        type: reversal.type,
        confidence: reversal.confidence,
        action: 'early_close',
        pnlPct: +pnlPct.toFixed(2),
        ts: Date.now()
      };
      S.adaptiveState.reversalEarlyCloses = (S.adaptiveState.reversalEarlyCloses || 0) + 1;
      if (!S.chainLog) S.chainLog = [];
      S.chainLog.push({
        icon: '🔮',
        desc: 'Retournement détecté · ' + pos.pair + ' · fermeture préventive (+' + pnlPct.toFixed(2) + '%)',
        hash: typeof rndHash==='function' ? rndHash() : '',
        time: typeof nowStr==='function' ? nowStr() : ''
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      if (typeof showToast === 'function') {
        showToast('🔮 ' + pos.pair + ' fermé · retournement détecté (+' + pnlPct.toFixed(2) + '%)', 4000, 'win');
      }
      if (typeof closePosition === 'function') {
        closePosition(pos.id, true);
      }
    } catch(e) {}
  });
}
window._checkReversalsAndClose = _checkReversalsAndClose;
if(typeof _checkReversalsAndClose==='function') window._checkReversalsAndClose = _checkReversalsAndClose;

function _computeAdaptiveTP(pair, entryPrice, isLong) {
  const cfg = S.paperRealConfig || {};
  const tpMult = cfg.tpAtrMultiplier || 1.5;
  let tpPrice = null;
  if (typeof _getPairAdaptiveProfile === 'function') {
    const profile = _getPairAdaptiveProfile(pair);
    if (profile && profile.slAbsoluteAtr && profile.slAbsoluteAtr > 0) {
      const tpDistance = tpMult * profile.slAbsoluteAtr;
      tpPrice = isLong ? entryPrice + tpDistance : entryPrice - tpDistance;
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastTpUsed = 'ATR×' + tpMult;
      return tpPrice;
    }
  }
  const tpPct = cfg.takeProfitPct || 2.0;
  tpPrice = isLong ? entryPrice * (1 + tpPct/100) : entryPrice * (1 - tpPct/100);
  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.lastTpUsed = 'pct ' + tpPct + '%';
  return tpPrice;
}
window._computeAdaptiveTP = _computeAdaptiveTP;
if(typeof _computeAdaptiveTP==='function') window._computeAdaptiveTP = _computeAdaptiveTP;

function _computeIndicatorsForContext(pair) {
  const ps = (S.pairStates && S.pairStates[pair]) || null;
  if (!ps) return {};
  
  const result = {};
  
  let candles = null;
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= 14) {
    candles = S.realCandles[pair][tf];
  } else if (ps.candles && ps.candles.length >= 14) {
    candles = ps.candles;
  }
  
  if (!candles || candles.length < 14) {
    return { lastClose: ps.price || 0 };
  }
  
  const closes = candles.slice(-30).map(c => c.c).filter(c => isFinite(c) && c > 0);
  
  if (closes.length >= 15) {
    let gains = 0, losses = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      const diff = closes[i] - closes[i-1];
      if (diff >= 0) gains += diff;
      else losses += -diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) result.rsi = 100;
    else {
      const rs = avgGain / avgLoss;
      result.rsi = Math.round(100 - (100 / (1 + rs)));
    }
  }
  
  if (closes.length >= 26) {
    function ema(values, period) {
      const k = 2 / (period + 1);
      let e = values[0];
      for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
      return e;
    }
    const ema12 = ema(closes.slice(-26), 12);
    const ema26 = ema(closes.slice(-26), 26);
    result.macd = +(ema12 - ema26).toFixed(4);
  }
  
  if (closes.length >= 4) {
    const recentMove = ((closes[closes.length - 1] - closes[closes.length - 4]) / closes[closes.length - 4]) * 100;
    result.recentMove3 = +recentMove.toFixed(2);
  }
  
  if (closes.length >= 20) {
    const last20 = closes.slice(-20);
    const min20 = Math.min(...last20);
    const max20 = Math.max(...last20);
    if (max20 > min20) {
      result.rangePos = +((closes[closes.length - 1] - min20) / (max20 - min20)).toFixed(2);
    }
  }
  
  result.lastClose = closes[closes.length - 1];
  return result;
}
window._computeIndicatorsForContext = _computeIndicatorsForContext;
if(typeof _computeIndicatorsForContext==='function') window._computeIndicatorsForContext = _computeIndicatorsForContext;

function _computePairSharpe(pair) {
  if (!S.tradeContextMemory) return null;
  const trades = S.tradeContextMemory.filter(c => c.pair === pair && c.closedAt !== null && typeof c.pnlPct === 'number');
  if (trades.length < 5) return null;
  const returns = trades.map(t => t.pnlPct);
  const mean = returns.reduce((a,b) => a+b, 0) / returns.length;
  const variance = returns.reduce((a,b) => a + (b - mean) ** 2, 0) / returns.length;
  const stdev = Math.sqrt(variance);
  if (stdev === 0) return null;
  return +(mean / stdev).toFixed(3);
}
window._computePairSharpe = _computePairSharpe;
if(typeof _computePairSharpe==='function') window._computePairSharpe = _computePairSharpe;

function _computeRSI14(candles) {
  if (!candles || candles.length < 15) return null;
  const cl = candles.slice(-15).map(c => c.c).filter(v => typeof v === 'number');
  if (cl.length < 15) return null;
  let g = 0, l = 0;
  for (let i = 1; i < cl.length; i++) {
    const d = cl[i] - cl[i-1];
    if (d > 0) g += d; else l -= d;
  }
  const ag = g / 14, al = l / 14;
  return al ? 100 - (100 / (1 + ag / al)) : 100;
}
if(typeof _computeRSI14==='function') window._computeRSI14 = _computeRSI14;

function _computeSharpeAllocations() {
  const now = Date.now();
  if (S.adaptiveState && S.adaptiveState.sharpeAllocTs && (now - S.adaptiveState.sharpeAllocTs) < 10*60*1000) {
    return S.adaptiveState.sharpeAllocations || {};
  }
  
  const cfg = S.paperRealConfig || {};
  if (!cfg.sharpeAllocationEnabled) return {};
  
  const maxBoost = cfg.sharpeAllocationMaxBoost || 1.5;
  const minReduce = cfg.sharpeAllocationMinReduce || 0.4;
  
  const sharpeByPair = {};
  const allPairs = Object.keys(PAIRS || {});
  allPairs.forEach(p => {
    const s = _computePairSharpe(p);
    if (s !== null) sharpeByPair[p] = s;
  });
  
  const validSharpes = Object.values(sharpeByPair);
  if (validSharpes.length < 2) {
    if (!S.adaptiveState) S.adaptiveState = {};
    S.adaptiveState.sharpeByPair = sharpeByPair;
    S.adaptiveState.sharpeAllocations = {};
    S.adaptiveState.sharpeAllocTs = now;
    return {};
  }
  
  const minS = Math.min(...validSharpes);
  const maxS = Math.max(...validSharpes);
  const allocations = {};
  Object.keys(sharpeByPair).forEach(p => {
    const s = sharpeByPair[p];
    if (maxS === minS) {
      allocations[p] = 1.0;
    } else {
      const normalized = (s - minS) / (maxS - minS);
      allocations[p] = minReduce + normalized * (maxBoost - minReduce);
      allocations[p] = +allocations[p].toFixed(3);
    }
  });
  
  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.sharpeByPair = sharpeByPair;
  S.adaptiveState.sharpeAllocations = allocations;
  S.adaptiveState.sharpeAllocTs = now;
  return allocations;
}
window._computeSharpeAllocations = _computeSharpeAllocations;
if(typeof _computeSharpeAllocations==='function') window._computeSharpeAllocations = _computeSharpeAllocations;

function _confirmForceClose() {
  if (!_pendingClosePair) return;
  const pair = _pendingClosePair;
  const pos = (S.openPositions || []).find(p => p.pair === pair);
  if (pos && typeof closePosition === 'function') {
    try {
      closePosition(pos.id, false);
      S.chainLog.push({
        icon: '✕',
        desc: `Position ${pair} ${pos.side.toUpperCase()} fermée manuellement · forcée utilisateur`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      if (typeof showToast === 'function') {
        showToast('✕ ' + pair + ' ' + pos.side.toUpperCase() + ' fermée', 2500);
      }
    } catch(e) { console.warn('force close:', e); }
  }
  _cancelForceClose();
}
window._confirmForceClose = _confirmForceClose;
if(typeof _confirmForceClose==='function') window._confirmForceClose = _confirmForceClose;

function _detectReversal(pair, side) {
  const ps = (S.pairStates && S.pairStates[pair]) || null;
  if (!ps) return null;
  
  let candles = null;
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= 20) {
    candles = S.realCandles[pair][tf];
  } else if (ps.candles && ps.candles.length >= 20) {
    candles = ps.candles;
  }
  if (!candles || candles.length < 20) return null;
  
  const recent = candles.slice(-15);
  const closes = recent.map(c => c.c).filter(c => isFinite(c) && c > 0);
  const volumes = recent.map(c => c.v || 0).filter(v => isFinite(v) && v >= 0);
  if (closes.length < 14) return null;
  
  function rsi14(arr) {
    if (arr.length < 15) return null;
    let gains = 0, losses = 0;
    for (let i = arr.length - 14; i < arr.length; i++) {
      const diff = arr[i] - arr[i-1];
      if (diff >= 0) gains += diff;
      else losses += -diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  const rsiNow = rsi14(closes);
  const rsiBefore = rsi14(closes.slice(0, -7));
  if (rsiNow === null || rsiBefore === null) return null;
  
  const priceNow = closes[closes.length - 1];
  const priceBefore = closes[closes.length - 8] || closes[closes.length - 1];
  if (!isFinite(priceNow) || !isFinite(priceBefore)) return null;
  
  const cfg = S.paperRealConfig || {};
  const divThresh = cfg.reversalRsiDivergenceThreshold || 8;
  
  if (side === 'long' && priceNow > priceBefore && rsiBefore - rsiNow > divThresh) {
    let volConfirm = false;
    if (volumes.length >= 14) {
      const vNow = volumes.slice(-3).reduce((a,b)=>a+b,0) / 3;
      const vBefore = volumes.slice(0, -3).reduce((a,b)=>a+b,0) / Math.max(1, volumes.length - 3);
      if (vBefore > 0 && vNow < vBefore * 0.7) volConfirm = true;
    }
    return { reversalDetected: true, type: 'bearish_divergence', confidence: volConfirm ? 'high' : 'medium', rsiNow: Math.round(rsiNow), rsiBefore: Math.round(rsiBefore), volConfirm: volConfirm };
  }
  
  if (side === 'short' && priceNow < priceBefore && rsiNow - rsiBefore > divThresh) {
    let volConfirm = false;
    if (volumes.length >= 14) {
      const vNow = volumes.slice(-3).reduce((a,b)=>a+b,0) / 3;
      const vBefore = volumes.slice(0, -3).reduce((a,b)=>a+b,0) / Math.max(1, volumes.length - 3);
      if (vBefore > 0 && vNow < vBefore * 0.7) volConfirm = true;
    }
    return { reversalDetected: true, type: 'bullish_divergence', confidence: volConfirm ? 'high' : 'medium', rsiNow: Math.round(rsiNow), rsiBefore: Math.round(rsiBefore), volConfirm: volConfirm };
  }
  
  return { reversalDetected: false };
}
window._detectReversal = _detectReversal;
if(typeof _detectReversal==='function') window._detectReversal = _detectReversal;

function _drawSparkline(canvasId, candles, color, positive) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !candles || candles.length < 2) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  
  const closes = candles.slice(-20).map(c => c.c).filter(v => typeof v === 'number');
  if (closes.length < 2) return;
  
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  closes.forEach((c, i) => {
    const x = (i / (closes.length - 1)) * w;
    const y = h - ((c - min) / range) * (h - 2) - 1;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color);
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.15;
  ctx.fill();
  ctx.globalAlpha = 1;
}
if(typeof _drawSparkline==='function') window._drawSparkline = _drawSparkline;

function _ensurePulseCSS() {
  if (document.getElementById('nexus-pulse-css')) return;
  const style = document.createElement('style');
  style.id = 'nexus-pulse-css';
  style.textContent = `
    @keyframes nexusSavePulse {
      0%   { box-shadow: 0 0 0 0 rgba(167,139,250,0.7); border-color: rgba(167,139,250,.35); }
      50%  { box-shadow: 0 0 0 8px rgba(167,139,250,0); border-color: rgba(167,139,250,.9); }
      100% { box-shadow: 0 0 0 0 rgba(167,139,250,0); border-color: rgba(167,139,250,.35); }
    }
    .nexus-save-pulse { animation: nexusSavePulse 1s ease-out 2; }
  `;
  document.head.appendChild(style);
}
if(typeof _ensurePulseCSS==='function') window._ensurePulseCSS = _ensurePulseCSS;

function _getAdaptiveCooldownMs() {
  const cfg = S.paperRealConfig || {};
  if (!cfg.adaptiveCooldown) return cfg.cooldownMs || 30*60*1000;
  let median = null;
  if (typeof _getMarketVolatilityMedian === 'function') {
    median = _getMarketVolatilityMedian();
  }
  if (median === null || !isFinite(median)) return cfg.cooldownMs || 30*60*1000;
  let multiplier;
  if (median < 1.0)      multiplier = 0.5;
  else if (median < 2.0) multiplier = 0.75;
  else if (median < 3.0) multiplier = 1.0;
  else if (median < 4.5) multiplier = 1.5;
  else if (median < 6.0) multiplier = 2.0;
  else                   multiplier = 3.0;
  const baseMs = 30 * 60 * 1000;
  let ms = baseMs * multiplier;
  ms = Math.max(15*60*1000, Math.min(90*60*1000, ms));
  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.lastCooldownMs = ms;
  S.adaptiveState.lastMarketVolatility = median;
  return ms;
}
window._getAdaptiveCooldownMs = _getAdaptiveCooldownMs;
if(typeof _getAdaptiveCooldownMs==='function') window._getAdaptiveCooldownMs = _getAdaptiveCooldownMs;

function _getAdaptiveThreshold() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return 3000;
    const type = c.effectiveType;
    const downlink = c.downlink || 10;
    if (c.type === 'wifi') return 2000;
    if (type === '4g' && downlink >= 10) return 3000;
    if (type === '4g') return 4000;
    if (type === '3g') return 6000;
    return 5000;
  } catch(e) {
    return 3000;
  }
}
if(typeof _getAdaptiveThreshold==='function') window._getAdaptiveThreshold = _getAdaptiveThreshold;

function _getAgentVoteMultiplier(agentName) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.agentVotingAdaptive) return 1.0;
  if (!S.tradeContextMemory) return 1.0;
  
  let wins = 0, losses = 0;
  for (const c of S.tradeContextMemory) {
    if (c.closedAt === null) continue;
    if (!c.topAgents || c.topAgents.length === 0) continue;
    const found = c.topAgents.find(a => (a.name || '').startsWith(agentName.slice(0, 20)));
    if (!found) continue;
    if (c.won) wins++; else losses++;
  }
  const total = wins + losses;
  if (total < 5) return 1.0;
  const wr = wins / total;
  const boostMax = cfg.agentVoteBoostMax || 1.6;
  const reduceMin = cfg.agentVoteReduceMin || 0.4;
  let mult = 1.0 + (wr - 0.5) * 1.5;
  mult = Math.max(reduceMin, Math.min(boostMax, mult));
  return mult;
}
window._getAgentVoteMultiplier = _getAgentVoteMultiplier;
if(typeof _getAgentVoteMultiplier==='function') window._getAgentVoteMultiplier = _getAgentVoteMultiplier;

function _getEffectiveWR() {
  const stats = S.paperRealStats || {};
  let wins = 0, losses = 0;
  Object.values(stats).forEach(s => {
    wins += (s.wins || 0);
    losses += (s.losses || 0);
  });
  const total = wins + losses;
  if (total < 10) return null;
  return wins / total;
}
window._getEffectiveWR = _getEffectiveWR;
if(typeof _getEffectiveWR==='function') window._getEffectiveWR = _getEffectiveWR;

function _getHourBucket(hour) {
  if (hour >= 0 && hour < 6) return 'night';
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}
if(typeof _getHourBucket==='function') window._getHourBucket = _getHourBucket;

function _getMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
if(typeof _getMonthKey==='function') window._getMonthKey = _getMonthKey;

function _getNetwatchThreshold() {
  return _getAdaptiveThreshold();
}
window._getNetwatchThreshold = _getNetwatchThreshold;
if(typeof _getNetwatchThreshold==='function') window._getNetwatchThreshold = _getNetwatchThreshold;

function _getPairCorrelation(pairA, pairB) {
  if (pairA === pairB) return 1.0;
  const matrix = _computeCorrelationMatrix();
  const key = (pairA < pairB) ? pairA + '|' + pairB : pairB + '|' + pairA;
  return matrix[key] !== undefined ? matrix[key] : null;
}
window._getPairCorrelation = _getPairCorrelation;
if(typeof _getPairCorrelation==='function') window._getPairCorrelation = _getPairCorrelation;

function _getPairReturns(pair) {
  const ps = (S.pairStates && S.pairStates[pair]) || null;
  if (!ps) return null;
  let candles = null;
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= 30) {
    candles = S.realCandles[pair][tf];
  } else if (ps.candles && ps.candles.length >= 30) {
    candles = ps.candles;
  }
  if (!candles || candles.length < 30) return null;
  const closes = candles.slice(-30).map(c => c.c).filter(c => isFinite(c) && c > 0);
  if (closes.length < 30) return null;
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i-1]));
  }
  return returns;
}
if(typeof _getPairReturns==='function') window._getPairReturns = _getPairReturns;

function _getTodayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
if(typeof _getTodayKey==='function') window._getTodayKey = _getTodayKey;

function _getWeekKey() {
  const d = new Date();
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((d - start) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return year + '-W' + String(week).padStart(2, '0');
}
if(typeof _getWeekKey==='function') window._getWeekKey = _getWeekKey;

function _giveBackToBot(pair) {
  if (S._manualPairs) delete S._manualPairs[pair];
  S.chainLog.push({ icon: '🤖', desc: `Contrôle rendu au bot · ${pair}`, hash: rndHash(), time: nowStr() });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  if (typeof showToast === 'function') { showToast('🤖 Bot réactivé · ' + pair, 2500); }
  if (_currentDetailPair === pair) { closePairDetail(); setTimeout(() => openPairDetail(pair), 100); }
}
window._giveBackToBot = _giveBackToBot;
if(typeof _giveBackToBot==='function') window._giveBackToBot = _giveBackToBot;

function _initNetIndicator() {
  try { _updateNetIndicator(); } catch(e) {}
}
if(typeof _initNetIndicator==='function') window._initNetIndicator = _initNetIndicator;

// v123 : la fonction _installPackContinuite a été supprimée d'ici.
// Elle n'était jamais appelée (confirmé par multi-search sur tout le repo).
// Les hooks de continuité (pagehide/freeze/beforeunload/visibilitychange)
// sont désormais dans 09b2-save-load.js v123, avec écriture SYNCHRONE
// (vs async ici qui ne finissait pas avant que le browser gèle).

function _isPairManual(pair) {
  return !!(S._manualPairs && S._manualPairs[pair]);
}
window._isPairManual = _isPairManual;
if(typeof _isPairManual==='function') window._isPairManual = _isPairManual;

function _isPairPaused(pair) {
  return !!(S._pausedPairs && S._pausedPairs[pair]);
}
window._isPairPaused = _isPairPaused;
if(typeof _isPairPaused==='function') window._isPairPaused = _isPairPaused;

function _maybeAskNotifPermission() { /* désactivé · Q3 */ }
if(typeof _maybeAskNotifPermission==='function') window._maybeAskNotifPermission = _maybeAskNotifPermission;

function _maybeAutoExport() { /* désactivé · Q1:B */ }
if(typeof _maybeAutoExport==='function') window._maybeAutoExport = _maybeAutoExport;

function _mutateValue(value, strength, min, max) {
  const u1 = Math.random();
  const u2 = Math.random();
  const gaussian = Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
  const delta = value * strength * gaussian * 0.5;
  let mutated = value + delta;
  mutated = Math.max(min, Math.min(max, mutated));
  return +mutated.toFixed(3);
}
window._mutateValue = _mutateValue;
if(typeof _mutateValue==='function') window._mutateValue = _mutateValue;

function _netwatchTick() {
  const now = Date.now();
  const elapsed = now - _lastRealPriceTs;
  
  if (_netwatchState === 'online' && elapsed > _getNetwatchThreshold()) {
    _netwatchState = 'offline';
    _netOfflineSinceTs = now;
    _freshPricesInRow = 0;
    _updateNetIndicator();
    
    if (_simRunning && typeof _simRunning !== 'undefined') {
      _netwatchPausedBot = true;
      S._netPaused = true;
    }
  }
  
  if (_netwatchState === 'offline' && !S._netToastShown && elapsed > _getNetwatchThreshold() * 2) {
    S._netToastShown = true;
    S.chainLog.push({ icon: '🔴', desc: 'Coupure connexion détectée · bot en pause (ouverture bloquée, SL/TP actif)', hash: rndHash(), time: nowStr() });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    if (typeof showToast === 'function') { showToast('Connexion instable · bot en pause', 3000, 'user'); }
  }
  if (_netwatchState === 'online') S._netToastShown = false;
  
  if (_netwatchState === 'offline' && !_net10sSaveTriggered && elapsed > _getNetwatchThreshold() * 3) {
    _net10sSaveTriggered = true;
    try {
      if (typeof saveState === 'function') saveState(true);
      S.chainLog.push({ icon: '💾', desc: 'Coupure > 10s · sauvegarde forcée', hash: rndHash(), time: nowStr() });
    } catch(e) { console.warn('netwatch 10s save failed:', e); }
  }
  
  if (_netwatchState === 'online') _updateNetIndicator();
}
if(typeof _netwatchTick==='function') window._netwatchTick = _netwatchTick;

function _notifIfRare() { /* désactivé · Q3 */ }
if(typeof _notifIfRare==='function') window._notifIfRare = _notifIfRare;

function _openManTrade(pair, side) {
  const pairKey = pair.replace('/','_');
  const stake = parseFloat(document.getElementById('manIn_stake_' + pairKey)?.value) || 10;
  const lev = parseInt(document.getElementById('manIn_lev_' + pairKey)?.value) || 1;
  const tp = parseFloat(document.getElementById('manIn_tp_' + pairKey)?.value) || null;
  const sl = parseFloat(document.getElementById('manIn_sl_' + pairKey)?.value) || null;
  
  const ps = S.pairStates[pair];
  if (!ps) { if (typeof showToast === 'function') showToast('⚠ Paire invalide'); return; }
  
  ps.stake = stake;
  ps.pairLeverage = lev;
  
  if (typeof openPosition === 'function') {
    try {
      openPosition(pair, side);
      setTimeout(() => {
        const newPos = S.openPositions.find(p => p.pair === pair && p.auto !== true);
        if (newPos) {
          if (tp && tp > 0) newPos.tp = tp;
          if (sl && sl > 0) newPos.sl = sl;
          newPos._manOpenedAt = Date.now();
          newPos._manMaxLossPct = S._manConsignes?.[pair]?.maxLossPct || 2.0;
          newPos._manTimeoutMin = S._manConsignes?.[pair]?.timeoutMin || 60;
        }
      }, 50);
      
      S.chainLog.push({ icon: '🎛️', desc: `Trade MANUEL ${pair} ${side.toUpperCase()} · mise $${stake} · levier ×${lev}`, hash: rndHash(), time: nowStr() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      if (typeof showToast === 'function') { showToast('🎛️ ' + pair + ' ' + side.toUpperCase() + ' ouvert · $' + stake, 2500); }
      closePairDetail();
    } catch(e) { console.warn('manual open:', e); }
  }
}
window._openManTrade = _openManTrade;
if(typeof _openManTrade==='function') window._openManTrade = _openManTrade;

function _p4AntiDetteWatchdog() {
  if (typeof S === 'undefined' || !S) return;
  
  const leverage = S.leverage || 0;
  const debtAuto = S._autoLevBorrowed || 0;
  const debtTotal = S.leverageBorrowed || 0;
  const trading  = S.tradingAccount || 0;
  
  const debtInPositions = (S.openPositions || []).reduce((s, p) => s + (p.levBorrowed || 0), 0);
  const orphanDebt = Math.max(0, debtTotal - debtInPositions);
  
  if (leverage === 0 && orphanDebt > 0 && trading > 0) {
    const committedInPositions = (S.openPositions || []).reduce((s, p) => s + (p.stakeUsdt || 0), 0);
    const freeInTrading = Math.max(0, trading - committedInPositions);
    const repay = Math.min(orphanDebt, freeInTrading);
    
    if (repay > 0) {
      S.tradingAccount   = Math.max(0, trading - repay);
      S.leverageBorrowed = Math.max(0, debtTotal - repay);
      S._autoLevBorrowed = Math.max(0, debtAuto - repay);
      S.portfolio        = (S.cashAccount || 0) + (S.tradingAccount || 0);
      if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
      S.chainLog.push({ icon: '🔧', desc: `P12 Watchdog · remboursement dette orpheline $${repay.toFixed(2)} (reste $${(S.leverageBorrowed||0).toFixed(2)})`, hash: (typeof rndHash === 'function' ? rndHash() : Math.random().toString(36).slice(2,10)), time: (typeof nowStr === 'function' ? nowStr() : new Date().toLocaleTimeString()) });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
  }
  
  if ((S.openPositions || []).length === 0 && debtTotal > 0 && trading > 0) {
    const repay = Math.min(debtTotal, trading);
    if (repay > 0) {
      S.tradingAccount   = Math.max(0, trading - repay);
      S.leverageBorrowed = Math.max(0, debtTotal - repay);
      S._autoLevBorrowed = Math.max(0, debtAuto - repay);
      S.portfolio        = (S.cashAccount || 0) + (S.tradingAccount || 0);
      if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
      S.chainLog.push({ icon: '🔧', desc: `P12 · Aucune position ouverte · remboursement total $${repay.toFixed(2)}`, hash: rndHash(), time: nowStr() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
  }
}
if(typeof _p4AntiDetteWatchdog==='function') window._p4AntiDetteWatchdog = _p4AntiDetteWatchdog;

function _p5InvariantCheck() {
  if (typeof S === 'undefined' || !S) return;
  
  const posLevSum = (S.openPositions || []).reduce((s, p) => s + (p.levBorrowed || 0), 0);
  const totalBorrow = S.leverageBorrowed || 0;
  const autoBorrow = S._autoLevBorrowed || 0;
  
  if ((S.leverage || 0) === 0 && autoBorrow > 0 && posLevSum === 0) {
    if (!S._p5LastWarn || Date.now() - S._p5LastWarn > 5 * 60 * 1000) {
      S._p5LastWarn = Date.now();
      console.warn('[P5 INVARIANT] Dette orpheline détectée: $' + autoBorrow.toFixed(2) + ' sans position · P4 sera déclenché');
    }
    _p4AntiDetteWatchdog();
  }
  
  if (totalBorrow < posLevSum - 0.01) {
    console.error('[P5 INVARIANT] leverageBorrowed (' + totalBorrow.toFixed(2) + ') < somme pos.levBorrowed (' + posLevSum.toFixed(2) + ')');
    S.leverageBorrowed = posLevSum;
  }
}
if(typeof _p5InvariantCheck==='function') window._p5InvariantCheck = _p5InvariantCheck;

function _pearsonCorrelation(returnsA, returnsB) {
  const n = Math.min(returnsA.length, returnsB.length);
  if (n < 10) return null;
  const a = returnsA.slice(-n);
  const b = returnsB.slice(-n);
  const meanA = a.reduce((x,y) => x+y, 0) / n;
  const meanB = b.reduce((x,y) => x+y, 0) / n;
  let num = 0, denomA = 0, denomB = 0;
  for (let i = 0; i < n; i++) {
    const dA = a[i] - meanA;
    const dB = b[i] - meanB;
    num += dA * dB;
    denomA += dA * dA;
    denomB += dB * dB;
  }
  const denom = Math.sqrt(denomA * denomB);
  if (denom === 0) return null;
  return num / denom;
}
if(typeof _pearsonCorrelation==='function') window._pearsonCorrelation = _pearsonCorrelation;

function _pulseSettingsBtn() {
  const btn = document.getElementById('settingsBtn');
  if (!btn) return;
  btn.classList.add('nexus-save-pulse');
  if (_settingsPulseTimer) clearTimeout(_settingsPulseTimer);
  _settingsPulseTimer = setTimeout(() => {
    btn.classList.remove('nexus-save-pulse');
    _settingsPulseTimer = null;
  }, 2000);
}
if(typeof _pulseSettingsBtn==='function') window._pulseSettingsBtn = _pulseSettingsBtn;

function _recomputeAllAgentBoosts() {
  if (!S.agents) return;
  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.lastAgentBoosts = {};
  S.agents.forEach(a => {
    if (a.isBot || a.isMeta) return;
    const name = (a.name || '').split(' ')[0].slice(0, 20);
    if (!name) return;
    const mult = _getAgentVoteMultiplier(name);
    if (mult !== 1.0) { S.adaptiveState.lastAgentBoosts[name] = mult; }
  });
}
window._recomputeAllAgentBoosts = _recomputeAllAgentBoosts;
if(typeof _recomputeAllAgentBoosts==='function') window._recomputeAllAgentBoosts = _recomputeAllAgentBoosts;

function _requestNotifPermission() { return Promise.resolve(false); }
if(typeof _requestNotifPermission==='function') window._requestNotifPermission = _requestNotifPermission;

function _resolvePairCycleCore(pair, ps) {
  const cfg = PAIRS[pair];

  const tech = getTechSignals(pair);
  const fund = getFundamentalSignals(pair);
  const raw  = tech?.raw || null;

  const atScore    = tech?.atScore   || 0;
  const fundScore  = fund?.fundScore || 0;
  const composite  = Math.max(-1, Math.min(1, atScore*0.60 + fundScore*0.40));

  const totalFitness   = S.agents.reduce((s,a) => s + (a.fitness||1), 0) || 1;
  const _currentRegime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';
  const _signalAgents = S.agents.filter(a => !a.isBot && !a.isMeta);
  const totalContextFit = _signalAgents.reduce((s,a) => s + (typeof getContextualWeight === 'function' ? getContextualWeight(a, _currentRegime) : (a.fitness||1)), 0) || 1;
  let _weightSum = 0;
  const _contribs = _signalAgents.map(a => {
    const raw = (a.score||0);
    if(Math.abs(raw) < 0.03) return { w:0, sig:0 };
    const cw = typeof getContextualWeight === 'function' ? getContextualWeight(a, _currentRegime) : (a.fitness||1);
    const convBoost = 1 + Math.pow(Math.abs(raw), 2) * 2;
    const w = cw * convBoost;
    _weightSum += w;
    const sig = Math.sign(raw) * Math.pow(Math.abs(raw), 1.15);
    return { w, sig };
  });
  const agentConsensus = _weightSum > 0
    ? _contribs.reduce((s, c) => s + c.sig * (c.w / _weightSum), 0)
    : 0;

  const lmsrProb  = lmsrP(ps);
  const lmsrScore = (lmsrProb - 0.5) * 2;

  const _sameSign = (a, b) => a === 0 || b === 0 || Math.sign(a) === Math.sign(b);
  const _allAligned = _sameSign(composite, agentConsensus) && _sameSign(agentConsensus, lmsrScore) && _sameSign(composite, lmsrScore);
  const _strongDisagree = !_allAligned &&
    Math.abs(composite) > 0.15 && Math.abs(agentConsensus) > 0.15 &&
    Math.sign(composite) !== Math.sign(agentConsensus);
  const _alignBonus = _allAligned ? 1.20 : (_strongDisagree ? 0.85 : 1.0);
  const _rawFinal = composite*0.30 + agentConsensus*0.50 + lmsrScore*0.20;
  const finalSignal = Math.max(-1, Math.min(1, _rawFinal * _alignBonus));

  let memBias = 0, memBiasCnt = 0;
  S.agents.filter(a => !a.isBot && !a.isMeta).forEach(a => {
    const recall = typeof recallMemory === 'function' ? recallMemory(a, pair, a.score) : null;
    if(recall) {
      const bias = recall.memory.won
        ? recall.strength * a.score * 0.08
        : -recall.strength * Math.abs(a.score) * 0.05;
      const fitWeight = (a.fitness || 1) / 1500;
      memBias += bias * fitWeight;
      memBiasCnt++;
      if(tick % 12 === 0) {
        const card = document.getElementById('agcard_' + a.id);
        if(card) { card.classList.add('memory-recall-pulse'); setTimeout(() => card.classList.remove('memory-recall-pulse'), 900); }
      }
    }
  });
  const memBiasFinal = memBiasCnt > 0 ? memBias / memBiasCnt : 0;
  const finalSignalWithMem = Math.max(-1, Math.min(1, finalSignal + memBiasFinal));

  let techBonus = 0;
  if(tech) {
    const dir = finalSignalWithMem > 0 ? 'bull' : 'bear';
    Object.values(tech.signals||{}).forEach(s => { if(s?.signal === dir) techBonus += 0.04; });
    techBonus = Math.min(0.25, techBonus);
  }

  const conviction         = Math.abs(finalSignalWithMem);
  const effectiveConviction = Math.min(1, conviction + techBonus);

  const targetProb = 0.5 + finalSignalWithMem * 0.40;
  const curProb    = lmsrP(ps);
  const nudge      = (targetProb - curProb) * Math.max(0.3, effectiveConviction) * 8;
  if(nudge > 0)      ps.qYes = Math.max(10, ps.qYes + nudge);
  else if(nudge < 0) ps.qNo  = Math.max(10, ps.qNo  - nudge);
  const qTotal = ps.qYes + ps.qNo;
  if(qTotal > 800) { const r = 200/qTotal; ps.qYes = Math.max(10, ps.qYes*r); ps.qNo = Math.max(10, ps.qNo*r); }

  const adxVal    = raw?.adx?.adx || 20;
  const volCV     = raw?.stddev?.cv || 0.015;
  const adxFilter = adxVal<18?0.75:adxVal<25?0.90:1.0;
  const volFilter = volCV>0.05?0.85:volCV<0.008?1.10:1.0;
  const minConv   = 0.48;

  if(!ps.userCycleSet) {
    const tc=Math.round(Math.max(10,Math.min(300,(1-effectiveConviction*0.65)*(1+volCV*28)*55))/10)*10;
    if(Math.abs(tc-ps.cycleMax)>=10){
      const prevCycle = ps.cycleMax;
      ps.cycleMax=tc; ps.cycleTimer=Math.min(ps.cycleTimer,ps.cycleMax);
      const pk=pair.replace('/','_');
      const ce=document.getElementById('pcycle_'+pk),fe=document.getElementById('ac2_freq_'+pk),tl=document.getElementById('ac2_thrlbl_'+pk);
      const autoLbl=document.getElementById('ac2_autoind_'+pk);
      if(ce)ce.textContent=fmtDur(ps.cycleMax);if(fe)fe.textContent=fmtDur(ps.cycleMax);
      if(tl)tl.textContent=((ps.threshold||0.65)*100).toFixed(0)+'% · '+fmtDur(ps.cycleMax);
      if(autoLbl){ autoLbl.textContent='🤖 '+fmtDur(tc); autoLbl.style.color='var(--pur)';
        setTimeout(()=>{ if(autoLbl) autoLbl.style.color='var(--t3)'; }, 2000); }
      if(S.cycle % 5 === 0) S.chainLog.push({ icon:'⏱', desc:`Bot ${pair}: cycle ${fmtDur(prevCycle)}→${fmtDur(tc)} · conv. ${(effectiveConviction*100).toFixed(0)}%`, hash:rndHash(), time:nowStr() });
    }
  }

  const adjProb = lmsrP(ps);

  const convGate = effectiveConviction >= (0.18 - (S._convBoost || 0));
  const dirGate  = Math.abs(finalSignalWithMem) >= (0.10 - (S._convBoost || 0) * 0.5);
  const lmsrAlignBuy  = adjProb > 0.50;
  const lmsrAlignSell = adjProb < 0.50;
  const convOverride  = effectiveConviction > 0.25;

  const isBuy  = finalSignalWithMem > 0 && convGate && dirGate && (lmsrAlignBuy  || convOverride);
  const isSell = finalSignalWithMem < 0 && convGate && dirGate && (lmsrAlignSell || convOverride);
  const action = isBuy ? 'buy' : isSell ? 'sell' : 'hold';
  ps.lastAction = action;
  if(action==='hold'){if(!ps.holdStartTs)ps.holdStartTs=Date.now();}else{ps.holdStartTs=0;}

  if(tick%6===0){
    S.agents.forEach(a=>{
      const pull=finalSignalWithMem*0.005*(a.conf||0.5);
      a.score=Math.max(-1,Math.min(1,a.score+pull+(Math.random()-0.5)*0.001));
    });
  }

  const manualPos=S.openPositions.find(p=>p.pair===pair&&p.auto!==true);
  if(manualPos){
    const mPnl=manualPos.side==='long'
      ?((ps.price-manualPos.entryPrice)/manualPos.entryPrice*100)
      :((manualPos.entryPrice-ps.price)/manualPos.entryPrice*100);
    if(Math.abs(mPnl)>0.2)learnFromOutcome('cycle',mPnl,pair);
    return;
  }

  const botPos=S.openPositions.find(p=>p.pair===pair&&p.auto===true);
  if(botPos){
    const posDir=botPos.side==='long'?1:-1;
    const sigDir=isBuy?1:isSell?-1:0;
    const pnlPct=botPos.side==='long'
      ?((ps.price-botPos.entryPrice)/botPos.entryPrice*100)
      :((botPos.entryPrice-ps.price)/botPos.entryPrice*100);
    const pnlUsd=botPos.stakeUsdt*(pnlPct/100);
    botPos.pnl=pnlPct; botPos.pnlUsdt=pnlUsd; botPos.currentVal=botPos.stakeUsdt+pnlUsd;

    const tpPct=Math.max(1.2,effectiveConviction*4.5*(1+volCV*8));
    const slPct=Math.max(0.6,tpPct*0.35);

    if(pnlPct>tpPct*0.45){
      const be=botPos.entryPrice*(1+(botPos.side==='long'?0.001:-0.001));
      if(botPos.side==='long' &&(!botPos.sl||botPos.sl<be))botPos.sl=be;
      if(botPos.side==='short'&&(!botPos.sl||botPos.sl>be))botPos.sl=be;
    }

    const tpHit=pnlPct>=tpPct;
    const slHit=pnlPct<=-slPct;
    const sigRev=sigDir!==0&&sigDir!==posDir&&effectiveConviction>0.65;
    botPos._holdCycles=(botPos._holdCycles||0)+1;
    const minHoldMet = botPos._holdCycles >= 5;
    const maxHold=Math.ceil(8/Math.max(0.1,effectiveConviction));
    const timeClose=botPos._holdCycles>=maxHold;
    const oppWeight=S.agents.filter(a=>{const ad=a.score>0.05?1:a.score<-0.05?-1:0;return ad!==0&&ad!==posDir;}).reduce((s,a)=>s+(a.fitness||1),0)/totalFitness;
    const consRev=oppWeight>0.75&&effectiveConviction>0.55;

    const canBotClose = S.botAutoMode !== false;
    if(canBotClose && (slHit || (minHoldMet && (tpHit||sigRev||timeClose||consRev)))){
      const why=tpHit?`TP +${tpPct.toFixed(1)}%`:slHit?`SL −${slPct.toFixed(1)}%`:(sigRev||consRev)?'Signal inversé':'Timeout';
      closePosition(botPos.id,true);
      learnFromOutcome('trade',pnlPct,pair);
      showToast(`${pnlPct>=0?'💰':'📉'} Bot ${pair} ${why} · ${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}%`);
      ps.qYes=100+Math.floor(Math.random()*20); ps.qNo=100+Math.floor(Math.random()*20);
    } else {
      learnFromOutcome('cycle',pnlPct*0.08,pair);
    }
    S.totalTrades=Object.values(S.pairStates).reduce((s,p)=>s+p.totalTrades,0);
    S.winTrades=Object.values(S.pairStates).reduce((s,p)=>s+p.winTrades,0);
    if(S.chainLog.length>100)S.chainLog.splice(0,S.chainLog.length-100);
    return;
  }

  if(action==='hold' || effectiveConviction < 0.15) {
    const candles=ps.candles;
    const move=candles.length>1?(candles[candles.length-1].c-candles[candles.length-2].c)/ps.price*100:0;
    learnFromOutcome('cycle',move,pair);
    ps.qYes = Math.max(20, 100 + (ps.qYes - 100) * 0.95);
    ps.qNo  = Math.max(20, 100 + (ps.qNo  - 100) * 0.95);
    return;
  }

  const _fc      = S.feeConfig;
  const _reg     = S.taxConfig.regions[S.taxConfig.region];
  const _feePct  = (_fc.takerRate + _fc.slippage) * 2 + _fc.fundingRate * 3;
  // Taux fiscal réellement applicable (régime normal/spéculatif détecté) — cohérent recordFees
  const _frBE = (typeof detectFiscalRegime === 'function') ? detectFiscalRegime() : { rate:(_reg?.rate||0), inclusion:(_reg?.inclusion||0) };
  const _taxPct  = (_frBE.inclusion||0) * (_frBE.rate||0);
  // RENTABILITÉ RÉELLE : la taxe frappe le GAIN, pas la conviction.
  // On estime le gain visé (TP), on retire les frais (aller-retour, sur le notionnel)
  // puis l'impôt sur le gain restant, et on exige un gain NET minimum.
  // (L'ancien _breakEven = _feePct + _taxPct comparait une conviction 0-1 à un taux
  //  d'imposition, ce qui bloquait quasi tout trade en régime spéculatif.)
  const _breakEven = _feePct + _taxPct;
  // ── BOT FISCAL · avis d'optimisation des frais PAR PAIRE (consulté par le décisionnaire) ──
  // Estime le TP visé pour évaluer le poids des frais+taxes ; durcit le seuil si défavorable.
  // Optimise sans interdire : un signal très fort peut toujours passer.
  let _fiscalSeuilFactor = 1.0;
  try {
    if (typeof fiscalBotAdvicePerPair === 'function') {
      const _tpGuess = Math.max(0.7, effectiveConviction * 3.2 * (1 + volCV * 9)); // même formule que tpPctE
      const _adv = fiscalBotAdvicePerPair(pair, _tpGuess);
      _fiscalSeuilFactor = _adv.seuilFactor || 1.0;
      if (_adv.advice === 'défavorable' && (S.cycle % 8 === 0)) {
        S.chainLog.push({ icon:'💎', desc:`Bot Fiscal ${pair} · ${_adv.reason} · seuil durci ×${_fiscalSeuilFactor.toFixed(2)}`, hash:rndHash(), time:nowStr() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
    }
  } catch(e) {}
  // Gain visé (même formule que le TP réel tpPctE plus bas), en fraction.
  const _tpFrac     = Math.max(0.7, effectiveConviction * 3.2 * (1 + volCV * 9)) / 100;
  // Gain net espéré = gain - frais aller-retour - impôt sur le gain net de frais.
  const _gainAfterFees = _tpFrac - _feePct;
  const _gainNet       = _gainAfterFees - Math.max(0, _gainAfterFees) * _taxPct;
  // Seuil de gain net minimum, durci par l'avis du bot fiscal (optimise sans interdire).
  const _minNetGain    = 0.0015 * _fiscalSeuilFactor;   // 0.15% net de base
  // On s'abstient si le gain net réel ne couvre pas le minimum, OU si la conviction
  // est sous 0.40 : en dessous, le signal est trop faible (le bot perdait en ouvrant
  // des trades à conviction 26-36%, touchés au stop-loss). On ne trade que les signaux
  // solides (conviction >= 40%).
  if(_gainNet < _minNetGain || effectiveConviction < 0.40) {
    learnFromOutcome('cycle', 0, pair);
    ps.qYes = Math.max(20, 100 + (ps.qYes - 100) * 0.95);
    ps.qNo  = Math.max(20, 100 + (ps.qNo  - 100) * 0.95);
    return;
  }
  if(!ps.userCycleSet) {
    const optThr = Math.min(0.72, Math.max(0.55, 0.50 + _breakEven * 6 + effectiveConviction * 0.10));
    if(Math.abs(optThr - (ps.threshold||0.65)) > 0.02) {
      ps.threshold = Math.round(optThr * 100) / 100;
      const _pk2 = pair.replace('/','_');
      const _thl = document.getElementById('ac2_thrlbl_'+_pk2);
      if(_thl) _thl.textContent = (ps.threshold*100).toFixed(0)+'% · '+fmtDur(ps.cycleMax);
    }
  }
  const side = action==='buy'?'long':'short';
  const stakeBase = Math.max(10, ps.stake || 10);
  const lmsrBonus  = (action==='buy' && adjProb > 0.52) || (action==='sell' && adjProb < 0.48) ? 1.20 : 1.0;
  const kellyFrac  = Math.min(0.15, effectiveConviction * 0.35);
  const maxStake   = S.tradingAccount * kellyFrac * lmsrBonus;
  const convScale  = 0.40 + (0.60 * effectiveConviction);
  const stakeRaw   = Math.max(stakeBase, maxStake * convScale);
  const stakeUsdt  = Math.round(stakeRaw*adxFilter*volFilter*10)/10;
  
  let finalStake = stakeUsdt;
  if (S.tradingMode === 'paperReal' && typeof _checkPaperRealStakeLimit === 'function') {
    finalStake = _checkPaperRealStakeLimit(stakeUsdt, pair, side);
  }

  const tpPctE=Math.max(0.7,effectiveConviction*3.2*(1+volCV*9));
  // SL adapté à la volatilité : placé HORS du bruit du marché (1.2× le bruit), mais
  // borné à TP/1.5 pour garder un ratio gain/perte favorable (>= 1.5). L'ancien
  // SL = TP×0.42 (0.35-1.1%) tombait DANS le bruit crypto (±0.5-1%/min) : touché par
  // le bruit, le trade sortait en perte puis le prix repartait dans le bon sens.
  const _slNoise = (volCV * 100) * 1.2;   // 1.2× le bruit (volCV exprimé en fraction)
  const slPctE   = Math.max(0.35, Math.min(_slNoise, tpPctE / 1.5));
  const tpE   =ps.price*(1+(side==='long'?1:-1)*tpPctE/100);
  const slE   =ps.price*(1-(side==='long'?1:-1)*slPctE/100);

  autoOpenPosition(pair, side, finalStake);

  const np = S.openPositions.find(p => p.pair===pair && p.auto===true);
  if(np) { np.tp=tpE; np.sl=slE; np._holdCycles=0; }

  const pt=cfg.dec>=4?ps.price.toFixed(cfg.dec):Math.floor(ps.price).toLocaleString();
  const tt=cfg.dec>=4?tpE.toFixed(cfg.dec):Math.floor(tpE).toLocaleString();
  const st=cfg.dec>=4?slE.toFixed(cfg.dec):Math.floor(slE).toLocaleString();
  S.chainLog.push({icon:side==='long'?'🟢':'🔴',
    desc:`BOT ${side.toUpperCase()} ${pair} @${pt} | AT:${(atScore*100).toFixed(0)}% AF:${(fundScore*100).toFixed(0)}% Ag:${(agentConsensus*100).toFixed(0)}% Conv:${(effectiveConviction*100).toFixed(0)}% | TP:${tt} SL:${st}`,
    hash:rndHash(),time:nowStr()});
  showToast(`🤖 Bot ${side.toUpperCase()} ${pair} · AT${atScore>=0?'+':''}${(atScore*100).toFixed(0)}% AF${fundScore>=0?'+':''}${(fundScore*100).toFixed(0)}% · ${(effectiveConviction*100).toFixed(0)}%`);

  S.totalTrades=Object.values(S.pairStates).reduce((s,p)=>s+p.totalTrades,0);
  S.winTrades  =Object.values(S.pairStates).reduce((s,p)=>s+p.winTrades,0);
  if(S.chainLog.length>100)S.chainLog.splice(0,S.chainLog.length-100);
}
if(typeof _resolvePairCycleCore==='function') window._resolvePairCycleCore = _resolvePairCycleCore;

function _resolvePaperRealCycle(pair, ps) {
  if (!(S.paperRealActivePairs && S.paperRealActivePairs[pair])) return;

  const now = Date.now();
  if (S.paperRealGlobalPauseUntil && now < S.paperRealGlobalPauseUntil) return;

  const ks = (S.paperRealKillSwitch && S.paperRealKillSwitch[pair]) || null;
  if (ks && ks.paused) return;

  const cfg = S.paperRealConfig || {};
  let cooldownMs;
  if (typeof _getAdaptiveCooldownMs === 'function') {
    cooldownMs = _getAdaptiveCooldownMs();
  } else {
    cooldownMs = cfg.cooldownMs || 30 * 60 * 1000;
  }
  const lastClose = (S.paperRealLastClose || {})[pair] || 0;
  if (lastClose > 0 && (now - lastClose) < cooldownMs) return;

  const tf = S.paperRealTimeframe || '15m';
  const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf]) || [];
  if (arr.length < 30) return;

  if (arr.length < 2) return;
  const closedTs = arr[arr.length - 2].ts;
  const lastSeenTs = (S.realPairCycle && S.realPairCycle[pair]) || 0;
  if (closedTs <= lastSeenTs) return;
  if (!S.realPairCycle) S.realPairCycle = {};
  S.realPairCycle[pair] = closedTs;

  const tfMs = { '5m':300000, '15m':900000, '1h':3600000, '4h':14400000, '1j':86400000 }[tf] || 900000;
  const dataAge = now - arr[arr.length - 1].ts;
  const stalenessThreshold = Math.max(tfMs * 2.5, 120000);
  if (dataAge > stalenessThreshold) {
    if (typeof _fetchAndBootstrapRealCandles === 'function') {
      _fetchAndBootstrapRealCandles(pair, tf);
    }
    return;
  }

  const lastCandle = arr[arr.length - 1];
  if (lastCandle && isFinite(lastCandle.o) && lastCandle.o > 0) {
    const movePct = Math.abs(lastCandle.c - lastCandle.o) / lastCandle.o * 100;
    const maxMove = cfg.maxRecentMovePct || 3.0;
    if (movePct > maxMove) return;
  }

  const maxConcurrent = cfg.maxConcurrentPos || 1;
  const openPositions = (S.openPositions || []).filter(p => p.auto === true);
  if (openPositions.length >= maxConcurrent) return;

  const _regime = (typeof detectMarketRegime === 'function') ? detectMarketRegime() : 'calm';
  S._paperRealCurrentRegime = _regime;

  return _resolvePairCycleCore(pair, ps);
}
window._resolvePaperRealCycle = _resolvePaperRealCycle;
if(typeof _resolvePaperRealCycle==='function') window._resolvePaperRealCycle = _resolvePaperRealCycle;

function _saveManConsigne(pair, field, value) {
  if (!S._manConsignes) S._manConsignes = {};
  if (!S._manConsignes[pair]) S._manConsignes[pair] = { maxLossPct: 2.0, timeoutMin: 60 };
  const n = parseFloat(value);
  if (!isNaN(n) && n > 0) { S._manConsignes[pair][field] = n; }
}
window._saveManConsigne = _saveManConsigne;
if(typeof _saveManConsigne==='function') window._saveManConsigne = _saveManConsigne;

function _showForceCloseConfirm(pair) {
  const pos = (S.openPositions || []).find(p => p.pair === pair);
  if (!pos) return;
  
  _pendingClosePair = pair;
  
  const title = document.getElementById('closeConfirmTitle');
  const body = document.getElementById('closeConfirmBody');
  const overlay = document.getElementById('closeConfirmOverlay');
  
  if (title) {
    const sideLabel = pos.side === 'long' ? 'LONG' : 'SHORT';
    const sideCol = pos.side === 'long' ? 'var(--up)' : 'var(--down)';
    title.innerHTML = `Fermer <span style="color:${sideCol};">${sideLabel}</span> ${pair} ?`;
  }
  if (body) {
    const pnlUsd = pos.pnlUsdt || 0;
    const pnlPct = pos.pnl || 0;
    const pnlCol = pnlUsd >= 0 ? 'var(--up)' : 'var(--down)';
    const sign = pnlUsd >= 0 ? '+' : '';
    body.innerHTML = `
      Mise: <strong style="color:var(--t1);">$${(pos.stakeUsdt || 0).toFixed(0)}</strong><br>
      P&L actuel: <strong style="color:${pnlCol};">${sign}$${pnlUsd.toFixed(2)} (${sign}${pnlPct.toFixed(2)}%)</strong><br>
      <span style="color:var(--t3);font-size:10px;">Action immédiate, non annulable.</span>
    `;
  }
  if (overlay) overlay.classList.add('open');
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(20); } catch(e) {}
  }
}
window._showForceCloseConfirm = _showForceCloseConfirm;
if(typeof _showForceCloseConfirm==='function') window._showForceCloseConfirm = _showForceCloseConfirm;

function _takeControl(pair) {
  if (!S._manualPairs) S._manualPairs = {};
  S._manualPairs[pair] = true;
  S.chainLog.push({ icon: '🎛️', desc: `Prise de contrôle manuel · ${pair} · bot désactivé sur cette paire`, hash: rndHash(), time: nowStr() });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  if (typeof showToast === 'function') { showToast('🎛️ Contrôle manuel · ' + pair, 2500); }
  if (_currentDetailPair === pair) { closePairDetail(); setTimeout(() => openPairDetail(pair), 100); }
}
window._takeControl = _takeControl;
if(typeof _takeControl==='function') window._takeControl = _takeControl;

function _updateBotPauseBadge(isOffline) {
  let badge = document.getElementById('botPauseBadge');
  if (!badge) {
    const portTotal = document.getElementById('qPortfolio') || document.querySelector('[id^="qPortfolio"]') || document.querySelector('.portfolio-total');
    if (portTotal) {
      const parent = portTotal.closest('.portfolio-card') || portTotal.parentElement;
      if (parent) {
        badge = document.createElement('div');
        badge.id = 'botPauseBadge';
        badge.style.cssText = 'display:none;background:rgba(255,61,107,.15);border:1px solid rgba(255,61,107,.5);border-radius:10px;padding:10px 14px;margin:10px 0;font-size:12px;font-weight:700;color:var(--down);text-align:center;letter-spacing:.05em;font-family:var(--font-mono);';
        badge.innerHTML = '⏸ BOT EN PAUSE · connexion instable';
        parent.insertBefore(badge, portTotal.nextSibling);
      }
    }
  }
  if (!badge) return;
  badge.style.display = isOffline ? 'block' : 'none';
}
if(typeof _updateBotPauseBadge==='function') window._updateBotPauseBadge = _updateBotPauseBadge;

function _updateNetIndicator() {
  const green  = document.getElementById('netDotGreen');
  const orange = document.getElementById('netDotOrange');
  const red    = document.getElementById('netDotRed');
  if (!green || !orange || !red) return;
  
  const elapsed = Date.now() - _lastRealPriceTs;
  let effectiveState = _netwatchState;
  if (_netwatchState === 'offline' && elapsed < _getNetwatchThreshold() * 2) {
    effectiveState = 'unstable';
  }
  
  const dimGreen  = 'rgba(0,232,122,.20)';
  const dimOrange = 'rgba(245,166,35,.18)';
  const dimRed    = 'rgba(255,61,107,.18)';
  
  if (effectiveState === 'online') {
    green.style.background  = 'var(--up)';
    green.style.boxShadow   = '0 0 6px rgba(0,232,122,.7)';
    orange.style.background = dimOrange;
    orange.style.boxShadow  = 'none';
    red.style.background    = dimRed;
    red.style.boxShadow     = 'none';
    document.getElementById('netDots').title = 'Connexion OK';
  } else if (effectiveState === 'unstable') {
    green.style.background  = dimGreen;
    green.style.boxShadow   = 'none';
    orange.style.background = '#f5a623';
    orange.style.boxShadow  = '0 0 6px rgba(245,166,35,.7)';
    red.style.background    = dimRed;
    red.style.boxShadow     = 'none';
    document.getElementById('netDots').title = 'Connexion instable';
  } else {
    green.style.background  = dimGreen;
    green.style.boxShadow   = 'none';
    orange.style.background = dimOrange;
    orange.style.boxShadow  = 'none';
    red.style.background    = 'var(--down)';
    red.style.boxShadow     = '0 0 8px rgba(255,61,107,.8)';
    document.getElementById('netDots').title = 'Connexion coupée · bot en pause';
  }
  
  _updateBotPauseBadge(effectiveState === 'offline');
}
if(typeof _updateNetIndicator==='function') window._updateNetIndicator = _updateNetIndicator;

// v123 · Répartition bénéfices déplacée dans le Portefeuille (boutons ± type levier)
function changeProfitSplit(delta) {
  const cur = (typeof S.profitSplitCaissePct === 'number' ? S.profitSplitCaissePct : 30);
  let n = cur + (delta || 0);
  if (n < 0) n = 0;
  if (n > 100) n = 100;
  S.profitSplitCaissePct = n;
  _syncSplitDisp();
  try { if (typeof saveState === 'function') saveState(true); } catch(e){}
}
function _syncSplitDisp() {
  const n = (typeof S.profitSplitCaissePct === 'number' ? S.profitSplitCaissePct : 30);
  const d = document.getElementById('splitDisp'); if (d) d.textContent = n + '%';
  const s = document.getElementById('splitSub');  if (s) s.textContent = 'Trading ' + (100 - n) + '%';
}
window.changeProfitSplit = changeProfitSplit;
window._syncSplitDisp = _syncSplitDisp;

function buildFeeLogCSV() {
  const log = S.fees.feeLog;
  if(!log.length) return 'Aucun frais enregistré';
  const h = ['Date','Paire','Notionnel $','Frais Exchange','Slippage','Total Frais','Provision Impôt','P&L Brut','P&L Net','Région'];
  const rows = log.map(e => [
    e.time, e.pair,
    parseFloat(e.notional||0).toFixed(2),
    parseFloat(e.tradingFee||0).toFixed(4),
    parseFloat(e.slipFee||0).toFixed(4),
    parseFloat(e.totalFee||0).toFixed(4),
    parseFloat(e.taxAmount||0).toFixed(4),
    parseFloat(e.pnlGross||0).toFixed(2),
    parseFloat(e.pnlNet||0).toFixed(2),
    e.region || S.taxConfig.region
  ]);
  return [h, ...rows].map(r => r.join(',')).join('\n');
}
if(typeof buildFeeLogCSV==='function') window.buildFeeLogCSV = buildFeeLogCSV;

function buildSummaryCSV() {
  const f   = S.fees;
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const tax = calcTaxProvision();
  const lines = [
    ['=== RÉSUMÉ FISCAL NEXUS ==='],
    ['Région', reg ? reg.label : S.taxConfig.region],
    ['Méthode', reg ? reg.method : ''],
    ['Taux effectif', reg ? (reg.rate*100*reg.inclusion).toFixed(1)+'%' : ''],
    [''],
    ['=== TOTAUX SESSION ==='],
    ['Trades total', f.tradeCount],
    ['P&L Brut total', f.totalPnlGross.toFixed(2)+'$'],
    ['Frais Exchange',  '-$'+f.totalTradingFees.toFixed(4)],
    ['Slippage total',  '-$'+f.totalSlippage.toFixed(4)],
    ['Funding total',   '-$'+f.totalFunding.toFixed(4)],
    ['Total Frais',     '-$'+f.totalGross.toFixed(4)],
    ['Provision Impôt', '-$'+tax.toFixed(4)],
    ['P&L Net',         f.totalPnlNet.toFixed(2)+'$'],
    ['Réserve Fiscale', '$'+(S.fiscalReserveAccount||0).toFixed(2)],
    [''],
    ['=== PAR PAIRE ==='],
    ['Paire','Trades','P&L Brut','Frais','Impôt','P&L Net'],
    ...Object.entries(f.byPair).map(([p,bp])=>[
      p, bp.trades,
      bp.pnlGross.toFixed(2)+'$',
      '-$'+bp.gross.toFixed(4),
      '-$'+bp.tax.toFixed(4),
      bp.pnlNet.toFixed(2)+'$'
    ])
  ];
  return lines.map(r => Array.isArray(r) ? r.join(',') : r).join('\n');
}
if(typeof buildSummaryCSV==='function') window.buildSummaryCSV = buildSummaryCSV;

function buildTradeCSV(trades) {
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const headers = [
    'Date','Paire','Côté','Mise USDT','Montant','Prix Entrée','Prix Sortie',
    'P&L Brut $','P&L Brut %','Frais Exchange $','Slippage $','Funding $',
    'Total Frais $','Base Imposable $','Provision Impôt $','P&L Net $',
    'Région','Méthode Fiscale','Cycle'
  ];
  const rows = trades.map(t => [
    t.time || '', t.pair || '', t.side || '',
    (t.stakeUsdt || 0).toFixed(2), (t.amount || 0),
    (t.entryPrice || t.price || 0).toFixed ? (t.entryPrice||t.price||0).toFixed(4) : '',
    (t.exitPrice || 0).toFixed ? (t.exitPrice||0).toFixed(4) : '',
    (t.pnlUsd || 0).toFixed(2), (t.pnl || 0).toFixed(3),
    (t.tradingFee || 0).toFixed(4), (t.slipFee || 0).toFixed(4), (t.fundingFee || 0).toFixed(4),
    (t.totalFee || 0).toFixed(4), (t.taxBase || 0).toFixed(4), (t.taxAmount || 0).toFixed(4),
    (t.pnlNet || 0).toFixed(2), t.region || S.taxConfig.region,
    reg ? reg.method : '', (t.cycle || S.cycle)
  ]);
  return [headers, ...rows].map(r => r.join(',')).join('\n');
}
if(typeof buildTradeCSV==='function') window.buildTradeCSV = buildTradeCSV;

function closeDiagnostic() {
  const overlay = document.getElementById('diagOverlay');
  if (overlay) overlay.classList.remove('open');
}
window.closeDiagnostic = closeDiagnostic;
if(typeof closeDiagnostic==='function') window.closeDiagnostic = closeDiagnostic;

function closeWhyModal() {
  const overlay = document.getElementById('whyOverlay');
  if(overlay) overlay.classList.remove('open');
}
window.closeWhyModal = closeWhyModal;
if(typeof closeWhyModal==='function') window.closeWhyModal = closeWhyModal;

function disableFullPowerMode() {
  if (!S) return;
  S.fullPowerMode = false;
  S.fullPowerSince = 0;
  if (typeof showToast === 'function') showToast('Régime standard restauré', 'ice');
}
window.disableFullPowerMode = disableFullPowerMode;
if(typeof disableFullPowerMode==='function') window.disableFullPowerMode = disableFullPowerMode;

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
if(typeof downloadFile==='function') window.downloadFile = downloadFile;

function enableFullPowerMode() {
  if (!S || !S.agents) return;
  
  const initCap = (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.fiscalReserveAccount || 0);
  S._fpInitialCapital = initCap;
  S._fpStopTriggered = false;
  
  let count = 0;
  S.agents.forEach(a => {
    a.conf = 0.99;
    a.fitness = 2000;
    a.streak = Math.max(a.streak || 0, 3);
    a.errors = 0;
    a.corrections = Math.max(a.corrections || 0, 5);
    count++;
  });
  S.botAutoMode = true;
  S.fullPowerMode = true;
  S.fullPowerSince = Date.now();
  
  try {
    if (typeof renderHome === 'function') renderHome();
    if (typeof updateStreakBadge === 'function') updateStreakBadge();
    if (typeof renderAgentsSection === 'function') renderAgentsSection();
  } catch(e) {}
  
  if (typeof showToast === 'function') {
    showToast('⚡ PLEIN RÉGIME · ' + count + ' agents/bots @ 100%', 'up');
  }
  return count;
}
window.enableFullPowerMode = enableFullPowerMode;
if(typeof enableFullPowerMode==='function') window.enableFullPowerMode = enableFullPowerMode;

async function loadAllTrades() {
  try {
    const db = await openDB();
    return new Promise((res) => {
      const req = db.transaction(RT.STORE_TRADES, 'readonly').objectStore(RT.STORE_TRADES).getAll();
      req.onsuccess = e => res(e.target.result || []);
      req.onerror   = () => res([]);
    });
  } catch(e) { return []; }
}
if(typeof loadAllTrades==='function') window.loadAllTrades = loadAllTrades;

function openManDetail(pair) {
  const overlay = document.getElementById('pairDetailOverlay');
  const title = document.getElementById('pairDetailTitle');
  const body = document.getElementById('pairDetailBody');
  if (!overlay || !title || !body) return;
  
  _currentDetailPair = pair;
  const cfg = PAIRS[pair];
  const ps = S.pairStates[pair];
  if (!cfg || !ps) return;
  
  const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
  const pct = prob * 100;
  const conviction = Math.abs(prob - 0.5) * 2;
  let suggSide = prob >= 0.5 ? 'long' : 'short';
  const atr = ps.atr || 0.01;
  const atrRel = atr > 0 ? (atr / ps.price) : 0.015;
  
  const suggStake = Math.max(10, Math.round((S.tradingAccount || 100) * (0.05 + conviction * 0.05)));
  const suggLev = conviction > 0.5 ? Math.min(3, Math.max(1, Math.round(conviction * 3))) : 1;
  const tpDist = Math.max(0.8, atrRel * 100 * 2);
  const slDist = Math.max(0.5, atrRel * 100 * 1.5);
  const tpPrice = suggSide === 'long' ? ps.price * (1 + tpDist/100) : ps.price * (1 - tpDist/100);
  const slPrice = suggSide === 'long' ? ps.price * (1 - slDist/100) : ps.price * (1 + slDist/100);
  const suggMaxLoss = 2.0;
  const suggTimeout = 60;
  
  if (!S._manConsignes) S._manConsignes = {};
  if (!S._manConsignes[pair]) { S._manConsignes[pair] = { maxLossPct: suggMaxLoss, timeoutMin: suggTimeout }; }
  const cons = S._manConsignes[pair];
  
  const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
  
  const pnl24 = ps.pnl24h || 0;
  const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
  title.innerHTML = `
    <span style="color:${cfg.color};font-size:15px;">${pair}</span>
    <span style="font-family:var(--font-mono);font-size:10px;color:var(--ice);background:rgba(56,212,245,0.1);padding:2px 6px;border-radius:4px;margin-left:6px;">MAN</span>
    <span style="font-family:var(--font-mono);font-size:11px;color:var(--t2);margin-left:6px;">${cfg.dec >= 4 ? ps.price.toFixed(cfg.dec) : '$' + Math.floor(ps.price).toLocaleString()}</span>
    <span style="font-family:var(--font-mono);font-size:10px;color:${pnl24Col};margin-left:6px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>
  `;
  
  body.innerHTML = '';
  
  const headSection = document.createElement('div');
  headSection.className = 'detail-section';
  
  if (manualPos) {
    const pnlUsd = manualPos.pnlUsdt || 0;
    const pnlPct = manualPos.pnl || 0;
    const isWin = pnlUsd >= 0;
    const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
    const sign = pnlUsd >= 0 ? '+' : '';
    const sideLabel = manualPos.side === 'long' ? '↑ LONG' : '↓ SHORT';
    const sideCol = manualPos.side === 'long' ? 'var(--up)' : 'var(--down)';
    headSection.innerHTML = `
      <div class="detail-section-title">🎛️ Position active</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:11px;">
        <div><span style="color:var(--t3);">Side</span><br><span style="color:${sideCol};font-weight:800;font-size:13px;">${sideLabel}</span></div>
        <div><span style="color:var(--t3);">Mise</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">$${(manualPos.stakeUsdt || 0).toFixed(0)}</span></div>
        <div><span style="color:var(--t3);">Entrée</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);font-size:10px;">${cfg.dec >= 4 ? manualPos.entryPrice.toFixed(cfg.dec) : '$' + Math.floor(manualPos.entryPrice)}</span></div>
        <div><span style="color:var(--t3);">P&L</span><br><span style="color:${pnlCol};font-weight:800;font-family:var(--font-mono);">${sign}$${pnlUsd.toFixed(2)} <span style="font-size:9px;color:var(--t3);">(${sign}${pnlPct.toFixed(2)}%)</span></span></div>
      </div>`;
  } else {
    const sideLabel = suggSide === 'long' ? '↑ LONG' : '↓ SHORT';
    const sideCol = suggSide === 'long' ? 'var(--up)' : 'var(--down)';
    headSection.innerHTML = `
      <div class="detail-section-title">🤖 Suggestion bot en temps réel</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:11px;">
        <div><span style="color:var(--t3);">Direction</span><br><span style="color:${sideCol};font-weight:800;font-size:13px;">${sideLabel}</span></div>
        <div><span style="color:var(--t3);">Conviction LMSR</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${pct.toFixed(0)}%</span></div>
        <div><span style="color:var(--t3);">ATR (volatilité)</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${(atrRel*100).toFixed(2)}%</span></div>
        <div><span style="color:var(--t3);">Force signal</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${(conviction*100).toFixed(0)}%</span></div>
      </div>`;
  }
  body.appendChild(headSection);
  
  if (!manualPos) {
    const paramsSection = document.createElement('div');
    paramsSection.className = 'detail-section';
    paramsSection.innerHTML = `
      <div class="detail-section-title">⚙️ Paramètres (pré-remplis · éditables)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;">
        <div>
          <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">Mise ($)</label>
          <input type="number" id="manIn_stake_${pair.replace('/','_')}" value="${suggStake}" min="10" step="5" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--t1);font-family:var(--font-mono);font-weight:700;font-size:12px;">
        </div>
        <div>
          <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">Levier ×</label>
          <input type="number" id="manIn_lev_${pair.replace('/','_')}" value="${suggLev}" min="1" max="10" step="1" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--t1);font-family:var(--font-mono);font-weight:700;font-size:12px;">
        </div>
        <div>
          <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">TP ${cfg.dec >= 4 ? '(prix)' : '($)'}</label>
          <input type="number" id="manIn_tp_${pair.replace('/','_')}" value="${cfg.dec >= 4 ? tpPrice.toFixed(cfg.dec) : Math.round(tpPrice)}" step="${cfg.dec >= 4 ? '0.0001' : '1'}" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--up);font-family:var(--font-mono);font-weight:700;font-size:12px;">
        </div>
        <div>
          <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">SL ${cfg.dec >= 4 ? '(prix)' : '($)'}</label>
          <input type="number" id="manIn_sl_${pair.replace('/','_')}" value="${cfg.dec >= 4 ? slPrice.toFixed(cfg.dec) : Math.round(slPrice)}" step="${cfg.dec >= 4 ? '0.0001' : '1'}" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--down);font-family:var(--font-mono);font-weight:700;font-size:12px;">
        </div>
      </div>`;
    body.appendChild(paramsSection);
  }
  
  const consignesSection = document.createElement('div');
  consignesSection.className = 'detail-section';
  consignesSection.innerHTML = `
    <div class="detail-section-title">🛡️ Consignes garde-fou (bot ferme si dépassé)</div>
    <div style="font-size:10px;color:var(--t3);margin-bottom:8px;line-height:1.4;">Le bot respecte ton ouverture mais ferme automatiquement si ces seuils sont franchis.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;">
      <div>
        <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">Perte max (% du capital)</label>
        <input type="number" id="manCon_loss_${pair.replace('/','_')}" value="${cons.maxLossPct}" min="0.5" max="10" step="0.5" onchange="_saveManConsigne('${pair}','maxLossPct',this.value)" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--gold);font-family:var(--font-mono);font-weight:700;font-size:12px;">
      </div>
      <div>
        <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">Timeout (min)</label>
        <input type="number" id="manCon_tout_${pair.replace('/','_')}" value="${cons.timeoutMin}" min="5" max="1440" step="5" onchange="_saveManConsigne('${pair}','timeoutMin',this.value)" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--gold);font-family:var(--font-mono);font-weight:700;font-size:12px;">
      </div>
    </div>
    <div style="margin-top:6px;font-size:9px;color:var(--t3);">ℹ️ Le bot fermera aussi si TP ou SL sont atteints.</div>`;
  body.appendChild(consignesSection);
  
  const actionsSection = document.createElement('div');
  actionsSection.style.cssText = 'margin:12px 0;display:flex;gap:8px;';
  if (manualPos) {
    actionsSection.innerHTML = `<button class="force-close-btn" style="flex:1;" onclick="_showForceCloseConfirm('${pair}')">✕ Fermer ${manualPos.side === 'long' ? 'LONG' : 'SHORT'} ${pair}</button>`;
  } else {
    actionsSection.innerHTML = `
      <button style="flex:1;background:rgba(0,232,122,0.12);color:var(--up);border:1px solid rgba(0,232,122,0.4);padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;" onclick="_openManTrade('${pair}','long')">↑ LONG</button>
      <button style="flex:1;background:rgba(255,61,107,0.12);color:var(--down);border:1px solid rgba(255,61,107,0.4);padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;" onclick="_openManTrade('${pair}','short')">↓ SHORT</button>`;
  }
  body.appendChild(actionsSection);
  
  const pairTrades = (ps.trades || []).filter(t => t.type === 'position' && typeof t.pnlUsdt === 'number');
  const wins = pairTrades.filter(t => t.pnlUsdt > 0).length;
  const totalTrades = pairTrades.length;
  const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : '—';
  const totalPnl = pairTrades.reduce((s, t) => s + (t.pnlUsdt || 0), 0);
  
  const statsSection = document.createElement('div');
  statsSection.className = 'detail-section';
  statsSection.innerHTML = `
    <div class="detail-section-title">📊 Statistiques · ${pair}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:11px;">
      <div><span style="color:var(--t3);font-size:9px;">Trades</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${totalTrades}</span></div>
      <div><span style="color:var(--t3);font-size:9px;">Win rate</span><br><span style="color:${parseFloat(winRate) >= 50 ? 'var(--up)' : parseFloat(winRate) >= 40 ? 'var(--gold)' : 'var(--down)'};font-weight:700;font-family:var(--font-mono);">${winRate}%</span></div>
      <div><span style="color:var(--t3);font-size:9px;">P&L cumul</span><br><span style="color:${totalPnl >= 0 ? 'var(--up)' : 'var(--down)'};font-weight:700;font-family:var(--font-mono);">${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}</span></div>
    </div>`;
  body.appendChild(statsSection);
  
  overlay.classList.add('open');
}
window.openManDetail = openManDetail;
if(typeof openManDetail==='function') window.openManDetail = openManDetail;

function openPairDetail(pair) {
  if (typeof showPairDetail === 'function') { return showPairDetail(pair); }
}
window.openPairDetail = openPairDetail;
if(typeof openPairDetail==='function') window.openPairDetail = openPairDetail;

function renderActionBricks() {
  const grid = document.getElementById('actionsGrid');
  if (!grid) return;
  grid.classList.add('as-bricks');
  
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const ps = S.pairStates[pair];
    if (!ps) return;
    
    const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    const pct = prob * 100;
    let signal = 'hold', label = 'HOLD';
    if (prob > 0.60) { signal = 'buy';  label = 'BUY'; }
    else if (prob < 0.40) { signal = 'sell'; label = 'SELL'; }
    
    const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
    const botPos    = (S.openPositions || []).find(p => p.pair === pair && p.auto === true);
    const activePos = manualPos || botPos;
    if (activePos) {
      signal = activePos.side === 'long' ? 'buy' : 'sell';
      label  = activePos.side === 'long' ? 'LONG' : 'SHORT';
    }
    
    let brick = document.getElementById('actbrick_' + pairKey);
    if (!brick) {
      brick = document.createElement('div');
      brick.id = 'actbrick_' + pairKey;
      brick.className = 'action-brick';
      brick.style.setProperty('--accent', cfg.color);
      brick.onclick = () => openPairDetail(pair);
      brick.innerHTML = `
        <div>
          <div class="ab-head"><span class="ab-sym">${cfg.sym}</span><span class="ab-dot"></span></div>
          <div class="ab-price" id="ab_px_${pairKey}">—</div>
        </div>
        <div>
          <div class="ab-signal" id="ab_sig_${pairKey}">—</div>
          <div class="ab-sub" id="ab_sub_${pairKey}">—</div>
        </div>`;
      grid.appendChild(brick);
    }
    
    brick.className = 'action-brick sig-' + signal;
    
    const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : ('$' + Math.floor(ps.price).toLocaleString());
    const p24 = ps.pnl24h || 0;
    const p24Col = p24 >= 0 ? 'var(--up)' : 'var(--down)';
    const pxEl = document.getElementById('ab_px_' + pairKey);
    if (pxEl) pxEl.innerHTML = `${priceStr} <span style="color:${p24Col};margin-left:3px;">${p24 >= 0 ? '+' : ''}${p24.toFixed(2)}%</span>`;
    
    const sigEl = document.getElementById('ab_sig_' + pairKey);
    if (sigEl) { const prefix = activePos ? (manualPos ? '🔒 ' : '') : '🤖 '; sigEl.textContent = prefix + label; }
    
    const subEl = document.getElementById('ab_sub_' + pairKey);
    if (subEl) {
      if (activePos) subEl.textContent = '$' + (activePos.stakeUsdt || 0).toFixed(0);
      else subEl.textContent = pct.toFixed(0) + '% LMSR';
    }
  });
}
window.renderActionBricks = renderActionBricks;
if(typeof renderActionBricks==='function') window.renderActionBricks = renderActionBricks;
