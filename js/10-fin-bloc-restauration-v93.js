// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 10/10
// Contient : fin-bloc-restauration-v93, bloc-restauration-v94, fin-bloc-restauration-v94
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
const DB_VERSION   = 3;
const STORE_TRADES = 'trades';
const _AUTO_SNAP_INTERVAL = 30 * 60 * 1000;
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
const _SNAP_INTERNAL_KEYS = ['nexusInternal_1', 'nexusInternal_2', 'nexusInternal_3', 'nexusInternal_4', 'nexusInternal_5'];
const _SNAP_KEYS = ['nexusSnap_A', 'nexusSnap_B', 'nexusSnap_C'];
let _autoSaveInterval = null;
let _currentDetailPair = null;
let   _db = null;
let _lastAutoSnapTs = 0;
let _p5LastAdaptiveSave = 0;
let _packContinuiteInstalled = false;
let _pendingClosePair = null;
let _settingsPulseTimer = null;
let _snapRotationIdx = 0;

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
  // On stocke aussi l'ATR absolu pour le stop-loss (pas en %)
  return { score: score, atrAbs: atrAbs };
}
window._computeVolatilityScore = _computeVolatilityScore;
if(typeof _computeVolatilityScore==='function') window._computeVolatilityScore = _computeVolatilityScore;

function _getMarketVolatilityMedian() {
  const activePairs = (typeof _getActiveRealPairs === 'function') ? _getActiveRealPairs() : [];
  if (activePairs.length === 0) return 2.0;  // fallback raisonnable
  const scores = activePairs
    .map(p => _computeVolatilityScore(p))
    .filter(r => r !== null && isFinite(r.score) && r.score > 0)
    .map(r => r.score);
  if (scores.length === 0) return 2.0;
  // Médiane
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
  // Bonus seulement si WR > 60% ET P&L positif
  if (wr <= 0.60 || pnl <= 0) return 1.0;
  // Formule progressive : plus la paire excelle, plus le bonus
  // wr=0.65, pnl=$10 → 1.1×
  // wr=0.75, pnl=$50 → 1.4×
  // wr=0.80, pnl=$100+ → 1.5× (cappé)
  let bonus = 1.0;
  bonus += Math.min(0.3, (wr - 0.60) * 1.5);  // jusqu'à +0.3 sur WR
  bonus += Math.min(0.2, pnl / 200);            // jusqu'à +0.2 sur P&L
  bonus = Math.min(maxBonus, bonus);
  // Mémoriser
  if (!S.adaptiveState) S.adaptiveState = {};
  if (!S.adaptiveState.lastBonusMultipliers) S.adaptiveState.lastBonusMultipliers = {};
  S.adaptiveState.lastBonusMultipliers[pair] = bonus;
  return bonus;
}
window._getPairBonusMultiplier = _getPairBonusMultiplier;
if(typeof _getPairBonusMultiplier==='function') window._getPairBonusMultiplier = _getPairBonusMultiplier;

function _getPairPerformanceMultiplier(pair) {
  const stats = (S.paperRealStats || {})[pair];
  if (!stats || stats.trades < 10) return 1.0;  // pas assez de données → neutre
  const wr = stats.trades > 0 ? stats.wins / stats.trades : 0.5;
  const pnl = stats.pnlNet || 0;
  // Mauvaise performance : WR < 40% ET P&L négatif → pénalité progressive
  if (wr < 0.40 && pnl < 0) {
    // Plus la paire perd, plus on réduit. Floor à 0.5×.
    // -$10 → 0.85×, -$50 → 0.6×, -$100+ → 0.5×
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

  // Date de la lettre
  const now  = new Date();
  const month= now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

  // Corps de la lettre selon les performances
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

  // Voix secondaires (3 agents différents du top)
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
/* ═══ v16 · #25 MODAL POURQUOI ═══ */
.why-overlay { position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.75);
  display: none; align-items: center; justify-content: center;
  padding: 20px 14px;
  backdrop-filter: blur(4px); }
.why-overlay.open { display: flex; }
.why-panel { width: 100%; max-width: 400px;
  background: var(--s1);
  border: 1px solid rgba(167,139,250,.35);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 0 40px rgba(167,139,250,.15);
  max-height: 85vh;
  overflow-y: auto; }
.why-header { display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px; }
.why-title { font-size: 14px; font-weight: 800; color: var(--pur);
  display: flex; align-items: center; gap: 6px; }
.why-close { font-size: 18px; color: var(--t3); cursor: pointer;
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%; transition: background .15s; }
.why-close:hover { background: rgba(255,255,255,.06); }
.diag-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);
  display:none;align-items:flex-start;justify-content:center;padding:40px 12px;
  overflow-y:auto;backdrop-filter:blur(3px);
  /* v15 FIX : forcer par-dessus tout y compris le panneau réglages */
  transform:translateZ(0);
  -webkit-transform:translateZ(0); }
.diag-overlay.open { display:flex; }
.diag-panel { width:100%;max-width:420px;background:var(--s1);border:1px solid var(--border);
  border-radius:14px;padding:14px 14px 12px; }
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
/* ═══ VOLET DÉTAILLÉ (inchangé, déjà OK) ═══ */
.pair-detail-overlay { position: fixed; inset: 0; z-index: 2050;
  background: rgba(6,8,12,0.7);
  backdrop-filter: blur(4px);
  display: none;
  justify-content: center;
  align-items: flex-start;
  padding: 16px 10px;
  overflow-y: auto;
  animation: fadeInOverlay .18s ease; }
.pair-detail-overlay.open { display: flex; }
.pair-detail-head { display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border); }
.pair-detail-close { font-size: 18px;
  color: var(--t3);
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  transition: background .15s, color .15s; }
.pair-detail-close:active { background: var(--s2); color: var(--t1); }
/* Confirmation dialog pour long-press fermeture */
.close-confirm-overlay { position: fixed; inset: 0; z-index: 2200;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(3px);
  display: none;
  justify-content: center;
  align-items: center;
  padding: 20px; }
.close-confirm-overlay.open { display: flex; }
.close-confirm-card { background: var(--s1);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  max-width: 320px;
  width: 100%;
  animation: slideUpPanel .22s ease; }
.close-confirm-title { font-size: 13px;
  font-weight: 800;
  color: var(--t1);
  margin-bottom: 6px; }
.close-confirm-body { font-size: 11px;
  color: var(--t2);
  margin-bottom: 12px;
  line-height: 1.4; }
.close-confirm-actions { display: flex;
  gap: 8px; }
.close-confirm-btn { flex: 1;
  padding: 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: background .15s; }
.close-confirm-btn.cancel { background: var(--s2);
  color: var(--t2); }
.close-confirm-btn.cancel:active { background: var(--s3); }
.close-confirm-btn.confirm { background: var(--down);
  color: white; }
.close-confirm-btn.confirm:active { background: #e02c58; }

/* AURA8 v95 · CSS minimal pour IDs orphelins restaurés */
#agentLetterSection { padding: 12px 0; }
#liveLabel { font-size: 9px; font-weight: 700; letter-spacing: .15em; color: var(--up); margin-left: 4px; vertical-align: middle; }
#pairDetailOverlay {
  display: none; position: fixed; inset: 0; z-index: 9998;
  background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
  align-items: center; justify-content: center; padding: 20px;
}
#pairDetailOverlay.open { display: flex; }
#pairDetailOverlay .pair-detail-card {
  background: var(--s2); border: 1px solid rgba(255,255,255,.06); border-radius: 14px;
  width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; padding: 16px;
}
#pairDetailOverlay .pair-detail-head {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
}
#pairDetailOverlay .pair-detail-close {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: var(--s3); border-radius: 50%; cursor: pointer; color: var(--t2); font-size: 14px;
}
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
  const baseStakePct = cfg.maxStakePct || 5.0;      // 5% de référence
  const slAtrMult = cfg.slAtrMultiplier || 2.0;     // standard pro : SL = 2 × ATR
  
  const volResult = _computeVolatilityScore(pair);
  if (!volResult || volResult.score === null) {
    // Fallback : pas assez de données → mise neutre, SL conservateur
    return {
      stakePct: baseStakePct * 0.6,   // 3% par défaut
      slAtrMultiplier: slAtrMult,
      slAbsoluteAtr: null,
      score: null,
      relRatio: null,
      perfMult: 1.0
    };
  }
  
  const median = _getMarketVolatilityMedian();
  // Ratio de volatilité : 1.0 = aussi volatile que la médiane du marché
  // > 1.0 = plus volatile, < 1.0 = plus calme
  const ratio = volResult.score / median;
  
  // Sizing CONTINU : mise inversement proportionnelle au ratio
  // ratio = 0.7 → mise 7.1% (mais cappé à baseStakePct = 5%)
  // ratio = 1.0 → mise 5%
  // ratio = 2.0 → mise 2.5%
  // ratio = 4.0 → mise 1.25%
  let adaptedStakePct = baseStakePct / Math.max(0.5, ratio);
  // Cap supérieur (ne jamais dépasser la mise de base)
  adaptedStakePct = Math.min(baseStakePct, adaptedStakePct);
  // Floor inférieur (ne jamais descendre sous 0.5%)
  adaptedStakePct = Math.max(0.5, adaptedStakePct);
  
  // Multiplicateur d'apprentissage par paire (pénalité paires perdantes)
  const perfMult = _getPairPerformanceMultiplier(pair);
  adaptedStakePct *= perfMult;
  
  // v7.12 LIVRAISON 17 · BONUS paires GAGNANTES (Phase 1.4)
  let bonusMult = 1.0;
  if (typeof _getPairBonusMultiplier === 'function') {
    bonusMult = _getPairBonusMultiplier(pair);
    adaptedStakePct *= bonusMult;
  }
  
  return {
    stakePct: adaptedStakePct,
    slAtrMultiplier: slAtrMult,
    slAbsoluteAtr: volResult.atrAbs,  // pour calcul du SL en multiple d'ATR
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
  
  // Score combiné : 60% WR + 40% P&L (normalisé)
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
  const loserArm = aWins ? B : A;
  
  // Le gagnant devient la nouvelle référence (params copiés dans armA)
  const newRefParams = JSON.parse(JSON.stringify(winnerArm.params));
  
  // Mutation : le perdant est remplacé par une variante mutée du gagnant
  const cfg = S.paperRealConfig || {};
  const strength = cfg.abTestingMutationStrength || 0.3;
  const newChallengerParams = {
    slAtrMult: _mutateValue(newRefParams.slAtrMult, strength, 1.0, 4.0),
    tpAtrMult: _mutateValue(newRefParams.tpAtrMult, strength, 0.8, 3.0),
    stakeFactor: _mutateValue(newRefParams.stakeFactor, strength * 0.5, 0.6, 1.4)
  };
  
  // Logger le verdict
  const verdict = {
    ts: Date.now(),
    generation: (S.abTesting.generation || 0) + 1,
    winner: winner,
    winnerScore: +scoreA.toFixed(3),
    winnerWR: +(wrA * 100).toFixed(1),
    winnerPnl: +A.pnl.toFixed(2),
    loserScore: +scoreB.toFixed(3),
    loserWR: +(wrB * 100).toFixed(1),
    loserPnl: +B.pnl.toFixed(2),
    newParams: JSON.parse(JSON.stringify(newRefParams)),
    newChallenger: JSON.parse(JSON.stringify(newChallengerParams))
  };
  if (aWins) {
    // Inverser : ce qui était logué pour B doit être pour A
    verdict.winnerScore = +scoreA.toFixed(3);
    verdict.winnerWR = +(wrA * 100).toFixed(1);
    verdict.winnerPnl = +A.pnl.toFixed(2);
    verdict.loserScore = +scoreB.toFixed(3);
    verdict.loserWR = +(wrB * 100).toFixed(1);
    verdict.loserPnl = +B.pnl.toFixed(2);
  } else {
    verdict.winnerScore = +scoreB.toFixed(3);
    verdict.winnerWR = +(wrB * 100).toFixed(1);
    verdict.winnerPnl = +B.pnl.toFixed(2);
    verdict.loserScore = +scoreA.toFixed(3);
    verdict.loserWR = +(wrA * 100).toFixed(1);
    verdict.loserPnl = +A.pnl.toFixed(2);
  }
  
  // Reset des stats, nouvelle génération
  S.abTesting.armA = { params: newRefParams, trades: 0, wins: 0, losses: 0, pnl: 0, label: 'A (référence)' };
  S.abTesting.armB = { params: newChallengerParams, trades: 0, wins: 0, losses: 0, pnl: 0, label: 'B (challenger)' };
  S.abTesting.generation = (S.abTesting.generation || 0) + 1;
  S.abTesting.lastVerdict = verdict;
  if (!S.abTesting.history) S.abTesting.history = [];
  S.abTesting.history.push(verdict);
  if (S.abTesting.history.length > 20) S.abTesting.history.shift();
  
  // Logger dans la blockchain
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
  
  // Toast
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
  // Default = A
  return (S.abTesting.armA && S.abTesting.armA.params) ? S.abTesting.armA.params : null;
}
window._abGetParams = _abGetParams;
if(typeof _abGetParams==='function') window._abGetParams = _abGetParams;

function _addTradeContextToMemory(ctx) {
  if (!ctx) return;
  if (!S.tradeContextMemory) S.tradeContextMemory = [];
  S.tradeContextMemory.push(ctx);
  if (S.tradeContextMemory.length > 500) {
    S.tradeContextMemory.shift();  // FIFO
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
    // Métadonnées
    contextId: 'ctx_' + now + '_' + Math.random().toString(36).slice(2, 8),
    pair: pair,
    side: side,
    stakeUsdt: stakeUsdt,
    openedAt: now,
    closedAt: null,        // sera rempli à la fermeture
    pnlPct: null,           // sera rempli à la fermeture
    pnlUsd: null,           // sera rempli à la fermeture
    holdMinutes: null,      // sera rempli à la fermeture
    won: null,              // true/false sera rempli à la fermeture
    
    // Contexte temporel
    hour: date.getHours(),               // 0-23
    dayOfWeek: date.getDay(),            // 0=dim, 6=sam
    
    // Contexte de marché
    regime: (typeof detectMarketRegime === 'function') ? detectMarketRegime() : null,
    marketVolatilityMedian: (typeof _getMarketVolatilityMedian === 'function') ? _getMarketVolatilityMedian() : null,
    
    // Profil de la paire
    pairVolatility: null,
    pairRelRatio: null,
    pairPerfMult: 1.0,
    pairBonusMult: 1.0,
    
    // Indicateurs techniques de la paire
    indicators: _computeIndicatorsForContext(pair),
    
    // Agents votants (top 5)
    topAgents: []
  };
  
  // Profil paire (volatilité + multiplicateurs)
  if (typeof _getPairAdaptiveProfile === 'function') {
    const profile = _getPairAdaptiveProfile(pair);
    if (profile) {
      ctx.pairVolatility = profile.score;
      ctx.pairRelRatio = profile.relRatio;
      ctx.pairPerfMult = profile.perfMult || 1.0;
      ctx.pairBonusMult = profile.bonusMult || 1.0;
    }
  }
  
  // Top agents votants (apprenants uniquement)
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
  
  // ── Rotation journalière ──
  if (S.pnlPeriod.todayDate !== todayKey) {
    // Si on avait un suivi journalier en cours → archive
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
      // Garde 90 jours d'historique max
      if (S.pnlPeriod.history.length > 90) {
        S.pnlPeriod.history = S.pnlPeriod.history.slice(-90);
      }
    }
    // Nouveau jour
    S.pnlPeriod.todayDate = todayKey;
    S.pnlPeriod.todayStartPortfolio = currentPortfolio;
  }
  
  // ── Rotation hebdomadaire ──
  if (S.pnlPeriod.weekStart !== weekKey) {
    S.pnlPeriod.weekStart = weekKey;
    S.pnlPeriod.weekStartPortfolio = currentPortfolio;
  }
  
  // ── Rotation mensuelle ──
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
  
  // Si hedge déjà ouvert → ne rien faire
  if (S.adaptiveState && S.adaptiveState.hedgeActive) {
    // Vérifier si le hedge existe toujours dans openPositions
    const hedgeId = S.adaptiveState.hedgePositionId;
    const exists = (S.openPositions || []).some(p => p.id === hedgeId);
    if (!exists) {
      // Hedge fermé entre temps → reset
      S.adaptiveState.hedgeActive = false;
      S.adaptiveState.hedgePositionId = null;
    }
    return;
  }
  
  // Détecter stress
  const stress = _detectSystemicBearStress();
  const triggerStreak = cfg.hedgingTriggerBearStreak || 3;
  
  if (stress.streak >= triggerStreak) {
    // Trouver une paire candidate
    const candidate = _findMostVolatilePair();
    if (!candidate) return;
    
    // Calculer la mise (petite, défensive : 2% max du capital)
    const totalCapital = S.b || 0;
    const hedgeStake = Math.max(10, totalCapital * (cfg.hedgingMaxAllocPct || 2.0) / 100);
    
    // Logger l'intention (l'ouverture réelle nécessiterait de réutiliser le moteur d'ouverture
    // qui a beaucoup de garde-fous → ici on enregistre l'action et on laisse le bot ouvrir)
    if (!S.adaptiveState) S.adaptiveState = {};
    S.adaptiveState.lastHedgeAction = {
      ts: Date.now(),
      action: 'trigger',
      candidate: candidate,
      stake: +hedgeStake.toFixed(2),
      reason: 'BEAR streak ' + stress.streak,
      regime: stress.regime
    };
    
    // Logger dans la blockchain
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
    
    // Toast
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
    // Calcul du PnL latent en %
    const ps = S.pairStates ? S.pairStates[pos.pair] : null;
    if (!ps || !isFinite(ps.price)) return;
    const isLong = pos.side === 'long';
    const pnlPct = isLong 
      ? ((ps.price - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - ps.price) / pos.entryPrice) * 100;
    // Ne fermer préventivement QUE si on est en profit (sinon laisser le SL gérer)
    if (pnlPct < minProfit) return;
    // Détecter retournement
    const reversal = _detectReversal(pos.pair, pos.side);
    if (!reversal || !reversal.reversalDetected) return;
    // Ne fermer que si confiance élevée OU profit significatif (>1%)
    if (reversal.confidence !== 'high' && pnlPct < 1.0) return;
    // FERMETURE PRÉVENTIVE
    try {
      // Mémoriser pour le panneau
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
      // Logger Chain
      if (!S.chainLog) S.chainLog = [];
      S.chainLog.push({
        icon: '🔮',
        desc: 'Retournement détecté · ' + pos.pair + ' · fermeture préventive (+' + pnlPct.toFixed(2) + '%)',
        hash: typeof rndHash==='function' ? rndHash() : '',
        time: typeof nowStr==='function' ? nowStr() : ''
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      // Toast
      if (typeof showToast === 'function') {
        showToast('🔮 ' + pos.pair + ' fermé · retournement détecté (+' + pnlPct.toFixed(2) + '%)', 4000, 'win');
      }
      // Fermeture
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
  // Tenter ATR
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
  // Fallback : TP en %
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
  
  // Récupérer les bougies (priorité Binance WS si dispo)
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
  
  // RSI(14)
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
  
  // MACD simplifié : EMA(12) - EMA(26)
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
  
  // Mouvement récent (sur 3 dernières bougies, en %)
  if (closes.length >= 4) {
    const recentMove = ((closes[closes.length - 1] - closes[closes.length - 4]) / closes[closes.length - 4]) * 100;
    result.recentMove3 = +recentMove.toFixed(2);
  }
  
  // Position dans la fourchette des 20 dernières bougies (0 = bas, 1 = haut)
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
  // On utilise tradeContextMemory (Phase 2) pour avoir les rendements réels
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
  
  // Si pas assez de données → tous à 1.0
  const validSharpes = Object.values(sharpeByPair);
  if (validSharpes.length < 2) {
    if (!S.adaptiveState) S.adaptiveState = {};
    S.adaptiveState.sharpeByPair = sharpeByPair;
    S.adaptiveState.sharpeAllocations = {};
    S.adaptiveState.sharpeAllocTs = now;
    return {};
  }
  
  // Normalisation : ramener au range [minReduce, maxBoost]
  const minS = Math.min(...validSharpes);
  const maxS = Math.max(...validSharpes);
  const allocations = {};
  Object.keys(sharpeByPair).forEach(p => {
    const s = sharpeByPair[p];
    if (maxS === minS) {
      allocations[p] = 1.0;
    } else {
      const normalized = (s - minS) / (maxS - minS); // 0..1
      // Mappe 0..1 vers [minReduce, maxBoost]
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
      closePosition(pos.id, false);  // user-forced close
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
  
  // Calcul RSI sur les 7 premières et 7 dernières bougies
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
  
  // Pour détecter divergence : on compare le RSI maintenant vs il y a 7 bougies
  // Si on est LONG : prix monte mais RSI baisse = essoufflement bearish
  // Si on est SHORT : prix baisse mais RSI monte = essoufflement bullish
  const rsiNow = rsi14(closes);
  const rsiBefore = rsi14(closes.slice(0, -7));
  if (rsiNow === null || rsiBefore === null) return null;
  
  const priceNow = closes[closes.length - 1];
  const priceBefore = closes[closes.length - 8] || closes[closes.length - 1];
  if (!isFinite(priceNow) || !isFinite(priceBefore)) return null;
  
  const cfg = S.paperRealConfig || {};
  const divThresh = cfg.reversalRsiDivergenceThreshold || 8;
  
  // Divergence bearish : prix monte mais RSI baisse significativement
  if (side === 'long' && priceNow > priceBefore && rsiBefore - rsiNow > divThresh) {
    // Confirmation par chute de volume
    let volConfirm = false;
    if (volumes.length >= 14) {
      const vNow = volumes.slice(-3).reduce((a,b)=>a+b,0) / 3;
      const vBefore = volumes.slice(0, -3).reduce((a,b)=>a+b,0) / Math.max(1, volumes.length - 3);
      if (vBefore > 0 && vNow < vBefore * 0.7) volConfirm = true;
    }
    return {
      reversalDetected: true,
      type: 'bearish_divergence',
      confidence: volConfirm ? 'high' : 'medium',
      rsiNow: Math.round(rsiNow),
      rsiBefore: Math.round(rsiBefore),
      volConfirm: volConfirm
    };
  }
  
  // Divergence bullish : prix baisse mais RSI monte
  if (side === 'short' && priceNow < priceBefore && rsiNow - rsiBefore > divThresh) {
    let volConfirm = false;
    if (volumes.length >= 14) {
      const vNow = volumes.slice(-3).reduce((a,b)=>a+b,0) / 3;
      const vBefore = volumes.slice(0, -3).reduce((a,b)=>a+b,0) / Math.max(1, volumes.length - 3);
      if (vBefore > 0 && vNow < vBefore * 0.7) volConfirm = true;
    }
    return {
      reversalDetected: true,
      type: 'bullish_divergence',
      confidence: volConfirm ? 'high' : 'medium',
      rsiNow: Math.round(rsiNow),
      rsiBefore: Math.round(rsiBefore),
      volConfirm: volConfirm
    };
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
  
  // Fill gradient below line
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
  // Médiane <1% (marché ultra-calme) → 15 min
  // Médiane ~2% (marché normal) → 30 min
  // Médiane >4% (marché agité) → 60 min
  // Médiane >6% (tempête) → 90 min
  let multiplier;
  if (median < 1.0)      multiplier = 0.5;   // 15 min
  else if (median < 2.0) multiplier = 0.75;  // 22 min
  else if (median < 3.0) multiplier = 1.0;   // 30 min
  else if (median < 4.5) multiplier = 1.5;   // 45 min
  else if (median < 6.0) multiplier = 2.0;   // 60 min
  else                   multiplier = 3.0;   // 90 min
  const baseMs = 30 * 60 * 1000;  // base 30 min
  let ms = baseMs * multiplier;
  // Bornes strictes
  ms = Math.max(15*60*1000, Math.min(90*60*1000, ms));
  // Mémoriser
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
    if (!c) return 3000;  // défaut 3s si API non dispo
    const type = c.effectiveType;  // '4g', '3g', '2g', 'slow-2g'
    const downlink = c.downlink || 10;  // Mbps
    
    // WiFi direct (pas de cellular)
    if (c.type === 'wifi') return 2000;
    
    // Cellulaire selon qualité
    if (type === '4g' && downlink >= 10) return 3000;  // 4G/5G rapide = 3s
    if (type === '4g') return 4000;                     // 4G normale = 4s
    if (type === '3g') return 6000;                     // 3G = 6s
    return 5000;                                         // autre/faible = 5s
  } catch(e) {
    return 3000;
  }
}
if(typeof _getAdaptiveThreshold==='function') window._getAdaptiveThreshold = _getAdaptiveThreshold;

function _getAgentVoteMultiplier(agentName) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.agentVotingAdaptive) return 1.0;
  if (!S.tradeContextMemory) return 1.0;
  
  // Compter les trades où cet agent était dans les top 5
  let wins = 0, losses = 0;
  for (const c of S.tradeContextMemory) {
    if (c.closedAt === null) continue;
    if (!c.topAgents || c.topAgents.length === 0) continue;
    const found = c.topAgents.find(a => (a.name || '').startsWith(agentName.slice(0, 20)));
    if (!found) continue;
    if (c.won) wins++; else losses++;
  }
  const total = wins + losses;
  // Au moins 5 trades pour ajuster
  if (total < 5) return 1.0;
  const wr = wins / total;
  // Formule continue :
  // wr = 0.7 → boost ~1.4
  // wr = 0.5 → 1.0 (neutre)
  // wr = 0.3 → reduce ~0.6
  // wr = 0.2 → reduce ~0.4 (floor)
  const boostMax = cfg.agentVoteBoostMax || 1.6;
  const reduceMin = cfg.agentVoteReduceMin || 0.4;
  // Formule linéaire centrée sur 0.5 WR
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
  // Calcul semaine ISO simplifié
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((d - start) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return year + '-W' + String(week).padStart(2, '0');
}
if(typeof _getWeekKey==='function') window._getWeekKey = _getWeekKey;

function _giveBackToBot(pair) {
  if (S._manualPairs) delete S._manualPairs[pair];
  S.chainLog.push({
    icon: '🤖',
    desc: `Contrôle rendu au bot · ${pair}`,
    hash: rndHash(), time: nowStr()
  });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  if (typeof showToast === 'function') {
    showToast('🤖 Bot réactivé · ' + pair, 2500);
  }
  if (_currentDetailPair === pair) {
    closePairDetail();
    setTimeout(() => openPairDetail(pair), 100);
  }
}
window._giveBackToBot = _giveBackToBot;
if(typeof _giveBackToBot==='function') window._giveBackToBot = _giveBackToBot;

function _initNetIndicator() {
  try { _updateNetIndicator(); } catch(e) {}
}
if(typeof _initNetIndicator==='function') window._initNetIndicator = _initNetIndicator;

function _installPackContinuite() {
  if (_packContinuiteInstalled) return;
  _packContinuiteInstalled = true;
  
  // Remplacer l'auto-save 30s par 15s
  if (_autoSaveInterval) clearInterval(_autoSaveInterval);
  _autoSaveInterval = setInterval(() => {
    if (typeof S !== 'undefined' && !window._resetInProgress) {
      saveState(true);
    }
  }, 15000);  // 15s au lieu de 30s
  
  // Save immédiat sur "pagehide" avec sendBeacon si possible
  // (plus fiable que beforeunload sur mobile)
  window.addEventListener('pagehide', () => {
    // v11quinquies · BUG FIX : ne jamais sauvegarder si un reset est en cours
    // (évite que le pagehide réécrive les données juste avant le reload)
    if (window._resetInProgress) return;
    if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
    try {
      const snap = buildSnapshot();
      // Tentative IndexedDB async + fallback localStorage sync
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch(e) {}
      saveState(true);
    } catch(e) {}
  });
  
  // Sur freeze (Chrome Android parfois émet ceci avant de tuer la page)
  document.addEventListener('freeze', () => {
    // v11quinquies · BUG FIX : bloquer aussi sur freeze pendant reset
    if (window._resetInProgress) return;
    if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
    try { saveState(true); } catch(e) {}
  });
  
  console.log('[NEXUS] Pack Continuité installé · autosave 15s + hooks pagehide/freeze');
}
if(typeof _installPackContinuite==='function') window._installPackContinuite = _installPackContinuite;

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

function _maybeCreateAutoSnapshot(reason) {
  const now = Date.now();
  // Skip si trop récent (évite spam snapshots après série de trades)
  if (reason === 'trade_close' && now - _lastAutoSnapTs < 2 * 60 * 1000) return;  // max 1/2min sur trade
  if (reason === 'periodic' && now - _lastAutoSnapTs < _AUTO_SNAP_INTERVAL) return;
  try {
    createInternalSnapshot();
    _lastAutoSnapTs = now;
  } catch(e) { console.warn('[auto-snap]', e); }
}
if(typeof _maybeCreateAutoSnapshot==='function') window._maybeCreateAutoSnapshot = _maybeCreateAutoSnapshot;

function _mutateValue(value, strength, min, max) {
  // strength = amplitude relative (0.3 = ±30%)
  // Distribution centrée sur value, avec tirage gaussien approché
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
    // Coupure détectée
    _netwatchState = 'offline';
    _netOfflineSinceTs = now;
    _freshPricesInRow = 0;
    _updateNetIndicator();
    
    // Pause du bot : on arrête le simInterval (le bot ne trade plus)
    // MAIS on garde le monitoring actif (SL/TP peuvent encore fermer en urgence — Q3:B)
    if (_simRunning && typeof _simRunning !== 'undefined') {
      _netwatchPausedBot = true;
      // On ne fait pas stopSim() car on veut garder la surveillance active
      // On pose un flag que le bot lit pour ne pas OUVRIR de nouveau trade
      S._netPaused = true;
    }
    
    // v7.12 · UI discrète · PAS de toast pour fluctuation courte (< 5s)
    // Le toast ne s'affiche que si la coupure dure réellement
  }
  
  // Toast discret seulement après 5s confirmés de coupure
  if (_netwatchState === 'offline' && !S._netToastShown && elapsed > _getNetwatchThreshold() * 2) {
    S._netToastShown = true;
    S.chainLog.push({
      icon: '🔴',
      desc: 'Coupure connexion détectée · bot en pause (ouverture bloquée, SL/TP actif)',
      hash: rndHash(), time: nowStr()
    });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    if (typeof showToast === 'function') {
      showToast('Connexion instable · bot en pause', 3000, 'user');
    }
  }
  if (_netwatchState === 'online') S._netToastShown = false;
  
  // Q2:C · Si coupure > 10s → sauvegarde forcée INTERNE (pas de download)
  if (_netwatchState === 'offline' && !_net10sSaveTriggered && elapsed > _getNetwatchThreshold() * 3) {
    _net10sSaveTriggered = true;
    try {
      if (typeof saveState === 'function') saveState(true);
      if (typeof _p5MultiStorageSave === 'function') _p5MultiStorageSave();
      // v7.12 · Q1:B · PAS de download auto (fichier), juste snapshot interne
      if (typeof createInternalSnapshot === 'function') createInternalSnapshot();
      S.chainLog.push({
        icon: '💾',
        desc: 'Coupure > 10s · sauvegarde interne forcée (pas de fichier)',
        hash: rndHash(), time: nowStr()
      });
    } catch(e) { console.warn('netwatch 10s save failed:', e); }
  }
  
  // Update indicator anyway (refresh periodic)
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
  
  // Apply settings to pairState
  ps.stake = stake;
  ps.pairLeverage = lev;
  
  // Call the existing manual openPosition
  if (typeof openPosition === 'function') {
    try {
      openPosition(pair, side);
      // After open, apply TP/SL
      setTimeout(() => {
        const newPos = S.openPositions.find(p => p.pair === pair && p.auto !== true);
        if (newPos) {
          if (tp && tp > 0) newPos.tp = tp;
          if (sl && sl > 0) newPos.sl = sl;
          // Mark open time for timeout check
          newPos._manOpenedAt = Date.now();
          newPos._manMaxLossPct = S._manConsignes?.[pair]?.maxLossPct || 2.0;
          newPos._manTimeoutMin = S._manConsignes?.[pair]?.timeoutMin || 60;
        }
      }, 50);
      
      S.chainLog.push({
        icon: '🎛️',
        desc: `Trade MANUEL ${pair} ${side.toUpperCase()} · mise $${stake} · levier ×${lev}${tp?' · TP '+tp.toFixed(cfg?.dec>=4?4:0):''}${sl?' · SL '+sl.toFixed(cfg?.dec>=4?4:0):''}`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      
      if (typeof showToast === 'function') {
        showToast('🎛️ ' + pair + ' ' + side.toUpperCase() + ' ouvert · $' + stake, 2500);
      }
      
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
  
  // ═══ v7.12 · PROTECTION P12 · Détection ÉTENDUE des dettes orphelines ═══
  // Le P4 d'origine ne regardait que _autoLevBorrowed, mais borrowLeverage
  // (avant P10) pouvait remplir leverageBorrowed sans toucher à _autoLevBorrowed.
  // P12 surveille leverageBorrowed directement.
  
  // Calcul de la dette réellement engagée dans des positions ouvertes
  const debtInPositions = (S.openPositions || [])
    .reduce((s, p) => s + (p.levBorrowed || 0), 0);
  
  // La "vraie" dette orpheline = ce qui est dans leverageBorrowed mais pas dans une position
  const orphanDebt = Math.max(0, debtTotal - debtInPositions);
  
  // Cas 1 : Levier désactivé ET dette résiduelle existe → rembourser
  if (leverage === 0 && orphanDebt > 0 && trading > 0) {
    // Protéger le stake des positions ouvertes
    const committedInPositions = (S.openPositions || [])
      .reduce((s, p) => s + (p.stakeUsdt || 0), 0);
    const freeInTrading = Math.max(0, trading - committedInPositions);
    const repay = Math.min(orphanDebt, freeInTrading);
    
    if (repay > 0) {
      S.tradingAccount   = Math.max(0, trading - repay);
      S.leverageBorrowed = Math.max(0, debtTotal - repay);
      S._autoLevBorrowed = Math.max(0, debtAuto - repay);
      S.portfolio        = (S.cashAccount || 0) + (S.tradingAccount || 0);
      if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
      
      S.chainLog.push({
        icon: '🔧',
        desc: `P12 Watchdog · remboursement dette orpheline $${repay.toFixed(2)} (reste $${(S.leverageBorrowed||0).toFixed(2)})`,
        hash: (typeof rndHash === 'function' ? rndHash() : Math.random().toString(36).slice(2,10)),
        time: (typeof nowStr === 'function' ? nowStr() : new Date().toLocaleTimeString())
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      
      // v7.12 · UI silencieuse · pas de toast intrusif
      // (la chain log et les indicateurs UI suffisent)
    }
  }
  
  // Cas 2 : Pas de positions ouvertes ET dette résiduelle → rembourser tout ce qu'on peut
  if ((S.openPositions || []).length === 0 && debtTotal > 0 && trading > 0) {
    const repay = Math.min(debtTotal, trading);
    if (repay > 0) {
      S.tradingAccount   = Math.max(0, trading - repay);
      S.leverageBorrowed = Math.max(0, debtTotal - repay);
      S._autoLevBorrowed = Math.max(0, debtAuto - repay);
      S.portfolio        = (S.cashAccount || 0) + (S.tradingAccount || 0);
      if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
      S.chainLog.push({
        icon: '🔧',
        desc: `P12 · Aucune position ouverte · remboursement total $${repay.toFixed(2)}`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
  }
}
if(typeof _p4AntiDetteWatchdog==='function') window._p4AntiDetteWatchdog = _p4AntiDetteWatchdog;

function _p5AdaptiveInterval() {
  const nOpen = (S && S.openPositions) ? S.openPositions.length : 0;
  if (nOpen >= 3) return 3000;   // 3s
  if (nOpen >= 1) return 10000;  // 10s
  return 30000;                   // 30s
}
if(typeof _p5AdaptiveInterval==='function') window._p5AdaptiveInterval = _p5AdaptiveInterval;

function _p5AdaptiveLoop() {
  const now = Date.now();
  const interval = _p5AdaptiveInterval();
  if (now - _p5LastAdaptiveSave >= interval) {
    _p5LastAdaptiveSave = now;
    if (typeof S !== 'undefined' && !window._resetInProgress) {
      _p5MultiStorageSave();
    }
  }
}
if(typeof _p5AdaptiveLoop==='function') window._p5AdaptiveLoop = _p5AdaptiveLoop;

function _p5InvariantCheck() {
  if (typeof S === 'undefined' || !S) return;
  
  const posLevSum = (S.openPositions || []).reduce((s, p) => s + (p.levBorrowed || 0), 0);
  const totalBorrow = S.leverageBorrowed || 0;
  const autoBorrow = S._autoLevBorrowed || 0;
  
  // Check 1 : incohérence levier 0 + dette résiduelle sans position
  if ((S.leverage || 0) === 0 && autoBorrow > 0 && posLevSum === 0) {
    // Dette orpheline détectée → déclencher P4
    if (!S._p5LastWarn || Date.now() - S._p5LastWarn > 5 * 60 * 1000) {
      S._p5LastWarn = Date.now();
      console.warn('[P5 INVARIANT] Dette orpheline détectée: $' + autoBorrow.toFixed(2) + ' sans position · P4 sera déclenché');
    }
    _p4AntiDetteWatchdog();  // corriger immédiatement
  }
  
  // Check 2 : sous-comptabilisation
  if (totalBorrow < posLevSum - 0.01) {  // tolérance arrondi
    console.error('[P5 INVARIANT] leverageBorrowed (' + totalBorrow.toFixed(2) + ') < somme pos.levBorrowed (' + posLevSum.toFixed(2) + ')');
    // Correction : réaligner
    S.leverageBorrowed = posLevSum;
  }
}
if(typeof _p5InvariantCheck==='function') window._p5InvariantCheck = _p5InvariantCheck;

function _p5MultiStorageSave() {
  if (typeof buildSnapshot !== 'function') return false;
  // v7.12 · Q2:A · pulsation visuelle douce
  try { if (typeof _pulseSettingsBtn === 'function') _pulseSettingsBtn(); } catch(e) {}
  let snap;
  try { snap = buildSnapshot(); } catch(e) { return false; }
  if (!snap) return false;
  
  const snapStr = JSON.stringify(snap);
  const keyThisTime = _SNAP_KEYS[_snapRotationIdx];
  _snapRotationIdx = (_snapRotationIdx + 1) % 3;
  
  // Storage 1 : IndexedDB via saveState (existant)
  try { if (typeof saveState === 'function') saveState(true); } catch(e) {}
  
  // Storage 2 : localStorage (rotation 3 slots)
  try {
    localStorage.setItem(keyThisTime, snapStr);
    localStorage.setItem('nexusSnap_latest', keyThisTime);  // pointe vers le plus récent
  } catch(e) {
    // localStorage peut être plein, on nettoie les autres
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('nexusSnap_') && k !== keyThisTime) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(keyThisTime, snapStr);
    } catch(e2) {}
  }
  
  // Storage 3 : sessionStorage (survit aux crashes navigateur)
  try {
    sessionStorage.setItem('nexusSnap_current', snapStr);
  } catch(e) {}
  
  return true;
}
if(typeof _p5MultiStorageSave==='function') window._p5MultiStorageSave = _p5MultiStorageSave;

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
  
  // Ajouter la classe animation (CSS injecté plus bas)
  btn.classList.add('nexus-save-pulse');
  
  // Clear timer si déjà en cours
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
    if (mult !== 1.0) {
      S.adaptiveState.lastAgentBoosts[name] = mult;
    }
  });
}
window._recomputeAllAgentBoosts = _recomputeAllAgentBoosts;
if(typeof _recomputeAllAgentBoosts==='function') window._recomputeAllAgentBoosts = _recomputeAllAgentBoosts;

function _refreshSnapshotsList() {
  const list = document.getElementById('snapshotsList');
  if (!list) return;
  const snaps = listInternalSnapshots();
  if (snaps.length === 0) {
    list.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:12px;text-align:center;">Aucun snapshot · créez-en un</div>';
    return;
  }
  list.innerHTML = snaps.map((s, i) => `
    <div style="background:rgba(20,22,26,.6);border:1px solid rgba(56,212,245,.15);border-radius:10px;padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
        <div style="flex:1;">
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--t1);font-weight:700;">${i===0?'🟢 Dernier':'📸 Snapshot '+(i+1)}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--t2);margin-top:3px;">${s.label}</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--up);margin-top:4px;">${s.portfolio.toFixed(0)}€ · ${s.trades} trades</div>
        </div>
        <button onclick="window._snapshotActionRestore(${s.slot})" style="background:rgba(0,232,122,.12);border:1px solid rgba(0,232,122,.35);border-radius:8px;color:var(--up);padding:8px 14px;font-family:var(--font-mono);font-size:11px;font-weight:700;cursor:pointer;">↩ RESTAURER</button>
      </div>
    </div>
  `).join('');
}
if(typeof _refreshSnapshotsList==='function') window._refreshSnapshotsList = _refreshSnapshotsList;

function _requestNotifPermission() { return Promise.resolve(false); }
if(typeof _requestNotifPermission==='function') window._requestNotifPermission = _requestNotifPermission;

function _resolvePairCycleCore(pair, ps) {
  const cfg = PAIRS[pair];

  // 1. COLLECTE DES SIGNAUX — tous les agents + AT + AF + LMSR
  const tech = getTechSignals(pair);
  const fund = getFundamentalSignals(pair);
  const raw  = tech?.raw || null;

  const atScore    = tech?.atScore   || 0;
  const fundScore  = fund?.fundScore || 0;
  const composite  = Math.max(-1, Math.min(1, atScore*0.60 + fundScore*0.40));

  // v6.4 · SIGNAL COMPUTATION (bug fixed: correct order of operations)

  // Consensus agents pondéré par fitness
  const totalFitness   = S.agents.reduce((s,a) => s + (a.fitness||1), 0) || 1;
  // Use ALL agents including council/fleet — they now have live scores from runRosterAnalysis
  // v7.0: CONTEXT-AWARE CONSENSUS — agents spécialisés du régime actuel pèsent davantage
  // v7.3 OPT · EXCLUSION bots + meta — leurs scores sont neutres par design, ne doivent pas biaiser le consensus
  const _currentRegime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';
  const _signalAgents = S.agents.filter(a => !a.isBot && !a.isMeta);  // v7.3 OPT · seuls les analystes votent
  const totalContextFit = _signalAgents.reduce((s,a) => s + (typeof getContextualWeight === 'function' ? getContextualWeight(a, _currentRegime) : (a.fitness||1)), 0) || 1;
  // v7.9 · CONSENSUS AFFÛTÉ :
  //   (a) Filtre anti-bruit : agents avec |score| < 0.03 (quasi-neutres) ne votent pas
  //   (b) Exposant 1.15 : amplifie les convictions fortes
  //   (c) v7.10 · Pondération par conviction : un agent fit ET convaincu compte plus
  //       qu'un agent fit mais tiède (poids = fitness × (1 + conviction²×2))
  let _weightSum = 0;
  const _contribs = _signalAgents.map(a => {
    const raw = (a.score||0);
    if(Math.abs(raw) < 0.03) return { w:0, sig:0 };
    const cw = typeof getContextualWeight === 'function' ? getContextualWeight(a, _currentRegime) : (a.fitness||1);
    const convBoost = 1 + Math.pow(Math.abs(raw), 2) * 2;  // 1× à score=0, 3× à score=1
    const w = cw * convBoost;
    _weightSum += w;
    const sig = Math.sign(raw) * Math.pow(Math.abs(raw), 1.15);
    return { w, sig };
  });
  const agentConsensus = _weightSum > 0
    ? _contribs.reduce((s, c) => s + c.sig * (c.w / _weightSum), 0)
    : 0;

  // LMSR interne
  const lmsrProb  = lmsrP(ps);
  const lmsrScore = (lmsrProb - 0.5) * 2;

  // Signal final : Composite×30% + Agents×50% + LMSR×20%
  // v7.10 · BONUS D'ALIGNEMENT : quand les 3 sources (composite, agents, LMSR) pointent
  // dans la même direction, on amplifie le signal de 20% — confluence = conviction réelle.
  // Inversement, en cas de désaccord fort, on réduit légèrement (incertitude).
  const _sameSign = (a, b) => a === 0 || b === 0 || Math.sign(a) === Math.sign(b);
  const _allAligned = _sameSign(composite, agentConsensus) && _sameSign(agentConsensus, lmsrScore) && _sameSign(composite, lmsrScore);
  // Fort désaccord = au moins 2 sources de signes opposés avec magnitude significative
  const _strongDisagree = !_allAligned &&
    Math.abs(composite) > 0.15 && Math.abs(agentConsensus) > 0.15 &&
    Math.sign(composite) !== Math.sign(agentConsensus);
  const _alignBonus = _allAligned ? 1.20 : (_strongDisagree ? 0.85 : 1.0);
  const _rawFinal = composite*0.30 + agentConsensus*0.50 + lmsrScore*0.20;
  const finalSignal = Math.max(-1, Math.min(1, _rawFinal * _alignBonus));

  // ── MEMORY RECALL BIAS (Feature #1) ──────────────────────
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

  // v6.4 FIX: finalSignalWithMem defined BEFORE conviction (was NaN before)
  const finalSignalWithMem = Math.max(-1, Math.min(1, finalSignal + memBiasFinal));

  // Bonus indicateurs confirmants
  let techBonus = 0;
  if(tech) {
    const dir = finalSignalWithMem > 0 ? 'bull' : 'bear';
    Object.values(tech.signals||{}).forEach(s => { if(s?.signal === dir) techBonus += 0.04; });
    techBonus = Math.min(0.25, techBonus);
  }

  // v6.4 FIX: conviction uses the now-correctly-defined finalSignalWithMem
  const conviction         = Math.abs(finalSignalWithMem);
  const effectiveConviction = Math.min(1, conviction + techBonus);

  // v6.4 · LMSR NUDGE — stronger push toward signal direction
  // Increased nudge strength (4→8) so LMSR reaches threshold faster
  const targetProb = 0.5 + finalSignalWithMem * 0.40;
  const curProb    = lmsrP(ps);
  const nudge      = (targetProb - curProb) * Math.max(0.3, effectiveConviction) * 8;
  if(nudge > 0)      ps.qYes = Math.max(10, ps.qYes + nudge);
  else if(nudge < 0) ps.qNo  = Math.max(10, ps.qNo  - nudge);
  const qTotal = ps.qYes + ps.qNo;
  if(qTotal > 800) { const r = 200/qTotal; ps.qYes = Math.max(10, ps.qYes*r); ps.qNo = Math.max(10, ps.qNo*r); }

  // 2. FILTRES QUALITÉ
  const adxVal    = raw?.adx?.adx || 20;
  const volCV     = raw?.stddev?.cv || 0.015;
  // v8.0 LIVRAISON 39 · ADOUCISSEMENT FILTRES adx/vol (positions étaient dévorées)
  // Avant : adxFilter * volFilter pouvait diviser stake par 4.5 (0.4 * 0.55 = 0.22)
  // Maintenant : maximum -25% combinés (0.75 * 0.85 = 0.64)
  const adxFilter = adxVal<18?0.75:adxVal<25?0.90:1.0;
  const volFilter = volCV>0.05?0.85:volCV<0.008?1.10:1.0;
  const minConv   = 0.48;  // v7.12 MOD 4 · raised 0.38→0.48 · filtre trades médiocres

  // 3. AUTO-CYCLE (bot uniquement si pas de contrôle manuel)
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
      // Indicate bot adjusted the cycle
      if(autoLbl){ autoLbl.textContent='🤖 '+fmtDur(tc); autoLbl.style.color='var(--pur)';
        setTimeout(()=>{ if(autoLbl) autoLbl.style.color='var(--t3)'; }, 2000); }
      // Log significant changes only (every 5 cycles to avoid spam)
      if(S.cycle % 5 === 0) S.chainLog.push({
        icon:'⏱', desc:`Bot ${pair}: cycle ${fmtDur(prevCycle)}→${fmtDur(tc)} · conv. ${(effectiveConviction*100).toFixed(0)}%`,
        hash:rndHash(), time:nowStr()
      });
    }
  }

  // 4. DIRECTION + SEUIL (v6.5 REDESIGN)
  // BUG RACINE CORRIGÉ: LMSR ne pouvait jamais atteindre 0.60 (max 0.56 théorique)
  // + resetté à chaque hold → jamais de trade en autonome
  // SOLUTION: entrée sur conviction + direction, LMSR = bonus multiplicateur seulement

  const adjProb = lmsrP(ps);

  // Gate 1: conviction suffisante
  const convGate = effectiveConviction >= (0.18 - (S._convBoost || 0));  // v6.9: sélectif + auto-relâche si stagnation
  // Gate 2: direction du signal claire
  const dirGate  = Math.abs(finalSignalWithMem) >= (0.10 - (S._convBoost || 0) * 0.5);  // v6.9: signal + relâche
  // Bonus LMSR: si LMSR s'aligne, on entre même avec conviction modérée
  // Si conviction très forte (>0.40), on entre même si LMSR est neutre
  const lmsrAlignBuy  = adjProb > 0.50;
  const lmsrAlignSell = adjProb < 0.50;
  // convOverride: signal AT très fort (>0.30% conviction) = pas besoin de LMSR aligné
  const convOverride  = effectiveConviction > 0.25;  // v6.5: 0.25+ → trade even without LMSR alignment

  const isBuy  = finalSignalWithMem > 0 && convGate && dirGate && (lmsrAlignBuy  || convOverride);
  const isSell = finalSignalWithMem < 0 && convGate && dirGate && (lmsrAlignSell || convOverride);
  const action = isBuy ? 'buy' : isSell ? 'sell' : 'hold';
  ps.lastAction = action;
  if(action==='hold'){if(!ps.holdStartTs)ps.holdStartTs=Date.now();}else{ps.holdStartTs=0;}

  // Agent learning every 6 ticks
  if(tick%6===0){
    S.agents.forEach(a=>{
      const pull=finalSignalWithMem*0.005*(a.conf||0.5);
      a.score=Math.max(-1,Math.min(1,a.score+pull+(Math.random()-0.5)*0.001));
    });
  }

  // 5. POSITION MANUELLE — bot respecte et apprend
  const manualPos=S.openPositions.find(p=>p.pair===pair&&p.auto!==true);
  if(manualPos){
    const mPnl=manualPos.side==='long'
      ?((ps.price-manualPos.entryPrice)/manualPos.entryPrice*100)
      :((manualPos.entryPrice-ps.price)/manualPos.entryPrice*100);
    if(Math.abs(mPnl)>0.2)learnFromOutcome('cycle',mPnl,pair);
    return;
  }

  // 6. GESTION POSITION BOT OUVERTE
  const botPos=S.openPositions.find(p=>p.pair===pair&&p.auto===true);
  if(botPos){
    const posDir=botPos.side==='long'?1:-1;
    const sigDir=isBuy?1:isSell?-1:0;
    const pnlPct=botPos.side==='long'
      ?((ps.price-botPos.entryPrice)/botPos.entryPrice*100)
      :((botPos.entryPrice-ps.price)/botPos.entryPrice*100);
    const pnlUsd=botPos.stakeUsdt*(pnlPct/100);
    botPos.pnl=pnlPct; botPos.pnlUsdt=pnlUsd; botPos.currentVal=botPos.stakeUsdt+pnlUsd;

    const tpPct=Math.max(1.2,effectiveConviction*4.5*(1+volCV*8));  // v7.3 OPT · TP plus ambitieux (3.5→4.5, min 1→1.2)
    const slPct=Math.max(0.6,tpPct*0.35);  // v7.12 MOD 6 · SL resserré (0.45→0.35) · protège capital sur levier élevé · R:R ~2.85

    // Trailing stop au breakeven si >60% du TP atteint
    if(pnlPct>tpPct*0.45){  // v7.12 BALANCED · trailing plus précoce 50%→45% · sécurise mieux les gains
      const be=botPos.entryPrice*(1+(botPos.side==='long'?0.001:-0.001));
      if(botPos.side==='long' &&(!botPos.sl||botPos.sl<be))botPos.sl=be;
      if(botPos.side==='short'&&(!botPos.sl||botPos.sl>be))botPos.sl=be;
    }

    const tpHit=pnlPct>=tpPct;
    const slHit=pnlPct<=-slPct;
    // v6.9: sigRev seuil 0.50→0.65 (ne ferme que sur signal vraiment inversé)
    const sigRev=sigDir!==0&&sigDir!==posDir&&effectiveConviction>0.65;
    botPos._holdCycles=(botPos._holdCycles||0)+1;
    // v6.9: Min hold 3 cycles — laisser le trade respirer avant toute close (sauf SL d'urgence)
    const minHoldMet = botPos._holdCycles >= 5;  // v7.3 OPT · was 3 · moins de whipsaw sur signal
    // v7.12 · OPTION 3 BIS (compromis prudent) — maxHold 12→8
    // Évite les positions fantômes >1h sans casser les trades lents rentables
    // Conviction 0.35 → maxHold ≈ 23 cycles (~1h au lieu de 1h30)
    // Conviction 0.60 → maxHold ≈ 14 cycles (~37 min)
    // Conviction 0.80 → maxHold ≈ 10 cycles (~27 min)
    const maxHold=Math.ceil(8/Math.max(0.1,effectiveConviction));
    const timeClose=botPos._holdCycles>=maxHold;
    // Consensus inverse: >70% des agents s'opposent
    const oppWeight=S.agents.filter(a=>{const ad=a.score>0.05?1:a.score<-0.05?-1:0;return ad!==0&&ad!==posDir;}).reduce((s,a)=>s+(a.fitness||1),0)/totalFitness;
    const consRev=oppWeight>0.75&&effectiveConviction>0.55;  // v6.9: consensus inverse doit être FORT

    // v4.1 — MAN mode: bot never closes bot positions (user keeps full control)
    // EXCEPT: respect user-set TP/SL which are handled elsewhere
    const canBotClose = S.botAutoMode !== false;
    if(canBotClose && (slHit || (minHoldMet && (tpHit||sigRev||timeClose||consRev)))){  // v6.9: SL toujours autorisé, reste requiert minHold
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

  // 7. DÉCISION D'ENTRÉE (v6.5 · LMSR decay au lieu de reset)
  if(action==='hold' || effectiveConviction < 0.15) {
    const candles=ps.candles;
    const move=candles.length>1?(candles[candles.length-1].c-candles[candles.length-2].c)/ps.price*100:0;
    learnFromOutcome('cycle',move,pair);
    // v7.12 MOD 8A : decay adouci 0.85 → 0.95 · permet à la conviction de s'accumuler sur plusieurs cycles
    // (avant v6.5 : reset brutal. v6.5 : 15% perte/cycle. v7.12 : 5% perte/cycle pour mémoire utile)
    ps.qYes = Math.max(20, 100 + (ps.qYes - 100) * 0.95);
    ps.qNo  = Math.max(20, 100 + (ps.qNo  - 100) * 0.95);
    return;
  }

  // ENTRÉE BOT — LONG ou SHORT basé sur signal composite complet
  // ── Vérification rentabilité après frais ──────────────────
  const _fc      = S.feeConfig;
  const _reg     = S.taxConfig.regions[S.taxConfig.region];
  const _feePct  = (_fc.takerRate + _fc.slippage) * 2 + _fc.fundingRate * 3;
  const _taxPct  = (_reg?.inclusion||0) * (_reg?.rate||0);
  const _breakEven = _feePct + _taxPct;
  // Bot n'ouvre pas si signal trop faible pour couvrir les frais aller-retour
  // v6.4 · Less aggressive breakEven gate (2.0× → 1.5×)
  if(effectiveConviction < _breakEven * 1.5) {
    learnFromOutcome('cycle', 0, pair);
    // v7.12 MOD 8B : remplacement du reset brutal random par le même decay doux 0.95
    // Avant : écrasait totalement la mémoire LMSR (~50% prob) quand les frais étaient trop hauts
    // Maintenant : garde la mémoire, simplement on ne trade pas ce cycle
    ps.qYes = Math.max(20, 100 + (ps.qYes - 100) * 0.95);
    ps.qNo  = Math.max(20, 100 + (ps.qNo  - 100) * 0.95);
    return;
  }
  // Optimiser le seuil LMSR dynamiquement: si frais élevés → seuil plus strict
  if(!ps.userCycleSet) {
    // v6.4 · Lower ceiling so threshold stays reachable
    const optThr = Math.min(0.72, Math.max(0.55, 0.50 + _breakEven * 6 + effectiveConviction * 0.10));
    if(Math.abs(optThr - (ps.threshold||0.65)) > 0.02) {
      ps.threshold = Math.round(optThr * 100) / 100;
      const _pk2 = pair.replace('/','_');
      const _thl = document.getElementById('ac2_thrlbl_'+_pk2);
      if(_thl) _thl.textContent = (ps.threshold*100).toFixed(0)+'% · '+fmtDur(ps.cycleMax);
    }
  }
  const side = action==='buy'?'long':'short';
  const stakeBase = Math.max(10, ps.stake || 10);  // v6.9: défaut $10
  // v8.0 LIVRAISON 36 · FIX STAKE PLAFONNÉ À $25 (BUG MAJEUR)
  // L'ancienne formule était : stakeBase * (1 + conviction * 1.5) → max ~$25
  // qui annulait complètement le maxStake calculé par Kelly (~$200-$700).
  // Nouvelle formule : utilise vraiment maxStake selon la conviction (40% à 100%)
  const lmsrBonus  = (action==='buy' && adjProb > 0.52) || (action==='sell' && adjProb < 0.48) ? 1.20 : 1.0;
  // v8.0 LIVRAISON 39 · KellyFrac max 10% → 15% pour mieux exploiter le capital
  const kellyFrac  = Math.min(0.15, effectiveConviction * 0.35);
  const maxStake   = S.tradingAccount * kellyFrac * lmsrBonus;
  // FIX : 40% du maxStake mini (conviction 0.15) à 100% du maxStake max (conviction 1.0)
  const convScale  = 0.40 + (0.60 * effectiveConviction);
  const stakeRaw   = Math.max(stakeBase, maxStake * convScale);
  const stakeUsdt  = Math.round(stakeRaw*adxFilter*volFilter*10)/10;
  
  // v7.12 LIVRAISON 15 · Limiter la mise selon le profil de volatilité (mode Réel)
  // Évite les pertes catastrophiques sur paires très volatiles (DOGE, mèmes)
  let finalStake = stakeUsdt;
  if (S.tradingMode === 'paperReal' && typeof _checkPaperRealStakeLimit === 'function') {
    finalStake = _checkPaperRealStakeLimit(stakeUsdt, pair, side);
  }

  const tpPctE=Math.max(0.7,effectiveConviction*3.2*(1+volCV*9));
  const slPctE=Math.max(0.35,tpPctE*0.42);
  const tpE   =ps.price*(1+(side==='long'?1:-1)*tpPctE/100);
  const slE   =ps.price*(1-(side==='long'?1:-1)*slPctE/100);

  autoOpenPosition(pair, side, finalStake);

  // Apply TP/SL directly — no setTimeout race condition
  const np = S.openPositions.find(p => p.pair===pair && p.auto===true);
  if(np) { np.tp=tpE; np.sl=slE; np._holdCycles=0; }

  const pt=cfg.dec>=4?ps.price.toFixed(cfg.dec):Math.floor(ps.price).toLocaleString();
  const tt=cfg.dec>=4?tpE.toFixed(cfg.dec):Math.floor(tpE).toLocaleString();
  const st=cfg.dec>=4?slE.toFixed(cfg.dec):Math.floor(slE).toLocaleString();
  S.chainLog.push({icon:side==='long'?'🟢':'🔴',
    desc:`BOT ${side.toUpperCase()} ${pair} @${pt} | AT:${(atScore*100).toFixed(0)}% AF:${(fundScore*100).toFixed(0)}% Ag:${(agentConsensus*100).toFixed(0)}% Conv:${(effectiveConviction*100).toFixed(0)}% | TP:${tt} SL:${st}`,
    hash:rndHash(),time:nowStr()});
  showToast(`🤖 Bot ${side.toUpperCase()} ${pair} · AT${atScore>=0?'+':''}${(atScore*100).toFixed(0)}% AF${fundScore>=0?'+':''}${(fundScore*100).toFixed(0)}% · ${(effectiveConviction*100).toFixed(0)}%`);
  // v7.12 · BUG FIX 124L · NE PAS compter l'ouverture comme outcome (pnl=0 était compté comme LOSS)
  // L'apprentissage aura lieu à la clôture via learnFromOutcome('position', realisedPct, ...)
  // learnFromOutcome('trade',0,pair);  // ← DÉSACTIVÉ (causait inflation artificielle du streak L)

  S.totalTrades=Object.values(S.pairStates).reduce((s,p)=>s+p.totalTrades,0);
  S.winTrades  =Object.values(S.pairStates).reduce((s,p)=>s+p.winTrades,0);
  if(S.chainLog.length>100)S.chainLog.splice(0,S.chainLog.length-100);
}
if(typeof _resolvePairCycleCore==='function') window._resolvePairCycleCore = _resolvePairCycleCore;

function _resolvePaperRealCycle(pair, ps) {
  // 1. Paire active ?
  if (!(S.paperRealActivePairs && S.paperRealActivePairs[pair])) return;

  // 2. Pause globale active ? (déclenchée après N pertes consécutives)
  const now = Date.now();
  if (S.paperRealGlobalPauseUntil && now < S.paperRealGlobalPauseUntil) return;

  // 3. Kill switch sur cette paire ?
  const ks = (S.paperRealKillSwitch && S.paperRealKillSwitch[pair]) || null;
  if (ks && ks.paused) return;

  // 4. Cooldown ADAPTATIF après dernière perte sur cette paire (Phase 1.2)
  const cfg = S.paperRealConfig || {};
  let cooldownMs;
  if (typeof _getAdaptiveCooldownMs === 'function') {
    cooldownMs = _getAdaptiveCooldownMs();
  } else {
    cooldownMs = cfg.cooldownMs || 30 * 60 * 1000;
  }
  const lastClose = (S.paperRealLastClose || {})[pair] || 0;
  if (lastClose > 0 && (now - lastClose) < cooldownMs) return;

  // 5. Bougies disponibles ?
  const tf = S.paperRealTimeframe || '15m';
  const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf]) || [];
  if (arr.length < 30) return;

  // 6. Détection bougie fermée
  if (arr.length < 2) return;
  const closedTs = arr[arr.length - 2].ts;
  const lastSeenTs = (S.realPairCycle && S.realPairCycle[pair]) || 0;
  if (closedTs <= lastSeenTs) return;
  if (!S.realPairCycle) S.realPairCycle = {};
  S.realPairCycle[pair] = closedTs;

  // 7. Fraîcheur des données (tolérance 2 min minimum)
  const tfMs = { '5m':300000, '15m':900000, '1h':3600000, '4h':14400000, '1j':86400000 }[tf] || 900000;
  const dataAge = now - arr[arr.length - 1].ts;
  const stalenessThreshold = Math.max(tfMs * 2.5, 120000);
  if (dataAge > stalenessThreshold) {
    // v118 FIX · Données obsolètes → fetch REST au lieu de pauser définitivement
    if (typeof _fetchAndBootstrapRealCandles === 'function') {
      _fetchAndBootstrapRealCandles(pair, tf);
    }
    return;  // Attendre les données fraîches — pas de kill switch
  }

  // 8. Volatilité bougie courante : refus si > maxRecentMovePct
  const lastCandle = arr[arr.length - 1];
  if (lastCandle && isFinite(lastCandle.o) && lastCandle.o > 0) {
    const movePct = Math.abs(lastCandle.c - lastCandle.o) / lastCandle.o * 100;
    const maxMove = cfg.maxRecentMovePct || 3.0;
    if (movePct > maxMove) return;
  }

  // 9. Limite de positions ouvertes simultanées
  const maxConcurrent = cfg.maxConcurrentPos || 1;
  const openPositions = (S.openPositions || []).filter(p => p.auto === true);
  if (openPositions.length >= maxConcurrent) return;

  // v7.12 LIVRAISON 13 · 10. ANTI-DIRECTION-CONTRE-TENDANCE
  // En régime BEAR, refuser les LONG (achats à la hausse contre la tendance)
  // En régime BULL, refuser les SHORT (ventes à la baisse contre la tendance)
  // On laisse passer en CALM/VOLATILE (pas de tendance claire)
  const _regime = (typeof detectMarketRegime === 'function') ? detectMarketRegime() : 'calm';
  // On stocke le régime pour le hook openPosition (qui filtrera selon le côté souhaité)
  S._paperRealCurrentRegime = _regime;

  // Toutes les règles passées : exécuter le cycle bot
  return _resolvePairCycleCore(pair, ps);
}
window._resolvePaperRealCycle = _resolvePaperRealCycle;
if(typeof _resolvePaperRealCycle==='function') window._resolvePaperRealCycle = _resolvePaperRealCycle;

function _saveManConsigne(pair, field, value) {
  if (!S._manConsignes) S._manConsignes = {};
  if (!S._manConsignes[pair]) S._manConsignes[pair] = { maxLossPct: 2.0, timeoutMin: 60 };
  const n = parseFloat(value);
  if (!isNaN(n) && n > 0) {
    S._manConsignes[pair][field] = n;
  }
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
  
  // Haptic feedback si dispo
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(20); } catch(e) {}
  }
}
window._showForceCloseConfirm = _showForceCloseConfirm;
if(typeof _showForceCloseConfirm==='function') window._showForceCloseConfirm = _showForceCloseConfirm;


window._snapshotActionCreate = function() {
  const res = createInternalSnapshot();
  if (res) {
    // v7.12 · UI épurée · snapshot silencieux (mais on refresh la liste visuelle)
    _refreshSnapshotsList();
  } else {
    if (typeof showToast === 'function') showToast('Échec création snapshot', 2500, 'critical');
  }
};
if(typeof _snapshotActionCreate==='function') window._snapshotActionCreate = _snapshotActionCreate;


window._snapshotActionRestore = function(slot) {
  // v7.12 · UI épurée · confirmation intégrée dans la carte (pas de popup native)
  const btn = event && event.target ? event.target : null;
  if (btn && !btn._armedRestore) {
    btn._armedRestore = true;
    const origText = btn.textContent;
    const origBg = btn.style.background;
    btn.textContent = '⚠ TAP ENCORE POUR CONFIRMER';
    btn.style.background = 'rgba(255,61,107,.25)';
    btn.style.borderColor = 'var(--down)';
    btn.style.color = 'var(--down)';
    setTimeout(() => {
      if (btn._armedRestore) {
        btn._armedRestore = false;
        btn.textContent = origText;
        btn.style.background = origBg;
        btn.style.borderColor = 'rgba(0,232,122,.35)';
        btn.style.color = 'var(--up)';
      }
    }, 3000);
    return;
  }
  // Second tap → restore
  if (btn) btn._armedRestore = false;
  const res = restoreInternalSnapshot(slot);
  if (res.ok) {
    const modal = document.getElementById('snapshotsModal');
    if (modal) modal.remove();
  } else {
    if (typeof showToast === 'function') showToast('Restauration échouée · ' + res.reason, 3000, 'critical');
  }
};
if(typeof _snapshotActionRestore==='function') window._snapshotActionRestore = _snapshotActionRestore;

function _takeControl(pair) {
  if (!S._manualPairs) S._manualPairs = {};
  S._manualPairs[pair] = true;
  S.chainLog.push({
    icon: '🎛️',
    desc: `Prise de contrôle manuel · ${pair} · bot désactivé sur cette paire`,
    hash: rndHash(), time: nowStr()
  });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  if (typeof showToast === 'function') {
    showToast('🎛️ Contrôle manuel · ' + pair, 2500);
  }
  // Re-render detail if open
  if (_currentDetailPair === pair) {
    closePairDetail();
    setTimeout(() => openPairDetail(pair), 100);
  }
}
window._takeControl = _takeControl;
if(typeof _takeControl==='function') window._takeControl = _takeControl;

function _updateBotPauseBadge(isOffline) {
  let badge = document.getElementById('botPauseBadge');
  if (!badge) {
    // Créer le badge s'il n'existe pas - l'insérer juste avant le Transfert bouton
    // Mais plus simple : le faire en position fixe en haut du dashboard
    const portTotal = document.getElementById('qPortfolio') 
                    || document.querySelector('[id^="qPortfolio"]')
                    || document.querySelector('.portfolio-total');
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
  // ═══ v7.12 · 3 points colorés (vert/orange/rouge) avant le badge LIVE ═══
  // Seul le point actif est allumé, les autres restent sombres (état éteint)
  const green  = document.getElementById('netDotGreen');
  const orange = document.getElementById('netDotOrange');
  const red    = document.getElementById('netDotRed');
  if (!green || !orange || !red) return;
  
  // Calcul de l'état : online / instable (1-5s) / offline (>5s)
  const elapsed = Date.now() - _lastRealPriceTs;
  let effectiveState = _netwatchState;
  if (_netwatchState === 'offline' && elapsed < _getNetwatchThreshold() * 2) {
    effectiveState = 'unstable';
  }
  
  // Couleurs sombres (éteint)
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
  
  // v7.12 · Badge "⏸ BOT EN PAUSE" sous le portefeuille (uniquement si vraiment offline)
  _updateBotPauseBadge(effectiveState === 'offline');
}
if(typeof _updateNetIndicator==='function') window._updateNetIndicator = _updateNetIndicator;

function _updateSplitPct(val) {
  const n = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
  S.profitSplitCaissePct = n;
  const valEl = document.getElementById('splitVal');
  const cEl = document.getElementById('splitCaissePreview');
  const tEl = document.getElementById('splitTradingPreview');
  if (valEl) valEl.textContent = n + '%';
  if (cEl) cEl.textContent = n + '%';
  if (tEl) tEl.textContent = (100 - n) + '%';
}
window._updateSplitPct = _updateSplitPct;
if(typeof _updateSplitPct==='function') window._updateSplitPct = _updateSplitPct;

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
    t.time || '',
    t.pair  || '',
    t.side  || '',
    (t.stakeUsdt    || 0).toFixed(2),
    (t.amount       || 0),
    (t.entryPrice   || t.price || 0).toFixed ? (t.entryPrice||t.price||0).toFixed(4) : '',
    (t.exitPrice    || 0).toFixed ? (t.exitPrice||0).toFixed(4) : '',
    (t.pnlUsd       || 0).toFixed(2),
    (t.pnl          || 0).toFixed(3),
    (t.tradingFee   || 0).toFixed(4),
    (t.slipFee      || 0).toFixed(4),
    (t.fundingFee   || 0).toFixed(4),
    (t.totalFee     || 0).toFixed(4),
    (t.taxBase      || 0).toFixed(4),
    (t.taxAmount    || 0).toFixed(4),
    (t.pnlNet       || 0).toFixed(2),
    t.region || S.taxConfig.region,
    reg ? reg.method : '',
    (t.cycle || S.cycle)
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

function createInternalSnapshot() {
  if (typeof buildSnapshot !== 'function') return null;
  // v7.12 · Q2:A · pulsation visuelle douce
  try { if (typeof _pulseSettingsBtn === 'function') _pulseSettingsBtn(); } catch(e) {}
  let snap;
  try { snap = buildSnapshot(); } catch(e) { return null; }
  if (!snap) return null;
  
  // Rotation : écraser le plus ancien
  // On lit les timestamps pour trouver le plus ancien
  let oldestIdx = 0;
  let oldestTs = Infinity;
  for (let i = 0; i < _SNAP_INTERNAL_KEYS.length; i++) {
    const existing = localStorage.getItem(_SNAP_INTERNAL_KEYS[i]);
    if (!existing) { oldestIdx = i; break; }
    try {
      const obj = JSON.parse(existing);
      if ((obj._snapTs || 0) < oldestTs) {
        oldestTs = obj._snapTs || 0;
        oldestIdx = i;
      }
    } catch(e) {
      oldestIdx = i;
      break;
    }
  }
  
  snap._snapTs = Date.now();
  snap._snapLabel = new Date().toLocaleString('fr-BE', {
    day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
  });
  snap._snapPortfolio = S.portfolio || 0;
  snap._snapTrades = S.totalTrades || 0;
  
  try {
    localStorage.setItem(_SNAP_INTERNAL_KEYS[oldestIdx], JSON.stringify(snap));
    return { slot: oldestIdx, label: snap._snapLabel };
  } catch(e) {
    console.warn('[snapshot] localStorage full:', e);
    return null;
  }
}
if(typeof createInternalSnapshot==='function') window.createInternalSnapshot = createInternalSnapshot;

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
  
  // ═══ v7.12 · PRIORITÉ 1 · PROTECTION 1 — Capital initial snapshot ═══
  // Mémorise le capital au moment de l'activation pour détecter −5% drop
  const initCap = (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.fiscalReserveAccount || 0);
  S._fpInitialCapital = initCap;
  S._fpStopTriggered = false;
  
  let count = 0;
  S.agents.forEach(a => {
    a.conf = 0.99;                                      // confiance max
    a.fitness = 2000;                                   // fitness max
    a.streak = Math.max(a.streak || 0, 3);              // streak positive
    a.errors = 0;                                       // reset erreurs
    a.corrections = Math.max(a.corrections || 0, 5);    // corrections +
    count++;
  });
  S.botAutoMode = true;                                 // auto ON
  S.fullPowerMode = true;                               // flag
  S.fullPowerSince = Date.now();
  
  // Feedback visuel
  try {
    if (typeof renderHome === 'function') renderHome();
    if (typeof updateStreakBadge === 'function') updateStreakBadge();
    if (typeof renderAgentsSection === 'function') renderAgentsSection();
  } catch(e) {}
  
  // Toast
  if (typeof showToast === 'function') {
    showToast('⚡ PLEIN RÉGIME · ' + count + ' agents/bots @ 100%', 'up');
  } else {
    console.log('[PLEIN RÉGIME] ' + count + ' agents/bots activés à 100%');
  }
  return count;
}
window.enableFullPowerMode = enableFullPowerMode;
if(typeof enableFullPowerMode==='function') window.enableFullPowerMode = enableFullPowerMode;

function listInternalSnapshots() {
  const snaps = [];
  for (let i = 0; i < _SNAP_INTERNAL_KEYS.length; i++) {
    const raw = localStorage.getItem(_SNAP_INTERNAL_KEYS[i]);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      snaps.push({
        slot: i,
        ts: obj._snapTs || 0,
        label: obj._snapLabel || '—',
        portfolio: obj._snapPortfolio || 0,
        trades: obj._snapTrades || 0
      });
    } catch(e) {}
  }
  snaps.sort((a, b) => b.ts - a.ts);  // plus récents en premier
  return snaps;
}
if(typeof listInternalSnapshots==='function') window.listInternalSnapshots = listInternalSnapshots;

async function loadAllTrades() {
  try {
    const db = await openDB();
    return new Promise((res) => {
      const req = db.transaction(STORE_TRADES, 'readonly')
                    .objectStore(STORE_TRADES).getAll();
      req.onsuccess = e => res(e.target.result || []);
      req.onerror   = () => res([]);
    });
  } catch(e) { return []; }
}
if(typeof loadAllTrades==='function') window.loadAllTrades = loadAllTrades;

function openDB() {
  return new Promise((res, rej) => {
    if(_db) { res(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE_TRADES)) {
        const ts = db.createObjectStore(STORE_TRADES, { keyPath:'id', autoIncrement:true });
        ts.createIndex('pair',   'pair',   { unique:false });
        ts.createIndex('time',   'time',   { unique:false });
        ts.createIndex('region', 'region', { unique:false });
      }
      if(!db.objectStoreNames.contains(STORE_FEES)) {
        db.createObjectStore(STORE_FEES, { keyPath:'id', autoIncrement:true });
      }
      if(!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath:'key' });
      }
    };
    req.onsuccess = e => { _db = e.target.result; res(_db); };
    req.onerror   = e => { console.warn('IndexedDB error', e); rej(e); };
  });
}
if(typeof openDB==='function') window.openDB = openDB;

function openManDetail(pair) {
  const overlay = document.getElementById('pairDetailOverlay');
  const title = document.getElementById('pairDetailTitle');
  const body = document.getElementById('pairDetailBody');
  if (!overlay || !title || !body) return;
  
  _currentDetailPair = pair;
  const cfg = PAIRS[pair];
  const ps = S.pairStates[pair];
  if (!cfg || !ps) return;
  
  // Compute bot suggestion snapshot
  const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
  const pct = prob * 100;
  const conviction = Math.abs(prob - 0.5) * 2;
  let suggSide = prob >= 0.5 ? 'long' : 'short';
  const atr = ps.atr || 0.01;
  const atrRel = atr > 0 ? (atr / ps.price) : 0.015;
  
  // Pre-filled values based on volatility + conviction
  const suggStake = Math.max(10, Math.round((S.tradingAccount || 100) * (0.05 + conviction * 0.05)));
  const suggLev = conviction > 0.5 ? Math.min(3, Math.max(1, Math.round(conviction * 3))) : 1;
  const tpDist = Math.max(0.8, atrRel * 100 * 2);  // 2× ATR in %
  const slDist = Math.max(0.5, atrRel * 100 * 1.5); // 1.5× ATR in %
  const tpPrice = suggSide === 'long' ? ps.price * (1 + tpDist/100) : ps.price * (1 - tpDist/100);
  const slPrice = suggSide === 'long' ? ps.price * (1 - slDist/100) : ps.price * (1 + slDist/100);
  const suggMaxLoss = 2.0;  // 2% du capital
  const suggTimeout = 60;   // 60 min
  
  // Get or init per-pair consignes
  if (!S._manConsignes) S._manConsignes = {};
  if (!S._manConsignes[pair]) {
    S._manConsignes[pair] = {
      maxLossPct: suggMaxLoss,
      timeoutMin: suggTimeout,
    };
  }
  const cons = S._manConsignes[pair];
  
  // Position active?
  const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
  
  // Title
  const pnl24 = ps.pnl24h || 0;
  const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
  title.innerHTML = `
    <span style="color:${cfg.color};font-size:15px;">${pair}</span>
    <span style="font-family:var(--font-mono);font-size:10px;color:var(--ice);background:rgba(56,212,245,0.1);padding:2px 6px;border-radius:4px;margin-left:6px;">MAN</span>
    <span style="font-family:var(--font-mono);font-size:11px;color:var(--t2);margin-left:6px;">${cfg.dec >= 4 ? ps.price.toFixed(cfg.dec) : '$' + Math.floor(ps.price).toLocaleString()}</span>
    <span style="font-family:var(--font-mono);font-size:10px;color:${pnl24Col};margin-left:6px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>
  `;
  
  body.innerHTML = '';
  
  // ═══ SECTION 1: SUGGESTION BOT (si pas de position) ou STATUS (si position) ═══
  const headSection = document.createElement('div');
  headSection.className = 'detail-section';
  
  if (manualPos) {
    // Active position
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
      </div>
    `;
  } else {
    // Suggestion
    const sideLabel = suggSide === 'long' ? '↑ LONG' : '↓ SHORT';
    const sideCol = suggSide === 'long' ? 'var(--up)' : 'var(--down)';
    headSection.innerHTML = `
      <div class="detail-section-title">🤖 Suggestion bot en temps réel</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:11px;">
        <div><span style="color:var(--t3);">Direction</span><br><span style="color:${sideCol};font-weight:800;font-size:13px;">${sideLabel}</span></div>
        <div><span style="color:var(--t3);">Conviction LMSR</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${pct.toFixed(0)}%</span></div>
        <div><span style="color:var(--t3);">ATR (volatilité)</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${(atrRel*100).toFixed(2)}%</span></div>
        <div><span style="color:var(--t3);">Force signal</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${(conviction*100).toFixed(0)}%</span></div>
      </div>
    `;
  }
  body.appendChild(headSection);
  
  // ═══ SECTION 2: PARAMETRES ÉDITABLES (pré-remplis) ═══
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
      </div>
    `;
    body.appendChild(paramsSection);
  }
  
  // ═══ SECTION 3: CONSIGNES GARDE-FOU (bot ferme si dépasse) ═══
  const consignesSection = document.createElement('div');
  consignesSection.className = 'detail-section';
  consignesSection.innerHTML = `
    <div class="detail-section-title">🛡️ Consignes garde-fou (bot ferme si dépassé)</div>
    <div style="font-size:10px;color:var(--t3);margin-bottom:8px;line-height:1.4;">
      Le bot respecte ton ouverture mais ferme automatiquement si ces seuils sont franchis.
    </div>
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
    <div style="margin-top:6px;font-size:9px;color:var(--t3);">
      ℹ️ Le bot fermera aussi si TP ou SL sont atteints.
    </div>
  `;
  body.appendChild(consignesSection);
  
  // ═══ SECTION 4: BOUTONS ACTION ═══
  const actionsSection = document.createElement('div');
  actionsSection.style.cssText = 'margin:12px 0;display:flex;gap:8px;';
  
  if (manualPos) {
    // Active: show force close button
    actionsSection.innerHTML = `
      <button class="force-close-btn" style="flex:1;" onclick="_showForceCloseConfirm('${pair}')">✕ Fermer ${manualPos.side === 'long' ? 'LONG' : 'SHORT'} ${pair}</button>
    `;
  } else {
    // Idle: LONG / SHORT buttons
    actionsSection.innerHTML = `
      <button style="flex:1;background:rgba(0,232,122,0.12);color:var(--up);border:1px solid rgba(0,232,122,0.4);padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;" onclick="_openManTrade('${pair}','long')">↑ LONG</button>
      <button style="flex:1;background:rgba(255,61,107,0.12);color:var(--down);border:1px solid rgba(255,61,107,0.4);padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;" onclick="_openManTrade('${pair}','short')">↓ SHORT</button>
    `;
  }
  body.appendChild(actionsSection);
  
  // ═══ SECTION 5: STATS (réutilise l'existant) ═══
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
    </div>
  `;
  body.appendChild(statsSection);
  
  // Accent
  const panel = overlay.querySelector('.pair-detail-panel');
  if (panel) {
    panel.classList.add('enriched');
    panel.style.setProperty('--accent', 'rgba(56,212,245,0.4)');
  }
  
  overlay.classList.add('open');
}
window.openManDetail = openManDetail;
if(typeof openManDetail==='function') window.openManDetail = openManDetail;

function openPairDetail(pair) {
  if (typeof showPairDetail === 'function') {
    return showPairDetail(pair);
  }
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
    
    // Active position takes precedence
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
          <div class="ab-head">
            <span class="ab-sym">${cfg.sym}</span>
            <span class="ab-dot"></span>
          </div>
          <div class="ab-price" id="ab_px_${pairKey}">—</div>
        </div>
        <div>
          <div class="ab-signal" id="ab_sig_${pairKey}">—</div>
          <div class="ab-sub" id="ab_sub_${pairKey}">—</div>
        </div>
      `;
      grid.appendChild(brick);
    }
    
    // State class
    brick.className = 'action-brick sig-' + signal;
    
    // Price
    const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : ('$' + Math.floor(ps.price).toLocaleString());
    const p24 = ps.pnl24h || 0;
    const p24Col = p24 >= 0 ? 'var(--up)' : 'var(--down)';
    const pxEl = document.getElementById('ab_px_' + pairKey);
    if (pxEl) pxEl.innerHTML = `${priceStr} <span style="color:${p24Col};margin-left:3px;">${p24 >= 0 ? '+' : ''}${p24.toFixed(2)}%</span>`;
    
    // Signal
    const sigEl = document.getElementById('ab_sig_' + pairKey);
    if (sigEl) {
      const prefix = activePos ? (manualPos ? '🔒 ' : '') : '🤖 ';
      sigEl.textContent = prefix + label;
    }
    
    // Sub-line: show conviction % or position stake
    const subEl = document.getElementById('ab_sub_' + pairKey);
    if (subEl) {
      if (activePos) {
        subEl.textContent = '$' + (activePos.stakeUsdt || 0).toFixed(0);
      } else {
        subEl.textContent = pct.toFixed(0) + '% LMSR';
      }
    }
  });
}
window.renderActionBricks = renderActionBricks;
if(typeof renderActionBricks==='function') window.renderActionBricks = renderActionBricks;

function restoreInternalSnapshot(slot) {
  const raw = localStorage.getItem(_SNAP_INTERNAL_KEYS[slot]);
  if (!raw) return { ok:false, reason:'not_found' };
  try {
    const snap = JSON.parse(raw);
    if (typeof loadState === 'function') {
      loadState(snap);
      if (typeof showToast === 'function') {
        showToast('↩ Snapshot restauré · ' + (snap._snapLabel || '—'), 3000, 'user');
      }
      S.chainLog.push({
        icon: '↩',
        desc: `Snapshot restauré · slot ${slot+1} · ${snap._snapLabel || '—'} · portefeuille ${(snap._snapPortfolio||0).toFixed(0)}€`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      return { ok:true, label: snap._snapLabel };
    }
  } catch(e) {
    return { ok:false, reason:'parse_error', error: e.message };
  }
  return { ok:false, reason:'no_loadState' };
}
if(typeof restoreInternalSnapshot==='function') window.restoreInternalSnapshot = restoreInternalSnapshot;

async function saveTrade(tradeRecord) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TRADES, 'readwrite');
    tx.objectStore(STORE_TRADES).add({
      ...tradeRecord,
      savedAt: new Date().toISOString(),
      region:  S.taxConfig.region
    });
  } catch(e) { /* Silencieux */ }
}
if(typeof saveTrade==='function') window.saveTrade = saveTrade;

function scheduleAutoSave() {
  // Toutes les 30s en arrière-plan
  _autoSaveInterval = setInterval(() => {
    if(typeof S !== 'undefined' && !window._resetInProgress) saveState(true);  // v7.5 · skip si reset en cours
  }, 30000);

  // Quand l'onglet perd le focus (visibilité)
  document.addEventListener('visibilitychange', () => {
    if(window._resetInProgress) return;  // v7.5 · skip pendant reset
    if(document.hidden) {
      saveState(true);  // sauvegarde silencieuse
      // Le bot continue en arrière-plan si _simRunning
    } else {
      // Retour au premier plan — rafraîchir l'affichage
      if(typeof renderAll === 'function') renderAll();
      updateSimBtn();
    }
  });

  // Avant fermeture de l'onglet/fenêtre
  window.addEventListener('beforeunload', () => {
    if(window._resetInProgress) return;  // v7.5 · skip pendant reset
    saveState(true);
  });

  // iOS Safari (pagehide est plus fiable que beforeunload)
  window.addEventListener('pagehide', () => {
    if(window._resetInProgress) return;  // v7.5 · skip pendant reset
    saveState(true);
  });
}
if(typeof scheduleAutoSave==='function') window.scheduleAutoSave = scheduleAutoSave;

function sendNotification() { /* désactivé · Q3 */ }
if(typeof sendNotification==='function') window.sendNotification = sendNotification;

function startSim() {
  if(_simRunning) return;
  _simRunning = true;
  _simEverStarted = true;  // v7.1 P7: marquage 1er démarrage (UI passe de DÉMARRAGE → PAUSE)
  _simInterval = setInterval(simTick, 250);  // v112 PERFORMANCE · tick 250ms (était 100ms - réduit CPU sur tablette)
  updateSimBtn();
  
  _requestWakeLock().then(ok => {
    if (ok) {
      S.chainLog.push({ icon:'🔆', desc:'Wake Lock actif · écran restera allumé', hash:rndHash(), time:nowStr() });
    }
  });
  showToast('▶ Mode Auto-apprentissage démarré', 2800, 'user');
  S.chainLog.push({ icon:'▶', desc:'Auto-apprentissage démarré · cycle #'+S.cycle, hash:rndHash(), time:nowStr() });
}
if(typeof startSim==='function') window.startSim = startSim;

function updateSaveIndicator(state) {
  const el = document.getElementById('saveIndicator');
  if(!el) return;
  const states = {
    saving: { txt:'💾 Sauvegarde…', col:'var(--ice)' },
    saved:  { txt:'✓ Sauvegardé',   col:'var(--up)' },
    error:  { txt:'⚠ Erreur save',  col:'var(--down)' }
  };
  const s = states[state] || states.saved;
  el.textContent  = s.txt;
  el.style.color  = s.col;
  el.style.opacity = '1';
  if(state === 'saved') {
    setTimeout(() => { if(el) el.style.opacity = '0'; }, 2500);
  }
}
if(typeof updateSaveIndicator==='function') window.updateSaveIndicator = updateSaveIndicator;

function updateSimBtn() {
  const btn   = document.getElementById('simToggleBtn');
  const label = document.getElementById('liveLabel');
  const dot   = document.querySelector('.live-dot');
  if(btn) {
    if(_simRunning) {
      btn.textContent       = '⏸';
      btn.style.background  = 'rgba(0,232,122,.10)';
      btn.style.borderColor = 'rgba(0,232,122,.35)';
      btn.style.color       = 'var(--up)';
      btn.title             = 'Pause';
    } else {
      btn.textContent       = '▶';
      btn.style.background  = 'rgba(245,200,66,.10)';
      btn.style.borderColor = 'rgba(245,200,66,.35)';
      btn.style.color       = 'var(--gold)';
      // v7.1 P7: titre différent avant 1er démarrage
      btn.title             = _simEverStarted ? 'Reprendre' : 'Démarrer';
    }
  }
  if(label) {
    // v7.1 P7: label "DÉMARRAGE" tant que jamais démarré, puis "PAUSE" après usage
    label.textContent = _simRunning ? 'LIVE' : (_simEverStarted ? 'PAUSE' : 'DÉMARRAGE');
    label.style.color = _simRunning ? 'var(--up)' : 'var(--gold)';
  }
  if(dot) {
    dot.style.animationPlayState = _simRunning ? 'running' : 'paused';
    dot.style.background = _simRunning ? 'var(--up)' : 'var(--gold)';
  }
}
if(typeof updateSimBtn==='function') window.updateSimBtn = updateSimBtn;

// ════════════════════════════════════════════════════════════════════════
// FIN BLOC RESTAURATION v94
// ════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════

// AURA8 v94 · FIN BLOC RESTAURATION COMPLÉMENTAIRE
// ════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
// AURA8 v93 · BLOC EXPORTS DÉPLACÉ DEPUIS SCRIPT #0
// (les 499 typeof exports échouaient en v92 car exécutés trop tôt)
// Maintenant à la fin du Script #1 → toutes les fonctions sont définies
// ════════════════════════════════════════════════════════════════════════

if(typeof runManualBackup==='function') window.runManualBackup=runManualBackup;
if(typeof restoreSlot==='function') window.restoreSlot=restoreSlot;
if(typeof downloadSlot==='function') window.downloadSlot=downloadSlot;
if(typeof toggleAutoBackup==='function') window.toggleAutoBackup=toggleAutoBackup;
if(typeof setAbHour==='function') window.setAbHour=setAbHour;
if(typeof renderAutoBackupSection==='function') window.renderAutoBackupSection=renderAutoBackupSection;
if(typeof _abExecute==='function') window._abExecute=_abExecute;
if(typeof _abCheck==='function') window._abCheck=_abCheck;
if(typeof _abInit==='function') window._abInit=_abInit;

// v70 AUTO-EXPOSE COMPLET
if(typeof ACFG==='function') window.ACFG=ACFG;
if(typeof AP==='function') window.AP=AP;
if(typeof _adjProp==='function') window._adjProp=_adjProp;
if(typeof _adjPropPct==='function') window._adjPropPct=_adjPropPct;
if(typeof _analyzeWeek==='function') window._analyzeWeek=_analyzeWeek;
if(typeof _apiPublishToStorage==='function') window._apiPublishToStorage=_apiPublishToStorage;
if(typeof _apiResponse==='function') window._apiResponse=_apiResponse;
if(typeof _applyThresholdFromEvent==='function') window._applyThresholdFromEvent=_applyThresholdFromEvent;
if(typeof _avComputeRank==='function') window._avComputeRank=_avComputeRank;
if(typeof _avGet==='function') window._avGet=_avGet;
if(typeof _avUpdateHeader==='function') window._avUpdateHeader=_avUpdateHeader;
if(typeof _buildFullBackup==='function') window._buildFullBackup=_buildFullBackup;
if(typeof _buildReplayEvents==='function') window._buildReplayEvents=_buildReplayEvents;
if(typeof _buildReportHTML==='function') window._buildReportHTML=_buildReportHTML;
if(typeof _buildWidgetHTML==='function') window._buildWidgetHTML=_buildWidgetHTML;
if(typeof _candleStartTs==='function') window._candleStartTs=_candleStartTs;
if(typeof _checkAutoBackup==='function') window._checkAutoBackup=_checkAutoBackup;
if(typeof _checkAutoTheme==='function') window._checkAutoTheme=_checkAutoTheme;
if(typeof _citContextual==='function') window._citContextual=_citContextual;
if(typeof _citOfDay==='function') window._citOfDay=_citOfDay;
if(typeof _closes==='function') window._closes=_closes;
if(typeof _computeBB==='function') window._computeBB=_computeBB;
if(typeof _computeCorrelationMatrix==='function') window._computeCorrelationMatrix=_computeCorrelationMatrix;
if(typeof _computeEMA==='function') window._computeEMA=_computeEMA;
if(typeof _computeMACD==='function') window._computeMACD=_computeMACD;
if(typeof _computeNewsScore==='function') window._computeNewsScore=_computeNewsScore;
if(typeof _computeRSI==='function') window._computeRSI=_computeRSI;
if(typeof _computeSMA==='function') window._computeSMA=_computeSMA;
if(typeof _correlColor==='function') window._correlColor=_correlColor;
if(typeof _countBackupChanges==='function') window._countBackupChanges=_countBackupChanges;
if(typeof _csvSheet==='function') window._csvSheet=_csvSheet;
if(typeof _csvToXmlSheet==='function') window._csvToXmlSheet=_csvToXmlSheet;
if(typeof _deleteBackup==='function') window._deleteBackup=_deleteBackup;
if(typeof _detectPatterns==='function') window._detectPatterns=_detectPatterns;
if(typeof _downloadCSV==='function') window._downloadCSV=_downloadCSV;
if(typeof _dpGetSettings==='function') window._dpGetSettings=_dpGetSettings;
if(typeof _drawActionMiniChartsInner==='function') window._drawActionMiniChartsInner=_drawActionMiniChartsInner;
if(typeof _executeAccountReset==='function') window._executeAccountReset=_executeAccountReset;
if(typeof _fallbackCopyScript==='function') window._fallbackCopyScript=_fallbackCopyScript;
if(typeof _fetchCryptoNews==='function') window._fetchCryptoNews=_fetchCryptoNews;
if(typeof _fetchFearGreed==='function') window._fetchFearGreed=_fetchFearGreed;
if(typeof _fetchGlobal==='function') window._fetchGlobal=_fetchGlobal;
if(typeof _fetchTrending==='function') window._fetchTrending=_fetchTrending;
if(typeof _fmCalcStats==='function') window._fmCalcStats=_fmCalcStats;
if(typeof _fmInit==='function') window._fmInit=_fmInit;
if(typeof _fmtCountdown==='function') window._fmtCountdown=_fmtCountdown;
if(typeof _fmtTpSlPrice==='function') window._fmtTpSlPrice=_fmtTpSlPrice;
if(typeof _fxAnalyze==='function') window._fxAnalyze=_fxAnalyze;
if(typeof _fxIppCalc==='function') window._fxIppCalc=_fxIppCalc;
if(typeof _generateAppsScript==='function') window._generateAppsScript=_generateAppsScript;
if(typeof _getGoals==='function') window._getGoals=_getGoals;
if(typeof _getIndicators==='function') window._getIndicators=_getIndicators;
if(typeof _getPairAdaptiveProfile==='function') window._getPairAdaptiveProfile=_getPairAdaptiveProfile;
if(typeof _getRecurringEvents==='function') window._getRecurringEvents=_getRecurringEvents;
if(typeof _getWeekTrades==='function') window._getWeekTrades=_getWeekTrades;
if(typeof _groupByDay==='function') window._groupByDay=_groupByDay;
if(typeof _highs==='function') window._highs=_highs;
if(typeof _initAlerts==='function') window._initAlerts=_initAlerts;
if(typeof _initApiChannel==='function') window._initApiChannel=_initApiChannel;
if(typeof _initNotifConfig==='function') window._initNotifConfig=_initNotifConfig;
if(typeof _initPipDrag==='function') window._initPipDrag=_initPipDrag;
if(typeof _initTwin==='function') window._initTwin=_initTwin;
if(typeof _initVeilleOnPageChange==='function') window._initVeilleOnPageChange=_initVeilleOnPageChange;
if(typeof _lemniscatePoint==='function') window._lemniscatePoint=_lemniscatePoint;
if(typeof _loadAllBackups==='function') window._loadAllBackups=_loadAllBackups;
if(typeof _lows==='function') window._lows=_lows;
if(typeof _lpTick==='function') window._lpTick=_lpTick;
if(typeof _makePosBtn==='function') window._makePosBtn=_makePosBtn;
if(typeof _maybeShowQuote==='function') window._maybeShowQuote=_maybeShowQuote;
if(typeof _mcLoadSlots==='function') window._mcLoadSlots=_mcLoadSlots;
if(typeof _mcSaveCurrent==='function') window._mcSaveCurrent=_mcSaveCurrent;
if(typeof _mcSaveSlots==='function') window._mcSaveSlots=_mcSaveSlots;
if(typeof _mean==='function') window._mean=_mean;
if(typeof _mlBollinger==='function') window._mlBollinger=_mlBollinger;
if(typeof _mlLinearRegression==='function') window._mlLinearRegression=_mlLinearRegression;
if(typeof _mlMacd==='function') window._mlMacd=_mlMacd;
if(typeof _mlRsiMomentum==='function') window._mlRsiMomentum=_mlRsiMomentum;
if(typeof _netPnl==='function') window._netPnl=_netPnl;
if(typeof _nextStep==='function') window._nextStep=_nextStep;
if(typeof _nightTrades==='function') window._nightTrades=_nightTrades;
if(typeof _nlpScore==='function') window._nlpScore=_nlpScore;
if(typeof _nsScore==='function') window._nsScore=_nsScore;
if(typeof _onThrDragEnd==='function') window._onThrDragEnd=_onThrDragEnd;
if(typeof _onThrDragMove==='function') window._onThrDragMove=_onThrDragMove;
if(typeof _openBackupDB==='function') window._openBackupDB=_openBackupDB;
if(typeof _openBgWs==='function') window._openBgWs=_openBgWs;
if(typeof _openProposedPosition==='function') window._openProposedPosition=_openProposedPosition;
if(typeof _parseCsvRow==='function') window._parseCsvRow=_parseCsvRow;
if(typeof _pearson==='function') window._pearson=_pearson;
if(typeof _perfectDay==='function') window._perfectDay=_perfectDay;
if(typeof _pipShowBtn==='function') window._pipShowBtn=_pipShowBtn;
if(typeof _prFireAlert==='function') window._prFireAlert=_prFireAlert;
if(typeof _prGetId==='function') window._prGetId=_prGetId;
if(typeof _priceWatchdog==='function') window._priceWatchdog=_priceWatchdog;
if(typeof _project3D==='function') window._project3D=_project3D;
if(typeof _ptMiniChart==='function') window._ptMiniChart=_ptMiniChart;
if(typeof _ptPrices==='function') window._ptPrices=_ptPrices;
if(typeof _rcAnimateLive==='function') window._rcAnimateLive=_rcAnimateLive;
if(typeof _rcScheduleReconnect==='function') window._rcScheduleReconnect=_rcScheduleReconnect;
if(typeof _rcUpdateWsBadge==='function') window._rcUpdateWsBadge=_rcUpdateWsBadge;
if(typeof _recalcProposal==='function') window._recalcProposal=_recalcProposal;
if(typeof _releaseWakeLock==='function') window._releaseWakeLock=_releaseWakeLock;
if(typeof _renderDominance==='function') window._renderDominance=_renderDominance;
if(typeof _renderFearGreed==='function') window._renderFearGreed=_renderFearGreed;
if(typeof _renderNews==='function') window._renderNews=_renderNews;
if(typeof _renderRealCandles==='function') window._renderRealCandles=_renderRealCandles;
if(typeof _renderSentiment==='function') window._renderSentiment=_renderSentiment;
if(typeof _renderTrending==='function') window._renderTrending=_renderTrending;
if(typeof _requestWakeLock==='function') window._requestWakeLock=_requestWakeLock;
if(typeof _runStressTest==='function') window._runStressTest=_runStressTest;
if(typeof _saveBackupToDB==='function') window._saveBackupToDB=_saveBackupToDB;
if(typeof _scheduleBgRetry==='function') window._scheduleBgRetry=_scheduleBgRetry;
if(typeof _scheduleBgRetryFor==='function') window._scheduleBgRetryFor=_scheduleBgRetryFor;
if(typeof _setBot==='function') window._setBot=_setBot;
if(typeof _setLiveIndicator==='function') window._setLiveIndicator=_setLiveIndicator;
if(typeof _showBadgeToast==='function') window._showBadgeToast=_showBadgeToast;
if(typeof _showCitToast==='function') window._showCitToast=_showCitToast;
if(typeof _showReplayEvent==='function') window._showReplayEvent=_showReplayEvent;
if(typeof _showToast_orig==='function') window._showToast_orig=_showToast_orig;
if(typeof _simulateWhatIf==='function') window._simulateWhatIf=_simulateWhatIf;
if(typeof _simulationTickAll==='function') window._simulationTickAll=_simulationTickAll;
if(typeof _spRemainingFactor==='function') window._spRemainingFactor=_spRemainingFactor;
if(typeof _spawnBrainParticle==='function') window._spawnBrainParticle=_spawnBrainParticle;
if(typeof _startHold==='function') window._startHold=_startHold;
if(typeof _stopHold==='function') window._stopHold=_stopHold;
if(typeof _toCSV==='function') window._toCSV=_toCSV;
if(typeof _tp==='function') window._tp=_tp;
if(typeof _trackWsConnect==='function') window._trackWsConnect=_trackWsConnect;
if(typeof _trackWsDisconnect==='function') window._trackWsDisconnect=_trackWsDisconnect;
if(typeof _updateAod==='function') window._updateAod=_updateAod;
if(typeof _updateAodClock==='function') window._updateAodClock=_updateAodClock;
if(typeof _updateCloseAllBadge==='function') window._updateCloseAllBadge=_updateCloseAllBadge;
if(typeof _updatePip==='function') window._updatePip=_updatePip;
if(typeof _updateReplayUI==='function') window._updateReplayUI=_updateReplayUI;
if(typeof _updateWakeLockButton==='function') window._updateWakeLockButton=_updateWakeLockButton;
if(typeof _updateZen==='function') window._updateZen=_updateZen;
if(typeof _urgAppendLog==='function') window._urgAppendLog=_urgAppendLog;
if(typeof _validateBackupCoherence==='function') window._validateBackupCoherence=_validateBackupCoherence;
if(typeof _wr==='function') window._wr=_wr;
if(typeof _xlCell==='function') window._xlCell=_xlCell;
if(typeof activateDynamicPair==='function') window.activateDynamicPair=activateDynamicPair;
if(typeof animateHeroValue==='function') window.animateHeroValue=animateHeroValue;
if(typeof applyAutoLeverageBorrow==='function') window.applyAutoLeverageBorrow=applyAutoLeverageBorrow;
if(typeof applyBotSuggestion==='function') window.applyBotSuggestion=applyBotSuggestion;
if(typeof applyFundingFees==='function') window.applyFundingFees=applyFundingFees;
if(typeof applyLeverageBorrowFees==='function') window.applyLeverageBorrowFees=applyLeverageBorrowFees;
if(typeof applyPosEdit==='function') window.applyPosEdit=applyPosEdit;
if(typeof blendRealPrices==='function') window.blendRealPrices=blendRealPrices;
if(typeof borrowLeverage==='function') window.borrowLeverage=borrowLeverage;
if(typeof botArb==='function') window.botArb=botArb;
if(typeof botDCA==='function') window.botDCA=botDCA;
if(typeof botExec==='function') window.botExec=botExec;
if(typeof botFiscal==='function') window.botFiscal=botFiscal;
if(typeof botRebalance==='function') window.botRebalance=botRebalance;
if(typeof botRescue==='function') window.botRescue=botRescue;
if(typeof botScalper==='function') window.botScalper=botScalper;
if(typeof botSmartSizer==='function') window.botSmartSizer=botSmartSizer;
if(typeof buildAgentCards==='function') window.buildAgentCards=buildAgentCards;
if(typeof buildExcelData==='function') window.buildExcelData=buildExcelData;
if(typeof buildGovCards==='function') window.buildGovCards=buildGovCards;
if(typeof buildPairPosButtons==='function') window.buildPairPosButtons=buildPairPosButtons;
if(typeof buildThoughtPhrase==='function') window.buildThoughtPhrase=buildThoughtPhrase;
if(typeof bumpVersion==='function') window.bumpVersion=bumpVersion;
if(typeof calcADX==='function') window.calcADX=calcADX;
if(typeof calcBollinger==='function') window.calcBollinger=calcBollinger;
if(typeof calcEMA==='function') window.calcEMA=calcEMA;
if(typeof calcEMASeries==='function') window.calcEMASeries=calcEMASeries;
if(typeof calcFibonacci==='function') window.calcFibonacci=calcFibonacci;
if(typeof calcIchimoku==='function') window.calcIchimoku=calcIchimoku;
if(typeof calcMACD==='function') window.calcMACD=calcMACD;
if(typeof calcRSI==='function') window.calcRSI=calcRSI;
if(typeof calcSMA==='function') window.calcSMA=calcSMA;
if(typeof calcStdDev==='function') window.calcStdDev=calcStdDev;
if(typeof calcStochastic==='function') window.calcStochastic=calcStochastic;
if(typeof calcTaxProvision==='function') window.calcTaxProvision=calcTaxProvision;
if(typeof changeCycleTime==='function') window.changeCycleTime=changeCycleTime;
if(typeof changeLeverage==='function') window.changeLeverage=changeLeverage;
if(typeof changePairCycle==='function') window.changePairCycle=changePairCycle;
if(typeof changePairLev==='function') window.changePairLev=changePairLev;
if(typeof changePairStake==='function') window.changePairStake=changePairStake;
if(typeof checkPairProposalAutoPass==='function') window.checkPairProposalAutoPass=checkPairProposalAutoPass;
if(typeof clearMarginCallLockIfRecovered==='function') window.clearMarginCallLockIfRecovered=clearMarginCallLockIfRecovered;
if(typeof closeDecisionCascade==='function') window.closeDecisionCascade=closeDecisionCascade;
if(typeof closeFiatInjectModal==='function') window.closeFiatInjectModal=closeFiatInjectModal;
if(typeof closeInstallModal==='function') window.closeInstallModal=closeInstallModal;
if(typeof closePairDetail==='function') window.closePairDetail=closePairDetail;
if(typeof closePosEditModal==='function') window.closePosEditModal=closePosEditModal;
if(typeof closePosition==='function') window.closePosition=closePosition;
if(typeof closeTransfer==='function') window.closeTransfer=closeTransfer;
if(typeof computeAdvancedMetrics==='function') window.computeAdvancedMetrics=computeAdvancedMetrics;
if(typeof computePortfolioTotal==='function') window.computePortfolioTotal=computePortfolioTotal;
if(typeof computeTradingHealth==='function') window.computeTradingHealth=computeTradingHealth;
if(typeof computeWhatIfScenarios==='function') window.computeWhatIfScenarios=computeWhatIfScenarios;
if(typeof confirmFiatInject==='function') window.confirmFiatInject=confirmFiatInject;
if(typeof confirmTransfer==='function') window.confirmTransfer=confirmTransfer;
if(typeof councilVote==='function') window.councilVote=councilVote;
if(typeof detectHarmonicResonance==='function') window.detectHarmonicResonance=detectHarmonicResonance;
if(typeof detectLeadLagPatterns==='function') window.detectLeadLagPatterns=detectLeadLagPatterns;
if(typeof detectMarketRegime==='function') window.detectMarketRegime=detectMarketRegime;
if(typeof dismissInstall==='function') window.dismissInstall=dismissInstall;
if(typeof dismissToast==='function') window.dismissToast=dismissToast;
if(typeof drawActionMiniCharts==='function') window.drawActionMiniCharts=drawActionMiniCharts;
if(typeof drawBrainNetwork==='function') window.drawBrainNetwork=drawBrainNetwork;
if(typeof drawMiniCharts==='function') window.drawMiniCharts=drawMiniCharts;
if(typeof drawMobileChart==='function') window.drawMobileChart=drawMobileChart;
if(typeof drawSparkline==='function') window.drawSparkline=drawSparkline;
if(typeof emitLossParticles==='function') window.emitLossParticles=emitLossParticles;
if(typeof emitVictoryParticles==='function') window.emitVictoryParticles=emitVictoryParticles;
if(typeof enrichMemory==='function') window.enrichMemory=enrichMemory;
if(typeof ensureLeverageCoverForTrade==='function') window.ensureLeverageCoverForTrade=ensureLeverageCoverForTrade;
if(typeof escHtml==='function') window.escHtml=escHtml;
if(typeof estimateStakes==='function') window.estimateStakes=estimateStakes;
if(typeof evaluatePairDiversity==='function') window.evaluatePairDiversity=evaluatePairDiversity;
if(typeof fetchBinancePrices==='function') window.fetchBinancePrices=fetchBinancePrices;
if(typeof fetchLivePrices==='function') window.fetchLivePrices=fetchLivePrices;
if(typeof fetchUsdEurRate==='function') window.fetchUsdEurRate=fetchUsdEurRate;
if(typeof filterAgents==='function') window.filterAgents=filterAgents;
if(typeof filterChain==='function') window.filterChain=filterChain;
if(typeof finalizeDream==='function') window.finalizeDream=finalizeDream;
if(typeof flipPosition==='function') window.flipPosition=flipPosition;
if(typeof fmtCountdown==='function') window.fmtCountdown=fmtCountdown;
if(typeof fmtDur==='function') window.fmtDur=fmtDur;
if(typeof fmtEUR==='function') window.fmtEUR=fmtEUR;
if(typeof fmtPct==='function') window.fmtPct=fmtPct;
if(typeof fmtPrice==='function') window.fmtPrice=fmtPrice;
if(typeof fmtSince==='function') window.fmtSince=fmtSince;
if(typeof genCandles==='function') window.genCandles=genCandles;
if(typeof genCandlesFor==='function') window.genCandlesFor=genCandlesFor;
if(typeof generateDebate==='function') window.generateDebate=generateDebate;
if(typeof generateDreamEntry==='function') window.generateDreamEntry=generateDreamEntry;
if(typeof generateMetaphor==='function') window.generateMetaphor=generateMetaphor;
if(typeof getAllCompositeSignals==='function') window.getAllCompositeSignals=getAllCompositeSignals;
if(typeof getCachedCompositeSignals==='function') window.getCachedCompositeSignals=getCachedCompositeSignals;
if(typeof getCompositeSignal==='function') window.getCompositeSignal=getCompositeSignal;
if(typeof getContextualWeight==='function') window.getContextualWeight=getContextualWeight;
if(typeof getFundamentalSignals==='function') window.getFundamentalSignals=getFundamentalSignals;
if(typeof getMultiHorizonForecast==='function') window.getMultiHorizonForecast=getMultiHorizonForecast;
if(typeof getTechSignals==='function') window.getTechSignals=getTechSignals;
if(typeof goPage==='function') window.goPage=goPage;
if(typeof guardianCheck==='function') window.guardianCheck=guardianCheck;
if(typeof hexToRgb==='function') window.hexToRgb=hexToRgb;
if(typeof importAuraData==='function') window.importAuraData=importAuraData;
if(typeof initBotFleet==='function') window.initBotFleet=initBotFleet;
if(typeof initBrainInteraction==='function') window.initBrainInteraction=initBrainInteraction;
if(typeof initBrainNodes==='function') window.initBrainNodes=initBrainNodes;
if(typeof initLeverageReserve==='function') window.initLeverageReserve=initLeverageReserve;
if(typeof injectFundsFromFiat==='function') window.injectFundsFromFiat=injectFundsFromFiat;
if(typeof learnFromOpenPositions==='function') window.learnFromOpenPositions=learnFromOpenPositions;
if(typeof learnFromOutcome==='function') window.learnFromOutcome=learnFromOutcome;
if(typeof liveTrainAgents==='function') window.liveTrainAgents=liveTrainAgents;
if(typeof lmsrBuyNo==='function') window.lmsrBuyNo=lmsrBuyNo;
if(typeof lmsrBuyYes==='function') window.lmsrBuyYes=lmsrBuyYes;
if(typeof lmsrP==='function') window.lmsrP=lmsrP;
if(typeof mVote==='function') window.mVote=mVote;
if(typeof makePairBtn==='function') window.makePairBtn=makePairBtn;
if(typeof makePairState==='function') window.makePairState=makePairState;
if(typeof nowStr==='function') window.nowStr=nowStr;
if(typeof onOpen==='function') window.onOpen=onOpen;
if(typeof openFiatInjectModal==='function') window.openFiatInjectModal=openFiatInjectModal;
if(typeof openPosEdit==='function') window.openPosEdit=openPosEdit;
if(typeof openPosition==='function') window.openPosition=openPosition;
if(typeof openTransferModal==='function') window.openTransferModal=openTransferModal;
if(typeof patchAgentCards==='function') window.patchAgentCards=patchAgentCards;
if(typeof patchGovCards==='function') window.patchGovCards=patchGovCards;
if(typeof playTone==='function') window.playTone=playTone;
if(typeof previewFiatToUSDT==='function') window.previewFiatToUSDT=previewFiatToUSDT;
if(typeof proposeDynamicPair==='function') window.proposeDynamicPair=proposeDynamicPair;
if(typeof quickOpen==='function') window.quickOpen=quickOpen;
if(typeof recallMemory==='function') window.recallMemory=recallMemory;
if(typeof recordDecisionCascade==='function') window.recordDecisionCascade=recordDecisionCascade;
if(typeof recordFees==='function') window.recordFees=recordFees;
if(typeof recordShadowFromClose==='function') window.recordShadowFromClose=recordShadowFromClose;
if(typeof recordTradeForHeatmap==='function') window.recordTradeForHeatmap=recordTradeForHeatmap;
if(typeof refreshFiatInjectPreview==='function') window.refreshFiatInjectPreview=refreshFiatInjectPreview;
if(typeof rejectPairProposal==='function') window.rejectPairProposal=rejectPairProposal;
if(typeof renderActionsGrid==='function') window.renderActionsGrid=renderActionsGrid;
if(typeof renderAgentHeatmap==='function') window.renderAgentHeatmap=renderAgentHeatmap;
if(typeof renderAgents==='function') window.renderAgents=renderAgents;
if(typeof renderAgentsEvo==='function') window.renderAgentsEvo=renderAgentsEvo;
if(typeof renderAll==='function') window.renderAll=renderAll;
if(typeof renderAnalysis==='function') window.renderAnalysis=renderAnalysis;
if(typeof renderAnalyticsPanel==='function') window.renderAnalyticsPanel=renderAnalyticsPanel;
if(typeof renderCascadePanel==='function') window.renderCascadePanel=renderCascadePanel;
if(typeof renderChain==='function') window.renderChain=renderChain;
if(typeof renderClosePositionsList==='function') window.renderClosePositionsList=renderClosePositionsList;
if(typeof renderCompositePanel==='function') window.renderCompositePanel=renderCompositePanel;
if(typeof renderCorrMatrix==='function') window.renderCorrMatrix=renderCorrMatrix;
if(typeof renderDAO==='function') window.renderDAO=renderDAO;
if(typeof renderDebatePanel==='function') window.renderDebatePanel=renderDebatePanel;
if(typeof renderDreamsPanel==='function') window.renderDreamsPanel=renderDreamsPanel;
if(typeof renderFiscal==='function') window.renderFiscal=renderFiscal;
if(typeof renderFiscalExport==='function') window.renderFiscalExport=renderFiscalExport;
if(typeof renderFiscalGlobal==='function') window.renderFiscalGlobal=renderFiscalGlobal;
if(typeof renderFiscalMini==='function') window.renderFiscalMini=renderFiscalMini;
if(typeof renderFiscalPairs==='function') window.renderFiscalPairs=renderFiscalPairs;
if(typeof renderFiscalSettings==='function') window.renderFiscalSettings=renderFiscalSettings;
if(typeof renderFiscalTax==='function') window.renderFiscalTax=renderFiscalTax;
if(typeof renderFleetPanel==='function') window.renderFleetPanel=renderFleetPanel;
if(typeof renderFundamentalPanel==='function') window.renderFundamentalPanel=renderFundamentalPanel;
if(typeof renderHeatmapPanel==='function') window.renderHeatmapPanel=renderHeatmapPanel;
if(typeof renderHome==='function') window.renderHome=renderHome;
if(typeof renderHomePrices==='function') window.renderHomePrices=renderHomePrices;
if(typeof renderHorizonPanel==='function') window.renderHorizonPanel=renderHorizonPanel;
if(typeof renderInlinePosForPair==='function') window.renderInlinePosForPair=renderInlinePosForPair;
if(typeof renderLeadLagPanel==='function') window.renderLeadLagPanel=renderLeadLagPanel;
if(typeof renderLearningHistory==='function') window.renderLearningHistory=renderLearningHistory;
if(typeof renderMarket==='function') window.renderMarket=renderMarket;
if(typeof renderMirrorPanel==='function') window.renderMirrorPanel=renderMirrorPanel;
if(typeof renderOpenPnlBanner==='function') window.renderOpenPnlBanner=renderOpenPnlBanner;
if(typeof renderOpenPosSummary==='function') window.renderOpenPosSummary=renderOpenPosSummary;
if(typeof renderPairPnl==='function') window.renderPairPnl=renderPairPnl;
if(typeof renderPerfMetricsPanel==='function') window.renderPerfMetricsPanel=renderPerfMetricsPanel;
if(typeof renderPositions==='function') window.renderPositions=renderPositions;
if(typeof renderResonancePanel==='function') window.renderResonancePanel=renderResonancePanel;
if(typeof renderSettingsPanel==='function') window.renderSettingsPanel=renderSettingsPanel;
if(typeof renderSwarmPanel==='function') window.renderSwarmPanel=renderSwarmPanel;
if(typeof renderTechnicalPanel==='function') window.renderTechnicalPanel=renderTechnicalPanel;
if(typeof renderWhatIfPanel==='function') window.renderWhatIfPanel=renderWhatIfPanel;
if(typeof repayLeverage==='function') window.repayLeverage=repayLeverage;
if(typeof replayPause==='function') window.replayPause=replayPause;
if(typeof resetCycleToAuto==='function') window.resetCycleToAuto=resetCycleToAuto;
if(typeof resetPairPnl==='function') window.resetPairPnl=resetPairPnl;
if(typeof resolvePairCycle==='function') window.resolvePairCycle=resolvePairCycle;
if(typeof restoreLeverageAtCashout==='function') window.restoreLeverageAtCashout=restoreLeverageAtCashout;
if(typeof rndHash==='function') window.rndHash=rndHash;
if(typeof runBotFleet==='function') window.runBotFleet=runBotFleet;
if(typeof runDreamScenario==='function') window.runDreamScenario=runDreamScenario;
if(typeof saveFeeSettings==='function') window.saveFeeSettings=saveFeeSettings;
if(typeof scoutAnalysis==='function') window.scoutAnalysis=scoutAnalysis;
if(typeof selectPair==='function') window.selectPair=selectPair;
if(typeof selectRegion==='function') window.selectRegion=selectRegion;
if(typeof setBotMode==='function') window.setBotMode=setBotMode;
if(typeof setEl==='function') window.setEl=setEl;
if(typeof setMobileTf==='function') window.setMobileTf=setMobileTf;
if(typeof setTpSl==='function') window.setTpSl=setTpSl;
if(typeof setTransferPct==='function') window.setTransferPct=setTransferPct;
if(typeof shouldTriggerDream==='function') window.shouldTriggerDream=shouldTriggerDream;
if(typeof showMemoryOverlay==='function') window.showMemoryOverlay=showMemoryOverlay;
if(typeof showMilestone==='function') window.showMilestone=showMilestone;
if(typeof showPairDetail==='function') window.showPairDetail=showPairDetail;
if(typeof showToast==='function') window.showToast=showToast;
if(typeof simTick==='function') window.simTick=simTick;
if(typeof startBrainAnim==='function') window.startBrainAnim=startBrainAnim;
if(typeof startThresholdDrag==='function') window.startThresholdDrag=startThresholdDrag;
if(typeof stopBrainAnim==='function') window.stopBrainAnim=stopBrainAnim;
if(typeof swapTransfer==='function') window.swapTransfer=swapTransfer;
if(typeof switchAgentTab==='function') window.switchAgentTab=switchAgentTab;
if(typeof switchAnalyticsTab==='function') window.switchAnalyticsTab=switchAnalyticsTab;
if(typeof switchFiscalTab==='function') window.switchFiscalTab=switchFiscalTab;
if(typeof syncLeverageReserve==='function') window.syncLeverageReserve=syncLeverageReserve;
if(typeof syncPairPresets==='function') window.syncPairPresets=syncPairPresets;
if(typeof toggleSound==='function') window.toggleSound=toggleSound;
if(typeof triggerDreamCycle==='function') window.triggerDreamCycle=triggerDreamCycle;
if(typeof triggerEvolution==='function') window.triggerEvolution=triggerEvolution;
if(typeof triggerInstall==='function') window.triggerInstall=triggerInstall;
if(typeof triggerMarginCall==='function') window.triggerMarginCall=triggerMarginCall;
if(typeof updateAllPairCtrlLabels==='function') window.updateAllPairCtrlLabels=updateAllPairCtrlLabels;
if(typeof updateBotThoughts==='function') window.updateBotThoughts=updateBotThoughts;
if(typeof updateClock==='function') window.updateClock=updateClock;
if(typeof updateCycleDurLabel==='function') window.updateCycleDurLabel=updateCycleDurLabel;
if(typeof updateFiscalMini==='function') window.updateFiscalMini=updateFiscalMini;
if(typeof updateIntelBanner==='function') window.updateIntelBanner=updateIntelBanner;
if(typeof updateManualSuggestion==='function') window.updateManualSuggestion=updateManualSuggestion;
if(typeof updateMarketMood==='function') window.updateMarketMood=updateMarketMood;
if(typeof updatePairAnalysisPanels==='function') window.updatePairAnalysisPanels=updatePairAnalysisPanels;
if(typeof updatePairBtnStates==='function') window.updatePairBtnStates=updatePairBtnStates;
if(typeof updateRegimeFitness==='function') window.updateRegimeFitness=updateRegimeFitness;
if(typeof updateShadowBot==='function') window.updateShadowBot=updateShadowBot;
if(typeof updateStreakBadge==='function') window.updateStreakBadge=updateStreakBadge;
if(typeof updateTransferUI==='function') window.updateTransferUI=updateTransferUI;

if(typeof btcImpactTick==='function') window.btcImpactTick=btcImpactTick;
if(typeof renderBtcImpactSection==='function') window.renderBtcImpactSection=renderBtcImpactSection;
if(typeof simulateBtcMove==='function') window.simulateBtcMove=simulateBtcMove;
if(typeof _calcBeta==='function') window._calcBeta=_calcBeta;
if(typeof _theoreticalBeta==='function') window._theoreticalBeta=_theoreticalBeta;

if(typeof computeRiskScore==='function') window.computeRiskScore=computeRiskScore;
if(typeof renderRiskScoreSection==='function') window.renderRiskScoreSection=renderRiskScoreSection;
if(typeof _riskArc==='function') window._riskArc=_riskArc;

if(typeof refreshPriceHist==='function') window.refreshPriceHist=refreshPriceHist;
if(typeof renderPriceHistSection==='function') window.renderPriceHistSection=renderPriceHistSection;
if(typeof _phFetch==='function') window._phFetch=_phFetch;
if(typeof _phSparkline==='function') window._phSparkline=_phSparkline;

if(typeof calcUpdate==='function') window.calcUpdate=calcUpdate;
if(typeof calcSetPair==='function') window.calcSetPair=calcSetPair;
if(typeof calcSetRiskPreset==='function') window.calcSetRiskPreset=calcSetRiskPreset;
if(typeof renderCalcSection==='function') window.renderCalcSection=renderCalcSection;
if(typeof _runCalc==='function') window._runCalc=_runCalc;

if(typeof loadDiffBackup==='function') window.loadDiffBackup=loadDiffBackup;
if(typeof loadDiffFromAutoSlot==='function') window.loadDiffFromAutoSlot=loadDiffFromAutoSlot;
if(typeof clearDiff==='function') window.clearDiff=clearDiff;
if(typeof renderDiffSection==='function') window.renderDiffSection=renderDiffSection;
if(typeof _diffVal==='function') window._diffVal=_diffVal;
if(typeof _diffChange==='function') window._diffChange=_diffChange;

if(typeof togglePaperRealistic==='function') window.togglePaperRealistic=togglePaperRealistic;
if(typeof updatePrCfg==='function') window.updatePrCfg=updatePrCfg;
if(typeof togglePrBool==='function') window.togglePrBool=togglePrBool;
if(typeof applyRealisticFrictions==='function') window.applyRealisticFrictions=applyRealisticFrictions;
if(typeof renderPaperUltraSection==='function') window.renderPaperUltraSection=renderPaperUltraSection;
if(typeof simulateRealisticTrade==='function') window.simulateRealisticTrade=simulateRealisticTrade;
if(typeof _prGet==='function') window._prGet=_prGet;

if(typeof updateTgField==='function') window.updateTgField=updateTgField;
if(typeof toggleTgOption==='function') window.toggleTgOption=toggleTgOption;
if(typeof toggleTgEnabled==='function') window.toggleTgEnabled=toggleTgEnabled;
if(typeof sendTelegram==='function') window.sendTelegram=sendTelegram;
if(typeof testTelegram==='function') window.testTelegram=testTelegram;
if(typeof sendHebdoTelegram==='function') window.sendHebdoTelegram=sendHebdoTelegram;
if(typeof tgOnTrade==='function') window.tgOnTrade=tgOnTrade;
if(typeof tgOnAlert==='function') window.tgOnAlert=tgOnAlert;
if(typeof tgOnUrgence==='function') window.tgOnUrgence=tgOnUrgence;
if(typeof renderTelegramSection==='function') window.renderTelegramSection=renderTelegramSection;
if(typeof _tgGet==='function') window._tgGet=_tgGet;

if(typeof playSound==='function') window.playSound=playSound;
if(typeof setSoundPreset==='function') window.setSoundPreset=setSoundPreset;
if(typeof setSoundVolume==='function') window.setSoundVolume=setSoundVolume;
if(typeof toggleSoundOption==='function') window.toggleSoundOption=toggleSoundOption;
if(typeof toggleSoundEnabled==='function') window.toggleSoundEnabled=toggleSoundEnabled;
if(typeof renderSoundSection==='function') window.renderSoundSection=renderSoundSection;
if(typeof _sndGet==='function') window._sndGet=_sndGet;
if(typeof _getAudioCtx==='function') window._getAudioCtx=_getAudioCtx;

if(typeof toggleCompactWidget==='function') window.toggleCompactWidget=toggleCompactWidget;
if(typeof renderCompactWidgetSection==='function') window.renderCompactWidgetSection=renderCompactWidgetSection;
if(typeof _updateCompactWidget==='function') window._updateCompactWidget=_updateCompactWidget;

if(typeof refreshLeaderboard==='function') window.refreshLeaderboard=refreshLeaderboard;
if(typeof renderLeaderboardSection==='function') window.renderLeaderboardSection=renderLeaderboardSection;
if(typeof _lbMyStats==='function') window._lbMyStats=_lbMyStats;
if(typeof _lbBuildLeaderboard==='function') window._lbBuildLeaderboard=_lbBuildLeaderboard;
if(typeof _lbFetchBenchmarks==='function') window._lbFetchBenchmarks=_lbFetchBenchmarks;

if(typeof enterVacancesMode==='function') window.enterVacancesMode=enterVacancesMode;
if(typeof exitVacancesMode==='function') window.exitVacancesMode=exitVacancesMode;
if(typeof renderVacancesSection==='function') window.renderVacancesSection=renderVacancesSection;
if(typeof _vacGet==='function') window._vacGet=_vacGet;
if(typeof _vacUpdateBanner==='function') window._vacUpdateBanner=_vacUpdateBanner;
if(typeof _vacDailyCheck==='function') window._vacDailyCheck=_vacDailyCheck;

if(typeof renderConscienceSection==='function') window.renderConscienceSection=renderConscienceSection;
if(typeof _acAnalyze==='function') window._acAnalyze=_acAnalyze;

if(typeof checkGraceMoment==='function') window.checkGraceMoment=checkGraceMoment;
if(typeof closeGrace==='function') window.closeGrace=closeGrace;
if(typeof graceActNow==='function') window.graceActNow=graceActNow;
if(typeof renderGraceSection==='function') window.renderGraceSection=renderGraceSection;
if(typeof _grGetData==='function') window._grGetData=_grGetData;
if(typeof _showGraceAlert==='function') window._showGraceAlert=_showGraceAlert;

if(typeof checkAntiRevenge==='function') window.checkAntiRevenge=checkAntiRevenge;
if(typeof triggerAntiRevenge==='function') window.triggerAntiRevenge=triggerAntiRevenge;
if(typeof unlockRevenge==='function') window.unlockRevenge=unlockRevenge;
if(typeof renderAntiRevengeSection==='function') window.renderAntiRevengeSection=renderAntiRevengeSection;
if(typeof _rvGet==='function') window._rvGet=_rvGet;
if(typeof _rvConsecLosses==='function') window._rvConsecLosses=_rvConsecLosses;
if(typeof _rvBlockButtons==='function') window._rvBlockButtons=_rvBlockButtons;
if(typeof _rvStartCountdown==='function') window._rvStartCountdown=_rvStartCountdown;

if(typeof setAdnFilter==='function') window.setAdnFilter=setAdnFilter;
if(typeof renderAdnSection==='function') window.renderAdnSection=renderAdnSection;
if(typeof _buildAdnSignature==='function') window._buildAdnSignature=_buildAdnSignature;
if(typeof _adnBestPatterns==='function') window._adnBestPatterns=_adnBestPatterns;
if(typeof _adnAnnotateTrades==='function') window._adnAnnotateTrades=_adnAnnotateTrades;

if(typeof memRecordSession==='function') window.memRecordSession=memRecordSession;
if(typeof addManualMemory==='function') window.addManualMemory=addManualMemory;
if(typeof clearMemory==='function') window.clearMemory=clearMemory;
if(typeof renderMemorySection==='function') window.renderMemorySection=renderMemorySection;
if(typeof _memLoad==='function') window._memLoad=_memLoad;
if(typeof _memSave==='function') window._memSave=_memSave;
if(typeof _memAutoGenerate==='function') window._memAutoGenerate=_memAutoGenerate;
if(typeof _memAuraMessage==='function') window._memAuraMessage=_memAuraMessage;

if(typeof renderWeatherSection==='function') window.renderWeatherSection=renderWeatherSection;
if(typeof _wxCompute==='function') window._wxCompute=_wxCompute;

if(typeof openCinema==='function') window.openCinema=openCinema;
if(typeof closeCinema==='function') window.closeCinema=closeCinema;
if(typeof renderCinemaSection==='function') window.renderCinemaSection=renderCinemaSection;
if(typeof _cinUpdate==='function') window._cinUpdate=_cinUpdate;

if(typeof saveVault==='function') window.saveVault=saveVault;
if(typeof loadVault==='function') window.loadVault=loadVault;
if(typeof exportVault==='function') window.exportVault=exportVault;
if(typeof importVault==='function') window.importVault=importVault;
if(typeof vaultPwdUpdate==='function') window.vaultPwdUpdate=vaultPwdUpdate;
if(typeof renderVaultSection==='function') window.renderVaultSection=renderVaultSection;
if(typeof _vaultDeriveKey==='function') window._vaultDeriveKey=_vaultDeriveKey;
if(typeof _vaultEncrypt==='function') window._vaultEncrypt=_vaultEncrypt;
if(typeof _vaultDecrypt==='function') window._vaultDecrypt=_vaultDecrypt;
if(typeof _vaultStrength==='function') window._vaultStrength=_vaultStrength;
if(typeof _vaultStrengthLabel==='function') window._vaultStrengthLabel=_vaultStrengthLabel;

if(typeof checkBunker==='function') window.checkBunker=checkBunker;
if(typeof activateBunker==='function') window.activateBunker=activateBunker;
if(typeof exitBunker==='function') window.exitBunker=exitBunker;
if(typeof toggleBkAction==='function') window.toggleBkAction=toggleBkAction;
if(typeof updateBkParam==='function') window.updateBkParam=updateBkParam;
if(typeof renderBunkerSection==='function') window.renderBunkerSection=renderBunkerSection;
if(typeof _bkGet==='function') window._bkGet=_bkGet;
if(typeof _bkInitCapRef==='function') window._bkInitCapRef=_bkInitCapRef;
if(typeof _bkGetCapRef==='function') window._bkGetCapRef=_bkGetCapRef;
if(typeof _bkUpdateBanner==='function') window._bkUpdateBanner=_bkUpdateBanner;
if(typeof _bkAutoCheck==='function') window._bkAutoCheck=_bkAutoCheck;

// ════════════════════════════════════════════════════════════════════════
// AURA8 v93 · FIN BLOC RESTAURATION
// ════════════════════════════════════════════════════════════════════════

