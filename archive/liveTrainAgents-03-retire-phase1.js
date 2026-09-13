// archive/liveTrainAgents-03-retire-phase1.js — CODE RETIRÉ, NON CHARGÉ PAR LE HTML (loi 6 du PLAN-DIRECTEUR : rien ne s'efface, ça s'archive).
// Retiré de js/03-per-pair-position-buttons-controls-buid.js le 12/09/2026 (Phase 1 · VOTE PAR PAIRE · token 20260912c).
// Raison : à chaque fetch CoinGecko (02 _cgT), tirait TOUS les agents vers le momentum 5 bougies de chaque paire à tour de rôle
// (la dernière paire gagnait) — doublon de l'AT (momentum déjà dans getTechSignals, lu par les scouts/le conseil) et écrasement du
// score appris (learnFromOutcome). Remplaçant : aucun (le momentum est déjà une source décisionnelle via l'AT, par paire).
// Appelant retiré en même temps : 02-state-init.js `_cgT('liveTrainAgents', …)` (bloc « traitement CoinGecko »).
// Copie byte-identique du bloc retiré (lignes 2910–2961 de 03 au token 20260912b) :

// ════════════════════════════════════════════════════════════
// LIVE TRAINING — every real price fetch nudges agents toward momentum
// ════════════════════════════════════════════════════════════
function liveTrainAgents() {
  if(!S.agents || !Array.isArray(S.agents) || S.agents.length === 0) return;
  // v6.0 — Memory-driven learning + archives context
  const agentArchives = (S.archives?.snapshots || []).filter(s => s.domain === 'agents');
  const learningBoost = agentArchives.length > 0 ? 1.15 : 1.0;
  let nudged = 0;
  const pairs = Object.keys(PAIRS || {});
  pairs.forEach(pair => {
    const ps = S.pairStates?.[pair];
    if(!ps || !ps.candles || ps.candles.length < 3) return;
    const recent = ps.candles.slice(-5);
    if(recent.length < 2) return;
    // Compute normalized momentum from last 5 candles
    const first = recent[0].c, last = recent[recent.length-1].c;
    if(first <= 0) return;
    const momentum = (last - first) / first;      // raw pct change
    const normMom  = Math.max(-0.05, Math.min(0.05, momentum)) / 0.05;  // clamp to [-1, +1]
    // Only nudge agents whose style aligns; tiny amounts
    S.agents.forEach(a => {
      if(!a) return;
      const w = (a.conf || 0.5) * 0.015 * learningBoost; // max nudge ~1.5%, boosted post-reset
      a.score = (a.score || 0) * 0.985 + normMom * w;
      a.learningEvents = (a.learningEvents || 0) + 1;
      // Small fitness boost if agent was aligned with momentum direction
      if((a.score > 0 && normMom > 0.3) || (a.score < 0 && normMom < -0.3)) {
        a.fitness = Math.min(2000, Math.max(50, (a.fitness || 500) + 5));  // v8.0 LIVRAISON 30 · FIX #3 · échelle unifiée [50, 2000]
      }
    });
    nudged++;
  });
  if(nudged > 0) {
    // v6.5: write LEARN events to chainLog so Chain > Learn tab shows activity
    if(!S.chainLog) S.chainLog = [];
    const topAgents = [...S.agents]
      .filter(a => Math.abs(a.score||0) > 0.05)
      .sort((a,b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 3);
    if(topAgents.length && S.chainLog.filter(e => e.category==='learn').length < 200) {
      S.chainLog.push({
        icon: '🧠',
        desc: `Apprentissage · ${nudged} agents entraînés · Top: ${topAgents.map(a => a.emoji + (a.score>=0?'+':'')+a.score.toFixed(2)).join(', ')}`,
        hash: Math.random().toString(36).substr(2,8),
        time: new Date().toTimeString().slice(0,8),
        category: 'learn'
      });
      if(S.chainLog.length > 200) S.chainLog.splice(0, S.chainLog.length - 200);
    }
  }
}
