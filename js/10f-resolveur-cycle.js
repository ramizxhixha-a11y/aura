// ▓▓▓ VERSION 20260926g ▓▓▓ · [DOUBLE JUGEMENT · 26/09/2026] une fermeture bot ne juge plus les agents deux fois (closePosition juge déjà, source 'position')
// [STOP CÔTÉ EXCHANGE SIMULÉ · 26/09/2026] _botExitSweep : à la reconnexion, un stop traversé pendant la coupure est exécuté AU stop (EV)
// [VÉRITÉ DES RÈGLES · 23/09/2026] une sortie par règle apprise marque la position (pos._ruleExit)
// [STOP APPRIS · 23/09/2026] _botExitSweep : sortie par stop appris (10i _stopExit) après le gain appris, avant les niveaux
// [GAIN APPRIS · 23/09/2026] _botExitSweep : sortie par règle de gain apprise (10i _gainExit) après l'horizon, avant les niveaux
// [MÉMOIRE DES CHEMINS · 22/09/2026] _botExitSweep : sortie par horizon appris (10i _horizonExit) avant les niveaux — armée seulement par les chemins de la paire
// [A13 · 17/09/2026] _botExitSweep : règle unique de sortie = niveaux pos.sl / pos.tp (ATR × bras A/B, 09d1) exécutés sur ps.price, breakeven réel ; le % de conviction ne reste qu'en repli (AA, tick d'ouverture)
// [1b-a HOTFIX · 14/09/2026 soir] _closeCompleted : une fermeture qui n'aboutit pas n'est plus réessayée à chaque tick (1/60 s), rien n'est enseigné sans fermeture réelle, la raison est journalisée
// 10f-resolveur-cycle.js — Cœur : _resolvePairCycleCore + sorties bot hors résolution (_botExitSweep) + garde-fou perte max (_lossCapSweep)
// [1b-a · 14/09/2026] TP/SL/breakeven des positions bot sortis de la résolution → _botExitSweep (battement 08, sur ps.price) ; la résolution écrit _tpPct/_slPct et ne garde que Signal inversé / timeout / hardTime ; _lossCapSweep rebranché par 08 (règle 06/07)
// [PHASE 1 · 12/09/2026] VOTE PAR PAIRE (PLAN-DIRECTEUR A1) : le consensus des agents (50 % du signal final) lisait a.score,
// scalaire GLOBAL écrasé par le roster de la DERNIÈRE paire analysée (rotation 08, paire active, cascade, brain gate) et tiré
// par liveTrainAgents vers le momentum d'une autre paire → 50 % du signal était du bruit corrélé (CARTO §2). Désormais :
// roster FRAIS de LA paire résolue à chaque cycle (runRosterAnalysis, mode courant → ps.roster.votes), consensus et mémoire
// (recallMemory) lus sur ces votes ; sans roster l'agent ne vote pas (0). a.score = biais appris, plus jamais l'avis du moment.
// [P7 · 06/09/2026] BRIQUE 7 DU PONT : delta news NLP sur les portes de conviction (porte par régime ET
// plancher 0.30), symétrique au sens du pari — contre le pari ≤ 35 → +0.05, ≤ 25 → +0.08 ; pour le pari
// ≥ 70 → −0.02 (source unique 10e7, CoinStats 24 h, ≥ 5 articles scorés). Journalisé quand décisif (trace en 10e7).
// [NET · 06/09/2026] EXPECTANCY NETTE : les 4 lecteurs de l'expérience de la paire (porte S3 +0.10, disjoncteur
// x0.25/x1.8, _perfMult, bases solides RE) lisaient ps.totalPnlPct / totalPnlUsd, BRUTS de frais (pnlUsdt =
// realisedUsd avant recordFees). Ils lisent désormais la source unique 10e6 (_pairNetExpectancy / _learnedNetUsd :
// 20 dernières clôtures du mode, brut − coût aller-retour), la même que le veto/demi-mise 09c.
// [P3 · 06/09/2026] BRIQUE 3 DU PONT : delta heatmap horaire sur les portes de conviction (porte par
// régime ET plancher 0.30) — créneau froid +0.08 / créneau d'or −0.03 (source unique 10e3, heure
// locale comme l'écrivain 03). Journalisé quand le delta a été décisif (retenu ou ouvert grâce à lui).
// [P2 · 06/09/2026] BRIQUE 2 DU PONT : malus calendrier éco +0.10 sur les portes de conviction
// (porte par régime ET plancher 0.30) dans la fenêtre ±2 h d'une annonce à impact FORT (source
// unique 10e2) ; le veto 30 min avant vit dans l'entonnoir 09c. Journalisé quand le malus a été décisif.
// [P1 · 05/09/2026] BRIQUE 1 DU PONT : bonus de diversification −0.03 sur les portes de
// conviction (paire anti-corrélée < −0.80 à une position ouverte) ; le veto anti-doublon
// (> +0.80) vit dans l'entonnoir 09c. Journalisé au moment où le bonus a été décisif.
// [DÉCOUPE 10 · 09/08/2026] Tranche BYTE-IDENTIQUE de 10-fin-bloc-restauration-v93.js
// (lignes 1516-2003 de l'original). Aucun code réécrit. Ordre de chargement OBLIGATOIRE :
// 10a → 10h, à la place exacte de l'ancien fichier 10 dans le HTML.


// [P2 · 06/09/2026] trace journal (📅, 1 fois/5 min/paire, RAM) quand le malus éco a été décisif :
// la paire aurait ouvert sans lui. EVAL n'est pas écrit ici (aucune ouverture n'atteint 09c).
const _ecoMalusLogTs = {};
// [P3 · 06/09/2026] trace journal (🕐, 1 fois/5 min/paire, RAM) quand le delta heatmap a été décisif.
const _heatLogTs = {};
function _heatTrace(pair, hg, opened) {
  const now = Date.now();
  if ((now - (_heatLogTs[pair] || 0)) < 5 * 60 * 1000) return;
  _heatLogTs[pair] = now;
  const wrTxt = Math.round(hg.wr * 100) + '% WR sur ' + hg.count + ' trades';
  const desc = opened
    ? `Heatmap · ${pair} ouvert grâce au créneau d'or ${hg.hour}h (${wrTxt}) · conviction requise −${HEAT_GOLD_BONUS.toFixed(2)}`
    : `Heatmap · ${pair} retenu · créneau froid ${hg.hour}h (${wrTxt}) · conviction requise +${HEAT_COLD_MALUS.toFixed(2)}`;
  S.chainLog.push({ icon:'🕐', desc, hash:rndHash(), time:nowStr() });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
}
function _ecoMalusTrace(pair, eg) {
  const now = Date.now();
  if ((now - (_ecoMalusLogTs[pair] || 0)) < 5 * 60 * 1000) return;
  _ecoMalusLogTs[pair] = now;
  const when = eg.minutes >= 0 ? ('dans ' + eg.minutes + ' min') : ('il y a ' + (-eg.minutes) + ' min');
  S.chainLog.push({ icon:'📅', desc:`Calendrier éco · ${pair} retenu · ${eg.event.name} ${when} · conviction requise +${ECO_CAUTION_MALUS.toFixed(2)}`, hash:rndHash(), time:nowStr() });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
}

function _resolvePairCycleCore(pair, ps) {
  const cfg = PAIRS[pair];

  const tech = getTechSignals(pair);
  const fund = getFundamentalSignals(pair);
  const raw  = tech?.raw || null;

  const atScore    = tech?.atScore   || 0;
  const fundScore  = fund?.fundScore || 0;
  const composite  = Math.max(-1, Math.min(1, atScore*0.60 + fundScore*0.40));

  // [PHASE 1 · 12/09/2026] roster FRAIS de LA paire, dans le mode du cycle traité (pairStates/ps sont multiplexés par mode).
  // getTechSignals/getFundamentalSignals sont déjà en cache pour cette paire (calculés ci-dessus). Marqué pour la sonde gel.
  try { if (typeof window !== 'undefined' && window._perfOp) window._perfOp('roster:' + pair); } catch(e) {}
  if (typeof runRosterAnalysis === 'function') { try { runRosterAnalysis(pair); } catch(e) {} }
  const _votes  = (ps.roster && ps.roster.votes) || {};
  const _voteOf = a => (typeof _votes[a.id] === 'number') ? _votes[a.id] : 0;

  // [PHASE 1] totalFitness = dénominateur de la sortie « Signal inversé » (oppWeight, plus bas) : fitness des agents QUI
  // VOTENT (signal, hors bots/méta). Les bots votent 0 désormais ; sur S.agents entier le seuil 0.75 devenait inatteignable
  // (21 votants sur 31 agents ≈ 0.68 au maximum) — la sortie serait morte en silence.
  const totalFitness   = S.agents.filter(a => !a.isBot && !a.isMeta).reduce((s,a) => s + (a.fitness||1), 0) || 1;
  const _currentRegime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';
  const _signalAgents = S.agents.filter(a => !a.isBot && !a.isMeta);
  const totalContextFit = _signalAgents.reduce((s,a) => s + (typeof getContextualWeight === 'function' ? getContextualWeight(a, _currentRegime) : (a.fitness||1)), 0) || 1;
  let _weightSum = 0;
  const _contribs = _signalAgents.map(a => {
    const raw = _voteOf(a);   // [PHASE 1] vote de l'agent sur CETTE paire (ex : a.score global)
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
    const _v = _voteOf(a);   // [PHASE 1] la mémoire compare le vote courant sur CETTE paire (enrichMemory stocke le même vote)
    const recall = typeof recallMemory === 'function' ? recallMemory(a, pair, _v) : null;
    if(recall) {
      const bias = recall.memory.won
        ? recall.strength * _v * 0.08
        : -recall.strength * Math.abs(_v) * 0.05;
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
    // ★ RYTHME (08/07/2026) · le facteur volatilite ecrasait la conviction :
    // en marche nerveux, tc saturait a 120 s sur les 16 paires quel que soit
    // le signal (constate dans les donnees). L'effet volatilite est plafonne
    // a x1.6 : la prudence dans le bruit est conservee, mais une conviction
    // haute accelere enfin le rythme (~40-60 s au lieu de 120 constant).
    const tc=Math.round(Math.max(10,Math.min(300,(1-effectiveConviction*0.65)*Math.min(1.6,1+volCV*28)*55))/10)*10;
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

  // [S2 · 26/08/2026, ordre Rams] PORTE PAR RÉGIME — l'audit a prouvé que le seuil
  // unique 0.18 laissait le bruit du composite ouvrir en continu en marché plat
  // (270 trades/45h, brut −13$, frais 12$). En CALM le marché ne paie pas les frais :
  // on exige une vraie conviction. L'exploration reste où la volatilité la finance.
  const _mktReg = (typeof detectMarketRegime==='function' ? detectMarketRegime() : 'calm') || 'calm';
  const _gates = (_mktReg==='calm') ? {conv:0.35, dir:0.20}
               : (_mktReg==='volatile'||_mktReg==='volatile_bull'||_mktReg==='volatile_bear') ? {conv:0.18, dir:0.10}
               : {conv:0.25, dir:0.15};   // bull / bear / autres
  // [S3+ · 03/09/2026, NET 06/09/2026] PORTE D'EXPECTANCY PAR PAIRE — le système possédait l'historique
  // de chaque paire sans le consulter à l'ouverture (PEPE : 114 trades, −17,9$, rouvert sans cesse).
  // Les 20 dernières clôtures de LA paire, dans LE mode courant, décident — NETTES de frais (source unique
  // 10e6 : brut % de la mise − coût aller-retour taker+slippage×2 + funding×3) : expectancy nette < 0
  // → la paire doit prouver +0,10 de conviction en plus. Même déclencheur que la demi-mise 09c.
  // Moins de 10 clôtures = neutre. Une paire qui perd NET doit convaincre davantage.
  const _netExp     = _pairNetExpectancy(ps);
  const _expPenalty = (_netExp && _netExp.netPct < 0) ? 0.10 : 0;
  // [P1 · 05/09/2026] BRIQUE 1 DU PONT — BONUS DE DIVERSIFICATION : si le pari candidat
  // (sens du signal) est anti-corrélé (< −0.80, corrélation effective = Pearson des
  // retours × sens) à une position ouverte, il diversifie le livre : il doit convaincre
  // 0.03 de moins (porte par régime ET plancher 0.30 ci-dessous). Évalué seulement quand
  // la paire n'a pas de position (une position ouverte se GÈRE, elle ne s'ouvre pas :
  // le sens de clôture sigRev reste intact). Le REFUS du doublon (> +0.80) vit dans
  // l'entonnoir unique 09c, traversé par tous les chemins d'ouverture bot.
  const _corrG = (S.openPositions || []).some(p => p && p.pair === pair)
    ? { veto: false, bonus: 0, corr: null, withPair: null, withSide: null }
    : _corrGateForOpen(pair, finalSignalWithMem > 0 ? 'long' : 'short');
  const _corrBonus = _corrG.bonus || 0;
  // [P2 · 06/09/2026] BRIQUE 2 DU PONT — MALUS CALENDRIER ÉCO : dans la fenêtre ±2 h d'une
  // annonce à impact FORT (FOMC, CPI, expiration Deribit — dates officielles, source unique
  // 10e2), le bruit d'annonce se déguise en signal : la paire doit convaincre 0.10 de plus
  // (porte par régime ET plancher 0.30). Le refus total des 30 dernières minutes vit en 09c.
  const _ecoG = _ecoGateForOpen();
  const _ecoMalus = _ecoG.malus || 0;
  // [P3 · 06/09/2026] BRIQUE 3 DU PONT — DELTA HEATMAP HORAIRE : le créneau courant (heure locale)
  // a une histoire (S.heatmap.byHour, ≥ 20 trades) ; froid (WR < 40 %) → +0.08, d'or (WR ≥ 60 %,
  // pnl > 0) → −0.03, sur la porte par régime ET le plancher 0.30. Source unique 10e3.
  const _heatG = _heatGateForOpen();
  const _heatDelta = _heatG.delta || 0;
  // [P7 · 06/09/2026] BRIQUE 7 DU PONT — DELTA NEWS NLP : les news des 24 h sur LA paire (source unique 10e7,
  // ≥ 5 articles scorés), lues dans le SENS du pari : contre lui → +0.05 / +0.08, pour lui → −0.02.
  const _newsG = _newsGateForOpen(pair, finalSignalWithMem > 0 ? 'long' : 'short');
  const _newsDelta = _newsG.delta || 0;
  const convGate = effectiveConviction >= (_gates.conv + _expPenalty + _ecoMalus + _heatDelta + _newsDelta - _corrBonus - (S._convBoost || 0));
  const dirGate  = Math.abs(finalSignalWithMem) >= (_gates.dir - (S._convBoost || 0) * 0.5);
  const lmsrAlignBuy  = adjProb > 0.50;
  const lmsrAlignSell = adjProb < 0.50;
  const convOverride  = effectiveConviction > 0.40;   // [S2] 0.25→0.40 : le LMSR ne se contourne qu'en vraie conviction

  const isBuy  = finalSignalWithMem > 0 && convGate && dirGate && (lmsrAlignBuy  || convOverride);
  const isSell = finalSignalWithMem < 0 && convGate && dirGate && (lmsrAlignSell || convOverride);
  const action = isBuy ? 'buy' : isSell ? 'sell' : 'hold';
  ps.lastAction = action;
  if(action==='hold'){if(!ps.holdStartTs)ps.holdStartTs=Date.now();}else{ps.holdStartTs=0;}

  // [S2 · 26/08/2026] Le « pull » agents←signal est SUPPRIMÉ : il tirait chaque agent
  // vers le composite toutes les 6 s, alors que le composite intègre le consensus des
  // agents (LMSR 14% + _agCons) → boucle auto-réalisatrice fabriquant un faux accord.
  // L'apprentissage légitime des agents passe par learnFromOutcome (résultats réels),
  // jamais par imitation du signal. Le consensus redevient une information.

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
    // [1b-a · 14/09/2026] les cibles TP/SL (conviction + volatilité DU MOMENT) sont calculées ici et ÉCRITES sur la
    // position ; la vérification prix (TP, SL, breakeven) tourne dans le battement, à chaque tick, dans
    // _botExitSweep ci-dessous — plus seulement à la résolution (en EV/RE : seulement quand une bougie Binance se
    // ferme → série figée = aucune sortie, jamais ; audit 14/09). Ici ne restent que les sorties qui ont besoin
    // du roster ou du cycle : « Signal inversé », timeout, hardTime.
    botPos._tpPct=tpPct; botPos._slPct=slPct;

    const sigRev=sigDir!==0&&sigDir!==posDir&&effectiveConviction>0.65;
    botPos._holdCycles=(botPos._holdCycles||0)+1;
    const minHoldMet = botPos._holdCycles >= 5;
    const maxHold=Math.ceil(8/Math.max(0.1,effectiveConviction));
    // ★ LAISSER COURIR (06/07/2026) · le timeout fermait au chrono QUEL QUE SOIT
    // le P&L : 13 sorties/41 quasi nulles, gain moyen plafonne a +0.4 % alors que
    // le TP vise 0.6-1.2 % — l'edge brut (+0.29 $) etait mange par les frais.
    // Desormais le timeout ne coupe plus une position EN MARCHE vers son objectif
    // (au-dela de 45 % du TP, le breakeven-stop la protege deja : elle ne peut
    // plus repasser rouge). Il ne recycle que les positions qui STAGNENT.
    const timeClose=botPos._holdCycles>=maxHold && pnlPct < tpPct*0.45;
    // garde-fou absolu : rien ne vit plus de 3x maxHold (marche vraiment figee)
    const hardTime=botPos._holdCycles>=maxHold*3;
    // [PHASE 1] sortie « Signal inversé » : poids des agents qui votent CONTRE la position SUR CETTE paire (ex : a.score global,
    // où les bots comptaient avec leur score de statut) ; bots/méta sans vote (0) ne pèsent plus au numérateur.
    const oppWeight=S.agents.filter(a=>{const _va=_voteOf(a);const ad=_va>0.05?1:_va<-0.05?-1:0;return ad!==0&&ad!==posDir;}).reduce((s,a)=>s+(a.fitness||1),0)/totalFitness;
    const consRev=oppWeight>0.75&&effectiveConviction>0.55;

    const canBotClose = S.botAutoMode !== false;
    if(canBotClose && minHoldMet && (sigRev||timeClose||hardTime||consRev)){
      const why=(sigRev||consRev)?'Signal inversé':'Timeout';
      closePosition(botPos.id,true);
      // [DOUBLE JUGEMENT · 26/09/2026] plus de second jugement ici : closePosition (02) vient de juger les agents (source 'position', décroissance 1,3) — l'appel 'trade' qui suivait comptait le même trade DEUX fois (fitness, compétence par paire, souvenirs, régime)
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
    // [P2] la porte par régime a-t-elle fermé À CAUSE du malus éco ? (passe sans, refusé avec)
    if(_ecoMalus > 0 && finalSignalWithMem !== 0 && !convGate && dirGate &&
       effectiveConviction >= (_gates.conv + _expPenalty + _heatDelta + _newsDelta - _corrBonus - (S._convBoost || 0))) _ecoMalusTrace(pair, _ecoG);
    // [P3] la porte par régime a-t-elle fermé À CAUSE du créneau froid ? (passe sans, refusé avec)
    if(_heatDelta > 0 && finalSignalWithMem !== 0 && !convGate && dirGate &&
       effectiveConviction >= (_gates.conv + _expPenalty + _ecoMalus + _newsDelta - _corrBonus - (S._convBoost || 0))) _heatTrace(pair, _heatG, false);
    // [P7] la porte par régime a-t-elle fermé à CAUSE des news contre le pari ? (passe sans, refus avec)
    if(_newsDelta > 0 && finalSignalWithMem !== 0 && !convGate && dirGate &&
       effectiveConviction >= (_gates.conv + _expPenalty + _ecoMalus + _heatDelta - _corrBonus - (S._convBoost || 0))) _newsTrace(pair, _newsG, false);
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
      const _tpGuess = Math.max(0.6, effectiveConviction * 3.2 * (1 + volCV * 9)); // même formule que tpPctE
      const _adv = fiscalBotAdvicePerPair(pair, _tpGuess);
      _fiscalSeuilFactor = _adv.seuilFactor || 1.0;
      if (_adv.advice === 'défavorable' && (S.cycle % 8 === 0)) {
        S.chainLog.push({ icon:'💎', desc:`Bot Fiscal ${pair} · ${_adv.reason} · seuil durci ×${_fiscalSeuilFactor.toFixed(2)}`, hash:rndHash(), time:nowStr() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
    }
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  // Gain visé (même formule que le TP réel tpPctE plus bas), en fraction.
  const _tpFrac     = Math.max(0.6, effectiveConviction * 3.2 * (1 + volCV * 9)) / 100;
  // Gain net espéré = gain - frais aller-retour - impôt sur le gain net de frais.
  const _gainAfterFees = _tpFrac - _feePct;
  const _gainNet       = _gainAfterFees - Math.max(0, _gainAfterFees) * _taxPct;
  // Seuil de gain net minimum, durci par l'avis du bot fiscal (optimise sans interdire).
  const _minNetGain    = 0.0015 * _fiscalSeuilFactor;   // 0.15% net de base
  // ★ AGRESSIVITE (05/07/2026, validee par Rams : "plus de trades") ·
  // Seuil plein 0.40 -> 0.30 avec ZONE EXPLORATOIRE : entre 0.30 et 0.40 le bot
  // trade a MISE REDUITE (50->100% progressif). Justification : les pertes des
  // trades a conviction 26-36% venaient du SL place DANS le bruit (corrige depuis,
  // et encore elargi ci-dessous) ; les signaux reels tournent a 26-36% -> le 0.40
  // rejetait la quasi-totalite (9 trades en 3 jours) et neutralisait l'anti-
  // stagnation (_convBoost n'atteignait jamais ce gate). Demi-mise = plus de
  // trades + plus d'apprentissage reel, risque par trade contenu.
  // ★ REGLES REEL v2 (Rams 05/07) · en Reel, pas de zone exploratoire ni de
  // paris : ouverture seulement a conviction PLEINE (>= 0.40) ET sur une paire
  // dont l'expectancy APPRISE est positive NETTE de frais (20 dernieres clotures
  // AA + EV, source unique 10e6 _learnedNetUsd) — "tenter une session gagnante
  // avec des bases solides". Moins de 10 clotures apprises = pas de base = pas d'ouverture.
  if (S.tradingMode === 'real') {
    var _reSolid = false;
    if (effectiveConviction >= 0.40) {
      var _learnedNet = null;
      try { _learnedNet = _learnedNetUsd(pair); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
      _reSolid = !!(_learnedNet && _learnedNet.netUsd > 0);
    }
    if (!_reSolid) {
      learnFromOutcome('cycle', 0, pair);
      ps.qYes = Math.max(20, 100 + (ps.qYes - 100) * 0.95);
      ps.qNo  = Math.max(20, 100 + (ps.qNo  - 100) * 0.95);
      return;
    }
  }
  // ═══ DISJONCTEUR PAR PAIRE (26/07/2026) ═══
  // Constat sur 251 trades : SOL (-0.536 %/trade), AVAX (-0.370), DOGE (-0.264)
  // et ETH (-0.444) concentrent 89 % des pertes — le bot avait leur esperance
  // dans ses propres donnees sans jamais s'en servir pour moduler son engagement.
  // NET 06/09 : l'esperance lue est NETTE de frais (10e6, 20 dernieres clotures
  // du mode, >= 10). Une paire dont l'esperance nette est nettement negative doit fournir
  // une conviction plus forte, et n'engage qu'un quart de la mise (mode
  // observation : l'ecole continue d'apprendre, le portefeuille ne paie plus).
  // Reversible seul : des que l'esperance repasse au-dessus du seuil, tout
  // revient a la normale — aucune paire n'est bannie.
  // ALLOCATION PAR QUALITE (demande Rams 26/07 : "optimiser les mises au
  // maximum") : le capital ne doit pas etre disperse uniformement — il va la ou
  // le bot GAGNE. Trois regimes, tous fondes sur l'esperance apprise :
  //   esperance < -0.15 %/trade  -> observation : quart de mise, conviction +0.12
  //   esperance > +0.03 %/trade  -> conviction prouvee : mise x1.8
  //   entre les deux             -> mise normale
  // Le plafond global (compte moins la couverture des frais) borne toujours
  // l'ensemble : concentrer n'est pas sur-engager.
  var _pairExp = 0, _pairWatch = false, _pairGood = false;
  if (_netExp) {
    _pairExp   = _netExp.netPct;
    _pairWatch = _pairExp < -0.15;
    _pairGood  = _pairExp > 0.03;
  }
  window._pairWatchMult = _pairWatch ? 0.25 : (_pairGood ? 1.8 : 1);
  const _convFloor = (0.30 - Math.min(0.04, (S._convBoost || 0) * 0.5)) + (_pairWatch ? 0.12 : 0) - _corrBonus + _ecoMalus + _heatDelta + _newsDelta;
  // [P1] le bonus a-t-il été DÉCISIF ? (le trade passe avec, il n'aurait pas passé sans)
  const _corrDecisive = _corrBonus > 0 && (
    effectiveConviction < (_gates.conv + _expPenalty + _ecoMalus + _heatDelta + _newsDelta - (S._convBoost || 0)) ||
    effectiveConviction < (_convFloor + _corrBonus));
  // [P3] le créneau d'or a-t-il été DÉCISIF ? (le trade passe avec, il n'aurait pas passé sans)
  const _heatDecisive = _heatDelta < 0 && (
    effectiveConviction < (_gates.conv + _expPenalty + _ecoMalus + _newsDelta - _corrBonus - (S._convBoost || 0)) ||
    effectiveConviction < (_convFloor - _heatDelta));
  // [P7] les news pour le pari ont-elles été DÉCISIVES ? (le trade passe avec, il n'aurait pas passé sans)
  const _newsDecisive = _newsDelta < 0 && (
    effectiveConviction < (_gates.conv + _expPenalty + _ecoMalus + _heatDelta - _corrBonus - (S._convBoost || 0)) ||
    effectiveConviction < (_convFloor - _newsDelta));
  if(_gainNet < _minNetGain || effectiveConviction < _convFloor) {
    // [P2] le plancher a-t-il fermé À CAUSE du malus éco ?
    if(_ecoMalus > 0 && _gainNet >= _minNetGain && effectiveConviction >= (_convFloor - _ecoMalus)) _ecoMalusTrace(pair, _ecoG);
    // [P3] le plancher a-t-il fermé À CAUSE du créneau froid ?
    if(_heatDelta > 0 && _gainNet >= _minNetGain && effectiveConviction >= (_convFloor - _heatDelta)) _heatTrace(pair, _heatG, false);
    // [P7] le plancher a-t-il fermé à CAUSE des news contre le pari ?
    if(_newsDelta > 0 && _gainNet >= _minNetGain && effectiveConviction >= (_convFloor - _newsDelta)) _newsTrace(pair, _newsG, false);
    learnFromOutcome('cycle', 0, pair);
    ps.qYes = Math.max(20, 100 + (ps.qYes - 100) * 0.95);
    ps.qNo  = Math.max(20, 100 + (ps.qNo  - 100) * 0.95);
    return;
  }
  if(!ps.userCycleSet) {
    // ★ (05/07) la taxe est DEJA comptee dans _gainNet ci-dessus : la garder aussi
    // dans le seuil LMSR = double comptage qui poussait threshold au plafond en
    // regime speculatif. Le seuil ne depend plus que des frais reels + conviction.
    const optThr = Math.min(0.65, Math.max(0.52, 0.50 + _feePct * 6 + effectiveConviction * 0.10));
    if(Math.abs(optThr - (ps.threshold||0.65)) > 0.02) {
      ps.threshold = Math.round(optThr * 100) / 100;
      const _pk2 = pair.replace('/','_');
      const _thl = document.getElementById('ac2_thrlbl_'+_pk2);
      if(_thl) _thl.textContent = (ps.threshold*100).toFixed(0)+'% · '+fmtDur(ps.cycleMax);
    }
  }
  const side = action==='buy'?'long':'short';
  // ★ MISES PROPORTIONNELLES (06/07/2026, constat Rams) · l'ancien plancher
  // FIXE de 10 $ ecrasait tout le calcul : sur un compte de ~52 $, chaque mise
  // = 20 % du capital quel que soit le contexte. Desormais le plancher est
  // RELATIF (5 % du compte, minimum absolu 2 $ pour rester au-dessus des
  // frais) — les mises suivent ton argent, a la baisse comme a la hausse.
  // Si tu regles une mise par paire dans l'UI (ps.stake > 0), elle est respectee.
  // FIX 08/07 : le stake "10" est le DEFAUT D'EPOQUE pose sur toutes les
  // paires (16/16 dans les donnees), PAS un choix utilisateur — il est ignore
  // et le plancher proportionnel s'applique. Toute AUTRE valeur > 0 = reglage
  // volontaire, respecte tel quel.
  // ═══ ENGAGEMENT QUASI-TOTAL (politique Rams, renforcee le 26/07) ═══
  // "le bot mise la totalite presque, pas d'argent qui dort dans le compte".
  // La mise n'est plus un petit pourcentage fixe : c'est la PART DU CAPITAL
  // LIBRE revenant a cette paire. Capital libre = compte moins la couverture
  // des frais, moins ce qui est deja engage. Divise par les emplacements encore
  // ouverts (plancher 2 : une seule paire eligible peut prendre la moitie).
  // Le reglage de mise de l'UI (ps.stake) devient un PLANCHER, plus un plafond.
  // La qualite de la paire module ensuite (x1.8 gagnante / x0.25 perdante).
  var _stkBase;
  try {
    var _acc   = S.tradingAccount || 0;
    var _capT  = Math.max(0, _acc - Math.max(1, _acc * 0.02));
    var _eng   = (S.openPositions || []).reduce(function(a, p){ return a + (Number(p.stakeUsdt) || 0); }, 0);
    var _free  = Math.max(0, _capT - _eng);
    var _held  = {};
    (S.openPositions || []).forEach(function(p){ if (p && p.pair) _held[p.pair] = 1; });
    var _slots = Object.keys(S.pairStates || {}).filter(function(k){ return !_held[k]; }).length;
    var _share = _free / Math.max(2, _slots);
    var _floor = (ps.stake && ps.stake > 0) ? ps.stake : 0;
    _stkBase = Math.max(_floor, _share);
  } catch(e) { _stkBase = Math.max(2, (S.tradingAccount || 0) * 0.05); }
  const stakeBase = _stkBase * (window._pairWatchMult || 1);
  const lmsrBonus  = (action==='buy' && adjProb > 0.52) || (action==='sell' && adjProb < 0.48) ? 1.20 : 1.0;
  const kellyFrac  = Math.min(0.15, effectiveConviction * 0.35);
  const maxStake   = S.tradingAccount * kellyFrac * lmsrBonus;
  const convScale  = 0.40 + (0.60 * effectiveConviction);
  // ── Throttle par PERFORMANCE de paire ──────────────────────────────────────
  //   On mise MOINS sur les paires qui perdent durablement (signal = expectancy
  //   NETTE % de la mise par trade, 10e6, 20 dernieres clotures du mode, >= 10).
  //   Asymetrique securite : reduit les perdantes (plancher 0.35, jamais coupe ->
  //   continue d'apprendre), ne booste JAMAIS les gagnantes (plafond 1.0).
  //   Ex. : -0.61 %/tr net -> x0.70, -1.19 % -> x0.41 ; les gagnantes restent a x1.0.
  let _perfMult = 1.0;
  if (_netExp) _perfMult = Math.max(0.35, Math.min(1.0, 1 + _netExp.netPct * 0.5));
  // Mise progressive de la zone exploratoire : 50% a 0.30, 100% a partir de 0.40.
  const _convStakeMult = effectiveConviction >= 0.40 ? 1.0
    : Math.max(0.5, 0.5 + 0.5 * (effectiveConviction - 0.30) / 0.10);
  const stakeRaw   = Math.max(stakeBase, maxStake * convScale) * _perfMult * _convStakeMult;
  let   stakeUsdt  = Math.round(stakeRaw*adxFilter*volFilter*10)/10;
  // ★ POLITIQUE DE CAPITAL (edictee par Rams 06/07/2026) ·
  // (A) QUASI-TOTALITE INVESTIE : l'argent du compte trading travaille — on ne
  //     garde que la couverture des frais de cloture (2 % du compte, min 1 $).
  //     Remplace le cap 50 % : "si y a de l'argent, pourquoi pas l'investir".
  // (C) LEVIER si le bot manque de fonds ET analyse favorable >= 85 % : la mise
  //     passe telle quelle, le chemin d'emprunt existant (09c) finance le
  //     manque via borrowLeverage — rembourse a la cloture, interets comptes.
  //     Respecte la protection existante : jamais d'emprunt si l'index levier
  //     utilisateur est a x0.
  window._levOpenOK = false;
  try {
    const _t = S.tradingAccount || 0;
    const _capExpo = Math.max(0, _t - Math.max(1, _t * 0.02));
    const _levOK = effectiveConviction >= 0.85 && (S.leverage || 0) >= 1;
    // FIX 08/07 : l'exposition deja ENGAGEE se soustrait du plafond — la
    // version du 06/07 l'avait perdue en remplacant le cap 50 % (le plafond
    // etait devenu par-trade au lieu de global).
    const _engaged = (S.openPositions || []).reduce(function(sum, p){ return sum + (Number(p.stakeUsdt) || 0); }, 0);
    const _room = Math.max(0, _capExpo - _engaged);
    if (_room < 2 && !_levOK) {
      learnFromOutcome('cycle', 0, pair);
      return;
    }
    if (stakeUsdt > _room && !_levOK) stakeUsdt = Math.round(_room * 10) / 10;
    if (stakeUsdt < 2 && !_levOK) {
      learnFromOutcome('cycle', 0, pair);
      return;
    }
    window._levOpenOK = _levOK;
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  
  let finalStake = stakeUsdt;
  if (S.tradingMode === 'paperReal' && typeof _checkPaperRealStakeLimit === 'function') {
    finalStake = _checkPaperRealStakeLimit(stakeUsdt, pair, side);
  }

  const tpPctE=Math.max(0.6,effectiveConviction*3.2*(1+volCV*9));   // ★ 05/07 : TP plancher 0.7->0.6% (plus atteignable, reste >4x le gain net minimum)
  // SL adapté à la volatilité : placé HORS du bruit du marché (1.2× le bruit), mais
  // borné à TP/1.5 pour garder un ratio gain/perte favorable (>= 1.5). L'ancien
  // SL = TP×0.42 (0.35-1.1%) tombait DANS le bruit crypto (±0.5-1%/min) : touché par
  // le bruit, le trade sortait en perte puis le prix repartait dans le bon sens.
  const _slNoise = (volCV * 100) * 1.4;   // ★ 05/07 : 1.2x -> 1.4x le bruit (le journal montrait encore des sorties-bruit a -0.5/-0.9%)
  const slPctE   = Math.max(0.45, Math.min(_slNoise, tpPctE / 1.4));   // plancher 0.35->0.45, ratio min 1.4 (gain/perte reste favorable)
  const tpE   =ps.price*(1+(side==='long'?1:-1)*tpPctE/100);
  const slE   =ps.price*(1-(side==='long'?1:-1)*slPctE/100);

  autoOpenPosition(pair, side, finalStake);

  const np = S.openPositions.find(p => p.pair===pair && p.auto===true);
  // ★ (05/07/2026) si l'ouverture n'a PAS eu lieu (garde mode REEL, fonds
  // insuffisants, ...), on s'arrete la : plus de log "BOT LONG" ni de toast
  // fantomes annoncant un trade qui n'existe pas.
  if(!np) return;
  np.tp=tpE; np.sl=slE; np._holdCycles=0;
  // [P1] trace de diversification : ouverture obtenue grâce au bonus anti-corrélé
  if(_corrDecisive){
    S.chainLog.push({icon:'🔗',
      desc:`Diversification · ${pair} ${side.toUpperCase()} ouvert grâce au bonus −${CORR_DIVERSIFY_BONUS.toFixed(2)} · corr ${(_corrG.corr>=0?'+':'')}${_corrG.corr.toFixed(2)} avec ${_corrG.withPair} ${String(_corrG.withSide).toUpperCase()}`,
      hash:rndHash(),time:nowStr()});
  }
  // [P3] trace heatmap : ouverture obtenue grâce au créneau d'or
  if(_heatDecisive) _heatTrace(pair, _heatG, true);
  // [P7] trace news : ouverture obtenue grâce aux news pour le pari
  if(_newsDecisive) _newsTrace(pair, _newsG, true);

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

// ═══ GARDE-FOU PERTE MAX (06/07/2026) · regle Rams : "le bot surveille et
// stoppe si perte trop importante, meme si je l'ai oublie" ═══
// Les cycles ne voyaient les stops qu'a LEUR resolution : SOL -7.38 % et
// ETH -3.92 % ont traverse leur SL pendant la fenetre et mange les gains d'AA.
// Ce balayage independant passe CHAQUE SECONDE sur les positions de CHAQUE
// mode en play (bascule atomique, comme le multiplexeur) : toute position dont
// la perte prix depasse le plafond est fermee immediatement.
// Plafond par position : 2x le SL prevu, borne entre 1.5 % et 3 %.
// Positions manuelles : fermees aussi (c'est TA protection qui s'execute) —
// closePosition(id, false) car la garde interne refuse botClose sur du manuel.
// ★ 26/07 perf : plus de minuterie propre. Le garde-fou est expose et appele
// par le battement principal (08), une fois toutes les 3 secondes : zero
// reveil supplementaire, meme protection.
// ═══ [1b-a · 14/09/2026] SORTIES DES POSITIONS BOT HORS RÉSOLUTION (_botExitSweep) ═══
// Jusqu'ici TP / SL / breakeven des positions auto vivaient DANS _resolvePairCycleCore : vérifiés uniquement à la
// résolution du cycle — en EV/RE, seulement quand une nouvelle bougie Binance se ferme (10g/08). Série figée =
// aucune sortie, jamais (audit 14/09 : DOT et DOGE sous leur SL depuis 2 jours). Ce balayage tourne dans le
// battement (08), pour le mode TRAITÉ (le même passage que _applyPaperRealProtection : mode affiché à chaque tick,
// modes d'arrière-plan 1 tick sur 3), sur ps.price. Cibles : pos._tpPct / pos._slPct écrites par la résolution
// (conviction + volatilité du moment) ; repli pour une position antérieure : conviction d'ouverture. Sémantique
// INCHANGÉE : SL immédiat, TP après 5 cycles de détention, breakeven-stop au-delà de 45 % du TP, canBotClose.
// [1b-a HOTFIX · 14/09/2026 soir] ferme la position et VÉRIFIE qu'elle a disparu de S.openPositions. Sinon : marque
// pos._exitFailAt (prochain essai dans 60 s), journalise UNE fois (puis 1 fois sur 10) la raison — nom, message et
// première ligne de pile de l'exception s'il y en a une, ou « sans erreur mais toujours ouverte » — et renvoie false.
// Source unique pour _botExitSweep et _lossCapSweep. Le journal nomme la racine ; le balayage ne l'amplifie plus.
function _closeCompleted(pos, label) {
  if (pos._exitFailAt && (Date.now() - pos._exitFailAt) < 60000) return false;
  var err = null;
  try { closePosition(pos.id, pos.auto === true); } catch(e) { err = e; }
  var gone = !(S.openPositions || []).some(function(p){ return p && p.id === pos.id; });
  if (gone) return true;
  pos._exitFailAt = Date.now();
  pos._exitFails = (pos._exitFails || 0) + 1;
  var why = err ? (String(err.name || 'Error') + ': ' + String(err.message || err) + ' @ ' + String((err.stack || '').split('\n')[1] || '').trim().slice(0, 90))
                : 'closePosition sans erreur mais position toujours ouverte';
  try {
    if ((pos._exitFails === 1 || pos._exitFails % 10 === 0) && S.chainLog) {
      S.chainLog.push({ icon: '\u26A0', desc: 'Fermeture non aboutie \u00b7 ' + pos.pair + ' \u00b7 ' + label + ' \u00b7 essai ' + pos._exitFails + ' \u00b7 ' + why,
        hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
  } catch(e) {}
  try { window._decErr && window._decErr(err || new Error('fermeture non aboutie ' + pos.pair)); } catch(e) {}
  return false;
}
window._closeCompleted = _closeCompleted;

window._botExitSweep = function _botExitSweep() {
  try {
    if (!S || !S.openPositions || !S.pairStates) return;
    if (S.botAutoMode === false) return;   // canBotClose, même règle qu'à la résolution
    S.openPositions.slice().forEach(function(pos){
      if (!pos || pos.auto !== true) return;
      var ps = S.pairStates[pos.pair];
      var px = ps ? Number(ps.price) : 0, entry = Number(pos.entryPrice);
      if (!px || !entry) return;
      var isLong = pos.side === 'long';
      var pnlPct = isLong ? (px - entry) / entry * 100 : (entry - px) / entry * 100;
      var pnlUsd = (Number(pos.stakeUsdt) || 0) * (pnlPct / 100);
      pos.pnl = pnlPct; pos.pnlUsdt = pnlUsd; pos.currentVal = (Number(pos.stakeUsdt) || 0) + pnlUsd;
      var tpHit, slHit, why;
      // ═══ [STOP CÔTÉ EXCHANGE SIMULÉ · 26/09/2026] décision Rams (« oui aux deux ») ═══
      // En papier, le stop vit dans l'app : sans réseau, aucune protection (PEPE 24/09 : prix figé 1 h, −5,13 % au retour au lieu de −2).
      // En réel, le stop sera posé chez Binance (à livrer avec le mode RE) et exécuté AU stop pendant la coupure. L'EV imite ce réel
      // protégé : au premier prix frais après une coupure (pos._pathStale > 0, posé par 10i quand le prix réel a plus de 2 min),
      // si le prix a traversé le stop, la position est comptée fermée AU stop — pas au prix de retour. Si le prix n'a pas traversé,
      // rien : on ne sait pas ce que la mèche a fait, on suppose que non.
      if (S.tradingMode === 'paperReal' && pos._pathStale > 0 && typeof _rcPriceAge === 'function' && _rcPriceAge(pos.pair) <= 120000) {
        var _staleTicks = pos._pathStale; pos._pathStale = 0;
        if (isFinite(pos.sl) && pos.sl > 0 && (isLong ? px <= pos.sl : px >= pos.sl)) {
          pos._forcedExitPx = pos.sl;
          var _slPnl = (isLong ? (pos.sl - entry) / entry : (entry - pos.sl) / entry) * 100;
          pos._ruleExit = { kind: 'stop_exchange', at: Math.round(_slPnl * 1000) / 1000, t: Date.now() };
          if (!_closeCompleted(pos, 'bot stop exchange simul\u00e9 (coupure)')) { delete pos._forcedExitPx; return; }
          try { S.chainLog.push({ icon: '\uD83D\uDD0C', desc: 'Stop c\u00f4t\u00e9 exchange (simul\u00e9) \u00b7 ' + pos.pair + ' ' + String(pos.side).toUpperCase() + ' \u00b7 coupure ' + Math.round(_staleTicks / 60) + ' min, prix revenu \u00e0 ' + pnlPct.toFixed(2) + ' % \u2192 compt\u00e9 au stop ' + _slPnl.toFixed(2) + ' %', hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() }); if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100); } catch(e) {}
          return;
        }
      }
      // [MÉMOIRE DES CHEMINS · 22/09/2026] HORIZON APPRIS : si la règle de la paire est armée par ses propres chemins
      // (10i _horizonRefresh) et que la position est encore négative passé H minutes, elle est fermée ici — avant les
      // niveaux. Sans règle armée (pas de chemins, ou chemins qui ne prouvent rien) : rien ne change.
      var _hz = (typeof _horizonExit === 'function') ? _horizonExit(pos, pnlPct, Date.now()) : null;
      if (_hz) {
        pos._ruleExit = { kind: 'horizon', at: Math.round(pnlPct * 1000) / 1000, t: Date.now() };   // [VÉRITÉ DES RÈGLES · 23/09/2026]
        if (!_closeCompleted(pos, 'bot ' + _hz.why)) return;
        try { S.chainLog.push({ icon: '\u23F3', desc: 'Sortie horizon \u00b7 ' + pos.pair + ' ' + String(pos.side).toUpperCase() + ' \u00b7 ' + _hz.why + ' \u00b7 @' + pnlPct.toFixed(2) + ' %', hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() }); if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100); } catch(e) {}
        return;
      }
      // [GAIN APPRIS · 23/09/2026] si la règle de gain de la paire est armée par ses propres chemins (10i _gainRefresh) :
      // pic atteint ≥ m et P&L retombé à f × pic → fermée ici, avant les niveaux. Sans règle armée : rien ne change.
      var _ga = (typeof _gainExit === 'function') ? _gainExit(pos, pnlPct) : null;
      if (_ga) {
        pos._ruleExit = { kind: 'gain', at: Math.round(pnlPct * 1000) / 1000, t: Date.now() };   // [VÉRITÉ DES RÈGLES · 23/09/2026]
        if (!_closeCompleted(pos, 'bot ' + _ga.why)) return;
        try { S.chainLog.push({ icon: '\uD83D\uDD12', desc: 'Sortie gain \u00b7 ' + pos.pair + ' ' + String(pos.side).toUpperCase() + ' \u00b7 ' + _ga.why + ' \u00b7 @' + pnlPct.toFixed(2) + ' %', hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() }); if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100); } catch(e) {}
        return;
      }
      // [STOP APPRIS · 23/09/2026] stop de la paire décidé par ses creux (10i _stopRefresh) : P&L ≤ −d → fermée ici,
      // avant le stop ATR (qui reste la borne extérieure). Sans règle armée : rien ne change.
      var _st = (typeof _stopExit === 'function') ? _stopExit(pos, pnlPct) : null;
      if (_st) {
        pos._ruleExit = { kind: 'stop', at: Math.round(pnlPct * 1000) / 1000, t: Date.now() };   // [VÉRITÉ DES RÈGLES · 23/09/2026]
        if (!_closeCompleted(pos, 'bot ' + _st.why)) return;
        try { S.chainLog.push({ icon: '\uD83D\uDED1', desc: 'Sortie stop appris \u00b7 ' + pos.pair + ' ' + String(pos.side).toUpperCase() + ' \u00b7 ' + _st.why + ' \u00b7 @' + pnlPct.toFixed(2) + ' %', hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() }); if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100); } catch(e) {}
        return;
      }
      var hasLv = isFinite(pos.sl) && pos.sl > 0 && isFinite(pos.tp) && pos.tp > 0;
      if (hasLv) {
        // ═══ [A13 · 17/09/2026] RÈGLE UNIQUE DE SORTIE : les niveaux pos.sl / pos.tp (ATR × multiplicateurs des bras A/B, 09d1),
        // exécutés sur ps.price à chaque tick. Avant : ces niveaux — ceux que l'A/B fait varier depuis des semaines — n'étaient
        // jamais comparés au prix pour une position auto (seul le % de conviction fermait), et le breakeven déplaçait un pos.sl
        // que personne ne lisait. Breakeven : à 45 % du chemin entrée → TP, le SL passe à l'entrée ± 0,1 % (et il est exécuté).
        slHit = isLong ? (px <= pos.sl) : (px >= pos.sl);
        tpHit = isLong ? (px >= pos.tp) : (px <= pos.tp);
        var dist = Math.abs(pos.tp - entry), prog = isLong ? (px - entry) : (entry - px);
        if (!slHit && !tpHit && dist > 0 && prog >= 0.45 * dist) {
          var beL = entry * (1 + (isLong ? 0.001 : -0.001));
          if (isLong ? (pos.sl < beL) : (pos.sl > beL)) { pos.sl = beL; pos._beAt = Date.now(); }
        }
        if (!(slHit || tpHit)) return;
        var fmtPx = function(v){ return v >= 1 ? v.toFixed(4) : v.toPrecision(4); };
        why = tpHit ? 'TP ' + fmtPx(pos.tp) : 'SL ' + fmtPx(pos.sl) + (pos._beAt ? ' (breakeven)' : '');
      } else {
        // Repli (AA, ou position EV avant que 09d1 n'ait posé ses niveaux — le tick suivant l'ouverture) : le % de conviction
        // écrit par la résolution (_tpPct/_slPct) — sémantique 1b-a inchangée : SL immédiat, TP après 5 cycles, breakeven 45 %.
        var tpPct = (isFinite(pos._tpPct) && pos._tpPct > 0) ? pos._tpPct : Math.max(1.2, (Number(pos.conviction) || 0.4) * 4.5);
        var slPct = (isFinite(pos._slPct) && pos._slPct > 0) ? pos._slPct : Math.max(0.6, tpPct * 0.35);
        if (pnlPct > tpPct * 0.45) {
          var be = entry * (1 + (isLong ? 0.001 : -0.001));
          if (isLong  && (!pos.sl || pos.sl < be)) pos.sl = be;
          if (!isLong && (!pos.sl || pos.sl > be)) pos.sl = be;
        }
        tpHit = pnlPct >= tpPct;
        slHit = pnlPct <= -slPct;
        var minHoldMet = (pos._holdCycles || 0) >= 5;
        if (!(slHit || (minHoldMet && tpHit))) return;
        why = tpHit ? 'TP +' + tpPct.toFixed(1) + '%' : 'SL \u2212' + slPct.toFixed(1) + '%';
      }
      // [1b-a HOTFIX · 14/09/2026 soir] UNE FERMETURE QUI N'ABOUTIT PAS NE SE RÉESSAIE PAS À CHAQUE TICK.
      // closePosition (02) sauvegarde l'état, incrémente les stats, juge les agents (learnFromOutcome 'position')
      // PUIS retire la position en dernier : si quelque chose lève entre-temps, la position reste ouverte et ce
      // balayage (à chaque seconde) recommençait — sauvegarde + stats + pénalité pour tous les agents, ~170 fois
      // en 3 min : les 9 bots au plancher 50 (capture Rams 14/09 21:58). Désormais : 1 essai / 60 s par position,
      // et rien n'est enseigné tant que la position n'est pas réellement fermée ; la cause est nommée au journal.
      if (!_closeCompleted(pos, 'bot ' + why)) return;
      // [DOUBLE JUGEMENT · 26/09/2026] idem : _closeCompleted → closePosition a jugé (source 'position') ; le second jugement 'trade' est retiré
      try { showToast((pnlPct >= 0 ? '\uD83D\uDCB0' : '\uD83D\uDCC9') + ' Bot ' + pos.pair + ' ' + why + ' \u00b7 ' + (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2) + '%'); } catch(e) {}
      if (ps) { ps.qYes = 100 + Math.floor(Math.random() * 20); ps.qNo = 100 + Math.floor(Math.random() * 20); }
    });
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
};

window._lossCapSweep = function _lossCapSweep() {
  try {
    if (!S || !S.walletStore || !window._isModeRunning) return;
    var _disp = S.tradingMode;
    var _modes = [];
    ['sim','paperReal','real'].forEach(function(_m){
      if (_m === _disp || window._isModeRunning(_m)) _modes.push(_m);
    });
    _modes.forEach(function(_m){
      var _sw = (_m !== _disp);
      if (_sw) S.tradingMode = _m;
      try {
        (S.openPositions || []).slice().forEach(function(pos){
          var ps = S.pairStates && S.pairStates[pos.pair];
          var px = ps ? Number(ps.price) : 0;
          var entry = Number(pos.entryPrice);
          if (!px || !entry) return;
          var _sd = String(pos.side || '').toLowerCase();
          var isLong = _sd.indexOf('long') === 0 || _sd === 'buy';
          var pnlPct = isLong ? (px - entry) / entry * 100 : (entry - px) / entry * 100;
          var slPct = 1.0;
          if (pos.sl && Number(pos.sl) > 0) slPct = Math.abs(entry - Number(pos.sl)) / entry * 100;
          var cap = Math.min(3, Math.max(1.5, 2 * slPct));
          if (pnlPct <= -cap) {
            try {
              if (S.chainLog) {
                S.chainLog.push({ icon:'\u26D4', desc:'Perte max \u00b7 ' + pos.pair + ' ferm\u00e9 \u00e0 ' + pnlPct.toFixed(2) + '% (plafond ' + cap.toFixed(1) + '%)',
                  hash: Math.random().toString(36).slice(2,8), time: new Date().toLocaleTimeString() });
                if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
              }
            } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
            // [1b-a HOTFIX · 14/09/2026 soir] même garde que _botExitSweep : 1 essai / 60 s si la fermeture n'aboutit pas
            if (!_closeCompleted(pos, 'perte max ' + cap.toFixed(1) + '%')) return;
            try { showToast('\u26D4 Perte max \u00b7 ' + pos.pair + ' ' + pnlPct.toFixed(1) + '%', 4000, 'loss'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
          }
        });
      } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
      if (_sw) S.tradingMode = _disp;
    });
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
};