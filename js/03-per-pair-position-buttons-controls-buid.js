// [DÉGEL DES VOIX · 02/10/2026] VERSION 20261002a · les voix lisent ce qu'elles croient lire : RSI / Bollinger (raw.rsi.value, raw.boll.pct — toujours 50 / 0,5 avant), un statut de gardien n'est plus un sens (feu vert, alerte, veto = 0 ; avant +0,05 / −0,2 / −0,5 ; record de security_v1 effacé une fois), Évolueur sur les 5 derniers trades du système, corr_v1 et macro_v1 × corrélation de la paire à BTC, nlp_v1 relatif au ton de toutes les news, fundamental_v1 depuis le taux de base de Binance ; gènes jamais exercés remis au départ, historique compris (une fois) ; un bouche-trou ne fait plus abandonner un trade virtuel (_thWalk attend la réparation) ; volume_v1 ne compare plus deux sources de volume
// [HORLOGE PAR MODE · 01/10/2026] VERSION 20261001a · EV et RE ont chacun leur cycle à chaque bougie close (02) ; ce qui est appris d'une bougie l'est une fois, sur un seul pas de temps — même pas de temps : le premier mode qui arrive note (trade virtuel, votes aux horizons), juge les votes à la bougie suivante (_dcFwdFirst) et joue la manche du marché, l'autre suit son prix sans miser ; deux pas de temps : bilan des voix, jugement et marché suivent le plus court des modes en jeu (_thBrainF : en marche ou affiché), le seuil reste par pas de temps (_thNote : + le pas de temps) ; une photo des votes n'est jugée que sur les 4 bougies qui la suivent au plus
// [MARCHÉ RÉPARÉ · 30/09/2026] VERSION 20260930a · le marché des agents tel qu'il a été conçu (EV / RE) : une manche par paire et par bougie close — chaque agent mise ses T$ sur SON vote de la paire (croyance 0,5 + vote / 2, au plus 8 % de ses T$ répartis sur les paires actives), vrai prix LMSR (b = 100, départ 50/50), solde à la clôture de la bougie en cours (part juste = 1 T$ ; manche nulle = mises rendues), puis 50/50 ; les T$ restent au siège (plus de remise à la fitness) ; le prix = voix « marche » de la décision commune, jugée comme le composite (_mktCycle, _mktOpen, _mktSettle, _mktBet, _mktVote, _dcJudgeMarket) ; clôture sûre seulement si la bougie suivante est là, contiguë, pas un bouche-trou (sinon nulle) ; syncPairPresets : la cadence de lecture d'une paire ne suit plus le prix en EV / RE
// [OPÉRATEUR APPRIS · 28/09/2026] VERSION 20260928d · la source de chaque naissance (07) est choisie parmi trois — R recombinaison avec la meilleure version passée + mutation (l'opérateur d'avant, byte-identique), B retour à la meilleure version passée du siège telle quelle, M mutation seule — et jugée sur les mêmes essais que l'évolution apprise (_genomeEvolve(…, op), _evoOpStats, _evoOpPick) : source prouvée bénéfique → c'est elle (une naissance sur deux aux sources encore à juger) ; source prouvée nuisible écartée, la preuve tenue jusqu'à 5 jours après sa plus jeune observation (une naissance libre de la source la rend aux données) ; sinon rotation par siège (B seulement si le siège a une version passée complète où revenir). L'observation de la règle porte la source (index 7) ; écran 🧠 Appris
// [ÉVOLUTION APPRISE · 28/09/2026] VERSION 20260928c · les déclencheurs de l'évolution (03 : plus faible sous 150 tout de suite, tous les 15 cycles, sous 300 tous les 8 cycles ; 08 : sous 300, stagnation sous 400) lisent une règle apprise sur ce que les évolutions ont rapporté (essai nouveau génome contre ancien, une observation par évolution jugée : fitness du siège à l'évolution, écart, créneau de 4 h, déclencheur) — gain prouvé sous un niveau F* : tout siège de fitness ≤ F* est recyclable tout de suite (le gain ÉTEND ; au-dessus de F*, rien n'est prouvé : les nombres posés à la main restent) ; nuisance prouvée sous H* : plus d'évolution automatique d'un siège ≤ H* tant que la preuve tient (elle meurt avec ses données : 5 jours au plus sans nouvelle observation) — le plus faible RECYCLABLE est recyclé ; rien de prouvé : les nombres posés à la main, tels quels (repli). Même preuve que le seuil (_thEval) ; observations gardées 5 jours (S.evoRule, persisté)
// [MARCHÉ LMSR À PART · 28/09/2026] VERSION 20260928b · le marché LMSR (08) ne débite plus la fitness — le jugement (porte unique _fitCurrent) en est la seule écriture courante ; à chaque évaluation avec preuve (jugement, abstention, recompute) elle recharge le portefeuille de marché du siège (_lmsrRefill, 08) : le marché garde sa dynamique d'avant ; la fitness, elle, ne bouge plus entre deux jugements
// [FITNESS AUX HORIZONS · 28/09/2026] VERSION 20260928a · la fitness d'un siège (ce qui décide l'évolution : le plus faible est recyclé ; aussi le tournoi des parents, la pépinière, la sortie « signal inversé », l'affichage) suit son bilan aux horizons — le même record que le poids de sa voix (20260927k) : 350 + 1 000 × moyenne des E_h — tant qu'un garde-fou appris propre à la fitness ne prouve pas que la fitness de la bougie retirait de plus mauvais sièges (le siège que chaque définition retirerait est comparé sur ses votes suivants pesés par leur conviction, par horizon et par pas de temps ; une seule définition vivante par siège : un retour prouvé à un pas de temps vaut pour tous) ; les bots et l'Évolueur gardent leur propre jugement ; rien de plus n'est tradé
// [BILAN AUX HORIZONS · 27/09/2026] VERSION 20260927k · chaque voix de la décision commune (agents, bots, analyse tech. + fond.) est jugée sur les deux trades virtuels de la paire — long et short, 15 min à 4 h, chacun sa perte max, mêmes règles que le seuil appris : ce que son sens a rapporté de plus que l'autre (les frais, payés des deux côtés, s'annulent) — et la décision commune la pèse sur ce bilan au lieu de la bougie suivante ; garde-fou appris (écart apparié des deux pesées, preuve du seuil) ; le bilan d'un siège repart de zéro à son évolution ; mesuré, rien n'est tradé de plus
// [SENS CONTRAIRE · 27/09/2026] VERSION 20260927j · chaque décision de cycle (EV / RE) est aussi jugée dans le SENS CONTRAIRE comme trade virtuel à 5 horizons (sa propre perte max, même preuve, listes à part), sur les seules décisions notées à partir de cette version — mesuré seulement, rien n'est tradé dans ce sens ; le sens décidé est inchangé (go Rams 27/09 19:31)
// [HORIZONS APPRIS · 27/09/2026] VERSION 20260927i · chaque décision de cycle (EV / RE) jugée à 5 horizons (1, 2, 4, 8, 16 bougies = 15 min à 4 h en 15 min) avec la perte max du vrai trade ; un seuil prouvé par horizon et par pas de temps (5 niveaux de conviction, ≥ 30 trades et ≥ 20 créneaux, Student au niveau Φ(−2) / 25) ; _thPick choisit l'horizon à tenir (la meilleure moyenne par bougie tenue parmi ceux que la conviction atteint)
// [SEUIL APPRIS · 27/09/2026] VERSION 20260927h · moteur du seuil d'ouverture appris : chaque décision de cycle (EV / RE) devient un trade virtuel (entrée au dernier prix réel, sortie H bougies plus tard, net de frais) jugé sans jamais inventer de prix (_thNote / _thJudge) ; le seuil = le niveau de conviction dont les trades virtuels ont prouvé gagner (≥ 30 trades, ≥ 10 créneaux, moyenne au-dessus de zéro de plus de 2 erreurs types prises par créneau, recouvrement compris), sinon marché fermé (_thEval / _thLevel)
// [DÉCISION COMMUNE · 27/09/2026] VERSION 20260927g · moteur de la décision commune : voix de chaque bot sur LA paire (_botView), bilan mesuré (_dcMerit), consensus (_dcConsensus), bilan pris SUR L'AVENIR (_dcForwardJudge : votes du cycle précédent jugés sur le mouvement survenu depuis) ; _agentPairVote lit le vote tel qu'il était au moment du pari
// [FREIN · 27/09/2026] VERSION 20260927f · commentaire de _botStakeMult : un bot au bilan négatif (mult 0) n'ouvre plus en EV (04) — sa « mise minimum » (plancher, 5 % du compte) valait la mise normale
// [SANS PLAFOND 15 % · 27/09/2026] VERSION 20260927c · commentaire de _botStakeMult : plus de plafond 15 % (la mise d'un bot est bornée par la politique de capital de l'entonnoir, comme tout trade)
// [MISE AU MÉRITE · 27/09/2026] VERSION 20260927b · _botStakeMult : la mise d'un bot suit son mérite mesuré — minimum s'il se trompe (précision pondérée ≤ 50 %), plus seulement si son avantage est PROUVÉ (borne basse de Wilson à 95 % > 50 %), sinon mise de base
// [SURVEILLANCE PERMANENTE · 27/09/2026] VERSION 20260927a · flotte au rythme du système (_fleetHeartbeat, par mode en play) ; affirmations jugées dès que le marché tranche (±1 ATR, plus de 30 min ni de 0,3 %) ; une affirmation ouverte par bot / paire / sens ; Scalper sans pause globale ; Sauvetage qui repart après un flatten ; Rééquilibrage jamais sur une position manuelle
// [MASQUE CORRIGÉ · 26/09/2026] VERSION 20260926p · « Revigorer » (400 T$, même génome, fenêtre vidée) remplacé par « Faire évoluer maintenant » (_evolveBrokenNow : évolution réelle) ; revigoration forcée des bots retirée (bots et Évolueur jugés sur leurs actes)
// [ÉVOLUTION SEULE · 26/09/2026] VERSION 20260926o · revigoration AUTOMATIQUE des apprenants retirée (elle remettait à 400 T$, fenêtre vidée, les sièges mesurés faux : leur poids de vote ×5 à ×8 et l'évolution détournée vers un siège sain) ; un siège faible garde sa vraie fitness et l'évolution le remplace ; revigorations manuelles gardées
// [ABSTENTION · 26/09/2026] VERSION 20260926n · une abstention (|vote| ≤ 0,05 : conseil « hold », scout sans donnée, gardien qui approuve, siège muet) n'est plus jugée comme une erreur — ni fitness, ni erreurs, ni souvenir ; même règle dans l'essai de l'Évolueur ; migration unique : les jugements au poids plancher (0,01, signature d'une abstention) quittent les fenêtres des apprenants, fitness recalculée
// [MÉRITE DE L'ÉVOLUEUR · 26/09/2026] VERSION 20260926k · l'Évolueur n'est plus jugé sur le résultat du système : chaque évolution ouvre un essai (ancien génome en ombre, voté sur les mêmes événements) ; au bout de 30 jugements, nouveau contre ancien → l'Évolueur est jugé
// [MÉRITE DES BOTS · 26/09/2026] VERSION 20260926j · un bot n'est plus jugé sur le résultat du système (les 9 bots avaient la MÊME fenêtre et tombaient ensemble à 50) : il est jugé sur SES actes vérifiés (_botPredict / _botMeritAudit / _botJudgeMeasured) ; relevé des vetos réparé (`side` inexistant depuis le 15/08)
// [MÉMOIRE DES BOTS · 26/09/2026] VERSION 20260926h · showMemoryOverlay : pour un bot / le méta, le résumé réel (jugements, interventions) au lieu de « aucune mémoire »
// [DOUBLE JUGEMENT · 26/09/2026] VERSION 20260926g · la compétence par régime (regimeFitness) est mise à jour sur les jugements 'position' (chaque fermeture) et plus seulement 'trade' (10f ne rejuge plus)
// [FENÊTRE APPRENANTE · 26/09/2026] VERSION 20260926f · la fenêtre de jugement (60) devient apprise : _fitWindow lit S.fitWindowRule (10i), jugements gardés 240 avec n° d'événement k, _fitOf / _fitRecomputeAll, rejeu après chaque jugement
// [CONTEXTE 1 H / 4 H · 26/09/2026] VERSION 20260926e · geopolitic_v1 = Contexte 1h·4h : tendance des horizons 1 h et 4 h (02 _ctxHorizonRead), horizons alignés renforcés / en conflit amortis, 11 gènes bornés
// [LIQUIDATIONS · 26/09/2026] VERSION 20260926d · whale_v1 lit les liquidations (S.liqStats) : shorts liquidés = achats forcés (+), longs liquidés = ventes forcées (−), génomé (wLiq, liqMinUsd)
// [POSITIONNEMENT · 26/09/2026] VERSION 20260926c · fundamental_v1 = Positionnement : lit S.positioning (financement, OI, long/short), génomé
// [MACRO RÉEL · 26/09/2026] VERSION 20260926b · macro_v1 lit S.macroFeed (Fear & Greed, dominance, cap 24 h), génomé ; fundamental_v1 reste neutralisé
// [COMPTEURS RÉGLAGES · 24/09/2026] VERSION 20260924a · Réglages : jugements réels (_realJudgments) au lieu des 41 M cycles, frais réels, « P&L attribué », Shadow = miroir
// [MÉNAGE · 23/09/2026] VERSION 20260923g · panneau Miroir : P&L de session sans _totalCompounded
// [HARMONIQUE GÉNOMÉE · 23/09/2026] VERSION 20260923d · les 9 seuils de detectHarmonicResonance sont le génome du siège harmonic_v1 (byte-identique par défaut)
// [ATTRIBUTION PAR SOURCE · 17/09/2026] VERSION 20260917f · runRosterAnalysis publie l'état des sources dans le bus (10i _intelPublish)
// [GÉNOME DE PAIRE · 17/09/2026] VERSION 20260917e · génome de paire (périodes TA + poids du mélange) : PAIR_GENOME_DEFAULTS, _pairGenomeOf, _pairGenomeEvolve
// [FLUX BINANCE · 17/09/2026] VERSION 20260917d · whale_v1 / flow_v1 lisent le flux d'ordres réel et le carnet Binance (02), volume_v1 le volume réel des klines — fin des proxys de bougies
// [ÉCOLE · 17/09/2026] VERSION 20260917a · learnFromOutcome : l'AA (bougies fabriquées) ne juge plus les agents — seuls EV et RE notent
// [RETRAIT REDISTRIBUTION · 16/09/2026] VERSION 20260916e · revigoration : vide aussi la fenêtre de jugements
// [POIDS PAR ATTRIBUTION · 16/09/2026] VERSION 20260916d · poids du roster = fitness glissante × compétence par paire × compétence par régime (continu, _attributionFactor) ; regimeFitness = votes alignés du siège ; ps.roster.weights
// [FITNESS GLISSANTE · 16/09/2026] VERSION 20260916c · fitness = 350 + 1 000 × espérance nette des 60 derniers jugements (_fitJudge), poids symétriques, plus de saturation ; bonus de série retiré
// [GÉNOME · 16/09/2026] VERSION 20260916b · génome réel par siège (GENOME_DEFAULTS, _genomeOf, _genomeEvolve) lu par scoutAnalysis / councilVote / guardianCheck ; probation des nouveau-nés dans le poids du roster
// [1b-b · 15/09/2026] VERSION 20260915c · recordTradeForHeatmap : clôtures EV/RE seulement (AA exclu), remise à zéro unique du compteur mélangé
// [PHASE 1 · 12/09/2026] VERSION 20260912c · VOTE PAR PAIRE : runRosterAnalysis publie ps.roster.votes de LA paire (muet = 0, RAM) et n'écrase plus a.score ; _agentPairVote(a, pair) ; learnFromOutcome / enrichMemory jugent l'agent sur son vote sur la paire ; liveTrainAgents retiré (archive/)
// [GEL BOOT · 11/09/2026] VERSION 20260911c · double gel de boot (2 × 6 s) NOMMÉ par LoAF : `req.result` de store.getAll() sur aura_backups (rotation + liste) → index backups_meta (v2), lecture d'un seul enregistrement à la fois, enregistrements sans meta (collision 09b3) purgés
// [SKILL BORNÉ · 06/09/2026] VERSION 20260906i — learnFromOutcome : agentPairSkill plafonné 500/cellule (halving)
// [P7 · 06/09/2026] VERSION 20260906g — scoutAnalysis : nlp_v1 RAVIVÉ sur le signal news par paire (10e7), macro_v1/fundamental_v1 restent neutralisés (S3)
// [FEEDBACK REEL · 07/07/2026] la realite pese plus lourd que la simulation dans learnFromOutcome : Evaluation x3, Reel x5, ecole x1 (multiplexeur garantit le mode au moment de l appel) — les vrais trades forgent enfin la fitness des agents
// [ETAPE 5] journal de bord : max 10 entrees affichees (etait 20) · 01/07/2026
// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 03/10
// Contient : per-pair-position-buttons-controls-build-o, memoire-episodique-metaphores-feature-1, 5-lead-lag-inter-pair-correlations, bot-fleet-archives, v8-0-livraison-32-systeme-de-backup-import
// ════════════════════════════════════════════════════════════
// ============================================================
// PER-PAIR POSITION BUTTONS + CONTROLS (build once, hold-to-scroll)
// ============================================================
let _holdTimers = {}; // pair+dir → { interval, timeout }
let _scrollGuard = false;
let _scrollGuardTimer = null;
let _pointerMoved = false;

// Detect scroll gestures to prevent accidental button triggers
document.addEventListener('touchmove', () => {
  _pointerMoved = true;
  _scrollGuard = true;
  clearTimeout(_scrollGuardTimer);
  _scrollGuardTimer = setTimeout(() => { _scrollGuard = false; _pointerMoved = false; }, 300);
}, { passive: true });

function _startHold(pair, field, dir) {
  if(_scrollGuard || _pointerMoved) return;  // ignore if user is scrolling
  _stopHold(pair, field);
  const key = pair+'_'+field+'_'+dir;
  // Debounce: wait 160ms before first action — gives time to detect scroll
  _holdTimers[key] = { timeout: setTimeout(() => {
    if(_scrollGuard) return;  // abort if scroll detected during debounce
    if(field === 'stake') changePairStake(pair, dir);
    else if(field === 'lev') changePairLev(pair, dir);
    else changePairCycle(pair, Math.sign(dir));
    // Accelerate after first action
    let speed = 250;
    const accel = () => {
      if(_scrollGuard) return;
      if(field === 'stake') changePairStake(pair, dir * 3);
      else if(field === 'lev') changePairLev(pair, dir);
      else changePairCycle(pair, Math.sign(dir));
      speed = Math.max(100, speed - 25);
      _holdTimers[key] = { timeout: setTimeout(accel, speed) };
    };
    _holdTimers[key] = { timeout: setTimeout(accel, 500) };
  }, 160) };
}

function _stopHold(pair, field, dir) {
  _pointerMoved = false;
  const key = pair+'_'+field+'_'+(dir||'up');
  const key2= pair+'_'+field+'_'+(dir||-1);
  [key, key2, pair+'_'+field+'_1', pair+'_'+field+'_-1'].forEach(k => {
    if(_holdTimers[k]) { clearTimeout(_holdTimers[k].timeout); delete _holdTimers[k]; }
  });
}

// Legacy alias — now delegates to _makePosBtn
function makePairBtn(pair, field, dir, label) {
  return _makePosBtn(pair, field, dir, label);
}

function buildPairPosButtons() {
  const wrap = document.getElementById('pairPosButtons');
  if(!wrap) return;
  wrap.innerHTML = '';   // always rebuild fresh (supports pair price updates)

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const ps      = S.pairStates[pair];
    const row     = document.createElement('div');
    row.className = 'pair-ctrl-row';
    row.id        = 'pcrow_'+pairKey;

    // ── Header: paire + prix + 24h change ────────────────────
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';
    hdr.innerHTML = `
      <div>
        <span class="pair-ctrl-label" style="color:${cfg.color}">${pair}</span>
        <span id="ppos_px_${pairKey}" style="font-size:9px;color:var(--t3);margin-left:6px;">—</span>
      </div>
      <span id="ppos_chg_${pairKey}" style="font-size:9px;font-weight:600;"></span>`;
    row.appendChild(hdr);

    // ── Analyse synthétique (AT + AF) ─────────────────────────
    const analysisDiv = document.createElement('div');
    analysisDiv.id    = 'panalysis_'+pairKey;
    analysisDiv.style.cssText = 'margin-bottom:6px;';
    row.appendChild(analysisDiv);

    // ── Proposition d'entrée pré-remplie ─────────────────────
    const proposalDiv = document.createElement('div');
    proposalDiv.id    = 'pproposal_'+pairKey;
    proposalDiv.style.cssText = 'margin-bottom:8px;';
    row.appendChild(proposalDiv);

    // ── Contrôles LONG / LEVIER / SHORT ──────────────────────
    const ctrlRow = document.createElement('div');
    ctrlRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;';

    const lBtn = document.createElement('button');
    lBtn.id        = 'pbtn_long_'+pairKey;
    lBtn.className = 'pair-pos-btn long';
    lBtn.innerHTML = '↑ LONG';
    lBtn.onclick   = () => _openProposedPosition(pair, 'long');

    const levDiv = document.createElement('div');
    levDiv.className = 'pair-lev-btn';
    levDiv.style.cssText = 'display:flex;align-items:center;gap:3px;';
    const levMinus = _makePosBtn(pair, 'lev', -1, '−');
    const levVal   = document.createElement('span');
    levVal.className  = 'pair-lev-val';
    levVal.id         = 'plev_'+pairKey;
    levVal.textContent= '×'+(ps.pairLeverage||1);
    const levPlus  = _makePosBtn(pair, 'lev', +1, '+');
    levDiv.appendChild(levMinus); levDiv.appendChild(levVal); levDiv.appendChild(levPlus);

    const sBtn = document.createElement('button');
    sBtn.id        = 'pbtn_short_'+pairKey;
    sBtn.className = 'pair-pos-btn short';
    sBtn.innerHTML = '↓ SHORT';
    sBtn.onclick   = () => _openProposedPosition(pair, 'short');

    ctrlRow.appendChild(lBtn); ctrlRow.appendChild(levDiv); ctrlRow.appendChild(sBtn);
    row.appendChild(ctrlRow);

    // ── Suggestion strip (post-entry) ────────────────────────
    const suggDiv  = document.createElement('div');
    suggDiv.id     = 'psugg_'+pairKey;
    suggDiv.style.cssText = 'margin-top:4px;';
    row.appendChild(suggDiv);

    wrap.appendChild(row);
  });
}

// Helper: create position control buttons with touch debounce
function _makePosBtn(pair, field, dir, label) {
  const b = document.createElement('button');
  b.className = 'step-btn';
  b.textContent = label;
  b.addEventListener('pointerdown',  e => { e.preventDefault(); e.stopPropagation(); _pointerMoved=false; _startHold(pair, field, dir); });
  b.addEventListener('pointerup',    () => _stopHold(pair, field, dir));
  b.addEventListener('pointerleave', () => _stopHold(pair, field, dir));
  b.addEventListener('pointercancel',() => _stopHold(pair, field, dir));
  return b;
}

// ── Pair detail bottom sheet ──────────────────────────────────

function showPairDetail(pair) {
  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps || !cfg) return;

  const sheet    = document.getElementById('pairDetailSheet');
  const backdrop = document.getElementById('pairDetailBackdrop');
  const title    = document.getElementById('pairDetailTitle');
  const content  = document.getElementById('pairDetailContent');
  if(!sheet) return;

  const comp = getCompositeSignal(pair);
  const tech = comp?.tech || {};
  const priceStr = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
  const prob = lmsrP(ps);
  const pct  = (prob*100).toFixed(1);
  const probCol = prob>.6?'var(--up)':prob<.4?'var(--down)':'var(--gold)';

  title.innerHTML = `<span style="color:${cfg.color}">${pair}</span>&nbsp;
    <span style="font-size:11px;color:var(--t3);font-weight:400;">${priceStr}</span>
    <span style="font-size:10px;color:${ps.pnl24h>=0?'var(--up)':'var(--down)'};margin-left:5px;">${ps.pnl24h>=0?'+':''}${ps.pnl24h.toFixed(2)}%</span>`;

  const sigs   = Object.entries(tech.signals||{});
  const atRows = sigs.map(([k, s]) => {
    if(!s) return '';
    const col  = s.signal==='bull'?'var(--up)':s.signal==='bear'?'var(--down)':'var(--gold)';
    const icon = s.signal==='bull'?'↑':s.signal==='bear'?'↓':'→';
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:10px;color:var(--t2);">${s.label||k}</span>
      <div style="display:flex;gap:6px;align-items:center;">
        <span style="font-size:9px;color:var(--t3);">${typeof s.value==='number'?s.value.toFixed(3):''}</span>
        <span style="font-size:11px;font-weight:700;color:${col};">${icon}</span>
      </div>
    </div>`;
  }).join('');

  const wr = ps.totalTrades > 0 ? (ps.winTrades/ps.totalTrades*100).toFixed(0) : '—';

  content.innerHTML = `
    <div style="background:var(--s2);border-radius:10px;padding:10px 13px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:8px;color:var(--t3);margin-bottom:2px;">Signal LMSR</div>
        <div style="font-size:20px;font-weight:800;color:${probCol};">${pct}%</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;color:${probCol};">${prob>.6?'↑ ACHAT':prob<.4?'↓ VENTE':'→ NEUTRE'}</div>
        <div style="font-size:8px;color:var(--t3);margin-top:2px;">
          AT: ${comp?((comp.tech.atScore||0)*100).toFixed(0)+'%':'—'} &nbsp;·&nbsp;
          AF: ${comp?((comp.fund.fundScore||0)*100).toFixed(0)+'%':'—'}
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;">
      <div style="background:var(--s2);border-radius:8px;padding:7px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">Trades</div>
        <div style="font-size:13px;font-weight:700;color:var(--ice);">${ps.totalTrades}</div>
      </div>
      <div style="background:var(--s2);border-radius:8px;padding:7px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">Win Rate</div>
        <div style="font-size:13px;font-weight:700;color:${parseFloat(wr)>=50?'var(--up)':'var(--down)'};">${wr}%</div>
      </div>
      <div style="background:var(--s2);border-radius:8px;padding:7px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">P&L</div>
        <div style="font-size:12px;font-weight:700;color:${ps.totalPnlUsd>=0?'var(--up)':'var(--down)'};">${ps.totalPnlUsd>=0?'+':''}$${ps.totalPnlUsd.toFixed(1)}</div>
      </div>
    </div>
    ${ps.bestTrade ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;">
      <div style="background:rgba(0,232,122,.07);border:1px solid rgba(0,232,122,.2);border-radius:8px;padding:7px;">
        <div style="font-size:7px;color:var(--up);">🏆 Meilleur</div>
        <div style="font-size:13px;font-weight:700;color:var(--up);">+${ps.bestTrade.pnl.toFixed(2)}%</div>
      </div>
      <div style="background:rgba(255,61,107,.07);border:1px solid rgba(255,61,107,.2);border-radius:8px;padding:7px;">
        <div style="font-size:7px;color:var(--down);">🔻 Pire</div>
        <div style="font-size:13px;font-weight:700;color:var(--down);">${(ps.worstTrade?.pnl||0).toFixed(2)}%</div>
      </div>
    </div>` : ''}
    ${sigs.length ? `
    <div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px;">📊 Indicateurs AT</div>
    <div style="background:var(--s2);border-radius:10px;padding:6px 10px;margin-bottom:16px;">${atRows}</div>` : ''}
    <button onclick="closePairDetail()" style="width:100%;padding:11px;background:var(--s2);border:1px solid var(--border);border-radius:10px;color:var(--t2);font-size:12px;font-weight:600;cursor:pointer;">Fermer</button>`;

  sheet.style.transform    = 'translateY(0)';
  backdrop.style.opacity   = '1';
  backdrop.style.pointerEvents = 'auto';
}

function closePairDetail() {
  const s = document.getElementById('pairDetailSheet');
  const b = document.getElementById('pairDetailBackdrop');
  if(s) s.style.transform    = 'translateY(105%)';
  if(b) { b.style.opacity = '0'; b.style.pointerEvents = 'none'; }
  // [MANU · 05/10/2026] la fiche MAN (#pairDetailOverlay, ouverte par 10h openManDetail) ne se fermait JAMAIS : son ✕, son fond et la fin
  // d'un trade appelaient cette fonction, qui ne connaissait que le volet du bas (sonde du 05/10 : fiche toujours ouverte après ✕ et après clic sur le fond)
  const o = document.getElementById('pairDetailOverlay');
  if(o) o.classList.remove('open');
}

// ── Agent role filter ─────────────────────────────────────────
let _agentFilter = 'all';
function filterAgents(role, btn) {
  _agentFilter = role;
  // Update active button
  document.querySelectorAll('.agent-filter-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // Show/hide agent cards
  const list = document.getElementById('mobileAgentList');
  if(!list) return;
  list.querySelectorAll('[data-agent-role]').forEach(card => {
    const cardRole = card.dataset.agentRole || 'fundamental';
    if(role === 'all' || cardRole === role) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}


function _adjProp(pair, field, dir) {
  const k = pair.replace('/','_');
  if(field === 'lev') {
    const el = document.getElementById('pinput_lev_'+k);
    if(!el) return;
    const cur = parseInt(el.dataset.val) || 1;
    const nv  = Math.max(1, Math.min(20, cur + dir));
    el.dataset.val    = nv;
    el.textContent    = '×'+nv;
    el.style.color    = nv > 1 ? 'var(--gold)' : 'var(--up)';
    _recalcProposal(pair);
  }
}

function _adjPropPct(pair, field, pct) {
  const k   = pair.replace('/','_');
  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps || !cfg) return;
  const dec = cfg.dec >= 4 ? cfg.dec : 2;
  // Determine side from the proposal card
  const levEl  = document.getElementById('pinput_lev_'+k);
  const propCard = levEl?.closest('[id^="pcard_"]') || levEl?.parentElement?.parentElement?.parentElement;
  // Detect if LONG or SHORT from LMSR signal
  const comp = getCompositeSignal(pair);
  const isLong = comp?.signal === 'LONG';
  const cur  = ps.price;

  if(field === 'tp') {
    const price = isLong ? cur * (1 + pct/100) : cur * (1 - pct/100);
    const inp = document.getElementById('pinput_tp_'+k);
    if(inp) { inp.value = price.toFixed(dec); _recalcProposal(pair); }
  } else if(field === 'sl') {
    const price = isLong ? cur * (1 - pct/100) : cur * (1 + pct/100);
    const inp = document.getElementById('pinput_sl_'+k);
    if(inp) { inp.value = price.toFixed(dec); _recalcProposal(pair); }
  }
}

function _recalcProposal(pair) {
  const k      = pair.replace('/','_');
  const ps     = S.pairStates[pair];
  const fc     = S.feeConfig;
  const reg    = S.taxConfig.regions[S.taxConfig.region];
  if(!ps) return;

  const stakeEl = document.getElementById('pinput_stake_'+k);
  const levEl   = document.getElementById('pinput_lev_'+k);
  const tpEl    = document.getElementById('pinput_tp_'+k);
  const slEl    = document.getElementById('pinput_sl_'+k);
  const feeEl   = document.getElementById('pfee_'+k);
  const netEl   = document.getElementById('pnet_'+k);
  const notEl   = document.getElementById('pnotional_'+k);
  if(!stakeEl || !levEl) return;

  const stake = parseFloat(stakeEl.value) || 100;
  const lev   = parseInt(levEl.dataset.val) || 1;
  const tp    = tpEl ? parseFloat(tpEl.value) : null;
  const sl    = slEl ? parseFloat(slEl.value) : null;
  const notional = stake * lev;

  // Fee calc
  const feePct  = (fc.takerRate + fc.slippage) * 2 + fc.fundingRate * 3;
  const taxPct  = (reg?.inclusion||0) * (reg?.rate||0);
  const fees    = notional * feePct;

  // Expected gain from TP (if set)
  let gain = 0;
  if(tp && ps.price > 0) {
    const comp = getCompositeSignal(pair);
    const isLong = comp?.signal === 'LONG';
    gain = isLong
      ? notional * Math.max(0, (tp - ps.price) / ps.price)
      : notional * Math.max(0, (ps.price - tp) / ps.price);
    const taxAmount = gain > fees ? (gain - fees) * taxPct : 0;
    gain -= taxAmount;
  }
  const net = gain - fees;

  if(feeEl) { feeEl.textContent = '−$'+fees.toFixed(2); }
  if(netEl) {
    netEl.textContent = (net>=0?'+':'')+'$'+net.toFixed(2);
    netEl.style.color = net >= 0 ? 'var(--up)' : 'var(--down)';
  }
  if(notEl) notEl.textContent = '$'+notional.toFixed(0);

  // ── Capital bar: show how much of available capital this trade uses ──
  const cap       = getCapitalSummary();
  const afterStake= cap.staked + notional;
  const usedPct   = cap.maxAllowed > 0 ? Math.min(100, afterStake / cap.maxAllowed * 100) : 0;
  const free      = Math.max(0, cap.maxAllowed - cap.staked);
  const barColor  = usedPct > 90 ? 'var(--down)' : usedPct > 70 ? 'var(--gold)' : 'var(--up)';
  const capBarEl  = document.getElementById('pcapbar_'+k);
  const capFillEl = document.getElementById('pcapfill_'+k);
  const capLblEl  = document.getElementById('pcaplbl_left_'+k);
  const capFreeEl = document.getElementById('pcaplbl_right_'+k);
  if(capBarEl)  capBarEl.style.borderColor  = usedPct > 90 ? 'rgba(255,61,107,.3)' : 'rgba(255,255,255,.06)';
  if(capFillEl) { capFillEl.style.width = usedPct+'%'; capFillEl.style.background = barColor; }
  if(capLblEl)  capLblEl.textContent  = 'Engagé: $'+Math.round(afterStake);
  if(capFreeEl) { capFreeEl.textContent = 'Libre: $'+Math.round(free - notional); capFreeEl.style.color = free - notional < 0 ? 'var(--down)' : 'var(--t3)'; }

  // Store values for _openProposedPosition
  const propDiv = document.getElementById('pproposal_'+k);
  if(propDiv) {
    propDiv.dataset.suggestStake = stake;
    propDiv.dataset.suggestLev   = lev;
    propDiv.dataset.suggestTp    = tp || '';
    propDiv.dataset.suggestSl    = sl || '';
  }
}

// Open position using the edited proposal values (reads live inputs)
function _openProposedPosition(pair, side) {
  const pairKey = pair.replace('/','_');
  const ps      = S.pairStates[pair];
  if(!ps) return;

  // Read from editable inputs — user may have modified them
  const stakeEl = document.getElementById('pinput_stake_'+pairKey);
  const levEl   = document.getElementById('pinput_lev_'+pairKey);
  const tpEl    = document.getElementById('pinput_tp_'+pairKey);
  const slEl    = document.getElementById('pinput_sl_'+pairKey);
  const propDiv = document.getElementById('pproposal_'+pairKey);

  const stake = stakeEl ? Math.max(10, parseFloat(stakeEl.value)||100)
              : parseFloat(propDiv?.dataset.suggestStake||'100');
  const lev   = levEl   ? Math.max(1, parseInt(levEl.dataset.val)||1)
              : parseInt(propDiv?.dataset.suggestLev||'1');
  const tp    = tpEl    ? (parseFloat(tpEl.value)||null) : null;
  const sl    = slEl    ? (parseFloat(slEl.value)||null) : null;

  // ── VALIDATION CAPITAL avant ouverture manuelle ──────────────
  const leverageBonus = stake * (lev - 1);  // part empruntée
  const capCheck = validateTotalExposure(stake, leverageBonus);
  if(!capCheck.ok) {
    const free = Math.max(0, capCheck.available);
    // v7.1 P5: si bloqué par la règle spec utilisateur, on le précise
    if(capCheck.phase5) {
      const _src = capCheck.phase5Mode === 'leverage' ? 'levier emprunté' : 'trading';
      showToast(`⚠ Règle sizing · max investissable ${fmt$(free)} (${_src} − engagés)`, 3200, 'critical');
    } else {
      showToast(`⚠ Dépassement capital · max disponible: ${fmt$(free)} · réduire la mise ou le levier`);
    }
    return;
  }

  // Temporarily apply proposed leverage + stake
  const prevLev   = ps.pairLeverage;
  const prevStake = ps.stake;
  ps.pairLeverage = lev;
  ps.stake        = stake;

  // [CONSIGNES · 06/10/2026] Les prix TP / SL de la proposition sont calculés pour le sens SUGGÉRÉ (getCompositeSignal) puis étaient appliqués
  // tels quels au sens cliqué (50 ms plus tard) : SHORT cliqué sur une proposition LONG → TP au-dessus de l'entrée, SL en dessous : fermé au
  // passage suivant du moteur de sortie (même défaut que la fiche MAN, corrigé le 05/10). Désormais ce sont leurs DISTANCES qui s'appliquent, du bon côté pour le sens
  // cliqué, posées par openPosition avec tes consignes de la paire. (Panneau masqué dans l'app : #pairPosButtons display:none.)
  const _px = Number(ps.price);
  const _pct = (x) => (Number(x) > 0 && _px > 0) ? Math.abs(Number(x) / _px - 1) * 100 : null;
  try { openPosition(pair, side, { tpPct: _pct(tp), slPct: _pct(sl) }); }
  finally {
    // Restore
    ps.pairLeverage = prevLev;
    ps.stake        = prevStake;
  }
}


// ── Update analysis + proposal for each pair (called every few ticks) ──────
function updatePairAnalysisPanels() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const ps      = S.pairStates[pair];
    if(!ps) return;

    // ── Price-change detection: only rebuild proposal if price moved >0.2% ──
    const lastBuiltPrice = ps._lastProposalPrice || 0;
    const priceDelta     = ps.price > 0 ? Math.abs(ps.price - lastBuiltPrice) / ps.price : 1;
    const needsRebuild   = priceDelta > 0.002 || !lastBuiltPrice;

    // Update price + 24h change header
    const pxEl  = document.getElementById('ppos_px_'+pairKey);
    const chgEl = document.getElementById('ppos_chg_'+pairKey);
    if(pxEl)  pxEl.textContent  = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
    if(chgEl) {
      chgEl.textContent  = (ps.pnl24h>=0?'+':'')+ps.pnl24h.toFixed(2)+'%';
      chgEl.style.color  = ps.pnl24h>=0?'var(--up)':'var(--down)';
    }

    // Only show full analysis if no manual position open (pre-entry guidance)
    const manualPos = S.openPositions.find(p => p.pair===pair && p.auto!==true);
    if(manualPos) {
      updateManualSuggestion(pair, pairKey);
      return;
    }

    // v7.6 · Mode AUTO : ne PAS pré-afficher de mise sur les paires où le bot n'est pas engagé.
    // Si aucune position ouverte sur cette paire, on affiche juste "Bot en veille" (pas de mise).
    const autoPos = S.openPositions.find(p => p.pair===pair && p.auto===true);
    if(S.botAutoMode === true && !autoPos) {
      const proposalEl = document.getElementById('pproposal_'+pairKey);
      if(proposalEl) {
        proposalEl.innerHTML = `
        <div style="background:rgba(120,130,150,.04);border:1px dashed rgba(120,130,150,.15);border-radius:8px;padding:7px 10px;text-align:center;font-size:8px;color:var(--t3);">
          🤖 Bot en veille sur ${pair} · aucune mise réservée
        </div>`;
        // Disable entry buttons in auto mode without position
        const lb = document.getElementById('pbtn_long_'+pairKey);
        const sb = document.getElementById('pbtn_short_'+pairKey);
        if(lb) lb.style.opacity='0.35';
        if(sb) sb.style.opacity='0.35';
      }
      return;
    }

    // Skip expensive proposal rebuild if price barely moved
    if(!needsRebuild) return;
    ps._lastProposalPrice = ps.price;

    const comp = getCompositeSignal(pair);
    if(!comp) return;

    const { composite, signal, col, strength, tech, fund } = comp;
    const sigs  = Object.values(tech?.signals||{}).filter(Boolean);
    const bulls = sigs.filter(s=>s.signal==='bull').length;
    const bears = sigs.filter(s=>s.signal==='bear').length;
    const neuts = sigs.length - bulls - bears;

    // ── Fee-aware optimal stake calculation ─────────────────
    const lev         = ps.pairLeverage || 1;
    const tradingCap  = Math.max(100, S.tradingAccount);
    const baseAlloc   = tradingCap * 0.05;  // 5% per pair base
    const conviction  = Math.abs(composite);
    const rawStake    = baseAlloc * (1 + conviction * 1.5);
    const fc          = S.feeConfig;
    const reg         = S.taxConfig.regions[S.taxConfig.region];
    // Rentabilité réelle : la taxe frappe le GAIN, pas la conviction. On estime le
    // gain visé (TP ~ conviction), on retire les frais (aller-retour) puis l'impôt
    // sur le gain restant, et on exige un gain NET minimum + un signal de qualité.
    const feePct      = (fc.takerRate + fc.slippage) * 2 + fc.fundingRate * 3;
    const taxPct      = (reg?.inclusion||0) * (reg?.rate||0);
    const minMoveNeeded = feePct + taxPct;   // conservé pour l'affichage break-even
    const _tpFrac        = Math.max(0.007, conviction * 0.032);          // gain visé (fraction)
    const _gainAfterFees = _tpFrac - feePct;
    const _gainNet       = _gainAfterFees - Math.max(0, _gainAfterFees) * taxPct;
    // On trade si le gain NET réel couvre un minimum (0.15%) ET le signal est de qualité.
    const shouldTrade = _gainNet > 0.0015 && Math.abs(composite) > 0.28;
    const suggestStake= Math.round(Math.min(
      rawStake,
      tradingCap * 0.15,
      Math.max(10, getCapitalSummary().free * 0.25)   // max 25% du capital libre
    ) / 10) * 10;
    const leverageSugg= conviction > 0.55 ? Math.min(3, Math.max(1, Math.round(conviction*4)))
                      : conviction > 0.35 ? 2 : 1;

    // Suggested TP/SL based on ATR
    const raw     = tech?.raw;
    const atr     = raw?.stddev?.atr || (ps.price * 0.015);
    const tpDist  = atr * (1.5 + conviction);
    const slDist  = atr * (0.8 + conviction * 0.5);
    const priceFormatted = cfg.dec>=4;
    const fmt     = v => priceFormatted ? v.toFixed(cfg.dec) : Math.round(v).toLocaleString();

    // ── Render analysis panel ────────────────────────────────
    const analysisEl = document.getElementById('panalysis_'+pairKey);
    if(analysisEl) {
      const atPct  = ((tech.atScore+1)*50).toFixed(0);
      const afPct  = ((fund.fundScore+1)*50).toFixed(0);
      const atCol  = tech.atScore>0.15?'var(--up)':tech.atScore<-0.15?'var(--down)':'var(--gold)';
      const afCol  = fund.fundScore>0.15?'var(--up)':fund.fundScore<-0.15?'var(--down)':'var(--gold)';
      // Top 2 confirming indicators
      const topAT  = sigs.filter(s=>s.signal===(signal==='LONG'?'bull':'bear')).slice(0,2).map(s=>s.label.replace(/[↑↓]/g,'').trim());

      analysisEl.innerHTML = `
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:8px 10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
          <span style="font-size:8px;color:var(--t3);font-weight:600;letter-spacing:.06em;">ANALYSE — ${pair}</span>
          <span style="font-size:10px;font-weight:800;color:${col};">${signal==='LONG'?'↑':signal==='SHORT'?'↓':'—'} ${signal} <span style="font-size:8px;color:var(--t3);">${strength}</span></span>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:5px;">
          <div style="flex:1;">
            <div style="font-size:7px;color:var(--t3);margin-bottom:2px;">AT ${tech.atScore>=0?'+':''}${(tech.atScore*100).toFixed(0)}% (${bulls}↑ ${neuts}→ ${bears}↓)</div>
            <div style="height:4px;background:var(--s3);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${atPct}%;background:${atCol};border-radius:2px;transition:width .4s;"></div>
            </div>
          </div>
          <div style="flex:1;">
            <div style="font-size:7px;color:var(--t3);margin-bottom:2px;">AF ${fund.fundScore>=0?'+':''}${(fund.fundScore*100).toFixed(0)}%</div>
            <div style="height:4px;background:var(--s3);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${afPct}%;background:${afCol};border-radius:2px;transition:width .4s;"></div>
            </div>
          </div>
        </div>
        ${topAT.length ? `<div style="font-size:7px;color:var(--t3);">Confirmé: <span style="color:${col};">${topAT.join(' · ')}</span></div>` : ''}
      </div>`;
    }

    // ── Render pre-filled proposal ────────────────────────────
    const proposalEl = document.getElementById('pproposal_'+pairKey);
    if(proposalEl) {
      proposalEl.dataset.suggestStake = suggestStake;

      if(!shouldTrade) {
        proposalEl.innerHTML = `
        <div style="background:rgba(245,200,66,.04);border:1px dashed rgba(245,200,66,.2);border-radius:8px;padding:7px 10px;text-align:center;font-size:8px;color:var(--t3);">
          Signal faible (${(conviction*100).toFixed(0)}%) — attendre confirmation · break-even: ${(minMoveNeeded*100).toFixed(2)}%
        </div>`;
        // Disable entry buttons
        const lb = document.getElementById('pbtn_long_'+pairKey);
        const sb = document.getElementById('pbtn_short_'+pairKey);
        if(lb) lb.style.opacity='0.4';
        if(sb) sb.style.opacity='0.4';
        return;
      }

      // Enable buttons
      const lb = document.getElementById('pbtn_long_'+pairKey);
      const sb = document.getElementById('pbtn_short_'+pairKey);
      if(lb) lb.style.opacity='1';
      if(sb) sb.style.opacity='1';

      const isLong   = signal === 'LONG';
      const isShort  = signal === 'SHORT';
      const propSide = isLong ? 'LONG ↑' : isShort ? 'SHORT ↓' : 'NEUTRE';
      const propCol  = isLong ? 'var(--up)' : isShort ? 'var(--down)' : 'var(--gold)';
      const tpLong   = ps.price + tpDist;
      const slLong   = ps.price - slDist;
      const tpShort  = ps.price - tpDist;
      const slShort  = ps.price + slDist;
      const tpVal    = isLong ? tpLong  : isShort ? tpShort : ps.price + tpDist;
      const slVal    = isLong ? slLong  : isShort ? slShort : ps.price - slDist;
      const netExpect= suggestStake * leverageSugg * (tpDist / ps.price) * conviction;
      const feesCost = suggestStake * leverageSugg * feePct;
      const netAfter = netExpect - feesCost;

      proposalEl.innerHTML = `
      <div id="pcard_${pairKey}" style="background:${isLong?'rgba(0,232,122,.05)':isShort?'rgba(255,61,107,.05)':'rgba(245,200,66,.04)'};
                  border:1px solid ${isLong?'rgba(0,232,122,.25)':isShort?'rgba(255,61,107,.25)':'rgba(245,200,66,.2)'};
                  border-radius:10px;padding:9px 11px;">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
          <span style="font-size:8px;font-weight:700;color:var(--t2);">💡 PROPOSITION MODIFIABLE</span>
          <span style="font-size:10px;font-weight:800;color:${propCol};">${propSide}</span>
        </div>

        <!-- Row 1: Mise + Levier -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
          <div>
            <div style="font-size:7px;color:var(--t3);margin-bottom:3px;">💰 Mise (USDT)</div>
            <input id="pinput_stake_${pairKey}" type="number" min="10" step="10" value="${suggestStake}"
              oninput="_recalcProposal('${pair}')"
              style="width:100%;background:var(--s3);border:1px solid var(--border);border-radius:6px;
                     padding:5px 7px;color:var(--gold);font-family:var(--font-mono);font-size:11px;
                     font-weight:700;box-sizing:border-box;-webkit-appearance:none;">
          </div>
          <div>
            <div style="font-size:7px;color:var(--t3);margin-bottom:3px;">⚡ Levier</div>
            <div style="display:flex;align-items:center;gap:4px;height:32px;">
              <button onclick="_adjProp('${pair}','lev',-1)" style="background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--t2);width:26px;height:100%;font-size:13px;cursor:pointer;">−</button>
              <span id="pinput_lev_${pairKey}" data-val="${leverageSugg}"
                style="flex:1;text-align:center;font-family:var(--font-mono);font-size:12px;font-weight:700;
                       color:${leverageSugg>1?'var(--gold)':'var(--up)'};">×${leverageSugg}</span>
              <button onclick="_adjProp('${pair}','lev',+1)" style="background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--t2);width:26px;height:100%;font-size:13px;cursor:pointer;">+</button>
            </div>
          </div>
        </div>

        <!-- Row 2: TP + SL editable -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
          <div>
            <div style="font-size:7px;color:var(--up);margin-bottom:3px;">🎯 Take Profit</div>
            <input id="pinput_tp_${pairKey}" type="number" step="any" value="${tpVal.toFixed(cfg.dec>=4?cfg.dec:2)}"
              oninput="_recalcProposal('${pair}')"
              style="width:100%;background:var(--s3);border:1px solid rgba(0,232,122,.2);border-radius:6px;
                     padding:5px 7px;color:var(--up);font-family:var(--font-mono);font-size:10px;
                     font-weight:700;box-sizing:border-box;-webkit-appearance:none;">
            <div style="display:flex;gap:3px;margin-top:3px;">
              <button onclick="_adjPropPct('${pair}','tp',1)"  style="flex:1;background:rgba(0,232,122,.08);border:1px solid rgba(0,232,122,.2);border-radius:4px;color:var(--up);font-size:8px;padding:2px 0;cursor:pointer;">+1%</button>
              <button onclick="_adjPropPct('${pair}','tp',2)"  style="flex:1;background:rgba(0,232,122,.08);border:1px solid rgba(0,232,122,.2);border-radius:4px;color:var(--up);font-size:8px;padding:2px 0;cursor:pointer;">+2%</button>
              <button onclick="_adjPropPct('${pair}','tp',5)"  style="flex:1;background:rgba(0,232,122,.08);border:1px solid rgba(0,232,122,.2);border-radius:4px;color:var(--up);font-size:8px;padding:2px 0;cursor:pointer;">+5%</button>
            </div>
          </div>
          <div>
            <div style="font-size:7px;color:var(--down);margin-bottom:3px;">🛑 Stop Loss</div>
            <input id="pinput_sl_${pairKey}" type="number" step="any" value="${slVal.toFixed(cfg.dec>=4?cfg.dec:2)}"
              oninput="_recalcProposal('${pair}')"
              style="width:100%;background:var(--s3);border:1px solid rgba(255,61,107,.2);border-radius:6px;
                     padding:5px 7px;color:var(--down);font-family:var(--font-mono);font-size:10px;
                     font-weight:700;box-sizing:border-box;-webkit-appearance:none;">
            <div style="display:flex;gap:3px;margin-top:3px;">
              <button onclick="_adjPropPct('${pair}','sl',1)"  style="flex:1;background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);border-radius:4px;color:var(--down);font-size:8px;padding:2px 0;cursor:pointer;">−1%</button>
              <button onclick="_adjPropPct('${pair}','sl',2)"  style="flex:1;background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);border-radius:4px;color:var(--down);font-size:8px;padding:2px 0;cursor:pointer;">−2%</button>
              <button onclick="_adjPropPct('${pair}','sl',5)"  style="flex:1;background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);border-radius:4px;color:var(--down);font-size:8px;padding:2px 0;cursor:pointer;">−5%</button>
            </div>
          </div>
        </div>

        <!-- Live recap: fees + expected net + capital bar -->
        <div id="precap_${pairKey}" style="background:var(--s3);border-radius:6px;padding:7px 10px;font-size:9px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:var(--gold);font-weight:700;">💰 TOTAL ENGAGÉ</span>
            <span style="color:var(--gold);font-weight:800;font-family:var(--font-display);font-size:11px;" id="pnotional_${pairKey}">$${(suggestStake*leverageSugg).toFixed(0)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span style="color:var(--t3);">· Mise propre</span>
            <span style="color:var(--t2);">$${suggestStake}</span>
          </div>
          ${leverageSugg>1?`<div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span style="color:var(--t3);">· Levier ×${leverageSugg}</span>
            <span style="color:var(--gold);">+$${(suggestStake*(leverageSugg-1)).toFixed(0)}</span>
          </div>`:''}
          <div style="height:1px;background:var(--border);margin:5px 0;"></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span style="color:var(--t3);">Frais estimés</span>
            <span style="color:var(--down);" id="pfee_${pairKey}">−$${feesCost.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="color:var(--t3);">Gain net espéré</span>
            <span style="color:${netAfter>0?'var(--up)':'var(--down)'};" id="pnet_${pairKey}">${netAfter>=0?'+':''}$${netAfter.toFixed(2)}</span>
          </div>
          <!-- Capital bar -->
          <div class="cap-bar-wrap" id="pcapbar_${pairKey}" style="border:1px solid rgba(255,255,255,.06);border-radius:5px;padding:4px 6px;">
            <div class="cap-bar-track"><div class="cap-bar-fill" id="pcapfill_${pairKey}" style="width:0%;"></div></div>
            <div class="cap-bar-label">
              <span id="pcaplbl_left_${pairKey}">Engagé: —</span>
              <span id="pcaplbl_right_${pairKey}" style="color:var(--t3);">Libre: —</span>
            </div>
          </div>
        </div>
      </div>`;
    }
  });
}

function changePairLev(pair, delta) {
  const ps  = S.pairStates[pair];
  if(!ps) return;
  ps.pairLeverage = Math.max(1, Math.min(20, (ps.pairLeverage||1) + delta));
  const el = document.getElementById('plev_'+pair.replace('/','_'));
  if(el) {
    el.textContent = '×'+ps.pairLeverage;
    // Couleur selon levier : vert ×1, or ×2-5, orange ×6-10, rouge ×11+
    el.style.color = ps.pairLeverage === 1 ? 'var(--up)'
                   : ps.pairLeverage <= 5  ? 'var(--gold)'
                   : ps.pairLeverage <= 10 ? '#ff9500'
                   : 'var(--down)';
  }
  showToast('⚡ '+pair+' levier ×'+ps.pairLeverage+' — Mise: $'+Math.round((ps.stake||0)*ps.pairLeverage));
}

function changePairStake(pair, delta) {
  const ps  = S.pairStates[pair];
  if(!ps) return;
  ps.stake     = Math.max(10, Math.min(100000, ps.stake + delta));
  ps.userStake = true;   // l'utilisateur a pris la main — ne pas écraser
  const el  = document.getElementById('pstake_'+pair.replace('/','_'));
  if(el) el.textContent = '$'+ps.stake;
}

// ── Suggestion strip for manual positions — read-only, no bot action ──────
function updateManualSuggestion(pair, pairKey) {
  const el = document.getElementById('psugg_'+pairKey);
  if(!el) return;

  const pos = S.openPositions.find(p => p.pair === pair && p.auto !== true);
  if(!pos) { el.innerHTML = ''; return; }

  const comp = getCompositeSignal(pair);
  const ps   = S.pairStates[pair];
  const cfg  = PAIRS[pair];
  if(!comp || !ps) { el.innerHTML = ''; return; }

  const { composite, signal, col, strength, tech, fund } = comp;
  const sigs  = Object.values(tech?.signals||{}).filter(Boolean);
  const bulls = sigs.filter(s=>s.signal==='bull').length;
  const bears = sigs.filter(s=>s.signal==='bear').length;
  const neuts = sigs.length - bulls - bears;

  // Agreement
  const posDir   = pos.side === 'long' ? 'LONG' : 'SHORT';
  const agrees   = signal === posDir;
  const agreeCol = agrees ? 'var(--up)' : signal === 'NEUTRE' ? 'var(--gold)' : 'var(--down)';
  const agreeIcon= agrees ? '✓' : signal === 'NEUTRE' ? '→' : '⚠';
  const agreeMsg = agrees
    ? 'Signal confirme votre '+posDir
    : signal === 'NEUTRE' ? 'Signal neutre — surveiller'
    : 'Signal oppose votre '+posDir+' → '+signal;

  // Live P&L
  const pnlPct = pos.side==='long'
    ? ((ps.price - pos.entryPrice)/pos.entryPrice*100)
    : ((pos.entryPrice - ps.price)/pos.entryPrice*100);
  const pnlUsd = pos.stakeUsdt * (pnlPct/100);
  const pnlCol = pnlPct >= 0 ? 'var(--up)' : 'var(--down)';

  // Fee context
  const fc     = S.feeConfig;
  const reg    = S.taxConfig.regions[S.taxConfig.region];
  const feePct = (fc.takerRate + fc.slippage) * 2 + fc.fundingRate * 3;
  const fees   = pos.stakeUsdt * feePct;
  const taxPct = (reg?.inclusion||0)*(reg?.rate||0);
  const tax    = pnlUsd > fees ? (pnlUsd - fees) * taxPct : 0;
  const netPnl = pnlUsd - fees - tax;

  // TP/SL status
  const fmt = v => cfg.dec>=4 ? v.toFixed(cfg.dec) : '$'+Math.floor(v).toLocaleString();
  const tpSet = pos.tp != null;
  const slSet = pos.sl != null;
  const tpDist = tpSet
    ? (pos.side==='long' ? ((pos.tp-ps.price)/ps.price*100) : ((ps.price-pos.tp)/ps.price*100))
    : null;
  const slDist = slSet
    ? (pos.side==='long' ? ((ps.price-pos.sl)/ps.price*100) : ((pos.sl-ps.price)/ps.price*100))
    : null;

  // Time in trade
  const durStr = pos.entryTs ? fmtSince(pos.entryTs) : pos.entryTime || '—';

  // Top 2 key signals
  const keyDir  = signal === 'LONG' ? 'bull' : 'bear';
  const topSigs = sigs.filter(s=>s.signal===keyDir).slice(0,2)
                      .map(s=>s.label.replace(/[↑↓]/g,'').trim());

  // Risk/reward ratio
  const rrRatio = (tpDist && slDist && slDist > 0)
    ? (tpDist / slDist).toFixed(1) : null;

  el.innerHTML = `
  <div style="background:rgba(245,200,66,.04);border:1px solid rgba(245,200,66,.2);border-radius:10px;padding:9px 11px;">

    <!-- Header row -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:5px;">
        <span style="color:var(--gold);font-weight:700;font-size:9px;">🔒 ${pos.side.toUpperCase()} — ${pair}</span>
        <span style="font-size:7px;color:var(--t3);">⏱ ${durStr}</span>
      </div>
      <div style="display:flex;gap:5px;align-items:center;">
        <button onclick="openPosEdit('${pos.id}')"
          style="background:rgba(245,200,66,.1);color:var(--gold);border:1px solid rgba(245,200,66,.25);
                 border-radius:6px;padding:2px 7px;font-size:9px;cursor:pointer;">✏️</button>
        <button onclick="closePosition('${pos.id}',${pos.auto?'true':'false'})"
          style="background:rgba(255,61,107,.18);color:var(--down);border:1.5px solid rgba(255,61,107,.55);
                 border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;
                 min-width:44px;min-height:32px;display:flex;align-items:center;gap:4px;">
          ✕
        </button>
      </div>
    </div>

    <!-- P&L live row -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:6px;">
      <div style="background:var(--s3);border-radius:6px;padding:4px 6px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">P&L brut</div>
        <div style="font-size:11px;font-weight:700;color:${pnlCol};">${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}%</div>
        <div style="font-size:8px;color:${pnlCol};">${pnlUsd>=0?'+':''}$${Math.abs(pnlUsd).toFixed(2)}</div>
      </div>
      <div style="background:var(--s3);border-radius:6px;padding:4px 6px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">P&L net</div>
        <div style="font-size:11px;font-weight:700;color:${netPnl>=0?'var(--up)':'var(--down)'};">${netPnl>=0?'+':''}$${Math.abs(netPnl).toFixed(2)}</div>
        <div style="font-size:7px;color:var(--t3);">−$${fees.toFixed(2)} frais</div>
      </div>
      <div style="background:var(--s3);border-radius:6px;padding:4px 6px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">Entrée</div>
        <div style="font-size:9px;font-weight:600;color:var(--t2);font-family:var(--font-mono);">${fmt(pos.entryPrice)}</div>
        <div style="font-size:7px;color:var(--t3);">Actuel: ${fmt(ps.price)}</div>
      </div>
    </div>

    <!-- TP/SL status row -->
    <div style="display:flex;gap:5px;margin-bottom:6px;">
      ${tpSet ? `
      <div style="flex:1;background:rgba(0,232,122,.06);border:1px solid rgba(0,232,122,.2);border-radius:6px;padding:4px 6px;">
        <div style="font-size:7px;color:var(--up);">🎯 TP: ${fmt(pos.tp)}</div>
        <div style="font-size:8px;font-weight:600;color:var(--up);">+${Math.abs(tpDist).toFixed(2)}%</div>
      </div>` : `
      <div style="flex:1;background:var(--s3);border:1px dashed var(--border);border-radius:6px;padding:4px 6px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">🎯 TP non défini</div>
      </div>`}
      ${slSet ? `
      <div style="flex:1;background:rgba(255,61,107,.06);border:1px solid rgba(255,61,107,.2);border-radius:6px;padding:4px 6px;">
        <div style="font-size:7px;color:var(--down);">🛑 SL: ${fmt(pos.sl)}</div>
        <div style="font-size:8px;font-weight:600;color:var(--down);">−${Math.abs(slDist).toFixed(2)}%</div>
      </div>` : `
      <div style="flex:1;background:var(--s3);border:1px dashed var(--border);border-radius:6px;padding:4px 6px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">🛑 SL non défini</div>
      </div>`}
      ${rrRatio ? `<div style="background:var(--s3);border-radius:6px;padding:4px 6px;text-align:center;min-width:40px;">
        <div style="font-size:7px;color:var(--t3);">R/R</div>
        <div style="font-size:10px;font-weight:700;color:${parseFloat(rrRatio)>=1.5?'var(--up)':'var(--gold)'};">${rrRatio}×</div>
      </div>` : ''}
    </div>

    <!-- Signal agreement -->
    <div style="padding:4px 8px;border-radius:6px;margin-bottom:5px;
         background:${agreeCol}11;border:1px solid ${agreeCol}33;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:8px;font-weight:600;color:${agreeCol};">${agreeIcon} ${agreeMsg}</span>
        <div style="display:flex;gap:4px;align-items:center;">
          <span style="font-size:8px;font-weight:800;color:${col};">${signal==='LONG'?'↑':signal==='SHORT'?'↓':'—'} ${signal}</span>
          <span style="font-size:7px;color:var(--t3);">${strength}</span>
        </div>
      </div>
    </div>

    <!-- AT/AF compact -->
    <div style="display:flex;gap:6px;font-size:7px;color:var(--t3);align-items:center;">
      <span>AT <span style="color:${tech.atScore>=0?'var(--up)':'var(--down)'};">${tech.atScore>=0?'+':''}${(tech.atScore*100).toFixed(0)}%</span></span>
      <span>AF <span style="color:${fund.fundScore>=0?'var(--up)':'var(--down)'};">${fund.fundScore>=0?'+':''}${(fund.fundScore*100).toFixed(0)}%</span></span>
      <span>↑${bulls} →${neuts} ↓${bears}</span>
      ${topSigs.length ? `<span style="color:var(--t3);">${topSigs.join(' · ')}</span>` : ''}
    </div>

  </div>`;
}

// ── Sync ALL pair controls with live computed values ──────────
// Called: on price fetch, on init, and from updatePairAnalysisPanels
function syncPairPresets() {
  const fc  = S.feeConfig;
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const tradingCap = Math.max(10, S.tradingAccount);  // v6.8: min $10

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const ps      = S.pairStates[pair];
    const pairKey = pair.replace('/','_');
    if(!ps) return;

    // ── 1. Live price ─────────────────────────────────────────
    const pxEl  = document.getElementById('ppos_px_'+pairKey);
    const chgEl = document.getElementById('ppos_chg_'+pairKey);
    const priceStr = cfg.dec>=4 ? ps.price.toFixed(cfg.dec)
                                : '$'+Math.floor(ps.price).toLocaleString();
    if(pxEl)  pxEl.textContent = priceStr;
    if(chgEl) {
      chgEl.textContent = (ps.pnl24h>=0?'+':'')+ps.pnl24h.toFixed(2)+'%';
      chgEl.style.color = ps.pnl24h>=0?'var(--up)':'var(--down)';
    }

    // ── 2. Optimal stake (fee-aware) ─────────────────────────
    if(!ps.userStake) {
      const prob       = lmsrP(ps);
      const conviction = Math.abs(prob - 0.5) * 2;
      const base       = tradingCap * 0.05;
      const max        = tradingCap * 0.15;
      const feePct     = (fc.takerRate + fc.slippage) * 2 + fc.fundingRate * 3;
      const taxPct     = (reg?.inclusion||0) * (reg?.rate||0);
      const minMove    = feePct + taxPct;
      // Mise proportionnelle à conviction, minimum rentable
      const raw = conviction > minMove * 2.5  // v7.3 OPT · was ×2 · mises réduites si conviction moyenne
        ? base + (max - base) * conviction
        : base * 0.5;  // mise réduite si signal faible
      ps.stake = Math.max(10, Math.round(raw / 10) * 10);
    }

    // ── 3. Optimal cycle (LMSR signal speed) ─────────────────
    // [MARCHÉ RÉPARÉ · 30/09/2026] AA seulement : en EV / RE le cycle d'une paire est sa bougie close, cette cadence n'est que la fréquence à laquelle on
    // regarde si elle est close — la régler sur le prix du marché (réparé : près de 50 % tant que les agents hésitent) retarderait chaque cycle jusqu'à
    // 2 min (Home à l'écran, relecture indépendante). En EV / RE, 10f la règle déjà (conviction de la décision : 20 à 90 s)
    if(!ps.userCycleSet && !((typeof _mktOn === 'function') && _mktOn())) {
      const prob       = lmsrP(ps);
      const conviction = Math.abs(prob - 0.5) * 2;
      const raw        = ps.raw || {};
      const sigma      = raw?.stddev?.annualVol || 0;
      // High conviction + low vol → fast cycle; weak signal + high vol → slow
      let targetSec;
      if(conviction > 0.6 && sigma < 0.5)     targetSec = 30;   // fort signal, calme
      else if(conviction > 0.4)                targetSec = 60;
      else if(conviction > 0.25)               targetSec = 120;
      else if(sigma > 0.8)                     targetSec = 300;  // volatile → prudent
      else                                     targetSec = 180;
      // Snap to nearest CYCLE_STEPS value
      const CYCLE_STEPS = [10,30,60,120,300,600,900,1800,3600];
      const nearest = CYCLE_STEPS.reduce((prev,cur) =>
        Math.abs(cur - targetSec) < Math.abs(prev - targetSec) ? cur : prev
      );
      ps.cycleMax = nearest;
    }

    // ── 4. Lever suggestion (pre-fill display — user still controls) ─
    const lev = ps.pairLeverage || 1;

    // ── 5. Update UI controls ────────────────────────────────
    const stakeEl = document.getElementById('pstake_'+pairKey);
    const cycleEl = document.getElementById('pcycle_'+pairKey);
    const levEl   = document.getElementById('plev_'+pairKey);

    if(stakeEl) {
      stakeEl.textContent = '$'+ps.stake;
      stakeEl.style.color = ps.userStake ? 'var(--ice)' : 'var(--gold)';
    }
    if(cycleEl) {
      cycleEl.textContent = fmtDur(ps.cycleMax);
      cycleEl.style.color = ps.userCycleSet ? 'var(--ice)' : 'var(--up)';
    }
    if(levEl) {
      levEl.textContent = '×'+lev;
      levEl.style.color = lev===1?'var(--up)':lev<=5?'var(--gold)':lev<=10?'#ff9500':'var(--down)';
    }

    // Sync action card frequency label
    const freqEl = document.getElementById('ac2_freq_'+pairKey);
    if(freqEl) freqEl.textContent = fmtDur(ps.cycleMax);
    const thrLbl = document.getElementById('ac2_thrlbl_'+pairKey);
    if(thrLbl) thrLbl.textContent = ((ps.threshold||0.65)*100).toFixed(0)+'% · '+fmtDur(ps.cycleMax);
  });
}


function updateAllPairCtrlLabels() {
  Object.entries(S.pairStates).forEach(([pair, ps]) => {
    const key = pair.replace('/','_');
    const cfg = PAIRS[pair];
    const se   = document.getElementById('pstake_'+key);
    const ce   = document.getElementById('pcycle_'+key);
    const le   = document.getElementById('plev_'+key);
    const pxe  = document.getElementById('ppos_px_'+key);
    const freqEl = document.getElementById('ac2_freq_'+key);   // ← action card sync

    if(se) se.textContent = ps.stake > 0 ? '$'+ps.stake : 'auto';
    if(ce) ce.textContent = fmtDur(ps.cycleMax);
    if(freqEl) freqEl.textContent = fmtDur(ps.cycleMax);

    // Sync threshold+cycle label on action card
    const thrLbl = document.getElementById('ac2_thrlbl_'+key);
    if(thrLbl) thrLbl.textContent = ((ps.threshold||0.65)*100).toFixed(0)+'% · '+fmtDur(ps.cycleMax);

    if(le) {
      const lev = ps.pairLeverage || 1;
      le.textContent = '×'+lev;
      le.style.color = lev === 1 ? 'var(--up)'
                     : lev <= 5  ? 'var(--gold)'
                     : lev <= 10 ? '#ff9500'
                     : 'var(--down)';
    }
    if(pxe && cfg) {
      const priceStr = cfg.dec >= 4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
      pxe.textContent = priceStr;
    }

    // ── Suggestion strip for manual positions ──
    updateManualSuggestion(pair, key);
  });
}

// ============================================================
// MINI CHARTS (4 pairs grid on market page)
// ============================================================
function drawMiniCharts() {
  const grid = document.getElementById('miniChartsGrid');
  if(!grid) return;

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const ps = S.pairStates[pair];
    const pairKey = pair.replace('/','_');
    const cardId  = 'mci_'+pairKey;
    const canvasId= 'mcc_'+pairKey;

    let card = document.getElementById(cardId);
    if(!card) {
      card = document.createElement('div');
      card.id = cardId;
      card.className = 'mini-chart-card'+(pair===S.activePair?' selected':'');
      // Tap → pair detail sheet; also marks pair as active
      let _pt = null;
      card.addEventListener('pointerdown', () => {
        _pt = setTimeout(() => { _pt=null; showPairDetail(pair); }, 300);
      });
      card.addEventListener('pointerup', () => {
        if(_pt){ clearTimeout(_pt); _pt=null; selectPair(pair); showPairDetail(pair); }
      });
      card.addEventListener('pointerleave', () => { if(_pt){ clearTimeout(_pt); _pt=null; } });
      card.innerHTML = `
        <div class="mini-chart-header">
          <div>
            <div class="mini-chart-pair" style="color:${cfg.color}">${pair}</div>
            <div class="mini-chart-pnl" id="mc_pnl_${pairKey}">+0.00%</div>
          </div>
          <div style="text-align:right;">
            <div class="mini-chart-price" id="mc_px_${pairKey}">$0</div>
            <div id="mc_sig_${pairKey}" style="font-size:8px;font-weight:700;margin-top:1px;">—</div>
          </div>
        </div>
        <canvas id="${canvasId}" style="width:100%;height:54px;display:block;"></canvas>
        <div style="font-size:7px;color:var(--t4);text-align:center;margin-top:2px;opacity:.5;">Tap pour détails</div>`;
      grid.appendChild(card);
    } else {
      card.className = 'mini-chart-card'+(pair===S.activePair?' selected':'');
    }

    // Patch text
    const pnlEl = document.getElementById('mc_pnl_'+pairKey);
    const pxEl  = document.getElementById('mc_px_'+pairKey);
    if(pnlEl) {
      pnlEl.textContent = (ps.pnl24h>=0?'+':'')+ps.pnl24h.toFixed(2)+'%';
      pnlEl.style.color = ps.pnl24h>=0?'var(--up)':'var(--down)';
    }
    if(pxEl) pxEl.textContent = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
    const sigEl = document.getElementById('mc_sig_'+pairKey);
    if(sigEl) {
      const p = lmsrP(ps);
      if(p>.60)      { sigEl.textContent='↑ BUY';  sigEl.style.color='var(--up)'; }
      else if(p<.40) { sigEl.textContent='↓ SELL'; sigEl.style.color='var(--down)'; }
      else {
        // v6.5: show LONG/SHORT hint even on hold if signal is directional
        const hint = (ps.qYes||100) > (ps.qNo||100)+10 ? '↑ LONG?' : (ps.qNo||100) > (ps.qYes||100)+10 ? '↓ SHORT?' : '→ WAIT';
        const hColor = hint.includes('LONG') ? 'rgba(0,232,122,0.6)' : hint.includes('SHORT') ? 'rgba(255,61,107,0.6)' : 'var(--gold)';
        sigEl.textContent = hint; sigEl.style.color = hColor;
      }
    }

    // Draw mini candle chart
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const W = canvas.parentElement.offsetWidth || 160;
    const H = 56;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const data = ps.candles.slice(-30);
    if(data.length < 2) return;
    ctx.clearRect(0,0,W,H);

    const mn = Math.min(...data.map(c=>c.l)), mx = Math.max(...data.map(c=>c.h));
    const rng = mx-mn||1;
    const cw = W/data.length;
    const bw = Math.max(1.5, cw*.55);

    // Gradient fill area
    const last = data[data.length-1];
    const first= data[0];
    const lineUp = last.c >= first.c;
    const fillCol = lineUp ? 'rgba(0,232,122,' : 'rgba(255,61,107,';

    const pts = data.map((c,i)=>({ x: i*cw+cw/2, y: H-((c.c-mn)/rng)*(H-4)-2 }));
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, fillCol+'.15)');
    grad.addColorStop(1, fillCol+'0)');
    ctx.beginPath();
    ctx.moveTo(0, H);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(W, H);
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    pts.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.strokeStyle = lineUp ? '#00e87a' : '#ff3d6b';
    ctx.lineWidth = 1.5; ctx.stroke();

    // Last price dot
    const lp = pts[pts.length-1];
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, 3, 0, Math.PI*2);
    ctx.fillStyle = lineUp ? '#00e87a' : '#ff3d6b';
    ctx.fill();
  });
}

// ============================================================
// ACTION CARD MINI CHARTS (inline sparklines in action cards)
// ============================================================
let _drawMiniPending = false;
function drawActionMiniCharts() {
  if(_drawMiniPending) return; _drawMiniPending = true;
  requestAnimationFrame(() => { _drawMiniPending = false; _drawActionMiniChartsInner(); });
}
function _drawActionMiniChartsInner() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const ps = S.pairStates[pair];
    const pairKey = pair.replace('/','_');
    const canvasId = 'ac2_chart_'+pairKey;
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;

    const W = canvas.offsetWidth || canvas.parentElement.offsetWidth || 130;
    const H = 36;
    if(canvas.width !== W) canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if(!ps || !ps.candles) return;   // [16/08, attrapé par Guardian] paire custom sans état dans ce mode : sparkline muette plutôt que crash
    const data = ps.candles.slice(-20);
    if(data.length < 2) return;
    ctx.clearRect(0,0,W,H);

    const mn = Math.min(...data.map(c=>c.l)), mx = Math.max(...data.map(c=>c.h));
    const rng = mx-mn||1;
    const lineUp = data[data.length-1].c >= data[0].c;

    const pts = data.map((c,i)=>({ x:(i/(data.length-1))*W, y:H-((c.c-mn)/rng)*(H-4)-2 }));

    // Fill
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,(lineUp?'rgba(0,232,122,':'rgba(255,61,107,')+'.2)');
    grad.addColorStop(1,(lineUp?'rgba(0,232,122,':'rgba(255,61,107,')+'.0)');
    ctx.beginPath(); ctx.moveTo(0,H);
    pts.forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.lineTo(W,H);
    ctx.fillStyle=grad; ctx.fill();

    // Line
    ctx.beginPath();
    pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle = lineUp?'#00e87a':'#ff3d6b';
    ctx.lineWidth=1.5; ctx.stroke();
  });
}

// ============================================================
// LEARNING ENGINE — Central agent reward/punishment system
// ============================================================

// Called whenever a signal outcome is known (trade closed, cycle resolved, position closed)
// source: 'trade'|'position'|'cycle'
// outcome: 'profit'|'loss'  (profit = agents who predicted correctly should be rewarded)
// pnlPct: actual % P&L (signed)
// pair: which pair this was on
// ============================================================
// MOTEUR D'APPRENTISSAGE ADAPTATIF — Correction d'erreurs permanente
// ============================================================
// ═══ [FITNESS GLISSANTE · 16/09/2026] point 3 du conseil « évolution à l'infini » (Rams 16/09) ═══
// Jusqu'ici la fitness s'ADDITIONNAIT (+42 × force × amplitude par bonne réponse, −18 par erreur, bots +5/−1,2 × amplitude)
// jusqu'au plafond : tout le monde finissait à 1 600 et la sélection s'éteignait (audit 14/09, capture 15/09 : 4 sièges à
// 1 600-1 652). Désormais la fitness d'un siège = 350 + 1 000 × E, où E ∈ [−1, +1] est l'espérance nette de ses
// FIT_WINDOW derniers jugements (±1 pondéré par force du signal × amplitude × décroissance — poids SYMÉTRIQUES : un
// pile-ou-face vaut E = 0 → 350). Toujours-juste → 1 350, jamais le plafond ; un siège qui se met à perdre redescend
// en moins de 30 jugements ; les vieux régimes sortent de la fenêtre. Moins de FIT_MIN_N jugements → fitness de
// naissance conservée. À la fusion (07) la fenêtre repart de zéro : elle mesure le génome courant.
const FIT_WINDOW = 60, FIT_MIN_N = 5;
// [FENÊTRE APPRENANTE · 26/09/2026] 60 était MA constante (Rams : « pourquoi 60 et pas plus, et évolutif ? »). La fenêtre EFFECTIVE est
// désormais apprise par rejeu exact sur les jugements (10i _fitWindowRefresh → S.fitWindowRule) ; 60 reste le défaut tant que la
// preuve manque. Les jugements sont gardés plus longtemps (FIT_KEEP) pour que les grandes fenêtres soient rejouables, avec le n°
// de l'événement (k = S._realJudgments) qui aligne tous les agents sur le même jugement.
const FIT_KEEP = 240;
function _fitWindow() {
  var r = (typeof S !== 'undefined' && S) ? S.fitWindowRule : null;
  var w = (r && r.armed) ? Math.round(Number(r.window)) : 0;
  return (w >= 10 && w <= FIT_KEEP) ? w : FIT_WINDOW;
}
// Échelle de la fitness — une seule, pour la bougie (_fitOf) et les horizons (_fitHz) : 350 + 1 000 × E, bornée 50-2 000. [FITNESS AUX HORIZONS · 28/09/2026]
function _fitScale(E) { return Math.max(50, Math.min(2000, Math.round(350 + 1000 * E))); }
// Fitness sur les W derniers jugements d'une liste (pur) ; null si moins de FIT_MIN_N.
function _fitOf(js, W) {
  var n = js.length, start = Math.max(0, n - W);
  if (n - start < FIT_MIN_N) return null;
  var sw = 0, se = 0;
  for (var i = start; i < n; i++) { sw += js[i].w; se += js[i].s * js[i].w; }
  var E = sw > 0 ? se / sw : 0;
  return _fitScale(E);
}
function _fitJudge(a, sign, w) {
  if (!a) return 0;
  if (!Array.isArray(a._judgments)) a._judgments = [];
  a._judgments.push({ s: sign >= 0 ? 1 : -1, w: Math.max(0.01, Number(w) || 0), k: (typeof S !== 'undefined' && S && Number(S._realJudgments)) || 0 });
  if (a._judgments.length > FIT_KEEP) a._judgments.splice(0, a._judgments.length - FIT_KEEP);
  var f = (typeof _fitCurrent === 'function') ? _fitCurrent(a) : _fitOf(a._judgments, _fitWindow());   // [FITNESS AUX HORIZONS · 28/09/2026] un siège : son bilan aux horizons quand il l'a (et que le garde-fou le laisse) ; sinon, et pour un bot / le méta / le composite : sa fenêtre de jugements
  if (f === null) return a.fitness;
  a.fitness = f;
  if (typeof _lmsrRefill === 'function') _lmsrRefill(a);   // [MARCHÉ LMSR À PART · 28/09/2026] le portefeuille de marché repart de la fitness jugée (avant : c'était la même variable)
  return a.fitness;
}
// Recalcule la fitness de tous les agents avec la fenêtre courante (appelé par 10i quand la règle s'arme ou se désarme).
// [FITNESS AUX HORIZONS · 28/09/2026] only (facultatif) : {id: 1} → ces agents seulement (les sièges qui viennent d'être jugés aux horizons, _vjJudge) ;
// aussi appelé quand la définition vivante de la fitness bascule (_vjRefresh). Toujours la même porte (_fitCurrent), aucun autre écrivain.
function _fitRecomputeAll(only) {
  if (typeof S === 'undefined' || !S || !Array.isArray(S.agents)) return 0;
  var W = _fitWindow(), n = 0;
  S.agents.forEach(function (a) {
    if (!a || (only && !only[a.id])) return;
    var f = (typeof _fitCurrent === 'function') ? _fitCurrent(a) : _fitOf(Array.isArray(a._judgments) ? a._judgments : [], W);   // [FITNESS AUX HORIZONS · 28/09/2026] même porte que _fitJudge
    if (f !== null) { if (f !== a.fitness) { a.fitness = f; n++; } if (typeof _lmsrRefill === 'function') _lmsrRefill(a); }   // [MARCHÉ LMSR À PART · 28/09/2026] recharge dès qu'il y a une valeur : avant, la fitness débitée différait toujours → écriture → recharge
  });
  return n;
}
window._fitJudge = _fitJudge;
window._fitWindow = _fitWindow; window._fitOf = _fitOf; window._fitRecomputeAll = _fitRecomputeAll; window._fitScale = _fitScale;

function learnFromOutcome(source, pnlPct, pair) {
  // ═══ [ÉCOLE · 17/09/2026] L'ÉCOLE NE NOTE PLUS (décision Rams 17/09) ═══
  // AA tourne sur des bougies fabriquées (générateur 08, réservé à AA depuis 1b-b) : ses cycles jugeaient les 31 agents
  // — les mêmes qu'en EV — dix paires toutes les deux minutes, réseau coupé compris (capture Rams 17/09 01:57 : le DAO
  // bouge pendant « Connexion perdue »). 90 % des 60 jugements de la fenêtre venaient d'une marche aléatoire, et le
  // poids des voix en EV avec. Désormais seuls les résultats RÉELS (EV, RE) jugent : fitness, score, confiance, mémoire,
  // compétence par paire, régime, leçons, évolution. AA reste un bac à sable et une vitrine : rien n'est écrit.
  if (S.tradingMode === 'sim') { try { S._simLearnSkipped = (S._simLearnSkipped || 0) + 1; } catch(e) {} return; }
  // [COMPTEURS RÉGLAGES · 24/09/2026] jugements RÉELS (EV/RE) depuis « l'école ne note plus » — le compteur honnête des Réglages
  try { S._realJudgments = (S._realJudgments || 0) + 1; } catch(e) {}

  // ── UN NON-EVENEMENT N ENSEIGNE RIEN (30/07/2026) ───────────────────
  // `const won = pnlPct > 0` classait pnlPct === 0 comme une PERTE.
  // Or le fichier 10 appelle learnFromOutcome('cycle', 0, pair) sur quatre
  // chemins ou le bot decide de NE PAS trader (l.1775 bases RE non solides,
  // l.1811 gate d entree refuse, l.1902 marge d exposition insuffisante,
  // l.1907 mise sous 2 $). Chaque abstention punissait donc tous les agents
  // haussiers et recompensait tous les baissiers.
  // Comme mag = |0| = 0, la fitness ne bougeait PAS : le degat restait
  // invisible dans les metriques de fitness pendant que score, conf, errors
  // et streak derivaient. D ou corr(fitness, justesse) = +0,038 mesuree sur
  // 28 agents — la fitness et la decision avaient ete decouplees.
  // Zero n est pas une perte : c est l absence de resultat.
  if (!(Math.abs(Number(pnlPct)) > 0)) return;

  // v7.0: Update per-regime fitness
  // [DOUBLE JUGEMENT · 26/09/2026] 'position' = la fermeture elle-même (02 closePosition, seule voie désormais) ; 'trade' gardé pour les bancs et d'éventuels appelants externes
  if((source === 'trade' || source === 'position') && typeof detectMarketRegime === 'function' && pnlPct != null) {
    const _regime = detectMarketRegime();
    S.agents.forEach(a => {
      // Agent ayant un score actif dans ce trade
      // [POIDS PAR ATTRIBUTION · 16/09/2026] regimeFitness compte les votes ALIGNÉS de CET agent (signe du vote × P&L),
      // plus le résultat du trade copié à tous les votants (c'est pour ça que les 21 sièges affichaient « calm 282/498 »
      // identique) : wins/total devient la compétence propre du siège dans ce régime, sumPnl ce que SES votes auraient rapporté.
      const _va = _agentPairVote(a, pair, a.score||0);
      if(Math.abs(_va) > 0.05) updateRegimeFitness(a, _regime, (_va > 0 ? 1 : -1) * pnlPct * ((S.tradingMode === 'real') ? 5 : (S.tradingMode === 'paperReal') ? 3 : 1));   // [PHASE 1] vote sur LA paire
    });
    S._lastRegime = _regime;
  }
  const won   = pnlPct > 0;
  // ★ FEEDBACK REEL (07/07/2026) · la realite pese plus lourd que la simulation.
  // Grace au multiplexeur, S.tradingMode est TOUJOURS le mode du trade au moment
  // de cet appel : un trade sur VRAIS prix forge la fitness des agents plus fort
  // qu'un trade du moteur simule — Evaluation x3, Reel x5, ecole x1. C'est la
  // boucle qui transforme les vrais resultats en apprentissage au lieu de les
  // perdre : l'ecole propose, l'examen et le terrain CORRIGENT.
  const _modeW = (S.tradingMode === 'real') ? 5 : (S.tradingMode === 'paperReal') ? 3 : 1;
  const mag   = Math.abs(pnlPct) * _modeW;
  const decay = source==='position' ? 1.3 : source==='trade' ? 1.0 : 0.7;

  const adjustments = [];

  S.agents.forEach(a => {
    // Bots d'exécution : leur score reste 0 (role neutre), mais leur fitness évolue
    if(a.isBot) {
      // [MÉRITE DES BOTS · 26/09/2026] Rams : « les bots sont cassés quasi en permanence » (DAO 26/09 20:04 : les 9 à 50 T$). Ici, chaque bot était
      // jugé sur le SIGNE de chaque résultat du système (trade gagné / perdu, bougie montée / descendue) × son amplitude : les 9
      // bots avaient donc la MÊME fenêtre de 60 jugements (backups 21, 23, 25/09 : identiques au jugement près) et la même
      // fitness — celle du système, pas la leur. Le système perdait → les 9 tombaient ensemble au plancher 50 (« cassés »), et
      // aucune revigoration automatique ne les relevait. Un bot n'est plus jugé ici : il l'est sur SES actes vérifiés
      // (_botPredict → _botMeritAudit ; TWAP et Smart Sizer à leur résultat : _botJudgeMeasured). [SURVEILLANCE PERMANENTE · 27/09/2026] affirmations jugées
      // dès que le marché tranche (±1 ATR, plus de 30 min) ; trades des bots jugés à leur résultat réel (02 closePosition, pos._bot).
      return;
    }
    if(a.isMeta) {
      // [MÉRITE DE L'ÉVOLUEUR · 26/09/2026] l'Évolueur était jugé sur le signe du résultat du système (comme les bots) : il est désormais jugé sur
      // SES actes — chaque évolution ouvre un essai (_evoTrialStart, 07) : le nouveau génome contre l'ancien, sur les mêmes
      // événements (ombre calculée au roster, _evoShadowVotes) ; conclu après 30 jugements (_evoTrialConclude).
      return;
    }

    // [PHASE 1 · 12/09/2026] l'agent est jugé sur SON VOTE SUR CETTE PAIRE (ps.roster : 10f vient
    // de le calculer au cycle ; à la clôture d'une position, ≤ 1 cycle d'âge), plus sur a.score
    // (biais appris global). Repli a.score tant que la paire n'a pas de roster.
    const _vote         = _agentPairVote(a, pair, a.score || 0);
    const aligned       = (won && _vote > 0) || (!won && _vote < 0);
    const signalStrength= Math.abs(_vote);
    try { if (S.evoTrials && S.evoTrials[a.id]) _evoTrialJudge(a, pair, won, mag, decay, _vote); } catch(e) {}   // [MÉRITE DE L'ÉVOLUEUR · 26/09/2026] l'ancien génome est jugé sur le MÊME événement
    // [ABSTENTION · 26/09/2026] Rams : « à chaque fois que tu pousses, auto-revigoration, c'est normal ? ». Une abstention était jugée FAUSSE :
    // aligned = (gagné et vote > 0) ou (perdu et vote < 0) — un vote nul n'est jamais aligné → −1 à chaque événement (poids plancher
    // 0,01). Un conseiller qui dit « hold », un scout qui attend sa donnée (flux, positionnement, bougies 1 h/4 h après un redémarrage),
    // un gardien qui approuve (+0,05) accumulaient des « erreurs » sans avoir rien dit. Rejeu backups 23 et 25/09 : 14 et 13 sièges
    // « cassés » (≤ 80 T$) ; sans ces jugements, 7 et 6 (macro, fundamental, mean_rev, contrarian, hedge : 100 % de leurs jugements
    // étaient des abstentions) → 4 cassés ou plus en permanence → revigoration. Même règle que « zéro n'est pas une perte » (30/07)
    // et que la compétence par paire / par régime (seuil 0,05) : sans avis, pas de jugement.
    if (signalStrength <= 0.05) {
      // Pas de jugement, mais la fitness reste celle de SA fenêtre, comme pour un siège jugé : avant, le jugement (même faux)
      // la recalculait à chaque clôture et effaçait les écritures additives héritées (02 clôture « v6.0 », 08 ordres LMSR).
      try { const _fw = (typeof _fitCurrent === 'function') ? _fitCurrent(a) : _fitOf(a._judgments || [], _fitWindow()); if (_fw !== null) a.fitness = _fw; if (_fw !== null && typeof _lmsrRefill === 'function') _lmsrRefill(a); } catch(e) {}   // [FITNESS AUX HORIZONS · 28/09/2026] même porte que _fitJudge · [MARCHÉ LMSR À PART · 28/09/2026] et même recharge du portefeuille de marché
      return;
    }
    // [COMPÉTENCE PAR PAIRE · 13/08/2026] le journal identifiait déjà le meilleur/pire
    // agent PAR PAIRE à chaque cycle (Learn[cycle][SOL] → 🏆/⚠) puis jetait l'info.
    // Désormais elle s'accumule : S.agentPairSkill[agent][paire] = {w,l} — et le vote
    // du conseil la pondère (un agent excellent sur SOL pèse plus lourd SUR SOL).
    if (pair && signalStrength > 0.05) {
      try {
        if (!S.agentPairSkill) S.agentPairSkill = {};
        if (!S.agentPairSkill[a.id]) {
          // rotation légère : purger les agents remplacés quand la table grossit
          if (Object.keys(S.agentPairSkill).length > 80) {
            const liveIds = new Set((S.agents || []).map(x => x.id));
            Object.keys(S.agentPairSkill).forEach(id => { if (!liveIds.has(id)) delete S.agentPairSkill[id]; });
          }
          S.agentPairSkill[a.id] = {};
        }
        if (!S.agentPairSkill[a.id][pair]) S.agentPairSkill[a.id][pair] = { w: 0, l: 0 };
        const _sk = S.agentPairSkill[a.id][pair];
        if (aligned) _sk.w++; else _sk.l++;
        // [SKILL BORNÉ · 06/09] plafond 500 échantillons (halving) : fenêtre glissante, plus d'accumulation à vie
        if (_sk.w + _sk.l > 500) { _sk.w = Math.round(_sk.w / 2); _sk.l = Math.round(_sk.l / 2); }
      } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
    }
    const prevFitness   = a.fitness;
    const prevScore     = a.score;
    const prevConf      = a.conf;

    if(aligned) {
      // ── Agent correct : récompense + renforcement ──────────────
      const reward = signalStrength * mag * decay * 42;  // v7.2 TURBO · ×3 (ex: 14)
      _fitJudge(a, 1, signalStrength * mag * decay);   // [FITNESS GLISSANTE] reward reste le montant affiché (totalReward)
      a.learningEvents = (a.learningEvents||0) + 1;
      a.totalReward    = (a.totalReward||0) + reward;
      a.streak         = (a.streak||0) + 1;
      a.errors         = a.errors || 0;
      a.lastPnl        = pnlPct;
      // Augmenter confiance et renforcer signal dans la bonne direction
      a.conf  = Math.min(0.99, a.conf + signalStrength * 0.054);  // v7.2 TURBO · ×3 (ex: 0.018)
      a.score = Math.max(-1, Math.min(1, a.score + (won?1:-1) * signalStrength * 0.030));  // v7.2 TURBO · ×3 (ex: 0.010)
      // Stocker dans mémoire positive
      if(!a.memory) a.memory = [];
      enrichMemory(a, true, pnlPct, pair);
      if(a.memory.length > 20) a.memory.shift();
    } else {
      // ── Agent incorrect : pénalité + correction automatique ────
      const penalty = signalStrength * mag * decay * 18;  // v7.2 TURBO · ×3 (ex: 6)
      _fitJudge(a, -1, signalStrength * mag * decay);   // [FITNESS GLISSANTE] même poids qu'une bonne réponse (symétrie)
      a.learningEvents = (a.learningEvents||0) + 1;
      a.totalReward    = (a.totalReward||0) - penalty;
      a.errors         = (a.errors||0) + 1;
      a.streak         = 0;
      a.lastPnl        = pnlPct;
      // CORRECTION : réduire confiance + inverser partiellement le score (apprentissage par erreur)
      a.conf  = Math.max(0.35, a.conf - signalStrength * 0.045);  // v7.2 TURBO · ×3 (ex: 0.015)
      // La correction est proportionnelle au nombre d'erreurs consécutives — s'adapte plus vite si récidive
      const correctionFactor = Math.min(0.075, 0.024 + (a.errors * 0.006));  // v7.2 TURBO · ×3
      // ── SIGNE CORRIGE (30/07/2026) ───────────────────────────────────
      // Etait : a.score - (won?1:-1) * signalStrength * correctionFactor
      // Ce signe opposé à celui de la branche alignée poussait l agent qui se
      // trompe PLUS LOIN dans son erreur, au lieu de le ramener. Simule sur le
      // code reel, agent haussier a +0,600 punit 8 fois : +0,614 -> +0,633 ->
      // +0,683 -> +0,755 -> +0,853. Le commentaire d origine annoncait pourtant
      // « inverser partiellement le score » : l intention etait juste, le signe
      // etait faux. Les deux branches doivent corriger vers la MEME realite.
      a.score = Math.max(-1, Math.min(1, a.score + (won?1:-1) * signalStrength * correctionFactor));
      a.corrections = (a.corrections||0) + 1;
      // Stocker dans mémoire d'erreurs pour éviter de répéter
      if(!a.memory) a.memory = [];
      enrichMemory(a, false, pnlPct, pair);
      if(a.memory.length > 20) a.memory.shift();
    }

    // ── Auto-régulation : si l'agent accumule trop d'erreurs → reset partiel ──
    // v7.3 OPT · Deux conditions : fitness basse OU trop d'erreurs (même avec fitness correcte)
    if((a.errors >= 5 && a.fitness < 120) || a.errors >= 15) {
      // Réinitialisation douce : score revient vers 0, conf stabilisée
      a.score  = a.score * 0.3;  // retour vers neutralité
      a.conf   = 0.50;
      const reason = a.errors >= 15 ? 'trop d\'erreurs' : 'fitness critique';
      a.errors = 0;
      a.corrections = (a.corrections||0) + 1;
      // Le recalibrage est fréquent en marché CALM (les agents accumulent vite 15
      // "erreurs" sur les petits mouvements). On ne journalise qu'1 fois sur 5 pour
      // ne pas noyer le journal ni alourdir la sim (le splice répété coûtait du temps).
      if (Math.random() < 0.2) {
        S.chainLog.push({ icon:'🔄', desc:`${a.name} auto-recalibré · ${reason}`, hash:rndHash(), time:nowStr() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
    }

    // ── Streak bonus ──
    // [FITNESS GLISSANTE · 16/09/2026] plus de bonus de série sur la fitness (il était écrasé au jugement suivant) : la
    // série reste visible (a.streak) et pèse dans le roster (03 : série perdante = poids ÷ 2).

    // ── Fitness history for sparkline ──
    if(!a.fitnessHistory) a.fitnessHistory = [a.fitness];
    else {
      // Push only every ~3 learn events to avoid excessive array growth
      if(S._learnCount % 3 === 0) {
        a.fitnessHistory.push(Math.round(a.fitness));
        if(a.fitnessHistory.length > 80) a.fitnessHistory.shift();
      }
    }

    adjustments.push({
      agentId:   a.id,
      agentName: a.name,
      aligned,
      fitnessDelta: a.fitness - prevFitness,
      scoreDelta:   a.score   - prevScore,
      confDelta:    a.conf    - prevConf
    });
  });

  // ── Enregistrement historique ──────────────────────────────
  S.learningHistory.push({
    cycle:  S.cycle, pair, source,
    pnlPct: +pnlPct.toFixed(3),
    won, time: nowStr(), adjustments
  });
  if(S.learningHistory.length > 200) S.learningHistory.shift();

  // ── v7.3 OPT · MÉMOIRE INTER-AGENTS (shared lessons) ──────
  // Quand un trade est significatif (|pnl| > 0.5%), on enregistre une leçon
  // que tous les agents peuvent consulter avant leurs prochaines décisions.
  if(source === 'trade' && Math.abs(pnlPct) > 0.5) {
    
    const _lessonsTarget = (typeof _getLessonsTarget === 'function') ? _getLessonsTarget() :
                           (S.tradingMode === 'real' ? 'agentLessonsReal' :
                            S.tradingMode === 'paperReal' ? 'agentLessonsPaperReal' : 'agentLessons');
    if(!S[_lessonsTarget]) S[_lessonsTarget] = [];
    if(!S.agentLessons) S.agentLessons = [];
    // Direction gagnante du marché : si won, même signe que score dominant; sinon inverse
    const avgScoreDir = adjustments.reduce((s, adj) => s + Math.sign(adj.scoreDelta || 0), 0);
    const winningDir = won
      ? (avgScoreDir > 0 ? 1 : avgScoreDir < 0 ? -1 : (pnlPct > 0 ? 1 : -1))
      : -Math.sign(avgScoreDir || pnlPct || 1);
    S[_lessonsTarget].push({
      cycle:     S.cycle,
      time:      nowStr(),
      pair,
      pnlPct:    +pnlPct.toFixed(2),
      won,
      direction: winningDir,              // direction qui aurait dû être prise
      severity:  Math.min(1, Math.abs(pnlPct) / 3)  // 3% = max
    });
    if(S[_lessonsTarget].length > 30) S[_lessonsTarget].shift();
  }

  // ── Log blockchain tous les 3 événements ──────────────────
  S._learnCount = (S._learnCount||0) + 1;
  if(S._learnCount % 3 === 0) {
    const best    = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>b.fitness-a.fitness)[0];
    const weakest = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>a.fitness-b.fitness)[0];
    S.chainLog.push({
      icon: '🧠',
      desc: `Learn[${source}][${pair}] ${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}% → 🏆${best?.name}(${Math.floor(best?.fitness||0)}T$) ⚠️${weakest?.name}(${Math.floor(weakest?.fitness||0)}T$)`,
      hash: rndHash(), time: nowStr()
    });
  }

  // [FENÊTRE APPRENANTE · 26/09/2026] tous les agents viennent d'être jugés : la fenêtre se rejuge (et recalcule les fitness si elle change) AVANT l'évolution
  try { if (typeof _fitWindowRefresh === 'function') _fitWindowRefresh(); } catch(e) {}
  // [FITNESS AUX HORIZONS · 28/09/2026] les sièges viennent d'être jugés par la porte unique : si c'est la première fois que la fitness suit les horizons, la ligne au journal vient ici, AVANT l'évolution qui va lire cette fitness
  try { if (typeof _fitHzFirst === 'function') _fitHzFirst(); } catch(e) {}

  // ── Déclenchement évolution si agent très faible ──────────
  const sorted = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>a.fitness-b.fitness);
  // v6.8: évolution infinie & agressive — déclenchement permanent
  // [ÉVOLUTION APPRISE · 28/09/2026] _evoOk : le niveau appris (gain / nuisance) quand il est prouvé, sinon le nombre posé à la main de chaque déclencheur (150, aucun, 300) ;
  // le déclencheur est transmis (A / B / C) : chaque évolution jugée devient une observation de la règle
  // le plus faible RECYCLABLE (find sur la liste triée : sans règle et sous gain c'est sorted[0], comme avant ; sous nuisance, le premier au-dessus des sièges protégés)
  const _eok = (a, d) => (typeof _evoOk === 'function') ? _evoOk(a, d) : (a.fitness < d);
  const wA = sorted.find(a => _eok(a, 150)), wB = sorted.find(a => _eok(a, Infinity)), wC = sorted.find(a => _eok(a, 300));
  if(wA) {
    triggerEvolution(wA, { trig: 'A' });  // agent faible → remplacement immédiat
  } else if(wB && S.cycle % 15 === 0) {
    triggerEvolution(wB, { trig: 'B' });  // évolution cyclique forcée (toutes les 15 décisions)
  } else if(wC && S.cycle % 8 === 0) {
    triggerEvolution(wC, { trig: 'C' });  // amélioration continue des agents en retard
  }
}

// ============================================================
// MÉMOIRE ÉPISODIQUE & MÉTAPHORES — Feature #1
// ============================================================

const METAPHOR_TEMPLATES = {
  won: [
    (a,p,pnl) => `Sur ${p}, j'ai détecté une convergence de signaux ${a.domain} renforcée par un momentum inhabituel. La conviction était haute — j'ai maintenu cap. Résultat: +${pnl.toFixed(2)}%. Retenir: la cohérence cross-temporelle précède souvent la confirmation de prix.`,
    (a,p,pnl) => `${p} montrait une divergence classique ${a.type.split('·')[0].trim()}. J'ai amplifié mon score au bon moment. +${pnl.toFixed(2)}% — signe que mes paramètres ${a.domain} étaient bien calibrés pour ce régime de marché.`,
    (a,p,pnl) => `Signal ${a.domain} sur ${p} — bruit filtré, essence conservée. Le marché a confirmé en ${pnl.toFixed(2)}% ce que j'avais perçu avant la foule. Mémoire à renforcer: confiance dans les signaux faibles persistants.`,
    (a,p,pnl) => `Architecture favorable sur ${p}: ${a.source.split('/')[0].trim()} en alignement avec le consensus LMSR. J'ai pesé juste. +${pnl.toFixed(2)}% encode une leçon: quand les sources divergentes convergent, la probabilité réelle dépasse le bruit.`,
  ],
  lost: [
    (a,p,pnl) => `${p} a inversé contre ma prédiction ${a.domain}. Erreur d'analyse: j'ai surestimé la persistance du signal ${a.type.split('·')[0].trim()}. ${pnl.toFixed(2)}% perdu — mémoriser: ce contexte de marché nuit à mon modèle. Réduire exposition en régimes similaires.`,
    (a,p,pnl) => `Signal ${a.domain} trompeur sur ${p}. Les données ${a.source.split('/')[0].trim()} étaient correctes mais le timing décalé — le marché n'était pas encore prêt. ${pnl.toFixed(2)}%. Leçon: la vérité prématurée ressemble à une erreur.`,
    (a,p,pnl) => `Sur ${p}, j'ai confondu signal fort avec signal correct. Amplitude ${a.domain} maximale mais direction opposée. ${pnl.toFixed(2)}%. Correction: la magnitude du signal ne garantit pas sa fiabilité en régime de bruit élevé.`,
    (a,p,pnl) => `${p} — contre-tendance inattendue. Mon modèle ${a.type.split('·')[0].trim()} n'avait pas capturé le retournement micro-structurel. ${pnl.toFixed(2)}%. À retenir: les anomalies de liquidité court-terme peuvent invalider les signaux fondamentaux.`,
  ]
};

function generateMetaphor(agent, won, pnlPct, pair) {
  const templates = won ? METAPHOR_TEMPLATES.won : METAPHOR_TEMPLATES.lost;
  const idx = Math.floor(Math.random() * templates.length);
  return templates[idx](agent, pair, pnlPct);
}

function enrichMemory(agent, won, pnlPct, pair) {
  if(!agent.memory) agent.memory = [];
  const metaphor = generateMetaphor(agent, won, pnlPct, pair);
  const context  = {
    lmsrProb:  lmsrP(S.pairStates[pair]),
    agentScore: _agentPairVote(agent, pair, agent.score || 0),   // [PHASE 1] vote sur LA paire (comparé par recallMemory au vote courant)
    agentConf:  agent.conf,
    fitness:    agent.fitness,
    pairTrend:  (() => {
      const ps = S.pairStates[pair];
      if(!ps || ps.candles.length < 5) return 'unknown';
      const last5 = ps.candles.slice(-5);
      return last5[last5.length-1].c > last5[0].c ? 'up' : 'down';
    })()
  };
  const episode = {
    id:       Date.now() + Math.random(),
    won,
    pnl:      +pnlPct.toFixed(3),
    pair,
    cycle:    S.cycle,
    time:     nowStr(),
    metaphor,
    context,
    recalled: 0,   // how many times this memory has been recalled
  };
  agent.memory.push(episode);
  if(agent.memory.length > 30) agent.memory.shift();

  // Add to global memory pool (cross-agent knowledge)
  S.globalMemoryPool.push({ agentId: agent.id, agentName: agent.name, episode });
  if(S.globalMemoryPool.length > 80) S.globalMemoryPool.splice(0, 20);

  return episode;
}

function recallMemory(agent, pair, currentSignal) {
  // Find most relevant past memory for current situation
  if(!agent.memory || agent.memory.length === 0) return null;
  const ps = S.pairStates[pair];
  if(!ps) return null;
  const curLmsr = lmsrP(ps);
  const curTrend = (() => {
    if(ps.candles.length < 5) return 'unknown';
    const l5 = ps.candles.slice(-5);
    return l5[l5.length-1].c > l5[0].c ? 'up' : 'down';
  })();

  // Score each memory by contextual similarity
  let best = null, bestScore = -Infinity;
  agent.memory.forEach(ep => {
    if(!ep.context) return;
    const lmsrSim = 1 - Math.abs(ep.context.lmsrProb - curLmsr);
    const trendSim = ep.context.pairTrend === curTrend ? 1 : 0;
    const signalSim = 1 - Math.abs(ep.context.agentScore - currentSignal) / 2;
    const recency = Math.min(1, ep.cycle / Math.max(1, S.cycle)) * 0.3 + 0.7; // recent = slightly better
    const sim = (lmsrSim * 0.4 + trendSim * 0.35 + signalSim * 0.25) * recency;
    if(sim > bestScore) { bestScore = sim; best = ep; }
  });

  if(best && bestScore > 0.5) {
    best.recalled = (best.recalled || 0) + 1;
    return { memory: best, strength: bestScore };
  }
  return null;
}

function showMemoryOverlay(agentId) {
  const agent = S.agents.find(a => a.id === agentId);
  if(!agent || !agent.memory || agent.memory.length === 0) {
    // [MÉMOIRE DES BOTS · 26/09/2026] un bot n'a pas d'épisodes mais a une mémoire : ses jugements (07 _botMemorySummary)
    const bm = (agent && typeof _botMemorySummary === 'function') ? _botMemorySummary(agent) : null;
    if(bm && bm.n > 0) { showToast(`🧮 ${agent.name} · ${bm.fav} jugements favorables sur ${bm.n} (${bm.pct} %) · fenêtre ${bm.window}` + (bm.interventions !== null ? ` · ${bm.interventions} intervention(s)` + (bm.contrib ? ` · apport ${bm.contrib > 0 ? '+' : '−'}$${Math.abs(bm.contrib).toFixed(2)}` : '') : ''), 6000); return; }
    showToast('📭 Aucune mémoire pour cet agent encore'); return;
  }
  let overlay = document.getElementById('memoryOverlay');
  if(!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'memoryOverlay';
    overlay.className = 'memory-overlay';
    document.body.appendChild(overlay);
  }
  const episodes = [...agent.memory].reverse();
  overlay.innerHTML = `
    <div class="memory-overlay-header">
      <div class="memory-overlay-title">${agent.emoji} ${agent.name} · Mémoire</div>
      <div class="memory-overlay-close" onclick="document.getElementById('memoryOverlay').remove()">✕</div>
    </div>
    <div class="memory-overlay-body">
      <div style="font-size:9px;color:var(--t3);margin-bottom:10px;letter-spacing:.06em;">
        ${agent.memory.length} ÉPISODES · ${agent.memory.filter(e=>e.won).length} GAGNANTS · POOL GLOBAL: ${S.globalMemoryPool.length}
      </div>
      ${episodes.map(ep => `
        <div class="memory-episode ${ep.won?'won':'lost'}">
          <div class="memory-episode-top">
            <span class="memory-episode-pair">${ep.pair} · Cycle #${ep.cycle}</span>
            <span class="memory-episode-pnl" style="color:${ep.won?'var(--up)':'var(--down)'}">
              ${ep.pnl>=0?'+':''}${ep.pnl}%
            </span>
          </div>
          <div class="memory-episode-text">"${ep.metaphor}"</div>
          <div class="memory-episode-foot">
            <span>📡 LMSR: ${ep.context ? (ep.context.lmsrProb*100).toFixed(0)+'%' : '—'}</span>
            <span>📈 Trend: ${ep.context?.pairTrend||'—'}</span>
            <span>🔁 Rappels: ${ep.recalled||0}</span>
            <span>🕐 ${ep.time}</span>
          </div>
        </div>`).join('')}
    </div>`;
  overlay.style.display = 'flex';
}

// ============================================================
// VERSION AUTO-INCREMENT — incrémente à chaque event majeur
// ============================================================

// ════════════════════════════════════════════════════════════
// v5.0 — BRAIN NETWORK · Canvas agent visualization
// ════════════════════════════════════════════════════════════
let _brainRAF = null;
let _brainNodes = null;
let _brainPhase = 0;

function initBrainNodes() {
  const canvas = document.getElementById('brainCanvas');
  if(!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const agents = S.agents || [];
  const n = agents.length;
  if(!n) return null;
  
  // v7.12 · DISPOSITION EN INFINI ANIMÉ (Lemniscate de Bernoulli)
  // Les agents sont répartis uniformément sur la courbe ∞
  // Chaque agent a sa position initiale (tParam) qui évoluera dans drawBrainNetwork
  // v7.12 · ∞ amplitudes sûres pour rotation 3D continue
  // On utilise la plus petite dimension comme référence pour que même en rotation,
  // l'∞ ne dépasse jamais les bords (horizontal ou vertical)
  const safeDim = Math.min(W, H);
  const lemA = safeDim * 0.42;    // amplitude horizontale (∞)
  const lemAy = safeDim * 0.24;   // amplitude verticale (lobe ∞)
  // Ces amplitudes garantissent qu'à n'importe quel angle de rotation,
  // la formation reste entièrement visible
  const nodes = agents.map((a, i) => {
    // Position initiale de l'agent sur la courbe (0 à 2π)
    const tParam = (i / n) * Math.PI * 2;
    return {
      a, i,
      tParam,
      baseX: W/2,
      baseY: H/2,
      angle: tParam,
      rOrbit: lemA,               // amplitude horizontale ∞
      rOrbitY: lemAy,             // amplitude verticale ∞
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.002
    };
  });
  return { canvas, ctx: canvas.getContext('2d'), nodes, W, H };
}

// Helper: calcule position (x,y) sur la lemniscate à paramètre t
// aX = amplitude horizontale, aY = amplitude verticale (peuvent différer)
function _lemniscatePoint(t, a, aY) {
  const denom = 1 + Math.sin(t) * Math.sin(t);
  const yAmp = aY != null ? aY : a * 0.55;  // ∞ plus étiré horizontalement par défaut
  return {
    x: (a * Math.cos(t)) / denom,
    y: (yAmp * Math.sin(t) * Math.cos(t)) / denom
  };
}

// v7.12 · Brain Network FUTURISTIC · Holo-AI style + 3D rotation
let _brainParticles = [];
let _brainLearnPulse = 0;
let _brainLastSpawn = 0;
let _brainScanLine = 0;
let _brainGlitchUntil = 0;
let _brainDataStreams = [];
let _brainLastGlitch = 0;

// v7.12 · PIVOT 3D · ∞ tourne sur lui-même en restant centré
// Rotation continue lente sur 3 axes, toujours centré à l'écran
let _brain3D = {
  rotX: -0.2,  // position de départ légèrement inclinée
  rotY:  0.3,
  rotZ:  0,
  // Vitesses lentes et non-synchronisées pour un mouvement hypnotique
  speedX: 0.0035 + Math.random() * 0.0015,  // ~30s/tour
  speedY: 0.0028 + Math.random() * 0.0014,  // ~35s/tour
  speedZ: 0.0020 + Math.random() * 0.0010   // ~45s/tour
};

// v7.12 · Halo central de sagesse collective + trace fantôme de rotation
let _brainWisdom = 0;           // lissage de la force collective (0-1)
let _brainPrevRot = [];         // historique des rotations récentes (trace fantôme)

// Helper: projette un point 3D (x, y, z) en 2D après rotation
// Utilise une projection perspective simple
function _project3D(x, y, z, W, H) {
  // Rotation autour X (pitch)
  let y1 = y * Math.cos(_brain3D.rotX) - z * Math.sin(_brain3D.rotX);
  let z1 = y * Math.sin(_brain3D.rotX) + z * Math.cos(_brain3D.rotX);
  // Rotation autour Y (yaw)
  let x2 = x * Math.cos(_brain3D.rotY) + z1 * Math.sin(_brain3D.rotY);
  let z2 = -x * Math.sin(_brain3D.rotY) + z1 * Math.cos(_brain3D.rotY);
  // Rotation autour Z (roll)
  let x3 = x2 * Math.cos(_brain3D.rotZ) - y1 * Math.sin(_brain3D.rotZ);
  let y3 = x2 * Math.sin(_brain3D.rotZ) + y1 * Math.cos(_brain3D.rotZ);
  // Projection perspective (distance caméra)
  const camZ = Math.max(W, H) * 1.6;  // distance caméra (plus loin = moins de distorsion de perspective)
  const scale = camZ / (camZ + z2);
  return {
    x: W/2 + x3 * scale,
    y: H/2 + y3 * scale,
    depth: scale,      // 1.0 = centre, < 1 = derrière, > 1 = devant
    z: z2
  };
}

function _spawnBrainParticle(fromNode, toX, toY, color, speed, isReverse) {
  _brainParticles.push({
    x: fromNode.x, y: fromNode.y,
    tx: toX, ty: toY,
    sx: fromNode.x, sy: fromNode.y,
    t: 0, speed: speed || 0.025,
    color: color,
    size: 1.5 + Math.random() * 1.5,
    life: 1.0,
    reverse: isReverse
  });
}

function drawBrainNetwork() {
  if(!_brainNodes) _brainNodes = initBrainNodes();
  if(!_brainNodes) return;

  const { canvas, ctx, nodes, W, H } = _brainNodes;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  _brainPhase += 0.012;
  _brainLearnPulse += 0.04;
  _brainScanLine = (_brainScanLine + 1.2) % (H + 80);

  const now = performance.now();
  
  // Grille hex arrière-plan
  ctx.strokeStyle = 'rgba(56,212,245,0.018)';  // v7.12 refinement : hex plus discret
  ctx.lineWidth = 0.4;
  const hexSize = 24;
  for (let row = 0; row * hexSize * 0.87 < H + hexSize; row++) {
    for (let col = 0; col * hexSize * 1.5 < W + hexSize; col++) {
      const cx = col * hexSize * 1.5 + (row % 2 ? hexSize * 0.75 : 0);
      const cy = row * hexSize * 0.87;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const x = cx + Math.cos(a) * hexSize * 0.5;
        const y = cy + Math.sin(a) * hexSize * 0.5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  
  // v7.12 · TRACÉ ∞ GUIDE (cohérent avec pivot 3D)
  const breathFactor = 1 + Math.sin(_brainLearnPulse * 0.3) * 0.03;
  const safeDim = Math.min(W, H);
  const lemAmpX = safeDim * 0.42 * breathFactor;
  const lemAmpY = safeDim * 0.24 * breathFactor;
  ctx.strokeStyle = 'rgba(167,139,250,0.12)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  const lemSteps = 90;
  for (let i = 0; i <= lemSteps; i++) {
    const t = (i / lemSteps) * Math.PI * 2;
    const pt = _lemniscatePoint(t, lemAmpX, lemAmpY);
    // Projection 3D
    const p = _project3D(pt.x, pt.y, 0, W, H);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  
  // Pointillés énergétiques (aussi en 3D)
  ctx.strokeStyle = 'rgba(167,139,250,0.25)';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 8]);
  ctx.lineDashOffset = -_brainPhase * 40;
  ctx.beginPath();
  for (let i = 0; i <= lemSteps; i++) {
    const t = (i / lemSteps) * Math.PI * 2;
    const pt = _lemniscatePoint(t, lemAmpX, lemAmpY);
    const p = _project3D(pt.x, pt.y, 0, W, H);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  // v7.12 · TRACES FANTÔMES : dessine 3-4 ∞ très estompés aux rotations précédentes
  // Donne un effet de mouvement subtil, comme une photo longue exposition
  if (_brainPrevRot.length > 1) {
    const savedRot = { rotX: _brain3D.rotX, rotY: _brain3D.rotY, rotZ: _brain3D.rotZ };
    _brainPrevRot.forEach((prev, idx) => {
      if (idx === _brainPrevRot.length - 1) return;  // skip latest (c'est le courant)
      const ghostAlpha = 0.035 * (idx + 1) / _brainPrevRot.length;  // plus récent = plus opaque
      // Applique temporairement la rotation fantôme
      _brain3D.rotX = prev.rotX;
      _brain3D.rotY = prev.rotY;
      _brain3D.rotZ = prev.rotZ;
      ctx.strokeStyle = 'rgba(167,139,250,' + ghostAlpha + ')';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (let i = 0; i <= lemSteps; i++) {
        const t = (i / lemSteps) * Math.PI * 2;
        const pt = _lemniscatePoint(t, lemAmpX, lemAmpY);
        const p = _project3D(pt.x, pt.y, 0, W, H);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
    // Restaure la rotation courante
    _brain3D.rotX = savedRot.rotX;
    _brain3D.rotY = savedRot.rotY;
    _brain3D.rotZ = savedRot.rotZ;
  }

  // Ligne de scan
  const scanY = _brainScanLine;
  const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
  scanGrad.addColorStop(0, 'rgba(56,212,245,0)');
  scanGrad.addColorStop(0.5, 'rgba(56,212,245,0.065)');  // v7.12 refinement : scan plus doux
  scanGrad.addColorStop(1, 'rgba(56,212,245,0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 40, W, 80);
  ctx.strokeStyle = 'rgba(56,212,245,0.35)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(W, scanY);
  ctx.stroke();

  // Flux matrix
  if (Math.random() < 0.05 && _brainDataStreams.length < 3) {  // v7.12 refinement : matrix plus rare
    _brainDataStreams.push({
      x: Math.random() * W,
      y: -10,
      speed: 0.8 + Math.random() * 1.2
    });
  }
  _brainDataStreams = _brainDataStreams.filter(s => {
    s.y += s.speed;
    if (s.y > H + 20) return false;
    ctx.fillStyle = 'rgba(0,232,122,' + (0.15 * (1 - s.y/H)) + ')';
    ctx.font = '9px monospace';
    for (let i = 0; i < 8; i++) {
      const ch = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
      ctx.fillText(ch, s.x, s.y - i * 10);
    }
    return true;
  });

  // v7.12 · Disposition dynamique en ∞ : les agents circulent sur la courbe
  // _brainPhase fait avancer la position collective
  // v7.12 · PIVOT 3D · rotation continue du ∞ sur lui-même
  _brain3D.rotX += _brain3D.speedX;
  _brain3D.rotY += _brain3D.speedY;
  _brain3D.rotZ += _brain3D.speedZ;
  
  // v7.12 · TRACE FANTÔME : snapshot périodique des rotations pour dessin ultérieur
  if (nodes.length > 0 && (_brainParticles.length % 15 === 0 || _brainPrevRot.length === 0)) {
    _brainPrevRot.push({ rotX: _brain3D.rotX, rotY: _brain3D.rotY, rotZ: _brain3D.rotZ });
    if (_brainPrevRot.length > 4) _brainPrevRot.shift();  // garde 4 derniers
  }
  
  nodes.forEach(n => {
    n.tParam += n.speed;
    // Position 3D sur la lemniscate (z = 0 pour que ce soit planaire)
    const pt = _lemniscatePoint(n.tParam, n.rOrbit, n.rOrbitY);
    const wobble = Math.sin(_brainPhase + n.phase) * 2;
    // Coordonnées 3D locales de l'agent (z légèrement varié pour profondeur)
    const x3d = pt.x + Math.cos(n.phase * 2) * wobble;
    const y3d = pt.y + Math.sin(n.phase * 2) * wobble;
    const z3d = 0;  // plan ∞ à z=0
    // Projection 3D → 2D
    const proj = _project3D(x3d, y3d, z3d, W, H);
    n.x = proj.x;
    n.y = proj.y;
    n.depth = proj.depth;  // stocké pour z-ordering + scaling
    n.z3d = proj.z;
  });
  
  // v7.12 · Z-ordering : trier les nœuds pour dessiner les plus éloignés d'abord
  nodes.sort((a, b) => (b.z3d || 0) - (a.z3d || 0));

  const avgScore = nodes.reduce((s,n) => s + (n.a.score||0)*(n.a.fitness||1), 0)
                 / Math.max(.001, nodes.reduce((s,n) => s + (n.a.fitness||1), 0));
  const consColor = avgScore > 0.1 ? 'rgba(0,232,122,.9)'
                  : avgScore < -0.1 ? 'rgba(255,61,107,.9)'
                  : 'rgba(167,139,250,.7)';
  const consColorHex = avgScore > 0.1 ? '0,232,122' : avgScore < -0.1 ? '255,61,107' : '167,139,250';

  if (now - _brainLastGlitch > 3500 + Math.random() * 1500) {
    _brainGlitchUntil = now + 120 + Math.random() * 80;
    _brainLastGlitch = now;
  }
  const inGlitch = now < _brainGlitchUntil;

  // Mesh inter-agents
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const ni = nodes[i], nj = nodes[j];
      const aligned = (ni.a.score || 0) * (nj.a.score || 0) > 0.01;
      if (aligned && Math.random() < 0.25) {
        const pulseOpacity = 0.08 + Math.abs(Math.sin(_brainPhase * 1.5 + i + j)) * 0.08;
        ctx.strokeStyle = 'rgba(' + consColorHex + ',' + pulseOpacity + ')';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(ni.x, ni.y);
        ctx.lineTo(nj.x, nj.y);
        ctx.stroke();
      }
    }
  }

  // Lasers agents → centre
  nodes.forEach(n => {
    const sc = n.a.score || 0;
    const absSc = Math.min(1, Math.abs(sc));
    const col = sc > 0.05 ? '0,232,122' : sc < -0.05 ? '255,61,107' : '167,139,250';
    const pulse = 0.4 + Math.abs(Math.sin(_brainPhase * 2 + n.phase)) * 0.5;
    
    const grad = ctx.createLinearGradient(n.x, n.y, W/2, H/2);
    grad.addColorStop(0, 'rgba(' + col + ',' + (absSc * pulse * 0.25) + ')');
    grad.addColorStop(0.4, 'rgba(' + col + ',' + (absSc * pulse * 0.55) + ')');
    grad.addColorStop(1, 'rgba(' + col + ',' + (absSc * pulse * 0.85) + ')');
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(.5, absSc * 2.8);
    ctx.beginPath();
    ctx.moveTo(n.x, n.y);
    ctx.lineTo(W/2, H/2);
    ctx.stroke();
    
    if (absSc > 0.3) {
      ctx.strokeStyle = 'rgba(' + col + ',' + (absSc * 0.6) + ')';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(W/2, H/2);
      ctx.stroke();
    }
  });

  // Particules
  if (now - _brainLastSpawn > 80) {
    const activeNodes = nodes.filter(n => Math.abs(n.a.score || 0) > 0.06);
    if (activeNodes.length > 0) {
      const count = 1 + (Math.random() < 0.3 ? 1 : 0);
      for (let k = 0; k < count; k++) {
        const picked = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        const sc = picked.a.score || 0;
        const col = sc > 0 ? '0,232,122' : '255,61,107';
        if (Math.random() < 0.65) {
          _spawnBrainParticle(picked, W/2, H/2, col, 0.03 + Math.abs(sc) * 0.03, false);
        } else {
          _spawnBrainParticle({x: W/2, y: H/2}, picked.x, picked.y, '167,139,250', 0.025, true);
        }
      }
    }
    _brainLastSpawn = now;
  }

  _brainParticles = _brainParticles.filter(p => {
    p.t += p.speed;
    if (p.t >= 1) return false;
    const ease = p.t * p.t * (3 - 2 * p.t);
    p.x = p.sx + (p.tx - p.sx) * ease;
    p.y = p.sy + (p.ty - p.sy) * ease;
    const alpha = p.t < 0.15 ? p.t * 6.7 : p.t > 0.85 ? (1 - p.t) * 6.7 : 1;
    
    const haloGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    haloGrad.addColorStop(0, 'rgba(' + p.color + ',' + (alpha * 0.6) + ')');
    haloGrad.addColorStop(1, 'rgba(' + p.color + ',0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(' + p.color + ',' + (alpha * 0.95) + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.7) + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(' + p.color + ',' + (alpha * 0.4) + ')';
    ctx.lineWidth = p.size * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const backT = Math.max(0, p.t - 0.12);
    const backEase = backT * backT * (3 - 2 * backT);
    const bx = p.sx + (p.tx - p.sx) * backEase;
    const by = p.sy + (p.ty - p.sy) * backEase;
    ctx.moveTo(bx, by);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    
    return true;
  });

  // v7.12 · HALO CENTRAL DE SAGESSE COLLECTIVE (maintenant avgScore est défini)
  const convincedCount = nodes.filter(n => Math.abs(n.a.score || 0) > 0.2).length;
  const collectiveStrength = Math.min(1, convincedCount / 8);
  _brainWisdom += (collectiveStrength - _brainWisdom) * 0.04;
  if (_brainWisdom > 0.1) {
    const wisdomR = 35 + _brainWisdom * 40;
    const wisdomGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, wisdomR);
    wisdomGrad.addColorStop(0, 'rgba(' + consColorHex + ',' + (_brainWisdom * 0.14) + ')');
    wisdomGrad.addColorStop(0.5, 'rgba(' + consColorHex + ',' + (_brainWisdom * 0.06) + ')');
    wisdomGrad.addColorStop(1, 'rgba(' + consColorHex + ',0)');
    ctx.fillStyle = wisdomGrad;
    ctx.beginPath();
    ctx.arc(W/2, H/2, wisdomR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Centre AI Core
  const thinkPulse = 1 + Math.sin(_brainLearnPulse * 0.7) * 0.15;
  const haloR = (12 + Math.abs(avgScore) * 14) * thinkPulse;
  const haloGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, haloR + 18);
  haloGrad.addColorStop(0, consColor);
  haloGrad.addColorStop(0.3, 'rgba(' + consColorHex + ',0.30)');
  haloGrad.addColorStop(0.7, 'rgba(' + consColorHex + ',0.08)');
  haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(W/2, H/2, haloR + 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(' + consColorHex + ',0.45)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset = -_brainPhase * 35;
  ctx.beginPath();
  ctx.arc(W/2, H/2, 16 + Math.sin(_brainLearnPulse) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.strokeStyle = 'rgba(' + consColorHex + ',0.25)';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 8]);
  ctx.lineDashOffset = _brainPhase * 25;
  ctx.beginPath();
  ctx.arc(W/2, H/2, 22 + Math.sin(_brainLearnPulse * 0.8) * 2, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.strokeStyle = 'rgba(167,139,250,0.20)';
  ctx.lineWidth = 0.6;
  ctx.setLineDash([1, 4]);
  ctx.lineDashOffset = -_brainPhase * 45;
  ctx.beginPath();
  ctx.arc(W/2, H/2, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  // Crosshair
  ctx.strokeStyle = 'rgba(' + consColorHex + ',0.35)';
  ctx.lineWidth = 0.5;
  const crossR = 9;
  ctx.beginPath();
  ctx.moveTo(W/2 - crossR, H/2); ctx.lineTo(W/2 - 4, H/2);
  ctx.moveTo(W/2 + 4, H/2); ctx.lineTo(W/2 + crossR, H/2);
  ctx.moveTo(W/2, H/2 - crossR); ctx.lineTo(W/2, H/2 - 4);
  ctx.moveTo(W/2, H/2 + 4); ctx.lineTo(W/2, H/2 + crossR);
  ctx.stroke();

  ctx.fillStyle = consColor;
  ctx.beginPath();
  ctx.arc(W/2, H/2, 4 + Math.sin(_brainLearnPulse * 2) * 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(W/2, H/2, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Agents hexagonaux
  nodes.forEach(n => {
    const sc = n.a.score || 0;
    const fit = n.a.fitness || 1;
    const absSc = Math.min(1, Math.abs(sc));
    // v7.12 · Taille selon fitness + conviction + PROFONDEUR 3D
    const baseSize = 3 + Math.min(5, fit / 250);
    const convBoost = absSc > 0.4 ? 2 : absSc > 0.2 ? 1 : 0;
    const depthFactor = n.depth || 1;  // 3D depth scaling
    const size = (baseSize + convBoost) * depthFactor;
    // Opacité adaptée à la profondeur (plus loin = plus transparent)
    const depthAlpha = 0.4 + depthFactor * 0.6;  // 0.4 (loin) à 1.0 (proche)
    const col = sc > 0.1 ? 'rgba(0,232,122,1)'
              : sc < -0.1 ? 'rgba(255,61,107,1)'
              : 'rgba(180,190,210,1)';
    const colHex = sc > 0.1 ? '0,232,122' : sc < -0.1 ? '255,61,107' : '180,190,210';
    
    let dx = 0, dy = 0;
    if (inGlitch && Math.random() < 0.3) {
      dx = (Math.random() - 0.5) * 4;
      dy = (Math.random() - 0.5) * 4;
    }
    const nx = n.x + dx, ny = n.y + dy;
    
    const glowPulse = Math.abs(Math.sin(_brainLearnPulse + n.phase));
    const glowR = size + 8 + glowPulse * (4 + absSc * 8);
    const glowGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, glowR);
    glowGrad.addColorStop(0, 'rgba(' + colHex + ',' + (0.35 + absSc * 0.45) + ')');
    glowGrad.addColorStop(0.5, 'rgba(' + colHex + ',' + (0.12 * absSc) + ')');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(nx, ny, glowR, 0, Math.PI * 2);
    ctx.fill();
    
    if (absSc > 0.2) {
      ctx.strokeStyle = 'rgba(' + colHex + ',' + (0.45 + glowPulse * 0.35) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(nx, ny, size + 3 + glowPulse * 2.5, 0, Math.PI * 2);
      ctx.stroke();
      
      if (absSc > 0.4) {
        ctx.strokeStyle = 'rgba(' + colHex + ',0.2)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 3]);
        ctx.lineDashOffset = -_brainPhase * 20;
        ctx.beginPath();
        ctx.arc(nx, ny, size + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
      }
    }
    
    // === ORBITE EN INFINI (∞) — Lemniscate de Bernoulli ===
    // Core : cercle plein coloré
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(nx, ny, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Bordure cœur (fine ligne blanche)
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 + absSc * 0.35) + ')';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    
    // === Tracé du chemin infini (∞) en fond ===
    // Formule lemniscate : x = a*cos(t) / (1+sin²(t)), y = a*sin(t)*cos(t) / (1+sin²(t))
    const infA = size + 4;  // demi-largeur de l'infini (adaptée à la nouvelle taille)
    // Chaque agent a son propre angle de rotation pour varier
    const infRot = n.phase * 0.3;  // orientation fixe par agent
    const cosR = Math.cos(infRot);
    const sinR = Math.sin(infRot);
    
    // Dessine le chemin infini (tracé complet subtil)
    ctx.strokeStyle = 'rgba(' + colHex + ',' + (0.35 + absSc * 0.3) + ')';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const denom = 1 + Math.sin(t) * Math.sin(t);
      const lx = (infA * Math.cos(t)) / denom;
      const ly = (infA * Math.sin(t) * Math.cos(t)) / denom;
      // Rotation selon infRot
      const rx = lx * cosR - ly * sinR;
      const ry = lx * sinR + ly * cosR;
      if (i === 0) ctx.moveTo(nx + rx, ny + ry);
      else ctx.lineTo(nx + rx, ny + ry);
    }
    ctx.stroke();
    
    // === Électron qui parcourt l'infini ===
    const infT = (_brainPhase * 1.3 + n.phase * 2) % (Math.PI * 2);
    const infDenom = 1 + Math.sin(infT) * Math.sin(infT);
    const ilx = (infA * Math.cos(infT)) / infDenom;
    const ily = (infA * Math.sin(infT) * Math.cos(infT)) / infDenom;
    const ex = nx + (ilx * cosR - ily * sinR);
    const ey = ny + (ilx * sinR + ily * cosR);
    
    // Halo autour de l'électron
    const eHalo = ctx.createRadialGradient(ex, ey, 0, ex, ey, 3.5);
    eHalo.addColorStop(0, 'rgba(' + colHex + ',0.8)');
    eHalo.addColorStop(1, 'rgba(' + colHex + ',0)');
    ctx.fillStyle = eHalo;
    ctx.beginPath();
    ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Traînée (3 points précédents sur la courbe)
    for (let tr = 1; tr <= 3; tr++) {
      const trT = (infT - tr * 0.08 + Math.PI * 2) % (Math.PI * 2);
      const trDenom = 1 + Math.sin(trT) * Math.sin(trT);
      const trLx = (infA * Math.cos(trT)) / trDenom;
      const trLy = (infA * Math.sin(trT) * Math.cos(trT)) / trDenom;
      const trX = nx + (trLx * cosR - trLy * sinR);
      const trY = ny + (trLx * sinR + trLy * cosR);
      ctx.fillStyle = 'rgba(' + colHex + ',' + (0.5 - tr * 0.15) + ')';
      ctx.beginPath();
      ctx.arc(trX, trY, 1.5 - tr * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Électron principal (point blanc brillant)
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.beginPath();
    ctx.arc(ex, ey, 1.4, 0, Math.PI * 2);
    ctx.fill();
    
    if(n.a.emoji) {
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.a.emoji, nx, ny);
    }
  });

  // Scan-lines CRT
  ctx.fillStyle = 'rgba(56,212,245,0.008)';  // v7.12 refinement : CRT plus subtle
  for (let y = 0; y < H; y += 4) {  // espacement plus grand
    ctx.fillRect(0, y, W, 1);
  }

  const consLbl = document.getElementById('brainConsVal');
  if(consLbl) {
    const pct = Math.round(avgScore * 100);
    const txt = pct > 0 ? '+' + pct + '%' : pct + '%';
    if(consLbl.textContent !== txt) consLbl.textContent = txt;
    consLbl.style.color = pct > 5 ? 'var(--up)' : pct < -5 ? 'var(--down)' : 'var(--t2)';
  }

  _brainRAF = requestAnimationFrame(drawBrainNetwork);
}

// v7.12 · PACK RÉSILIENCE · Brain animation OFF par défaut (économie CPU)
let _brainAnimDisabled = true;  // true = animation désactivée (rendu 1 fois statique)
let _brainStaticDrawn = false;

function startBrainAnim() {
  if(_brainRAF) return;
  _brainNodes = null; // force re-init on size change
  
  // v7.12 · Si animation OFF, dessiner 1 seule fois (statique) et ne pas loop
  if (_brainAnimDisabled) {
    if (!_brainStaticDrawn) {
      // Patch : on laisse drawBrainNetwork dessiner, mais on bloque le requestAnimationFrame
      const origRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = function() { return 0; };  // ne rien faire
      try {
        drawBrainNetwork();  // dessine une frame
      } catch(e) {}
      window.requestAnimationFrame = origRAF;  // restaure
      _brainStaticDrawn = true;
    }
    return;
  }
  
  drawBrainNetwork();
  // v5.1 · wire tap handler once
  setTimeout(initBrainInteraction, 150);
}

// Toggle pour réactiver si besoin (dev console)
window.toggleBrainAnim = function() {
  _brainAnimDisabled = !_brainAnimDisabled;
  _brainStaticDrawn = false;
  if (_brainRAF) { cancelAnimationFrame(_brainRAF); _brainRAF = null; }
  startBrainAnim();
  if (typeof showToast === 'function') {
    showToast('🧠 Brain animation ' + (_brainAnimDisabled ? 'OFF (statique)' : 'ON'), 2500, 'user');
  }
  return !_brainAnimDisabled;
};
function stopBrainAnim() {
  if(_brainRAF) { cancelAnimationFrame(_brainRAF); _brainRAF = null; }
}

// Restart brain when window resizes
window.addEventListener('resize', () => {
  if(S.currentPage === 0) {
    stopBrainAnim();
    setTimeout(startBrainAnim, 120);
  }
});

// ════════════════════════════════════════════════════════════
// v5.0 — MARKET MOOD BAR · Live consensus indicator
// ════════════════════════════════════════════════════════════
function updateMarketMood() {
  // Aggregate LMSR probabilities across pairs weighted by volume
  let totalProb = 0, totalWeight = 0;
  _livePairStates().forEach(ps => {   // [PAIRES VIVANTES · 10/10/2026] l'humeur du marché : sans la paire retirée (en AA ses 59 trades lui donnaient le plus gros poids)
    const p = lmsrP(ps);
    const w = (ps.totalTrades || 0) + 1;
    totalProb  += p * w;
    totalWeight += w;
  });
  const avgProb = totalWeight > 0 ? totalProb / totalWeight : 0.5;
  const pct = Math.round(avgProb * 100);

  const fill = document.getElementById('moodIndicatorFill');
  const lbl  = document.getElementById('moodLabel');
  const pctEl= document.getElementById('moodPct');

  if(fill) {
    fill.style.left = pct + '%';
    if(pct > 60) {
      fill.style.background = 'var(--up)';
      fill.style.boxShadow  = '0 0 14px var(--up)';
    } else if(pct < 40) {
      fill.style.background = 'var(--down)';
      fill.style.boxShadow  = '0 0 14px var(--down)';
    } else {
      fill.style.background = 'var(--gold)';
      fill.style.boxShadow  = '0 0 10px var(--gold)';
    }
  }
  if(lbl) {
    lbl.textContent = pct > 65 ? 'EUPHORIE'
                    : pct > 55 ? 'OPTIMISTE'
                    : pct > 45 ? 'NEUTRE'
                    : pct > 35 ? 'PRUDENT'
                    : 'PESSIMISTE';
  }
  if(pctEl) pctEl.textContent = pct + '%';
}

// ════════════════════════════════════════════════════════════
// v5.0 — BOT THOUGHTS TICKER · Live narration
// ════════════════════════════════════════════════════════════
function buildThoughtPhrase() {
  const agents = S.agents || [];
  if(!agents.length) return 'Initialisation...';
  const pairs = _livePairs();   // [PAIRES VIVANTES · 10/10/2026]
  if(!pairs.length) return 'Chargement des paires...';

  const parts = [];
  // Pick top agent by |score*fitness|
  const sorted = [...agents].sort((a,b) => Math.abs(b.score*b.fitness) - Math.abs(a.score*a.fitness));
  const top = sorted[0];
  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  const ps = S.pairStates[pair];

  const actionColor = top.score > 0.1 ? 'th-up' : top.score < -0.1 ? 'th-down' : '';
  const priceStr = ps && ps.price ? (ps.price < 10 ? ps.price.toFixed(4) : '$'+Math.floor(ps.price).toLocaleString()) : '—';

  // Templates (varied for richness)
  const templates = [
    `<span class="th-agent">${top.emoji||'•'} ${top.name}</span> <span class="th-sep">&middot;</span> score <span class="${actionColor}">${(top.score>=0?'+':'')}${top.score.toFixed(2)}</span> sur <span class="th-asset">${pair}</span> &agrave; ${priceStr}`,
    `<span class="th-asset">${pair}</span> &rarr; consensus agents <span class="${actionColor}">${top.score>0?'haussier':top.score<0?'baissier':'neutre'}</span> <span class="th-sep">&middot;</span> fitness <span class="th-agent">${(top.fitness||0).toFixed(0)} T$</span>`,
    `<span class="th-agent">${top.emoji||'•'} ${top.name}</span> d&eacute;tecte <span class="th-sep">&middot;</span> conv. ${Math.abs(top.score*100).toFixed(0)}% <span class="th-sep">&middot;</span> <span class="th-asset">${pair}</span>`,
    `Analyse r&eacute;gime <span class="th-asset">${pair}</span> <span class="th-sep">&middot;</span> volatilit&eacute; ${(function(){ try { const t = typeof getTechSignals==='function' ? getTechSignals(pair) : null; const cv = t?.raw?.stddev?.cv; return (typeof cv==='number') ? (cv*100).toFixed(2)+'%' : '\u2014'; } catch(e){ return '\u2014'; } })()} <span class="th-sep">&middot;</span> ${S.openPositions.length} position${S.openPositions.length>1?'s':''} ouverte${S.openPositions.length>1?'s':''}`,
  ];
  return templates[Math.floor(Math.random()*templates.length)];
}

function updateBotThoughts() {
  const el = document.getElementById('thoughtsText');
  if(!el) return;
  // Only update when ~end of marquee cycle
  const now = Date.now();
  if(window._lastThoughtTs && (now - window._lastThoughtTs) < 11000) return;
  window._lastThoughtTs = now;
  el.innerHTML = buildThoughtPhrase() + '&nbsp;&nbsp;&nbsp;';
}

// ════════════════════════════════════════════════════════════
// v5.2 — FISCAL MINI · live tax projection on home
// ════════════════════════════════════════════════════════════
function updateFiscalMini() {
  const wrap = document.getElementById('fiscalMini');
  if(!wrap) return;

  // Only show if some activity has happened
  if(!S.fees || !S.fees.totalPnlGross) {
    wrap.style.display = 'none';
    return;
  }

  const tc = S.taxConfig;
  const region = tc.region || 'LU';
  const reg = tc.regions && tc.regions[region];
  if(!reg) { wrap.style.display = 'none'; return; }

  const gross = S.fees.totalPnlGross || 0;
  const taxableBase = gross * (reg.inclusion || 1);
  const estTax = Math.max(0, taxableBase * (reg.rate || 0));
  const netAfter = gross - estTax;

  // Hide if no real signal to show
  if(Math.abs(gross) < 0.5) { wrap.style.display = 'none'; return; }

  wrap.style.display = '';
  const detailEl = document.getElementById('fiscalMiniDetail');
  const valEl    = document.getElementById('fiscalMiniVal');
  if(detailEl) {
    const ratePct = Math.round((reg.rate || 0) * 100);
    detailEl.innerHTML = 'P&amp;L brut: <strong style="color:var(--t1);">' + (gross>=0?'+':'') + '$'+gross.toFixed(1) +
      '</strong> &middot; ' + region + ' ' + ratePct + '% &middot; net ~$' + netAfter.toFixed(0);
  }
  if(valEl) {
    valEl.textContent = '−$' + estTax.toFixed(1);
    valEl.className = 'fiscal-mini-val' + (estTax > 0 ? ' loss' : '');
  }
}

// ════════════════════════════════════════════════════════════
// v5.3 — INTELLIGENCE ANALYTICS (5 features)
// ════════════════════════════════════════════════════════════

// ── Global analytics state ──
let _analyticsTab = 'perf';

// ── Utility: Pearson correlation ──

// ════════════════════════════════════════════════════════════
// 1. ADVANCED PERFORMANCE METRICS (Sharpe, Sortino, Calmar, etc)
// ════════════════════════════════════════════════════════════
function computeAdvancedMetrics() {
  const allTrades = Object.values(S.pairStates).flatMap(ps => 
    (ps.trades||[]).filter(t => t.type === 'position' && t.pnlUsdt != null)
  );
  if(allTrades.length < 2) return null;

  const returnsUsd = allTrades.map(t => t.pnlUsdt || 0);
  const returnsPct = allTrades.map(t => t.pnl || 0);

  const avgUsd   = returnsUsd.reduce((a,b)=>a+b,0) / returnsUsd.length;
  const avgPct   = returnsPct.reduce((a,b)=>a+b,0) / returnsPct.length;
  const stdPct   = Math.sqrt(returnsPct.reduce((s,v)=>s+(v-avgPct)**2,0) / returnsPct.length) || 0.01;

  // Sharpe (annualized assuming 1 trade ~ 1 unit time)
  const sharpe = avgPct / stdPct * Math.sqrt(252);

  // Sortino (downside deviation only)
  const downside = returnsPct.filter(r => r < avgPct);
  const downStd  = downside.length > 0
    ? Math.sqrt(downside.reduce((s,v)=>s+(v-avgPct)**2,0) / downside.length) || 0.01
    : 0.01;
  const sortino = avgPct / downStd * Math.sqrt(252);

  // Max Drawdown — cumulative equity curve
  let peakUsd = 0, curUsd = 0, maxDDUsd = 0, maxDDPct = 0;
  returnsUsd.forEach(r => {
    curUsd += r;
    if(curUsd > peakUsd) peakUsd = curUsd;
    const ddUsd = curUsd - peakUsd;
    if(ddUsd < maxDDUsd) {
      maxDDUsd = ddUsd;
      maxDDPct = peakUsd > 0 ? Math.max(-100, (ddUsd / peakUsd * 100)) : 0;
    }
  });

  // Calmar = annual return / |maxDD|
  const totalPnl    = returnsUsd.reduce((a,b)=>a+b,0);
  const annualRet   = avgPct * 252;
  const calmar      = Math.abs(maxDDPct) > 0.1 ? annualRet / Math.abs(maxDDPct) : 0;

  // Profit Factor
  const wins       = returnsPct.filter(r => r > 0);
  const losses     = returnsPct.filter(r => r < 0);
  const grossWin   = wins.reduce((a,b)=>a+b,0);
  const grossLoss  = Math.abs(losses.reduce((a,b)=>a+b,0));
  const profitFactor = grossLoss > 0.001 ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0);

  // Expectancy
  const winRate    = wins.length / returnsPct.length;
  const avgWin     = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLossAbs = losses.length > 0 ? grossLoss / losses.length : 0;
  const expectancy = (winRate * avgWin) - ((1-winRate) * avgLossAbs);

  // Max consecutive losses
  let maxConsecLoss = 0, curConsec = 0;
  returnsPct.forEach(r => {
    if(r < 0) { curConsec++; maxConsecLoss = Math.max(maxConsecLoss, curConsec); }
    else curConsec = 0;
  });

  return {
    sharpe, sortino, calmar, maxDDPct, maxDDUsd,
    profitFactor, expectancy, winRate: winRate*100,
    avgWin, avgLoss: avgLossAbs, maxConsecLoss,
    tradesCount: returnsPct.length, totalPnl
  };
}

function renderPerfMetricsPanel() {
  const el = document.getElementById('apanel-perf');
  if(!el) return;
  const m = computeAdvancedMetrics();
  if(!m) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">En attente des premiers trades…</div>';
    return;
  }
  const fmtN  = (v, d=2) => isFinite(v) ? v.toFixed(d) : '—';
  const col   = v => v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--gold)';
  const rate  = (v, g, ok) => v >= g ? 'var(--up)' : v >= ok ? 'var(--gold)' : 'var(--down)';

  el.innerHTML = `
    <div class="perf-metrics-grid">
      <div class="perf-metric hl">
        <div class="perf-metric-name">SHARPE</div>
        <div class="perf-metric-val" style="color:${rate(m.sharpe, 1.5, 0.5)};">${fmtN(m.sharpe, 2)}</div>
        <div class="perf-metric-sub">${m.sharpe >= 2 ? 'Excellent' : m.sharpe >= 1 ? 'Bon' : m.sharpe >= 0 ? 'Modeste' : 'Faible'}</div>
      </div>
      <div class="perf-metric hl">
        <div class="perf-metric-name">SORTINO</div>
        <div class="perf-metric-val" style="color:${rate(m.sortino, 2, 1)};">${fmtN(m.sortino, 2)}</div>
        <div class="perf-metric-sub">Downside only</div>
      </div>
      <div class="perf-metric">
        <div class="perf-metric-name">CALMAR</div>
        <div class="perf-metric-val" style="color:${rate(m.calmar, 3, 1)};">${fmtN(m.calmar, 2)}</div>
        <div class="perf-metric-sub">Ret/DD</div>
      </div>
      <div class="perf-metric">
        <div class="perf-metric-name">PROFIT FACT.</div>
        <div class="perf-metric-val" style="color:${rate(m.profitFactor, 2, 1.2)};">${fmtN(m.profitFactor, 2)}</div>
        <div class="perf-metric-sub">Win/Loss</div>
      </div>
      <div class="perf-metric">
        <div class="perf-metric-name">EXPECTANCY</div>
        <div class="perf-metric-val" style="color:${col(m.expectancy)};">${m.expectancy >= 0 ? '+' : ''}${fmtN(m.expectancy, 2)}%</div>
        <div class="perf-metric-sub">par trade</div>
      </div>
      <div class="perf-metric">
        <div class="perf-metric-name">MAX DD</div>
        <div class="perf-metric-val" style="color:var(--down);">${fmtN(m.maxDDPct, 1)}%</div>
        <div class="perf-metric-sub">$${fmtN(m.maxDDUsd, 0)}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;padding:6px 10px;background:var(--s2);border-radius:8px;font-size:9px;">
      <span style="color:var(--t3);">Trades: <strong style="color:var(--t1);">${m.tradesCount}</strong></span>
      <span style="color:var(--t3);">WR: <strong style="color:${m.winRate>=50?'var(--up)':'var(--down)'};">${fmtN(m.winRate, 0)}%</strong></span>
      <span style="color:var(--t3);">Avg W: <strong style="color:var(--up);">+${fmtN(m.avgWin, 2)}%</strong></span>
      <span style="color:var(--t3);">Avg L: <strong style="color:var(--down);">-${fmtN(m.avgLoss, 2)}%</strong></span>
      <span style="color:var(--t3);">Streak L: <strong style="color:var(--gold);">${m.maxConsecLoss}</strong></span>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// 2. MULTI-HORIZON FORECAST (5m / 1h / 4h / 1d)
// ════════════════════════════════════════════════════════════
function getMultiHorizonForecast(pair) {
  const ps   = S.pairStates[pair];
  const tech = getTechSignals(pair);
  const fund = getFundamentalSignals(pair);
  if(!ps || !tech || !fund) return null;

  const composite = tech.atScore * 0.6 + fund.fundScore * 0.4;
  const lmsrProb  = lmsrP(ps);
  const atr       = tech.raw?.stddev?.atr || ps.price * 0.015;
  const trend     = tech.raw?.adx?.trend || 'ranging';
  const trendBoost= trend === 'ranging' ? 0.5 : 1.2;

  const mkHorizon = (score, magMult, confMult, priceMove) => {
    const direction = score > 0.15 ? 'up' : score < -0.15 ? 'down' : 'flat';
    return {
      direction,
      magnitude:   Math.min(1, Math.abs(score) * magMult),
      confidence:  Math.min(1, Math.abs(score) * confMult),
      priceTarget: ps.price + priceMove * Math.sign(score)
    };
  };

  return {
    h5m: mkHorizon(lmsrProb * 2 - 1, 0.5, 1.0,  ps.price * 0.003),   // mostly LMSR
    h1h: mkHorizon(composite,         1.5, 0.8, atr * 2),            // composite
    h4h: mkHorizon(composite,         3.0 * trendBoost, trend==='ranging'?0.5:1, atr * 6 * trendBoost),
    h1d: mkHorizon(fund.fundScore,    6.0, 0.7, ps.price * fund.fundScore * 0.05 || ps.price * 0.015)
  };
}

function renderHorizonPanel() {
  const el = document.getElementById('apanel-horizon');
  if(!el) return;

  const pairs = Object.keys(PAIRS);
  const rows = pairs.map(pair => {
    const cfg = PAIRS[pair];
    const ps  = S.pairStates[pair];
    const f   = getMultiHorizonForecast(pair);
    if(!f) return '';

    const horizons = [
      { k:'h5m', lbl:'5m' },
      { k:'h1h', lbl:'1h' },
      { k:'h4h', lbl:'4h' },
      { k:'h1d', lbl:'1j' }
    ];

    return `
    <div class="horizon-card">
      <div class="horizon-card-head">
        <span style="color:${cfg.color};font-weight:700;font-size:11px;">${pair}</span>
        <span style="font-size:8px;color:var(--t3);font-family:var(--font-mono);">${cfg.dec>=4?ps.price.toFixed(cfg.dec):'$'+Math.floor(ps.price).toLocaleString()}</span>
      </div>
      <div class="horizon-grid">
        ${horizons.map(h => {
          const d = f[h.k];
          const arrow = d.direction==='up'?'↑':d.direction==='down'?'↓':'→';
          const col   = d.direction==='up'?'var(--up)':d.direction==='down'?'var(--down)':'var(--gold)';
          return `<div class="horizon-cell ${d.direction}">
            <div class="horizon-label">${h.lbl}</div>
            <div class="horizon-dir" style="color:${col};">${arrow}</div>
            <div class="horizon-conf-bar"><div class="horizon-conf-fill" style="width:${(d.confidence*100).toFixed(0)}%;background:${col};"></div></div>
            <div style="font-size:7px;color:var(--t3);margin-top:2px;">${(d.confidence*100).toFixed(0)}%</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = rows || '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">Données en cours…</div>';
}

// ════════════════════════════════════════════════════════════
// 3. TEMPORAL HEATMAP (hour-of-day performance)
// ════════════════════════════════════════════════════════════
function recordTradeForHeatmap(pnlUsd, pair) {
  // [1b-b · 15/09/2026] HEATMAP = VRAIS TRADES SEULEMENT. Elle comptait toutes les clôtures, tous modes : ~2 000
  // trades de marche aléatoire (AA) pour 47 trades EV → la porte P3 (10e3) lisait du bruit. Désormais seules les
  // clôtures EV et RE s'écrivent, et le compteur repart de zéro une fois (le mélange n'est pas séparable).
  if (S.tradingMode === 'sim') return;
  if(!S.heatmap) S.heatmap = { byHour:{}, byWeekday:{} };
  if (!S.heatmap._realOnlySince) { S.heatmap.byHour = {}; S.heatmap.byWeekday = {}; S.heatmap.byDayHour = {}; S.heatmap._realOnlySince = Date.now(); }
  const d = new Date();
  const h  = d.getHours();
  const wd = d.getDay();
  if(!S.heatmap.byHour[h])     S.heatmap.byHour[h]     = {count:0,pnl:0,wins:0};
  if(!S.heatmap.byWeekday[wd]) S.heatmap.byWeekday[wd] = {count:0,pnl:0,wins:0};
  S.heatmap.byHour[h].count++;    S.heatmap.byHour[h].pnl += pnlUsd;
  if(pnlUsd>0) S.heatmap.byHour[h].wins++;
  S.heatmap.byWeekday[wd].count++; S.heatmap.byWeekday[wd].pnl += pnlUsd;
  if(pnlUsd>0) S.heatmap.byWeekday[wd].wins++;
  // v24 : matrice 7x24
  if(!S.heatmap.byDayHour) S.heatmap.byDayHour = {};
  const dk = wd+'_'+h;
  if(!S.heatmap.byDayHour[dk]) S.heatmap.byDayHour[dk]={count:0,pnl:0,wins:0};
  S.heatmap.byDayHour[dk].count++; S.heatmap.byDayHour[dk].pnl+=pnlUsd;
  if(pnlUsd>0) S.heatmap.byDayHour[dk].wins++;
  // v24 : par paire
  if(pair){
    if(!S.heatmap.byPair) S.heatmap.byPair={};
    if(!S.heatmap.byPair[pair]) S.heatmap.byPair[pair]={byHour:{},total:{count:0,pnl:0,wins:0}};
    if(!S.heatmap.byPair[pair].byHour[h]) S.heatmap.byPair[pair].byHour[h]={count:0,pnl:0,wins:0};
    S.heatmap.byPair[pair].byHour[h].count++; S.heatmap.byPair[pair].byHour[h].pnl+=pnlUsd;
    if(pnlUsd>0) S.heatmap.byPair[pair].byHour[h].wins++;
    S.heatmap.byPair[pair].total.count++; S.heatmap.byPair[pair].total.pnl+=pnlUsd;
    if(pnlUsd>0) S.heatmap.byPair[pair].total.wins++;
  }
}

function renderHeatmapPanel() {
  const el = document.getElementById('apanel-heatmap');
  if(!el) return;

  const hm = S.heatmap || { byHour: {}, byWeekday: {} };
  const hours = Array.from({length:24}, (_, i) => hm.byHour[i] || { count:0, pnl:0, wins:0 });
  const weekdayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

  // Find max abs PnL for color scaling
  const maxAbs = Math.max(1, ...hours.map(h => Math.abs(h.pnl)));

  const hourCells = hours.map((h, i) => {
    let bg = 'rgba(255,255,255,.02)';
    if(h.count > 0) {
      const intensity = Math.min(1, Math.abs(h.pnl) / maxAbs);
      const c = h.pnl > 0 ? `0,232,122` : h.pnl < 0 ? `255,61,107` : `245,200,66`;
      bg = `rgba(${c},${(intensity*0.7+0.15).toFixed(2)})`;
    }
    const wr = h.count > 0 ? Math.round(h.wins/h.count*100) : 0;
    const tip = h.count > 0 
      ? `${i}h · ${h.count} tr · $${h.pnl.toFixed(0)} · ${wr}%WR`
      : `${i}h`;
    return `<div class="heat-cell" style="background:${bg};" title="${tip}" onclick="showToast('${tip}')"></div>`;
  }).join('');

  const hourLabels = Array.from({length:24}, (_, i) => 
    `<div>${i%3===0?i+'h':''}</div>`
  ).join('');

  // Best/worst hour
  const ranked = hours.map((h,i)=>({...h, hour:i}))
                      .filter(h=>h.count>0)
                      .sort((a,b)=>b.pnl-a.pnl);
  const bestH  = ranked[0];
  const worstH = ranked[ranked.length-1];

  // Weekday row
  const weekdayCells = [0,1,2,3,4,5,6].map(wd => {
    const d = hm.byWeekday[wd] || { count:0, pnl:0 };
    let bg = 'rgba(255,255,255,.02)';
    const maxWd = Math.max(1, ...Object.values(hm.byWeekday).map(x=>Math.abs(x.pnl)));
    if(d.count > 0) {
      const intensity = Math.min(1, Math.abs(d.pnl)/maxWd);
      const c = d.pnl > 0 ? `0,232,122` : `255,61,107`;
      bg = `rgba(${c},${(intensity*0.7+0.15).toFixed(2)})`;
    }
    return `<div style="background:${bg};border-radius:4px;padding:4px 2px;text-align:center;font-size:8px;">
      <div style="color:var(--t3);">${weekdayNames[wd]}</div>
      <div style="color:${d.pnl>=0?'var(--up)':'var(--down)'};font-weight:700;">${d.count>0?(d.pnl>=0?'+':'')+d.pnl.toFixed(0)+'$':'—'}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="heatmap-wrap">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:9px;color:var(--t2);font-weight:600;">P&L par heure (UTC local)</span>
        <span style="font-size:8px;color:var(--t3);">${ranked.length} heures actives</span>
      </div>
      <div class="heatmap-hours-grid">${hourCells}</div>
      <div class="heatmap-hours-labels">${hourLabels}</div>
      ${bestH || worstH ? `
      <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:5px;">
        ${bestH ? `<div style="background:rgba(0,232,122,.08);border:1px solid rgba(0,232,122,.2);border-radius:6px;padding:6px;">
          <div style="font-size:7px;color:var(--t3);">🏆 MEILLEURE HEURE</div>
          <div style="font-size:12px;font-weight:700;color:var(--up);">${bestH.hour}h · +$${bestH.pnl.toFixed(0)}</div>
        </div>` : ''}
        ${worstH && worstH.pnl < 0 ? `<div style="background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);border-radius:6px;padding:6px;">
          <div style="font-size:7px;color:var(--t3);">⚠ PIRE HEURE</div>
          <div style="font-size:12px;font-weight:700;color:var(--down);">${worstH.hour}h · $${worstH.pnl.toFixed(0)}</div>
        </div>` : ''}
      </div>` : ''}
      <div style="margin-top:8px;font-size:9px;color:var(--t2);margin-bottom:4px;">Par jour de la semaine</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${weekdayCells}</div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// 4. WHAT-IF SCENARIOS
// ════════════════════════════════════════════════════════════
function computeWhatIfScenarios() {
  const out = { positions: [], session: {} };

  // Per-open-position: what if closed X candles ago?
  S.openPositions.forEach(pos => {
    const ps = S.pairStates[pos.pair];
    if(!ps || !ps.candles || ps.candles.length < 3) return;
    const candles = ps.candles;
    const getPnlAt = offset => {
      const idx = candles.length - 1 - offset;
      if(idx < 0) return null;
      const priceAt = candles[idx].c;
      const pct = pos.side === 'long'
        ? ((priceAt - pos.entryPrice) / pos.entryPrice * 100)
        : ((pos.entryPrice - priceAt) / pos.entryPrice * 100);
      return { pnlPct: pct, pnlUsd: pos.stakeUsdt * pct/100 };
    };
    out.positions.push({
      id: pos.id, pair: pos.pair, side: pos.side,
      now:     { pnlPct: pos.pnl || 0, pnlUsd: pos.pnlUsdt || 0 },
      ago5:    getPnlAt(5),
      ago15:   getPnlAt(15),
      ago30:   getPnlAt(30)
    });
  });

  // Session summary
  const sessionGain = (S._startPortfolio && S.portfolio) ? (S.portfolio - S._startPortfolio) : 0;
  const botTrades = Object.values(S.pairStates)
    .flatMap(ps => (ps.trades||[]).filter(t => t.type === 'position'))
    .length;
  out.session = {
    actualGain:  sessionGain,
    botTrades,
    compounded:  S._totalCompounded || 0,
    // Hypothetical: if never traded (cash baseline)
    noTradingGain: 0
  };
  return out;
}

function renderWhatIfPanel() {
  const el = document.getElementById('apanel-whatif');
  if(!el) return;

  const s = computeWhatIfScenarios();
  const posRows = s.positions.map(p => {
    const cfg = PAIRS[p.pair];
    const nowCol = p.now.pnlUsd >= 0 ? 'var(--up)' : 'var(--down)';
    const rows = [
      { lbl:'Maintenant',     d: p.now,   highlight:true },
      { lbl:'Il y a 5 cycles', d: p.ago5  },
      { lbl:'Il y a 15 cycles', d: p.ago15 },
      { lbl:'Il y a 30 cycles', d: p.ago30 }
    ].filter(r => r.d != null);
    return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:6px;">
      <div style="font-size:10px;font-weight:700;color:${cfg.color};margin-bottom:5px;">${p.pair} · ${p.side.toUpperCase()}</div>
      ${rows.map(r => {
        const c = r.d.pnlUsd >= 0 ? 'var(--up)' : 'var(--down)';
        return `<div style="display:flex;justify-content:space-between;padding:3px 0;${r.highlight?'border-bottom:1px dashed var(--border);margin-bottom:4px;':''}">
          <span style="font-size:9px;color:var(--t2);${r.highlight?'font-weight:700;':''}">${r.lbl}</span>
          <span style="font-size:11px;font-weight:700;color:${c};">${r.d.pnlUsd>=0?'+':''}$${r.d.pnlUsd.toFixed(2)}</span>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:9px;color:var(--t2);margin-bottom:8px;">
      Si vous aviez fermé aux moments passés :
    </div>
    ${posRows || '<div style="color:var(--t3);font-size:10px;text-align:center;padding:8px;">Aucune position ouverte</div>'}
    <div style="margin-top:10px;padding:8px 10px;background:rgba(167,139,250,.05);border:1px solid rgba(167,139,250,.2);border-radius:8px;">
      <div style="font-size:9px;color:var(--pur);font-weight:700;margin-bottom:4px;">📊 SESSION</div>
      <div class="whatif-row" style="background:transparent;border:none;margin-bottom:3px;">
        <span class="whatif-label">Gain réel session</span>
        <span class="whatif-val" style="color:${s.session.actualGain>=0?'var(--up)':'var(--down)'};">${s.session.actualGain>=0?'+':''}$${s.session.actualGain.toFixed(2)}</span>
      </div>
      <div class="whatif-row" style="background:transparent;border:none;margin-bottom:3px;">
        <span class="whatif-label">Réinvesti (composé)</span>
        <span class="whatif-val" style="color:var(--up);">+$${s.session.compounded.toFixed(2)}</span>
      </div>
      <div class="whatif-row" style="background:transparent;border:none;margin-bottom:0;">
        <span class="whatif-label">Trades bot exécutés</span>
        <span class="whatif-val" style="color:var(--ice);">${s.session.botTrades}</span>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// 5. LEAD-LAG INTER-PAIR CORRELATIONS
// ════════════════════════════════════════════════════════════
function detectLeadLagPatterns() {
  const pairs = Object.keys(PAIRS);
  const results = [];
  const lags = [0, 2, 5, 10];

  for(let i = 0; i < pairs.length; i++) {
    const pA = S.pairStates[pairs[i]];
    if(!pA?.candles || pA.candles.length < 25) continue;
    const retsA = [];
    for(let k = 1; k < 25; k++) {
      const idx = pA.candles.length - 25 + k;
      const prev = pA.candles[idx - 1];
      const cur  = pA.candles[idx];
      if(prev && cur && prev.c > 0) retsA.push((cur.c - prev.c) / prev.c);
    }

    for(let j = 0; j < pairs.length; j++) {
      if(i === j) continue;
      const pB = S.pairStates[pairs[j]];
      if(!pB?.candles || pB.candles.length < 25 + Math.max(...lags)) continue;

      let bestLag = 0, bestCorr = 0;
      for(const lag of lags) {
        const retsB = [];
        for(let k = 1; k < 25; k++) {
          const idx = pB.candles.length - 25 + k - lag;
          if(idx < 1) { retsB.length = 0; break; }
          const prev = pB.candles[idx - 1];
          const cur  = pB.candles[idx];
          if(prev && cur && prev.c > 0) retsB.push((cur.c - prev.c) / prev.c);
        }
        if(retsB.length !== retsA.length) continue;
        const corr = _pearson(retsA, retsB);
        if(Math.abs(corr) > Math.abs(bestCorr)) { bestCorr = corr; bestLag = lag; }
      }
      if(Math.abs(bestCorr) > 0.45) {
        results.push({
          leader:   pairs[i],
          follower: pairs[j],
          lag:      bestLag,
          corr:     bestCorr
        });
      }
    }
  }

  return results.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr)).slice(0, 6);
}

function renderLeadLagPanel() {
  const el = document.getElementById('apanel-leadlag');
  if(!el) return;

  const patterns = detectLeadLagPatterns();
  if(patterns.length === 0) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">Analyse des corrélations en cours…</div>';
    return;
  }

  const rows = patterns.map(p => {
    const cfgA = PAIRS[p.leader];
    const cfgB = PAIRS[p.follower];
    const absCorr = Math.abs(p.corr);
    const strong  = absCorr > 0.7 ? 'strong' : 'weak';
    const lagLbl  = p.lag === 0 ? 'simultané' : `lag +${p.lag} cycles`;
    const dirSign = p.corr > 0 ? '↑↑' : '↑↓';
    const dirLbl  = p.corr > 0 ? 'co-mouvement' : 'mouvement inverse';
    return `<div class="leadlag-row">
      <span class="leadlag-arrow">${dirSign}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:10px;font-weight:700;">
          <span style="color:${cfgA.color};">${p.leader}</span>
          <span style="color:var(--t3);">→</span>
          <span style="color:${cfgB.color};">${p.follower}</span>
        </div>
        <div style="font-size:8px;color:var(--t3);">${dirLbl} · ${lagLbl}</div>
      </div>
      <span class="leadlag-corr ${strong}">${p.corr>=0?'+':''}${p.corr.toFixed(2)}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:9px;color:var(--t2);margin-bottom:8px;">
      Corrélations détectées sur les 25 dernières bougies :
    </div>
    ${rows}
    <div style="font-size:8px;color:var(--t3);margin-top:6px;line-height:1.5;">
      ↑↑ = mouvement parallèle · ↑↓ = inverse · R &gt; 0.7 = corrélation forte
    </div>`;
}

// ════════════════════════════════════════════════════════════
// ANALYTICS TAB SWITCHER
// ════════════════════════════════════════════════════════════






// ════════════════════════════════════════════════════════════
// v5.4 — REVOLUTIONARY FEATURES (4 world-firsts)
// ════════════════════════════════════════════════════════════

// v5.8 FIX — AUTHORITATIVE tab declaration (hoisted at top to avoid TDZ)
const _V54_TABS = ['debate','swarm','fleet','mirror','resonance','cascade','dreams','perf','horizon','heatmap','whatif','leadlag'];


// Init persistent state for v5.4
if(typeof S !== 'undefined') {
  if(!S.shadow)           S.shadow = { virtualPnl: 0, virtualTrades: [], wins: 0, losses: 0, lastRetrain: 0 };
  if(!S.decisionCascade)  S.decisionCascade = [];       // [{ts, pair, side, signals, topAgents, outcome}]
  if(!S.dreamJournal)     S.dreamJournal = [];          // [{ts, pair, text, sentiment}]
  if(!S.resonanceHistory) S.resonanceHistory = [];      // past events
}

// ════════════════════════════════════════════════════════════
// [PHASE 1 · 12/09/2026] liveTrainAgents RETIRÉ → archive/liveTrainAgents-03-retire-phase1.js
// Il tirait TOUS les agents vers le momentum 5 bougies de chaque paire à chaque fetch CoinGecko
// (la dernière paire gagnait) : doublon de l'AT (le momentum est déjà dans getTechSignals) qui
// écrasait le score appris. Ses lignes 🧠 « Apprentissage · N agents entraînés » disparaissent
// du journal (ce n'était pas un apprentissage). Son appelant _cgT (02) est retiré en même temps.
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
// 1. INNER DIALOGUE — 5 Personas Debate Panel
// ════════════════════════════════════════════════════════════
// ═══ [DÉGEL DES VOIX · 02/10/2026] LES VOIX LISENT CE QU'ELLES CROIENT LIRE (go Rams 01/10 20:51 : « l'horloge par mode en premier … Ensuite le dégel ») ═══
// Rams (30/09) : « les bots, je trouve qu'ils sont figés la plupart ». Backup du 29/09, 240 derniers votes par voix : security_v1 achète 100 % du
// temps, fundamental_v1 vend 98 %, nlp_v1 achète 92 %, corr_v1 et macro_v1 donnent la même valeur sur les 12 paires, l'harmonique n'a que 6 valeurs,
// mean_rev_v1 n'a jamais voté. Ce qui les figeait, vérifié dans le code :
//  1. Noms de champs : les voix lisaient tech.raw.rsi.rsi et tech.raw.boll.position ; 08 getTechSignals donne raw.rsi = { value, divergence }
//     (calcRSI) et raw.boll = { pct, … } (calcBollinger) → RSI toujours 50, Bollinger toujours au milieu, depuis toujours (les bancs donnaient la
//     même fausse forme). Lecture corrigée (_techRsi, _techBollPct) : harmonic_v1 (notes RSI et Bollinger), sentiment_v2 (terme RSI),
//     contrarian_v2 (RSI), mean_rev_v1 (Bollinger), le débat des personas (non appelé). Les gènes qui n'ont jamais vu leur entrée (harmonic_v1 :
//     rsiHigh, rsiLow, bbHigh, bbLow ; sentiment_v2 : rsiHigh, rsiLow, rsiW ; contrarian_v2 : rsiHigh, rsiLow ; mean_rev_v1 : bbHigh, bbLow — ils
//     ont dérivé sans aucune sélection possible) repartent de leur valeur de départ (GENOME_DEFAULTS), une fois (_degelMigrated, migration plus
//     bas) — dans le génome courant, l'ancien génome d'un essai en cours ET les versions archivées (genomeHistory : sinon l'évolution, qui reprend
//     la meilleure version passée, les ramènerait ; leur pointe de fitness ne devait rien à ces gènes, leur entrée étant constante).
//  2. Bouche-trous de coupure lus comme de vrais prix plats : voir 02 (_realCandlesHoled) — une série trouée attend désormais les vraies bougies ;
//     un trade virtuel dont le chemin croise un bouche-trou attend aussi la réparation au lieu d'être abandonné (_thWalk, au plus 4 bougies après
//     sa sortie, la règle d'avant pour une série coupée).
//  3. Gardiens : un STATUT n'est pas un sens. Un feu vert valait +0,05, compté comme un ACHAT par la décision commune (|v| ≥ 0,03), le bilan aux
//     horizons et le marché — security_v1 votait +0,05 sur toutes les paires à chaque cycle (ses seuils de volatilité, 3,6 % / 4,5 %, sont
//     au-dessus de tout ce que le 15 min produit : médiane 0,28 %) ; jugé sur ce vote constant, il suivait la dérive du marché : poids 0,485 (16 %
//     de la décision), fitness 835. Un gardien muet valait aussi +0,05 ; une alerte −0,2 et un veto −0,5 étaient des VENTES (l'alerte permanente
//     de l'Évolueur comptait contre chaque long dans la sortie « signal inversé », 10f). Désormais tout statut de gardien vaut 0 dans les votes ;
//     le veto bloque toujours l'ouverture (09c, anyVeto), le statut reste affiché. Le record de security_v1, gagné par ce faux achat, est effacé
//     une fois (fitness neutre 350, T$ du marché comme à une naissance). Les disciples gardiens ne répondent plus « direction » ni « timing » et
//     l'élection ne leur donne que « conditions » (12). L'Évolueur comptait « 4 perdants sur 5 » sur les 5 derniers trades de CHAQUE paire
//     (jusqu'à 60) : alerte permanente — désormais les 5 derniers trades du système.
//  4. Voix de marché recentrées sur la paire : corr_v1 (lecture de BTC) et macro_v1 (Fear & Greed, capitalisation) valent pour la paire à
//     proportion de sa corrélation à BTC (10e, 30 bougies du mode ; inconnue, nulle ou négative → abstention) ; nlp_v1 compare le ton des news de
//     la paire à celui de toutes les news (la liste de mots juge la plupart des titres haussiers) ; fundamental_v1 mesure le financement à partir
//     du taux de base de Binance (+0,01 % par 8 h, l'intérêt de sa formule) et non de 0 (−0,066 constant sur toutes les paires) ; macro_v1 : chaque
//     source a son heure (07). En EV / RE, une corrélation calculée sur une série périmée ou trouée (la paire ou BTC) est sans objet : abstention.
//  5. Volume : une bougie redemandée à Binance (REST) porte le volume en monnaie de base, une bougie agrégée du flux porte un NOMBRE DE MESSAGES
//     (au plus 4 par seconde) — deux unités. Après chaque réparation de série, volume_v1 comparait l'un à l'autre (BTC : « pic de volume × 27 »
//     pendant 5 h). Les bougies REST sont marquées (_r, 02), une bougie retouchée par le flux perd la marque ; volume_v1 s'abstient quand sa fenêtre
//     mêle les deux sources. Essayé puis retiré : ne lire que les bougies closes (la bougie en cours, à peine ouverte au cycle, compte presque vide —
//     le rapport récent / ancien tombe sous 1 et la voix vote alors à l'inverse du prix des 5 dernières bougies) : au rejeu, la voix ne parlait plus
//     que 10 % des cycles au lieu de 66 % et sa justesse à 15 min tombait de +0,18 à +0,05 — ce biais est un retour à la moyenne qui a fait ses
//     preuves (backup du 29/09 : +0,34 / +0,57 / +0,47 de 15 min à 1 h sur ses 60 derniers jugements) ; la voix le garde, dit tel quel.
// Pas changé : geopolitic_v1 (vraie tendance 1 h / 4 h), hedge_v2 (suit ses conseillers, dont macro), arb / dca (un seul sens par construction),
// le bilan aux horizons (une voix de marché reste jugée sur le marché), les seuils de volatilité de security_v1 (hors d'échelle en 15 min), le
// volume du flux (un compte de messages plafonné : presque constant sur les paires liquides — le volume réel demande le flux @kline ou les
// bougies REST à chaque clôture), le taux de base du financement pour un contrat à 4 h (0,005 % ; non vérifiable d'ici : API futures bloquée).
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres de 9 h, 2 tirages, EV et RE en marche en 15 min ; code d'avant (20261001a) contre ce code, mêmes fenêtres ; les flux macro, news et positionnement ne sont pas dans les sauvegardes : macro_v1, nlp_v1 et fundamental_v1 se taisent dans les deux rejeux — leurs changements ne sont éprouvés que par banc-degel.js, comme la réparation des séries trouées : le rejeu n'a pas les vraies bougies des coupures) : avant : tirage 1 0 trades, net 0 $, tirage 2 0 trades, net 0 $ ; ce code : tirage 1 0 trades, net 0 $, tirage 2 0 trades, net 0 $ ; 0 erreur. Voix (part des cycles où elle parle, valeurs distinctes, même valeur sur toutes les paires au même instant, justesse E = Σ v·D / Σ |v·D|) : security_v1 : parle 88,5 %, 3 valeurs, même valeur sur toutes les paires 96,5 %, justesse 15 min / 4 h +0,06 / +0,26 → muette ; harmonic_v1 : parle 75,1 %, 6 valeurs, même valeur sur toutes les paires 0,6 %, justesse 15 min / 4 h +0,01 / +0,02 → parle 78,6 %, 10 valeurs, même valeur sur toutes les paires 0,6 %, justesse 15 min / 4 h −0,01 / −0,03 ; contrarian_v2 : parle 0,3 %, 11 valeurs, même valeur sur toutes les paires 0 %, justesse 15 min / 4 h +0,25 / +0,76 → parle 7 %, 244 valeurs, même valeur sur toutes les paires 0 %, justesse 15 min / 4 h +0,21 / +0,57 ; mean_rev_v1 : parle 0,3 %, 19 valeurs, même valeur sur toutes les paires 0 %, justesse 15 min / 4 h −0,35 / −1,00 → parle 13,9 %, 289 valeurs, même valeur sur toutes les paires 0,9 %, justesse 15 min / 4 h +0,06 / +0,50 ; sentiment_v2 : parle 38,7 %, 637 valeurs, même valeur sur toutes les paires 0 %, justesse 15 min / 4 h +0,28 / +0,66 → parle 46,4 %, 788 valeurs, même valeur sur toutes les paires 0 %, justesse 15 min / 4 h +0,24 / +0,54 ; corr_v1 : parle 35 %, 65 valeurs, même valeur sur toutes les paires 75,6 %, justesse 15 min / 4 h −0,13 / −0,17 → parle 30,6 %, 663 valeurs, même valeur sur toutes les paires 0 %, justesse 15 min / 4 h −0,19 / +0,05 ; volume_v1 : parle 65,6 %, 333 valeurs, même valeur sur toutes les paires 0,5 %, justesse 15 min / 4 h +0,18 / +0,06 → parle 63,9 %, 354 valeurs, même valeur sur toutes les paires 0,7 %, justesse 15 min / 4 h +0,20 / +0,07. Décision (sens de la pesée vivante contre le mouvement, 15 min → 4 h ; marché haussier sur ces fenêtres : dérive +0,04 % / +0,07 % / +0,12 % / +0,21 % / +0,37 %) : sens juste 45,2 % / 45,1 % / 45,5 % / 44,9 % / 45,2 % → 45,1 % / 44,3 % / 44,3 % / 43,5 % / 43,5 % ; justesse équilibrée (moyenne des hausses et des baisses) 48,1 % / 47,6 % / 47,4 % / 45 % / 44,5 % → 48,1 % / 46,8 % / 46,2 % / 43,7 % / 42,4 % — l'écart tient à la première moitié de chaque fenêtre, quand les poids des voix décrivent encore leur ancien comportement (1re moitié 48,2 % / 46 % / 44,7 % / 45,9 % / 45 % → 48,6 % / 44,8 % / 42,3 % / 43,1 % / 42,7 % ; 2e moitié 48 % / 49,2 % / 50,8 % / 43,4 % / 37,1 % → 47,6 % / 48,8 % / 50,9 % / 44,5 % / 39 %) ; aucune des deux ne prévoit mieux que le hasard ; trades virtuels de la décision, net moyen −0,36 % / −0,37 % / −0,39 % / −0,40 % / −0,40 % → −0,35 % / −0,38 % / −0,42 % / −0,44 % / −0,43 % (4 460 → 4 457 trades virtuels jugés). Apprentissage : jugements à la bougie suivante 6 859 → 6 854, votes notés aux horizons 7 366 → 7 366, manches du marché 13 923 → 13 923, T$ misés 217 971 → 193 203. Essai retiré avant livraison : volume_v1 sur les bougies closes seulement — la voix ne parlait plus que 9,9 % des cycles (au lieu de 65,6 %), justesse 15 min +0,04 au lieu de +0,18, et le sens juste de la décision tombait à 43 % / 41,8 % / 42,1 % / 42,4 % / 43,9 %.
function _techRsi(tech) { const r = tech && tech.raw && tech.raw.rsi; return (r && typeof r.value === 'number' && isFinite(r.value)) ? r.value : 50; }
function _techBollPct(tech) { const b = tech && tech.raw && tech.raw.boll; return (b && typeof b.pct === 'number' && isFinite(b.pct)) ? b.pct : 0.5; }
function _btcRho(pair) {   // corrélation de LA paire à BTC (10e _getPairCorrelation : 30 bougies du pas de temps du mode) ; BTC lui-même 1 ; null si inconnue
  if (pair === 'BTC/USDT') return 1;
  try {
    if ((S.tradingMode === 'paperReal' || S.tradingMode === 'real') && typeof _realCandlesStale === 'function') {   // EV / RE : série périmée ou trouée (la paire ou BTC) → sans objet
      const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
      if (_realCandlesStale(pair, tf) || _realCandlesStale('BTC/USDT', tf)) return null;
    }
    const r = (typeof _getPairCorrelation === 'function') ? _getPairCorrelation(pair, 'BTC/USDT') : null; return (typeof r === 'number' && isFinite(r)) ? r : null;
  } catch (e) { return null; }
}
var FUND_BASE_PCT = 0.01;   // financement « neutre » de Binance : l'intérêt de sa formule, 0,03 %/jour soit 0,01 % par période de 8 h — un fait de la bourse, pas une limite
window._techRsi = _techRsi; window._techBollPct = _techBollPct; window._btcRho = _btcRho;
const PERSONAS = [
  { id:'scalper',    emoji:'⚡', name:'Scalper',    style:'momentum court terme' },
  { id:'swing',      emoji:'🌊', name:'Swing',      style:'cycles 1h-4h MACD' },
  { id:'contrarian', emoji:'🔥', name:'Contrarian', style:'fade le consensus' },
  { id:'trend',      emoji:'📈', name:'Trend',      style:'ADX + EMA alignement' },
  { id:'hedge',      emoji:'🛡️', name:'Hedge',      style:'risk-off sur volatilité' }
];

function generateDebate(pair) {
  const ps = S.pairStates?.[pair];
  if(!ps) return null;
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(pair) : null;
  if(!tech || !fund) return null;

  const at    = tech.atScore || 0;
  const af    = fund.fundScore || 0;
  const lmsr  = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
  const rsi   = _techRsi(tech);   // [DÉGEL DES VOIX · 02/10/2026] raw.rsi.value (avant raw.rsi.rsi : toujours 50)
  const macd  = tech.raw?.macd?.hist || 0;
  const adx   = tech.raw?.adx?.adx || 20;
  const cv    = tech.raw?.stddev?.cv || 0.015;
  const trend = tech.raw?.adx?.trend || 'ranging';

  // Each persona votes based on its lens
  const votes = [];

  // Scalper — LMSR + short momentum
  {
    const bias = (lmsr - 0.5) * 2;
    let vote = bias > 0.15 ? 'long' : bias < -0.15 ? 'short' : 'hold';
    let quote;
    if(vote === 'long')      quote = `Le marché push, RSI à ${rsi.toFixed(0)}, LMSR à ${(lmsr*100).toFixed(0)}%. Long court terme.`;
    else if(vote === 'short') quote = `LMSR baisse (${(lmsr*100).toFixed(0)}%), pression vendeuse immédiate. Short rapide.`;
    else                      quote = `Pas de momentum clair. On attend la cassure.`;
    votes.push({ persona:PERSONAS[0], vote, quote, weight: 1.0 });
  }

  // Swing — MACD + trend
  {
    let vote = macd > 0 && at > 0.1 ? 'long' : macd < 0 && at < -0.1 ? 'short' : 'hold';
    let quote;
    if(vote === 'long')      quote = `MACD hist positif (${macd.toFixed(3)}), structure haussière 1h-4h. J'entre long.`;
    else if(vote === 'short') quote = `MACD négatif, rollover visible. Cycle baissier confirmé.`;
    else                      quote = `MACD proche de zéro, pas de signal swing propre.`;
    votes.push({ persona:PERSONAS[1], vote, quote, weight: 1.1 });
  }

  // Contrarian — fade extremes
  {
    let vote, quote;
    if(rsi > 72)      { vote = 'short'; quote = `RSI ${rsi.toFixed(0)} → surchauté. Tout le monde achète, je fade.`; }
    else if(rsi < 28) { vote = 'long';  quote = `RSI ${rsi.toFixed(0)} → capitulation. Le sang coule, j'achète.`; }
    else              { vote = 'hold';  quote = `Pas d'extrême à fader, je reste en embuscade.`; }
    votes.push({ persona:PERSONAS[2], vote, quote, weight: 0.9 });
  }

  // Trend — ADX + EMA
  {
    let vote, quote;
    if(adx > 25 && at > 0.15)       { vote = 'long';  quote = `ADX ${adx.toFixed(0)} fort, tendance propre. Long sans hésiter.`; }
    else if(adx > 25 && at < -0.15) { vote = 'short'; quote = `Tendance baissière confirmée (ADX ${adx.toFixed(0)}). Je suis le flow.`; }
    else                             { vote = 'hold';  quote = `ADX ${adx.toFixed(0)} faible, marché en range. No trade.`; }
    votes.push({ persona:PERSONAS[3], vote, quote, weight: 1.2 });
  }

  // Hedge — risk off si volatilité
  {
    const volBad = cv > 0.025;
    let vote, quote;
    if(volBad)                   { vote = 'hold';  quote = `Volatilité élevée (CV ${(cv*100).toFixed(1)}%). Je recommande d'attendre.`; }
    else if(af > 0.2 && at > 0)  { vote = 'long';  quote = `Fondamentaux alignés (${(af*100).toFixed(0)}), volatilité contenue. Entrée raisonnable.`; }
    else if(af < -0.2 && at < 0) { vote = 'short'; quote = `Contexte macro négatif, risk-off justifié.`; }
    else                         { vote = 'hold';  quote = `Pas de conviction assez forte pour justifier le risque.`; }
    votes.push({ persona:PERSONAS[4], vote, quote, weight: 0.8 });
  }

  // Weighted verdict
  let scoreLong = 0, scoreShort = 0, scoreHold = 0;
  votes.forEach(v => {
    if(v.vote === 'long')       scoreLong  += v.weight;
    else if(v.vote === 'short') scoreShort += v.weight;
    else                        scoreHold  += v.weight;
  });
  const maxScore = Math.max(scoreLong, scoreShort, scoreHold);
  const verdict = maxScore === scoreLong ? 'LONG' : maxScore === scoreShort ? 'SHORT' : 'HOLD';
  const totalW = scoreLong + scoreShort + scoreHold;
  const conviction = totalW > 0 ? maxScore / totalW : 0;

  return { pair, votes, verdict, conviction, at, af, lmsr };
}




// ════════════════════════════════════════════════════════════
// 2. ADVERSARIAL MIRROR — Shadow bot running opposite strategy
// ════════════════════════════════════════════════════════════
function updateShadowBot() {
  if(!S.shadow) S.shadow = { virtualPnl: 0, virtualTrades: [], wins: 0, losses: 0, lastRetrain: 0 };
  // Shadow virtually takes OPPOSITE side of every actual bot trade
  // We update when a position closes (hook in closePosition)
}

function recordShadowFromClose(realPnlUsd, realPnlPct, pair, side) {
  if(!S.shadow) S.shadow = { virtualPnl: 0, virtualTrades: [], wins: 0, losses: 0, lastRetrain: 0 };
  // Shadow takes opposite → pnl is inverted
  const shadowPnl = -realPnlUsd * 0.92;  // 0.92 accounts for slippage/fees on the shadow side
  S.shadow.virtualPnl += shadowPnl;
  S.shadow.virtualTrades.push({ ts: Date.now(), pair, realSide: side, shadowPnl, realPnl: realPnlUsd });
  if(S.shadow.virtualTrades.length > 50) S.shadow.virtualTrades.shift();
  if(shadowPnl > 0) S.shadow.wins++; else S.shadow.losses++;
}

function renderMirrorPanel() {
  const el = document.getElementById('apanel-mirror');
  if(!el) return;
  const mainPnl = (S.portfolio && S._startPortfolio ? (S.portfolio - S._startPortfolio) : 0);   // [MÉNAGE · 23/09/2026] le P&L de session, le même qu'à l'accueil — _totalCompounded (−112 $ fossile) retiré
  const shadow = S.shadow || { virtualPnl: 0, virtualTrades: [], wins: 0, losses: 0 };
  const recentN = Math.min(20, shadow.virtualTrades.length);
  const recent = shadow.virtualTrades.slice(-recentN);
  const recentShadowSum = recent.reduce((s,t) => s + t.shadowPnl, 0);
  const recentRealSum   = recent.reduce((s,t) => s + t.realPnl, 0);
  const delta = recentRealSum - recentShadowSum;
  const mainCol = mainPnl >= 0 ? 'var(--up)' : 'var(--down)';
  const shadowCol = shadow.virtualPnl >= 0 ? 'var(--up)' : 'var(--down)';
  let insight;
  if(recentN < 3) {
    insight = '⏳ Analyse du shadow en cours… (3+ trades nécessaires)';
  } else if(delta > 0) {
    insight = `✅ Stratégie principale supérieure de $${delta.toFixed(2)} sur les ${recentN} derniers trades. Cap maintenu.`;
  } else if(Math.abs(delta) < 2) {
    insight = `⚖️ Performance équivalente. Le shadow ne trouve pas de faille exploitable.`;
  } else {
    insight = `⚠️ Stratégie inverse plus performante de $${Math.abs(delta).toFixed(2)}. Recalibration recommandée.`;
    S.shadow.lastRetrain = Date.now();
  }

  el.innerHTML = `
    <div class="mirror-wrap">
      <div class="mirror-card main">
        <div class="mirror-label">🤖 BOT PRINCIPAL</div>
        <div class="mirror-val" style="color:${mainCol};">${mainPnl>=0?'+':''}$${mainPnl.toFixed(2)}</div>
        <div style="font-size:8px;color:var(--t3);margin-top:3px;">P&L session total</div>
      </div>
      <div class="mirror-card shadow">
        <div class="mirror-label">🪞 SHADOW (opposé)</div>
        <div class="mirror-val" style="color:${shadowCol};">${shadow.virtualPnl>=0?'+':''}$${shadow.virtualPnl.toFixed(2)}</div>
        <div style="font-size:8px;color:var(--t3);margin-top:3px;">${shadow.wins}W · ${shadow.losses}L</div>
      </div>
    </div>
    <div class="mirror-delta">
      <div style="font-size:8px;color:var(--t3);letter-spacing:.06em;">Δ MAIN vs SHADOW (${recentN} derniers)</div>
      <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:${delta>=0?'var(--up)':'var(--down)'};margin-top:2px;">
        ${delta>=0?'+':''}$${delta.toFixed(2)}
      </div>
    </div>
    <div class="mirror-insight">${insight}</div>`;
}

// ════════════════════════════════════════════════════════════
// 3. HARMONIC RESONANCE — Rare multi-indicator alignment
// ════════════════════════════════════════════════════════════
function detectHarmonicResonance(pair) {
  const ps = S.pairStates?.[pair];
  if(!ps) return null;
  // [HARMONIQUE GÉNOMÉE · 23/09/2026] la pire source de l'attribution (−0,22 %/trade, 43 % de réussite) était la seule dont les
  // seuils étaient encore en dur : elle ne pouvait ni s'améliorer ni s'éteindre proprement. Ses 9 seuils sont désormais le
  // génome du siège harmonic_v1 (GENOME_DEFAULTS = ces valeurs → byte-identique par défaut, oracle banc-fixtures/harmonic-avant-genome-20260923c.js).
  const G = (typeof _genomeOf === 'function') ? _genomeOf('harmonic_v1') : null;
  const g = (k, d) => (G && isFinite(G[k])) ? G[k] : d;
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  if(!tech) return null;

  const rsi   = _techRsi(tech);   // [DÉGEL DES VOIX · 02/10/2026] raw.rsi.value (avant raw.rsi.rsi : toujours 50)
  const macd  = tech.raw?.macd?.hist || 0;
  const stoch = tech.raw?.stoch?.k || 50;
  const adx   = tech.raw?.adx?.adx || 20;
  const bb    = _techBollPct(tech);   // [DÉGEL DES VOIX · 02/10/2026] raw.boll.pct (avant raw.boll.position : toujours 0,5)

  // Direction: +1 bullish, -1 bearish, 0 neutral
  const notes = [
    { name:'RSI',   val: rsi > g('rsiHigh', 65) ? +1 : rsi < g('rsiLow', 35) ? -1 : 0, display: `RSI ${rsi.toFixed(0)}` },
    { name:'MACD',  val: macd > g('macdThr', 0.002) ? +1 : macd < -g('macdThr', 0.002) ? -1 : 0, display: `MACD ${macd>=0?'+':''}${macd.toFixed(3)}` },
    { name:'STOCH', val: stoch > g('stochHigh', 75) ? +1 : stoch < g('stochLow', 25) ? -1 : 0, display: `STO ${stoch.toFixed(0)}` },
    { name:'ADX',   val: adx > g('adxMin', 30) ? (macd > 0 ? +1 : -1) : 0, display: `ADX ${adx.toFixed(0)}` },
    { name:'BOLL',  val: bb > g('bbHigh', 0.85) ? +1 : bb < g('bbLow', 0.15) ? -1 : 0, display: `BB ${(bb*100).toFixed(0)}%` }
  ];

  const bullCount = notes.filter(n => n.val === +1).length;
  const bearCount = notes.filter(n => n.val === -1).length;
  const maxAligned = Math.max(bullCount, bearCount);
  const direction = bullCount > bearCount ? 'bullish' : bearCount > bullCount ? 'bearish' : 'neutral';
  const strength  = maxAligned / notes.length;
  const isResonance = maxAligned >= g('resonanceMin', 4);

  if(isResonance && S.resonanceHistory) {
    const lastEvent = S.resonanceHistory[S.resonanceHistory.length - 1];
    if(!lastEvent || Date.now() - lastEvent.ts > 60000) {
      S.resonanceHistory.push({ ts: Date.now(), pair, direction, strength, aligned: maxAligned });
      if(S.resonanceHistory.length > 15) S.resonanceHistory.shift();
    }
  }
  return { notes, bullCount, bearCount, direction, strength, isResonance, pair };
}

function renderResonancePanel() {
  const el = document.getElementById('apanel-resonance');
  if(!el) return;
  const pair = S.activePair || (Object.keys(S.pairStates || {})[0]) || 'BTC/USDT';
  const r = detectHarmonicResonance(pair);
  if(!r) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">Analyse en cours…</div>';
    return;
  }
  const cfg = PAIRS[pair];
  const strPct = (r.strength * 100).toFixed(0);
  const dirCol = r.direction === 'bullish' ? 'var(--up)' : r.direction === 'bearish' ? 'var(--down)' : 'var(--gold)';

  const notesHtml = r.notes.map(n => {
    const active = n.val !== 0;
    const dot = n.val > 0 ? '↑' : n.val < 0 ? '↓' : '–';
    const col = n.val > 0 ? 'var(--up)' : n.val < 0 ? 'var(--down)' : 'var(--t3)';
    return `<span class="resonance-note${active?' active':''}" style="${active?`color:${col};`:''}">${dot} ${n.display}</span>`;
  }).join('');

  const history = (S.resonanceHistory || []).slice(-4).reverse().map(ev => {
    const mins = Math.floor((Date.now() - ev.ts) / 60000);
    const col = ev.direction === 'bullish' ? 'var(--up)' : 'var(--down)';
    return `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9px;border-bottom:1px dashed var(--border);">
      <span style="color:${col};">${ev.direction === 'bullish' ? '↑↑' : '↓↓'} ${ev.pair}</span>
      <span style="color:var(--t3);">${ev.aligned}/5 · il y a ${mins}m</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="resonance-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:9px;color:var(--t2);font-weight:600;">⚡ RÉSONANCE HARMONIQUE · ${pair}</span>
        <span style="font-size:10px;font-weight:700;color:${dirCol};">${strPct}%</span>
      </div>
      <div class="resonance-meter">
        <div class="resonance-fill" style="width:${strPct}%;"></div>
      </div>
      <div style="margin-top:8px;">${notesHtml}</div>
      ${r.isResonance ? `
        <div class="resonance-event">
          <span style="font-size:14px;">${r.direction === 'bullish' ? '🎵' : '🎼'}</span>
          <div style="flex:1;">
            <div style="font-size:10px;font-weight:700;color:var(--pur);">ÉVÉNEMENT DE RÉSONANCE</div>
            <div style="font-size:9px;color:var(--t2);">${r.bullCount >= 4 ? r.bullCount : r.bearCount}/5 indicateurs alignés · conviction élevée</div>
          </div>
        </div>
      ` : `
        <div style="margin-top:8px;padding:6px 10px;background:var(--s2);border-radius:8px;font-size:9px;color:var(--t3);text-align:center;">
          En attente d'alignement (4/5 minimum). Actuel : ${Math.max(r.bullCount, r.bearCount)}/5
        </div>
      `}
      ${history ? `<div style="margin-top:10px;"><div style="font-size:8px;color:var(--t3);margin-bottom:4px;letter-spacing:.06em;">HISTORIQUE</div>${history}</div>` : ''}
    </div>`;
}

// ════════════════════════════════════════════════════════════
// 4. BUTTERFLY CASCADE — Decision traceability
// ════════════════════════════════════════════════════════════
function recordDecisionCascade(pair, side, stake, reason) {
  if(!S.decisionCascade) S.decisionCascade = [];
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(pair) : null;
  const ps = S.pairStates?.[pair];
  // v5.5 — Use live roster analysis for richer traceability
  let topAgents = [];
  try {
    if(typeof runRosterAnalysis === 'function') {
      const r = runRosterAnalysis(pair);
      // Top 3 council voters (non-hold) + strongest scout
      const councilContribs = Object.entries(r.councilResults)
        .filter(([k,v]) => v.vote !== 'hold')
        .sort((a,b) => Math.abs(b[1].score) - Math.abs(a[1].score))
        .slice(0, 2)
        .map(([id,v]) => {
          const a = (S.agents || []).find(x => x.id === id);
          return { name: a?.name || id, emoji: a?.emoji || '·', score: v.score, conf: 0.8, type:'council' };
        });
      const scoutContribs = Object.entries(r.scoutResults)
        .sort((a,b) => Math.abs(b[1].score) - Math.abs(a[1].score))
        .slice(0, 2)
        .map(([id,s]) => {
          const a = (S.agents || []).find(x => x.id === id);
          return { name: a?.name || id, emoji: a?.emoji || '·', score: s.score, conf: s.conf, type:'scout' };
        });
      topAgents = [...councilContribs, ...scoutContribs];
    }
  } catch(e) {}
  if(topAgents.length === 0) {
    topAgents = (S.agents || [])
      .filter(a => a && typeof a.score === 'number')
      .sort((a,b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 3)
      .map(a => ({ name: a.name || a.id, emoji: a.emoji || '·', score: a.score, conf: a.conf || 0.5, type:'legacy' }));
  }
  S.decisionCascade.push({
    ts: Date.now(),
    pair, side, stake,
    reason: reason || 'auto',
    at: tech?.atScore || 0,
    af: fund?.fundScore || 0,
    lmsr: typeof lmsrP === 'function' && ps ? lmsrP(ps) : 0.5,
    topAgents,
    entryPrice: ps?.price || 0,
    closed: false
  });
  if(S.decisionCascade.length > 15) S.decisionCascade.shift();
}

function closeDecisionCascade(pair, side, exitPrice, pnlUsd, pnlPct) {
  if(!S.decisionCascade) return;
  // Find most recent open entry for this pair+side
  for(let i = S.decisionCascade.length - 1; i >= 0; i--) {
    const d = S.decisionCascade[i];
    if(d.pair === pair && d.side === side && !d.closed) {
      d.closed = true;
      d.exitTs = Date.now();
      d.exitPrice = exitPrice;
      d.pnlUsd = pnlUsd;
      d.pnlPct = pnlPct;
      break;
    }
  }
}

function renderCascadePanel() {
  const el = document.getElementById('apanel-cascade');
  if(!el) return;
  const cascade = (S.decisionCascade || []).slice().reverse().slice(0, 5);
  if(cascade.length === 0) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">🦋 Le premier trade déclenchera la cascade…</div>';
    return;
  }
  const rows = cascade.map(d => {
    const cfg = PAIRS[d.pair];
    const closedStatus = d.closed
      ? (d.pnlUsd >= 0 ? `✅ +$${d.pnlUsd.toFixed(2)}` : `❌ $${d.pnlUsd.toFixed(2)}`)
      : '⏳ Ouvert';
    const closedCol = !d.closed ? 'var(--gold)' : (d.pnlUsd >= 0 ? 'var(--up)' : 'var(--down)');
    const agentList = d.topAgents.map(a => `${a.name}(${a.score.toFixed(2)})`).join(' · ');
    const mins = Math.floor((Date.now() - d.ts) / 60000);
    return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:9px;margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:10px;font-weight:700;color:${cfg?.color || 'var(--ice)'};">${d.pair} · ${d.side.toUpperCase()}</span>
        <span style="font-size:9px;font-weight:700;color:${closedCol};">${closedStatus}</span>
      </div>
      <div class="cascade-node">
        <div class="cascade-time">T-${mins}m</div>
        <div class="cascade-body">
          <div class="cascade-title">🎯 Signaux déclencheurs</div>
          <div class="cascade-detail">Tech ${d.at>=0?'+':''}${d.at.toFixed(2)} · Fund ${d.af>=0?'+':''}${d.af.toFixed(2)} · LMSR ${(d.lmsr*100).toFixed(0)}%</div>
        </div>
      </div>
      <div class="cascade-node">
        <div class="cascade-time">T-${mins}m</div>
        <div class="cascade-body">
          <div class="cascade-title">🧠 Agents dominants</div>
          <div class="cascade-detail">${agentList || 'n/a'}</div>
        </div>
      </div>
      <div class="cascade-node">
        <div class="cascade-time">T-${mins}m</div>
        <div class="cascade-body">
          <div class="cascade-title">💰 Entrée · $${d.entryPrice.toFixed(cfg?.dec || 2)}</div>
          <div class="cascade-detail">Mise $${d.stake.toFixed(2)} · ${d.reason}</div>
        </div>
      </div>
      ${d.closed ? `<div class="cascade-node">
        <div class="cascade-time">${Math.floor((d.exitTs-d.ts)/60000)}m</div>
        <div class="cascade-body">
          <div class="cascade-title">🏁 Sortie · $${d.exitPrice.toFixed(cfg?.dec || 2)}</div>
          <div class="cascade-detail">${d.pnlPct>=0?'+':''}${d.pnlPct.toFixed(2)}%</div>
        </div>
      </div>` : ''}
    </div>`;
  }).join('');
  el.innerHTML = `<div class="cascade-wrap">
    <div style="font-size:9px;color:var(--t2);margin-bottom:8px;">🦋 Traçabilité complète des 5 dernières décisions :</div>
    ${rows}
  </div>`;
}

// ════════════════════════════════════════════════════════════
// 5. DREAM JOURNAL — Post-trade narratives (bonus)
// ════════════════════════════════════════════════════════════
function generateDreamEntry(pair, side, pnlPct, pnlUsd) {
  const positive = pnlUsd >= 0;
  const strong = Math.abs(pnlPct) > 3;
  const insights = positive
    ? (strong
      ? [`J'ai bien lu le marché sur ${pair}. ${side.toUpperCase()} payant. Les signaux convergeaient déjà avant l'entrée.`,
         `Belle victoire ${pair}. +${pnlPct.toFixed(2)}%. Le timing était là, j'ai juste à écouter mes agents.`,
         `${pair} : la patience a payé. J'aurais pu tenir encore mais sortir en profit reste la règle d'or.`]
      : [`${pair} : petit gain. +${pnlPct.toFixed(2)}%. Conservateur mais cohérent avec le contexte.`,
         `Scalp réussi sur ${pair}. Rien de spectaculaire mais la méthode fonctionne.`,
         `${pair} fermé dans le vert. Discipline avant ego.`])
    : (strong
      ? [`${pair} : leçon coûteuse. ${pnlPct.toFixed(2)}%. J'ai ignoré la divergence MACD. À noter pour la prochaine fois.`,
         `Stop déclenché sur ${pair}. ${pnlPct.toFixed(2)}%. Le marché a fait un retournement brutal, les agents n'ont pas vu venir.`,
         `Erreur sur ${pair}. Surdimensionné la conviction. Réduire le stake quand CV > 2%.`]
      : [`${pair} : petite perte contrôlée. ${pnlPct.toFixed(2)}%. Le stop a bien joué son rôle.`,
         `${pair} fermé. ${pnlPct.toFixed(2)}%. Pas un drame, le risk management tient.`,
         `Perte minime sur ${pair}. La thèse était bonne mais le timing imparfait.`]);
  const text = insights[Math.floor(Math.random() * insights.length)];
  const sentiment = positive ? (strong ? 'joy' : 'content') : (strong ? 'remorse' : 'accepting');
  if(!S.dreamJournal) S.dreamJournal = [];

  // v17 · #1 JOURNAL ENRICHI : capturer agents + indicateurs + pos ouverte
  const pos = (S.openPositions || []).find(p => p.pair === pair) ||
              (S._lastClosedPos && S._lastClosedPos.pair === pair ? S._lastClosedPos : null);
  const ps  = S.pairStates[pair] || {};

  S.dreamJournal.push({
    ts:        Date.now(),
    pair, side, text, sentiment, pnlPct, pnlUsd,
    // v17 · données enrichies
    regime:    ps.regime || 'calm',
    rsi:       ps.rsi14  || null,
    openReason: pos ? (pos._openReason || null) : null,
    openAgents: pos ? (pos._openAgents || []) : [],
    stake:     pos ? (pos.stakeUsdt || 0) : 0,
    cycle:     S.cycle || 0,
  });
  if(S.dreamJournal.length > 80) S.dreamJournal.shift();  // v17 : 80 entrées (était 40)
  // v17 : rafraîchir le journal visible
  try { if(typeof renderJournal === 'function') renderJournal(); } catch(e) {}
}

function renderDreamsPanel() {
  const el = document.getElementById('apanel-dreams');
  if(!el) return;
  const dreams = (S.dreamJournal || []).slice().reverse().slice(0, 8);
  if(dreams.length === 0) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">💭 Le bot n\'a pas encore rêvé… (journal rempli après chaque trade)</div>';
    return;
  }
  const entries = dreams.map(d => {
    const mins = Math.floor((Date.now() - d.ts) / 60000);
    const timeLbl = mins < 60 ? `il y a ${mins}m` : `il y a ${Math.floor(mins/60)}h`;
    const sentCol = d.sentiment === 'joy' ? 'var(--up)' : d.sentiment === 'remorse' ? 'var(--down)' : d.sentiment === 'content' ? 'var(--ice)' : 'var(--gold)';
    const sentEmo = d.sentiment === 'joy' ? '😊' : d.sentiment === 'remorse' ? '😔' : d.sentiment === 'content' ? '🙂' : '😐';
    return `<div class="dream-entry">
      <div class="dream-quote">${d.text}</div>
      <div class="dream-meta">
        <span style="color:${sentCol};">${sentEmo} ${d.sentiment}</span>
        <span>${timeLbl}</span>
      </div>
    </div>`;
  }).join('');
  el.innerHTML = `<div style="font-size:9px;color:var(--t2);margin-bottom:8px;">💭 Journal de bord du bot — ${dreams.length} réflexions récentes :</div>${entries}`;
}

// ═══════════════════════════════════════════════════════════════════
// v17 · #1 JOURNAL DE BORD AUTO — Rendu enrichi sur la page HOME
// ═══════════════════════════════════════════════════════════════════
function renderJournal() {
  const entriesEl = document.getElementById('journalEntries');
  const statsEl   = document.getElementById('journalStats');
  const emptyEl   = document.getElementById('journalEmpty');
  const filterPair = document.getElementById('journalFilterPair');
  const filterResult = document.getElementById('journalFilterResult');
  if(!entriesEl) return;

  const journal = (S.dreamJournal || []).slice().reverse(); // plus récent en premier

  // Mettre à jour le filtre paires
  if(filterPair) {
    const pairs = [...new Set(journal.map(e => e.pair))];
    const currentVal = filterPair.value;
    filterPair.innerHTML = '<option value="all">Toutes paires</option>' +
      pairs.map(p => `<option value="${p}" ${currentVal===p?'selected':''}>${p}</option>`).join('');
  }

  // Filtrer
  const pairFilter   = filterPair ? filterPair.value : 'all';
  const resultFilter = filterResult ? filterResult.value : 'all';
  const filtered = journal.filter(e => {
    if(pairFilter !== 'all' && e.pair !== pairFilter) return false;
    if(resultFilter === 'win'  && e.pnlUsd < 0) return false;
    if(resultFilter === 'loss' && e.pnlUsd >= 0) return false;
    return true;
  });

  // Stats
  if(statsEl && journal.length > 0) {
    const totalTrades = journal.length;
    const wins  = journal.filter(e => e.pnlUsd >= 0).length;
    const totalPnl = journal.reduce((s,e) => s + (e.pnlUsd||0), 0);
    const wr = (wins/totalTrades*100).toFixed(0);
    statsEl.innerHTML = `
      <div class="journal-stat-card">
        <span class="journal-stat-val">${totalTrades}</span>
        <span class="journal-stat-lbl">Trades</span>
      </div>
      <div class="journal-stat-card">
        <span class="journal-stat-val" style="color:${parseInt(wr)>=50?'var(--up)':'var(--down)'}">${wr}%</span>
        <span class="journal-stat-lbl">Win Rate</span>
      </div>
      <div class="journal-stat-card">
        <span class="journal-stat-val" style="color:${totalPnl>=0?'var(--up)':'var(--down)'}">
          ${totalPnl>=0?'+':''}$${Math.abs(totalPnl).toFixed(2)}
        </span>
        <span class="journal-stat-lbl">P&L total</span>
      </div>
    `;
    statsEl.style.display = 'grid';
  } else if(statsEl) {
    statsEl.style.display = 'none';
  }

  // Vide
  if(filtered.length === 0) {
    entriesEl.innerHTML = '';
    if(emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if(emptyEl) emptyEl.style.display = 'none';

  // Rendu des entrées (max 20 affichées)
  const displayed = filtered.slice(0, 10);
  entriesEl.innerHTML = displayed.map(e => {
    const win = e.pnlUsd >= 0;
    const pnlStr = (win?'+':'') + '$' + Math.abs(e.pnlUsd||0).toFixed(2)
                 + ' (' + (win?'+':'') + (e.pnlPct||0).toFixed(2) + '%)';
    const ago = Date.now() - e.ts;
    const agoStr = ago < 3600000 ? Math.floor(ago/60000)+'m'
                 : ago < 86400000 ? Math.floor(ago/3600000)+'h'
                 : Math.floor(ago/86400000)+'j';
    const sentEmo = e.sentiment === 'joy'      ? '😊'
                  : e.sentiment === 'remorse'   ? '😔'
                  : e.sentiment === 'content'   ? '🙂'
                  : '😐';
    const regimeLbl = (e.regime||'').toUpperCase();
    const agents = (e.openAgents||[]).slice(0,4);
    const rsiStr = e.rsi ? 'RSI '+Math.round(e.rsi) : '';

    return `
      <div class="journal-entry ${win?'win':'loss'}">
        <div class="journal-entry-header">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="journal-entry-pair">${e.pair}</span>
            <span style="font-size:9px;color:${e.side==='long'?'var(--up)':'var(--down)'};">${e.side==='long'?'↑ LONG':'↓ SHORT'}</span>
          </div>
          <span class="journal-entry-pnl ${win?'win':'loss'}">${pnlStr}</span>
        </div>
        <div class="journal-entry-meta">
          <span>${sentEmo} ${e.sentiment||''}</span>
          ${regimeLbl ? `<span>📊 ${regimeLbl}</span>` : ''}
          ${rsiStr ? `<span>${rsiStr}</span>` : ''}
          ${e.stake ? `<span>💰 $${e.stake}</span>` : ''}
          <span style="margin-left:auto;">il y a ${agoStr}</span>
        </div>
        <div class="journal-entry-text">${e.text||''}</div>
        ${e.openReason ? `<div style="font-size:9px;color:var(--t3);margin-bottom:4px;">🧠 ${e.openReason}</div>` : ''}
        ${agents.length > 0 ? `
          <div class="journal-entry-agents">
            ${agents.map(a => `<span class="journal-agent-tag">${a.emoji||''} ${a.name||''} ${(a.score>=0?'+':'')}${(a.score||0).toFixed(2)}</span>`).join('')}
          </div>` : ''}
      </div>`;
  }).join('');

  // Lien "voir plus" si > 20
  if(filtered.length > 10) {
    entriesEl.innerHTML += `<div style="text-align:center;font-size:10px;color:var(--t3);padding:8px;">
      … ${filtered.length - 10} autres entrées (filtre pour voir plus)
    </div>`;
  }
}
window.renderJournal = renderJournal;
// Tier 1 (Council, 7): scalper/swing/contrarian/trend/hedge/momentum/mean_rev
// Tier 2 (Scouts, 11): macro/fundamental/nlp/sentiment/volume/volatility/corr/
//                     geopolitic/onchain/whale/breakout/harmonic/flow
// Tier 3 (Guardians, 3): risk/security/evolver
// Support Bots (4, non-voting): exec_bot/risk_bot/arb_bot/scalper_bot
//
// Flow: Scouts analyze → Council consults scouts + votes → Guardians veto
// ════════════════════════════════════════════════════════════

const ROSTER_TIERS = {
  council:   ['scalper_v2','swing_v2','contrarian_v2','trend_v2','hedge_v2','momentum_v1','mean_rev_v1'],
  scouts:    ['macro_v1','fundamental_v1','nlp_v1','sentiment_v2','volume_v1','volatility_v1',
              'corr_v1','geopolitic_v1','onchain_v1','whale_v1','breakout_v1','harmonic_v1','flow_v1'],
  guardians: ['risk_bot_v1','security_v1','evolver_v1']
};

// Map council persona IDs to their preferred scouts (who advises whom)
const COUNCIL_ADVISORS = {
  scalper_v2:    ['volume_v1','breakout_v1','flow_v1'],       // fast momentum needs volume
  swing_v2:      ['macro_v1','harmonic_v1','corr_v1'],         // cycles need macro context
  contrarian_v2: ['sentiment_v2','nlp_v1','volatility_v1'],   // fade needs sentiment
  trend_v2:      ['onchain_v1','whale_v1','corr_v1'],         // trend needs structural
  hedge_v2:      ['volatility_v1','geopolitic_v1','macro_v1'],// hedge needs risk signals
  momentum_v1:   ['volume_v1','flow_v1','breakout_v1'],       // momentum core
  mean_rev_v1:   ['volatility_v1','harmonic_v1','corr_v1']    // mean reversion
};

// ── SCOUT ANALYZERS (13) ──
// ═══ [GÉNOME · 16/09/2026] GÉNOME RÉEL PAR SIÈGE — point 2 du conseil « évolution à l'infini » (Rams 16/09) ═══
// Jusqu'ici l'Évolueur « fusionnait » des agents dont la logique de vote est fixe par siège : rien de ce qui décide
// n'évoluait (95 013 générations pour rien — audit 14/09). Désormais chaque siège porte un GÉNOME : les nombres que
// sa logique lit réellement dans scoutAnalysis / councilVote / guardianCheck (fenêtres, seuils, gains, poids).
// GENOME_DEFAULTS = les constantes qui étaient en dur (comportement byte-identique par défaut, prouvé par
// banc-genome.js contre l'oracle banc-fixtures/analyse-avant-genome-20260916a.js). S.genome[id] = la version vivante
// du siège ; S.genomeHistory[id] = ses meilleures versions passées (≤ 10, avec la fitness de pointe atteinte).
// À chaque fusion (07 triggerEvolution → _genomeEvolve) : la version courante est archivée avec sa fitness de
// pointe, puis un nouveau génome naît par recombinaison gène à gène entre la version courante et la MEILLEURE
// version passée DU MÊME SIÈGE, puis mutation ±mut (fraction de la valeur), bornée par gène. La sélection reste
// la fitness (quel siège est recyclé). Rien n'est jamais copié d'un siège à un autre : deux logiques, deux génomes.
const GENOME_DEFAULTS = {
  sentiment_v2:  { win: 8,  rsiHigh: 65, rsiLow: 35, momGain: 10, rsiW: 0.5, atW: 0.3, conf: 0.72 },
  volume_v1:     { recentN: 5, histN: 15, lookback: 5, spike: 1.5, spikeScore: 0.6, low: 0.6, maxScore: 0.4, slope: 0.5 },
  volatility_v1: { adxStrong: 30, cvHigh: 0.03, cvLow: 0.008, wStrong: 0.8, wHigh: 0.5, wLow: 0.6, wNormal: 0.6 },
  corr_v1:       { win: 5, gain: 0.15 },
  geopolitic_v1: { emaF: 8, emaS: 21, slopeN: 3, atrN: 14, minBars: 24, kGap: 0.5, kSlope: 0.5, w1h: 0.5, w4h: 0.5, agree: 0.25, disagree: 0.5 },   // [CONTEXTE 1 H / 4 H · 26/09/2026]
  onchain_v1:    { win: 12 },
  whale_v1:      { avgN: 9, big: 2.5, mid: 1.5, bigScore: 0.7, midScore: 0.35, wLiq: 0.3, liqMinUsd: 20000 },   // [LIQUIDATIONS · 26/09/2026] + wLiq, liqMinUsd
  breakout_v1:   { win: 20, margin: 0.002, score: 0.7 },
  flow_v1:       { win: 5, gain: 0.7 },
  scalper_v2:    { gain: 2, ownW: 0.6, voteThr: 0.18 },
  swing_v2:      { atMin: 0.1, score: 0.6, ownW: 0.6, voteThr: 0.18 },
  contrarian_v2: { rsiHigh: 72, rsiLow: 28, score: 0.7, ownW: 0.6, voteThr: 0.18 },
  trend_v2:      { adxMin: 25, atMin: 0.15, score: 0.8, ownW: 0.6, voteThr: 0.18 },
  hedge_v2:      { cvMax: 0.025, adviceMin: 0.3, score: 0.5, ownW: 0.6, voteThr: 0.18 },
  momentum_v1:   { gain: 0.9, ownW: 0.6, voteThr: 0.18 },
  mean_rev_v1:   { bbHigh: 0.9, bbLow: 0.1, score: 0.6, ownW: 0.6, voteThr: 0.18 },
  security_v1:   { cvVeto: 0.04, cvWarn: 0.03 },
  harmonic_v1:   { rsiHigh: 65, rsiLow: 35, macdThr: 0.002, stochHigh: 75, stochLow: 25, adxMin: 30, bbHigh: 0.85, bbLow: 0.15, resonanceMin: 4 },   // [HARMONIQUE GÉNOMÉE · 23/09/2026]
  macro_v1:      { fngLow: 25, fngHigh: 75, capScale: 5, wFng: 0.6, wCap: 0.4 },   // [MACRO RÉEL · 26/09/2026]
  fundamental_v1:{ fundScale: 0.05, oiScale: 5, lsHigh: 1.5, lsLow: 0.67, wF: 0.4, wOi: 0.35, wLs: 0.25 }   // [POSITIONNEMENT · 26/09/2026]
};
const GENE_INT = { win: 1, recentN: 1, histN: 1, lookback: 1, avgN: 1, resonanceMin: 1, emaF: 1, emaS: 1, slopeN: 1, atrN: 1, minBars: 1 };          // fenêtres : entiers ≥ 2 · [CONTEXTE 1 H / 4 H · 26/09/2026] + emaF, emaS, slopeN, atrN, minBars
const GENE_BOUNDS = {                                                             // sinon [défaut/4, défaut×4]
  rsiHigh: [50, 95], rsiLow: [5, 50], bbHigh: [0.5, 1], bbLow: [0, 0.5], ownW: [0.2, 0.9], voteThr: [0.05, 0.5],
  conf: [0.2, 0.95], score: [0.1, 1], spikeScore: [0.1, 1], bigScore: [0.1, 1], midScore: [0.05, 1], maxScore: [0.1, 1],
  wStrong: [0.1, 1], wHigh: [0.1, 1], wLow: [0.1, 1], wNormal: [0.1, 1], gain: [0.02, 4], momGain: [1, 40],
  stochHigh: [50, 95], stochLow: [5, 50], adxMin: [10, 60], resonanceMin: [2, 5],   // [HARMONIQUE GÉNOMÉE · 23/09/2026]
  fngLow: [5, 45], fngHigh: [55, 95], capScale: [1, 20], wFng: [0.1, 1], wCap: [0, 1],   // [MACRO RÉEL · 26/09/2026]
  fundScale: [0.01, 0.3], oiScale: [1, 25], lsHigh: [1.05, 4], lsLow: [0.25, 0.95], wF: [0, 1], wOi: [0, 1], wLs: [0, 1],   // [POSITIONNEMENT · 26/09/2026]
  wLiq: [0, 1], liqMinUsd: [1000, 500000],   // [LIQUIDATIONS · 26/09/2026]
  emaF: [3, 20], emaS: [10, 60], slopeN: [1, 10], atrN: [5, 30], minBars: [12, 60], kGap: [0.1, 2], kSlope: [0, 2], w1h: [0.05, 1], w4h: [0.05, 1], agree: [0, 1], disagree: [0, 0.9]   // [CONTEXTE 1 H / 4 H · 26/09/2026]
};
function _geneClamp(k, v, def) {
  if (!isFinite(v)) return def;
  var b = GENE_BOUNDS[k] || [def / 4, def * 4];
  v = Math.max(b[0], Math.min(b[1], v));
  if (GENE_INT[k]) v = Math.max(2, Math.min(60, Math.round(v)));
  return v;
}
function _genomeOf(id) {
  var def = GENOME_DEFAULTS[id];
  if (!def) return {};
  var live = (typeof S !== 'undefined' && S && S.genome) ? S.genome[id] : null;
  if (!live) return def;
  var out = {};
  Object.keys(def).forEach(function(k){ var v = Number(live[k]); out[k] = isFinite(v) ? _geneClamp(k, v, def[k]) : def[k]; });
  return out;
}
// Archive la version courante (fitness de pointe atteinte), puis nouveau génome = recombinaison avec la meilleure
// version passée du siège + mutation ±mut. Retourne { changed, archived } ou null (siège sans génome).
// [OPÉRATEUR APPRIS · 28/09/2026] op : la source de la naissance — 'R' (défaut : recombinaison + mutation, l'opérateur d'avant, byte-identique,
// même consommation du hasard), 'B' (retour à la meilleure version passée COMPLÈTE et différente de la courante, telle quelle, sans mutation ;
// aucune → R), 'M' (mutation seule de la version courante, sans recombinaison). Retourne aussi op (la source réellement appliquée), pour B la
// pointe de la version reprise, pour R self (rien à prendre de la meilleure version passée : R revient alors à M).
// [OPÉRATEUR APPRIS · 28/09/2026] Pur : dans l'historique (trié par pointe), la meilleure version passée COMPLÈTE (tous les gènes du jeu actuel)
// dont les gènes bornés diffèrent de la courante → { h, next, changed } ou null. Passées : une entrée sans génome ; une version d'un autre jeu de
// gènes (il en manque : gènes ajoutés ou refondus depuis — y revenir serait une remise aux défauts sous une pointe d'une autre logique) ; une
// version égale une fois bornée.
function _genomePastOf(def, cur, sig, hist) {
  for (var i = 0; i < hist.length; i++) {
    var hg = hist[i] && hist[i].g; if (!hg || typeof hg !== 'object' || JSON.stringify(hg) === sig) continue;
    if (Object.keys(def).some(function(k){ return !isFinite(Number(hg[k])); })) continue;   // un autre jeu de gènes : pas une version où revenir
    var cand = {}, ch = 0; Object.keys(def).forEach(function(k){ var v = _geneClamp(k, Number(hg[k]), def[k]); if (v !== cur[k]) ch++; cand[k] = v; });
    if (ch > 0) return { h: hist[i], next: cand, changed: ch };
  }
  return null;
}
// Lecture seule (_evoOpPick) : le siège a-t-il une version passée où revenir ? (même choix que B, sans rien écrire)
function _genomePast(id) {
  var def = GENOME_DEFAULTS[id]; if (!def) return null;
  var hist = (S.genomeHistory && Array.isArray(S.genomeHistory[id])) ? S.genomeHistory[id].slice().sort(function(a, b){ return ((b && b.f) || 0) - ((a && a.f) || 0); }) : [];
  var cur = _genomeOf(id); return _genomePastOf(def, cur, JSON.stringify(cur), hist);
}
function _genomeEvolve(id, mut, fitnessPeak, op) {
  var def = GENOME_DEFAULTS[id]; if (!def) return null;
  if (!S.genome) S.genome = {}; if (!S.genomeHistory) S.genomeHistory = {};
  var cur = _genomeOf(id);
  var hist = Array.isArray(S.genomeHistory[id]) ? S.genomeHistory[id] : (S.genomeHistory[id] = []);
  var sig = JSON.stringify(cur), archived = false;
  if (!hist.some(function(h){ return JSON.stringify(h.g) === sig; })) { hist.push({ g: cur, f: Math.round(Number(fitnessPeak) || 0), t: Date.now() }); archived = true; }
  hist.sort(function(a, b){ return (b.f || 0) - (a.f || 0); });
  if (hist.length > 10) hist.splice(10);
  var best = hist[0].g, next = {}, changed = 0;
  mut = Math.max(0.02, Math.min(0.5, Number(mut) || 0.1));
  op = (op === 'B' || op === 'M') ? op : 'R';
  if (op === 'B') {   // [OPÉRATEUR APPRIS · 28/09/2026] la meilleure version passée dont les gènes bornés diffèrent de la courante, telle quelle
    var past = _genomePastOf(def, cur, sig, hist);
    if (past) { S.genome[id] = past.next; return { changed: past.changed, archived: archived, genes: Object.keys(def).length, op: 'B', peak: past.h.f }; }
    op = 'R';   // aucune version passée où revenir : l'opérateur d'avant (et la naissance est dite R)
  }
  var self = (op === 'R') && !!best && typeof best === 'object' && Object.keys(def).every(function(k){ return !isFinite(best[k]) || best[k] === cur[k]; });   // [OPÉRATEUR APPRIS] R sans rien à prendre de la meilleure version passée (c'est la courante, ou un autre jeu de gènes) : R revient à M ; aucun tirage, rien lu sur un best absent
  Object.keys(def).forEach(function(k){
    var base = (op === 'M') ? cur[k] : ((Math.random() < 0.5) ? cur[k] : (isFinite(best[k]) ? best[k] : cur[k]));   // [OPÉRATEUR APPRIS] M : la version courante seule
    var v = _geneClamp(k, base * (1 + (Math.random() * 2 - 1) * mut), def[k]);
    if (v !== cur[k]) changed++;
    next[k] = v;
  });
  S.genome[id] = next;
  return { changed: changed, archived: archived, genes: Object.keys(def).length, op: op, self: self };
}
// ═══ [GÉNOME DE PAIRE · 17/09/2026] LES PÉRIODES DES INDICATEURS ÉVOLUENT PAR PAIRE ═══
// getTechSignals (08) = 14 indicateurs, 60 % du composite, PARTAGÉS par tous les sièges d'une paire : ses périodes
// (RSI 14, EMA 9/21/50, SMA 10/20/50, stochastique 14, ADX 14) et les poids du mélange étaient en dur, identiques pour
// BTC et PEPE. Elles deviennent le génome DE LA PAIRE : S.pairGenome[pair], muté au rollover (1/jour/paire, 08), même
// mécanique que le génome de siège (archive de la meilleure version + recombinaison + mutation bornée).
const PAIR_GENOME_DEFAULTS = { rsi: 14, stoch: 14, adx: 14, emaFast: 9, emaSlow: 21, emaLong: 50, smaFast: 10, smaSlow: 20, smaLong: 50, wTrend: 1.2, wMomentum: 1.3, wVolatility: 1 };
const PAIR_GENE_INT = { rsi: 1, stoch: 1, adx: 1, emaFast: 1, emaSlow: 1, emaLong: 1, smaFast: 1, smaSlow: 1, smaLong: 1 };
function _pairGeneClamp(k, v, def) {
  if (!isFinite(v)) return def;
  var v2 = Math.max(def / 3, Math.min(def * 3, v));
  if (PAIR_GENE_INT[k]) v2 = Math.max(3, Math.min(60, Math.round(v2)));
  else v2 = Math.max(0.2, Math.min(3, v2));
  return v2;
}
function _pairGenomeOf(pair) {
  var live = (typeof S !== 'undefined' && S && S.pairGenome) ? S.pairGenome[pair] : null;
  if (!live) return PAIR_GENOME_DEFAULTS;
  var out = {};
  Object.keys(PAIR_GENOME_DEFAULTS).forEach(function(k){ var v = Number(live[k]); out[k] = isFinite(v) ? _pairGeneClamp(k, v, PAIR_GENOME_DEFAULTS[k]) : PAIR_GENOME_DEFAULTS[k]; });
  if (out.emaSlow <= out.emaFast) out.emaSlow = out.emaFast + 1;      // un croisement a besoin de deux périodes distinctes
  if (out.smaSlow <= out.smaFast) out.smaSlow = out.smaFast + 1;
  return out;
}
// Archive la version courante avec le P&L net réalisé de la paire au moment de l'archivage (sa « fitness »), puis
// recombine avec la meilleure version passée de CETTE paire + mutation ±mut. Retourne { changed, genes } ou null.
function _pairGenomeEvolve(pair, mut, score) {
  if (!S.pairGenome) S.pairGenome = {}; if (!S.pairGenomeHistory) S.pairGenomeHistory = {};
  var cur = _pairGenomeOf(pair);
  var hist = Array.isArray(S.pairGenomeHistory[pair]) ? S.pairGenomeHistory[pair] : (S.pairGenomeHistory[pair] = []);
  var sig = JSON.stringify(cur);
  if (!hist.some(function(h){ return JSON.stringify(h.g) === sig; })) hist.push({ g: cur, f: Number(score) || 0, t: Date.now() });
  hist.sort(function(a, b){ return (b.f || 0) - (a.f || 0); });
  if (hist.length > 8) hist.splice(8);
  var best = hist[0].g, next = {}, changed = 0;
  mut = Math.max(0.05, Math.min(0.4, Number(mut) || 0.15));
  Object.keys(PAIR_GENOME_DEFAULTS).forEach(function(k){
    var base = (Math.random() < 0.5) ? cur[k] : (isFinite(best[k]) ? best[k] : cur[k]);
    var v = _pairGeneClamp(k, base * (1 + (Math.random() * 2 - 1) * mut), PAIR_GENOME_DEFAULTS[k]);
    if (v !== cur[k]) changed++;
    next[k] = v;
  });
  S.pairGenome[pair] = next;
  return { changed: changed, genes: Object.keys(PAIR_GENOME_DEFAULTS).length };
}
window.PAIR_GENOME_DEFAULTS = PAIR_GENOME_DEFAULTS; window._pairGenomeOf = _pairGenomeOf; window._pairGenomeEvolve = _pairGenomeEvolve;

window.GENOME_DEFAULTS = GENOME_DEFAULTS; window._genomeOf = _genomeOf; window._genomeEvolve = _genomeEvolve; window._genomePast = _genomePast;

function scoutAnalysis(agentId, pair) {
  const ps   = S.pairStates?.[pair];
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(pair) : null;
  if(!ps) return { score:0, conf:0.3, reasoning:'Pas de données' };

  const candles = ps.candles || [];
  const price   = ps.price || 0;
  const G = _genomeOf(agentId);   // [GÉNOME · 16/09/2026] les nombres de CETTE logique — mutables par siège (07)

  switch(agentId) {
    // [S3 · 03/09/2026] macro_v1 / fundamental_v1 NEUTRALISÉS : ils lisaient
    // fundScore (le score qu'ils alimentent) → circularité pure, aucune source externe.
    // Score 0 / conf 0 = ils ne pèsent plus rien et le disent. Ils reprendront vie le
    // jour où Nyx (worker Cloudflare) leur servira un vrai flux macro.
    // [MACRO RÉEL · 26/09/2026] macro_v1 lit ENFIN une donnée réelle : S.macroFeed (07) — Fear & Greed, dominance BTC, cap 24 h.
    // Lecture classique, génomée : peur extrême (< fngLow) → biais acheteur, avidité extrême (> fngHigh) → biais vendeur
    // (contrarien), pondéré par la variation de la capitalisation globale sur 24 h (élan). Plus vieux que 30 min → 0.
    case 'macro_v1': {
      const mf = S.macroFeed, mNow = Date.now();
      if (!mf || !isFinite(mf.fng) || !isFinite(mf.t) || (mNow - mf.t) > 1800000) return { score: 0, conf: 0.3, reasoning: 'En attente du flux macro (Fear & Greed, dominance)' };
      // [DÉGEL DES VOIX · 02/10/2026] chaque source a son heure (07 : tFng, tCap) — avant, feed.t était rafraîchi si l'une OU l'autre répondait ;
      // flux d'avant cette version (sans tFng / tCap) : t. Puis le climat du marché crypto vaut pour LA paire à proportion de sa corrélation à BTC
      // (avant : la même valeur sur les 12 paires, EUR/USDT comprise) ; corrélation inconnue → abstention.
      const fngOk = (mNow - (isFinite(mf.tFng) ? mf.tFng : mf.t)) <= 1800000, capOk = isFinite(mf.cap24h) && (mNow - (isFinite(mf.tCap) ? mf.tCap : mf.t)) <= 1800000;
      if (!fngOk && !capOk) return { score: 0, conf: 0.3, reasoning: 'En attente du flux macro (Fear & Greed, dominance)' };
      const rho = _btcRho(pair);
      if (rho === null) return { score: 0, conf: 0.3, reasoning: 'Macro : corrélation à BTC inconnue' };
      const fngS = !fngOk ? 0 : mf.fng < G.fngLow ? (G.fngLow - mf.fng) / G.fngLow : mf.fng > G.fngHigh ? -(mf.fng - G.fngHigh) / (100 - G.fngHigh) : 0;
      const capS = capOk ? Math.max(-1, Math.min(1, mf.cap24h / G.capScale)) : 0;
      const sc = Math.max(-1, Math.min(1, fngS * G.wFng + capS * G.wCap)) * Math.max(0, Math.min(1, rho));
      return { score: sc, conf: 0.6, reasoning: (fngOk ? `Fear & Greed ${Math.round(mf.fng)} (${mf.fngLabel || ''})` : 'Fear & Greed en attente') + (capOk ? ` · cap globale ${mf.cap24h >= 0 ? '+' : ''}${mf.cap24h.toFixed(1)} % 24 h` : '') + (isFinite(mf.btcDominance) ? ` · dominance BTC ${mf.btcDominance.toFixed(1)} %` : '') + ` · corrélation à BTC ${rho.toFixed(2)}` };
    }
    // [POSITIONNEMENT · 26/09/2026] fundamental_v1 lit S.positioning (02) : financement (longs surpeuplés → biais vendeur, contrarien),
    // open interest sur 2 h dans le sens du prix (des positions s'ouvrent avec le mouvement → confirmation), ratio long/short des
    // comptes (foule longue → contrarien). Génomé. Sans flux ou flux de plus de 30 min → 0.
    case 'fundamental_v1': {
      const pf = S.positioning && S.positioning[pair];
      if (!pf || !isFinite(pf.t) || (Date.now() - pf.t) > 1800000) return { score: 0, conf: 0.3, reasoning: 'En attente du flux positionnement (financement, open interest)' };
      let sc = 0, parts = [];
      const num = v => typeof v === 'number' && isFinite(v);   // isFinite(null) vaut TRUE en JS : le flux met null quand une réponse manque
      if (num(pf.funding)) { const f = Math.max(-1, Math.min(1, -(pf.funding - FUND_BASE_PCT) / G.fundScale)); sc += f * G.wF; parts.push(`financement ${pf.funding >= 0 ? '+' : ''}${pf.funding.toFixed(3)} %`); }   // [DÉGEL DES VOIX · 02/10/2026] mesuré à partir du taux de base de Binance (+0,01 %/8 h), plus de 0 (−0,066 constant partout)
      if (num(pf.oiChg2h)) {
        const c2 = candles.length >= 9 ? Math.sign(candles[candles.length - 1].c - candles[candles.length - 9].c) : 0;
        const o = Math.max(-1, Math.min(1, pf.oiChg2h / G.oiScale)) * c2; sc += o * G.wOi; parts.push(`OI ${pf.oiChg2h >= 0 ? '+' : ''}${pf.oiChg2h.toFixed(1)} % 2 h`);
      }
      if (num(pf.lsRatio)) { const l = pf.lsRatio > G.lsHigh ? -Math.min(1, (pf.lsRatio - G.lsHigh) / G.lsHigh) : pf.lsRatio < G.lsLow ? Math.min(1, (G.lsLow - pf.lsRatio) / G.lsLow) : 0; sc += l * G.wLs; parts.push(`long/short ${pf.lsRatio.toFixed(2)}`); }
      return { score: Math.max(-1, Math.min(1, sc)), conf: 0.6, reasoning: parts.join(' · ') || 'Positionnement sans lecture' };
    }
    // [P7 · 06/09/2026] nlp_v1 RAVIVÉ sur une source RÉELLE : signal news par paire (10e7, CoinStats,
    // 24 h glissantes, ≥ 5 articles scorés). Sans clé / sans volume → 0 / 0 avec le vrai motif.
    case 'nlp_v1': {
      const ns = (typeof _newsPairSignal === 'function') ? _newsPairSignal(pair) : null;
      if(!ns) {
        const alive = (typeof _newsSourceAlive === 'function') && _newsSourceAlive();
        return { score: 0, conf: 0, reasoning: alive ? 'News : moins de 5 articles scorés sur 24 h — neutre' : 'News : source inactive (clé CoinStats absente ou flux hors service)' };
      }
      // [DÉGEL DES VOIX · 02/10/2026] le ton des news de LA paire comparé à celui de TOUTES les news (10e7 _newsGlobal) : la liste de mots juge la
      // plupart des titres haussiers (92 % d'achats du 27 au 29/09) — l'écart retire ce biais commun et le ton général du marché (lu par macro_v1).
      // Ton global non mesurable → abstention (défensif : le ton global contient les articles de la paire, il est mesurable dès que celui de la paire l'est).
      const ng = (typeof _newsGlobal === 'function') ? _newsGlobal() : null;
      if (!ng || typeof ng.score !== 'number' || !isFinite(ng.score)) return { score: 0, conf: 0, reasoning: 'News : ton global non mesurable — neutre' };
      const sc = Math.max(-1, Math.min(1, (ns.score - ng.score) / 50));
      return { score: sc, conf: Math.min(0.7, 0.3 + ns.nScored * 0.04), reasoning: `News 24 h ${ns.label} (${ns.score}/100 contre ${ng.score}/100 toutes paires, ${ns.nScored} art. scorés)` };
    }
    case 'sentiment_v2': {
      // v6.7: Real sentiment — price momentum + RSI bias as social proxy
      const candles2 = ps?.candles || [];
      if(candles2.length < 5) return { score:0, conf:0.4, reasoning:'Données insuffisantes' };
      const closes = candles2.slice(-G.win).map(x=>x.c);
      const momentum = closes.length > 1 ? (closes[closes.length-1] - closes[0]) / closes[0] : 0;
      const rsi = _techRsi(tech);   // [DÉGEL DES VOIX · 02/10/2026] raw.rsi.value (avant : toujours 50)
      // RSI>65 = euphorie, RSI<35 = panique
      const rsiSent = rsi > G.rsiHigh ? (rsi-G.rsiHigh)/35 : rsi < G.rsiLow ? -(G.rsiLow-rsi)/35 : 0;
      const rawScore = Math.max(-1, Math.min(1, momentum*G.momGain + rsiSent*G.rsiW + (tech?.atScore||0)*G.atW));
      return {
        score: rawScore,
        conf: G.conf,
        reasoning: rawScore > 0.4 ? `Euphorie (RSI ${rsi.toFixed(0)}, mom+)` : rawScore < -0.4 ? `Panique (RSI ${rsi.toFixed(0)})` : `Sentiment neutre (RSI ${rsi.toFixed(0)})`
      };
    }
    case 'volume_v1': {
      // [FLUX BINANCE · 17/09/2026] VOLUME RÉEL des klines (v, depuis 1b-b) : G.recentN dernières bougies vs les G.histN
      // précédentes — plus les amplitudes h−l comme proxy. Direction : le prix sur G.lookback bougies.
      if(candles.length < Math.max(10, G.recentN + G.histN)) return { score:0, conf:0.3, reasoning:'En observation' };
      // [DÉGEL DES VOIX · 02/10/2026] une bougie redemandée à Binance (REST, _r : volume en monnaie de base) et une bougie du flux (nombre de messages,
      // au plus 4 par seconde) ne se comparent pas : fenêtre mêlée → abstention (5 h en 15 min après une réparation de série). La bougie en cours reste
      // comptée, comme avant : la retirer coupait une voix dont le bilan mesuré est positif (rejeu et backup du 29/09, voir la section DÉGEL DES VOIX).
      const vwin = candles.slice(-(G.recentN + G.histN));
      if (vwin.some(cd => cd && cd._r) && vwin.some(cd => !(cd && cd._r))) return { score: 0, conf: 0.3, reasoning: 'Volume : deux sources dans la fenêtre (bougies redemandées à Binance et bougies du flux) — en attente' };
      const vol = candles.map(cd => Number(cd.v) || 0);
      if (!vol.some(v => v > 0)) return { score:0, conf:0.3, reasoning:'En attente du volume Binance' };
      const recentVol = vol.slice(-G.recentN).reduce((a,b)=>a+b,0) / G.recentN;
      const histVol   = vol.slice(-(G.recentN + G.histN), -G.recentN).reduce((a,b)=>a+b,0) / G.histN;
      const ratio = histVol > 0 ? recentVol / histVol : 1;
      const priceUp = candles[candles.length-1].c > candles[Math.max(0, candles.length-G.lookback)].c;
      if(ratio > G.spike) {
        return { score: priceUp ? +G.spikeScore : -G.spikeScore, conf:0.75,
                 reasoning:`Pic de volume ×${ratio.toFixed(1)} sur ${G.recentN} bougies — ${priceUp?'accumulation':'distribution'}` };
      } else if(ratio < G.low) {
        return { score:0, conf:0.5, reasoning:`Volume faible (×${ratio.toFixed(2)}) — marché indécis` };
      } else {
        const score = priceUp ? Math.min(G.maxScore, (ratio-1)*G.slope) : -Math.min(G.maxScore, (ratio-1)*G.slope);
        return { score, conf:0.62, reasoning:`Volume normal (×${ratio.toFixed(2)}), tendance ${priceUp?'haussière':'baissière'}` };
      }
    }
        case 'volatility_v1': {
      // v6.7: Volatility regime → directional bias
      const cv  = tech?.raw?.stddev?.cv || 0.015;
      const adx = tech?.raw?.adx?.adx || 20;
      const at  = tech?.atScore || 0;
      // High ADX + trending = follow the trend
      if(adx > G.adxStrong) return { score: at * G.wStrong, conf:0.80, reasoning:`Tendance forte (ADX ${adx.toFixed(0)}) · ${at>0?'haussier':'baissier'}` };
      if(cv > G.cvHigh) return { score: at * G.wHigh, conf:0.70, reasoning:`Vol élevée (${(cv*100).toFixed(1)}%) — suivre AT` };
      if(cv < G.cvLow) {
        // Compression = breakout imminent, bias toward last price action
        return { score: at * G.wLow, conf:0.60, reasoning:`Compression vol · breakout probable` };
      }
      // Normal regime — moderate confidence in AT signal
      return { score: at * G.wNormal, conf:0.65, reasoning:`Régime normal (cv${(cv*100).toFixed(1)}%, ADX${adx.toFixed(0)})` };
    }

    case 'corr_v1': {
      // Detect divergence from market leaders
      const leaderScore = (S.pairStates['BTC/USDT']?.candles?.slice(-G.win).reduce((s,c,i,a)=>i>0?s+Math.sign(c.c-a[i-1].c):s,0)) || 0;
      // [DÉGEL DES VOIX · 02/10/2026] la lecture de BTC vaut pour LA paire à proportion de sa corrélation à BTC — avant, le même vote sur toutes les
      // paires, EUR/USDT comprise. Corrélation inconnue, nulle ou négative → abstention ; en EV / RE, série de BTC périmée ou trouée → abstention
      // (ses bougies projetées ne sont plus à jour).
      try { if (pair !== 'BTC/USDT' && (S.tradingMode === 'paperReal' || S.tradingMode === 'real') && typeof _realCandlesStale === 'function' && _realCandlesStale('BTC/USDT', (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m')) return { score: 0, conf: 0.3, reasoning: 'Bougies de BTC en attente' }; } catch (e) {}
      const rho = _btcRho(pair);
      if (rho === null) return { score: 0, conf: 0.3, reasoning: 'Corrélation à BTC inconnue' };
      return {
        score: Math.max(-1, Math.min(1, leaderScore * G.gain)) * Math.max(0, Math.min(1, rho)),
        conf: 0.6,
        reasoning: (leaderScore > 2 ? 'BTC mène la hausse' : leaderScore < -2 ? 'BTC mène la baisse' : 'BTC sans direction nette') + ' · corrélation à BTC ' + rho.toFixed(2)
      };
    }
    case 'geopolitic_v1': {
      // [CONTEXTE 1 H / 4 H · 26/09/2026] lot 4 des sources (Rams « Go 4 ») — le siège « Géopolitique » lisait la volatilité de la
      // bougie 15 min (déjà lue par volatility_v1 et security_v1) et le score fondamental (circulaire). Il lit désormais les horizons
      // SUPÉRIEURS : tendance 1 h et 4 h (EMA courte − EMA longue et pente de la longue, en unités d'ATR : sans échelle, 02
      // _ctxHorizonRead), pondérées w1h / w4h ; horizons alignés → score renforcé (agree), en conflit → amorti (disagree) ; un seul
      // horizon lisible → sa seule part, l'autre compte pour neutre. Sans série vraie (courte, périmée, trouée de dojis de coupure) :
      // neutre, faible confiance, motif affiché — jamais un chiffre inventé.
      if (typeof _ctxHorizonRead !== 'function') return { score:0, conf:0.3, reasoning:'En attente des bougies 1 h / 4 h' };
      const _cNow = Date.now(), h1 = _ctxHorizonRead(pair, '1h', G, _cNow), h4 = _ctxHorizonRead(pair, '4h', G, _cNow);
      const ok1 = !!(h1 && h1.ok), ok4 = !!(h4 && h4.ok);
      const why = h => (h && h.why) || '?';
      if (!ok1 && !ok4) return { score:0, conf:0.3, reasoning:`En attente des bougies 1 h / 4 h (${why(h1)} / ${why(h4)})` };
      const lab = (tf, h) => `${tf} ${h.t > 0.05 ? '▲' : h.t < -0.05 ? '▼' : '▬'} ${h.t >= 0 ? '+' : ''}${h.t.toFixed(2)}`;
      if (ok1 && ok4) {
        let sc = h1.t * G.w1h + h4.t * G.w4h, cf = 0.55, tail = 'contexte calme';
        const strong = Math.abs(h1.t) > 0.2 && Math.abs(h4.t) > 0.2;
        if (strong && Math.sign(h1.t) === Math.sign(h4.t)) { sc *= (1 + G.agree); cf = 0.7; tail = 'horizons alignés'; }
        else if (strong) { sc *= (1 - G.disagree); cf = 0.45; tail = 'horizons en conflit'; }
        return { score: Math.max(-1, Math.min(1, sc)), conf: cf, reasoning: `${lab('1 h', h1)} · ${lab('4 h', h4)} · ${tail}` };
      }
      const h = ok1 ? h1 : h4, w = ok1 ? G.w1h : G.w4h;
      return { score: Math.max(-1, Math.min(1, h.t * w)), conf: 0.5,
               reasoning: ok1 ? `${lab('1 h', h1)} · 4 h en attente (${why(h4)})` : `1 h en attente (${why(h1)}) · ${lab('4 h', h4)}` };
    }
    case 'onchain_v1': {
      // v6.7: On-chain proxy via candle efficiency (body/range ratio)
      const candles2 = ps?.candles || [];
      if(candles2.length < 10) return { score:0, conf:0.4, reasoning:'Données insuffisantes' };
      let accum = 0;
      candles2.slice(-G.win).forEach(cd => {
        const body  = Math.abs(cd.c - cd.o);
        const range = (cd.h - cd.l) || 0.0001;
        accum += (cd.c > cd.o ? 1 : -1) * (body / range);
      });
      const rawScore = Math.max(-1, Math.min(1, accum / G.win));
      return {
        score: rawScore,
        conf: 0.70,
        reasoning: rawScore > 0.15 ? 'Accumulation on-chain (corps haussiers)' : rawScore < -0.15 ? 'Distribution (corps baissiers)' : 'Flux on-chain neutres'
      };
    }
    case 'whale_v1': {
      // [FLUX BINANCE · 17/09/2026] GROS TRADES RÉELS (flux @trade, 02 _recordTrade) + MURS DU CARNET — plus les « gros
      // corps de bougie ». Fenêtre G.avgN minutes ; un gros trade = notionnel > 8 × le notionnel moyen de la paire.
      const fw = (typeof _flowSummary === 'function') ? _flowSummary(pair, G.avgN) : null;
      if (!fw || fw.minutes < 2) return { score:0, conf:0.3, reasoning:'En attente du flux Binance' };
      const ob = (S.orderBook && S.orderBook[pair] && (Date.now() - S.orderBook[pair].t) < 180000) ? S.orderBook[pair] : null;
      const bigN = fw.bigBuy + fw.bigSell;
      let sc = 0, why = 'Aucun gros ordre (' + fw.n + ' trades/' + fw.minutes + ' min)';
      if (bigN > 0) {
        const ratio = Math.max(fw.bigBuyUsd, fw.bigSellUsd) / Math.max(1, Math.min(fw.bigBuyUsd, fw.bigSellUsd));
        const mag = ratio > G.big ? G.bigScore : ratio > G.mid ? G.midScore : Math.abs(fw.bigNet) * G.midScore;
        sc = fw.bigNet >= 0 ? mag : -mag;
        why = (fw.bigNet >= 0 ? 'Gros acheteurs' : 'Gros vendeurs') + ' : ' + fw.bigBuy + ' achats / ' + fw.bigSell + ' ventes > 8× moyenne';
      }
      if (ob) {
        if (ob.bidWall && !ob.askWall) { sc += 0.15; why += ' · mur d\'achat à ' + ob.bidWall.p; }
        else if (ob.askWall && !ob.bidWall) { sc -= 0.15; why += ' · mur de vente à ' + ob.askWall.p; }
      }
      // [LIQUIDATIONS · 26/09/2026] les liquidations forcées sont des ordres de baleine que personne n'a voulus : des shorts
      // liquidés = achats forcés (squeeze haussier, +), des longs liquidés = ventes forcées (capitulation, −). Poids G.wLiq.
      const lq = (typeof _liqSummary === 'function') ? _liqSummary(pair, G.avgN) : null;
      if (lq && lq.n > 0 && (lq.longUsd + lq.shortUsd) >= G.liqMinUsd) {
        sc += lq.net * G.wLiq;
        why += ' · liquidations ' + Math.round((lq.longUsd + lq.shortUsd) / 1000) + ' k$ (' + (lq.net >= 0 ? 'shorts' : 'longs') + ' ' + Math.round(Math.abs(lq.net) * 100) + ' %)';
      }
      return { score: Math.max(-1, Math.min(1, sc)), conf: bigN > 0 ? 0.80 : 0.5, reasoning: why };
    }
    case 'breakout_v1': {
      if(candles.length < G.win) return { score:0, conf:0.3, reasoning:'Structure en construction' };
      const recent20 = candles.slice(-G.win);
      const high = Math.max(...recent20.slice(0,-2).map(c=>c.h||c.c));
      const low  = Math.min(...recent20.slice(0,-2).map(c=>c.l||c.c));
      if(price > high * (1 + G.margin)) return { score:+G.score, conf:0.78, reasoning:`Breakout haut cassé (${high.toFixed(2)})` };
      if(price < low  * (1 - G.margin)) return { score:-G.score, conf:0.78, reasoning:`Breakout bas cassé (${low.toFixed(2)})` };
      const range = (price - low) / Math.max(0.001, high - low);
      return { score: 0, conf: 0.5, reasoning: `Dans la range (${(range*100).toFixed(0)}%)` };
    }
    case 'harmonic_v1': {
      const r = typeof detectHarmonicResonance === 'function' ? detectHarmonicResonance(pair) : null;
      if(!r) return { score:0, conf:0.3, reasoning:'Analyse en cours' };
      const dir = r.direction === 'bullish' ? +1 : r.direction === 'bearish' ? -1 : 0;
      return {
        score: dir * r.strength,
        conf: r.strength,
        reasoning: r.isResonance ? `${r.bullCount > r.bearCount ? r.bullCount : r.bearCount}/5 indicateurs alignés` : `Alignement ${(r.strength*100).toFixed(0)}%`
      };
    }
    case 'flow_v1': {
      // [FLUX BINANCE · 17/09/2026] FLUX D'ORDRES RÉEL : quantité prise par les acheteurs vs les vendeurs (côté preneur du
      // @trade) sur G.win minutes, + déséquilibre du carnet (20 niveaux) — plus le comptage des bougies vertes.
      const fw = (typeof _flowSummary === 'function') ? _flowSummary(pair, G.win) : null;
      if (!fw || fw.minutes < 2 || fw.n < 10) return { score:0, conf:0.3, reasoning:'En attente du flux Binance' };
      const ob = (S.orderBook && S.orderBook[pair] && (Date.now() - S.orderBook[pair].t) < 180000) ? S.orderBook[pair] : null;
      const netFlow = ob ? (fw.imb * 0.7 + ob.imb * 0.3) : fw.imb;
      const pct = Math.round((fw.buyQ / Math.max(1e-12, fw.buyQ + fw.sellQ)) * 100);
      return {
        score: Math.max(-1, Math.min(1, netFlow * G.gain)),
        conf: 0.72,
        reasoning: netFlow > 0.3 ? `Flux acheteur dominant (${pct} % pris à l'achat, ${fw.n} trades/${fw.minutes} min)` : netFlow < -0.3 ? `Flux vendeur dominant (${100 - pct} % pris à la vente, ${fw.n} trades/${fw.minutes} min)` : `Flux équilibré (${pct} % achat` + (ob ? `, carnet ${ob.imb >= 0 ? '+' : ''}${(ob.imb * 100).toFixed(0)} %` : '') + ')'
      };
    }
  }
  return { score: 0, conf: 0.3, reasoning: 'Agent en veille' };
}

// ── COUNCIL ANALYZERS (7 voters, consult scouts) ──
function councilVote(councilId, pair, scoutResults) {
  const advisors = COUNCIL_ADVISORS[councilId] || [];
  // Gather scout inputs
  const advice = advisors.map(sId => scoutResults[sId]).filter(Boolean);
  const adviceScore = advice.length > 0
    ? advice.reduce((s,a) => s + a.score * a.conf, 0) / advice.reduce((s,a) => s + a.conf, 0)
    : 0;

  const ps = S.pairStates?.[pair];
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const lmsr = ps && typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
  const at   = tech?.atScore || 0;
  const rsi  = _techRsi(tech);   // [DÉGEL DES VOIX · 02/10/2026] raw.rsi.value (avant : toujours 50 — contrarian_v2 ne parlait jamais)
  const macd = tech?.raw?.macd?.hist || 0;
  const adx  = tech?.raw?.adx?.adx || 20;

  const G = _genomeOf(councilId);   // [GÉNOME · 16/09/2026]
  let ownScore = 0, ownQuote = '';

  switch(councilId) {
    case 'scalper_v2':
      ownScore = (lmsr - 0.5) * G.gain;
      ownQuote = ownScore > 0.2 ? `Push court, LMSR ${(lmsr*100).toFixed(0)}%. Long scalp.` : ownScore < -0.2 ? `Pression vendeuse. Short rapide.` : `Pas de momentum net.`;
      break;
    case 'swing_v2':
      ownScore = macd > 0 && at > G.atMin ? G.score : macd < 0 && at < -G.atMin ? -G.score : 0;
      ownQuote = ownScore > 0 ? `MACD+${macd.toFixed(3)}, structure 1h-4h haussière.` : ownScore < 0 ? `MACD négatif, cycle baissier.` : `MACD neutre, j'attends.`;
      break;
    case 'contrarian_v2':
      if(rsi > G.rsiHigh)      { ownScore = -G.score; ownQuote = `RSI ${rsi.toFixed(0)} surchauffe. Je fade.`; }
      else if(rsi < G.rsiLow) { ownScore = +G.score; ownQuote = `RSI ${rsi.toFixed(0)} capitulation. J'achète.`; }
      else              { ownScore = 0; ownQuote = `Pas d'extrême à fader.`; }
      break;
    case 'trend_v2':
      if(adx > G.adxMin && at > G.atMin)       { ownScore = +G.score; ownQuote = `ADX ${adx.toFixed(0)}, tendance claire. Long.`; }
      else if(adx > G.adxMin && at < -G.atMin) { ownScore = -G.score; ownQuote = `Tendance baissière confirmée.`; }
      else                             { ownScore = 0;   ownQuote = `Pas de tendance (ADX ${adx.toFixed(0)}).`; }
      break;
    case 'hedge_v2':
      const cv = tech?.raw?.stddev?.cv || 0.015;
      if(cv > G.cvMax)               { ownScore = 0; ownQuote = `Volatilité élevée (${(cv*100).toFixed(1)}%). On attend.`; }
      else if(adviceScore > G.adviceMin)   { ownScore = G.score; ownQuote = `Signaux alignés, vol contenue. Entrée raisonnable.`; }
      else if(adviceScore < -G.adviceMin)  { ownScore = -G.score; ownQuote = `Signaux baissiers + macro. Short prudent.`; }
      else                         { ownScore = 0; ownQuote = `Conviction insuffisante.`; }
      break;
    case 'momentum_v1':
      ownScore = at * G.gain;
      ownQuote = at > 0.2 ? `Momentum positif fort (AT ${at.toFixed(2)}).` : at < -0.2 ? `Momentum négatif (AT ${at.toFixed(2)}).` : `Momentum faible.`;
      break;
    case 'mean_rev_v1':
      const bb = _techBollPct(tech);   // [DÉGEL DES VOIX · 02/10/2026] raw.boll.pct (avant : toujours 0,5 — mean_rev_v1 ne parlait jamais)
      if(bb > G.bbHigh)      { ownScore = -G.score; ownQuote = `Sur la borne haute Boll, retour à la moyenne.`; }
      else if(bb < G.bbLow) { ownScore = +G.score; ownQuote = `Sur la borne basse, rebond probable.`; }
      else              { ownScore = 0;    ownQuote = `Proche de la moyenne, pas d'edge.`; }
      break;
  }

  // Blend own analysis (60%) with advisors (40%)
  const finalScore = ownScore * G.ownW + adviceScore * (1 - G.ownW);
  const vote = finalScore > G.voteThr ? 'long' : finalScore < -G.voteThr ? 'short' : 'hold';

  return {
    vote,
    score: finalScore,
    quote: ownQuote,
    advisors: advisors.map(sId => ({
      id: sId,
      score: scoutResults[sId]?.score || 0,
      emoji: (S.agents || []).find(a => a.id === sId)?.emoji || '·'
    }))
  };
}

// ── GUARDIAN CHECKS (3 vetoers) ──
function guardianCheck(guardianId, verdict, pair, stake) {
  switch(guardianId) {
    case 'risk_bot_v1': {
      // [POLITIQUE CAPITAL · 08/08/2026] L'ancienne formule jugeait (cumul + stake)/portfolio :
      // avec la politique capital (Rams 06/07, quasi-totalité du compte investie), TOUT stake
      // conforme pesait 68-83% du portfolio → veto permanent (29/30 vetos au brainLog, plus
      // aucune ouverture AUTO). Même contradiction que le seuil « compte < 20$ » déjà corrigé
      // dans 09c. La garde protège désormais ce qu'elle doit protéger : le CUMUL de positions
      // déjà ouvertes (bot + manuelles) avant d'en AJOUTER une. Le stake unitaire, lui, reste
      // contrôlé par la politique capital (résiduel), validateAntiNegative (SL provisionné)
      // et le plafond du compte trading — vérifiés à chaque ouverture dans 09c.
      const totalExp = (S.openPositions || []).reduce((s,p) => s + (p.stakeUsdt || 0), 0);
      const portfolio = S.portfolio || 1;
      const expPct = totalExp / portfolio * 100;
      if(expPct > 65) {
        // [ÉCONOMIE BOTS · 15/08/2026] mérite du veto : mémorisé (paire, side, prix, ts) ;
        // _riskVetoAudit juge 30 min plus tard si le trade refusé aurait perdu → crédit.
        // [MÉRITE DES BOTS · 26/09/2026] ce relevé n'a JAMAIS fonctionné : `side` n'existe pas ici (ReferenceError avalée par le try) — aucun
        // veto n'a été audité depuis le 15/08. Le côté refusé est celui du verdict du conseil ; le veto prédit que ce trade aurait
        // perdu, donc que le prix ira CONTRE ce côté — jugé par _botMeritAudit dès que le marché tranche ([SURVEILLANCE PERMANENTE · 27/09/2026] ±1 ATR).
        try {
          const _vs = verdict === 'LONG' ? 'long' : verdict === 'SHORT' ? 'short' : null;
          if (_vs && typeof _botPredict === 'function') _botPredict('risk_bot_v1', pair, _vs === 'long' ? 'short' : 'long', 'veto');
        } catch(e) {}
        return { status:'veto', reasoning:`Cumul positions ${expPct.toFixed(0)}% > 65% du portfolio. Pas d'ajout.` };
      }
      if(expPct > 50) return { status:'warn', reasoning:`Cumul positions élevé (${expPct.toFixed(0)}%). Attention.` };
      return { status:'approve', reasoning:`Cumul positions OK (${expPct.toFixed(0)}%).` };
    }
    case 'security_v1': {
      const ps = S.pairStates?.[pair];
      const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
      const cv = tech?.raw?.stddev?.cv || 0.015;
      const G = _genomeOf('security_v1');   // [GÉNOME · 16/09/2026]
      if(cv > G.cvVeto) return { status:'veto', reasoning:`Volatilité anormale (${(cv*100).toFixed(1)}%). Pause.` };
      if(cv > G.cvWarn) return { status:'warn', reasoning:'Volatilité élevée.' };
      return { status:'approve', reasoning:'Marché stable.' };
    }
    case 'evolver_v1': {
      // v5.9 — Learning from archives + groupthink detection
      const archiveCount = (S.archives?.snapshots || []).length;
      // [DÉGEL DES VOIX · 02/10/2026] les 5 derniers trades DU SYSTÈME (heure de clôture) — avant : les 5 derniers de CHAQUE paire (jusqu'à 60) ;
      // « 4 perdants » était presque toujours vrai : alerte permanente, −0,2 sur toutes les paires (lu par la sortie « signal inversé », 10f)
      const recentTradesPnl = Object.values(S.pairStates || {})
        .flatMap(p => (p.trades || []).filter(t => t && t.type === 'position' && t.pnlUsdt != null))
        .sort((a, b) => (Number(a.ts) || 0) - (Number(b.ts) || 0))
        .slice(-5)
        .map(t => t.pnlUsdt);
      const recentLosses = recentTradesPnl.filter(p => p < 0).length;
      if(recentLosses >= 4 && recentTradesPnl.length >= 5) {
        return { status:'warn', reasoning:`${recentLosses}/5 derniers trades perdants. ${archiveCount > 0 ? archiveCount + ' archives consultées. ' : ''}Recalibration suggérée.` };
      }
      return { status:'approve', reasoning: archiveCount > 0 ? `Système en bonne santé · ${archiveCount} archives en mémoire` : 'Système en bonne santé' };
    }
  }
  return { status:'approve', reasoning:'OK' };
}

// ── ORCHESTRATOR ──
// ═══ [POIDS PAR ATTRIBUTION · 16/09/2026] point 4 du conseil « évolution à l'infini » (Rams 16/09) ═══
// Le poids d'un siège dans le consensus d'une paire = fitness glissante globale (base) × compétence sur CETTE paire
// (agentPairSkill w/l) × compétence dans le RÉGIME courant (regimeFitness wins/total, votes alignés). Continu et
// bayésien léger : f = 0,5 + (succès + 5) / (total + 10) → 1,0 sans historique, 1,2 à 30/10, 0,8 à 10/30, 1,25 à
// 40/50 ; un petit échantillon tire vers le neutre. Les paliers ×1,3 / ×0,6 (corrections/errors) et ×1,25 / ×0,75
// (paire) sont remplacés. ps.roster.weights garde la décomposition par siège (RAM) : l'attribution est lisible.
function _attributionFactor(id, pair, regime) {
  const sk = S.agentPairSkill && S.agentPairSkill[id] && S.agentPairSkill[id][pair];
  const w = sk ? (Number(sk.w) || 0) : 0, l = sk ? (Number(sk.l) || 0) : 0;
  const pairF = 0.5 + (w + 5) / (w + l + 10);
  let regF = 1;
  const a = (S.agents || []).find(x => x.id === id);
  const rf = (a && a.regimeFitness && regime) ? a.regimeFitness[regime] : null;
  if (rf) { const rw = Number(rf.wins) || 0, rt = Number(rf.total) || 0; regF = 0.5 + (rw + 5) / (rt + 10); }
  return { pairF, regF, regime: regime || null };
}
window._attributionFactor = _attributionFactor;

function runRosterAnalysis(pair) {
  pair = pair || S.activePair || (Object.keys(S.pairStates || {})[0]) || 'BTC/USDT';
  // Run all scouts
  const scoutResults = {};
  ROSTER_TIERS.scouts.forEach(sId => {
    scoutResults[sId] = scoutAnalysis(sId, pair);
  });
  // Run all council members
  const councilResults = {};
  ROSTER_TIERS.council.forEach(cId => {
    councilResults[cId] = councilVote(cId, pair, scoutResults);
  });
  // Tally votes — v7.12 MOD 7 : pondération par fitness
  // Les agents historiquement bons pèsent plus lourd. Les mauvais chroniques pèsent moins.
  let longVotes = 0, shortVotes = 0, holdVotes = 0;
  let longConv = 0, shortConv = 0;
  let longWeighted = 0, shortWeighted = 0, holdWeighted = 0;  // MOD 7
  let totalWeight = 0;
  let _skillWeighted = 0;   // [13/08] nb d'agents dont le vote a été modulé par leur compétence sur la paire
  const _weights = {};      // [POIDS PAR ATTRIBUTION · 16/09/2026] décomposition du poids par siège → ps.roster.weights
  let _regimeNow = null; try { _regimeNow = (typeof detectMarketRegime === 'function') ? detectMarketRegime() : null; } catch(e) {}
  
  Object.entries(councilResults).forEach(([cId, v]) => {
    // Compute weight from fitness: fitness 500 = weight 1.0, 1000 = 1.5, 1500 = 2.0, 1900+ = 2.5
    let weight = 1.0;
    const agent = (S.agents || []).find(a => a.id === cId);
    if (agent && typeof agent.fitness === 'number') {
      weight = 0.5 + (Math.max(50, Math.min(2000, agent.fitness)) / 1000);
      if (agent._probationUntil && (S.cycle || 0) < agent._probationUntil) weight *= 0.5;   // [GÉNOME · 16/09/2026] probation : un nouveau-né pèse moitié pendant 30 résolutions
      // Penalize agents on a bad losing streak (3+ consecutive errors)
      if (agent.streak !== undefined && agent.streak <= -3) {
        weight *= 0.5;  // losing streak = half weight
      }
      // [POIDS PAR ATTRIBUTION · 16/09/2026] compétence sur CETTE paire × compétence dans CE régime, en continu
      // (remplace les paliers corrections/errors ×1,3/×0,6 — redondants avec la fitness glissante — et paire ×1,25/×0,75).
      try {
        const _pf = _attributionFactor(cId, pair, _regimeNow);
        weight *= _pf.pairF * _pf.regF;
        if (_pf.pairF !== 1 || _pf.regF !== 1) _skillWeighted++;
        _weights[cId] = { w: +weight.toFixed(3), base: +(0.5 + (Math.max(50, Math.min(2000, agent.fitness)) / 1000)).toFixed(3), pairF: +_pf.pairF.toFixed(3), regF: +_pf.regF.toFixed(3) };
      } catch(e) {}
    }
    totalWeight += weight;
    
    if(v.vote === 'long')       { longVotes++;  longConv  += Math.abs(v.score); longWeighted  += weight; }
    else if(v.vote === 'short') { shortVotes++; shortConv += Math.abs(v.score); shortWeighted += weight; }
    else                        { holdVotes++;                                  holdWeighted  += weight; }
  });
  const totalVotes = ROSTER_TIERS.council.length;
  
  // v7.12 MOD 7 : décision basée sur votes PONDÉRÉS (pas juste majorité simple)
  const verdict = longWeighted > shortWeighted && longWeighted > holdWeighted ? 'LONG'
                : shortWeighted > longWeighted && shortWeighted > holdWeighted ? 'SHORT'
                : 'HOLD';
  const winWeighted = Math.max(longWeighted, shortWeighted, holdWeighted);
  const consensus = totalWeight > 0 ? winWeighted / totalWeight : 0;
  // Coalition : 4+ votes ET consensus pondéré > 55%
  const coalition = ((longVotes >= 4 || shortVotes >= 4) && consensus >= 0.55);
  // Run guardians
  const guardianResults = {};
  let anyVeto = false;
  ROSTER_TIERS.guardians.forEach(gId => {
    guardianResults[gId] = guardianCheck(gId, verdict, pair, (S.tradingAccount || 100) * 0.1);
    if(guardianResults[gId].status === 'veto') anyVeto = true;
  });
  // [PHASE 1 · 12/09/2026] VOTE PAR PAIRE — le roster n'écrit plus a.score des agents de signal.
  // a.score est un scalaire GLOBAL : chaque appel (rotation 08, paire active, cascade 03, brain
  // gate 09c) l'écrasait avec l'avis sur la DERNIÈRE paire analysée, et 10f le lisait comme le
  // « consensus sur LA paire résolue » (50 % du signal final) → bruit corrélé, pas un vote.
  // Le vote de chaque agent est publié dans ps.roster.votes de LA paire (RAM seulement : 09b1
  // liste les champs de ps sauvegardés, roster n'en est pas), avec les MÊMES valeurs qu'avant :
  // scout = score, conseil = ±magnitude (hold = 0), gardien = 0 — un statut, pas un sens (avant le DÉGEL DES VOIX · 02/10/2026 : −0.5 veto / −0.2 warn / +0.05 ok) ;
  // agent muet (S.mutedAgents) = 0. Lecteurs : 10f (consensus, mémoire), learnFromOutcome
  // (aligné/force), enrichMemory, 12 (angles disciples) — via _agentPairVote(a, pair).
  // a.score / a.conf ne bougent plus que par learnFromOutcome, la redistribution (02) et le
  // bunker (07) : c'est le biais appris, plus l'avis du moment.
  try {
    const _ps = S.pairStates && S.pairStates[pair];
    if (_ps) {
      const _muted = new Set(S.mutedAgents || []);
      const _votes = {};
      Object.entries(scoutResults).forEach(([id, res]) => {
        if (res && typeof res.score === 'number') _votes[id] = _muted.has(id) ? 0 : res.score;
      });
      Object.entries(councilResults).forEach(([id, res]) => {
        if (!res) return;
        const magnitude = Math.abs(res.score || 0.3);
        _votes[id] = _muted.has(id) ? 0 : (res.vote === 'long' ? magnitude : res.vote === 'short' ? -magnitude : 0);
      });
      Object.entries(guardianResults).forEach(([id, res]) => {
        if (!res) return;
        // [DÉGEL DES VOIX · 02/10/2026] un gardien rend un STATUT (feu vert, alerte, veto), pas un sens : 0 (avant : feu vert et gardien muet +0,05 = un
        // achat ; alerte −0,2 et veto −0,5 = des ventes). Le veto bloque toujours l'ouverture (09c, anyVeto) ; le statut reste affiché.
        _votes[id] = 0;
      });
      _ps.roster = { ts: Date.now(), cycle: S.cycle || 0, votes: _votes, weights: _weights, regime: _regimeNow };   // [POIDS PAR ATTRIBUTION] décomposition lisible
      try { const _sh = _evoShadowVotes(pair, scoutResults, verdict, (S.tradingAccount || 100) * 0.1); if (_sh) _ps.roster.shadow = _sh; } catch(e) {}   // [MÉRITE DE L'ÉVOLUEUR · 26/09/2026] votes de l'ancien génome des sièges en essai
      // [ATTRIBUTION PAR SOURCE · 17/09/2026] A2 : range ce que chaque SOURCE DE DONNÉES disait à cet instant (10i, RAM,
      // lecture seule) — aucune décision ne le lit. Sert à l'attribution à la clôture (02 → _attributionRecord).
      try { if (typeof _intelPublish === 'function') _intelPublish(pair, _votes, _weights, (getTechSignals(pair) || {}).atScore); } catch(e) {}
    }
  } catch(e) {}
  // Bots de flotte (isBot : jamais comptés dans le consensus 10f ni dans l'évolution) : leur
  // « score » reste le reflet de leur statut pour les cartes — inchangé.
  if(S.agents && S.botFleet) {
    Object.entries(S.botFleet).forEach(([id, b]) => {
      const agent = S.agents.find(a => a.id === id);
      if(agent) {
        // Active status → positive score, alert → negative, idle → ~0
        agent.score = b.status === 'executing' ?  0.3
                    : b.status === 'active'    ?  0.15
                    : b.status === 'alert'     ? -0.4
                    : b.status === 'scanning'  ?  0.05
                    : 0.0;
      }
    });
  }

  return {
    pair,
    scoutResults,
    councilResults,
    guardianResults,
    verdict,
    votes: { long:longVotes, short:shortVotes, hold:holdVotes, total:totalVotes },
    consensus,
    coalition,
    skillWeighted: _skillWeighted,   // [13/08] observabilité de la pondération par paire
    finalDecision: anyVeto ? 'VETO' : verdict,
    anyVeto
  };
}

// [PHASE 1 · 12/09/2026] Vote d'UN agent sur UNE paire — source unique ps.roster.votes (écrit par
// runRosterAnalysis dans le mode courant : pairStates est multiplexé par mode). Rend `fallback`
// (défaut 0) tant que la paire n'a pas de roster ou que l'agent n'y vote pas (bots, méta).
function _agentPairVote(a, pair, fallback) {
  try {
    // [DÉCISION COMMUNE · 27/09/2026] le vote tel qu'il était AU MOMENT du pari (cycle précédent, ou ouverture de la position) — posé le temps d'un jugement
    const _ov = (typeof window !== 'undefined') ? window.__voteOverride : null;
    if (_ov && _ov.pair === pair && _ov.votes) return (a && typeof _ov.votes[a.id] === 'number') ? _ov.votes[a.id] : 0;
    const r = a && pair && S.pairStates && S.pairStates[pair] && S.pairStates[pair].roster;
    if (r && r.votes && typeof r.votes[a.id] === 'number') return r.votes[a.id];
  } catch(e) {}
  return (typeof fallback === 'number') ? fallback : 0;
}

// ════════════════════════════════════════════════════════════
// ENHANCED RENDER — Debate + Swarm panels using full roster
// ════════════════════════════════════════════════════════════
function renderDebatePanel() {
  const el = document.getElementById('apanel-debate');
  if(!el) return;
  const pair = S.activePair || (Object.keys(S.pairStates || {})[0]) || 'BTC/USDT';
  const r = runRosterAnalysis(pair);
  if(!r) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">En attente de signaux…</div>';
    return;
  }
  const cfg = PAIRS[pair];

  // Coalition banner
  const coalitionHtml = r.coalition ? `
    <div class="coalition-banner">
      <span class="icon">🤝</span>
      <div class="text">
        <strong>Coalition formée</strong><br>
        <span style="font-size:8px;color:var(--t3);">${r.votes.long >= 4 ? r.votes.long : r.votes.short}/${r.votes.total} du conseil aligné · conviction élevée</span>
      </div>
      <span class="conv">${(r.consensus * 100).toFixed(0)}%</span>
    </div>` : '';

  // Council voters with their advisors (v6.5: fully defensive)
  const councilHtml = ROSTER_TIERS.council.map(cId => {
    const v = r.councilResults?.[cId];
    if(!v) return `<div style="color:var(--t3);font-size:10px;padding:4px;">⏳ ${cId} en attente…</div>`;
    const agent = (S.agents || []).find(a => a.id === cId);
    const name = agent?.name || cId;
    const emoji = agent?.emoji || '·';
    const advisorChips = (v?.advisors || []).map(adv => {
      const cls = adv.score > 0.15 ? 'bullish' : adv.score < -0.15 ? 'bearish' : '';
      return `<span class="advisor-chip ${cls}">${adv.emoji} ${(adv.score>=0?'+':'')}${adv.score.toFixed(1)}</span>`;
    }).join('');
    if(!v) return ''; // v6.5: skip if councilVote failed
    return `
    <div class="persona-row vote-${v?.vote||'hold'}">
      <div class="persona-avatar">${emoji}</div>
      <div class="persona-body">
        <div class="persona-name">${name.toUpperCase()}</div>
        <div class="persona-quote">« ${v.quote} »</div>
        <div class="advisors">${advisorChips}</div>
      </div>
      <div class="persona-vote ${v.vote}">${v.vote === 'long' ? 'LONG' : v.vote === 'short' ? 'SHORT' : 'HOLD'}</div>
    </div>`;
  }).join('');

  // Guardians summary
  const guardianHtml = ROSTER_TIERS.guardians.map(gId => {
    const g = r.guardianResults[gId];
    const agent = (S.agents || []).find(a => a.id === gId);
    const icon = g.status === 'veto' ? '🚫' : g.status === 'warn' ? '⚠️' : '✅';
    const col  = g.status === 'veto' ? 'var(--down)' : g.status === 'warn' ? 'var(--gold)' : 'var(--up)';
    return `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--s2);border-radius:6px;margin-bottom:3px;font-size:9px;">
      <span style="flex-shrink:0;">${agent?.emoji || '·'}</span>
      <span style="color:var(--t2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${agent?.name || gId}</span>
      <span style="color:${col};font-size:9px;">${icon} ${g.status.toUpperCase()}</span>
    </div>`;
  }).join('');

  const verdictCol = r.finalDecision === 'LONG' ? 'var(--up)' : r.finalDecision === 'SHORT' ? 'var(--down)' : r.finalDecision === 'VETO' ? 'var(--down)' : 'var(--gold)';

  el.innerHTML = `
    <div class="dialogue-wrap council-enhanced">
      <div class="dialogue-header">
        <span style="font-size:9px;color:var(--t2);font-weight:600;">🎭 CONSEIL · ${ROSTER_TIERS.council.length} voteurs · ${ROSTER_TIERS.scouts.length} scouts</span>
        <span style="font-size:9px;color:${cfg?.color || 'var(--pur)'};font-weight:700;">${pair}</span>
      </div>
      ${coalitionHtml}
      ${councilHtml}
      <div style="margin-top:10px;padding:7px 9px;background:rgba(245,200,66,.05);border:1px solid rgba(245,200,66,.15);border-radius:9px;">
        <div style="font-size:8px;color:var(--t3);letter-spacing:.07em;margin-bottom:4px;">⚖️ GARDIENS</div>
        ${guardianHtml}
      </div>
      <div class="dialogue-verdict">
        <div class="dialogue-verdict-label">DÉCISION FINALE</div>
        <div class="dialogue-verdict-val" style="color:${verdictCol};">
          ${r.finalDecision} · ${r.votes.long}L/${r.votes.short}S/${r.votes.hold}H${r.anyVeto ? ' 🚫' : ''}
        </div>
      </div>
      <div class="force-bar">
        <button class="force-btn long"  onclick="forceTrade('long')">⚡ FORCER LONG</button>
        <button class="force-btn short" onclick="forceTrade('short')">⚡ FORCER SHORT</button>
        <button class="force-btn skip"  onclick="forceTrade('skip')">❌ SKIP</button>
      </div>
    </div>
    ${typeof renderBrainLog === 'function' ? renderBrainLog() : ''}`;
}

// ── SWARM PANEL — Show all 21 agents in their tiers ──
function renderSwarmPanel() {
  const el = document.getElementById('apanel-swarm');
  if(!el) return;
  const pair = S.activePair || (Object.keys(S.pairStates || {})[0]) || 'BTC/USDT';
  const r = runRosterAnalysis(pair);

  const renderAgent = (id, tier, data) => {
    const agent = (S.agents || []).find(a => a.id === id) || {};
    const name = agent.name || id;
    const emoji = agent.emoji || '·';
    let signal, reason, cls;
    if(tier === 1) {
      // Council member
      const v = data;
      const vote = v?.vote || 'hold';
      signal = vote === 'long' ? 'LONG' : vote === 'short' ? 'SHORT' : 'HOLD';
      reason = v?.quote || 'En attente';
      cls = vote === 'long' ? 'bullish' : vote === 'short' ? 'bearish' : 'neutral';
    } else if(tier === 2) {
      const s = data;
      signal = s?.score >= 0 ? `+${(s?.score||0).toFixed(2)}` : `${(s?.score||0).toFixed(2)}`;
      reason = s?.reasoning || 'En analyse';
      cls = (s?.score||0) > 0.15 ? 'bullish' : (s?.score||0) < -0.15 ? 'bearish' : 'neutral';
    } else {
      const g = data;
      signal = g?.status === 'approve' ? '✓ OK' : g?.status === 'warn' ? '⚠ WARN' : '🚫 VETO';
      reason = g?.reasoning || 'En veille';
      cls = g?.status === 'approve' ? 'approve' : 'veto';
    }
    const firing = (tier === 1 && data?.vote !== 'hold') ||
                   (tier === 2 && Math.abs(data?.score || 0) > 0.4) ||
                   (tier === 3 && data?.status !== 'approve');
    const muted = (S.mutedAgents || []).includes(id);
    return `<div class="swarm-agent tier-${tier}${firing ? ' firing' : ''}${muted ? ' muted' : ''}">
      <div class="swarm-avatar">${emoji}</div>
      <div class="swarm-body">
        <div class="swarm-name">${name}</div>
        <div class="swarm-reason">${reason}</div>
      </div>
      <div class="swarm-signal ${cls}">${signal}</div>
      <button class="agent-mute-btn${muted ? ' muted' : ''}" onclick="event.stopPropagation();toggleAgentMute('${id}')" title="${muted ? 'Réactiver' : 'Rendre muet'}">${muted ? '✕' : '·'}</button>
    </div>`;
  };

  const tier1 = ROSTER_TIERS.council.map(id => renderAgent(id, 1, r.councilResults[id])).join('');
  const tier2 = ROSTER_TIERS.scouts.map(id => renderAgent(id, 2, r.scoutResults[id])).join('');
  const tier3 = ROSTER_TIERS.guardians.map(id => renderAgent(id, 3, r.guardianResults[id])).join('');

  // Summary stats
  const activeScouts = Object.values(r.scoutResults).filter(s => Math.abs(s.score) > 0.15).length;
  const firingCouncil = Object.values(r.councilResults).filter(v => v.vote !== 'hold').length;
  const guardianAlerts = Object.values(r.guardianResults).filter(g => g.status !== 'approve').length;

  el.innerHTML = `
    <div class="swarm-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:10px;color:var(--pur);font-weight:700;">🐝 21 AGENTS · ${r.pair}</span>
        <span style="font-size:8px;color:var(--t3);">${firingCouncil + activeScouts}/21 actifs</span>
      </div>

      <div class="swarm-tier">
        <div class="swarm-tier-head">
          <span class="swarm-tier-name" style="color:var(--pur);">👑 CONSEIL · voteurs</span>
          <span class="swarm-tier-count">${firingCouncil}/${ROSTER_TIERS.council.length}</span>
        </div>
        ${tier1}
      </div>

      <div class="swarm-tier">
        <div class="swarm-tier-head">
          <span class="swarm-tier-name" style="color:var(--ice);">🔭 SCOUTS · analystes</span>
          <span class="swarm-tier-count">${activeScouts}/${ROSTER_TIERS.scouts.length}</span>
        </div>
        ${tier2}
      </div>

      <div class="swarm-tier">
        <div class="swarm-tier-head">
          <span class="swarm-tier-name" style="color:var(--gold);">⚖️ GARDIENS · veto</span>
          <span class="swarm-tier-count">${guardianAlerts === 0 ? 'tous OK' : guardianAlerts + ' alerte' + (guardianAlerts > 1 ? 's' : '')}</span>
        </div>
        ${tier3}
      </div>

      <div style="margin-top:8px;padding:8px 10px;background:var(--s2);border-radius:9px;text-align:center;">
        <div style="font-size:8px;color:var(--t3);letter-spacing:.08em;">VERDICT ORCHESTRÉ</div>
        <div style="font-family:var(--font-display);font-size:16px;font-weight:700;margin-top:3px;color:${r.finalDecision === 'LONG' ? 'var(--up)' : r.finalDecision === 'SHORT' ? 'var(--down)' : r.finalDecision === 'VETO' ? 'var(--down)' : 'var(--gold)'};">
          ${r.finalDecision} · ${(r.consensus*100).toFixed(0)}%${r.coalition ? ' 🤝' : ''}
        </div>
      </div>
    </div>`;
}

// v5.8 FIX — _V54_TABS now declared ONCE at top of v5.4 section with all tabs included (no TDZ)
// Replace switchAnalyticsTab + renderAnalyticsPanel with v5.5 versions





// Expose orchestrator for bot decision consumption
window._runRosterAnalysis = runRosterAnalysis;

// ════════════════════════════════════════════════════════════
// v5.6 — ACTIVE BOT FLEET (8 specialized execution bots)
// ════════════════════════════════════════════════════════════
// Each bot has: status (idle/scanning/active/executing/alert), lastAction,
// lastActionTs, contributions (count), pnlContrib ($)
// Triggered on events: 'tick', 'pre_trade', 'post_trade'
// ════════════════════════════════════════════════════════════

const BOT_FLEET_IDS = [
  'exec_bot_v1',       // ⚡ TWAP/VWAP splits large trades
  'arb_bot_v1',        // ⚖️ Scans for strongest cross-pair opportunity
  'scalper_bot_v1',    // 🎯 Micro-scalps during idle
  'fiscal_bot_v1',     // 💎 Tax-loss harvest timing
  'dca_bot_v1',        // 🧲 DCA in low volatility regimes
  'rescue_bot_v1',     // 🛟 Emergency flatten on critical drawdown
  'rebalance_bot_v1',  // 🔀 Fix portfolio skew
  'smart_sizer_v1'     // 📊 Kelly/VaR-based sizing multiplier
];

// Init fleet state
function initBotFleet() {
  if(!S.botFleet) S.botFleet = {};
  BOT_FLEET_IDS.forEach(id => {
    if(!S.botFleet[id]) S.botFleet[id] = {
      status: 'idle',
      lastAction: 'Prêt',
      lastActionTs: 0,
      contributions: 0,
      pnlContrib: 0
    };
  });
}
if(typeof S !== 'undefined') initBotFleet();

// [PURGE VÉRITÉ · 09/08/2026, corrigée 09/08 soir] Les cumuls d'exec_bot (2054 contribs /
// +403 $ fabriqués par la boucle de statut), de scalper_bot (PnL tiré au sort) et du
// smart_sizer (crédit forfaitaire 5%) sont des données FABRIQUÉES — purgées pour
// repartir sur du vrai. Les cumuls légitimes (rescue = flattens réels) sont conservés.
// FIX v2 : la première version purgait au CHARGEMENT du script, AVANT loadState — elle
// nettoyait l'état vierge puis la restauration ré-écrasait les vieux cumuls (prouvé par
// le backup 16:31 : compteurs intacts). Pattern des migrations éprouvées (_upgradeFeeRates,
// 09b2) : attendre _stateReady, purger l'état RESTAURÉ, flag en localStorage, sauvegarder.
(function _fleetTruthPurge(){
  var FLAG = 'aura_fleet_truth_reset_20260809';
  var _t = 0;
  var _iv = setInterval(function(){
    _t++;
    var ready = false;
    try { ready = !!window._stateReady; } catch(e) {}
    if (!ready && _t < 120) return;
    clearInterval(_iv);
    try {
      if (typeof S === 'undefined' || !S || !S.botFleet) return;
      if (localStorage.getItem(FLAG)) return;
      ['exec_bot_v1','scalper_bot_v1'].forEach(function(id){
        if(S.botFleet[id]) { S.botFleet[id].contributions = 0; S.botFleet[id].pnlContrib = 0; }
      });
      if(S.botFleet.smart_sizer_v1) S.botFleet.smart_sizer_v1.pnlContrib = 0;
      localStorage.setItem(FLAG, '1');
      try {
        if (S.chainLog) {
          S.chainLog.push({ icon:'🧹', desc:'Compteurs flotte purgés : exec (2054 contribs fabriqués par la boucle de statut), scalper (PnL tiré au sort), sizer (crédit forfaitaire 5%) — repartent sur du réel', hash:Math.random().toString(36).slice(2,8), time:new Date().toLocaleTimeString() });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        }
      } catch(e) {}
      try { if (typeof showToast === 'function') showToast('🧹 Compteurs flotte purgés · les chiffres repartent sur du réel', 5000, 'warn'); } catch(e) {}
      try { if (typeof saveState === 'function') saveState(true); } catch(e) {}
    } catch(e) {}
  }, 500);
})();

// Helper
function _setBot(id, status, action) {
  if(!S.botFleet?.[id]) return;
  S.botFleet[id].status = status;
  S.botFleet[id].lastAction = action;
  S.botFleet[id].lastActionTs = Date.now();
}

// ── 1. EXEC BOT · TWAP/VWAP splitting ──
// [AUDIT FLOTTE · 09/08/2026] Deux fabrications supprimées :
//  (a) l'appel de statut à chaque tick (orchestrateur) incrémentait contributions et
//      créditait des « économies » stake×0.12%×chunks SANS AUCUN trade — les 2054
//      contribs / +403 $ affichés venaient de là (boucle de statut quand le compte
//      dépassait 100 $). statusOnly=true : le statut s'affiche, rien n'est comptabilisé.
//  (b) les « économies » étaient inventées : AUCUN split TWAP n'est réellement exécuté
//      (personne ne consomme `chunks`). Tant que le vrai split n'existe pas (chantier
//      roadmap), pnlContrib reste à 0 : ce bot COMPTE ses interventions réelles
//      (pre_trade sur un vrai trade) mais ne revendique aucun dollar.
function botExec(stakeUsd, statusOnly) {
  if(!stakeUsd || stakeUsd < 10) {
    _setBot('exec_bot_v1', 'idle', `Taille ${stakeUsd?.toFixed(0) || 0}$ — exécution directe`);
    return { chunks: 1, savings: 0 };
  }
  // [NUTRITION · 09/08/2026] les chunks ignoraient le marché : nourris par la
  // volatilité médiane (_getMarketVolatilityMedian) — marché nerveux (cv>2%) = un
  // chunk de plus pour lisser l'exécution. Toujours 0 $ revendiqué (split réel : chantier).
  let chunks = stakeUsd > 200 ? 3 : stakeUsd > 100 ? 2 : 1;
  let volStr = '';
  try {
    // [FIX UNITÉ · 09/08/2026, attrapé par la trace « vol 200.0% » du backup] la médiane
    // est un ATR EN POURCENTS (2.0 = 2%), pas une fraction : l'ancien seuil 0.02 était
    // toujours vrai (+1 chunk permanent). Seuil corrigé : marché nerveux = ATR% > 2.
    const mv = (typeof _getMarketVolatilityMedian === 'function') ? _getMarketVolatilityMedian() : null;
    if (typeof mv === 'number' && mv > 2.0) { chunks++; volStr = ` · vol ${mv.toFixed(1)}% → +1 chunk`; }
  } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
  _setBot('exec_bot_v1', 'executing', `Split TWAP ${chunks}x recommandé sur ${stakeUsd.toFixed(0)}$${volStr} (exécution en chunks : chantier)`);
  if(!statusOnly) {
    S.botFleet.exec_bot_v1.contributions++;
  }
  return { chunks, savings: 0 };
}

// ── 2. ARB BOT · Stat·Arb par corrélations (v7 · nutrition 09/08/2026) ──
// L'ancien bot « Stat·Arb » ne mangeait AUCUNE corrélation : il scannait un composite
// directionnel (tech+fond > 0.45) — doublon du travail du conseil et du scalper.
// Remplacé par son vrai métier, nourri par _getPairCorrelation (déjà calculée, mangée
// par personne d'autre que la garde EV) : détecter deux paires historiquement corrélées
// (>0.65) dont les performances récentes ont divergé (>2.5%), et PROPOSER la jambe de
// convergence — long le retardataire. La proposition passe par le circuit complet
// (brain gate, vetos, anti-négatif). Ce que ça retire : le scan directionnel composite.
function botArb() {
  const pairs = Object.keys(PAIRS || {});
  let best = null;
  try {
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const corr = (typeof _getPairCorrelation === 'function') ? _getPairCorrelation(pairs[i], pairs[j]) : null;
        if (!(typeof corr === 'number' && corr > 0.65)) continue;
        const rA = (typeof _getPairReturns === 'function') ? _getPairReturns(pairs[i]) : null;
        const rB = (typeof _getPairReturns === 'function') ? _getPairReturns(pairs[j]) : null;
        if (!rA || !rB || rA.length < 10 || rB.length < 10) continue;
        const perfA = rA.slice(-20).reduce((s, x) => s + x, 0);
        const perfB = rB.slice(-20).reduce((s, x) => s + x, 0);
        const div = perfA - perfB;   // divergence de performance récente
        if (Math.abs(div) > 0.025) {
          const lag = div > 0 ? pairs[j] : pairs[i];   // le retardataire
          const lead = div > 0 ? pairs[i] : pairs[j];
          if (typeof _botAlreadyActing === 'function' && _botAlreadyActing('arb_bot_v1', lag, 'long')) continue;   // [SURVEILLANCE PERMANENTE · 27/09/2026]
          if (!best || Math.abs(div) > Math.abs(best.div)) best = { lag, lead, corr, div };
        }
      }
    }
  } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
  if (best) {
    // [CONSULTATION · 15/08/2026] avis des disciples sur la jambe de convergence
    let _dc = { mod: 1, detail: '' };
    try { if (typeof window._consultDisciples === 'function') _dc = window._consultDisciples('arb_bot_v1', best.lag, 'long'); } catch(e) {}
    if (_dc.mod < 0.92) {
      _setBot('arb_bot_v1', 'idle', `Convergence ${best.lag} retenue · disciples contre (${_dc.detail})`);
      if(S.pendingActions) S.pendingActions = S.pendingActions.filter(a => a.type !== 'arb');
      return null;
    }
    if(!S.pendingActions) S.pendingActions = [];
    const already = S.pendingActions.find(a => a.type === 'arb' && a.pair === best.lag);
    if(!already) {
      S.pendingActions = S.pendingActions.filter(a => a.type !== 'arb');
      S.pendingActions.unshift({
        id: 'ar' + Date.now().toString(36),
        type: 'arb',
        pair: best.lag,
        side: 'long',
        ts: Date.now(),
        source: 'arb_bot_v1',
        title: `Convergence ${best.lag}`,
        detail: `corr ${best.corr.toFixed(2)} avec ${best.lead} · divergence ${(Math.abs(best.div)*100).toFixed(1)}% · long retardataire`,
        action: 'open_trade',
        payload: { pair: best.lag, side: 'long' }
      });
      if(S.pendingActions.length > 10) S.pendingActions.length = 10;
      S.botFleet.arb_bot_v1.contributions++;   // proposition publiée = intervention réelle
      // [SURVEILLANCE PERMANENTE · 27/09/2026] jugée au résultat RÉEL du trade (exécution immédiate, _fleetHeartbeat) ou, refusée par l'entonnoir, comme affirmation (04 executePending)
    }
    _setBot('arb_bot_v1', 'active', `Convergence ${best.lag}/${best.lead} · corr ${best.corr.toFixed(2)} · div ${(Math.abs(best.div)*100).toFixed(1)}%`);
    return best;
  }
  _setBot('arb_bot_v1', 'scanning', `Scan corrélations · aucune divergence >2.5% sur paires corrélées`);
  if(S.pendingActions) S.pendingActions = S.pendingActions.filter(a => a.type !== 'arb');
  return null;
}

// ── 3. SCALPER BOT · scanner d'opportunités scalp ──
// [NUTRITION · 09/08/2026] libellé « L2·OrderBook » retiré des statuts : le système n'a
// AUCUNE donnée L2 (flux WS trade/kline uniquement). Le bot dit ce qu'il mange : LMSR + vol.
// [AUDIT FLOTTE · 09/08/2026] L'ancien code était un GÉNÉRATEUR DE HASARD : 30% de
// chance par cycle de fabriquer un « micro-scalp » au PnL tiré au sort
// ((Math.random()-0.5+skew)×0.4 sur 2 $ virtuels) crédité dans pnlContrib — ses
// −2.98 $ affichés étaient des tirages au sort, aucun trade n'existait. Supprimé
// entièrement. Le bot fait désormais son métier honnêtement : scanner un signal
// scalp réel (LMSR décollé + volatilité présente) et PROPOSER le trade
// (pendingActions), comme le Bot Arbitrage. Aucun dollar fabriqué.
function botScalper() {
  // [SURVEILLANCE PERMANENTE · 27/09/2026] plus de pause dès qu'UNE position est ouverte, n'importe où (le Scalper dormait pendant tout trade du
  // système) : il saute seulement les paires déjà engagées (une position par paire : l'entonnoir la refuserait) ou déjà affirmées.
  const pairs = Object.keys(PAIRS || {});
  let best = null;
  pairs.forEach(pair => {
    const ps = S.pairStates?.[pair];
    const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
    if(!ps || !tech) return;
    const cv = tech.raw?.stddev?.cv || 0;
    const lmsr = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    const edge = Math.abs(lmsr - 0.5);
    if(edge > 0.12 && cv > 0.0008) {   // [audit CV 16/08] 0.8% était inatteignable sur les majors (cv réel BTC ~0.01%)
      const _sd = lmsr > 0.5 ? 'long' : 'short';
      if (typeof _botAlreadyActing === 'function' && _botAlreadyActing('scalper_bot_v1', pair, _sd)) return;   // [SURVEILLANCE PERMANENTE · 27/09/2026]
      if(!best || edge > best.edge) best = { pair, edge, side: _sd, cv };
    }
  });
  if(best) {
    // [CONSULTATION · 15/08/2026] avis des disciples sur (paire, side) : désaccord fort
    // (mod < 0.92) = proposition retenue, statut honnête. Accord tracé dans le détail.
    let _dc = { mod: 1, detail: '' };
    try { if (typeof window._consultDisciples === 'function') _dc = window._consultDisciples('scalper_bot_v1', best.pair, best.side); } catch(e) {}
    if (_dc.mod < 0.92) {
      _setBot('scalper_bot_v1', 'idle', `Signal ${best.pair} ${best.side.toUpperCase()} retenu · disciples contre (${_dc.detail})`);
      if(S.pendingActions) S.pendingActions = S.pendingActions.filter(a => a.type !== 'scalp');
      return;
    }
    if(!S.pendingActions) S.pendingActions = [];
    const already = S.pendingActions.find(a => a.type === 'scalp' && a.pair === best.pair && a.side === best.side);
    if(!already) {
      S.pendingActions = S.pendingActions.filter(a => a.type !== 'scalp');
      S.pendingActions.unshift({
        id: 'sc' + Date.now().toString(36),
        type: 'scalp',
        pair: best.pair,
        side: best.side,
        ts: Date.now(),
        source: 'scalper_bot_v1',
        title: `Scalp ${best.pair}`,
        detail: `${best.side.toUpperCase()} · LMSR ${(0.5 + (best.side==='long'?best.edge:-best.edge)).toFixed(2)} · vol ${(best.cv*100).toFixed(1)}%${_dc.detail ? ' · disciples ' + _dc.detail : ''}`,
        action: 'open_trade',
        payload: { pair: best.pair, side: best.side }
      });
      if(S.pendingActions.length > 10) S.pendingActions.length = 10;
      S.botFleet.scalper_bot_v1.contributions++;
      // [SURVEILLANCE PERMANENTE · 27/09/2026] jugée au résultat RÉEL du trade (exécution immédiate, _fleetHeartbeat) ou, refusée par l'entonnoir, comme affirmation (04 executePending)
    }
    _setBot('scalper_bot_v1', 'active', `Signal scalp ${best.pair} ${best.side.toUpperCase()} · proposition créée`);
  } else {
    _setBot('scalper_bot_v1', 'scanning', `Scan LMSR + volatilité · pas de signal scalp`);
    if(S.pendingActions) S.pendingActions = S.pendingActions.filter(a => a.type !== 'scalp');
  }
}

// ── 4. FISCAL BOT · Tax-loss harvest (v6.0 · proposition actionnable) ──
// [NUTRITION · 09/08/2026] l'ancien bot était nourri de constantes : seuil 40 $ codé en
// dur (jamais atteint sur un compte de ~50 $) et « économie ~30% » forfaitaire — il
// aurait proposé des harvests à valeur fiscale RÉELLE nulle (perte annuelle nette =
// impôt dû 0, franchise ignorée).
// [GO FISCAL · 07/10/2026] branché sur le REGISTRE LÉGAL du mode (16) : il ANALYSE et le DIT (statut du bot, page ⚖ Impôt) —
// perte latente qui baisserait vraiment l'impôt de l'année si elle était réalisée maintenant (même régime seulement, frais
// compris), impôt dû, exonération restante. Il ne publie plus de proposition « harvest » ni de pari de mérite (_botPredict) :
// avec l'ancien calcul il n'en publiait jamais (impôt marginal toujours 0 sous la franchise, 0 jugement dans le backup 07/10) ;
// en publier changerait la flotte (mérite → ordre des disciples → votes) et la file des propositions (10 places partagées
// avec les ouvertures des bots) — c'est une décision : porte TALENT d'abord. La fermeture reste ton geste. Statut toujours « idle »,
// comme avant (le statut fait le a.score de la carte du bot).
function botFiscal() {
  if(S.pendingActions) S.pendingActions = S.pendingActions.filter(a => a.type !== 'harvest');
  const _mode = (typeof _walletKey === 'function') ? _walletKey() : 'sim';
  let _st = 'Registre fiscal en attente du premier trade fermé';
  try {
    const h = (typeof _fiscHarvest === 'function' && S.taxConfig && S.taxConfig.region === 'BE') ? _fiscHarvest(_mode) : null;
    if (h) {
      _setBot('fiscal_bot_v1', 'idle', `Perte latente ${h.pair} : la réaliser avant le 31/12 baisserait l'impôt de l'année de ${h.savingEur.toFixed(2)} € (régime ${h.regime === 'normal' ? 'normal' : 'spéculatif'})`);
      return { pos: h.pos, savings: h.savingUsd };
    }
    const r = (typeof _fiscRegimeNow === 'function' && S.taxConfig && S.taxConfig.region === 'BE') ? _fiscRegimeNow() : null;
    if (r) _st = `Régime en cours ${r.pct} (${r.auto ? 'AUTO' : 'MANU'}) · impôt dû ${r.d.due.toFixed(2)} € · exonération restante ${Math.round(r.left)} €`;
  } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
  _setBot('fiscal_bot_v1', 'idle', _st);
  return null;
}

// ── 5. DCA BOT · achat bas de range en régime plat (opérationnel 09/08/2026) ──
// [CONSTRUCTION · 09/08/2026] l'ancien bot DÉTECTAIT le régime plat et ne faisait rien
// du résultat (retour consommé par personne). Il devient opérationnel dans les limites
// de l'architecture : maxConcurrentPos=1 interdit une vraie grille multi-niveaux
// (déclaré — la grille complète attend une décision d'ouverture de ce plafond). Son
// métier réalisable : en régime plat (cv<1.2%, ADX<20), quand le prix touche le BAS du
// range 20 bougies (≤15% de la plage), PROPOSER l'achat — la proposition passe par le
// circuit complet (gate, vetos, anti-négatif), comme le Scalper et l'Arb.
function botDCA() {
  const pairs = Object.keys(PAIRS || {});
  let lowVolCount = 0, flatTrendCount = 0;
  let best = null;
  pairs.forEach(p => {
    const tech = typeof getTechSignals === 'function' ? getTechSignals(p) : null;
    const cv = tech?.raw?.stddev?.cv || 0.02;
    const adx = tech?.raw?.adx?.adx || 20;
    if(cv < 0.0012) lowVolCount++;    // [audit CV 16/08] échelle réelle : 0.12% sur 20 bougies = calme
    if(adx < 18) flatTrendCount++;
    if(!(cv < 0.0012 && adx < 20)) return;
    const ps = S.pairStates?.[p];
    const candles = ps?.candles;
    if(!ps || !candles || candles.length < 20) return;
    const closes20 = candles.slice(-20).map(c => c.c);
    const lo = Math.min(...closes20), hi = Math.max(...closes20);
    const range = hi - lo;
    if(!(range > 0)) return;
    const posInRange = (ps.price - lo) / range;   // 0 = plancher, 1 = plafond
    if(posInRange <= 0.15) {
      if (typeof _botAlreadyActing === 'function' && _botAlreadyActing('dca_bot_v1', p, 'long')) return;   // [SURVEILLANCE PERMANENTE · 27/09/2026]
      if(!best || posInRange < best.posInRange) best = { pair: p, posInRange, lo, hi, cv };
    }
  });
  if(best) {
    // [CONSULTATION · 15/08/2026] avis des disciples avant l'achat bas de range
    let _dc = { mod: 1, detail: '' };
    try { if (typeof window._consultDisciples === 'function') _dc = window._consultDisciples('dca_bot_v1', best.pair, 'long'); } catch(e) {}
    if (_dc.mod < 0.92) {
      _setBot('dca_bot_v1', 'idle', `Bas de range ${best.pair} retenu · disciples contre (${_dc.detail})`);
      if(S.pendingActions) S.pendingActions = S.pendingActions.filter(a => a.type !== 'dca');
      return null;
    }
    if(!S.pendingActions) S.pendingActions = [];
    const already = S.pendingActions.find(a => a.type === 'dca' && a.pair === best.pair);
    if(!already) {
      S.pendingActions = S.pendingActions.filter(a => a.type !== 'dca');
      S.pendingActions.unshift({
        id: 'dc' + Date.now().toString(36),
        type: 'dca',
        pair: best.pair,
        side: 'long',
        ts: Date.now(),
        source: 'dca_bot_v1',
        title: `Achat bas de range ${best.pair}`,
        detail: `Régime plat · prix à ${(best.posInRange*100).toFixed(0)}% du range [${best.lo.toFixed(4)}–${best.hi.toFixed(4)}]`,
        action: 'open_trade',
        payload: { pair: best.pair, side: 'long' }
      });
      if(S.pendingActions.length > 10) S.pendingActions.length = 10;
      S.botFleet.dca_bot_v1.contributions++;   // proposition publiée = intervention réelle
      // [SURVEILLANCE PERMANENTE · 27/09/2026] jugée au résultat RÉEL du trade (exécution immédiate, _fleetHeartbeat) ou, refusée par l'entonnoir, comme affirmation (04 executePending)
    }
    _setBot('dca_bot_v1', 'active', `Achat bas de range proposé · ${best.pair} à ${(best.posInRange*100).toFixed(0)}% du range plat`);
    return best;
  }
  _setBot('dca_bot_v1', 'idle', `Aucun bas de range en régime plat (${lowVolCount} vol faible, ${flatTrendCount} flat)`);
  if(S.pendingActions) S.pendingActions = S.pendingActions.filter(a => a.type !== 'dca');
  return null;
}

// ── 6. RESCUE BOT · Emergency drawdown (v6.0 · vraie action) ──
function botRescue() {
  // [SURVEILLANCE PERMANENTE · 27/09/2026] surveillé en permanence, le flatten doit REPARTIR du portefeuille restant : sinon, tant que la perte de
  // session dépasse 12 %, chaque nouvelle position serait refermée au passage suivant (trading gelé jusqu'au rechargement).
  // Référence : début de session (_startPortfolio), ou le portefeuille juste après le dernier flatten de CETTE session.
  if (!S._rescueRef) S._rescueRef = {};
  const _rk = S.tradingMode || 'sim', _rr = S._rescueRef[_rk];
  const startP = (_rr && _rr.base === S._startPortfolio && _rr.ref > 0) ? _rr.ref : (S._startPortfolio || S.portfolio || 1);
  const curP = S.portfolio || 1;
  const ddPct = startP > 0 ? (startP - curP) / startP * 100 : 0;
  const hasPositions = (S.openPositions || []).length > 0;

  if(ddPct > 12 && hasPositions) {
    // v6.0 · VRAIE ACTION — flatten all positions
    const countBefore = S.openPositions.length;
    const snapshot = S.openPositions.map(p => ({ id: p.id, pair: p.pair, side: p.side }));
    snapshot.forEach(p => {
      try {
        if(typeof closePosition === 'function') closePosition(p.id, true);
      } catch(e) { console.warn('rescue flatten:', e); }
    });
    S.botFleet.rescue_bot_v1.contributions++;
    S._rescueRef[_rk] = { ref: S.portfolio || startP, base: S._startPortfolio };   // [SURVEILLANCE PERMANENTE · 27/09/2026] la référence repart d'ici
    try { snapshot.forEach(p => _botPredict('rescue_bot_v1', p.pair, p.side === 'long' ? 'short' : 'long', 'flatten')); } catch(e) {}   // [MÉRITE DES BOTS · 26/09/2026] le flatten est juste si les prix continuent contre les positions fermées
    _setBot('rescue_bot_v1', 'alert', `🚨 FLATTEN EXÉCUTÉ · ${countBefore} position(s) fermée(s) · DD ${ddPct.toFixed(1)}%`);
    if(typeof showToast === 'function') showToast(`🛟 Rescue · ${countBefore} position(s) fermée(s) (DD ${ddPct.toFixed(1)}%)`);
    if(!S.brainLog) S.brainLog = [];
    S.brainLog.unshift({ ts: Date.now(), pair: 'ALL', event:'RESCUE', side:'flatten', reason:`DD ${ddPct.toFixed(1)}% > seuil 12%` });
    return { action: 'flatten_all_executed', dd: ddPct, count: countBefore };
  }
  if(ddPct > 8) {
    _setBot('rescue_bot_v1', 'active', `⚠ Alerte DD ${ddPct.toFixed(1)}% · flatten à 12%`);
    return { action: 'warning', dd: ddPct };
  }
  if(ddPct > 5) {
    _setBot('rescue_bot_v1', 'scanning', `Surveillance · DD ${ddPct.toFixed(1)}%`);
  } else {
    _setBot('rescue_bot_v1', 'idle', `Portfolio sain · DD ${ddPct>=0 ? ddPct.toFixed(1) : '0.0'}%`);
  }
  return null;
}

// ── 7. REBALANCE BOT · portfolio skew (v6.0 · proposition actionnable) ──
function botRebalance() {
  const positions = S.openPositions || [];
  // [AUDIT FLOTTE · 09/08/2026] avec une seule position (maxConcurrentPos=1), le « skew
  // 100% » est STRUCTUREL, pas un déséquilibre — l'ancien code proposait absurdement de
  // fermer l'unique position « pour diversifier » (vu en prod : « Skew LINK 100% »).
  // Le rééquilibrage n'a de sens qu'à partir de 2 positions.
  if(positions.length < 2) {
    _setBot('rebalance_bot_v1', 'idle', positions.length === 0 ? `Aucune position · rien à rééquilibrer` : `1 position · rééquilibrage sans objet`);
    if(S.pendingActions) S.pendingActions = S.pendingActions.filter(a => a.type !== 'rebalance');
    return null;
  }
  const byPair = {};
  positions.forEach(p => {
    byPair[p.pair] = (byPair[p.pair] || 0) + (p.stakeUsdt || 0);
  });
  const totalExp = Object.values(byPair).reduce((s,v) => s+v, 0);
  let skewed = null;
  Object.entries(byPair).forEach(([p, v]) => {
    const share = totalExp > 0 ? v / totalExp : 0;
    if(share > 0.60) skewed = { pair: p, share, value: v };
  });
  if(skewed) {
    const _rbTop = positions.filter(p => p.pair === skewed.pair).sort((a,b) => (b.stakeUsdt||0) - (a.stakeUsdt||0))[0];
    if (_rbTop && _rbTop.auto !== true) {   // [SURVEILLANCE PERMANENTE · 27/09/2026] règle absolue : un bot ne ferme jamais une position manuelle
      _setBot('rebalance_bot_v1', 'idle', `Skew ${skewed.pair} ${(skewed.share*100).toFixed(0)}% · position manuelle : pas de rééquilibrage (règle absolue)`);
      if(S.pendingActions) S.pendingActions = S.pendingActions.filter(a => a.type !== 'rebalance');
      return null;
    }
    // v6.0 · Publie une proposition actionnable
    if(!S.pendingActions) S.pendingActions = [];
    const already = S.pendingActions.find(a => a.type === 'rebalance' && a.pair === skewed.pair);
    if(!already) {
      S.pendingActions.unshift({
        id: 'rb' + Date.now().toString(36),
        type: 'rebalance',
        pair: skewed.pair,
        ts: Date.now(),
        source: 'rebalance_bot_v1',
        title: `Rééquilibrer ${skewed.pair}`,
        detail: `${(skewed.share*100).toFixed(0)}% du portfolio · fermer pour diversifier`,
        action: 'close_skewed',
        payload: { pair: skewed.pair }
      });
      if(S.pendingActions.length > 10) S.pendingActions.length = 10;
      try { const _rbp = positions.find(p => p.pair === skewed.pair); if (_rbp) _botPredict('rebalance_bot_v1', skewed.pair, _rbp.side === 'long' ? 'short' : 'long', 'rééquilibrage'); } catch(e) {}   // [MÉRITE DES BOTS · 26/09/2026] réduire est juste si la paire recule
    }
    _setBot('rebalance_bot_v1', 'active', `Skew ${skewed.pair} ${(skewed.share*100).toFixed(0)}% · proposition créée`);
    return skewed;
  }
  // Clear old rebalance proposals if no longer skewed
  if(S.pendingActions) {
    S.pendingActions = S.pendingActions.filter(a => a.type !== 'rebalance');
  }
  const npairs = Object.keys(byPair).length;
  _setBot('rebalance_bot_v1', 'scanning', `Allocation équilibrée sur ${npairs} paire(s)`);
  return null;
}

// ── 8. SMART SIZER · Kelly-inspired position sizing ──
// [NUTRITION · 09/08/2026] le Sizer ne mangeait que le WR des 10 derniers trades.
// Branché sur deux données que le système calculait déjà pour personne :
//  · WR EFFECTIF EV (_getEffectiveWR, cumul wins/losses paperReal) — source WR
//    prioritaire quand ≥10 trades EV existent, plus stable que la fenêtre de 10 ;
//  · SHARPE PAR PAIRE (_computePairSharpe) — second facteur multiplicatif borné :
//    ×0.85 si le Sharpe de LA paire tradée est mauvais (<−0.5), ×1.10 s'il est bon
//    (>0.5). Résultat total borné [0.5, 1.4]. Chaque facteur est tracé dans lastAction.
function botSmartSizer(pair) {
  const recent = Object.values(S.pairStates || {})
    .flatMap(p => (p.trades || []))
    .filter(t => t.type === 'position' && t.pnlUsdt != null)
    .slice(-10);
  if(recent.length < 4) {
    _setBot('smart_sizer_v1', 'scanning', `${recent.length}/10 trades · collecte données`);
    return { mult: 1.0, wr: null };
  }
  const wins = recent.filter(t => t.pnlUsdt > 0).length;
  let wr = wins / recent.length;
  let wrSrc = recent.length + ' trades';
  try {
    const effWR = (typeof _getEffectiveWR === 'function') ? _getEffectiveWR() : null;
    if (typeof effWR === 'number') { wr = effWR; wrSrc = 'WR effectif EV'; }
  } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
  let mult, action;
  if(wr >= 0.7) {
    mult = 1.25;
    action = `WR ${(wr*100).toFixed(0)}% · size boost +25% · streak chaud 🔥`;
    _setBot('smart_sizer_v1', 'active', action);
  } else if(wr <= 0.3) {
    mult = 0.55;
    action = `WR ${(wr*100).toFixed(0)}% · size réduit -45% · protection ❄️`;
    _setBot('smart_sizer_v1', 'alert', action);
  } else if(wr >= 0.55) {
    mult = 1.1;
    action = `WR ${(wr*100).toFixed(0)}% · size légèrement + (${recent.length} trades)`;
    _setBot('smart_sizer_v1', 'active', action);
  } else {
    mult = 1.0;
    action = `WR ${(wr*100).toFixed(0)}% · size normal (neutre)`;
    _setBot('smart_sizer_v1', 'idle', action);
  }
  // Facteur Sharpe de la paire tradée (si connue)
  let shMult = 1.0, shStr = '';
  try {
    if (pair && typeof _computePairSharpe === 'function') {
      const sh = _computePairSharpe(pair);
      if (typeof sh === 'number' && isFinite(sh)) {
        if (sh < -0.5) { shMult = 0.85; shStr = ` · Sharpe ${pair} ${sh.toFixed(2)} → ×0.85`; }
        else if (sh > 0.5) { shMult = 1.10; shStr = ` · Sharpe ${pair} ${sh.toFixed(2)} → ×1.10`; }
      }
    }
  } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
  // [CONSULTATION · 15/08/2026] les disciples du Sizer donnent leur cohérence sur la
  // paire : disciples alignés = confiance ×1.1 max, disciples en conflit = prudence
  // ×0.9. Tracé dans le statut.
  let dcStr = '';
  try {
    const c = (typeof window._consultDisciples === 'function' && pair) ? window._consultDisciples('smart_sizer_v1', pair, null) : null;
    if (c && c.detail) { mult *= c.mod; dcStr = ` · disciples ${c.detail}`; }
  } catch(e) {}
  mult = Math.max(0.5, Math.min(1.4, mult * shMult));
  if (shStr || dcStr) _setBot('smart_sizer_v1', 'active', action + shStr + dcStr + ` (${wrSrc})`);
  S.botFleet.smart_sizer_v1.contributions = recent.length;
  return { mult, wr };
}

// ── ORCHESTRATOR ──
function runBotFleet(event, context) {
  initBotFleet();
  context = context || {};
  switch(event) {
    case 'tick':
      try { botExec(S.tradingAccount * 0.1, true); } catch(e) {}  // statut seulement — ne comptabilise RIEN (audit 09/08)
      try { botArb();        } catch(e) {}
      try { botScalper();    } catch(e) {}
      try { botFiscal();     } catch(e) {}
      try { botDCA();        } catch(e) {}
      try { botRescue();     } catch(e) {}
      try { botRebalance();  } catch(e) {}
      try { botSmartSizer(); } catch(e) {}
      break;
    case 'pre_trade': {
      const sizer = botSmartSizer(context.pair);   // [nutrition 09/08] la paire nourrit le Sharpe
      const exec = botExec(context.stake || 0);
      return { sizer, exec };
    }
    case 'post_trade':
      // [AUDIT FLOTTE · 09/08/2026] l'ancien crédit « 5% de tout gain » était une
      // revendication forfaitaire inventée (les +64.95 $ affichés). Remplacé par
      // l'impact marginal RÉEL et SIGNÉ du multiplicateur appliqué à CE trade :
      // pnl × (mult−1)/mult = la part du résultat due au sur/sous-dimensionnement.
      // Boost sur gain → crédit ; boost sur perte → débit ; réduction sur perte →
      // crédit (pertes évitées). Sans mult mémorisé sur la position : rien.
      if(S.botFleet.smart_sizer_v1 && typeof context.pnlUsd === 'number' && context.sizerMult && Math.abs(context.sizerMult - 1) > 0.01) {
        const marginal = context.pnlUsd * (context.sizerMult - 1) / context.sizerMult;
        S.botFleet.smart_sizer_v1.pnlContrib += marginal;
        try { _botJudgeMeasured('smart_sizer_v1', marginal, 'taille'); } catch(e) {}   // [MÉRITE DES BOTS · 26/09/2026] jugé sur l'effet de SA taille sur ce trade
      }
      break;
  }
}

// ═══ [SURVEILLANCE PERMANENTE · 27/09/2026] LA FLOTTE AU RYTHME DU SYSTÈME ═══
// Rams : « les bots doivent mener la danse… surveillance en permanence, et dès que l'occasion se présente, ils doivent trader ».
// Avant : runBotFleet('tick') n'était appelé QUE par l'écran — goPage(0) (ouvrir l'accueil) et renderFleetPanel (onglet flotte
// affiché) : dès que tu regardais ailleurs, les bots dormaient (backups 14 → 25/09 : Arbitrage et Scalper ~3 propositions par
// jour, DCA 2 depuis le 17/09, Fiscal et Rééquilibrage jamais, Sauvetage rien depuis le 14/09). Désormais le battement (08
// simTick) appelle _fleetHeartbeat pour CHAQUE mode en play, dans son propre contexte (positions, portefeuille, réglages) :
//  · les propositions d'ouverture (Arbitrage, Scalper, DCA) et le Rééquilibrage sont exécutés TOUT DE SUITE (plus de délai de
//    5 s), par l'entonnoir unique 09c — mêmes portes que le cerveau ; ouvert, le trade porte le bot (pos._bot) et le bot est
//    jugé sur SON résultat réel à la clôture ; refusé, l'occasion devient une affirmation jugée par le marché (04 executePending) ;
//  · le « Harvest » du Fiscal (fermer une position précise à perte, pour l'impôt) reste à valider par toi (règle v7.12 « la fermeture d'une position précise reste manuelle »).
// Les propositions portent leur mode (a.mode) : un mode n'exécute jamais celles d'un autre.
function _fleetHeartbeat() {
  if (typeof S === 'undefined' || !S) return 0;
  const mode = S.tradingMode || 'sim';
  try { if (typeof window._isModeRunning === 'function' && !window._isModeRunning(mode)) return 0; } catch (e) {}   // mode en pause : les bots aussi
  const all = Array.isArray(S.pendingActions) ? S.pendingActions : [];
  const others = all.filter(a => a && a.mode && a.mode !== mode);
  S.pendingActions = all.filter(a => a && (!a.mode || a.mode === mode));
  let n = 0;
  try {
    runBotFleet('tick');
    (S.pendingActions || []).forEach(a => { if (a && !a.mode) a.mode = mode; });
    const auto = (S.pendingActions || []).filter(a => a && a.action && a.action !== 'close_position' && !a._autoValidated);
    auto.forEach(a => {
      a._autoValidated = true;
      try { if (typeof executePending === 'function') { executePending(a.id, { auto: true }); n++; } } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
    });
  } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
  S.pendingActions = others.concat(S.pendingActions || []);
  return n;
}
window._fleetHeartbeat = _fleetHeartbeat;

// ── RENDER FLEET PANEL ──
function renderFleetPanel() {
  const el = document.getElementById('apanel-fleet');
  if(!el) return;
  initBotFleet();
  // [SURVEILLANCE PERMANENTE · 27/09/2026] plus de runBotFleet('tick') ici : les états viennent du battement (_fleetHeartbeat) — l'écran ne fait plus
  // tourner la flotte (avant : les bots ne travaillaient que quand tu ouvrais l'accueil ou cet onglet).

  const stats = {
    active:    0,
    executing: 0,
    alert:     0,
    contribs:  0,
    pnlTotal:  0
  };
  BOT_FLEET_IDS.forEach(id => {
    const b = S.botFleet[id];
    if(b.status === 'active')    stats.active++;
    if(b.status === 'executing') stats.executing++;
    if(b.status === 'alert')     stats.alert++;
    stats.contribs += b.contributions;
    stats.pnlTotal += b.pnlContrib;
  });

  const rows = BOT_FLEET_IDS.map(id => {
    const b = S.botFleet[id];
    const agent = (S.agents || []).find(a => a.id === id) || {};
    const name = agent.name || id;
    const emoji = agent.emoji || '🤖';
    const role = agent.type || agent.domain || '';
    const statusLabel = {
      idle: 'IDLE',
      scanning: 'SCAN',
      active: 'ACTIF',
      executing: 'EXEC',
      alert: 'ALERT'
    }[b.status] || b.status.toUpperCase();
    const elapsed = b.lastActionTs ? Math.floor((Date.now() - b.lastActionTs) / 1000) : 0;
    const elapsedLbl = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed/60)}m`;
    return `<div class="fleet-bot status-${b.status}">
      <div class="fleet-avatar">${emoji}</div>
      <div class="fleet-body">
        <div class="fleet-name">${name} <span class="fleet-name-role">· ${role}</span></div>
        <div class="fleet-action">${b.lastAction}</div>
        ${b.contributions > 0 ? `<div class="fleet-contrib">${b.contributions} contrib · ${b.pnlContrib>=0?'+':''}$${b.pnlContrib.toFixed(2)} · ${elapsedLbl} ago</div>` : ''}
      </div>
      <div class="fleet-status-chip ${b.status}">${statusLabel}</div>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="fleet-wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:10px;color:var(--gold);font-weight:700;">🤖 FLOTTE · 8 BOTS</span>
      <span style="font-size:8px;color:var(--t3);">${stats.active + stats.executing + stats.alert}/8 actifs</span>
    </div>
    <div class="fleet-summary">
      <div class="fleet-stat">
        <div class="fleet-stat-label">ACTIFS</div>
        <div class="fleet-stat-val" style="color:var(--up);">${stats.active + stats.executing}</div>
      </div>
      <div class="fleet-stat">
        <div class="fleet-stat-label">CONTRIBS</div>
        <div class="fleet-stat-val" style="color:var(--ice);">${stats.contribs}</div>
      </div>
      <div class="fleet-stat">
        <div class="fleet-stat-label">ÉCONOMIES</div>
        <div class="fleet-stat-val" style="color:${stats.pnlTotal>=0?'var(--up)':'var(--down)'};">${stats.pnlTotal>=0?'+':''}$${stats.pnlTotal.toFixed(2)}</div>
      </div>
    </div>
    ${rows}
    <div style="margin-top:8px;font-size:8px;color:var(--t3);line-height:1.5;text-align:center;">
      La flotte travaille en continu : exécution optimisée, surveillance DD, harvest fiscal, sizing Kelly.
    </div>
  </div>`;
}

// v5.8 FIX — fleet tab already in authoritative _V54_TABS declaration

// Override router to include fleet



// Expose
window._runBotFleet = runBotFleet;

// ════════════════════════════════════════════════════════════
// v5.9 — RESET COUNTERS + PERMANENT ARCHIVES
// ════════════════════════════════════════════════════════════
// Each reset button archives current state, then resets counters.
// Archives are preserved in S.archives.snapshots[] and queryable.
// Agents/bots retain learning context via archive references.
// ════════════════════════════════════════════════════════════

// Init archive state
if(typeof S !== 'undefined' && !S.archives) {
  S.archives = { snapshots: [], totalResets: 0 };
}

// UI state
let _settingsTab = 'reset';           // 'reset' or 'archives'
let _pendingReset = null;             // domain id awaiting confirmation
let _expandedArchiveIdx = null;

// ── DOMAIN DEFINITIONS ──
const RESET_DOMAINS = [
  {
    id: 'agents',
    icon: '🧠',
    name: 'Agents',
    metric: () => {
      // [COMPTEURS RÉGLAGES · 24/09/2026] avant : somme de learningEvents (41 M, 99 % de l'ère AA sur bougies fabriquées).
      // Désormais : les jugements RÉELS (EV/RE) reçus depuis « l'école ne note plus » (17/09), comptés à la source.
      const count = (S.agents || []).length;
      const real = S._realJudgments || 0;
      return `${count} agents · ${real} jugements réels depuis le 17/09`;
    },
    snapshot: () => ({
      agents: (S.agents || []).map(a => ({
        id: a.id, name: a.name, score: a.score, fitness: a.fitness,
        errors: a.errors, corrections: a.corrections, streak: a.streak,
        lastPnl: a.lastPnl, learningEvents: a.learningEvents || 0,
        memoryCount: (a.memory || []).length
      }))
    }),
    reset: () => {
      (S.agents || []).forEach(a => {
        a.score = 0;
        a.streak = 0;
        a.errors = 0;
        a.corrections = 0;
        a.lastPnl = 0;
        a.learningEvents = 0;
        a.memory = [];
      });
    }
  },
  {
    id: 'fleet',
    icon: '🤖',
    name: 'Flotte de Bots',
    metric: () => {
      if(!S.botFleet) return '8 bots · en attente';
      const tot = Object.values(S.botFleet).reduce((s,b) => s + (b.contributions || 0), 0);
      const pnl = Object.values(S.botFleet).reduce((s,b) => s + (b.pnlContrib || 0), 0);
      return `${tot} contribs · ${pnl>=0?'+':''}$${pnl.toFixed(2)} de P&L attribué`;   // [COMPTEURS RÉGLAGES · 24/09/2026] « économisés » ne voulait rien dire (−87 $ « économisés »)
    },
    snapshot: () => ({ fleet: { ...(S.botFleet || {}) } }),
    reset: () => {
      if(!S.botFleet) return;
      Object.values(S.botFleet).forEach(b => {
        b.contributions = 0;
        b.pnlContrib = 0;
        b.lastAction = 'Prêt';
        b.lastActionTs = 0;
        b.status = 'idle';
      });
    }
  },
  {
    id: 'trading',
    icon: '📊',
    name: 'Historique trading',
    metric: () => {
      const tot = (S.totalTrades || 0);
      const won = (S.winTrades || 0);
      return `${tot} trades · ${won} gagnants`;
    },
    snapshot: () => ({
      totalTrades: S.totalTrades,
      winTrades: S.winTrades,
      byPair: Object.fromEntries(
        Object.entries(S.pairStates || {}).map(([p, ps]) => [p, {
          totalTrades: ps.totalTrades,
          winTrades: ps.winTrades,
          tradesCount: (ps.trades || []).length
        }])
      )
    }),
    reset: () => {
      S.totalTrades = 0;
      S.winTrades = 0;
      Object.values(S.pairStates || {}).forEach(ps => {
        ps.totalTrades = 0;
        ps.winTrades = 0;
        ps.trades = [];
      });
    }
  },
  {
    id: 'fiscal',
    icon: '💰',
    name: 'Compteurs fiscaux',
    metric: () => {
      // [COMPTEURS RÉGLAGES · 24/09/2026] lisait S.fees.totalFees, clé inexistante → « frais $0 » depuis longtemps.
      const pnl = S.fees?.totalPnlGross || 0;
      const fees = (S.fees?.totalTradingFees || 0) + (S.fees?.totalSlippage || 0);
      return `P&L brut $${pnl.toFixed(2)} · frais + slippage $${fees.toFixed(2)}`;
    },
    snapshot: () => ({ fees: { ...(S.fees || {}) } }),
    reset: () => {
      if(S.fees) {
        Object.keys(S.fees).forEach(k => {
          if(typeof S.fees[k] === 'number') S.fees[k] = 0;
          else if(Array.isArray(S.fees[k])) S.fees[k] = [];
        });
      }
    }
  },
  {
    id: 'shadow',
    icon: '🪞',
    name: 'Miroir',   // [COMPTEURS RÉGLAGES · 24/09/2026] décision Rams : « miroir » — ce n'est pas un bot, c'est l'inverse de chaque trade réel (×0,92)
    metric: () => {
      const s = S.shadow || {};
      return `l'inverse de chaque trade : ${(s.virtualTrades || []).length} trades · ${s.virtualPnl>=0?'+':''}$${(s.virtualPnl || 0).toFixed(2)} si tu avais fait le contraire`;
    },
    snapshot: () => ({ shadow: { ...(S.shadow || {}) } }),
    reset: () => {
      S.shadow = { virtualPnl: 0, virtualTrades: [], wins: 0, losses: 0, lastRetrain: 0 };
    }
  },
  {
    id: 'dreams',
    icon: '💭',
    name: 'Journal de Rêves',
    metric: () => `${(S.dreamJournal || []).length} réflexions`,
    snapshot: () => ({ dreamJournal: [...(S.dreamJournal || [])] }),
    reset: () => { S.dreamJournal = []; }
  },
  {
    id: 'cascade',
    icon: '🦋',
    name: 'Cascade Décisions',
    metric: () => `${(S.decisionCascade || []).length} décisions tracées`,
    snapshot: () => ({ decisionCascade: [...(S.decisionCascade || [])] }),
    reset: () => { S.decisionCascade = []; }
  },
  {
    id: 'resonance',
    icon: '⚡',
    name: 'Événements Résonance',
    metric: () => `${(S.resonanceHistory || []).length} alignements détectés`,
    snapshot: () => ({ resonanceHistory: [...(S.resonanceHistory || [])] }),
    reset: () => { S.resonanceHistory = []; }
  },
  {
    id: 'heatmap',
    icon: '⏰',
    name: 'Heatmap Temporel',
    metric: () => {
      const h = S.heatmap || {};
      const hours = Object.keys(h.byHour || {}).length;
      const days = Object.keys(h.byWeekday || {}).length;
      return `${hours} heures · ${days} jours analysés`;
    },
    snapshot: () => ({ heatmap: JSON.parse(JSON.stringify(S.heatmap || {})) }),
    reset: () => { S.heatmap = { byHour: {}, byWeekday: {} }; }
  }
];

// ── ARCHIVE + RESET CORE ──
function archiveAndReset(domainId) {
  const domain = RESET_DOMAINS.find(d => d.id === domainId);
  if(!domain) return;
  if(!S.archives) S.archives = { snapshots: [], totalResets: 0 };

  // Snapshot current state
  const snapshot = {
    ts: Date.now(),
    domain: domain.id,
    domainName: domain.name,
    icon: domain.icon,
    data: domain.snapshot(),
    metricAtReset: domain.metric()
  };
  S.archives.snapshots.unshift(snapshot);
  S.archives.totalResets++;
  // Cap at 50 archives (FIFO to avoid memory bloat)
  if(S.archives.snapshots.length > 50) S.archives.snapshots.length = 50;

  // Reset the live counters
  domain.reset();

  if(typeof showToast === 'function') {
    showToast(`✓ ${domain.name} · archivé et réinitialisé`);
  }
  try { if(typeof saveState === 'function') saveState(true); } catch(e) {}
  renderSettingsPanel();
}

function archiveAndResetAll() {
  const totalBefore = S.archives?.snapshots?.length || 0;
  RESET_DOMAINS.forEach(d => archiveAndReset(d.id));
  if(typeof showToast === 'function') {
    showToast(`✓ Système entièrement réinitialisé · ${RESET_DOMAINS.length} domaines archivés`);
  }
}

// v7.5 · RESET COMPLET PREMIER LANCEMENT (version robuste)
// Efface IndexedDB + localStorage + état mémoire. L'app redémarre comme à l'installation.
async function factoryReset() {
  try {
    // 1. Flag global pour bloquer TOUTES les sauvegardes en cours (saveState, visibilitychange, etc.)
    window._resetInProgress = true;
    // v11quinquies · BUG FIX : poser le flag sessionStorage IMMÉDIATEMENT
    // pour bloquer le pagehide/freeze qui arrivera pendant le reload
    try { sessionStorage.setItem('nexus_factory_reset', '1'); } catch(e) {}
    
    try { if(typeof stopSim === 'function' && RT._simRunning) stopSim(); } catch(e) {}
    try { if(RT._simInterval) { clearInterval(RT._simInterval); RT._simInterval = null; } } catch(e) {}
    // 3. (autoSaveInterval géré désormais par 09b2 — pas besoin ici)
    // 4. (la connexion IDB n'est plus mise en cache — chaque openDB ouvre une nouvelle co)
    // 5. Effacer localStorage (toutes les clés NEXUS possibles)
    try {
      localStorage.removeItem(RT.SAVE_KEY);
      Object.keys(localStorage).forEach(k => {
        if(k && (k.toLowerCase().startsWith('nexus') || k === RT.SAVE_KEY)) localStorage.removeItem(k);
      });
    } catch(e) { console.warn('localStorage clear:', e); }
    // 6. Flag déjà posé en étape 1 — on ne le repose pas ici pour ne pas l'écraser
    // 7. Supprimer IndexedDB — avec timeout pour garantir la suite même si bloquée
    await new Promise((resolve) => {
      let done = false;
      const finish = () => { if(!done) { done = true; resolve(); } };
      try {
        const req = indexedDB.deleteDatabase(RT.DB_NAME);
        req.onsuccess = finish;
        req.onerror   = finish;
        req.onblocked = () => {
          console.warn('IndexedDB deletion blocked — on continue quand même');
          finish();
        };
        setTimeout(finish, 1500);  // garde-fou
      } catch(e) { finish(); }
    });
    // 8. Recharger la page — au prochain chargement, loadState verra le flag et ne restaurera rien
    if(typeof showToast === 'function') showToast('🔄 Reset complet · rechargement...');
    setTimeout(() => { try { location.reload(); } catch(e) { location.href = location.href; } }, 500);
  } catch(err) {
    console.error('factoryReset error:', err);
    window._resetInProgress = false;
    if(typeof showToast === 'function') showToast('⚠ Erreur reset · rechargez manuellement');
  }
}

window.factoryReset = factoryReset;

// ── MODAL CONTROL ──
function openSettingsModal() {
  const bd = document.getElementById('settingsBackdrop');
  if(!bd) return;
  bd.classList.add('active');
  _pendingReset = null;
  _expandedArchiveIdx = null;
  renderSettingsPanel();
  // Lock body scroll
  document.body.style.overflow = 'hidden';
}


// ═══ v7.12 · Q3:C · Long-press 2s pour confirmer reset ═══
// Remplace les sliders · maintenir appuyé 2 secondes pour exécuter le reset
const _LP_DURATION = 2000;  // 2 secondes
let _lpState = {};  // {id: {startTs, rafId, triggered}}

function _longPressStart(e, accId) {
  if (e && e.cancelable) e.preventDefault();
  // Nettoyer tout état précédent pour cet accId
  _longPressEnd(null, accId);
  _lpState[accId] = { startTs: Date.now(), intervalId: null, triggered: false };
  // Tick toutes les 50ms (plus fiable que RAF quand Brain anim est off)
  _lpState[accId].intervalId = setInterval(() => _lpTick(accId), 50);
  _lpTick(accId);  // premier tick immédiat
}

function _lpTick(accId) {
  const st = _lpState[accId];
  if (!st) return;
  const elapsed = Date.now() - st.startTs;
  const pct = Math.min(100, (elapsed / _LP_DURATION) * 100);
  
  const fill = document.getElementById('lpFill_' + accId);
  const label = document.getElementById('lpLabel_' + accId);
  if (fill) fill.style.width = pct + '%';
  if (label) {
    const remaining = Math.max(0, _LP_DURATION - elapsed);
    if (pct < 100) {
      label.textContent = '... ' + (remaining/1000).toFixed(1) + 's';
      label.style.color = '#f5a623';
    } else {
      label.textContent = '✓ RESET';
      label.style.color = 'var(--down)';
    }
  }
  
  if (pct >= 100 && !st.triggered) {
    st.triggered = true;
    // Stopper l'interval
    if (st.intervalId) { clearInterval(st.intervalId); st.intervalId = null; }
    _executeAccountReset(accId);
    // Reset visuel progressif
    setTimeout(() => {
      if (fill) fill.style.width = '0%';
      if (label) {
        label.textContent = '✓ FAIT';
        label.style.color = 'var(--up)';
      }
      setTimeout(() => {
        if (label) {
          label.textContent = 'MAINTENIR 2s';
          label.style.color = 'var(--t3)';
        }
      }, 1500);
    }, 200);
  }
}

function _longPressEnd(e, accId) {
  const st = _lpState[accId];
  if (!st) return;
  if (st.intervalId) { clearInterval(st.intervalId); st.intervalId = null; }
  if (!st.triggered) {
    // Annulation : retour à 0 doux
    const fill = document.getElementById('lpFill_' + accId);
    const label = document.getElementById('lpLabel_' + accId);
    if (fill) fill.style.width = '0%';
    if (label) {
      label.textContent = 'MAINTENIR 2s';
      label.style.color = 'var(--t3)';
    }
  }
  delete _lpState[accId];
}

window._longPressStart = _longPressStart;
window._longPressEnd = _longPressEnd;

// ═══ Fonctions de reset par compte ═══

function _executeAccountReset(accId) {
  if (typeof S === 'undefined' || !S) return;
  let msg = '';
  switch (accId) {
    case 'caisse':
      S.cashAccount = 0;
      msg = 'Caisse remise à 0';
      break;
    case 'trading':
      S.tradingAccount = 0;
      msg = 'Compte trading remis à 0';
      break;
    case 'fondsPropres':
      S.ownFundsInjected = 0;
      msg = 'Fonds propres remis à 0';
      break;
    case 'reserveFiscale':
      S.fiscalReserveAccount = 0;
      S.fiscalReserveLog = [];
      msg = 'Réserve fiscale remise à 0';
      break;
    case 'dette':
      // Reset ciblé de la dette levier · v7.12 amélioré : nettoyage complet
      S.leverageBorrowed = 0;
      S._autoLevBorrowed = 0;
      S._autoLevBase = 0;
      S._orphanDebtSince = 0;
      // Nettoyer aussi levBorrowed sur les positions ouvertes (cohérence)
      (S.openPositions || []).forEach(p => { p.levBorrowed = 0; });
      // Resync la réserve levier
      if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
      msg = 'Dette levier remise à 0 (positions nettoyées)';
      break;
  }
  // Recalculer portfolio
  S.portfolio = (typeof _computePortfolio==='function') ? _computePortfolio() : ((S.cashAccount||0)+(S.tradingAccount||0));   // [23/08] canonique
  if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
  
  // Log dans chain
  S.chainLog.push({
    icon: '🔄',
    desc: 'Reset par compte · ' + msg,
    hash: rndHash(), time: nowStr()
  });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  
  // Feedback visible clair
  if (typeof showToast === 'function') showToast('✅ ' + msg, 3500, 'user');
  
  // Vibration tactile (Android Chrome uniquement)
  try { if (navigator.vibrate) navigator.vibrate([80, 40, 80]); } catch(e) {}
  
  // Refresh UI
  if (typeof renderHome === 'function') { try { renderHome(); } catch(e) {} }
  if (typeof saveState === 'function') { try { saveState(true); } catch(e) {} }
}



// ═══ v7.12 · Agents cassés (≤ 80 T$) — [MASQUE CORRIGÉ · 26/09/2026] plus aucune revigoration : l'évolution les remplace ═══
// v7.12 LIVRAISON 7 · Affiche le détail des agents cassés
// Apprenants : « Faire évoluer maintenant » (_evolveBrokenNow). Bots et Évolueur : jugés sur leurs actes vérifiés, pas de bouton.
function _showBrokenAgentsDetail() {
  if (!S.agents) return;
  const broken = S.agents.filter(a => (a.fitness || 0) <= 80);
  if (broken.length === 0) {
    if (typeof showToast === 'function') showToast('Aucun agent cassé', 2500, 'user');
    return;
  }
  // Séparer bots vs agents apprenants
  const bots = broken.filter(a => a.isBot || a.isMeta);            // [MASQUE CORRIGÉ · 26/09/2026] l'Évolueur est jugé sur ses évolutions
  const learners = broken.filter(a => !a.isBot && !a.isMeta);

  const fmtAgent = (a) => {
    const dom = a.domain || a.role || '?';
    const fit = (a.fitness || 0).toFixed(0);
    const err = a.errors || 0;
    const streak = a.streak || 0;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;font-size:10px;font-family:ui-monospace,monospace;">
      <span style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
        <span style="font-size:14px;">${a.emoji || '🤖'}</span>
        <span style="color:var(--t1);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.name || dom}</span>
      </span>
      <span style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
        <span style="color:var(--down);font-weight:700;">fit ${fit}</span>
        ${streak < 0 ? `<span style="color:var(--down);font-size:9px;">−${Math.abs(streak)}</span>` : ''}
        ${err > 0 ? `<span style="color:var(--gold);font-size:9px;">${err} err</span>` : ''}
      </span>
    </div>`;
  };

  const botsHTML = bots.length > 0
    ? `<div style="font-size:10px;color:var(--gold);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px;display:flex;justify-content:space-between;align-items:center;">
         <span>🛡 ${bots.length} bot(s) / Évolueur</span>
         <span style="font-size:9px;opacity:.7;font-weight:600;letter-spacing:0;text-transform:none;">jugés sur leurs actes</span>
       </div>
       <div style="font-size:9px;color:var(--t3);line-height:1.4;margin-bottom:6px;">
         Jugés sur leurs actes : résultat réel de leurs trades, affirmations jugées dès que le marché tranche (±1 ATR), TWAP et Smart Sizer mesurés ; l'Évolueur sur ses évolutions. Leur fitness est leur bilan réel — aucun bouton ne la réécrit.
       </div>
       ${bots.map(fmtAgent).join('')}`
    : '';

  const learnersHTML = learners.length > 0
    ? `<div style="font-size:10px;color:var(--down);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px;display:flex;justify-content:space-between;align-items:center;">
         <span>📉 ${learners.length} agent(s) apprenant(s) cassé(s)</span>
         <span style="font-size:9px;opacity:.7;font-weight:600;letter-spacing:0;text-transform:none;">l'évolution les remplace</span>
       </div>
       ${learners.map(fmtAgent).join('')}
       <button onclick="_evolveBrokenNow(); document.getElementById('brokenAgentsDetail')?.remove();" style="width:100%;background:rgba(167,139,250,.15);color:var(--pur);border:1px solid rgba(167,139,250,.4);border-radius:8px;padding:10px;font-size:10.5px;font-weight:700;cursor:pointer;letter-spacing:.04em;margin-top:10px;">
         🧬 Faire évoluer les ${learners.length} agent(s) maintenant
       </button>`
    : (bots.length > 0 ? '<div style="font-size:9.5px;color:var(--t2);line-height:1.5;margin-top:14px;padding:10px;background:rgba(245,200,66,.05);border:1px solid rgba(245,200,66,.2);border-radius:8px;">💡 Aucun apprenant cassé : les bots et l\'Évolueur sont jugés sur leurs actes vérifiés.</div>' : '');

  const old = document.getElementById('brokenAgentsDetail');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'brokenAgentsDetail';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.92);z-index:99999;padding:20px;overflow:auto;backdrop-filter:blur(8px);';
  overlay.innerHTML = `
    <div style="max-width:500px;margin:auto;background:#0f1420;border:1px solid var(--down);border-radius:14px;padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-size:13px;font-weight:800;color:var(--down);">🩹 Agents cassés · ${broken.length}</div>
        <button onclick="document.getElementById('brokenAgentsDetail').remove()" style="background:var(--s2);border:1px solid var(--border);color:var(--t1);width:30px;height:30px;border-radius:8px;font-size:14px;cursor:pointer;">✕</button>
      </div>
      ${botsHTML}
      ${learnersHTML}
    </div>
  `;
  document.body.appendChild(overlay);
}
window._showBrokenAgentsDetail = _showBrokenAgentsDetail;

// [ÉVOLUTION SEULE · 26/09/2026] REVIGORATION AUTOMATIQUE RETIRÉE (go Rams 26/09 22:43, après rejeu sur la mémoire).
// Elle remettait à 400 T$, fenêtre vidée, tout apprenant ≤ 80 T$ dès qu'il y en avait 4 (toutes les 30 min au plus) : son vrai
// niveau disparaissait, il revotait avec le poids d'un agent moyen, et l'évolution (qui remplace le plus faible, 1 / h) ne le
// voyait plus. Rejeu backups 23 et 25/09, après la correction des abstentions (20260926n) : 7 et 6 vrais cassés, précision
// pondérée 8 à 36 % sur 7 à 49 vrais jugements ; revigorés, leur poids dans le vote passait de 5,6 % à 31,3 % (23/09) et de
// 4,2 % à 25,9 % (25/09) ; l'évolution visait trend_v2 (112 T$) au lieu de sentiment_v2 (50), onchain_v1 (286) au lieu de
// nlp_v1 (50). Désormais un siège faible garde sa vraie fitness (poids réduit d'autant dans le vote) et l'évolution le
// remplace : fin de learnFromOutcome (plus faible sous 150 T$ → remplacement immédiat, délai 1 h) et évolution continue (08).
// [MASQUE CORRIGÉ · 26/09/2026] Rams : « le masque, il faut le corriger ». Les revigorations MANUELLES faisaient la même chose — « Revigorer » :
// apprenants ≤ 80 T$ → 400, même génome, fenêtre vidée ; « Revigoration forcée » des bots : idem. Retirées. Le bouton fait la VRAIE
// correction : _evolveBrokenNow = l'évolution RÉELLE (07 triggerEvolution) de chaque apprenant ≤ 80 T$, tout de suite — génome
// recombiné + muté, l'ancien jugé en ombre (essai de l'Évolueur), fitness de naissance, probation ; le délai d'1 h de l'évolution
// automatique repart de là. Bots et Évolueur : pas de bouton, ils sont jugés sur leurs actes vérifiés (leur fitness = leur bilan).
function _evolveBrokenNow(silent) {
  if (typeof S === 'undefined' || !S || !Array.isArray(S.agents) || typeof triggerEvolution !== 'function') return 0;
  const weak = S.agents.filter(a => a && !a.isBot && !a.isMeta && (a.fitness || 0) <= 80).sort((a, b) => (a.fitness || 0) - (b.fitness || 0));
  let n = 0;
  weak.forEach(a => {
    const g0 = S._genCount;
    try { triggerEvolution(a, { manual: true, quiet: true, trig: 'M' }); } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }   // [ÉVOLUTION APPRISE · 28/09/2026] M : décision de Rams, jamais retenue par la règle
    if (S._genCount !== g0) n++;
  });
  if (n > 0) {
    try {
      if (!S.chainLog) S.chainLog = [];
      S.chainLog.push({ icon: '\uD83E\uDDEC', desc: 'Évolution demandée · ' + n + ' agent(s) ≤ 80 T$ remplacé(s) (nouveau génome, jugé à partir de zéro)', hash: typeof rndHash === 'function' ? rndHash() : '', time: typeof nowStr === 'function' ? nowStr() : '' });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    } catch (e) {}
  }
  if (!silent) {
    try { if (typeof showToast === 'function') showToast(n > 0 ? '🧬 ' + n + ' agent(s) faible(s) remplacé(s) par l\'évolution' : 'Aucun agent apprenant ≤ 80 T$', 4000, n > 0 ? 'win' : 'user'); } catch (e) {}
    try { if (typeof renderSettingsPanel === 'function') renderSettingsPanel(); } catch (e) {}
    try { if (typeof renderAgents === 'function') renderAgents(); } catch (e) {}
  }
  return n;
}
window._evolveBrokenNow = _evolveBrokenNow;

// v7.12 · Reset blacklist paires (LIVRAISON 5 · feedback amélioré)
window._resetPairBlacklists = function() {
  if (typeof S === 'undefined') return;
  if (!S._lossStreaks || Object.keys(S._lossStreaks).length === 0) {
    if (typeof showToast === 'function') showToast('Aucune paire blacklistée à réactiver', 2500, 'user');
    return;
  }
  // Compter AVANT le reset
  const now = Date.now();
  let count = 0;
  Object.values(S._lossStreaks).forEach(s => {
    if (s.blacklistedUntil && s.blacklistedUntil > now) count++;
  });
  if (count === 0) {
    if (typeof showToast === 'function') showToast('Aucune paire blacklistée à réactiver', 2500, 'user');
    return;
  }
  // Reset
  Object.keys(S._lossStreaks).forEach(pair => {
    const s = S._lossStreaks[pair];
    s.blacklistedUntil = 0;
    s.recentTrades = [];
  });
  if (typeof showToast === 'function') showToast('✅ ' + count + ' paire(s) réactivée(s)', 3000, 'win');
  if (!S.chainLog) S.chainLog = [];
  S.chainLog.push({
    icon: '🔓',
    desc: `Blacklist reset · ${count} paire(s) réactivée(s)`,
    hash: typeof rndHash==='function'?rndHash():'', time: typeof nowStr==='function'?nowStr():''
  });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  // Refresh le panneau Réglages pour MAJ compteurs
  if (typeof renderSettingsPanel === 'function') { try { renderSettingsPanel(); } catch(e) {} }
};

// v7.12 · Reset loss streaks (LIVRAISON 5 · feedback amélioré)
window._resetLossStreaks = function() {
  if (typeof S === 'undefined') return;
  // Compter avant
  let count = 0;
  if (S._lossStreaks) {
    Object.values(S._lossStreaks).forEach(s => {
      if ((s.count || 0) > 0) count++;
    });
  }
  if (count === 0) {
    if (typeof showToast === 'function') showToast('Aucun streak de pertes actif', 2500, 'user');
    return;
  }
  // Reset
  if (S._lossStreaks) {
    Object.keys(S._lossStreaks).forEach(pair => {
      S._lossStreaks[pair].count = 0;
      S._lossStreaks[pair].pausedAt = 0;
    });
  }
  if (typeof showToast === 'function') showToast('✅ ' + count + ' streak(s) de pertes effacé(s)', 3000, 'win');
  if (!S.chainLog) S.chainLog = [];
  S.chainLog.push({
    icon: '🔄',
    desc: 'Streaks de pertes reset · ' + count + ' paire(s)',
    hash: typeof rndHash==='function'?rndHash():'', time: typeof nowStr==='function'?nowStr():''
  });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  // Refresh le panneau Réglages pour MAJ compteurs
  if (typeof renderSettingsPanel === 'function') { try { renderSettingsPanel(); } catch(e) {} }
  if (typeof renderHome === 'function') { try { renderHome(); } catch(e) {} }
};

// v7.12 · exports slider remplacés par long-press (Q3:C)
// window._slideResetStart/Move/End · supprimés

function closeSettingsModal() {
  const bd = document.getElementById('settingsBackdrop');
  if(!bd) return;
  bd.classList.remove('active');
  _pendingReset = null;
  document.body.style.overflow = '';
}

function requestReset(domainId) {
  _pendingReset = domainId;
  renderSettingsPanel();
}

function cancelReset() {
  _pendingReset = null;
  renderSettingsPanel();
}

function toggleArchiveDetail(idx) {
  _expandedArchiveIdx = _expandedArchiveIdx === idx ? null : idx;
  renderSettingsPanel();
}

// ── RENDER ──
// v8.0 LIVRAISON 31 · JS thèmes RETIRÉ


// ═══════════════════════════════════════════════════════════════════════════
// v8.0 LIVRAISON 32 · SYSTÈME DE BACKUP / IMPORT / RESTORE
// ═══════════════════════════════════════════════════════════════════════════

const AURA_BACKUP_DB = 'aura_backups';
const AURA_BACKUP_STORE = 'backups';            // enregistrements complets { id, meta, state } (≈ 1,5 Mo chacun) — JAMAIS lus en bloc
const AURA_BACKUP_META_STORE = 'backups_meta';  // [GEL BOOT c] index léger { id, meta } — seul store lu au boot, pour la liste et la rotation
const AURA_BACKUP_DB_VERSION = 2;               // v1 → v2 : création de backups_meta (index reconstruit une fois, un enregistrement par tâche)
const AURA_LAST_AUTO_KEY = 'aura_last_auto_backup_date';
const AURA_VERSION = 'v8.0';

// Configuration des champs autorisés à l'IMPORT (Q1=B : config seulement)
// IMPORTANT : Cette liste est la sécurité absolue. Tout ce qui n'est pas ici
// ne peut PAS être écrasé par un import. Tes trades, ton capital, ton historique
// sont totalement protégés.
const AURA_IMPORT_ALLOWED_FIELDS = [
  // ─── Règles de trading globales ───
  'paperRealConfig',           // 41 paramètres du mode Réel
  'paperRealTimeframe',        // timeframe (5m, 15m, 1h, 4h, 1j)
  'paperRealActivePairs',      // ON/OFF par paire en mode Réel
  'realActivePairs',           // ON/OFF par paire en mode réel
  'realTimeframe',             // timeframe mode réel
  'tradingMode',               
  'autoTradeEnabled',
  'currentInterval',
  'tf',                        // timeframe
  'leverage',
  'leverageMaxMult',
  'slAtrMultiplier',
  'tpAtrMultiplier',
  'maxOpenPositions',
  'cooldownMinutes',
  'stakePercent',
  'autoPauseAfterLosses',
  'maxLossesBeforeStop',
  'profitSplitCaissePct',      // % de profit allant en caisse
  'fiatConvFeePct',            // frais de conversion fiat
  // ─── Configurations par paire ───
  'pairConfigs',
  'enabledPairs',
  // ─── Préférences UI ───
  'toastVerbose',
  'silentMode',
  'mode',                      // auto, manuel
  'botAutoMode',
  // ─── Calibrations et paramètres bots ───
  'calibrations',
  'agentParams',
  'feeConfig',                 // configuration des frais
  'taxConfig',                 // configuration fiscale
  // ─── Phases d'intelligence (toggles) ───
  'phase1Enabled',
  'phase2Enabled',
  'phase3Enabled',
  'phase4Enabled',
  'phase5Enabled',
  'phase6Enabled',
  // ─── Fitness des agents (overrides ciblés) ───
  '_agentFitnessOverrides'
];

// ── [GEL BOOT · 11/09/2026 · c] LE DOUBLE GEL DE DÉMARRAGE VIVAIT ICI — PROUVÉ PAR LE NAVIGATEUR (LoAF), PAS SUPPOSÉ ──
// Captures Rams 11/09 20:54 (DOC_V 20260911b) :
//   🐌 Gel 6.6s … LoAF 6.0s 03-per-pair-position-buttons-controls-buid.js:anonyme@261123 ← IDBRequest.onsuccess 6.0s
//   🐌 Gel 7.2s … LoAF 6.3s 03-per-pair-position-buttons-controls-buid.js:anonyme@262456 ← IDBRequest.onsuccess 6.1s
// Positions 261123 / 262456 (unités UTF-16 du fichier 20260911b) = les deux `req.onsuccess = () => resolve(req.result || [])`
// qui suivaient `store.getAll()` dans _saveBackupToDB (rotation) et _loadAllBackups (liste). `req.result` désérialise
// TOUS les enregistrements du store d'un coup (≈ 1,5 Mo chacun) → 6 s de JS pur, deux fois, à chaque boot (+3 s, 04).
// Pourquoi le store était énorme : 09b3 déclarait un `function _buildFullBackup()` global (sans meta) qui écrasait celui de
// ce fichier → chaque backup auto ajoutait un enregistrement SANS meta, la rotation plantait (b.meta.type) → jamais de
// suppression, jamais de aura_last_auto_backup_date → un enregistrement de plus À CHAQUE DÉMARRAGE depuis le 28/06.
// Correctif : (1) 09b3 renommé _buildFullBackupFile ; (2) store d'index `backups_meta` (v2) : liste et rotation ne lisent
// plus que les meta ; (3) les enregistrements complets ne sont lus qu'un par un, sur demande (RESTAURER) ou lors de la
// reconstruction unique de l'index (un par tâche, respiration 150 ms) ; les enregistrements sans meta sont supprimés.
// Interdit désormais dans ce fichier : `getAll()` sur AURA_BACKUP_STORE (banc-gel-backup.js le vérifie).

function _idbReq(req) {   // promesse sur une requête IDB (le résultat n'est lu qu'ici, dans onsuccess)
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function _idbTxDone(tx) {   // promesse sur la fin d'une transaction
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transaction annulée'));
  });
}
function _backupJournal(icon, desc) {
  try {
    if (typeof S === 'undefined' || !S || !Array.isArray(S.chainLog)) return;
    S.chainLog.push({ icon: icon, desc: desc, hash: (typeof rndHash === 'function') ? rndHash() : Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : new Date().toLocaleTimeString() });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  } catch(e) {}
}
function _isValidBackupMeta(m) {
  return !!(m && typeof m === 'object' && typeof m.date === 'number' && typeof m.type === 'string');
}

// Initialiser IndexedDB (v2 : backups + backups_meta)
function _openBackupDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AURA_BACKUP_DB, AURA_BACKUP_DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onblocked = () => { try { console.warn('aura_backups : ouverture bloquée par une autre connexion (v1 encore ouverte)'); } catch(e) {} };
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(AURA_BACKUP_STORE)) {
        const store = db.createObjectStore(AURA_BACKUP_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains(AURA_BACKUP_META_STORE)) {
        db.createObjectStore(AURA_BACKUP_META_STORE, { keyPath: 'id' });
        // rien d'autre ici : l'index est reconstruit APRÈS l'ouverture, un enregistrement par tâche (_ensureBackupIndex)
      }
    };
  });
}

// Reconstruction unique de l'index (v1 → v2) : clés seules d'abord (aucune désérialisation), puis UN enregistrement
// complet par tâche avec respiration — jamais deux d'affilée, jamais tous d'un coup. Idempotent : si count(backups) ===
// count(backups_meta), rien à faire. Un enregistrement sans meta valide (collision 03/09b3) est supprimé.
let _backupIndexChecked = false;   // une fois par session
async function _ensureBackupIndex() {
  if (_backupIndexChecked) return null;
  _backupIndexChecked = true;
  let db = null;
  try {
    db = await _openBackupDB();
    const tx0 = db.transaction([AURA_BACKUP_STORE, AURA_BACKUP_META_STORE], 'readonly');
    const nAll = await _idbReq(tx0.objectStore(AURA_BACKUP_STORE).count());
    const nMeta = await _idbReq(tx0.objectStore(AURA_BACKUP_META_STORE).count());
    if (nAll === nMeta) { db.close(); return { kept: nMeta, dropped: 0, rebuilt: false }; }
    const keys = await new Promise((resolve, reject) => {
      const out = [];
      const cur = db.transaction([AURA_BACKUP_STORE], 'readonly').objectStore(AURA_BACKUP_STORE).openKeyCursor();
      cur.onsuccess = () => { const c = cur.result; if (!c) return resolve(out); out.push(c.key); c.continue(); };
      cur.onerror = () => reject(cur.error);
    });
    let kept = 0, dropped = 0;
    for (const key of keys) {
      await new Promise(r => setTimeout(r, 150));   // respiration : le bot et le rendu passent entre deux enregistrements
      const tx = db.transaction([AURA_BACKUP_STORE, AURA_BACKUP_META_STORE], 'readwrite');
      const store = tx.objectStore(AURA_BACKUP_STORE);
      const metaStore = tx.objectStore(AURA_BACKUP_META_STORE);
      const rec = await _idbReq(store.get(key));   // UNE désérialisation (≈ 1,5 Mo) dans cette tâche, pas plus
      if (rec && _isValidBackupMeta(rec.meta)) { metaStore.put({ id: key, meta: rec.meta }); kept++; }
      else { store.delete(key); metaStore.delete(key); dropped++; }
      await _idbTxDone(tx);
    }
    db.close(); db = null;
    _backupJournal('🗂', 'Index backups IDB reconstruit · ' + kept + ' backup' + (kept > 1 ? 's' : '') + ' indexé' + (kept > 1 ? 's' : '') + ' · ' + dropped + ' enregistrement' + (dropped > 1 ? 's' : '') + ' sans meta supprimé' + (dropped > 1 ? 's' : '') + ' (collision _buildFullBackup 03/09b3 : un par démarrage depuis le 28/06)');
    if (typeof _refreshBackupsCache === 'function') { try { _refreshBackupsCache(); } catch(e) {} }
    return { kept: kept, dropped: dropped, rebuilt: true };
  } catch(e) {
    console.error('Erreur index backups:', e);
    try { if (db) db.close(); } catch(_e) {}
    return null;
  }
}

// Construire un backup complet de l'état AURA
function _buildFullBackup(label, type) {
  // v8.0 LIVRAISON 35 · Journal des modifications préservé
  let priorLog = [];
  try {
    // Récupérer le journal du backup le plus récent (s'il existe)
    if (_cachedBackupsList && _cachedBackupsList.length > 0) {
      const last = _cachedBackupsList[0];
      if (last.meta && Array.isArray(last.meta._modifications_log)) {
        priorLog = JSON.parse(JSON.stringify(last.meta._modifications_log));
      }
    }
  } catch(e) {}
  
  const backup = {
    meta: {
      version: AURA_VERSION,
      date: Date.now(),
      label: label || 'Backup',
      type: type || 'manual',
      app: 'AURA',
      hash: '',
      _modifications_log: priorLog  // Journal historique
    },
    state: {}
  };
  // Copie défensive de toutes les propriétés de S (UNE sérialisation : la même chaîne sert au clone et au hash)
  let str = '';
  try {
    str = JSON.stringify(S);
    backup.state = JSON.parse(str);
  } catch(e) {
    console.error('Erreur sérialisation S:', e);
    backup.state = {}; str = '{}';
  }
  // Hash simple pour vérifier intégrité
  try {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    backup.meta.hash = String(h);
    backup.meta.sizeChars = str.length;
  } catch(e) {}
  return backup;
}

// Sauvegarder un backup en IndexedDB avec rotation (rotation sur l'INDEX : aucun enregistrement complet relu)
async function _saveBackupToDB(backup) {
  try {
    if (!backup || !_isValidBackupMeta(backup.meta)) throw new Error('backup sans meta valide : refusé (collision _buildFullBackup ?)');
    const db = await _openBackupDB();
    const tx = db.transaction([AURA_BACKUP_STORE, AURA_BACKUP_META_STORE], 'readwrite');
    const store = tx.objectStore(AURA_BACKUP_STORE);
    const metaStore = tx.objectStore(AURA_BACKUP_META_STORE);

    // Ajouter le nouveau backup + sa ligne d'index (même transaction : jamais l'un sans l'autre)
    const id = await _idbReq(store.add(backup));
    metaStore.put({ id: id, meta: backup.meta });

    // Rotation : l'index seul (quelques Ko), jamais les enregistrements complets
    const metas = (await _idbReq(metaStore.getAll())) || [];
    const byType = (t) => metas.filter(m => m && _isValidBackupMeta(m.meta) && m.meta.type === t).sort((a, b) => b.meta.date - a.meta.date);

    // Garder 7 autos, 5 manuels, 3 pre-import
    const toDelete = [
      ...byType('auto').slice(7),
      ...byType('manual').slice(5),
      ...byType('pre-import').slice(3)
    ];
    for (const old of toDelete) { store.delete(old.id); metaStore.delete(old.id); }

    await _idbTxDone(tx);
    db.close();
    return true;
  } catch(e) {
    console.error('Erreur sauvegarde backup:', e);
    return false;
  }
}

// Récupérer la LISTE des backups triés par date desc : { id, meta } uniquement (index), jamais l'état.
// L'état complet d'un backup se lit avec _getBackup(id), un seul à la fois, sur demande.
async function _loadAllBackups() {
  try {
    const db = await _openBackupDB();
    const tx = db.transaction([AURA_BACKUP_META_STORE], 'readonly');
    const metas = (await _idbReq(tx.objectStore(AURA_BACKUP_META_STORE).getAll())) || [];
    db.close();
    return metas.filter(m => m && _isValidBackupMeta(m.meta)).sort((a, b) => b.meta.date - a.meta.date);
  } catch(e) {
    console.error('Erreur chargement backups:', e);
    return [];
  }
}

// Lire UN backup complet (meta + state) par id — la seule lecture d'un enregistrement complet hors reconstruction d'index
async function _getBackup(id) {
  try {
    const db = await _openBackupDB();
    const tx = db.transaction([AURA_BACKUP_STORE], 'readonly');
    const rec = await _idbReq(tx.objectStore(AURA_BACKUP_STORE).get(id));
    db.close();
    return rec || null;
  } catch(e) {
    console.error('Erreur lecture backup:', e);
    return null;
  }
}
window._getBackup = _getBackup;

// Supprimer un backup par id (enregistrement + ligne d'index, même transaction)
async function _deleteBackup(id) {
  try {
    const db = await _openBackupDB();
    const tx = db.transaction([AURA_BACKUP_STORE, AURA_BACKUP_META_STORE], 'readwrite');
    tx.objectStore(AURA_BACKUP_STORE).delete(id);
    tx.objectStore(AURA_BACKUP_META_STORE).delete(id);
    await _idbTxDone(tx);
    db.close();
    return true;
  } catch(e) {
    return false;
  }
}

// Backup auto à la 1ère ouverture de la journée (option Y)
async function _checkAutoBackup() {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const lastAutoDate = localStorage.getItem(AURA_LAST_AUTO_KEY);
    if (lastAutoDate === today) {
      return; // Déjà fait aujourd'hui
    }
    // Créer le backup auto (celui de CE fichier : { meta, state } — 09b3 ne l'écrase plus)
    const backup = _buildFullBackup('Auto · ' + new Date().toLocaleString('fr-FR'), 'auto');
    if (!backup || !_isValidBackupMeta(backup.meta)) {
      _backupJournal('⚠️', 'Backup auto refusé : _buildFullBackup sans meta (collision de nom ?)');
      return;
    }
    const ok = await _saveBackupToDB(backup);
    if (ok) {
      localStorage.setItem(AURA_LAST_AUTO_KEY, today);
      if (typeof showToast === 'function') {
        showToast('💾 Backup auto créé', 1500);
      }
    }
  } catch(e) {
    console.error('Erreur backup auto:', e);
  }
}

// Export téléchargeable
function exportBackup(format) {
  try {
    const backup = _buildFullBackup('Manuel · ' + new Date().toLocaleString('fr-FR'), 'manual');
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = 'aura_backup_' + dateStr + '.' + (format || 'json');
    const content = JSON.stringify(backup, null, 2);
    const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    // Sauvegarder aussi en IndexedDB (manuel)
    _saveBackupToDB(backup).then(() => {
      if (typeof renderSettingsPanel === 'function') renderSettingsPanel();
    });
    
    if (typeof showToast === 'function') {
      showToast('📦 Backup exporté · ' + (backup.meta.sizeChars / 1024 | 0) + ' Ko', 3000, 'win');
    }
  } catch(e) {
    console.error('Erreur export backup:', e);
    if (typeof showToast === 'function') showToast('❌ Erreur export : ' + e.message, 4000, 'loss');
  }
}
window.exportBackup = exportBackup;

// Import sélectif (Q1=B : config seulement, pas de données)



// ════════════════════════════════════════════════════════════════════════
// [MÉRITE DES BOTS · 26/09/2026] MÉRITE MESURÉ DES BOTS — remplace l'audit des vetos du 15/08 (jamais alimenté : relevé cassé, et son écriture
// additive de fitness était effacée au jugement suivant). Un bot est jugé sur SES actes, jamais sur le résultat du système :
//  · prédictions vérifiables (_botPredict) : propositions Arbitrage / Scalper / DCA (le prix ira dans ce sens), Fiscal et
//    Rééquilibrage (fermer / réduire est juste si le prix continue contre la position), veto du Risk Bot (le trade refusé
//    aurait perdu), flatten du Sauvetage (les prix continuent contre les positions fermées) ;
//    [SURVEILLANCE PERMANENTE · 27/09/2026] Rams : « je ne veux pas de limite de 30 min en dur ». Une affirmation est jugée DÈS QUE LE MARCHÉ
//    TRANCHE : premier franchissement de ±1 ATR (14 bougies de la timeframe, mesuré à sa création) sur le dernier prix réel
//    accepté — plus d'horizon de 30 min, plus de seuil fixe de 0,3 % (rejeu backups 14 → 25/09 : sous l'ancienne règle, 60 %
//    des affirmations du Scalper, 54 % de l'Arbitrage et 95 % du DCA n'étaient JAMAIS jugées — l'autre raison des 350 figés).
//    Une seule affirmation ouverte par bot / paire / sens (plus de fenêtre de 30 min) ; elle reste ouverte jusqu'à ce que le
//    marché tranche. Les trades ouverts par un bot sont jugés à leur résultat réel (02 closePosition, pos._bot) ;
//  · résultats mesurés (_botJudgeMeasured) : économie TWAP de l'Exécution (09c), effet de la taille du Smart Sizer.
// Seulement en EV / RE (un bot qui a regardé les bougies fabriquées de l'école n'est pas jugé). S.botMerit : bilan par bot.
// ════════════════════════════════════════════════════════════════════════
function _botMeritRow(botId) {
  if (!S.botMerit) S.botMerit = {};
  return S.botMerit[botId] || (S.botMerit[botId] = { good: 0, bad: 0, inconclusive: 0, last: null });
}
function _botJudge(botId, good, weight, kind) {
  const a = (S.agents || []).find(x => x && x.id === botId);
  if (!a || typeof _fitJudge !== 'function') return null;
  _fitJudge(a, good ? 1 : -1, Math.max(0.01, Number(weight) || 0));
  a.streak = good ? (a.streak || 0) + 1 : 0;
  a.learningEvents = (a.learningEvents || 0) + 1;
  const m = _botMeritRow(botId);
  if (good) m.good++; else m.bad++;
  m.last = { kind: kind || '', good: !!good, w: Math.round((Number(weight) || 0) * 1000) / 1000, t: Date.now() };
  return a.fitness;
}
// Résultat mesuré signé (en $) d'un acte : jugé tout de suite, en EV / RE, s'il n'est pas nul.
function _botJudgeMeasured(botId, value, kind) {
  if (!S || (S.tradingMode !== 'paperReal' && S.tradingMode !== 'real')) return null;
  const v = Number(value);
  if (!(typeof v === 'number' && isFinite(v)) || Math.abs(v) < 0.001) return null;
  return _botJudge(botId, v > 0, Math.abs(v), kind);
}
// ═══ [MISE AU MÉRITE · 27/09/2026] LA MISE D'UN BOT SUIT SON MÉRITE MESURÉ (go Rams 27/09 01:37) ═══
// « Plus il a raison, plus il mise ; s'il se trompe, il mise le minimum. » Mesure : SES actes jugés (trades au résultat réel,
// affirmations au premier franchissement de ±1 ATR) sur la fenêtre de la fitness — précision pondérée p, mêmes poids que la
// fitness (espérance E = 2p − 1 ; fitness = 350 + 1000·E). Rejeu avant livraison (app réelle, 90 h de bougies réelles, occasions
// jugées, frais 0,2 % aller-retour, mises EV : base 75 $, minimum 52,5 $, plafond 157 $) — la version « mise proportionnelle à
// la fitness dans les deux sens » montait la mise après des séries chanceuses de 5 à 10 actes et faisait PERDRE PLUS l'Arbitrage
// (−6,73 $ contre −5,03 $) et le DCA (−3,93 $ contre −3,30 $). Retenu :
//  · il se trompe au moins autant qu'il a raison (p ≤ 50 % : fitness ≤ 350, sur ≥ 5 actes) → mult 0 : mise minimum (plancher de l'entonnoir,
//    5 % du compte — la mise normale). [DÉCISION COMMUNE · 27/09/2026] cette mise ne sert plus qu'à TA validation à la main d'une proposition :
//    en automatique, aucun bot n'ouvre seul (04) — sa lecture de la paire est une voix de la décision commune, pesée par son bilan ;
//  · avantage PROUVÉ — borne basse de Wilson à 95 % au-dessus de 50 %, sur l'effectif pondéré (Kish) → mise × (350 + 1000·(2·borne − 1)) / 350 :
//    la loi du poids d'un agent dans le vote (proportionnel à sa fitness), appliquée à la part PROUVÉE seulement ; bornée par la politique
//    de capital de l'entonnoir comme tout trade ([SANS PLAFOND 15 % · 27/09/2026] : le plafond de 15 % du compte, sans raison, est retiré) ;
//  · sinon (moins de 5 actes, ou avantage pas encore prouvé) → mise de base.
// Rejeu : pertes des bots −18 % (−22,31 $ → −18,27 $), le Scalper à la mise minimum sur 60 de ses 71 trades ; aucun bot prouvé.
function _botStakeMult(botId) {
  try {
    const a = (S.agents || []).find(x => x && x.id === botId);
    const W = (typeof _fitWindow === 'function') ? _fitWindow() : 60;
    const js = (a && Array.isArray(a._judgments)) ? a._judgments.slice(-W) : [];
    if (js.length < FIT_MIN_N) return { mult: 1, p: null, lo: null, n: js.length, why: 'pas encore de preuve (' + js.length + ' acte' + (js.length > 1 ? 's' : '') + ' jugé' + (js.length > 1 ? 's' : '') + ')' };
    let sw = 0, se = 0, sw2 = 0;
    js.forEach(j => { const w = Math.max(0.01, Number(j && j.w) || 0); sw += w; se += ((j && j.s) >= 0 ? 1 : -1) * w; sw2 += w * w; });
    const E = sw > 0 ? se / sw : 0, p = (E + 1) / 2, n = sw2 > 0 ? (sw * sw) / sw2 : js.length, z = 1.96;
    const lo = (p + z * z / (2 * n) - z * Math.sqrt(Math.max(0, p * (1 - p) / n + z * z / (4 * n * n)))) / (1 + z * z / n);   // Wilson
    const pc = Math.round(p * 100), lc = Math.round(lo * 100);
    if (E <= 0) return { mult: 0, p: p, lo: lo, n: js.length, why: 'se trompe au moins autant qu\'il a raison (' + pc + ' % juste, pondéré)' };
    if (lo > 0.5) return { mult: (350 + 1000 * (2 * lo - 1)) / 350, p: p, lo: lo, n: js.length, why: 'avantage prouvé : au moins ' + lc + ' % juste (95 %)' };
    return { mult: 1, p: p, lo: lo, n: js.length, why: 'avantage pas encore prouvé (' + pc + ' % juste, ' + js.length + ' actes)' };
  } catch (e) { return { mult: 1, p: null, lo: null, n: 0, why: 'mesure indisponible' }; }
}
// [SURVEILLANCE PERMANENTE · 27/09/2026] ATR relatif (14 bougies de la timeframe du mode, bougies réelles sinon celles de la paire) : la borne d'une
// affirmation — ce que le marché de CETTE paire appelle un vrai mouvement (plus un 0,3 % identique pour BTC et PEPE).
function _botAtrPct(pair) {
  try {
    const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
    let c = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf]) || null;
    if (!Array.isArray(c) || c.length < 15) { const ps = S.pairStates && S.pairStates[pair]; c = ps && ps.candles; }
    if (!Array.isArray(c) || c.length < 15) return null;
    let sum = 0, m = 0;
    for (let i = c.length - 14; i < c.length; i++) {
      const x = c[i], y = c[i - 1];
      if (!x || !y || !(x.c > 0) || !(y.c > 0)) continue;
      sum += Math.max(x.h - x.l, Math.abs(x.h - y.c), Math.abs(x.l - y.c)); m++;
    }
    const last = c[c.length - 1] && c[c.length - 1].c;
    const v = (m >= 10 && last > 0) ? (sum / m) / last : null;
    return (v > 0 && isFinite(v)) ? v : null;
  } catch (e) { return null; }
}
function _botHasOpenClaim(botId, pair, dir) {
  return Array.isArray(S._botPredictions) && S._botPredictions.some(q => q && q.bot === botId && q.pair === pair && (!dir || q.dir === dir));
}
// Le bot est-il déjà engagé sur cette paire ? Position ouverte sur la paire (une par paire : l'entonnoir refuserait) ou
// affirmation encore ouverte du même bot, même sens (il l'a déjà dit : le répéter n'apporte rien).
function _botAlreadyActing(botId, pair, dir) {
  try {
    if ((S.openPositions || []).some(p => p && p.pair === pair)) return true;
    return _botHasOpenClaim(botId, pair, dir);
  } catch (e) { return false; }
}
// Affirmation : « le prix de `pair` ira dans le sens `dir` » (long = hausse). Bornes ±1 ATR fixées à la création.
function _botPredict(botId, pair, dir, kind) {
  try {
    if (!S || (S.tradingMode !== 'paperReal' && S.tradingMode !== 'real')) return false;
    if (dir !== 'long' && dir !== 'short') return false;
    const px = (typeof _rcLastPrice === 'function') ? _rcLastPrice(pair) : 0;
    if (!(px > 0) || (typeof _rcPriceAge === 'function' && _rcPriceAge(pair) > 120000)) return false;
    if (!Array.isArray(S._botPredictions)) S._botPredictions = [];
    if (_botHasOpenClaim(botId, pair, dir)) return false;
    const atr = _botAtrPct(pair);
    if (!(atr > 0)) return false;
    S._botPredictions.push({ bot: botId, pair: pair, dir: dir, px: px, ts: Date.now(), kind: kind || '', atr: atr, up: px * (1 + atr), dn: px * (1 - atr) });
    if (S._botPredictions.length > 300) S._botPredictions.splice(0, S._botPredictions.length - 300);
    return true;
  } catch (e) { return false; }
}
// Jugement des affirmations, à chaque battement (08) : borne haute atteinte → le long avait raison ; borne basse → le short.
function _botMeritAudit() {
  try {
    if (typeof S === 'undefined' || !S || !Array.isArray(S._botPredictions) || !S._botPredictions.length) return 0;
    const keep = [];
    let n = 0;
    S._botPredictions.forEach(q => {
      if (!q || !(q.px > 0)) return;
      if (!(q.up > 0 && q.dn > 0)) {   // affirmation de l'ancienne règle (30 min) : bornes posées maintenant sur son prix d'origine
        const a0 = _botAtrPct(q.pair);
        if (!(a0 > 0)) { keep.push(q); return; }
        q.atr = a0; q.up = q.px * (1 + a0); q.dn = q.px * (1 - a0);
      }
      const px = (typeof _rcLastPrice === 'function') ? _rcLastPrice(q.pair) : 0;
      if (!(px > 0) || (typeof _rcPriceAge === 'function' && _rcPriceAge(q.pair) > 120000)) { keep.push(q); return; }   // prix figé : on attend
      const up = px >= q.up, dn = px <= q.dn;
      if (!up && !dn) { keep.push(q); return; }   // le marché n'a pas encore tranché
      _botJudge(q.bot, (up && q.dir === 'long') || (dn && q.dir === 'short'), Math.abs(px - q.px) / q.px * 100, q.kind);
      n++;
    });
    S._botPredictions = keep;
    return n;
  } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} return 0; }
}
// Migration unique : les fenêtres des bots copiaient le résultat du système (identiques pour les 9) — rien du bot n'y est
// perdu. Effacées une fois, fitness neutre 350 (« pas encore de preuve »), après la restauration de l'état.
(function _botMeritMigrate() {
  let _t = 0;
  const _iv = setInterval(function () {
    _t++;
    let ready = false;
    try { ready = !!window._stateReady; } catch(e) {}
    if (!ready && _t < 120) return;
    clearInterval(_iv);
    try {
      if (typeof S === 'undefined' || !S || !Array.isArray(S.agents)) return;
      let changed = false;
      if (!S._botMeritMigrated) {
        let n = 0;
        S.agents.forEach(a => { if (a && a.isBot) { a._judgments = []; a.fitness = 350; a.streak = 0; n++; } });
        S._botMeritMigrated = true; changed = true;
        try { delete S._riskVetoes; } catch(e) {}
        try {
          if (!S.chainLog) S.chainLog = [];
          S.chainLog.push({ icon: '\uD83E\uDDEE', desc: 'Bots : ' + n + ' fenêtres effacées (elles copiaient le résultat du système, identiques pour tous) · fitness neutre 350 · désormais jugés sur leurs actes vérifiés', hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        } catch(e) {}
      }
      if (!S._metaMeritMigrated) {   // [MÉRITE DE L'ÉVOLUEUR · 26/09/2026] même raison pour l'Évolueur : sa fenêtre copiait le résultat du système
        S.agents.forEach(a => { if (a && a.isMeta) { a._judgments = []; a.fitness = 350; a.streak = 0; } });
        S._metaMeritMigrated = true; changed = true;
        try { S.chainLog.push({ icon: '\uD83E\uDDEC', desc: 'Évolueur : fenêtre effacée (elle copiait le résultat du système) · fitness neutre 350 · désormais jugé sur ses évolutions (nouveau génome contre ancien)', hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() }); } catch(e) {}
      }
      if (!S._abstMigrated) {   // [ABSTENTION · 26/09/2026] une abstention était jugée « fausse » au poids plancher 0,01
        // Un jugement au poids plancher est soit une abstention (vote nul : toujours −1), soit un vrai vote minuscule sur un
        // mouvement minuscule (±1, poids ≤ 0,01 : presque aucune information). Indiscernables après coup : les deux partent, dans
        // les deux sens (pas de biais). Rejeu backups 23 et 25/09 : 14 et 13 apprenants « cassés » (≤ 80 T$) → 7 et 6.
        let nA = 0, nJ = 0;
        S.agents.forEach(a => {
          if (!a || a.isBot || a.isMeta || !Array.isArray(a._judgments)) return;
          const before = a._judgments.length;
          const kept = a._judgments.filter(j => j && Number(j.w) > 0.0100001);
          const removed = before - kept.length;
          if (!removed) return;
          const removedNeg = a._judgments.filter(j => j && !(Number(j.w) > 0.0100001) && j.s < 0).length;
          a._judgments = kept; nA++; nJ += removed;
          a.errors = Math.max(0, (a.errors || 0) - removedNeg);   // chaque abstention comptait une « erreur » (→ « auto-recalibré »)
          const _fa = _fitOf(kept, _fitWindow());
          if (_fa !== null) a.fitness = _fa;
          else if (before >= FIT_MIN_N) a.fitness = 350;   // la fitness venait d'une fenêtre d'abstentions : plus aucune preuve → neutre
        });
        S._abstMigrated = true; changed = true;
        try {
          if (!S.chainLog) S.chainLog = [];
          S.chainLog.push({ icon: '\u2696\uFE0F', desc: 'Abstentions : ' + nJ + ' jugements au poids plancher retirés des fenêtres de ' + nA + ' agents (une abstention était jugée « fausse ») · fitness recalculée', hash: Math.random().toString(16).slice(2, 10), time: (typeof nowStr === 'function') ? nowStr() : '' });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        } catch(e) {}
      }
      if (!S._degelMigrated) try {   // [DÉGEL DES VOIX · 02/10/2026] une fois, après la restauration (section DÉGEL DES VOIX, plus haut) ; une erreur ici
        // n'empêche pas la sauvegarde des autres migrations (le drapeau n'est posé qu'en fin de bloc : refaite au prochain démarrage)
        const lines = [], GD = (typeof GENOME_DEFAULTS !== 'undefined') ? GENOME_DEFAULTS : null;
        const sec = S.agents.find(a => a && a.id === 'security_v1');
        if (sec) {   // son record (bilan aux horizons, jugements, fitness) a été gagné par le faux achat du feu vert (+0,05 à chaque cycle)
          const f0 = Math.round(Number(sec.fitness) || 0), nj = Array.isArray(sec._judgments) ? sec._judgments.length : 0;
          if (typeof _vjReset === 'function') _vjReset('security_v1');   // bilan aux horizons et votes encore en attente
          if (S.dcThreshold && S.dcThreshold.vHz && S.dcThreshold.vHz.security_v1) throw new Error('dégel : bilan aux horizons de security_v1 non effacé');   // sinon son poids resterait : rien n'est touché, refait au prochain démarrage
          sec._judgments = []; sec.fitness = 350; sec.streak = 0;
          const w0 = Math.round(Number(sec.mktWallet) || 0);
          sec.mktWallet = 350; sec.mktGain = 0; sec.mktN = 0; sec.mktGen = (Number(sec.mktGen) || 0) + 1;   // T$ du marché gagnés par les mêmes faux achats : comme à une naissance (07) ; ses mises encore ouvertes ne lui sont ni payées ni rendues
          lines.push('Gardien Sécurité : son statut ne compte plus comme un sens (feu vert = achat, alerte / veto = vente) · record effacé (gagné par ce faux achat : fitness ' + f0 + ', bilan aux horizons, ' + nj + ' jugement(s) à la bougie, ' + w0 + ' T$ au marché) · fitness neutre 350, 350 T$');
        }
        const DEAD = { harmonic_v1: ['rsiHigh', 'rsiLow', 'bbHigh', 'bbLow'], sentiment_v2: ['rsiHigh', 'rsiLow', 'rsiW'], contrarian_v2: ['rsiHigh', 'rsiLow'], mean_rev_v1: ['bbHigh', 'bbLow'] };   // gènes qui n'ont jamais vu leur entrée (RSI / Bollinger lus à vide)
        Object.keys(DEAD).forEach(id => {
          const def = GD && GD[id]; if (!def) return;
          const reset = g => { let n = 0; if (g && typeof g === 'object') DEAD[id].forEach(k => { if ((k in def) && Number(g[k]) !== def[k]) { g[k] = def[k]; n++; } }); return n; };
          const g = S.genome && S.genome[id], ch = [];
          if (g && typeof g === 'object') DEAD[id].forEach(k => { if (!(k in def)) return; const v = Number(g[k]); if (v !== def[k]) { ch.push(k + ' ' + (isFinite(v) ? Math.round(v * 1000) / 1000 : '—') + ' → ' + def[k]); g[k] = def[k]; } });
          const tr = S.evoTrials && S.evoTrials[id];   // essai d'évolution en cours : l'ancien génome reçoit les mêmes valeurs (l'essai juge les autres gènes)
          if (tr && tr.oldG && typeof tr.oldG === 'object') reset(tr.oldG);
          let nH = 0; (S.genomeHistory && Array.isArray(S.genomeHistory[id]) ? S.genomeHistory[id] : []).forEach(h => { if (h && reset(h.g)) nH++; });   // versions archivées : l'évolution (retour à la meilleure version, recombinaison) ne les ramènera pas
          if (ch.length || nH) lines.push('Génome ' + id + ' : gènes jamais exercés (RSI / Bollinger lus à vide) remis à leur valeur de départ' + (ch.length ? ' — ' + ch.join(', ') : '') + (nH ? ' · ' + nH + ' version(s) archivée(s) aussi' : ''));
        });
        S._degelMigrated = true; changed = true;
        try {
          if (!S.chainLog) S.chainLog = [];
          lines.forEach(d => S.chainLog.push({ icon: '\uD83E\uDDCA', desc: d, hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : '' }));
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        } catch(e) {}
      } catch(e) { try { window._decErr && window._decErr(e); } catch(_e) {} }
      if (changed) { try { if (typeof saveState === 'function') saveState(true); } catch(e) {} }
    } catch(e) {}
  }, 500);
})();
// ═══ [DÉCISION COMMUNE · 27/09/2026] UNE SEULE DÉCISION PAR PAIRE (go Rams 27/09 11:41) ═══
// Rams : « les bots rassemblent toutes leurs infos, leurs analyses et leur savoir vécu, avec l'appui de leur hybride dédié, et une décision
// tombe par un consensus commun pour ouvrir ou fermer un trade ». Avant (vérifié dans le code, backup 27/09 10:54) : trois décideurs qui ne se
// parlaient pas — chaque bot ouvrait SEUL sur UN signal (ses 3 hybrides ne pouvaient que le retenir, un seul regardait le sens) ; le cerveau
// décidait avec des poids posés à la main (0,3 composite + 0,5 agents + 0,2 LMSR, bonus d'alignement ×1,2) ; le conseil laissait passer les
// trades de bot sans avis net ; la bascule LMSR (07) fermait les longs des bots en 2 s.
// Maintenant, pour chaque paire, à chaque cycle du cerveau, TOUTES les voix :
//  · chaque agent : son vote sur LA paire (sa mémoire s'ajoute ensuite, comme avant) ;
//  · chaque bot de trading (Scalper, Arbitrage, DCA) : sa lecture de LA paire (_botView, mêmes règles que son scan), pesée par l'avis de ses
//    3 hybrides dédiés (_consultDisciples, ×0,85 à ×1,15). Le LMSR entre par le Scalper, dont c'est le seul signal ;
//  · l'analyse technique + fondamentale (composite, avant 30 % d'office) : une voix comme les autres (S.dcVoices.composite).
// Chaque voix pèse son BILAN MESURÉ E = (justes − fausses) pondérées sur la fenêtre de la fitness, au moins 5 actes jugés ; une voix qui se
// trompe au moins autant qu'elle a raison pèse 0 — aucun poids posé à la main. C = Σ bilan × voix / Σ bilan de toutes les voix qui ont un
// bilan (une voix prouvée qui s'abstient dilue). C devient le signal du cerveau (sens, conviction, mise) ; la sortie « bascule » (07) le relit.
// BILAN SUR L'AVENIR : avant, à chaque cycle, le vote (calculé sur le prix du moment) était jugé sur le mouvement depuis la dernière clôture —
// déjà vu par le vote — et, à la fermeture, sur le vote de la FIN (qui avait vu tout le trajet). Rejeu : bilans affichés jusqu'à 83 % juste pour
// des agents qui, jugés sur la suite, ont raison 45 à 54 % du temps (corrélation bilan ↔ prévision 0,36). Désormais : les votes pris au cycle
// PRÉCÉDENT de la paire sont jugés sur le mouvement survenu DEPUIS (_dcForwardJudge) ; à la fermeture, les votes pris à l'OUVERTURE (02).
// Rejeu : corrélation bilan ↔ prévision 0,36 → 0,77. Les bots gardent leurs affirmations (±1 ATR) et leurs trades ouverts à la main.
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres, état de départ = backup précédent, frais du barème) : actuel (20260927f) : tirage 1 375 trades, avant frais −0,68 $, frais 30,74 $, net −31,41 $ ; tirage 2 381 trades, avant frais +3,70 $, frais 39,67 $, net −35,97 $ — décision commune (ce code) : tirage 1 146 trades, avant frais +5,11 $, frais 14,35 $, net −9,24 $ ; tirage 2 122 trades, avant frais +1,00 $, frais 10,98 $, net −9,98 $ — perte nette −71 % et −72 %, trades −61 % et −68 %.
// Ce que ça ne règle pas : chaque trade reste perdant en moyenne après frais ; aucune voix ne prévoit les 15-60 min suivantes au-delà de
// 45-54 % (agents), 47 % (Scalper / LMSR), 49 % (Arbitrage) — le gain vient surtout de trades moins nombreux.
// ═══ [BILAN AUX HORIZONS · 27/09/2026] LA VOIX PÈSE CE QUE SON TRADE AURAIT DONNÉ (go Rams 27/09 23:20) ═══
// Avant : une voix pesait son bilan de la BOUGIE SUIVANTE (sens de son vote contre le mouvement jusqu'au cycle suivant, sans frais), alors que
// la décision est jugée — et serait tradée — de 15 min à 4 h, perte max et frais compris. Maintenant, à chaque cycle d'une paire (EV / RE,
// bougie close), les votes de TOUTES les voix sont notés avec les deux trades virtuels de la paire — long et short, même entrée (dernier prix
// réel), mêmes sorties, chacun SA perte max (celle du sens décidé et celle du sens contraire, 10f), mêmes règles (_thWalk) — indépendamment de
// la décision (même nulle). À chaque horizon, D = (net long − net short) / 2 : ce que le long a rapporté de plus qu'un pile-ou-face (les frais,
// payés des deux côtés, s'annulent — ils ne changent pas QUI a raison ; savoir si ça paie reste l'affaire du seuil appris). Chaque voix
// (vote v, |v| ≥ 0,03) reçoit le jugement v·D. Son bilan à un horizon : E_h = Σ v·D / Σ |v·D| sur la fenêtre de la fitness (apprise, 60 par
// défaut), au moins 5 jugements — même forme que l'ancien bilan, (justes − fausses) pondérées, mais pondérées par ce que le trade a gagné ou
// perdu à l'horizon. Poids de la voix = max(0, moyenne des 5 E_h) ; tant qu'une voix n'est pas jugée aux 5 horizons, son ancien poids. Pourquoi
// la comparaison et pas le net de chaque voix : aujourd'hui aucun sens ne paie les frais — jugée sur son net, toute voix pèserait 0, il n'y
// aurait plus de décision, donc plus rien à noter ni à apprendre. Le siège qui évolue repart de zéro (_vjReset, 07), comme sa fitness.
// Garde-fou appris : les deux décisions (ancienne pesée, pesée aux horizons) sont calculées à chaque cycle ; leur écart apparié, cycle par cycle
// (même paire, même instant : (sens nouveau − sens ancien) × D), est jugé par horizon avec la preuve du seuil appris (créneaux, Student
// Φ(−2)/25). Si l'ancienne pesée est prouvée meilleure à un horizon et la nouvelle à aucun, la décision revient à l'ancienne ; elle repasse
// aux horizons dans le cas inverse — par pas de temps, comme le seuil (EV 15 min et RE 1 h ne se mêlent pas). Journal ⚖️ à chaque bascule ;
// écran 🧠 Appris : poids des voix. La fitness des agents (évolution, affichage) est inchangée : seul le poids des voix dans la décision commune change.
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres de 9 h, 2 tirages, ce code ; chaque fenêtre part sans bilan aux horizons — la nouvelle pesée n'agit
// qu'une fois 5 jugements réunis à 4 h, soit sur la fin de chaque fenêtre) : tirage 1 : 0 trades, net 0 $ ; tirage 2 : 0 trades, net 0 $ ; 0 erreur. Écart apparié horizons − bougie, %/cycle ± erreur type (preuve exigée :
// > 3,2 à 3,5 erreurs types) : tirage 1 : 15 min +0,015 ± 0,010 (3615 cycles, 173 créneaux) ; 30 min +0,006 ± 0,009 (3513 cycles, 118 créneaux) ; 1 h +0,007 ± 0,011 (3309 cycles, 71 créneaux) ; 2 h +0,016 ± 0,015 (2901 cycles, 39 créneaux) ; 4 h +0,002 ± 0,017 (2114 cycles, 24 créneaux) — tirage 2 : 15 min +0,009 ± 0,013 (3651 cycles, 173 créneaux) ; 30 min +0,005 ± 0,012 (3549 cycles, 118 créneaux) ; 1 h −0,001 ± 0,015 (3345 cycles, 71 créneaux) ; 2 h −0,003 ± 0,024 (2937 cycles, 39 créneaux) ; 4 h −0,023 ± 0,014 (2139 cycles, 24 créneaux). Net des trades virtuels dans le sens de chaque pesée : tirage 1 : 15 min bougie −0,30 % / horizons −0,29 % ; 30 min bougie −0,30 % / horizons −0,29 % ; 1 h bougie −0,27 % / horizons −0,26 % ; 2 h bougie −0,22 % / horizons −0,21 % ; 4 h bougie −0,10 % / horizons −0,09 % — tirage 2 : 15 min bougie −0,31 % / horizons −0,30 % ; 30 min bougie −0,31 % / horizons −0,30 % ; 1 h bougie −0,28 % / horizons −0,29 % ; 2 h bougie −0,25 % / horizons −0,25 % ; 4 h bougie −0,16 % / horizons −0,16 %. Aucune des deux ne paie les frais ; rien de prouvé.
const _DC_BOTS = ['scalper_bot_v1', 'arb_bot_v1', 'dca_bot_v1'];
function _dcVoice(id) {
  if (!S.dcVoices || typeof S.dcVoices !== 'object') S.dcVoices = {};
  if (!S.dcVoices[id] || !Array.isArray(S.dcVoices[id]._judgments)) S.dcVoices[id] = { id: id, _judgments: [], fitness: 350 };
  return S.dcVoices[id];
}
function _dcMerit(v) {
  try {
    const W = (typeof _fitWindow === 'function') ? _fitWindow() : FIT_WINDOW;
    const js = (v && Array.isArray(v._judgments)) ? v._judgments.slice(-W) : [];
    if (js.length < FIT_MIN_N) return 0;
    let sw = 0, se = 0;
    js.forEach(j => { const w = Math.max(0.01, Number(j && j.w) || 0); sw += w; se += ((j && j.s) >= 0 ? 1 : -1) * w; });
    return sw > 0 ? Math.max(0, se / sw) : 0;
  } catch (e) { return 0; }
}
// Lecture d'UNE paire par un bot : mêmes règles que son scan (botScalper, botArb, botDCA ci-dessus). null = il ne dit rien.
function _botView(botId, pair) {
  try {
    const ps = S.pairStates && S.pairStates[pair]; if (!ps) return null;
    const tech = (typeof getTechSignals === 'function') ? getTechSignals(pair) : null;
    const cv = (tech && tech.raw && tech.raw.stddev && tech.raw.stddev.cv) || 0;
    if (botId === 'scalper_bot_v1') {   // LMSR décollé (> 12 points de 50 %) + volatilité présente
      const P = (typeof lmsrP === 'function') ? lmsrP(ps) : 0.5;
      return (Math.abs(P - 0.5) > 0.12 && cv > 0.0008) ? { dir: P > 0.5 ? 1 : -1 } : null;
    }
    if (botId === 'arb_bot_v1') {       // la paire est en retard de plus de 2,5 % sur une paire corrélée (> 0,65) : long du retardataire
      const rP = (typeof _getPairReturns === 'function') ? _getPairReturns(pair) : null;
      if (!rP || rP.length < 10) return null;
      const perfP = rP.slice(-20).reduce((a, x) => a + x, 0);
      for (const q of Object.keys(PAIRS || {})) {
        if (q === pair) continue;
        const corr = (typeof _getPairCorrelation === 'function') ? _getPairCorrelation(pair, q) : null;
        if (!(typeof corr === 'number' && corr > 0.65)) continue;
        const rQ = _getPairReturns(q); if (!rQ || rQ.length < 10) continue;
        if (rQ.slice(-20).reduce((a, x) => a + x, 0) - perfP > 0.025) return { dir: 1 };
      }
      return null;
    }
    if (botId === 'dca_bot_v1') {       // marché calme (cv < 0,12 %, ADX < 20) et prix dans le bas 15 % de la fourchette des 20 dernières bougies
      const adx = (tech && tech.raw && tech.raw.adx && tech.raw.adx.adx) || 20;
      const c = ps.candles; if (!(cv < 0.0012 && adx < 20) || !c || c.length < 20) return null;
      const cl = c.slice(-20).map(k => k.c), lo = Math.min(...cl), hi = Math.max(...cl);
      return (hi > lo && (ps.price - lo) / (hi - lo) <= 0.15) ? { dir: 1 } : null;
    }
  } catch (e) {}
  return null;
}
function _dcConsensus(pair, voteOf, composite) {
  // [BILAN AUX HORIZONS · 27/09/2026] deux pesées côte à côte, mêmes voix, même ordre : l'ancienne (bilan de la bougie suivante, _dcMerit) et
  // celle aux horizons (_dcMeritHz ; voix pas encore jugée aux 5 horizons → son ancien poids). La décision vivante suit _vjMode(). Les votes de
  // ce cycle (toutes les voix, bots compris même sans poids) partent avec les trades long / short de la paire (_vjNote).
  const P = { o: { num: 0, den: 0, n: 0, top: [] }, h: { num: 0, den: 0, n: 0, top: [] } }, snap = [];
  const add1 = (A, id, w, v) => { if (!(w > 0)) return; A.den += w; if (v) { A.num += w * v; A.n++; A.top.push({ id: id, c: w * v }); } };
  const add = (id, wO, v) => { const wH = _dcMeritHz(id); add1(P.o, id, wO, v); add1(P.h, id, wH === null ? wO : wH, v); if (v) snap.push([id, v]); };
  (S.agents || []).forEach(a => {
    if (!a || a.isMeta) return;
    if (a.isBot) {
      if (_DC_BOTS.indexOf(a.id) === -1) return;
      const vw = _botView(a.id, pair); let v = 0;
      if (vw) { v = vw.dir; try { if (typeof window._consultDisciples === 'function') v *= (Number(window._consultDisciples(a.id, pair, v > 0 ? 'long' : 'short').mod) || 1); } catch (e) {} }
      add(a.id, _dcMerit(a), v); return;
    }
    let v = Number(voteOf(a)) || 0; if (Math.abs(v) < 0.03) v = 0;
    add(a.id, _dcMerit(a), v);
  });
  if (typeof composite === 'number' && isFinite(composite)) { let v = composite; if (Math.abs(v) < 0.03) v = 0; add('composite', _dcMerit(_dcVoice('composite')), v); }
  // [MARCHÉ RÉPARÉ · 30/09/2026] EV / RE : le prix de la manche ouverte de la paire, une voix comme le composite (pesée par son bilan ; aucun bilan → 0)
  if (typeof _mktOn === 'function' && _mktOn()) { let v = _mktVote(pair); if (Math.abs(v) < 0.03) v = 0; add('marche', _dcMerit(S.dcVoices && S.dcVoices.marche), v); }
  const fin = A => { A.top.sort((x, y) => Math.abs(y.c) - Math.abs(x.c)); return { C: A.den > 0 ? Math.max(-1, Math.min(1, A.num / A.den)) : 0, n: A.n, den: A.den, top: A.top.slice(0, 3) }; };
  const O = fin(P.o), H = fin(P.h), mode = _vjMode(), L = (mode === 'hz') ? H : O;
  try { const ps = S.pairStates && S.pairStates[pair]; if (ps) ps._dcVj = { t: Date.now(), v: snap, C1: O.C, Ch: H.C }; } catch (e) {}
  return { C: L.C, n: L.n, den: L.den, top: L.top, C1: O.C, Ch: H.C, mode: mode };
}
// Composite jugé comme un agent : sens de sa valeur au moment du pari contre le mouvement survenu ensuite (EV / RE seulement).
function _dcJudgeComposite(comp, movePct, decay) {
  try {
    if (!(S.tradingMode === 'paperReal' || S.tradingMode === 'real')) return false;
    if (!(typeof comp === 'number' && Math.abs(comp) > 0.05) || !(Math.abs(Number(movePct)) > 0)) return false;
    const modeW = (S.tradingMode === 'real') ? 5 : 3;
    _fitJudge(_dcVoice('composite'), ((movePct > 0) === (comp > 0)) ? 1 : -1, Math.abs(comp) * Math.abs(movePct) * modeW * (decay || 0.7));
    return true;
  } catch (e) { return false; }
}
// ═══ [HORLOGE PAR MODE · 01/10/2026] CHAQUE MODE SON HORLOGE DES BOUGIES (go Rams 01/10 20:51) ═══
// Avant : EV et RE partageaient la mémoire de la dernière bougie close vue par paire (S.realPairCycle, portes 10g et 08) : chaque bougie close
// d'une paire ne faisait tourner le cycle que dans le PREMIER des deux modes à la regarder — en pratique presque toujours le même pour une paire
// donnée (celui dont la cadence de lecture était la plus courte). Backup du 29/09 (EV et RE en marche, 15 min) : dernier cycle EV de BTC le
// 28/09 à 21:00, dernier cycle RE d'ETH le 29/09 à 09:15. L'autre mode ne décidait plus rien sur la paire (ni ouverture, ni sortie du cycle) et
// son marché n'y ouvrait aucune manche ; avec deux pas de temps (EV 15 min, RE 1 h), le plus long n'avait presque plus aucun cycle. Maintenant
// (02) : l'horloge est rangée dans le portefeuille de chaque mode (accesseur, comme pairStates), remise à zéro quand le pas de temps du mode
// change — chaque mode a son cycle à chaque bougie close de chacune de ses paires, et décide sur elle.
// Le cerveau est commun aux deux modes : ce qui est APPRIS d'une bougie l'est une seule fois, sur un seul pas de temps.
//  · Même pas de temps : le premier des deux modes qui arrive à la bougie la note et la juge — trade virtuel de la décision (_thNote) et votes
//    aux horizons (_vjNote) une fois par (paire, bougie) comme avant ; jugement des votes à la bougie suivante (_dcForwardJudge : fitness,
//    compétence par paire, essai de l'Évolueur, composite, marché) une fois par (paire, bougie de la photo) (_dcFwdFirst) ; la manche du
//    marché est jouée par le premier, l'autre suit son prix sans miser (03 _mktOpen) : les T$ se jouent une fois par bougie.
//  · Deux pas de temps : le bilan des voix aux horizons, le jugement à la bougie suivante et le marché se tiennent sur le plus COURT des modes réels
//    en jeu — en marche, ou affiché (le battement traite toujours le mode affiché) : _thBrainF. Leurs cases sont comptées en bougies : 15 min et 1 h
//    s'y mêleraient. Le mode au pas le plus long décide sur ses bougies avec ce que le cerveau sait, sans manche de marché (sa voix « marché » et
//    celle du Bot Scalper s'abstiennent) ; ses votes notés avant que l'autre entre en jeu ne sont pas versés au bilan des voix (_vjJudge). Règle
//    globale, pas par paire : une paire active dans le seul mode au pas le plus long n'est pas apprise (prudence : rien ne se mêle). Le seuil
//    appris, lui, est tenu par pas de temps : chaque mode note ses décisions sur ses bougies (_thNote : le pas de temps entre dans le test, une
//    note 1 h n'est plus refusée par la note 15 min de la même heure, qui attend ses horizons jusqu'à 4 h).
//  · Une photo des votes n'est jugée que sur les 4 bougies qui la suivent au plus (1 h en 15 min ; la même limite que les trades virtuels et les
//    manches) : une photo plus ancienne (app gelée des heures, mode qui n'avait plus de cycle) ou d'un autre pas de temps n'est plus jugée — avant,
//    une photo de 11 à 24 h (backup du 29/09, paires privées de cycle) l'aurait été sur 11 à 24 h de mouvement, avec un poids proportionnel au
//    mouvement. App en arrière-plan ralentie (battement de 15 à 80 s le 29/09) : ses cycles restent jugés tant qu'ils sont à moins de 4 bougies.
//    Photo d'avant cette version (sans sa bougie) : pas jugée, une fois.
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres de 9 h, 2 tirages, EV et RE en marche ensemble en 15 min — la configuration de Rams le 29/09 ; code d'avant contre ce code, mêmes fenêtres) : avant : tirage 1 0 trades, net 0 $, tirage 2 0 trades, net 0 $ ; ce code : tirage 1 0 trades, net 0 $, tirage 2 0 trades, net 0 $ ; 0 erreur. Bougies closes eues par chaque mode : avant, EV 52 % et RE 51 % (par paire, sur les 18 fenêtres : EV LINK 32 %, ADA 37 %, XRP 49 %, DOT 49 %, DOGE 50 %, SOL 56 %, ETH 73 %, PEPE 75 %, BTC 78 %, AVAX 83 %, EUR 100 %, BNB 100 % ; RE PEPE 54 %, DOGE 56 %, AVAX 59 %, ETH 63 %, SOL 64 %, DOT 69 %, XRP 76 %, LINK 78 %, BTC 79 %, ADA 85 %) et sur 6500 bougies des paires des deux modes, 0 vues par les deux, 6320 par un seul, 180 par aucun ; avec ce code, EV 97 % et RE 97 %, 6320 vues par les deux sur 6500 (les 180 autres : la dernière bougie de chaque fenêtre, close à la fin du rejeu — avant comme après). Ce qui est appris : jugements à la bougie suivante 6 801 → 6 859 (même bougie jugée deux fois : 0 → 0), votes notés aux horizons 7 366 → 7 366, trades virtuels jugés 4 465 → 4 460 ; manches du marché EV / RE 3948 / 3339 → 7386 (3034) / 6537 (3503) (entre parenthèses : suivies, sans mise), T$ misés 209 514 → 217 971.
function _thBrainF() {   // le pas de temps (ms) qui nourrit le cerveau : le plus court des modes réels en jeu
  let best = Infinity;
  try {
    const disp = (typeof window !== 'undefined' && window.AuraChrono && typeof window.AuraChrono.getCurrentMode === 'function') ? window.AuraChrono.getCurrentMode() : null;
    ['paperReal', 'real'].forEach(m => {
      const inPlay = m === S.tradingMode || m === disp || (typeof _isModeRunning === 'function' && _isModeRunning(m));
      if (!inPlay) return;
      const f = _thTfMs(m === 'real' ? (S.realTimeframe || '15m') : (S.paperRealTimeframe || '15m'));
      if (f < best) best = f;
    });
  } catch (e) {}
  return best;
}
function _thBrainTf() {   // le mode traité nourrit-il le cerveau ?
  try { return !_thRealLike() || _thTfMs(_thTf()) <= _thBrainF(); } catch (e) { return true; }
}
var DC_FWD_KEEP = 96;   // mémoire (pas une limite de marché) : les dernières bougies jugées par paire (≈ 24 h en 15 min)
function _dcFwdFirst(pair, k) {
  const T = _thState();
  if (!T.fwdK || typeof T.fwdK !== 'object') T.fwdK = {};
  const L = Array.isArray(T.fwdK[pair]) ? T.fwdK[pair] : (T.fwdK[pair] = []);
  if (L.indexOf(k) >= 0) return false;   // déjà jugée (par l'autre mode)
  L.push(k); if (L.length > DC_FWD_KEEP) L.splice(0, L.length - DC_FWD_KEEP);
  return true;
}
function _dcForwardJudge(pair, ps) {
  try {
    const snap = ps && ps._voteSnap, px = ps && ps.price;
    if (!(snap && snap.px > 0 && px > 0)) return 0;
    const mv = (px - snap.px) / snap.px * 100;
    if (!(Math.abs(mv) > 0)) return 0;
    if (_thRealLike()) {   // [HORLOGE PAR MODE · 01/10/2026] ce qui est appris d'une bougie l'est une fois, sur un seul pas de temps
      if (!_thBrainTf()) return 0;   // l'autre mode, en marche sur un pas de temps plus court, nourrit le cerveau
      const kNow = S.realPairCycle && S.realPairCycle[pair];
      if (!(snap.k > 0) || snap.tf !== _thTf() || !(kNow > snap.k) || kNow - snap.k > 4 * _thTfMs(snap.tf)) return 0;   // photo d'avant cette version, d'un autre pas de temps, de cette bougie-ci ou de plus de 4 bougies : pas jugée
      if (!_dcFwdFirst(pair, snap.k)) return 0;   // l'autre mode a déjà jugé les votes de cette bougie
    }
    if (snap.votes && typeof learnFromOutcome === 'function') {
      window.__voteOverride = { pair: pair, votes: snap.votes };
      try { learnFromOutcome('cycle', mv, pair); } finally { window.__voteOverride = null; }
    }
    _dcJudgeComposite(snap.comp, mv, 0.7);
    if (typeof snap.mk === 'number' && typeof _dcJudgeMarket === 'function') _dcJudgeMarket(snap.mk, mv, 0.7);   // [MARCHÉ RÉPARÉ · 30/09/2026] le prix du marché, jugé comme le composite
    return 1;
  } catch (e) { try { window.__voteOverride = null; } catch (_e) {} return 0; }
}
function _dcSnapVotes(pair, ps, composite) {
  try { ps._voteSnap = { px: ps.price, t: Date.now(), votes: Object.assign({}, (ps.roster && ps.roster.votes) || {}), comp: (typeof composite === 'number' && isFinite(composite)) ? composite : null }; } catch (e) {}
  try { if (typeof _mktOn === 'function' && _mktOn()) ps._voteSnap.mk = _mktVote(pair); } catch (e) {}   // [MARCHÉ RÉPARÉ · 30/09/2026] le prix de la manche de CE cycle (après les mises), jugé au prochain
  try { if (_thRealLike()) { const k = S.realPairCycle && S.realPairCycle[pair]; if (k > 0) { ps._voteSnap.k = k; ps._voteSnap.tf = _thTf(); } } } catch (e) {}   // [HORLOGE PAR MODE · 01/10/2026] la bougie de la photo (jugée une fois, _dcFwdFirst)
}
// ═══ [SEUIL APPRIS · 27/09/2026] LE NIVEAU DE CONSENSUS QUI PAIE LES FRAIS — APPRIS, PLUS POSÉ À LA MAIN (go Rams 27/09 14:46) ═══
// Avant : pour ouvrir, la décision commune devait passer des portes posées à la main par régime (conviction 0,35 / 0,25 / 0,18, sens
// 0,20 / 0,15 / 0,10, plancher 0,30), abaissées de 0,06 par le coup de pouce anti-stagnation après 2 min 30 sans trade.
// Maintenant (EV / RE, prix réels) : à chaque cycle où le système pouvait ouvrir (bougie close, paire active, hors pause), la décision du
// moment devient un TRADE VIRTUEL — dans le sens de la décision, entrée au dernier prix réel reçu de la paire (celui qu'aurait payé un vrai
// trade ; refusé s'il date de plus de 2 min, comme _botPredict), sortie à la clôture de la bougie qui contient « maintenant + H bougies »
// (H = durée médiane des 30 derniers trades réels clos), net = mouvement dans le sens − coût aller-retour du barème (10e6 _ownStakeCostPct).
// Qu'il ait tradé ou non, le marché répond : le système apprend sans payer. Jamais de prix inventé : une bougie de bouche-trou (coupure
// réseau, _gap) n'est ni une entrée ni une sortie, ni la bougie qui la précède (sa clôture est le dernier prix avant la coupure).
// Le seuil = le niveau de conviction à partir duquel l'ensemble des trades virtuels de ce niveau et au-dessus a PROUVÉ gagner net de frais :
// au moins TH_MIN_N trades répartis sur au moins TH_MIN_B créneaux, moyenne au-dessus de zéro de plus de TH_Z erreurs types. L'erreur type se
// prend PAR CRÉNEAU de H+1 bougies (les paires bougent ensemble : 10 paires au même instant ne font pas 10 preuves) en comptant ce qu'un
// créneau partage avec le suivant (un trade de H bougies déborde sur le créneau d'après). Parmi les niveaux prouvés : celui qui aurait
// rapporté le plus au total. Aucun niveau prouvé → marché fermé (seuil au-dessus de tout) ; il se rouvre SEUL dès qu'un niveau prouve.
// Fenêtre : les TH_KEEP derniers trades virtuels (≈ 2 jours à 10 paires). Conventions statistiques, pas des seuils de marché.
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres, état de départ = backup précédent, 2 tirages) : décision commune seule (20260927g) : tirage 1 146 trades, net −9,24 $ ; tirage 2 122 trades, net −9,98 $ — avec le seuil appris (ce code) : tirage 1 0 trades, net +0,00 $ ; tirage 2 0 trades, net +0,00 $.
// Trades virtuels du rejeu : tirage 1 : 3598 trades virtuels, net moyen −0,192 %/trade (juste 46 % du temps sur le sens), conviction ≥ 0,3 : −0,374 % (n 410), ≥ 0,4 : −0,541 % (n 169) ; règle sur tout le cumul : fermé (le plus proche : tous niveaux, −0,192 % ± 0,09) ; tirage 2 : 3598 trades virtuels, net moyen −0,237 %/trade (juste 44 % du temps sur le sens), conviction ≥ 0,3 : −0,475 % (n 441), ≥ 0,4 : −0,528 % (n 158) ; règle sur tout le cumul : fermé (le plus proche : tous niveaux, −0,237 % ± 0,08).
// Simulation des faux positifs (cette fonction _thEval, 100 historiques de 5 jours calibrés sur le rejeu) : monde où tout perd après frais mais presque à l'équilibre en haut : première version ouverte au moins une fois dans 67 % des historiques de 5 jours, version livrée 6 % ; monde avec un vrai avantage (net > 0 au-dessus de 0,28) : ouverte 46 % du temps, première ouverture ≈ 20 h, +0,063 %/trade ; avantage fort : 87 % du temps, ≈ 8 h, +0,118 %/trade.
// ═══ [HORIZONS APPRIS · 27/09/2026] COMBIEN DE TEMPS TENIR — APPRIS AUSSI (go Rams 27/09 16:54) ═══
// 20260927h jugeait chaque décision à UN horizon : la durée médiane des trades réels (30 min, fixée surtout par la sortie « 30 min à plat »).
// À 30 min, aucun niveau ne payait les frais. Maintenant chaque décision est jugée à 5 horizons — 1, 2, 4, 8 et 16 bougies (en 15 min :
// 15 min, 30 min, 1 h, 2 h, 4 h) — toujours sans trader, et le trade virtuel porte la protection du vrai : la perte max (_lossCapSweep :
// 2 × stop prévu, bornée 1,5-3 %) — si le chemin la touche après l'entrée et avant l'horizon, le trade virtuel sort à ce niveau. Coupure
// réseau ou bougie manquante sur le chemin : les horizons qui la traversent sont abandonnés (jamais de prix inventé).
// La preuve (par horizon, créneaux de h+1 bougies) : 5 niveaux de conviction seulement — toutes les décisions, la moitié, le quart, le dixième
// et le vingtième les plus forts —, au moins 30 trades et 20 créneaux, moyenne au-dessus de zéro de plus que la valeur critique de Student
// (créneaux − 1 degrés de liberté) au niveau de 2 erreurs types partagé entre les 25 essais (5 horizons × 5 niveaux : Φ(−2) / 25, ≈ 3,6 à
// 20 créneaux, 3,3 à 60). Pourquoi si exigeant : une relecture indépendante a montré qu'en essayant TOUS les niveaux (des centaines), un
// marché sans avantage « prouvait » un horizon dans 18 historiques de 5 jours sur 40. Parmi les niveaux prouvés d'un horizon : celui qui
// aurait rapporté le plus au total. Un seuil par pas de temps (EV et RE peuvent différer). Fenêtre : les décisions des 30 derniers créneaux
// du plus long horizon (≈ 5 jours en 15 min), plafond mémoire TH_REC_MAX ; les décisions jugées sont gardées sous forme compacte
// [conviction, heure (s), pas (min), net à chaque horizon].
// Quand un horizon est prouvé, la position ouverte à ce niveau est MARQUÉE de cet horizon (10f) et tenue jusqu'à la clôture de sa bougie de
// sortie, comme le trade virtuel qui l'a prouvée : trailing, anti-zombie, bascule (07), règles apprises, TP / SL, breakeven (10f), sorties
// du cycle (signal inversé, timeout), fermeture préventive sur retournement (10d) et propositions exécutées automatiquement (04) attendent
// l'horizon ; restent : la perte max, le stop sur coupure (au niveau de la perte max), la marge du levier, les sécurités de drawdown
// (sauvetage, plein régime, appel de marge) et TES fermetures à la main. Elle sort au dernier prix réel (jamais sur un prix figé). Plusieurs
// horizons prouvés : parmi ceux dont le seuil est atteint, celui qui rapporte le plus par bougie tenue (moyenne prouvée ÷ horizon).
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres, 2 tirages) : décision commune seule (20260927g) : tirage 1 146 trades, net −9,24 $ ; tirage 2 122 trades, net −9,98 $ — avec les horizons appris (ce code) : tirage 1 0 trades, net 0 $ ; tirage 2 0 trades, net 0 $.
// Trades virtuels du rejeu, net moyen par horizon (tous niveaux) : tirage 1 (4091 décisions) : 15 min −0,28 %/trade (≥ 0,4 : −0,46 %) ; 30 min −0,29 %/trade (≥ 0,4 : −0,49 %) ; 1 h −0,27 %/trade (≥ 0,4 : −0,54 %) ; 2 h −0,26 %/trade (≥ 0,4 : −0,66 %) ; 4 h −0,32 %/trade (≥ 0,4 : −1,13 %) — tirage 2 (4091 décisions) : 15 min −0,31 %/trade (≥ 0,4 : −0,44 %) ; 30 min −0,31 %/trade (≥ 0,4 : −0,48 %) ; 1 h −0,30 %/trade (≥ 0,4 : −0,57 %) ; 2 h −0,31 %/trade (≥ 0,4 : −0,73 %) ; 4 h −0,37 %/trade (≥ 0,4 : −0,97 %).
// Simulation (cette fonction _thEval, 24 historiques de 8 jours calibrés sur le rejeu) : sans avantage : 0 % des historiques de 8 jours ouverts au moins une fois (0,0 % du temps) ; net exactement nul partout : 17 % des historiques de 8 jours ouverts au moins une fois (0,2 % du temps, 23 décisions ouvertes, net moyen +0,13 %) ; net −0,03 % partout : 0 % des historiques de 8 jours ouverts au moins une fois (0,0 % du temps) ; tout perdant, presque à l'équilibre en haut : 0 % des historiques de 8 jours ouverts au moins une fois (0,0 % du temps) ; vrai avantage aux horizons longs : 4 % des historiques de 8 jours ouverts au moins une fois (0,1 % du temps, 1 décision ouverte, net moyen −2,27 %) ; avantage fort dès 1 h : 92 % des historiques de 8 jours ouverts au moins une fois (38,1 % du temps, 3416 décisions ouvertes, net moyen +0,19 %).
// ═══ [SENS CONTRAIRE · 27/09/2026] LE SENS CONTRAIRE, JUGÉ AUSSI — MESURÉ SEULEMENT (go Rams 27/09 19:31) ═══
// Rejeu 20260927i (81 h) : au-dessus de 0,4, la décision commune se trompait de sens environ 2 fois sur 3, de 15 min à 4 h. Piste, pas preuve :
// 116 à 193 décisions très liées selon l'horizon et le tirage (sans le biais de fin de fenêtre), et la piste vient de ces mêmes données. Désormais chaque décision notée engendre AUSSI son trade virtuel
// CONTRAIRE : même entrée (dernier prix réel), mêmes sorties, même coût, et SA perte max — celle qu'aurait le vrai trade dans ce sens (10f :
// même formule, avec le bonus des signaux techniques de SON sens), touchée par les mouvements qui servent le sens décidé. Il est jugé par
// les MÊMES règles, par construction : _thWalk (le chemin et les horizons, extraits mot pour mot de _thJudge) sert aux deux sens.
// Il vit À PART (T.pendC, T.recC, T.rulesC, T.dirtyC) : les listes, les créneaux et le calendrier de recalcul du sens décidé sont ceux
// d'avant — le sens décidé est inchangé. Même preuve (_thEval, 5 niveaux, Student Φ(−2)/25, ≥ 30 trades, ≥ 20 créneaux, un résultat par
// horizon). Seules les décisions notées à partir de cette version comptent (T.ctSince) : la piste est jugée sur des données qu'elle n'a pas
// vues. Son seuil se recalcule dans une tâche à part (hors du chemin de trading), au plus toutes les 5 min après de nouveaux jugements et dès
// qu'il a plus d'une bougie. Rien n'est tradé dans ce sens : _thLevel, _thPick et l'ouverture (10f) ne lisent que le sens décidé.
// Journal 🎚 quand le sens contraire devient prouvé, change de niveau ou cesse de l'être ; écran 🧠 Appris : un état par horizon.
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres, 2 tirages, ce code) : tirage 1 : 0 trades, net 0 $ ; tirage 2 : 0 trades, net 0 $ ; 0 erreur.
// Sens contraire au rejeu — MÊMES données que la piste, donc pas une preuve (la mesure en ligne repart de zéro) : tirage 1 (4091 décisions) : 15 min −0,25 %/trade (≥ 0,4 : −0,13 %, bon sens 62 %) ; 30 min −0,24 %/trade (≥ 0,4 : −0,07 %, bon sens 60 %) ; 1 h −0,25 %/trade (≥ 0,4 : +0,01 %, bon sens 55 %) ; 2 h −0,25 %/trade (≥ 0,4 : +0,01 %, bon sens 55 %) ; 4 h −0,25 %/trade (≥ 0,4 : +0,31 %, bon sens 63 %) — tirage 2 (4091 décisions) : 15 min −0,24 %/trade (≥ 0,4 : −0,06 %, bon sens 66 %) ; 30 min −0,23 %/trade (≥ 0,4 : −0,03 %, bon sens 63 %) ; 1 h −0,24 %/trade (≥ 0,4 : +0,04 %, bon sens 62 %) ; 2 h −0,26 %/trade (≥ 0,4 : +0,02 %, bon sens 53 %) ; 4 h −0,32 %/trade (≥ 0,4 : +0,15 %, bon sens 56 %).
// Preuve ponctuelle : rejeu différentiel contre 20260927i (150 scénarios de 500 pas + 8 de 6 h à la seconde, tâches asynchrones, EV et RE sur
// des pas de temps différents) — sens décidé identique à chaque pas ; sens contraire identique au moteur 20260927i nourri du signal inversé.
var TH_MIN_N = 30, TH_MIN_B = 20, TH_HZ = [1, 2, 4, 8, 16], TH_TOP = [1, 0.5, 0.25, 0.1, 0.05], TH_REC_MAX = 8000, TH_PEND_MAX = 2000;
var TH_ALPHA = 0.0227501319481792 / (TH_HZ.length * TH_TOP.length);   // Φ(−2) = 0,02275 (2 erreurs types, un côté) partagé entre les 25 essais
// Inverse de la loi normale (Acklam, erreur relative < 1,2e-9).
function _thNormInv(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  let q, r;
  if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
// Quantile de Student (Cornish-Fisher, Abramowitz-Stegun 26.7.5 : écart < 0,1 % dès 9 degrés de liberté).
function _thTInv(p, v) {
  const z = _thNormInv(p), z2 = z * z;
  return z + (z2 * z + z) / (4 * v) + ((5 * z2 + 16) * z2 * z + 3 * z) / (96 * v * v) + (((3 * z2 + 19) * z2 + 17) * z2 * z - 15 * z) / (384 * v * v * v)
    + ((((79 * z2 + 776) * z2 + 1482) * z2 - 1920) * z2 * z - 945 * z) / (92160 * v * v * v * v);
}
var _thCritC = {};
function _thCrit(nb) { const v = Math.max(1, (nb | 0) - 1); return _thCritC[v] || (_thCritC[v] = _thTInv(1 - TH_ALPHA, v)); }
function _thState() {
  if (!S.dcThreshold || typeof S.dcThreshold !== 'object') S.dcThreshold = {};
  const T = S.dcThreshold;
  if (!Array.isArray(T.rec)) T.rec = [];
  if (!Array.isArray(T.pend)) T.pend = [];
  if (!T.rules || typeof T.rules !== 'object') T.rules = {};
  if (!T.dirty || typeof T.dirty !== 'object') T.dirty = {};   // par pas de temps : de nouveaux jugements attendent le recalcul de CE seuil
  // [SENS CONTRAIRE · 27/09/2026] le sens contraire vit à part, jamais mêlé au sens décidé : en attente, jugés, seuil, recalcul
  if (!Array.isArray(T.pendC)) T.pendC = [];
  if (!Array.isArray(T.recC)) T.recC = [];
  if (!T.rulesC || typeof T.rulesC !== 'object') T.rulesC = {};
  if (!T.dirtyC || typeof T.dirtyC !== 'object') T.dirtyC = {};
  // [BILAN AUX HORIZONS · 27/09/2026] les trades long / short de chaque cycle et les votes qui les accompagnent ; le bilan de chaque voix par
  // horizon (à plat : v × 1000, D × 10 000, v, D, … — les FIT_KEEP derniers, lus sur la fenêtre apprise de la fitness) ; l'écart apparié des deux
  // pesées (par horizon, par créneau fm:b : [Σ écart × 10 000, n]) ; pesée vivante et écart jugé PAR PAS DE TEMPS (EV et RE ne se mêlent pas)
  if (!Array.isArray(T.pendV)) T.pendV = [];
  if (!Array.isArray(T.vIds)) T.vIds = [];
  if (!T.vHz || typeof T.vHz !== 'object') T.vHz = {};
  if (!Array.isArray(T.vCmp) || T.vCmp.length !== TH_HZ.length) T.vCmp = TH_HZ.map(() => ({}));
  if (!T.vModes || typeof T.vModes !== 'object') T.vModes = {};     // pesée vivante par pas de temps ('hz' / 'bougie')
  if (!T.vRules || typeof T.vRules !== 'object') T.vRules = {};     // écart apparié jugé, par pas de temps
  if (!T.vDirtyF || typeof T.vDirtyF !== 'object') T.vDirtyF = {};  // nouveaux écarts en attente de jugement, par pas de temps
  // [FITNESS AUX HORIZONS · 28/09/2026] garde-fou propre à la fitness : écart apparié des sièges retirés (par horizon, par créneau), mode / règle / attente par pas de temps
  if (!Array.isArray(T.fCmp) || T.fCmp.length !== TH_HZ.length) T.fCmp = TH_HZ.map(() => ({}));
  if (!T.fModes || typeof T.fModes !== 'object') T.fModes = {};
  if (!T.fRules || typeof T.fRules !== 'object') T.fRules = {};
  if (!T.fDirtyF || typeof T.fDirtyF !== 'object') T.fDirtyF = {};
  Object.keys(T.vHz).forEach(id => { const R = T.vHz[id]; if (!Array.isArray(R) || R.length !== TH_HZ.length || R.some(L => !Array.isArray(L) || Array.isArray(L[0]))) delete T.vHz[id]; });   // record d'une autre forme (essai jamais livré, corruption) : écarté, la voix se rejuge
  // 20260927h (un seul horizon, rule.h) : ses trades jugés deviennent les résultats de cet horizon s'il est dans la grille ; ses trades en
  // attente (quelques heures au plus) sont abandonnés ; un seuil par pas de temps désormais (T.rules)
  if (Array.isArray(T.obs)) {
    const iOld = TH_HZ.indexOf(Number(T.rule && T.rule.h)), fm = _thTfMs(_thTf()) / 60000;
    if (iOld >= 0) T.obs.forEach(o => { if (o && isFinite(o.c) && isFinite(o.n) && isFinite(o.t)) { const r = [Number(o.c), Math.round(o.t / 1000), fm, false, false, false, false, false]; r[3 + iOld] = Number(o.n); T.rec.push(r); } });
    delete T.obs; T.pend = T.pend.filter(q => q && Array.isArray(q.x));
  }
  if (T.rule !== undefined) delete T.rule;
  return T;
}
function _thRealLike() { return S.tradingMode === 'paperReal' || S.tradingMode === 'real'; }
function _thTf() { return (S.tradingMode === 'real') ? (S.realTimeframe || '15m') : (S.paperRealTimeframe || '15m'); }
function _thTfMs(tf) { return { '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1j': 86400000 }[tf] || 900000; }
function _thHzLab(h, f) { const m = Math.round(h * (f || 900000) / 60000); return m < 60 ? (m + ' min') : (m % 60 ? (Math.floor(m / 60) + ' h ' + (m % 60)) : (m / 60 + ' h')); }
function _thCandle(arr, ts) {
  for (let i = arr.length - 1; i >= 0; i--) { const b = arr[i]; if (!b) continue; if (b.ts === ts) return i; if (b.ts < ts) break; }
  return -1;
}
// La décision d'un cycle (10f, bougie close, EV / RE) devient un trade virtuel : entrée au dernier prix réel (refusé s'il a plus de 2 min),
// sortie à la clôture de la bougie qui contient « maintenant + h bougies » pour chaque horizon h, perte max capPct (même formule que le vrai).
function _thNote(pair, signal, capPct, capPctC) {
  try {
    if (!_thRealLike()) return false;
    const s = Number(signal); if (!(Math.abs(s) > 0)) return false;
    // ps.price peut dater (mode traité en arrière-plan : seul le mode à l'écran reçoit le prix) → le dernier prix RÉEL accepté (02), comme _botPredict
    const px = (typeof _rcLastPrice === 'function') ? Number(_rcLastPrice(pair)) : 0;
    if (!(px > 0) || (typeof _rcPriceAge === 'function' && _rcPriceAge(pair) > 120000)) return false;   // prix figé (> 2 min) : pas de pari
    const k = S.realPairCycle && S.realPairCycle[pair]; if (!(k > 0)) return false;
    const tf = _thTf(), f = _thTfMs(tf);
    const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf]) || [];
    const ik = _thCandle(arr, k), last = arr[arr.length - 1];
    if (ik < 0 || arr[ik]._gap || !last || last._gap) return false;   // bougie close inconnue ou bouche-trou : pas de prix sûr
    const T = _thState();
    if (T.pend.some(q => q.p === pair && q.k === k && q.tf === tf)) return false;   // [HORLOGE PAR MODE · 01/10/2026] + le pas de temps : EV et RE notent chacun leur bougie
    if (T.pend.length >= TH_PEND_MAX) return false;   // garde mémoire : on refuse les nouveaux, jamais ceux qui arrivent à terme
    const tn = Date.now(), s0 = Math.floor(tn / f) * f, cap = Math.min(3, Math.max(1.5, Number(capPct) || 2));   // sans stop connu : 2 %, comme _lossCapSweep
    // l'entrée tombe dans la bougie en cours : ses extrêmes d'AVANT l'entrée sont gardés, seuls les nouveaux compteront pour la perte max
    const cur = (last.ts === s0) ? last : null;
    T.pend.push({ p: pair, k: k, t: tn, px: px, d: s > 0 ? 1 : -1, c: Math.round(Math.abs(s) * 1000) / 1000, f: f, tf: tf,
      cap: Math.round(cap * 1000) / 1000, x: TH_HZ.map(h => Math.floor((tn + h * f) / f) * f), n: TH_HZ.map(() => null),
      s: s0 - f, s0: s0, el: cur ? Number(cur.l) : px, eh: cur ? Number(cur.h) : px, hit: 0 });
    // [SENS CONTRAIRE · 27/09/2026] le même trade dans l'autre sens, avec SA perte max (10f : bonus des signaux techniques de son sens ; sinon la même)
    if (T.pendC.length < TH_PEND_MAX) {
      const q0 = T.pend[T.pend.length - 1], capC = Math.min(3, Math.max(1.5, Number(capPctC) || cap));
      T.pendC.push(Object.assign({}, q0, { d: -q0.d, cap: Math.round(capC * 1000) / 1000, x: q0.x.slice(), n: q0.n.map(() => null), hit: 0 }));
      if (!(T.ctSince > 0)) T.ctSince = tn;   // début de la mesure : décisions nouvelles seulement
    }
    return true;
  } catch (e) { return false; }
}
// [SENS CONTRAIRE · 27/09/2026] Un trade virtuel en attente (sens décidé OU contraire) : son chemin sur les bougies closes, puis chaque horizon
// dont la bougie de sortie est close. Corps de _thJudge d'avant, mot pour mot : les deux sens suivent exactement les mêmes règles. Rend le
// nombre d'horizons jugés (n), s'il en reste en attente (open) et le pas de temps (f).
function _thWalk(q, cost, now) {
  const f = q.f || _thTfMs(q.tf), arr = (S.realCandles && S.realCandles[q.p] && S.realCandles[q.p][q.tf]) || [];
  let cut = 0, n = 0;
  for (let i = 0; i < arr.length - 1; i++) {   // la dernière bougie est en cours : jamais lue
    const b = arr[i]; if (!b || !(b.ts > q.s)) continue;
    if (b.ts > q.s + f) { cut = q.s + f; break; }   // bougie manquante : chemin inconnu
    if (b._gap) break;   // [DÉGEL DES VOIX · 02/10/2026] bouche-trou : chemin PAS ENCORE connu — on attend la réparation (02 : une série trouée est redemandée à Binance) ; jamais réparée → abandon 4 bougies après la sortie (plus bas), comme avant pour une série coupée — avant : abandon sur-le-champ, la réparation arrivait trop tard
    let lo = Number(b.l), hi = Number(b.h);
    if (b.ts === q.s0) { lo = lo < q.el ? lo : Infinity; hi = hi > q.eh ? hi : -Infinity; }   // bougie d'entrée : seuls ses extrêmes nouveaux sont d'après l'entrée
    const adv = q.d > 0 ? (q.px - lo) / q.px * 100 : (hi - q.px) / q.px * 100;
    if (!q.hit && adv >= q.cap) q.hit = b.ts;
    q.s = b.ts;
  }
  let open = false;
  q.x.forEach((x, i) => {
    if (q.n[i] !== null) return;   // déjà jugé (nombre) ou abandonné (false)
    if (q.hit && q.hit <= x) { q.n[i] = Math.round((-q.cap - cost) * 10000) / 10000; n++; return; }
    if (cut && x >= cut - f) { q.n[i] = false; return; }   // la sortie tombe dans une coupure ou juste avant : prix inconnu
    const j = _thCandle(arr, x);
    if (j >= 0 && j < arr.length - 1 && q.s >= x && !arr[j]._gap && !(arr[j + 1] && arr[j + 1]._gap) && Number(arr[j].c) > 0) {
      const mv = (Number(arr[j].c) - q.px) / q.px * 100;
      q.n[i] = Math.round((q.d * mv - cost) * 10000) / 10000; n++; return;
    }
    if (now > x + 4 * f) { q.n[i] = false; return; }   // série coupée ou paire retirée : abandonné
    open = true;
  });
  return { n: n, open: open, f: f };
}
// [SENS CONTRAIRE · 27/09/2026] Les trades virtuels contraires : mêmes règles (_thWalk), leurs propres listes, forme compacte en ENTIERS COURTS
// [conviction × 1000, heure (s) − TH_CT_T0, pas (min), 5 nets × 10 000] — deux fois plus rapide à sauvegarder, relue à l'identique. Leur seuil se
// recalcule dans une tâche à part (hors du chemin de trading), pour le pas de temps du mode qui l'a demandé (08 traite EV et RE à tour de
// rôle), au plus toutes les 5 min après de nouveaux jugements et dès qu'il a plus d'une bougie ; une demande restée sans suite 60 s est refaite.
var _thCtBusy = {}, TH_CT_T0 = 1700000000;   // origine de l'heure de la forme compacte contraire (s)
function _thJudgeC(T) {
  const now = Date.now(), f0 = _thTfMs(_thTf()), fm = f0 / 60000, RC = T.rulesC[fm];
  if (T.pendC.length) {
    const cost = (typeof _ownStakeCostPct === 'function') ? Number(_ownStakeCostPct()) || 0 : 0, keep = [];
    T.pendC.forEach(q => {
      if (!q || !(q.px > 0) || !Array.isArray(q.x) || !Array.isArray(q.n)) return;
      const w = _thWalk(q, cost, now);
      if (w.n > 0) T.dirtyC[Math.round(w.f / 60000)] = true;
      if (w.open) keep.push(q);
      else T.recC.push([Math.round(q.c * 1000), Math.round(q.t / 1000) - TH_CT_T0, Math.round(w.f / 60000)].concat(q.n.map(v => (typeof v === 'number' ? Math.round(v * 10000) : false))));
    });
    T.pendC = keep;
  }
  const due = RC ? ((T.dirtyC[fm] && now - RC.t >= 300000) || now - RC.t > f0) : (T.recC.length + T.pendC.length > 0);
  const b0 = _thCtBusy[fm] || 0;
  if (due && !(b0 > 0 && now - b0 < 60000)) {
    _thCtBusy[fm] = now > 0 ? now : 1;
    const go = () => { _thCtBusy[fm] = 0; _thRefreshC(f0); };
    if (typeof setTimeout === 'function') setTimeout(go, 0); else go();
  }
}
// Trades virtuels : chemin parcouru sur les bougies CLOSES, dans l'ordre (perte max touchée après l'entrée ? coupure ? bougie manquante ?),
// puis chaque horizon dont la bougie de sortie est close est jugé : perte max touchée avant ou pendant → −perte max − coût ; sinon sens ×
// mouvement − coût. Sortie introuvable → abandonnée. Le seuil est recalculé au plus toutes les 5 min (et dès qu'il a plus d'une bougie).
function _thJudge() {
  try {
    if (!_thRealLike()) return 0;
    const T = _thState();
    try { _thJudgeC(T); } catch (e) {}   // [SENS CONTRAIRE · 27/09/2026] à part, avant le sens décidé, sans effet sur lui
    try { _vjJudge(T); } catch (e) {}   // [BILAN AUX HORIZONS · 27/09/2026] les trades des voix : à part, sans effet sur les listes du sens décidé
    if (!T.pend.length) return 0;
    const cost = (typeof _ownStakeCostPct === 'function') ? Number(_ownStakeCostPct()) || 0 : 0;
    const now = Date.now(); let n = 0; const keep = [], dm = {};
    T.pend.forEach(q => {
      if (!q || !(q.px > 0) || !Array.isArray(q.x) || !Array.isArray(q.n)) return;
      const w = _thWalk(q, cost, now), f = w.f;   // [SENS CONTRAIRE · 27/09/2026] chemin et horizons : _thWalk (mot pour mot l'ancien corps)
      n += w.n;
      if (w.n > 0) dm[Math.round(f / 60000)] = true;
      if (w.open) keep.push(q);
      else T.rec.push([q.c, Math.round(q.t / 1000), Math.round(f / 60000)].concat(q.n.map(v => (typeof v === 'number' ? v : false))));   // forme compacte
    });
    T.pend = keep;
    Object.keys(dm).forEach(k => { T.dirty[k] = true; });
    const fm = _thTfMs(_thTf()) / 60000, R = T.rules[fm];
    if (T.dirty[fm] && (!R || now - R.t >= 300000)) _thRefresh();
    return n;
  } catch (e) { return 0; }
}
// Pur : trades virtuels jugés {c: conviction, n: net %, b: créneau (entier)} → le seuil prouvé (ou aucun). 5 niveaux seulement : les queues
// qui contiennent tout, la moitié, le quart, le dixième, le vingtième des décisions les plus fortes (ex æquo compris). Pour chacune : n,
// moyenne, erreur type par créneau = √(Σ r_b² + 2 Σ r_b·r_b+1) / n (r_b = somme des écarts du créneau b ; jamais moins que sans recouvrement),
// × √(créneaux / (créneaux − 1)). Prouvée : n ≥ 30, créneaux ≥ 20, moyenne > _thCrit(créneaux) × erreur.
function _thEval(obs) {
  const a = (obs || []).filter(o => o && isFinite(o.c) && isFinite(o.n) && isFinite(o.b)).slice().sort((x, y) => y.c - x.c);
  const tgt = TH_TOP.map(q => Math.max(1, Math.ceil(q * a.length))).sort((x, y) => x - y);
  const blk = {}; let n = 0, sum = 0, A = 0, B = 0, Q = 0, P1 = 0, P2 = 0, P3 = 0, nb = 0, ti = 0, best = null, near = null;
  for (let i = 0; i < a.length; i++) {
    const o = a[i], x = Number(o.n), b = Number(o.b);
    let e = blk[b]; if (!e) { e = blk[b] = { s: 0, m: 0 }; nb++; }
    const L = blk[b - 1], R = blk[b + 1], sN = (L ? L.s : 0) + (R ? R.s : 0), mN = (L ? L.m : 0) + (R ? R.m : 0);
    A += 2 * e.s * x + x * x; B += e.s + x * e.m + x; Q += 2 * e.m + 1;   // Σ S_b², Σ S_b·n_b, Σ n_b²
    P1 += x * sN; P2 += x * mN + sN; P3 += mN;                          // Σ S_b·S_b+1, Σ (S_b·n_b+1 + n_b·S_b+1), Σ n_b·n_b+1
    e.s += x; e.m += 1; n++; sum += x;
    if (i + 1 < a.length && a[i + 1].c === o.c) continue;   // ex æquo : le niveau se juge avec tous ses trades
    if (ti >= tgt.length || n < tgt[ti]) continue;          // pas un des 5 niveaux
    while (ti < tgt.length && tgt[ti] <= n) ti++;
    if (n < TH_MIN_N || nb < TH_MIN_B) continue;
    const mean = sum / n, v0 = Math.max(0, A - 2 * mean * B + mean * mean * Q), c1 = P1 - mean * P2 + mean * mean * P3;
    const se = Math.sqrt(Math.max(v0, v0 + 2 * c1) / (n * n) * (nb / (nb - 1)));
    const k = _thCrit(nb), tail = { level: o.c, n: n, blocks: nb, mean: mean, se: se, total: sum, crit: k };
    if (!near || mean - k * se > near.mean - near.crit * near.se) near = tail;
    if (mean - k * se > 0 && (!best || sum > best.total)) best = tail;
  }
  return { open: !!best, level: best ? best.level : null, best: best, near: near, n: a.length };
}
// Un horizon (indice i de TH_HZ), un pas de temps : créneaux de h+1 bougies. [SENS CONTRAIRE · 27/09/2026] ct : les listes du sens contraire.
function _thEvalH(i, T, f, ct) {
  const h = TH_HZ[i], L = (h + 1) * f, fm = f / 60000, obs = [];
  if (ct) (T.recC || []).forEach(r => { const v = r && r[3 + i]; if (r && r[2] === fm && typeof v === 'number' && isFinite(v)) obs.push({ c: r[0] / 1000, n: v / 10000, b: Math.floor((r[1] + TH_CT_T0) * 1000 / L) }); });   // entiers courts
  else T.rec.forEach(r => { const v = r && r[3 + i]; if (r && r[2] === fm && typeof v === 'number' && isFinite(v)) obs.push({ c: r[0], n: v, b: Math.floor(r[1] * 1000 / L) }); });
  ((ct ? T.pendC : T.pend) || []).forEach(q => { const v = q && q.n && q.n[i]; if (q && q.f === f && typeof v === 'number' && isFinite(v)) obs.push({ c: q.c, n: v, b: Math.floor(q.t / L) }); });
  const r = _thEval(obs); r.h = h; r.score = r.open ? r.best.mean / h : null;
  return r;
}
function _thRefresh() {
  try {
    const T = _thState(), f = _thTfMs(_thTf()), fm = f / 60000, old = T.rules[fm] || null, now = Date.now(), hmax = Math.max.apply(null, TH_HZ);
    T.rec = T.rec.filter(r => Array.isArray(r) && r[1] * 1000 >= now - 1.5 * TH_MIN_B * (hmax + 1) * r[2] * 60000);   // 30 créneaux du plus long horizon, par pas de temps
    if (T.rec.length > TH_REC_MAX) T.rec.splice(0, T.rec.length - TH_REC_MAX);
    const hz = TH_HZ.map((h, i) => _thEvalH(i, T, f)), op = hz.filter(x => x.open);
    const rule = { open: op.length > 0, level: op.length ? Math.min.apply(null, op.map(x => x.level)) : null, hz: hz, t: now, tfMs: f, alpha: TH_ALPHA,
      cost: (typeof _ownStakeCostPct === 'function') ? Number(_ownStakeCostPct()) || 0 : 0, n: T.rec.length + T.pend.length };
    T.rules[fm] = rule; T.dirty[fm] = false;
    const same = !!(old && Array.isArray(old.hz) && old.hz.length === hz.length && hz.every((x, i) => x.open === old.hz[i].open && (!x.open || Math.abs(x.level - old.hz[i].level) < 0.02)));
    if (!same && S.chainLog) {
      const f2 = x => (x >= 0 ? '+' : '') + x.toFixed(2).replace('.', ','), lv = x => x.toFixed(2).replace('.', ',');
      let desc;
      if (op.length) desc = 'Seuil appris · ouvert — ' + op.map(x => _thHzLab(x.h, f) + ' dès conviction ≥ ' + lv(x.level) + ' (' + f2(x.best.mean) + ' %/trade net de frais, ' + x.best.n + ' trades, ' + x.best.blocks + ' créneaux)').join(' ; ');
      else {
        let nr = null; hz.forEach(x => { if (x.near && (!nr || x.near.mean - x.near.crit * x.near.se > nr.near.mean - nr.near.crit * nr.near.se)) nr = x; });
        desc = 'Seuil appris · marché fermé — aucun horizon (' + _thHzLab(TH_HZ[0], f) + ' à ' + _thHzLab(TH_HZ[TH_HZ.length - 1], f) + ') ne paie encore les frais (' +
          (nr ? ('le plus proche : ' + _thHzLab(nr.h, f) + ', conviction ≥ ' + lv(nr.near.level) + ' → ' + f2(nr.near.mean) + ' %/trade sur ' + nr.near.n + ' trades virtuels') : ('pas encore assez de trades virtuels : ' + rule.n + ' décisions')) + ')';
      }
      S.chainLog.push({ icon: '🎚', desc: desc, hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : '' });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return rule;
  } catch (e) { return null; }
}
// [SENS CONTRAIRE · 27/09/2026] Le seuil du sens contraire, pour un pas de temps (celui du mode qui l'a demandé ; à défaut, du mode courant) :
// même fenêtre, même preuve que le sens décidé ;
// journal quand il devient prouvé, change de niveau ou cesse de l'être (rien sinon). Mesuré seulement : personne ne le lit pour trader.
function _thRefreshC(fArg) {
  try {
    const T = _thState(), f = Number(fArg) > 0 ? Number(fArg) : _thTfMs(_thTf()), fm = f / 60000, old = T.rulesC[fm] || null, now = Date.now(), hmax = Math.max.apply(null, TH_HZ);
    T.recC = T.recC.filter(r => Array.isArray(r) && (r[1] + TH_CT_T0) * 1000 >= now - 1.5 * TH_MIN_B * (hmax + 1) * r[2] * 60000);
    if (T.recC.length > TH_REC_MAX) T.recC.splice(0, T.recC.length - TH_REC_MAX);
    const hz = TH_HZ.map((h, i) => _thEvalH(i, T, f, true)), op = hz.filter(x => x.open);
    let nC = 0; T.recC.forEach(r => { if (r[2] === fm) nC++; }); T.pendC.forEach(q => { if (q && q.f === f) nC++; });
    const rule = { open: op.length > 0, level: op.length ? Math.min.apply(null, op.map(x => x.level)) : null, hz: hz, t: now, tfMs: f, alpha: TH_ALPHA, n: nC, since: T.ctSince || null };
    T.rulesC[fm] = rule; T.dirtyC[fm] = false;
    const same = !!(old && Array.isArray(old.hz) && old.hz.length === hz.length && hz.every((x, i) => x.open === old.hz[i].open && (!x.open || Math.abs(x.level - old.hz[i].level) < 0.02)));
    if (!same && (op.length || (old && old.open)) && S.chainLog) {
      const f2 = x => (x >= 0 ? '+' : '') + x.toFixed(2).replace('.', ','), lv = x => x.toFixed(2).replace('.', ',');
      let nr = null; hz.forEach(x => { if (x.near && (!nr || x.near.mean - x.near.crit * x.near.se > nr.near.mean - nr.near.crit * nr.near.se)) nr = x; });
      const desc = op.length ? ('Sens contraire · prouvé — ' + op.map(x => _thHzLab(x.h, f) + ' dès conviction ≥ ' + lv(x.level) + ' (' + f2(x.best.mean) + ' %/trade net de frais, ' + x.best.n + ' trades, ' + x.best.blocks + ' créneaux)').join(' ; ') + ' — mesuré seulement : rien n\'est tradé dans ce sens')
        : ('Sens contraire · plus prouvé' + (nr ? (' (le plus proche : ' + _thHzLab(nr.h, f) + ', conviction ≥ ' + lv(nr.near.level) + ' → ' + f2(nr.near.mean) + ' %/trade sur ' + nr.near.n + ' trades virtuels)') : ''));
      S.chainLog.push({ icon: '🎚', desc: desc, hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : '' });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return rule;
  } catch (e) { return null; }
}
// Le seuil du pas de temps du mode, recalculé s'il manque, s'il a plus d'une bougie, ou si de nouveaux jugements attendent depuis 5 min.
function _thRule() {
  const T = _thState(), f = _thTfMs(_thTf()), now = Date.now(); let R = T.rules[f / 60000];
  if (!R || !Array.isArray(R.hz) || (now - R.t) > f || (T.dirty[f / 60000] && (now - R.t) >= 300000)) R = _thRefresh();
  return R;
}
// Seuil courant pour 10f : null hors EV / RE (prix simulés : les portes d'avant restent) ; Infinity = marché fermé ; sinon le plus bas des
// seuils prouvés (la conviction qui l'atteint a au moins un horizon prouvé — _thPick le choisit).
function _thLevel() {
  try {
    if (!_thRealLike()) return null;
    const R = _thRule();
    return (R && R.open && isFinite(R.level)) ? Number(R.level) : Infinity;
  } catch (e) { return null; }
}
// Horizon à tenir pour une conviction c : parmi les horizons prouvés dont le seuil est atteint, celui qui rapporte le plus par bougie tenue.
function _thPick(c) {
  try {
    if (!_thRealLike()) return null;
    const r = _thRule(); if (!r || !r.open || !Array.isArray(r.hz)) return null;
    let best = null; r.hz.forEach(x => { if (x && x.open && Number(c) >= x.level && (!best || x.score > best.score)) best = x; });
    return best ? { h: best.h, level: best.level, mean: best.best.mean, f: r.tfMs } : null;
  } catch (e) { return null; }
}
// ═══ [BILAN AUX HORIZONS · 27/09/2026] les voix jugées sur leurs trades virtuels ═══
// Un cycle de paire (appelé par 10f juste après _thNote, que la décision soit nulle ou non) : les votes de ce cycle (ps._dcVj, posés par
// _dcConsensus) et les deux trades de la paire — long et short, entrée au dernier prix réel (refusé s'il a plus de 2 min), sorties aux 5
// horizons, chacun sa perte max (capL, capS : même formule que le vrai trade dans ce sens, bornée 1,5-3 %). Mêmes refus que _thNote (bougie
// close inconnue ou bouche-trou, bougie en cours bouche-trou, une fois par bougie, file pleine).
function _vjNote(pair, capL, capS) {
  try {
    if (!_thRealLike()) return false;
    if (!_thBrainTf()) return false;   // [HORLOGE PAR MODE · 01/10/2026] l'autre mode, en marche sur un pas de temps plus court, tient le bilan des voix (cases comptées en bougies)
    const ps = S.pairStates && S.pairStates[pair], sn = ps && ps._dcVj;
    if (!sn || !Array.isArray(sn.v) || !sn.v.length || !(Math.abs(Date.now() - sn.t) < 60000)) return false;   // les votes de CE cycle
    const px = (typeof _rcLastPrice === 'function') ? Number(_rcLastPrice(pair)) : 0;
    if (!(px > 0) || (typeof _rcPriceAge === 'function' && _rcPriceAge(pair) > 120000)) return false;
    const k = S.realPairCycle && S.realPairCycle[pair]; if (!(k > 0)) return false;
    const tf = _thTf(), f = _thTfMs(tf);
    const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf]) || [];
    const ik = _thCandle(arr, k), last = arr[arr.length - 1];
    if (ik < 0 || arr[ik]._gap || !last || last._gap) return false;
    const T = _thState();
    if (T.pendV.some(q => q.p === pair && q.k === k)) return false;
    if (T.pendV.length >= TH_PEND_MAX) return false;
    const ids = T.vIds, v = [];
    sn.v.forEach(e => { const x = Math.round(Number(e[1]) * 1000); if (!x || typeof e[0] !== 'string') return; let i = ids.indexOf(e[0]); if (i < 0) { ids.push(e[0]); i = ids.length - 1; } v.push([i, x]); });
    if (!v.length) return false;
    const tn = Date.now(), s0 = Math.floor(tn / f) * f, cur = (last.ts === s0) ? last : null, cp = c => Math.round(Math.min(3, Math.max(1.5, Number(c) || 2)) * 1000) / 1000;
    const trade = (d, cap) => ({ p: pair, k: k, t: tn, px: px, d: d, c: 0, f: f, tf: tf, cap: cp(cap), x: TH_HZ.map(h => Math.floor((tn + h * f) / f) * f), n: TH_HZ.map(() => null),
      s: s0 - f, s0: s0, el: cur ? Number(cur.l) : px, eh: cur ? Number(cur.h) : px, hit: 0 });
    // [FITNESS AUX HORIZONS · 28/09/2026] le siège que chaque définition de la fitness retirerait maintenant (le plus faible) : bougie (wB) / horizons (wH) —
    // indices dans vIds, −1 si moins de deux sièges jugés ; leurs votes de ce cycle (qB, qH, ×1000, 0 = pas voté) sont mémorisés ici même : une évolution
    // d'ici l'horizon (_vjReset retire les votes du siège de la file) ne les efface pas de la preuve — c'est justement le siège retiré qu'elle juge (_vjJudge)
    const pk = _fitPicks(), wi = id => { if (!id) return -1; let i = ids.indexOf(id); if (i < 0) { ids.push(id); i = ids.length - 1; } return i; };
    const wB = wi(pk.b), wH = wi(pk.h), qv = i => { const e = i >= 0 ? v.find(x => x[0] === i) : null; return e ? e[1] : 0; };
    T.pendV.push({ p: pair, k: k, t: tn, f: f, v: v, dO: Math.sign(Number(sn.C1) || 0), dH: Math.sign(Number(sn.Ch) || 0), a: TH_HZ.map(() => 0), L: trade(1, capL), S: trade(-1, capS), wB: wB, wH: wH, qB: qv(wB), qH: qv(wH) });
    if (!(T.vSince > 0)) T.vSince = tn;
    return true;
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return false; }
}
// Les trades des voix, parcourus par _thWalk (mêmes règles que le sens décidé). Dès qu'un horizon est jugé des deux côtés : D = (long − short) / 2,
// chaque voix reçoit [v, D] à cet horizon (fenêtre de la fitness), et l'écart apparié des deux pesées ((sens nouveau − sens ancien) × D) entre
// dans son créneau. Un côté abandonné (coupure, bougie manquante) : l'horizon ne juge personne.
function _vjJudge(T) {
  try {
  if (!T.pendV.length) return 0;
  const cost = (typeof _ownStakeCostPct === 'function') ? Number(_ownStakeCostPct()) || 0 : 0, now = Date.now();
  const KEEP = (typeof FIT_KEEP !== 'undefined') ? FIT_KEEP : 240, keep = [], dm = {}, dmF = {}, touched = {}, brainF = _thBrainF(); let nJ = 0;   // gardés comme les jugements de la fitness (240) ; lus sur la fenêtre apprise (_dcMeritHz)
  T.pendV.forEach(q => {
    try {   // une entrée abîmée (restauration) est signalée et retirée : la file continue
    if (!q || !q.L || !q.S || !Array.isArray(q.v) || !Array.isArray(q.a) || !Array.isArray(q.L.n) || !Array.isArray(q.S.n) || !Array.isArray(q.L.x) || !Array.isArray(q.S.x)) throw new Error('bilan aux horizons : entrée abîmée ' + (q && q.p));
    _thWalk(q.L, cost, now); _thWalk(q.S, cost, now);
    TH_HZ.forEach((h, i) => {
      if (q.a[i]) return;
      const a = q.L.n[i], b = q.S.n[i];
      if (a === null || b === null) return;   // pas encore jugé d'un côté
      q.a[i] = 1;
      if (typeof a !== 'number' || typeof b !== 'number') return;   // abandonné d'un côté : ne juge personne
      const D = (a - b) / 2, Di = Math.round(D * 10000);
      if (q.f === brainF) q.v.forEach(e => {   // [HORLOGE PAR MODE · 01/10/2026] versé au bilan des voix seulement au pas de temps du cerveau (une note d'un autre pas, faite avant que l'autre mode n'entre en jeu, ne se mêle pas)
        const id = T.vIds[e[0]]; if (typeof id !== 'string' || Math.abs(e[1]) < 30) return;
        const Jv = (Array.isArray(T.vHz[id]) && T.vHz[id].length === TH_HZ.length) ? T.vHz[id] : (T.vHz[id] = TH_HZ.map(() => []));
        if (!Array.isArray(Jv[i])) Jv[i] = [];   // record abîmé : régénéré, la passe continue
        const Lh = Jv[i]; Lh.push(e[1], Di); if (Lh.length > 2 * KEEP) Lh.splice(0, Lh.length - 2 * KEEP);   // à plat : v, D, v, D, …
        nJ++; touched[id] = 1;
      });
      if (q.dO && q.dH) { _vjCmpAdd(T, i, q.t, q.f, (q.dH - q.dO) * D); dm[Math.round(q.f / 60000)] = true; }
      // [FITNESS AUX HORIZONS · 28/09/2026] les deux sièges « à retirer » ont-ils voté ici ? qualité de leur vote = v·D (pesée par la conviction : c'est
      // l'impact du siège sur la décision qui est jugé, un siège timide pèse peu) ; écart = bougie − horizons : positif = le siège retiré par la fitness
      // aux horizons a fait pire (donc mieux retiré). Votes lus dans l'entrée (qB, qH : mémorisés à la note) ; entrée d'avant cette mémoire : relus dans la file.
      if (q.wB >= 0 && q.wH >= 0) {
        const qv = (w, q0) => (typeof q0 === 'number') ? q0 : (e => e ? e[1] : 0)(q.v.find(e => e[0] === w)), qB = qv(q.wB, q.qB), qH = qv(q.wH, q.qH);
        if (Math.abs(qB) >= 30 && Math.abs(qH) >= 30) { _vjCmpAdd(T, i, q.t, q.f, (qB - qH) / 1000 * D, 'f'); dmF[Math.round(q.f / 60000)] = true; }
      }
    });
    if (!q.a.every(x => x)) keep.push(q);
    } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} }
  });
  T.pendV = keep;
  Object.keys(dm).forEach(k => { T.vDirtyF[k] = true; });
  Object.keys(dmF).forEach(k => { T.fDirtyF[k] = true; });
  const f0 = _thTfMs(_thTf()), fm = f0 / 60000, R = T.vRules[fm], RF = T.fRules[fm];
  if (T.vDirtyF[fm] && (!R || now - R.t >= 300000)) _vjRefresh(f0);   // le pas de temps du mode courant, comme le seuil
  if (T.fDirtyF[fm] && (!RF || now - RF.t >= 300000)) _vjRefresh(f0, 'f');   // [FITNESS AUX HORIZONS · 28/09/2026] idem pour le garde-fou de la fitness
  // [FITNESS AUX HORIZONS · 28/09/2026] les sièges qui viennent d'être jugés aux horizons : leur fitness suit sans attendre un jugement à la bougie — par la
  // même porte (_fitRecomputeAll restreint à eux ; bots, méta et composite n'ont pas de fitness aux horizons, rien à suivre). Première fitness aux
  // horizons : la ligne au journal (_fitHzFirst), si learnFromOutcome ne l'a pas déjà écrite.
  if (nJ) {
    const only = {}, isSeat = a => a && typeof a.id === 'string' && !a.isBot && !a.isMeta && a.id !== 'composite'; let nS = 0;
    (S.agents || []).forEach(a => { if (isSeat(a) && touched[a.id]) { only[a.id] = 1; nS++; } });
    if (nS) _fitRecomputeAll(only);
    _fitHzFirst();
  }
  return nJ;
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return 0; }
}
function _vjCmpAdd(T, i, t, f, diff, kind) {   // [FITNESS AUX HORIZONS · 28/09/2026] kind 'f' : l'écart des sièges retirés (T.fCmp) ; sinon celui des pesées (T.vCmp)
  const C = (kind === 'f') ? (T.fCmp || (T.fCmp = TH_HZ.map(() => ({})))) : T.vCmp;
  const M = C[i] || (C[i] = {}), key = Math.round(f / 60000) + ':' + Math.floor(t / ((TH_HZ[i] + 1) * f));
  const e = M[key] || (M[key] = [0, 0]); e[0] += Math.round(diff * 10000); e[1] += 1;
}
// Écart apparié d'un horizon : créneaux {fm, b, s (Σ écart, %), n} → moyenne par cycle, erreur type par créneau avec recouvrement (même calcul que
// _thEval pour un seul niveau), preuve au niveau Φ(−2)/25 (≥ 30 cycles, ≥ 20 créneaux) dans un sens ou dans l'autre.
function _vjCmpEval(bl) {
  const idx = {}; bl.forEach(x => { idx[x.fm + ':' + x.b] = x; });
  let N = 0, Ss = 0, A = 0, B = 0, Q = 0, P1 = 0, P2 = 0, P3 = 0, nb = 0;
  bl.forEach(x => {
    N += x.n; Ss += x.s; A += x.s * x.s; B += x.s * x.n; Q += x.n * x.n; nb++;
    const y = idx[x.fm + ':' + (x.b + 1)]; if (y) { P1 += x.s * y.s; P2 += x.s * y.n + x.n * y.s; P3 += x.n * y.n; }
  });
  const out = { n: N, blocks: nb, mean: N ? Ss / N : null, se: null, crit: null, better: false, worse: false };
  if (N < TH_MIN_N || nb < TH_MIN_B) return out;
  const m = Ss / N, v0 = Math.max(0, A - 2 * m * B + m * m * Q), c1 = P1 - m * P2 + m * m * P3;
  const se = Math.sqrt(Math.max(v0, v0 + 2 * c1) / (N * N) * (nb / (nb - 1))), k = _thCrit(nb);
  out.se = se; out.crit = k; out.better = m - k * se > 0; out.worse = m + k * se < 0;
  return out;
}
// Juge l'écart par horizon (fenêtre : 30 créneaux du plus long horizon, comme le seuil) et bascule la pesée si une preuve le demande.
// [FITNESS AUX HORIZONS · 28/09/2026] kind 'f' : même jugement pour la fitness des sièges (écart des sièges retirés, T.fCmp → T.fModes / T.fRules) ;
// une bascule de la fitness recalcule la fitness de tous les sièges (_fitRecomputeAll).
function _vjRefresh(fArg, kind) {
  try {
    const KF = (kind === 'f'), T = _thState(), now = Date.now(), hmax = Math.max.apply(null, TH_HZ), f = Number(fArg) > 0 ? Number(fArg) : _thTfMs(_thTf()), fm = f / 60000, prev = _vjMode(fm, kind);
    const CMP = KF ? T.fCmp : T.vCmp, MODES = KF ? T.fModes : T.vModes, RULES = KF ? T.fRules : T.vRules, DIRTY = KF ? T.fDirtyF : T.vDirtyF, g0 = KF ? _fjMode() : null;
    const left = {};   // [FITNESS AUX HORIZONS · 28/09/2026] créneaux encore dans leur fenêtre, par pas de temps (une preuve ne survit pas à ses données)
    const hz = TH_HZ.map((h, i) => {
      const M = CMP[i] || (CMP[i] = {}), bl = [];
      Object.keys(M).forEach(key => {
        const kf = Number(key.split(':')[0]), b = Number(key.split(':')[1]), e = M[key];
        if (!(kf > 0) || !Array.isArray(e) || (b + 1) * (h + 1) * kf * 60000 < now - 1.5 * TH_MIN_B * (hmax + 1) * kf * 60000) { delete M[key]; return; }
        left[kf] = (left[kf] || 0) + 1;
        if (kf === fm) bl.push({ fm: kf, b: b, s: e[0] / 10000, n: e[1] });   // ce pas de temps seulement : EV 15 min et RE 1 h ne se mêlent pas
      });
      const r = _vjCmpEval(bl); r.h = h; return r;
    });
    const better = hz.some(x => x.better), worse = hz.some(x => x.worse);
    let mode = prev, expCur = false;
    if (prev === 'hz' && worse && !better) mode = 'bougie';
    else if (prev === 'bougie' && better && !worse) mode = 'hz';
    // [FITNESS AUX HORIZONS · 28/09/2026] une preuve ne survit pas à ses données : un pas de temps « bougie » dont plus aucun créneau n'est dans sa fenêtre
    // (purge ci-dessus — le pas courant sans cycle depuis longtemps, ou un pas qu'on ne joue plus) revient aux horizons. Sinon un retour prouvé sur un pas
    // abandonné verrouillerait la fitness de tous les sièges sans qu'aucune donnée ne puisse plus le lever. Les pesées des voix (par pas) ne sont pas concernées.
    if (KF && mode === 'bougie' && !left[fm]) { mode = 'hz'; expCur = true; }
    MODES[fm] = mode; DIRTY[fm] = false; RULES[fm] = { t: now, mode: mode, hz: hz, tfMs: f, expired: expCur || undefined };
    const expired = [];
    if (KF) Object.keys(MODES).forEach(k => { if (Number(k) !== fm && MODES[k] === 'bougie' && !left[k]) { MODES[k] = 'hz'; RULES[k] = { t: now, mode: 'hz', hz: [], tfMs: Number(k) * 60000, expired: true }; expired.push(Number(k)); } });
    const g1 = KF ? _fjMode() : null;   // [FITNESS AUX HORIZONS · 28/09/2026] la définition vivante (une par siège, tous pas de temps) a-t-elle changé ?
    if ((mode !== prev || expired.length) && S.chainLog) {
      const f2 = x => (x >= 0 ? '+' : '') + x.toFixed(3).replace('.', ','), L = (x) => _thHzLab(x.h, f), tfl = ' (pas de temps ' + _thHzLab(1, f) + ')';
      const exp = k => 'Fitness des sièges · la preuve du pas de temps ' + _thHzLab(1, k * 60000) + ' a expiré avec ses données (plus aucun créneau dans sa fenêtre) : ce pas revient aux horizons';
      const lines = [];
      if (mode !== prev) {
        if (expCur) lines.push(exp(fm));
        else {
          const pr = hz.filter(x => (mode === 'bougie') ? x.worse : x.better).map(x => L(x) + ' (écart ' + f2(x.mean) + (KF ? ' %×vote/cycle ± ' : ' %/cycle ± ') + x.se.toFixed(3).replace('.', ',') + ', ' + x.n + ' cycles)').join(' ; ');
          const what = KF ? ['Fitness des sièges · retour à la bougie — elle retirait de plus mauvais sièges' + tfl + ' : ', 'Fitness des sièges · aux horizons — elle retire de plus mauvais sièges' + tfl + ' : ']
                          : ['Poids des voix · retour à la bougie — l\'ancienne pesée a fait mieux : ', 'Poids des voix · aux horizons — la pesée aux horizons a fait mieux : '];
          lines.push((mode === 'bougie' ? what[0] : what[1]) + pr);
        }
      }
      expired.forEach(k => lines.push(exp(k)));
      const tail = !KF ? '' : (g1 !== g0 ? ' → une seule fitness par siège : tous recalculés (' + (g1 === 'bougie' ? 'bougie' : 'horizons') + ')' : ' → la définition vivante reste à la bougie (retour prouvé à un autre pas de temps)');
      lines.forEach((d, i) => S.chainLog.push({ icon: '⚖️', desc: d + (i === lines.length - 1 ? tail : ''), hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : '' }));
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    if (KF && g1 !== g0) { try { _fitRecomputeAll(); } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} } }   // la fitness de tous les sièges suit la définition vivante
    return RULES[fm];
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return null; }
}
// Pesée vivante du pas de temps (celui du mode courant à défaut) : 'hz' tant qu'un retour à la bougie n'est pas prouvé.
function _vjMode(fm, kind) { const T = S.dcThreshold, k = Number(fm) > 0 ? Number(fm) : _thTfMs(_thTf()) / 60000, M = T && (kind === 'f' ? T.fModes : T.vModes); return (M && M[k] === 'bougie') ? 'bougie' : 'hz'; }
// [FITNESS AUX HORIZONS · 28/09/2026] définition vivante de la fitness des sièges — UNE par siège, partagée par tous les pas de temps (la fitness est un
// scalaire lu par l'évolution, la sortie « signal inversé », l'affichage, quel que soit le mode qui bat à cet instant) : 'bougie' dès qu'UN pas de
// temps a prouvé le retour (T.fModes), 'hz' sinon. La preuve, elle, reste accumulée et jugée par pas de temps (_vjMode(fm, 'f'), écran 11b).
function _fjMode() { const T = S.dcThreshold, M = T && T.fModes; return (M && Object.keys(M).some(k => M[k] === 'bougie')) ? 'bougie' : 'hz'; }
// Le siège évolue (07 : « la fenêtre repart de zéro : elle mesure le génome courant ») : son bilan aux horizons repart aussi de zéro — record
// effacé, ses votes encore en attente retirés (ils étaient ceux de l'ancien génome). La décision reprend son ancien poids le temps qu'il se rejuge.
function _vjReset(id) {
  try {
    const T = _thState(); let n = 0;
    if (T.vHz && T.vHz[id]) { delete T.vHz[id]; n++; }
    const i = T.vIds.indexOf(id);
    if (i >= 0) T.pendV.forEach(q => { if (q && Array.isArray(q.v)) { const k = q.v.length; q.v = q.v.filter(e => e[0] !== i); n += k - q.v.length; } });
    return n;
  } catch (e) { return 0; }
}
// Poids d'une voix aux horizons : max(0, moyenne des E_h), E_h = Σ v·D / Σ |v·D| sur ses W derniers jugements à l'horizon h (W = fenêtre apprise
// de la fitness) ; null tant qu'un horizon a moins de 5 jugements (la décision prend alors son ancien poids). Une erreur ici est signalée (_decErr).
// [FITNESS AUX HORIZONS · 28/09/2026] Le bilan aux horizons d'une voix, brut : moyenne des E_h ∈ [−1, 1] sur ses W derniers jugements à chaque
// horizon ; null tant qu'un horizon a moins de 5 jugements. Sert au poids de la voix (_dcMeritHz, borné à 0) et à la fitness du siège (_fitHz).
function _vjE(id, W) {
  const T = S.dcThreshold, Jv = T && T.vHz && T.vHz[id];
  if (!Array.isArray(Jv) || Jv.length !== TH_HZ.length) return null;
  const nMin = (typeof FIT_MIN_N !== 'undefined') ? FIT_MIN_N : 5;
  let s = 0;
  for (let i = 0; i < Jv.length; i++) {
    const L = Array.isArray(Jv[i]) ? Jv[i] : [], n = Math.min(L.length >> 1, W);   // à plat : v, D, v, D, … ; comptés dans la fenêtre, comme _dcMerit
    if (n < nMin) return null;
    let a = 0, b = 0;
    for (let j = Math.max(0, L.length - 2 * W); j + 1 < L.length; j += 2) { const x = Number(L[j]) * Number(L[j + 1]); if (isFinite(x)) { a += x; b += Math.abs(x); } }
    s += b > 0 ? a / b : 0;
  }
  return s / Jv.length;
}
function _dcMeritHz(id) {
  try {
    const e = _vjE(id, (typeof _fitWindow === 'function') ? _fitWindow() : 60);
    return e === null ? null : Math.max(0, e);
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return null; }
}
// ═══ [FITNESS AUX HORIZONS · 28/09/2026] LE SIÈGE VAUT CE QUE SES VOTES ONT DONNÉ AUX HORIZONS (go Rams 28/09 04:29) ═══
// Avant : la fitness d'un siège = 350 + 1 000 × E, E = bilan de ses jugements à la BOUGIE SUIVANTE (sens du vote contre le mouvement jusqu'au
// cycle suivant, sans frais) — c'est elle qui décide l'évolution (07 triggerEvolution : le siège le plus faible est recyclé, 1 fois par heure au
// plus ; tournoi des parents, fitness de naissance, pépinière), la sortie « signal inversé » (10f consRev : poids des agents opposés), le poids
// contextuel de repli et l'affichage. Or la décision est jugée — et serait tradée — de 15 min à 4 h. Maintenant la fitness d'un siège suit son
// bilan aux horizons (le même record que le poids de sa voix, 20260927k : E_h = Σ v·D / Σ |v·D| sur la fenêtre apprise, D = ce que le long a
// rapporté de plus que le short à l'horizon) : fitness = 350 + 1 000 × moyenne des 5 E_h (bornée 50-2 000 comme avant), dès qu'il a 5 jugements
// à chaque horizon ; sinon sa fenêtre de jugements à la bougie, comme avant. Une seule porte de calcul (_fitCurrent) et trois écritures, toutes
// par elle (_fitJudge, la branche d'abstention, _fitRecomputeAll — aussi pour les sièges qui viennent d'être jugés aux horizons, _vjJudge). Les bots
// (jugés sur leurs actes), le méta (l'Évolueur, jugé sur ses évolutions) et l'analyse (voix composite) gardent leur propre jugement. La première
// fitness aux horizons est journalisée une fois (T.fSince, _fitHzFirst). Une preuve de retour ne survit pas à ses données : un pas de temps sans plus
// aucun créneau dans sa fenêtre revient aux horizons (_vjRefresh). Constaté au rejeu de cette livraison : le marché LMSR de 08 (héritage) débitait
// a.fitness toutes les 6 s entre deux jugements (≈ 0,14 × fitness × |score| × prix par passe) — depuis 20260928b [MARCHÉ LMSR À PART] il débite son
// portefeuille par siège (a.lmsrWallet, rechargé ici à chaque écriture de la fitness : même dynamique de marché qu'avant) : entre deux jugements la
// fitness ne bouge plus, le jugement en est la seule écriture courante.
// Garde-fou appris PROPRE À LA FITNESS (la pesée des voix a le sien) : à chaque cycle noté, le siège que chaque définition retirerait maintenant
// (le plus faible : bougie wB, horizons wH) est mémorisé AVEC son vote (qB, qH — une évolution d'ici l'horizon ne l'efface pas de la preuve) ;
// quand l'horizon est jugé et que les deux ont voté sur ce cycle, écart = qualité du vote de wB − qualité du vote de wH, qualité = v·D (pesée
// par la conviction : c'est l'impact du siège sur la décision qui est jugé, un siège timide pèse peu) : positif = la fitness aux horizons a
// désigné un siège qui a fait pire — un meilleur choix à retirer. Jugé par horizon et par pas de temps comme le seuil (créneaux, recouvrement,
// Student Φ(−2)/25, ≥ 30 cycles, ≥ 20 créneaux) : « pire » prouvé à un horizon et « meilleur » à aucun → ce pas de temps repasse à la bougie ;
// retour inverse. La fitness étant UN scalaire par siège, sa définition vivante est une (_fjMode) : bougie dès qu'un pas de temps l'a prouvé,
// pour tous les sièges (journal ⚖️, _fitRecomputeAll). Le siège qui évolue repart de zéro (_vjReset, 07). L'essai d'évolution (nouveau génome
// contre l'ancien, _evoTrialJudge) reste jugé à la bougie.
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres de 9 h, 2 tirages, ce code ; chaque fenêtre part sans record aux horizons — la fitness aux horizons
// n'agit qu'une fois 5 jugements réunis à 4 h) : tirage 1 : 0 trades, net 0 $ ; tirage 2 : 0 trades, net 0 $ ; 0 erreur. Sièges : tirage 1 : 189 sièges-fenêtres, 100 au record complet en fin de fenêtre (fitness vivante = horizons pour 90, le reste débité par le LMSR, voir plus bas), cassés (≤ 80 T$) : 43 vivante / 35 bougie / 32 horizons ; Spearman bougie-horizons 0,57, écart moyen |bougie − horizons| 195 T$ — tirage 2 : 189 sièges-fenêtres, 96 au record complet en fin de fenêtre (fitness vivante = horizons pour 85, le reste débité par le LMSR, voir plus bas), cassés (≤ 80 T$) : 42 vivante / 31 bougie / 33 horizons ; Spearman bougie-horizons 0,63, écart moyen |bougie − horizons| 170 T$. Sièges désignés : tirage 1 : 4048 cycles notés, deux sièges désignés dans 4020, désaccord des deux définitions dans 1050 (26 %), les deux ont voté dans 2845 — tirage 2 : 4048 cycles notés, deux sièges désignés dans 4020, désaccord des deux définitions dans 1075 (27 %), les deux ont voté dans 2786.
// Écart apparié bougie − horizons (qualité v·D du siège que chaque définition retirerait, %×vote/cycle ± erreur type, `_vjCmpEval` livrée, sans le biais de fin de
// fenêtre) : tirage 1 : 15 min −0,004 ± 0,004 (2677 cycles, 169 créneaux) ; 30 min −0,005 ± 0,005 (2597 cycles, 116 créneaux) ; 1 h −0,004 ± 0,006 (2478 cycles, 70 créneaux) ; 2 h −0,006 ± 0,012 (2170 cycles, 38 créneaux) ; 4 h +0,010 ± 0,005 (1605 cycles, 23 créneaux) — tirage 2 : 15 min −0,008 ± 0,005 (2628 cycles, 167 créneaux) ; 30 min −0,006 ± 0,004 (2561 cycles, 114 créneaux) ; 1 h −0,002 ± 0,005 (2426 cycles, 70 créneaux) ; 2 h −0,007 ± 0,005 (2113 cycles, 38 créneaux) ; 4 h +0,003 ± 0,003 (1541 cycles, 23 créneaux). Évolutions : tirage 1 : 77 évolutions (0 manuelles), cible = le plus faible par fitness vivante dans 77 ; deux sièges désignés au moment même dans 77 : cible = celui des horizons 77, = celui de la bougie 58, ni l'un ni l'autre 0 ; désaccord des deux définitions à cet instant 19, dont cible = celui des horizons (elle aurait été différente à la bougie) 19 ; cible sans preuve (nouveau-né) 0, au record complet 17 ; cible dont la fitness vivante était débitée de plus de 50 T$ sous sa définition (LMSR) 0 (écart moyen — T$) — tirage 2 : 77 évolutions (0 manuelles), cible = le plus faible par fitness vivante dans 77 ; deux sièges désignés au moment même dans 77 : cible = celui des horizons 77, = celui de la bougie 56, ni l'un ni l'autre 0 ; désaccord des deux définitions à cet instant 21, dont cible = celui des horizons (elle aurait été différente à la bougie) 21 ; cible sans preuve (nouveau-né) 0, au record complet 20 ; cible dont la fitness vivante était débitée de plus de 50 T$ sous sa définition (LMSR) 0 (écart moyen — T$). Fitness vivante hors des deux définitions (débit LMSR de 08) : tirage 1 : 12 sièges-fenêtres sur 144 hors de leur définition en fin de fenêtre (écart moyen -242 T$, jusqu'à -737) — tirage 2 : 15 sièges-fenêtres sur 142 hors de leur définition en fin de fenêtre (écart moyen -228 T$, jusqu'à -580). Journal : tirage 1 : ligne « désormais aux horizons » dans 9 fenêtres sur 9, bascules ⚖️ fitness 0, voix 0, preuves expirées 0 — tirage 2 : ligne « désormais aux horizons » dans 9 fenêtres sur 9, bascules ⚖️ fitness 0, voix 0, preuves expirées 0.
function _fitHz(a) {
  try {
    if (!a || a.isBot || a.isMeta || a.id === 'composite' || typeof a.id !== 'string') return null;
    const e = _vjE(a.id, (typeof _fitWindow === 'function') ? _fitWindow() : 60);
    return e === null ? null : _fitScale(e);
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return null; }
}
// La fitness d'un agent telle qu'elle doit être maintenant : un siège → aux horizons si son record est complet et que la définition vivante est
// 'hz' ; sinon (et bots / méta / composite) sa fenêtre de jugements ; null = pas de preuve, la valeur en place reste (fitness de naissance).
function _fitCurrent(a) {
  if (!a) return null;
  if (_fjMode() === 'hz') { const f = _fitHz(a); if (f !== null) return f; }
  return _fitOf(Array.isArray(a._judgments) ? a._judgments : [], _fitWindow());
}
// Le siège que chaque définition retirerait maintenant : le plus faible parmi les sièges déjà jugés (au moins 5 jugements à la bougie ; la
// définition aux horizons prend la bougie pour un siège pas encore jugé aux 5 horizons, comme _fitCurrent). Moins de deux sièges → rien.
// Cas limite assumé : un siège au record horizons complet mais sans 5 jugements à la bougie (votes toujours entre 0,03 et 0,05) n'est candidat
// sous aucune définition ici, bien que _fitCurrent lui donne sa fitness aux horizons ; les sièges à fitness de naissance non plus. Une erreur
// ici est signalée (_decErr) : sinon le garde-fou se tairait sans trace.
function _fitPicks() {
  try {
    const W = _fitWindow(), rows = [];
    (S.agents || []).forEach(a => {
      if (!a || a.isBot || a.isMeta || typeof a.id !== 'string') return;
      const fb = _fitOf(Array.isArray(a._judgments) ? a._judgments : [], W); if (fb === null) return;
      const fh = _fitHz(a); rows.push({ id: a.id, b: fb, h: fh === null ? fb : fh });
    });
    if (rows.length < 2) return { b: null, h: null };
    let wb = rows[0], wh = rows[0];
    rows.forEach(r => { if (r.b < wb.b) wb = r; if (r.h < wh.h) wh = r; });
    return { b: wb.id, h: wh.id };
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return { b: null, h: null }; }
}
// [FITNESS AUX HORIZONS · 28/09/2026] La première fois qu'un siège reçoit sa fitness aux horizons : une ligne au journal, datée (T.fSince, persisté avec
// dcThreshold), comme toute transition du projet. Tentée après les jugements d'un cycle (learnFromOutcome, avant l'évolution qui lit cette fitness) et
// après les jugements aux horizons (_vjJudge) ; rien tant que la définition vivante n'est pas « horizons » ou qu'aucun siège n'a son record complet.
function _fitHzFirst() {
  try {
    const T = S.dcThreshold; if (!T || T.fSince > 0 || !S.chainLog || _fjMode() !== 'hz') return false;
    const isSeat = a => a && typeof a.id === 'string' && !a.isBot && !a.isMeta && a.id !== 'composite';
    const hzN = (S.agents || []).filter(a => isSeat(a) && _fitHz(a) !== null).length; if (!hzN) return false;
    T.fSince = Date.now();
    S.chainLog.push({ icon: '\uD83E\uDDEC', desc: 'Fitness des sièges : désormais leur bilan aux horizons — ' + hzN + ' siège(s) au record complet recalculé(s), les autres restent à la bougie le temps de l\'avoir · le garde-fou appris la ramène à la bougie si elle retirait de plus mauvais sièges',
      hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : '' });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    return true;
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return false; }
}
// ═══ [MARCHÉ RÉPARÉ · 30/09/2026] LE MARCHÉ DES AGENTS, TEL QU'IL A ÉTÉ CONÇU (go Rams 30/09 04:05) ═══
// La conception fondatrice (AURA8_REFERENCE_MASTER) : avant chaque cycle, les agents parient leurs T$ sur la hausse ou la baisse de CHAQUE paire ;
// le prix LMSR (b = 100, q_yes = q_no = 100 → 50 %) est la conviction collective ; après résolution du cycle, les paris justes gagnent des T$, les
// autres en perdent. Ce qui tournait avant ce commit (diagnostic du 29/09) : chaque agent misait la même chose sur toutes les paires (a.score, son
// biais global, 08 toutes les 6 s), personne n'était jamais payé, le marché ne revenait à 50/50 qu'à la fermeture d'un trade (plus aucun depuis le
// 27/09), le prix était un rapport qYes / (qYes + qNo) poussé en plus par le rendu (08) et par la décision elle-même (10f) : les 12 marchés
// saturaient en bloc (29/09, EV : 78 à 98 % de hausse sur toutes les paires) et le Bot Scalper, qui vote par ce prix, était à la butée 96 % du temps.
// Maintenant, en EV / RE (AA garde l'ancien marché : bac à sable, rien n'y est jugé) — une MANCHE par paire et par bougie close :
//  · ouverture (10f, à chaque cycle de la paire, juste après le roster frais de LA paire) — seulement si le dernier prix réel a moins de 2 min et
//    que la bougie close n'est pas un bouche-trou (mêmes conditions que le trade virtuel, _thNote) : q = 100 / 100 (50 %) ; chaque agent qui vote
//    sur la paire (|vote| ≥ 0,03, comme dans la décision commune ; bots et méta n'y votent pas ici) mise, dans un ordre tiré au sort à chaque
//    manche, pour amener le prix à SA croyance p = 0,5 + vote / 2 : il achète des parts OUI si le prix est sous p, des parts NON au-dessus, au vrai
//    coût LMSR, avec au plus 8 % de ses T$ répartis sur les paires actives du mode (budget atteint avant p : il s'arrête au budget) ;
//  · résolution, au cycle suivant de la paire : à la clôture de la bougie qui était EN COURS à l'ouverture — clôture au-dessus du prix réel
//    d'ouverture : chaque part OUI paie 1 T$ ; en dessous : chaque part NON. Manche nulle, chaque mise rendue : clôture égale, bougie jamais
//    reçue (4 bougies de retard) ou clôture pas sûre — bougie suivie d'un bouche-trou ou d'un trou (même règle que les trades virtuels : sa
//    « clôture » serait le dernier prix avant la coupure). Puis le marché repart de 50/50 et la manche suivante s'ouvre. Une manche ouverte tard
//    dans sa bougie (cycle en retard : reprise de l'app, fin de pause) a un horizon court — assumé, l'horizon de chaque manche est journalisé ;
//  · les T$ restent au siège (a.mktWallet) : sa fitness au premier pari (la dotation d'origine : T$ = fitness), puis SEULEMENT ses mises et ses
//    gains — plus de remise à la fitness. Qui voit juste a plus de T$, mise plus, donc pèse plus sur le prix. À la naissance d'un génome (07) : sa
//    fitness de naissance, génération suivante (a.mktGen) ; une mise encore ouverte du génome retiré n'est ni payée ni rendue au nouveau-né ;
//  · lmsrP (02) rend en EV / RE le prix de la manche ouverte, 1 / (1 + e^((qNo − qYes) / b)) — le vrai prix LMSR ; hors manche : 50 % ;
//  · le prix devient une VOIX de la décision commune (« marche », vote = (prix − 0,5) × 2), pesée par son bilan et jugée comme le composite : à la
//    bougie suivante (_dcForwardJudge) et aux 5 horizons (_vjNote, avec toutes les voix).
// Constantes FONDATRICES, pas apprises (la simulation d'origine) : b = 100, q = 100 / 100, mise 8 % des T$ réparties sur les paires, manche d'une
// bougie. Personne d'autre n'écrit plus le marché d'une paire en EV / RE : ni les ordres de 08, ni le rendu (08), ni la décision (10f : poussée vers
// elle, décroissance, remise à 50/50 à la fermeture). Et la cadence à laquelle une paire EV / RE regarde si sa bougie est close ne se règle plus sur
// ce prix (syncPairPresets : AA seulement ; 10f la règle sur la conviction de la décision).
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres de 9 h, 2 tirages, ce code ; chaque fenêtre part d'un backup d'avant, donc sans T$ : ils y repartent de la fitness) : tirage 1 : 0 trades, net 0 $ ; tirage 2 : 0 trades, net 0 $ ; 0 erreur. 7162 manches (6670 soldées, 492 nulles — mises rendues), 9 mises par manche (médiane ; 2 à 15), horizon médian 15 min ; prix de la manche de 0,419 à 0,590 (5e-95e centiles ; extrêmes 0,318-0,719), aucun au-delà de 10 / 90 % (avant, en EV : 78 à 98 % sur toutes les paires, en bloc). Ce que vaut le prix : erreur (Brier) 0,2566 contre 0,250 pour pile ou face (écart +0,0066 ± 0,0015, 26 créneaux de 4 h), bon sens 47 % — il ne prévoit pas mieux que les votes qu'il agrège (les agents : 45 à 54 % au rejeu du 27/09) ; son bilan le met à 0 dans la décision dans 12 fenêtres sur 18. Décision commune (pesée aux horizons), net %/trade à 15 min, 30 min, 1 h, 2 h, 4 h : −0,291 / −0,293 / −0,272 / −0,246 / −0,134 (20260928d, même rejeu : −0,297 / −0,298 / −0,271 / −0,213 / −0,066). Bot Scalper : 142 votes (20260928d : 3776, dont 58 % à la butée) ; Scalper (siège) : 164 votes (20260928d : 2762).
// T$ gardés d'une fenêtre à l'autre, comme dans l'app (simulation sur les mêmes manches, mêmes votes, mêmes issues, fonctions réelles de ce code) : tirage 1 : erreur 0,2521 (T$ remis à chaque fenêtre, le rejeu : 0,2564 ; mise égale : 0,2537), 58 % des T$ aux trois plus riches ; tirage 2 : erreur 0,2525 (T$ remis à chaque fenêtre, le rejeu : 0,2567 ; mise égale : 0,2534), 58 % des T$ aux trois plus riches ; les T$ vont d'abord à volume_v1, security_v1, sentiment_v2, quittent swing_v2, corr_v1, onchain_v1 — le marché se corrige vers pile ou face, sans le battre (un prix constant au taux de hausse des 81 h ferait 0,2483).
var MKT_B = 100, MKT_Q0 = 100, MKT_STAKE = 0.08;
var MKT_LOG_MAX = 1000;   // mémoire (pas une limite de marché) : les dernières manches soldées (≈ 10 h à 12 paires dans les deux modes), pour le rejeu — les compteurs de l'écran, eux, sont cumulés (S.mktStats)
function _mktOn() { return !!(typeof S !== 'undefined' && S && (S.tradingMode === 'paperReal' || S.tradingMode === 'real')); }
// Prix et coût LMSR (stables : pas d'exponentielle qui déborde)
function _mktPrice(qY, qN) { const d = (Number(qN) - Number(qY)) / MKT_B; return isFinite(d) ? 1 / (1 + Math.exp(d)) : 0.5; }
function _mktCost(qY, qN) { const m = Math.max(qY, qN); return m + MKT_B * Math.log(Math.exp((qY - m) / MKT_B) + Math.exp((qN - m) / MKT_B)); }
// Le prix lu par lmsrP en EV / RE : la manche ouverte de la paire, 50 % sinon
function _mktP(ps) { return (ps && ps.mkt && ps.mkt.open) ? _mktPrice(ps.qYes, ps.qNo) : 0.5; }
// Les T$ d'un siège : sa fitness au premier pari (dotation d'origine), puis seulement ses mises et ses gains
function _mktWallet(a) { if (!a) return 0; if (typeof a.mktWallet !== 'number' || !isFinite(a.mktWallet)) a.mktWallet = Math.max(0, Number(a.fitness) || 0); return a.mktWallet; }
function _mktNPairs() {
  try {
    const A = (S.tradingMode === 'real') ? S.realActivePairs : S.paperRealActivePairs;
    const n = A ? Object.keys(A).filter(p => A[p]).length : 0;
    return n > 0 ? n : Math.max(1, Object.keys((typeof PAIRS !== 'undefined' && PAIRS) || {}).length);
  } catch (e) { return 1; }
}
// Une mise : amener le prix de la paire à la croyance p = 0,5 + vote / 2, sans dépasser le budget. Achète des parts OUI (prix < p) ou NON (prix > p).
// Parts pour atteindre p : Δ = q_autre + b·ln(p / (1 − p)) − q_soi ; parts que paie le budget B : C(q + Δ) = C(q) + B, résolu exactement.
function _mktBet(ps, v, budget) {
  const x = Math.max(-1, Math.min(1, Number(v))), B = Number(budget);
  if (!(Math.abs(x) > 0) || !(B > 0) || !ps) return null;
  const p = 0.5 + x / 2, qY = Number(ps.qYes), qN = Number(ps.qNo);
  if (!isFinite(qY) || !isFinite(qN)) return null;
  const P = _mktPrice(qY, qN), C0 = _mktCost(qY, qN);
  let yes = 0, no = 0;
  if (p > P) {
    const toP = (p >= 1) ? Infinity : qN + MKT_B * Math.log(p / (1 - p)) - qY;
    const toB = C0 + B + MKT_B * Math.log1p(-Math.exp((qN - C0 - B) / MKT_B)) - qY;
    yes = Math.max(0, Math.min(toP, toB));
  } else if (p < P) {
    const toP = (p <= 0) ? Infinity : qY + MKT_B * Math.log((1 - p) / p) - qN;
    const toB = C0 + B + MKT_B * Math.log1p(-Math.exp((qY - C0 - B) / MKT_B)) - qN;
    no = Math.max(0, Math.min(toP, toB));
  }
  if (!isFinite(yes) || !isFinite(no) || !(yes > 0 || no > 0)) return null;
  const cost = _mktCost(qY + yes, qN + no) - C0;
  if (!(cost > 0) || !isFinite(cost)) return null;
  ps.qYes = qY + yes; ps.qNo = qN + no;
  return { yes: yes, no: no, cost: cost };
}
function _mktStats(m) {
  if (!S.mktStats || typeof S.mktStats !== 'object') S.mktStats = { since: Date.now() };
  const k = (m === 'R') ? 'R' : 'E';
  if (!S.mktStats[k] || typeof S.mktStats[k] !== 'object') S.mktStats[k] = { n: 0, v: 0, b: 0, br: 0, d: 0, ok: 0, up: 0, vol: 0, paid: 0, fw: 0 };   // fw : manches suivies (prix de l'autre mode, sans mise)
  return S.mktStats[k];
}
// Ouverture d'une manche (ps = la paire DU MODE traité) : 50/50, puis chaque agent qui vote sur la paire mise SON vote, dans un ordre tiré au sort.
function _mktOpen(pair, ps, now) {
  if (ps.mkt && ps.mkt.open) return 0;   // une manche à la fois
  const px = (typeof _rcLastPrice === 'function') ? Number(_rcLastPrice(pair)) : 0;
  if (!(px > 0) || (typeof _rcPriceAge === 'function' && _rcPriceAge(pair) > 120000)) return 0;   // prix figé (> 2 min) : pas de manche
  const k = S.realPairCycle && S.realPairCycle[pair]; if (!(k > 0)) return 0;
  const tf = _thTf(), f = _thTfMs(tf);
  const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf]) || [];
  const ik = _thCandle(arr, k), last = arr[arr.length - 1];
  if (ik < 0 || arr[ik]._gap || !last || last._gap) return 0;   // bougie close inconnue ou bouche-trou : pas de prix sûr
  const x = Number(last.ts); if (!(x > k)) return 0;   // la manche se solde à la clôture de la bougie EN COURS
  const prev = (ps.mkt && !ps.mkt.open && ps.mkt.t) ? { P: ps.mkt.P, out: ps.mkt.out, n: ps.mkt.n } : null;
  // [HORLOGE PAR MODE · 01/10/2026] les T$ se jouent une fois par bougie : l'autre mode, en marche sur un pas de temps plus court, tient le marché ;
  // sur le même pas de temps, s'il a déjà ouvert la manche de cette bougie (même bougie de sortie), on suit son prix — mêmes parts, même voix — sans miser
  if (!_thBrainTf()) return 0;
  const oth = (S.tradingMode === 'real') ? 'paperReal' : 'real', ows = S.walletStore && S.walletStore[oth], ops = ows && ows.pairStates && ows.pairStates[pair], L = ops && ops.mkt;
  if (L && L.open && !L.fw && L.tf === tf && L.x === x && isFinite(ops.qYes) && isFinite(ops.qNo)) {
    ps.qYes = ops.qYes; ps.qNo = ops.qNo;
    ps.mkt = { open: true, fw: 1, t: now, p0: L.p0, tf: tf, f: f, x: x, m: (S.tradingMode === 'real') ? 'R' : 'E', pos: {}, n: L.n, vol: 0, prev: prev };
    return 0;
  }
  const votes = (ps.roster && ps.roster.votes) || {};
  ps.qYes = MKT_Q0; ps.qNo = MKT_Q0;
  const R = { open: true, t: now, p0: px, tf: tf, f: f, x: x, m: (S.tradingMode === 'real') ? 'R' : 'E', pos: {}, n: 0, vol: 0, prev: prev };
  ps.mkt = R;
  const who = (S.agents || []).filter(a => a && !a.isBot && !a.isMeta && typeof a.id === 'string' && typeof votes[a.id] === 'number' && isFinite(votes[a.id]) && Math.abs(votes[a.id]) >= 0.03);
  for (let i = who.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = who[i]; who[i] = who[j]; who[j] = t; }
  const nP = _mktNPairs();
  who.forEach(a => {
    const w = _mktWallet(a), qY = ps.qYes, qN = ps.qNo, r = _mktBet(ps, votes[a.id], w * MKT_STAKE / nP);
    if (!r) return;
    const c = Math.round(r.cost * 10000) / 10000;
    if (!(c > 0)) { ps.qYes = qY; ps.qNo = qN; return; }   // mise trop petite pour compter (T$ presque épuisés) : rien acheté
    a.mktWallet = w - c;
    R.pos[a.id] = [Math.round(r.yes * 10000) / 10000, Math.round(r.no * 10000) / 10000, c, Number(a.mktGen) || 0];   // parts OUI, parts NON, mise, génération du siège
    R.n++; R.vol = Math.round((R.vol + c) * 10000) / 10000;
  });
  return R.n;
}
// Résolution : la bougie de sortie (x) est close → les parts justes paient 1 T$ ; bouche-trou, jamais reçue ou clôture égale → mises rendues.
// Rend 1 (hausse), −1 (baisse), 0 (nulle) ; null si la manche attend encore sa bougie (ou s'il n'y en a pas).
function _mktSettle(pair, ps, now) {
  const R = ps && ps.mkt; if (!R || !R.open) return null;
  const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][R.tf]) || [];
  const j = _thCandle(arr, R.x);
  let out;
  if (j >= 0 && j < arr.length - 1) {
    // clôture sûre seulement si la bougie suivante est là, contiguë et pas un bouche-trou (même règle que _thWalk : une bougie suivie d'un
    // bouche-trou ou d'un trou a pour « clôture » le dernier prix avant la coupure, pas sa vraie clôture) — sinon manche nulle
    const c = Number(arr[j].c), nx = arr[j + 1], sure = !arr[j]._gap && c > 0 && nx && !nx._gap && Number(nx.ts) === R.x + R.f;
    out = !sure ? 0 : (c > R.p0 ? 1 : (c < R.p0 ? -1 : 0));
  }
  else if (now > R.x + 4 * R.f) out = 0;
  else return null;
  const P = _mktPrice(ps.qYes, ps.qNo); let paid = 0;
  (S.agents || []).forEach(a => {
    const q = a && R.pos && R.pos[a.id]; if (!q) return;
    if ((Number(a.mktGen) || 0) !== (Number(q[3]) || 0)) return;   // mise d'un génome retiré depuis (07 : génération suivante) : ni payée ni rendue au nouveau-né
    const pay = (out === 0) ? q[2] : (out > 0 ? q[0] : q[1]);
    a.mktWallet = _mktWallet(a) + pay; paid += pay;
    if (out !== 0) { a.mktGain = Math.round(((Number(a.mktGain) || 0) + pay - q[2]) * 10000) / 10000; a.mktN = (Number(a.mktN) || 0) + 1; }
  });
  const st = _mktStats(R.m);
  if (out === 0) st.v++;
  else {
    st.n++; if (out > 0) st.up++; if (R.fw) st.fw = (Number(st.fw) || 0) + 1;
    if (R.n > 0) { st.b++; st.br += Math.pow(P - (out > 0 ? 1 : 0), 2); st.vol += R.vol; st.paid += paid; if (Math.abs(P - 0.5) > 1e-9) { st.d++; if ((P > 0.5) === (out > 0)) st.ok++; } }
  }
  if (!Array.isArray(S.mktLog)) S.mktLog = [];
  S.mktLog.push([Math.round(R.t / 1000), R.m, pair, Math.round(P * 1000), out, R.n, R.vol, Math.round((R.x + R.f - R.t) / 1000), R.fw ? 1 : 0]);   // …, horizon (s), suivie (1 : prix de l'autre mode, sans mise)
  if (S.mktLog.length > MKT_LOG_MAX) S.mktLog.splice(0, S.mktLog.length - MKT_LOG_MAX);
  ps.qYes = MKT_Q0; ps.qNo = MKT_Q0;
  ps.mkt = { open: false, t: R.t, x: R.x, P: Math.round(P * 1000) / 1000, out: out, n: R.n, vol: R.vol };
  return out;
}
// Le cycle d'une paire (10f, EV / RE) : la manche en cours se solde si sa bougie est close, puis la suivante s'ouvre.
function _mktCycle(pair, ps) {
  try {
    if (!_mktOn() || !ps) return 0;
    const now = Date.now();
    _mktSettle(pair, ps, now);
    return _mktOpen(pair, ps, now);
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return 0; }
}
// La voix du marché dans la décision commune : (prix − 0,5) × 2 de la manche ouverte de la paire (0 sans manche ou sans mise).
function _mktVote(pair) {
  try {
    const ps = S.pairStates && S.pairStates[pair], R = ps && ps.mkt;
    if (!R || !R.open || !(R.n > 0)) return 0;
    return (_mktPrice(ps.qYes, ps.qNo) - 0.5) * 2;
  } catch (e) { return 0; }
}
// Jugée comme le composite : sens du prix au moment de la photo des votes contre le mouvement survenu ensuite (EV / RE seulement).
function _dcJudgeMarket(mk, movePct, decay) {
  try {
    if (!_mktOn()) return false;
    if (!(typeof mk === 'number' && Math.abs(mk) > 0.05) || !(Math.abs(Number(movePct)) > 0)) return false;
    const modeW = (S.tradingMode === 'real') ? 5 : 3;
    _fitJudge(_dcVoice('marche'), ((movePct > 0) === (mk > 0)) ? 1 : -1, Math.abs(mk) * Math.abs(movePct) * modeW * (decay || 0.7));
    return true;
  } catch (e) { return false; }
}
window._mktOn = _mktOn; window._mktPrice = _mktPrice; window._mktCost = _mktCost; window._mktP = _mktP; window._mktWallet = _mktWallet; window._mktBet = _mktBet;
window._mktOpen = _mktOpen; window._mktSettle = _mktSettle; window._mktCycle = _mktCycle; window._mktVote = _mktVote; window._dcJudgeMarket = _dcJudgeMarket; window._mktStats = _mktStats;
window._thNote = _thNote; window._thJudge = _thJudge; window._thEval = _thEval; window._thRefresh = _thRefresh; window._thLevel = _thLevel; window._thPick = _thPick; window._thHzLab = _thHzLab; window._thCrit = _thCrit; window._thRule = _thRule;
window._vjNote = _vjNote; window._vjRefresh = _vjRefresh; window._dcMeritHz = _dcMeritHz; window._vjMode = _vjMode; window._vjReset = _vjReset;   // [BILAN AUX HORIZONS · 27/09/2026]
window._vjE = _vjE; window._fitHz = _fitHz; window._fitCurrent = _fitCurrent; window._fjMode = _fjMode; window._fitPicks = _fitPicks; window._fitHzFirst = _fitHzFirst;   // [FITNESS AUX HORIZONS · 28/09/2026]
window._botView = _botView; window._dcMerit = _dcMerit; window._dcConsensus = _dcConsensus; window._dcVoice = _dcVoice;
window._dcForwardJudge = _dcForwardJudge; window._dcSnapVotes = _dcSnapVotes; window._dcJudgeComposite = _dcJudgeComposite; window._dcFwdFirst = _dcFwdFirst; window._thBrainTf = _thBrainTf; window._thBrainF = _thBrainF;
window._botPredict = _botPredict; window._botMeritAudit = _botMeritAudit; window._botJudgeMeasured = _botJudgeMeasured; window._botJudge = _botJudge;
window._botAtrPct = _botAtrPct; window._botHasOpenClaim = _botHasOpenClaim; window._botAlreadyActing = _botAlreadyActing; window._botStakeMult = _botStakeMult;

// ═══ [MÉRITE DE L'ÉVOLUEUR · 26/09/2026] L'ÉVOLUTION A-T-ELLE AMÉLIORÉ LE SIÈGE ? (Rams : « oui je veux ») ═══
// Une évolution (07 triggerEvolution) change UNE chose dans les décisions d'un siège : son génome (la logique de vote est par
// id, les nombres par génome). Question posée : le nouveau génome vote-t-il mieux que l'ANCIEN ? Comparer au siège mort serait
// biaisé (il est choisi parce qu'il était le pire : n'importe quel remplaçant « fait mieux », régression vers la moyenne). Ici,
// essai contrefactuel : l'ancien génome continue de voter EN OMBRE (même paire, mêmes données, au même roster — aucune décision
// ne lit l'ombre) et il est jugé comme le nouveau, sur les MÊMES événements (même règle que la fitness : aligné ±1, poids
// max(0,01, |vote| × amplitude × décroissance)). Après 30 événements informatifs : précision pondérée nouveau contre ancien ;
// écart ≥ 0,1 (5 points de précision) → l'Évolueur est jugé (+1 amélioration, −1 dégradation, poids = écart) ; sinon non concluant.
// Essai interrompu (nouvelle évolution du même siège, 3 jours) : conclu s'il a ≥ 10 événements, abandonné sinon.
var EVO_TRIAL_N = 30, EVO_TRIAL_MIN = 10, EVO_TRIAL_DELTA = 0.1, EVO_TRIAL_MAX_MS = 3 * 24 * 3600 * 1000;
function _evoTermOf(v, won, mag, decay) {
  v = Number(v) || 0;
  if (Math.abs(v) <= 0.05) return null;   // [ABSTENTION · 26/09/2026] même règle que la fitness : une abstention n'est pas jugée
  var aligned = (won && v > 0) || (!won && v < 0);
  return { s: aligned ? 1 : -1, w: Math.max(0.01, Math.abs(v) * mag * decay) };
}
function _evoTrialStart(seatId, oldG, info) {
  try {
    if (!seatId || !oldG || typeof oldG !== 'object') return null;
    if (!S.evoTrials) S.evoTrials = {};
    if (S.evoTrials[seatId]) _evoTrialConclude(seatId, 'interrompu : nouvelle évolution du siège');
    info = info || {};
    S.evoTrials[seatId] = { oldG: JSON.parse(JSON.stringify(oldG)), t: Date.now(), gen: info.gen || null, name: info.name || seatId, prev: info.prev || '', n: 0, ns: 0, nw: 0, os: 0, ow: 0,
      fit: (typeof info.fit === 'number' && isFinite(info.fit)) ? info.fit : null, trig: String(info.trig || '?'), man: !!info.man, seat: seatId, op: String(info.op || 'R'), forced: !!info.forced };   // [OPÉRATEUR APPRIS · 28/09/2026] + la source de la naissance   // [ÉVOLUTION APPRISE · 28/09/2026] fitness du siège à l'évolution (null : appelant d'avant → pas d'observation), déclencheur (A B C D E M), manuelle
    return S.evoTrials[seatId];
  } catch (e) { return null; }
}
// Votes de l'ancien génome pour les sièges en essai (scouts, conseil, gardien génomé). Le génome courant est remis en place
// quoi qu'il arrive ; l'historique des résonances (seul effet de bord d'une analyse) est restauré.
function _evoShadowVotes(pair, scoutResults, verdict, stake) {
  var T = (typeof S !== 'undefined' && S) ? S.evoTrials : null;
  if (!T) return null;
  var ids = Object.keys(T);
  if (!ids.length) return null;
  if (!S.genome) S.genome = {};
  var out = {}, n = 0, muted = new Set(S.mutedAgents || []);
  ids.forEach(function (id) {
    var tr = T[id]; if (!tr || !tr.oldG) return;
    var had = Object.prototype.hasOwnProperty.call(S.genome, id), cur = S.genome[id];
    var rh = Array.isArray(S.resonanceHistory) ? S.resonanceHistory.slice() : null;
    try {
      S.genome[id] = tr.oldG;
      var v = null;
      if (ROSTER_TIERS.scouts.indexOf(id) >= 0) { var r = scoutAnalysis(id, pair); v = (r && typeof r.score === 'number') ? r.score : 0; }
      else if (ROSTER_TIERS.council.indexOf(id) >= 0) { var c = councilVote(id, pair, scoutResults); if (c) { var m = Math.abs(c.score || 0.3); v = c.vote === 'long' ? m : c.vote === 'short' ? -m : 0; } }
      else if (ROSTER_TIERS.guardians.indexOf(id) >= 0) v = 0;   // [DÉGEL DES VOIX · 02/10/2026] un statut de gardien n'est pas un sens : 0, comme au roster
      if (v !== null) { out[id] = muted.has(id) ? 0 : v; n++; }
    } catch (e) {}
    finally { if (had) S.genome[id] = cur; else delete S.genome[id]; if (rh) S.resonanceHistory = rh; }
  });
  return n ? out : null;
}
// Juge l'ancien et le nouveau génome du siège sur le MÊME événement (appelé par learnFromOutcome après le vote réel).
function _evoTrialJudge(a, pair, won, mag, decay, vote) {
  var tr = S.evoTrials && S.evoTrials[a.id];
  if (!tr) return null;
  var ps = S.pairStates && S.pairStates[pair], sh = ps && ps.roster && ps.roster.shadow;
  if (!sh || typeof sh[a.id] !== 'number') return null;   // pas d'ombre sur ce roster : l'événement ne compte pas
  var old = sh[a.id];
  if (Math.abs(vote) <= 0.05 && Math.abs(old) <= 0.05) return null;   // aucun des deux n'a parlé : rien à comparer
  var tn = _evoTermOf(vote, won, mag, decay), to = _evoTermOf(old, won, mag, decay);
  tr.n++;
  if (tn) { tr.ns += tn.s * tn.w; tr.nw += tn.w; }   // [ABSTENTION · 26/09/2026] le génome qui s'abstient n'est pas jugé sur cet événement
  if (to) { tr.os += to.s * to.w; tr.ow += to.w; }
  if (tr.n >= EVO_TRIAL_N) return _evoTrialConclude(a.id, 'complet');
  if (Date.now() - tr.t > EVO_TRIAL_MAX_MS) return _evoTrialConclude(a.id, 'délai de 3 jours');
  return null;
}
function _evoTrialConclude(seatId, why) {
  var tr = S.evoTrials && S.evoTrials[seatId];
  if (!tr) return null;
  delete S.evoTrials[seatId];
  if (!S.evoMerit) S.evoMerit = { good: 0, bad: 0, inconclusive: 0, dropped: 0, recent: [] };
  var M = S.evoMerit;
  if (tr.n < EVO_TRIAL_MIN) { M.dropped = (M.dropped || 0) + 1; return { verdict: 'abandonné', n: tr.n }; }
  var eNew = tr.nw > 0 ? tr.ns / tr.nw : 0, eOld = tr.ow > 0 ? tr.os / tr.ow : 0, d = eNew - eOld;
  var accN = Math.round((eNew + 1) * 500) / 10, accO = Math.round((eOld + 1) * 500) / 10;   // précision pondérée en %
  var verdict = Math.abs(d) < EVO_TRIAL_DELTA ? 'non concluant' : (d > 0 ? 'amélioration' : 'dégradation');
  if (verdict === 'non concluant') M.inconclusive++;
  else {
    var meta = (S.agents || []).find(function (x) { return x && x.isMeta; });
    if (meta && typeof _fitJudge === 'function') {
      _fitJudge(meta, d > 0 ? 1 : -1, Math.abs(d));
      meta.streak = d > 0 ? (meta.streak || 0) + 1 : 0;
      meta.learningEvents = (meta.learningEvents || 0) + 1;
    }
    if (d > 0) M.good++; else M.bad++;
  }
  try { if (typeof _evoRuleNote === 'function') _evoRuleNote(tr, d, tr.n); } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} }   // [ÉVOLUTION APPRISE · 28/09/2026] l'observation de la règle apprise (écart brut, même non concluant)
  var row = { seat: seatId, name: tr.name, gen: tr.gen, n: tr.n, accNew: accN, accOld: accO, verdict: verdict, why: why || '', t: Date.now(), fit: tr.fit, trig: tr.trig, op: tr.op || 'R' };
  M.recent = (Array.isArray(M.recent) ? M.recent : []).concat([row]).slice(-10);
  try {
    if (!S.chainLog) S.chainLog = [];
    S.chainLog.push({ icon: '\uD83E\uDDEC', desc: 'Évolution jugée · ' + tr.name + ' (' + seatId + ') : nouveau génome ' + accN + ' % contre ancien ' + accO + ' % sur ' + tr.n + ' jugements → ' + verdict + (why && why !== 'complet' ? ' (' + why + ')' : ''), hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  } catch (e) {}
  return row;
}
window._evoTrialStart = _evoTrialStart; window._evoShadowVotes = _evoShadowVotes; window._evoTrialJudge = _evoTrialJudge; window._evoTrialConclude = _evoTrialConclude;

// ═══ [ÉVOLUTION APPRISE · 28/09/2026] QUAND RECYCLER UN SIÈGE ? CE QUE LES ÉVOLUTIONS ONT RAPPORTÉ (go Rams 28/09 15:41) ═══
// Avant : les déclencheurs de l'évolution étaient des nombres posés à la main — 03 (après les jugements d'un cycle) : le plus faible sous
// 150 T$ → recyclé tout de suite ; tous les 15 cycles, quel que soit son niveau ; sous 300 tous les 8 cycles — 08 (page Home) : le plus
// faible évoluable (hors 60 cycles de grâce) sous 300 ; un siège au score plat sous 400 (stagnation). Tous bornés par le délai d'1 h (07).
// Or chaque évolution est déjà jugée (MÉRITE DE L'ÉVOLUEUR, 26/09) : l'ancien génome vote en ombre sur les mêmes événements que le
// nouveau ; après 30 événements, l'écart de précision pondérée d = nouveau − ancien dit si recycler CE siège, à CE niveau de fitness, a
// aidé. Maintenant chaque évolution jugée (≥ 10 événements) est une observation [fitness du siège à l'évolution, d, créneau de 4 h,
// déclencheur], gardée 5 jours (30 créneaux, comme le seuil), et la règle est jugée avec la preuve du seuil (_thEval : 5 niveaux = les
// évolutions des sièges les plus faibles — toutes, la moitié, le quart, le dixième, le vingtième ; erreur type par créneau avec
// recouvrement ; Student Φ(−2)/25 ; ≥ 30 évolutions, ≥ 20 créneaux), dans les deux sens :
//  · GAIN prouvé sous un niveau F* → tout siège de fitness ≤ F* est recyclable tout de suite : le gain ÉTEND ce que les nombres posés à la
//    main permettaient ; au-dessus de F*, rien n'est prouvé dans aucun sens → les nombres posés à la main restent (rien n'est retiré sans
//    preuve, et la règle continue d'observer au-dessus de son niveau — une observation n'existe que si une évolution a lieu) ;
//  · NUISANCE prouvée sous un niveau H* → plus d'évolution automatique d'un siège dont la fitness ≤ H* tant que la preuve tient (recycler
//    ces sièges a fait pire que garder leur génome) ; c'est alors le plus faible RECYCLABLE (au-dessus de H*) qui est recyclé ; les évolutions
//    manuelles (« Faire évoluer maintenant ») restent — et sont la seule source d'observations sous H* : la preuve meurt avec ses données
//    (5 jours au plus sans nouvelle observation), puis le repli recycle à nouveau et la règle se rejuge ;
//  · les deux prouvés → la preuve la plus INTÉRIEURE décide (gain à 50 et nuisance à 200 : le plancher est recyclé, 51-200 non ; nuisance
//    à 50 et gain à 200 : le plancher est protégé, 51-200 recyclé) ;
//  · rien de prouvé → les nombres posés à la main, tels quels (rien n'est retiré : ils sont le repli).
// Une preuve ne survit pas à ses données (règle recalculée au plus tard un créneau après). Le délai d'1 h entre deux évolutions et la
// période de grâce de 08 ne sont pas appris ici (dit à Rams). Un créneau = 4 h : au plus 4 évolutions (délai d'1 h), un essai dure 45 min
// à 4 h (rejeu du 28/09) → deux créneaux voisins peuvent partager un essai : le recouvrement est compté. Un essai ouvert avant cette
// version (sans fitness à l'évolution) ne donne pas d'observation.
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres de 9 h, 2 tirages, ce code) : tirage 1 : 0 trades, net 0 $ ; tirage 2 : 0 trades, net 0 $ ; 0 erreur. Observations : tirage 1 : 77 évolutions, 59 observations (59 cohérentes avec l'évolution notée : même instant, même siège, même fitness ; 0 incohérentes), déclencheurs A : 56, B : 1, C : 2, fitness à l'évolution : 52/59 au plancher 50 (min 50, max 252), écart moyen nouveau − ancien −0,036, 0 ligne(s) 🧬 « Évolution apprise » — tirage 2 : 78 évolutions, 58 observations (58 cohérentes avec l'évolution notée : même instant, même siège, même fitness ; 0 incohérentes), déclencheurs A : 54, B : 3, C : 1, fitness à l'évolution : 53/58 au plancher 50 (min 50, max 331), écart moyen nouveau − ancien +0,025, 0 ligne(s) 🧬 « Évolution apprise ». Règle : tirage 1 : au plus 8 observations et 3 créneaux de 4 h par fenêtre (preuve exigée : ≥ 30 et ≥ 20) → rien de prouvé dans 9 fenêtres sur 9 — tirage 2 : au plus 9 observations et 3 créneaux de 4 h par fenêtre (preuve exigée : ≥ 30 et ≥ 20) → rien de prouvé dans 9 fenêtres sur 9.
// Identité avec le rejeu de 20260928b (sans preuve, le comportement doit être celui d'avant ; le rejeu n'est pas déterministe d'une exécution à l'autre — même code, même graine, la fenêtre 1 rejouée deux fois donne les mêmes instants mais d'autres sièges parmi les ex æquo au plancher) : tirage 1 : 8 fenêtres sur 9 au même nombre d'évolutions, 7 aux mêmes instants (grille du délai d'1 h), 1 aux mêmes sièges ; cibles au plancher 50 : 66/77 ici, 69/78 là — tirage 2 : 8 fenêtres sur 9 au même nombre d'évolutions, 6 aux mêmes instants (grille du délai d'1 h), 1 aux mêmes sièges ; cibles au plancher 50 : 72/78 ici, 69/77 là. La règle sur 243 évolutions des rejeux du 28/09 (20260928a et b, 2 tirages, 81 h chacun), 25 créneaux de 4 h : gain non prouvé, nuisance non prouvée ; la queue la plus proche d'une preuve de gain — sièges ≤ 269 T$ : −0,011 ± 0,006 (243 évolutions, 25 créneaux, exigé 3,5 ET) ; de nuisance — sièges ≤ 269 T$ : −0,011 ± 0,006 (243 évolutions, 25 créneaux, exigé 3,5 ET).
var EVO_BLOCK_MS = 4 * 3600000, EVO_OBS_MAX = 2000;
function _evoRuleState() { if (!S.evoRule || typeof S.evoRule !== 'object') S.evoRule = { obs: [], rule: null, since: 0 }; var E = S.evoRule; if (!Array.isArray(E.obs)) E.obs = []; return E; }
function _evoRulePurge(E) { var lim = (Date.now() - 1.5 * TH_MIN_B * EVO_BLOCK_MS) / 1000; E.obs = E.obs.filter(function (o) { return Array.isArray(o) && o[0] >= lim; }); if (E.obs.length > EVO_OBS_MAX) E.obs.splice(0, E.obs.length - EVO_OBS_MAX); }
// Une évolution jugée (essai tr, écart d = précision pondérée nouveau − ancien, n événements) → une observation compacte :
// [t de l'évolution (s), fitness du siège à l'évolution (entier), d × 10000 (entier), n, déclencheur, manuelle 0/1, siège]. Puis la règle est rejugée.
function _evoRuleNote(tr, d, n) {
  try {
    if (!tr || !isFinite(d) || typeof tr.fit !== 'number' || !isFinite(tr.fit)) return null;   // essai ouvert avant cette version : pas de fitness à l'évolution → rien
    var E = _evoRuleState(), t = Number(tr.t) || Date.now();
    E.obs.push([Math.round(t / 1000), Math.round(Number(tr.fit) || 0), Math.round(d * 10000), n | 0, String(tr.trig || '?'), tr.man ? 1 : 0, String(tr.seat || ''), String(tr.op || 'R')].concat(tr.forced ? [1] : []));   // [OPÉRATEUR APPRIS · 28/09/2026] index 7 : la source (absente = R, la seule d'avant) ; index 8 = 1 : naissance forcée (absent : libre)
    if (!(E.since > 0)) E.since = t;
    return _evoRuleRefresh();
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return null; }
}
// Pur : observations → { gain, harm, near, n } — queues prouvées par _thEval (conviction = −fitness : la queue « la plus forte » = les sièges les plus
// faibles), dans les deux sens (d, puis −d) ; niveaux rendus en fitness (≤ niveau).
function _evoRuleEval(obs) {
  var pos = [], neg = [];
  (obs || []).forEach(function (o) { if (!Array.isArray(o) || !isFinite(o[1]) || !isFinite(o[2])) return; var c = -Number(o[1]), n = Number(o[2]) / 10000, b = Math.floor(Number(o[0]) * 1000 / EVO_BLOCK_MS); pos.push({ c: c, n: n, b: b }); neg.push({ c: c, n: -n, b: b }); });
  var g = _thEval(pos), h = _thEval(neg);
  var lv = function (x, sgn) { return x ? { level: -x.level, n: x.n, blocks: x.blocks, mean: sgn * x.mean, se: x.se, crit: x.crit } : null; };
  return { gain: g.open ? lv(g.best, 1) : null, harm: h.open ? lv(h.best, -1) : null, near: lv(g.near, 1), nearH: lv(h.near, -1), n: pos.length };
}
function _evoRuleRefresh() {
  try {
    var E = _evoRuleState(); _evoRulePurge(E);
    var old = E.rule || null, r = _evoRuleEval(E.obs); r.t = Date.now();
    var bl = {}; E.obs.forEach(function (o) { bl[Math.floor(o[0] * 1000 / EVO_BLOCK_MS)] = 1; }); r.blocks = Object.keys(bl).length;
    E.rule = r;
    try { _evoOpRefresh(E); } catch (e2) { try { window._decErr && window._decErr(e2); } catch (_e) {} }   // [OPÉRATEUR APPRIS · 28/09/2026] la règle des sources, rejugée avec
    r.oldest = E.obs.length ? Math.min.apply(null, E.obs.map(function (o) { return o[0]; })) * 1000 : null;   // la plus vieille observation : la preuve vit au plus jusqu'à sa sortie de la fenêtre (m5)
    var gl = r.gain ? r.gain.level : null, hl = r.harm ? r.harm.level : null, ogl = old && old.gain ? old.gain.level : null, ohl = old && old.harm ? old.harm.level : null;
    if (gl !== ogl || hl !== ohl) {
      if (!S.chainLog) S.chainLog = [];
      var f3 = function (x) { return (x >= 0 ? '+' : '') + x.toFixed(3).replace('.', ','); }, u3 = function (x) { return x.toFixed(3).replace('.', ','); }, parts = [];
      if (r.gain) parts.push('recycler un siège aide en dessous de ' + Math.round(gl) + ' T$ (écart nouveau − ancien génome ' + f3(r.gain.mean) + ' ± ' + u3(r.gain.se) + ' par évolution, ' + r.gain.n + ' évolutions, ' + r.gain.blocks + ' créneaux) : tout siège ≤ ' + Math.round(gl) + ' T$ est recyclable tout de suite ; au-dessus, les nombres posés à la main restent');
      else if (ogl !== null) parts.push('le gain n\'est plus prouvé : les nombres posés à la main reprennent');
      if (r.harm) parts.push('recycler un siège à ' + Math.round(hl) + ' T$ ou moins est prouvé nuisible (' + f3(r.harm.mean) + ' ± ' + u3(r.harm.se) + ', ' + r.harm.n + ' évolutions, ' + r.harm.blocks + ' créneaux) : plus d\'évolution automatique de ces sièges tant que la preuve tient — au plus jusqu\'au ' + new Date(r.oldest + 1.5 * TH_MIN_B * EVO_BLOCK_MS).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' sans nouvelle observation (les manuelles restent)');
      else if (ohl !== null) parts.push('la nuisance n\'est plus prouvée : ces sièges redeviennent recyclables');
      S.chainLog.push({ icon: '\uD83E\uDDEC', desc: 'Évolution apprise · ' + parts.join(' ; '), hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : '' });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return r;
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return null; }
}
// Les niveaux vivants { gain, harm } (fitness, null = pas prouvé) ou null quand rien n'est prouvé ; rejugés au plus tard un créneau après (une preuve ne survit pas à ses données).
function _evoLevels() {
  try {
    var E = S.evoRule; if (!E || !Array.isArray(E.obs) || !E.obs.length) return null;
    if (!E.rule || !(Date.now() - E.rule.t <= EVO_BLOCK_MS)) _evoRuleRefresh();
    var r = E.rule; if (!r || (!r.gain && !r.harm)) return null;
    return { gain: r.gain ? r.gain.level : null, harm: r.harm ? r.harm.level : null };
  } catch (e) { return null; }
}
// Un siège peut-il être recyclé maintenant par un déclencheur AUTOMATIQUE ? dflt = le nombre posé à la main de ce déclencheur (Infinity : aucun).
// Fitness non finie → non (comme avant : NaN < 150 est faux). Les deux preuves : la plus intérieure décide. Nuisance prouvée et fitness ≤ H* → non ;
// gain prouvé et fitness ≤ F* → oui ; sinon fitness < dflt (le repli posé à la main : rien n'est retiré là où rien n'est prouvé).
function _evoOk(a, dflt) {
  if (!a) return false;
  var f = Number(a.fitness); if (!isFinite(f)) return false;
  var L = _evoLevels();
  if (!L) return f < dflt;
  if (L.gain !== null && L.harm !== null && L.gain < L.harm && f <= L.gain) return true;   // gain dedans, nuisance dehors : le dedans décide
  if (L.harm !== null && f <= L.harm) return false;
  if (L.gain !== null && f <= L.gain) return true;
  return f < dflt;
}
window._evoRuleState = _evoRuleState; window._evoRuleNote = _evoRuleNote; window._evoRuleEval = _evoRuleEval; window._evoRuleRefresh = _evoRuleRefresh; window._evoLevels = _evoLevels; window._evoOk = _evoOk;

// ═══ [OPÉRATEUR APPRIS · 28/09/2026] D'OÙ FAIRE NAÎTRE LE NOUVEAU GÉNOME ? (go Rams 28/09 20:15) ═══
// Les 243 évolutions des rejeux du 28/09 ne prouvent aucun gain du nouveau génome sur l'ancien (écart −0,011 ± 0,006, 1,8 ET : rien de
// prouvé dans aucun sens) : l'opérateur de naissance est le premier suspect, et le seul jugeable sur les mêmes essais. Jusqu'ici une seule
// source, R : recombinaison gène à gène entre la version courante et la meilleure version passée du siège, puis mutation ±4-16 % (selon la
// diversité de l'essaim). Maintenant trois sources, jugées sur les MÊMES essais (nouveau génome contre ancien, en ombre, mêmes événements) :
// R (inchangée, byte-identique — quand la meilleure version passée n'a rien à donner, parce que c'est la courante ou un autre jeu de gènes,
// R revient à M, et le journal le dit), B = retour à la meilleure version passée du siège COMPLÈTE (le jeu de gènes actuel) et différente
// une fois bornée, telle quelle (sans mutation ; s'il n'y en a pas : R, et la naissance est dite R), M = mutation seule de la version
// courante. Chaque évolution jugée porte sa source dans l'observation de l'évolution apprise (même fenêtre de 5 jours, mêmes créneaux de
// 4 h) ; par source, même preuve que le seuil (_thEval, toutes les évolutions de la source en une queue, dans les deux sens).
// La source de chaque naissance (_evoOpPick(siège), 07 ; manuelles comprises), sur la vue purgée, sans rien écrire :
//  · une source prouvée nuisible est écartée, et la preuve TIENT jusqu'à 5 jours après sa plus jeune observation (repoussé si une nouvelle
//    observation la reprouve) — sinon, privée de données par l'écartement, elle retombait sous la taille de preuve aux premières purges et
//    revenait aussitôt ; une naissance LIBRE de la source après la preuve rend la main aux données ; une naissance FORCÉE (un siège sans
//    autre source disponible, observation index 8 = 1) ne la lève pas ; toutes nuisibles → aucune n'est écartée ;
//  · B n'est pas candidate sur un siège sans version passée complète où revenir (sinon elle retomberait en R sans jamais être observée) ;
//  · rien de prouvé bénéfique → rotation : la source qui attend depuis le plus longtemps SUR CE SIÈGE, puis sur l'ensemble (dernière
//    naissance observée ou en cours ; jamais servie d'abord ; à égalité R, B, M) — par siège d'abord, pour qu'un siège souvent recyclé ne
//    reçoive pas toujours la même source (un effet de siège pris pour un effet de source) ; parts égales, sans rafale de rattrapage ;
//  · une source prouvée bénéfique → elle (la meilleure si plusieurs), sauf s'il reste des sources « à juger » (échantillon sous la taille
//    de preuve : < 30 évolutions ou < 20 créneaux) : alors une naissance sur deux leur revient (la dernière naissance de ce siège — sinon de
//    l'ensemble — venait de la prouvée → la source à juger qui attend le plus ; sinon la prouvée) : une preuve ne verrouille pas les autres.
// Écran et journal disent la politique en cours (« naissances : … »), pas une prédiction (la source dépend du siège recyclé).
// Ce qui n'est PAS appris ici (posé) : le taux de mutation (±4-16 %, selon la diversité), le nombre de parents (score, confiance : 2 à 6 au
// tournoi par fitness), le jeu des trois sources, « la meilleure version passée » comme définition de B, l'ordre d'égalité R, B, M, la
// rotation et « une sur deux » — dits à Rams.
// Simulation avant livraison (ces fonctions, 30 jours, 1 naissance/h, 20 sièges, 8 graines ; écarts tirés au hasard) : aucun effet : parts R/B/M 33 % / 34 % / 33 %, une source écartée à tort 2,3 % du temps au plus, 0,4 ligne « Opérateur appris » par mois ; M nuisible (−0,25) : M écartée 57 % du temps, 20 % des naissances (33 % sans règle ; 28 % avant la tenue, mesure de la relecture), 6,9 lignes par mois ; M nuisible (−0,15) : écartée 42 % du temps, 23 % des naissances ; B bénéfique (+0,25) : 48 % des naissances ; R et M nuisibles avec 2 sièges sur 20 sans version passée : R / M 21 % / 19 % des naissances (20 % / 20 % quand tous en ont une) ; B bénéfique mais 4 sièges sur 20 seulement avec une version passée : B 6,8 % des naissances — trop peu pour atteindre 30 évolutions en 5 jours, donc jamais prouvable (structurel) ; toutes nuisibles : rotation égale, rien d'écarté, 33 lignes par mois ; sièges au plancher recyclés à tour de rôle, chacun avec son propre effet, aucun effet de source : preuve parasite 0,0 % à 0,3 % du temps (2 à 6 sièges) ; plus long trou sans naissance d'une source : 124 h (la tenue).
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres de 9 h, 2 tirages, ce code) : tirage 1 : 0 trades, net 0 $ ; tirage 2 : 0 trades, net 0 $ ; 0 erreur. 154 naissances (143 avec essai), 126 observations toutes cohérentes avec leur naissance (même seconde, même siège, même source), 0 sans source, 0 source demandée non appliquée, 0 ligne « Opérateur appris » (aucune preuve possible en 9 h : ≥ 20 créneaux de 4 h exigés), politique en fin de fenêtre : « rotation par siège entre recombinaison + mutation / retour à la meilleure version passée / mutation seule » (18/18). Par source : R 55 naissances, 48 jugées, écart moyen +0,037 ± 0,041 (24 créneaux ; 9 améliorations, 8 dégradations, 31 non concluantes) ; B 45 naissances, 38 jugées, écart moyen +0,007 ± 0,033 (20 créneaux ; 6 améliorations, 4 dégradations, 28 non concluantes) ; M 52 naissances, 40 jugées, écart moyen −0,015 ± 0,018 (21 créneaux ; 3 améliorations, 4 dégradations, 33 non concluantes) ; différences B−R −0,031 ± 0,051, M−R −0,053 ± 0,045, B−M +0,022 ± 0,035 — rien de prouvé, aucune différence mesurable à cette taille ; 39 des 55 naissances R sans rien à prendre de la meilleure version passée (c'est la courante, ou un autre jeu de gènes : R y revient à M).
var EVO_OPS = ['R', 'B', 'M'], EVO_OP_LABEL = { R: 'recombinaison + mutation', B: 'retour à la meilleure version passée', M: 'mutation seule' };
function _evoOpOf(x) { return (x === 'B' || x === 'M') ? x : 'R'; }   // la source d'une observation ou d'un essai (absente : R, la seule d'avant)
// Pur : observations → { R: { n, blocks, mean, se, gain, harm }, B: …, M: … } (gain / harm : la queue « toutes » de la source prouvée par _thEval, dans les deux sens).
function _evoOpStats(obs) {
  var out = {};
  EVO_OPS.forEach(function (op) {
    var pos = [], neg = [], bl = {}, sum = 0;
    (obs || []).forEach(function (o) { if (!Array.isArray(o) || !isFinite(o[2]) || _evoOpOf(o[7]) !== op) return; var n = Number(o[2]) / 10000, b = Math.floor(Number(o[0]) * 1000 / EVO_BLOCK_MS); pos.push({ c: 0, n: n, b: b }); neg.push({ c: 0, n: -n, b: b }); bl[b] = 1; sum += n; });
    var g = _thEval(pos), h = _thEval(neg), st = g.near || h.near;
    out[op] = { n: pos.length, blocks: Object.keys(bl).length, mean: pos.length ? sum / pos.length : null, se: st && st.se !== null ? st.se : null, crit: st ? st.crit : null,
      gain: g.open ? { mean: g.best.mean, se: g.best.se, n: g.best.n, blocks: g.best.blocks } : null, harm: h.open ? { mean: -h.best.mean, se: h.best.se, n: h.best.n, blocks: h.best.blocks } : null };
  });
  return out;
}
// Pur (lecture seule) : l'état de la règle des sources pour un siège (null : hors siège) — vue purgée, preuves vivantes et tenues, candidates.
function _evoOpPlan(seatId) {
  var E = S.evoRule, now = Date.now(), lim = (now - 1.5 * TH_MIN_B * EVO_BLOCK_MS) / 1000, OR = E && E.opRule, sid = (seatId != null) ? String(seatId) : null;
  var obs = ((E && Array.isArray(E.obs)) ? E.obs : []).filter(function (o) { return Array.isArray(o) && o[0] >= lim; }), st = _evoOpStats(obs);
  var last = { R: -Infinity, B: -Infinity, M: -Infinity }, mine = { R: -Infinity, B: -Infinity, M: -Infinity }, free = { R: -Infinity, B: -Infinity, M: -Infinity };   // dernière naissance (s) de chaque source : partout / sur ce siège / libre (observée, ou essai en cours)
  var see = function (so, t, here, forced) { if (!isFinite(t)) return; if (t > last[so]) last[so] = t; if (here && t > mine[so]) mine[so] = t; if (!forced && t > free[so]) free[so] = t; };
  obs.forEach(function (o) { see(_evoOpOf(o[7]), Number(o[0]), sid !== null && String(o[6]) === sid, o[8] === 1); });
  Object.keys(S.evoTrials || {}).forEach(function (k) { var tr = S.evoTrials[k]; if (tr) see(_evoOpOf(tr.op), Number(tr.t) / 1000, sid !== null && k === sid, !!tr.forced); });
  var harm = {}; EVO_OPS.forEach(function (o) { var h = OR && OR[o] && OR[o].held; harm[o] = !!(st[o].harm || (h && now < h.until && !(free[o] > h.t))); });   // prouvée, ou tenue sans naissance libre depuis
  var avail = EVO_OPS.filter(function (o) { return !(o === 'B' && sid !== null && !_genomePast(sid)); });
  var cands = avail.filter(function (o) { return !harm[o]; }), allHarm = !cands.length; if (allHarm) cands = avail.slice();
  var proven = cands.filter(function (o) { return st[o].gain; }).sort(function (a, b) { return st[b].gain.mean - st[a].gain.mean; });
  var open = cands.filter(function (o) { return !st[o].gain && (st[o].n < TH_MIN_N || st[o].blocks < TH_MIN_B); });
  var ord = function (x) { return EVO_OPS.indexOf(x); }, top = function (m) { var r = null; EVO_OPS.forEach(function (o) { if (m[o] > -Infinity && (r === null || m[o] > m[r])) r = o; }); return r; };
  return { st: st, last: last, mine: mine, harm: harm, avail: avail, cands: cands, allHarm: allHarm, proven: proven, open: open, prev: top(mine) || top(last),
    wait: function (c) { return c.slice().sort(function (a, b) { return (mine[a] - mine[b]) || (last[a] - last[b]) || (ord(a) - ord(b)); })[0]; } };   // celle qui attend le plus : sur ce siège, puis partout
}
// La source de la naissance de ce siège (07) — règle du bloc ci-dessus. Sur erreur : R (l'opérateur d'avant).
function _evoOpPick(seatId) {
  try {
    var P = _evoOpPlan(seatId);
    if (!P.proven.length) return P.wait(P.cands);
    if (!P.open.length) return P.proven[0];
    return (P.prev === P.proven[0]) ? P.wait(P.open) : P.proven[0];
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return 'R'; }
}
// La politique en cours, en mots (journal, écran) — hors siège.
function _evoOpPolicy() {
  try {
    var P = _evoOpPlan(null), L = function (o) { return EVO_OP_LABEL[o]; };
    if (!P.proven.length) return 'rotation par siège entre ' + P.cands.map(L).join(' / ');
    if (!P.open.length) return L(P.proven[0]) + ' (prouvée) à chaque naissance';
    return L(P.proven[0]) + ' (prouvée) une naissance sur deux ; l\'autre : ' + P.open.map(L).join(' / ') + ' (à juger), en rotation par siège';
  } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} return ''; }
}
// Rejugée avec la règle de l'évolution (mêmes observations, purgées) : preuves vivantes et tenues ; journal 🧬 quand une source devient
// prouvée (bénéfique ou nuisible) ou cesse de l'être.
function _evoOpRefresh(E) {
  var st = _evoOpStats(E.obs), old = E.opRule || null, now = Date.now(), young = { R: -Infinity, B: -Infinity, M: -Infinity }, free = { R: -Infinity, B: -Infinity, M: -Infinity };   // plus jeune observation ; dernière naissance libre
  (E.obs || []).forEach(function (o) { if (!Array.isArray(o)) return; var so = _evoOpOf(o[7]), t = Number(o[0]); if (t > young[so]) young[so] = t; if (o[8] !== 1 && t > free[so]) free[so] = t; });
  Object.keys(S.evoTrials || {}).forEach(function (k) { var tr = S.evoTrials[k], t = tr ? Number(tr.t) / 1000 : NaN; if (isFinite(t) && !tr.forced && t > free[_evoOpOf(tr.op)]) free[_evoOpOf(tr.op)] = t; });
  var hk = function (y, t) { return !!(y && (y.harm || (y.held && y.held.until > t))); };   // nuisible (vivante ou tenue) à l'instant t de sa règle
  var key = function (x) { return EVO_OPS.map(function (o) { var y = x && x[o]; return o + ':' + (y && y.gain ? 'g' : hk(y, (x && x.t) || 0) ? 'h' : '-'); }).join(','); };
  var rule = { t: now };
  EVO_OPS.forEach(function (o) {
    var s = st[o], ph = old && old[o] && old[o].held, held = null;
    if (s.harm) held = { t: now / 1000, until: young[o] * 1000 + 1.5 * TH_MIN_B * EVO_BLOCK_MS, mean: s.harm.mean, se: s.harm.se, n: s.harm.n, blocks: s.harm.blocks };   // tenue jusqu'à l'expiration de sa plus jeune observation
    else if (ph && now < ph.until && !(free[o] > ph.t)) held = ph;   // plus prouvée sur la fenêtre (purges, ou essais nés avant la preuve), sans naissance libre de cette source depuis : tenue jusqu'à son terme
    rule[o] = { n: s.n, blocks: s.blocks, mean: s.mean, se: s.se, gain: s.gain, harm: s.harm, held: held, open: !s.gain && !held && (s.n < TH_MIN_N || s.blocks < TH_MIN_B) };
  });
  var changed = key(old) !== key(rule), allHarm = EVO_OPS.every(function (o) { return !!rule[o].held; });   // première évaluation comprise (old absent : rien de prouvé)
  E.opRule = rule; rule.policy = _evoOpPolicy();   // après : la politique lit les preuves tenues de cette règle
  if (changed) {
    if (!S.chainLog) S.chainLog = [];
    var f3 = function (x) { return (x >= 0 ? '+' : '') + x.toFixed(3).replace('.', ','); }, u3 = function (x) { return x.toFixed(3).replace('.', ','); }, parts = [], days = Math.round(1.5 * TH_MIN_B * EVO_BLOCK_MS / 86400000);
    EVO_OPS.forEach(function (o) {
      var a = (old && old[o]) || {}, b = rule[o], ah = hk(a, old ? old.t || 0 : 0);
      if (b.gain && !a.gain) parts.push(EVO_OP_LABEL[o] + ' : prouvée bénéfique (' + f3(b.gain.mean) + ' ± ' + u3(b.gain.se) + ', ' + b.gain.n + ' évolutions, ' + b.gain.blocks + ' créneaux)');
      else if (b.held && !ah) parts.push(EVO_OP_LABEL[o] + ' : prouvée nuisible (' + f3(b.held.mean) + ' ± ' + u3(b.held.se) + ', ' + b.held.n + ' évolutions, ' + b.held.blocks + ' créneaux)' + (allHarm ? '' : ' — écartée jusqu\'à ' + days + ' jours après sa plus jeune observation (repoussé si une nouvelle observation la reprouve)'));
      else if (!b.gain && !b.held && (a.gain || ah)) parts.push(EVO_OP_LABEL[o] + ' : plus rien de prouvé');
    });
    if (allHarm) parts.push('toutes prouvées nuisibles : aucune n\'est écartée (rien n\'est retiré)');
    S.chainLog.push({ icon: '🧬', desc: 'Opérateur appris · ' + parts.join(' ; ') + ' → naissances : ' + rule.policy, hash: Math.random().toString(36).slice(2, 8), time: (typeof nowStr === 'function') ? nowStr() : '' });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  }
  return rule;
}
window._evoOpStats = _evoOpStats; window._evoOpPick = _evoOpPick; window._evoOpRefresh = _evoOpRefresh; window._evoOpPlan = _evoOpPlan; window._evoOpPolicy = _evoOpPolicy;
