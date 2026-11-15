// [DÉGEL DES VOIX · 02/10/2026] VERSION 20261002a · porte RE : une série trouée (bouche-trou parmi les 60 bougies lues, 02) redemande les vraies bougies et attend ; la projection garde la marque _gap ; la projection garde la marque _r (bougie REST)
// [MARCHÉ RÉPARÉ · 30/09/2026] VERSION 20260930a · en EV / RE, les ordres LMSR toutes les 6 s (biais global a.score, jamais payés) et l'injection du composite dans le marché (rendu) ne tournent plus : le marché d'une paire, ce sont ses manches (03 _mktCycle) — AA inchangé
// [ÉVOLUTION APPRISE · 28/09/2026] VERSION 20260928c · déclencheurs d'évolution de la page Home (plus faible évoluable sous 300, stagnation sous 400) : niveau appris s'il est prouvé (_evoOk, 03), sinon les nombres posés à la main ; déclencheur transmis (D / E)
// [MARCHÉ LMSR À PART · 28/09/2026] VERSION 20260928b · le marché LMSR (ordres des agents toutes les 6 s) ne débite plus a.fitness : il a son portefeuille par siège, a.lmsrWallet — rechargé à la fitness à chaque écriture du jugement (03, porte unique), débité par les ordres (_lmsrSpend), lu par la taille des ordres et les gardes à la place de a.fitness — et sa dépense a.lmsrSpent (celle du génome, remise à zéro à l'évolution). Le flux d'ordres, le marché (qYes / qNo, lmsrP) et tout ce qui le lit gardent la dynamique d'avant (le flux s'éteint entre deux jugements, repart au jugement — équivalence prouvée passe à passe contre l'ancien bloc, banc-marche-lmsr ; deux écarts voulus : un coût NaN n'est ni retiré ni compté, et pendant la démo 05 le marché tourne sur les portefeuilles réels) ; seule la fitness ne bouge plus entre deux jugements — avant, ≈ 0,14 × fitness × |score| × prix lui étaient retirés par passe (jusqu'à −30 à −50 % par minute) ; c'est cette valeur débitée que lisaient l'évolution de la page Home (ici, toutes les 8 s, sans recalcul), le compte des cassés (≤ 80) et la part de fitness du levier (_favConsensus, 02), et qu'un siège sans preuve (jamais réécrit par le jugement) gardait pour toujours
// [HORIZONS APPRIS · 27/09/2026] VERSION 20260927i · mode réel (EV / RE) traité en arrière-plan : ses paires reçoivent le dernier prix réel accepté (< 2 min) à chaque passage — avant, son ps.price datait du dernier passage à l'écran
// [SURVEILLANCE PERMANENTE · 27/09/2026] VERSION 20260927a · le battement fait tourner la flotte de chaque mode en play (_fleetHeartbeat, dans le contexte du mode) et juge les affirmations des bots à chaque tick (_botMeritAudit)
// [CONTEXTE 1 H / 4 H · 26/09/2026] VERSION 20260926e · tuile « Contexte 1 h / 4 h » (ex « Régime de volatilité ») : elle lit le siège converti
// [MACRO RÉEL · 26/09/2026] VERSION 20260926b · tuiles fondamentales : étiquettes vraies ; la tuile News lit nlp_v1 ; la tuile Macro lit le flux réel
// [MÉMOIRE DES CHEMINS · 22/09/2026] VERSION 20260922a · le battement enregistre le chemin de chaque position ouverte (_pathRecord) avant le balayage des sorties
// [JOURNAL DES ÉVÉNEMENTS · 20/09/2026] VERSION 20260920b · le battement repose le relais du journal si besoin
// [GÉNOME DE PAIRE · 17/09/2026] VERSION 20260917e · getTechSignals : périodes et poids du mélange = génome de la paire (03) ; rollover quotidien par paire
// [RETRAIT REDISTRIBUTION · 16/09/2026] VERSION 20260916e · appel redistributeFitness retiré du battement
// [1b-b · 15/09/2026] VERSION 20260915c · EV/RE : ps.candles = klines Binance de la tf du mode (_projectRealCandles, battement) ; générateur synthétique réservé à AA ; série périmée → figée + ps._candlesStale
// [1b-a · 14/09/2026] VERSION 20260914a · porte RE : fraîcheur AVANT `closedTs <= lastSeenTs` ; battement : _lossCapSweep rebranché (1 tick/3, règle 06/07) et _botExitSweep (sorties bot sur ps.price) appelés pour chaque mode traité
// [PHASE 1 · 12/09/2026] VERSION 20260912c · simTick : rotation roster 1 paire/tick et rafraîchissement roster paire active RETIRÉS (ils n'existaient que pour écraser a.score ; le roster par paire vit dans 10f/09c/panneaux)
// [GEL BOOT · 11/09/2026] VERSION 20260911b · correctif LoAF : la frame arrive APRÈS le tick qui écrit le gel (observé 20:24 : « LoAF aucun » sur 2 longtasks de 5,6/7,1 s) → rattachement tardif au dernier gel (S.perfLog.gels[].loaf + ligne 🐌 réécrite) + anneau durable S.perfLog.loaf (20 frames ≥ 1 s, scripts nommés) indépendant des gels
// [GEL BOOT · 11/09/2026] VERSION 20260911a · sonde LoAF (long-animation-frame, Chrome ≥ 123) : le navigateur nomme le script bloquant (fichier:position, fonction, appelant) dans la ligne 🐌 · S.perfLog.gels = 30 derniers gels persistés (nom d'op complet, heap, dom, LoAF) · relevé heap/DOM toutes les 10 min dans S.perfLog.heap (144 pts = 24 h)
// [CHRONO NOMINATIF · 02/08/2026] longtask a PROUVE un vrai blocage code (~9s, attribution unknown) -> chrono pose sur les fonctions synchrones suspectes pour la NOMMER au prochain gel (⏱ LENT: fn Xs). Temporaire.
// [DISCRIMINATEUR LONGTASK · 02/08/2026] observateur PerformanceObserver longtask : un gel 🐌 accompagne d une ligne ⏱ = vrai blocage JS (a traquer) ; un gel 🐌 SANS ⏱ = l OS a mis la boucle en pause (throttle/veille, pas un bug code). Wake Lock conserve.
// [WAKE LOCK · 02/08/2026] heap sain (415/954Mo) a elimine la GC : le gel n est PAS un blocage JS mais Android qui suspend les timers du WebView au premier plan (batterie) -> verrou d ecran pose pour l empecher · le log de gel reste actif pour confirmer que ca disparait
// [GEL v2 · HEAP · 02/08/2026] le log de gel ajoute la memoire heap (Chrome Android) pour trancher : heap proche de la limite = pause GC/pression memoire (fix = trimmer), heap bas = operation lourde (fix = timer les intervalles). Diagnostic confirme : gels ~15s ecran visible hors simTick (simTick 4-28ms).
// [MONITEUR DE GEL + RENDU CONDITIONNEL · 02/08/2026] simTick journalise tout trou >3s dans chainLog (🐌 ecran visible = blocage reel + duree dernier tick ; 📴 ecran masque = throttle Android normal) pour diagnostiquer le lag sans profiler · le rendu lourd est saute quand document.hidden (trading/apprentissage continuent) : economie + pas de rattrapage brutal au retour
// [DAO+CLASSEMENT · 02/08/2026] classement agents : 'reward'(totalReward mort) remplace par 'streak' (serie gagnante/perdante, vivante) · propositions DAO position #42/#43 purgees de l'etat + note 'le bot agit en autonome' quand aucune proposition
// [ONGLET TRADES REEL · 02/08/2026] l'onglet Trades du journal CHAIN lit desormais l'historique reel des trades (ps.trades par paire, conserve, cape a 100/paire) au lieu du journal volatil qui les evincait sous le flot Apprentissage/Dream (plafond 200) · TRADE_ICONS/isTrade supprimes (code mort)
// [MODALE TEMPS REEL · 01/08/2026] la modale « Fermer les positions », si visible, est re-rendue a chaque battement (P&L $ live sur le prix courant, quel que soit l'onglet)
// [PERF BATTEMENT 26/07/2026] les modes d arriere-plan sont resolus 1 tick sur 3 (decompte x3, resultat identique) : le battement ne fait plus 3x le travail chaque seconde · [NETTOYAGE PERF 26/07/2026] le garde-fou perte max s execute dans ce battement (1 tick sur 3) au lieu d une minuterie separee · [SIMULTANE · ETAPE 1 · 06/07/2026] MULTIPLEXEUR 3 MODES : chaque mode EN PLAY bat a chaque tick quel que soit l ecran (bascule atomique, accesseurs par mode, protection SL/TP par mode, affiche traite en dernier) — conception Rams : AA apprend, EV evalue, RE surveille/agit selon Regles v2, TOUS EN MEME TEMPS
// [FIX MAJEUR] 'portfolio drift' SUPPRIME : creation d'argent aleatoire biaisee positive (~+21%/jour composee) — les portefeuilles gonflaient sans trades (+50$ fantomes en 3 jours sur AA et EV, preuve backup Guardian 05/07) · 05/07/2026
// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 08/10
// Contient : learning-history-render, lmsr-threshold-drag-yellow-marker-on-actio, simulation-tick-multi-pair
// ════════════════════════════════════════════════════════════
// ============================================================
// LEARNING HISTORY RENDER
// ============================================================
function renderLearningHistory() {
  const feed  = document.getElementById('learnFeed');
  const stats = document.getElementById('learnStats');
  const count = document.getElementById('learnCount');
  if(!feed) return;

  const hist = S.learningHistory;
  if(count) count.textContent = hist.length;

  // Stats summary
  const won    = hist.filter(h=>h.won).length;
  const lost   = hist.length - won;
  const avgPnl = hist.length > 0
    ? (hist.reduce((s,h)=>s+(typeof h.pnlPct==='number'?h.pnlPct:0),0)/hist.length).toFixed(2)
    : '0.00';
  const wr = hist.length > 0 ? Math.round(won/hist.length*100) : 0;

  if(stats) stats.innerHTML = `
    <div class="learn-stat-card">
      <div class="learn-stat-val" style="color:var(--up)">${wr}%</div>
      <div class="learn-stat-lbl">Win Rate</div>
    </div>
    <div class="learn-stat-card">
      <div class="learn-stat-val">${hist.length}</div>
      <div class="learn-stat-lbl">Évènements</div>
    </div>
    <div class="learn-stat-card">
      <div class="learn-stat-val" style="color:${parseFloat(avgPnl)>=0?'var(--up)':'var(--down)'}">${parseFloat(avgPnl)>=0?'+':''}${avgPnl}%</div>
      <div class="learn-stat-lbl">PnL Moyen</div>
    </div>`;

  // Feed — last 30 events newest first
  const recent = hist.slice(-30).reverse();
  if(recent.length === 0) {
    feed.innerHTML = '<div style="padding:16px;text-align:center;color:var(--t3);font-size:11px;">En attente des premiers apprentissages…</div>';
    return;
  }

  feed.innerHTML = recent.map(h => {
    const up      = h.won;
    const dotCol  = up ? 'var(--up)' : 'var(--down)';
    const _pp = (typeof h.pnlPct === 'number' && isFinite(h.pnlPct)) ? h.pnlPct : 0;
    const pnlStr  = (_pp>=0?'+':'')+_pp.toFixed(2)+'%';
    const srcIcon = h.source==='position' ? '📈' : h.source==='trade' ? '⚡' : '🔄';
    const adj     = h.adjustments || [];
    const topAgent= adj.length>0
      ? adj.sort((a,b)=>b.fitnessDelta-a.fitnessDelta)[0]
      : null;
    const adjStr  = topAgent
      ? (topAgent.aligned?'↑ ':'↓ ')+topAgent.agentName.split(' ')[0]
      : '';
    return `
    <div class="learn-item">
      <div class="learn-dot" style="background:${dotCol};box-shadow:0 0 5px ${dotCol}66;"></div>
      <div class="learn-body">
        <div class="learn-pair">${h.pair} <span style="color:var(--t3);font-size:9px;">${srcIcon} ${h.source}</span></div>
        <div class="learn-src">${adjStr ? 'Meilleur: '+adjStr : 'Cycle #'+h.cycle}</div>
      </div>
      <div class="learn-right">
        <div class="learn-pnl" style="color:${up?'var(--up)':'var(--down)'}">${pnlStr}</div>
        <div class="learn-time">${h.time}</div>
      </div>
    </div>`;
  }).join('');
}

function renderAgents() {
  const list = document.getElementById('mobileAgentList');
  if(list && list.children.length !== S.agents.length) buildAgentCards();
  patchAgentCards();
  try { if (typeof _agBrefRender === 'function') _agBrefRender(); } catch(e) {}   // [GO CSS · écran 2 · 14/11/2026] En bref + nombre par famille (09i)
  // Only render active tab
  const evoPanel = document.getElementById('agentPanel-evo');
  if(evoPanel && evoPanel.style.display !== 'none') renderAgentsEvo();
}

function renderMarket() {
  const ps=AP(), cfg=ACFG();
  const priceStr = pxTxt(S.activePair, ps.price);   // [GO CSS FINITIONS · 14/11/2026] (n° 86) 02 pxTxt
  const mktEl = document.getElementById('mktPrice');
  if(mktEl) {
    const prevPrice = parseFloat(mktEl.dataset.prev || ps.price);
    const delta = ps.price - prevPrice;
    mktEl.textContent = priceStr;
    mktEl.style.color = cfg.color;
    mktEl.dataset.prev = ps.price;
    if(Math.abs(delta) > cfg.vol * 0.1) {
      mktEl.style.textShadow = delta>0 ? '0 0 12px rgba(0,232,122,.6)' : '0 0 12px rgba(255,61,107,.6)';
      setTimeout(()=>{ if(mktEl) mktEl.style.textShadow=''; }, 600);
    }
  }
  const lbl = document.getElementById('mktPairLabel');
  if(lbl) lbl.textContent = cfg.sym+' / USDT';

  const p24 = ps.pnl24h;
  const p24El = document.getElementById('mktPnl24h');
  if(p24El){
    p24El.textContent = (p24>=0?'↑ +':'↓ ')+Math.abs(p24).toFixed(2)+'%';
    p24El.style.color = p24>=0?'var(--up)':'var(--down)';
  }

  // ── Pair selector (build once) ──
  // [GO CSS · écran 3 · 14/11/2026] une puce par paire : la barre était bâtie UNE fois, avant que 11 ne recharge les paires ajoutées
  // (sonde du 14/11 : 10 puces pour 12 paires, PEPE et EUR absentes) → rebâtie quand la LISTE des paires change (clé posée sur la barre : un retrait
  // et un ajout entre deux rendus gardent le même nombre) ; elle va dans la barre de la paire (#mkPairBar)
  { const _ps = document.getElementById('pairSelWrap');
    if (_ps && _ps.dataset.k !== Object.keys(PAIRS).join('|')) _ps.remove(); }
  if(!document.getElementById('pairSelWrap')){
    const wrap = document.getElementById('candle-wrap-top');
    if(wrap){
      const sel = document.createElement('div');
      sel.id='pairSelWrap';
      sel.dataset.k = Object.keys(PAIRS).join('|');
      sel.style.cssText='display:flex;gap:6px;padding:10px 16px 0;overflow-x:auto;scrollbar-width:none;flex-shrink:0;';
      Object.keys(PAIRS).forEach(pair=>{
        const btn=document.createElement('div');
        btn.className='pair-pill'+(pair===S.activePair?' active':'');
        btn.id='ppill_'+pair.replace('/','_');
        btn.setAttribute('data-pair',pair);
        btn.onclick=()=>selectPair(pair);
        const c=PAIRS[pair];
        btn.innerHTML=`<span style="color:${c.color};margin-right:3px">●</span>${pair}`;
        sel.appendChild(btn);
      });
      const _bar = document.getElementById('mkPairBar');
      if (_bar) _bar.insertBefore(sel, _bar.firstChild); else wrap.insertAdjacentElement('afterend',sel);
    }
  }
  Object.keys(PAIRS).forEach(pair=>{
    const el=document.getElementById('ppill_'+pair.replace('/','_'));
    if(el) el.className='pair-pill'+(pair===S.activePair?' active':'');
  });

  // ── LMSR bars removed in v6.6 — consensus strip takes their place ──
  const _mktLmsr = document.getElementById('mktAllLmsr');
  if(_mktLmsr) _mktLmsr.remove(); // clean up if lingering from old state
  // v6.6: Agent consensus strip
  const _consMkt = document.getElementById('agentConsensusMkt');
  if(_consMkt) {
    const _topA = [...S.agents].filter(a=>Math.abs(a.score||0)>0.03&&!a.isBot).sort((a,b)=>Math.abs(b.score)-Math.abs(a.score)).slice(0,8);
    const _bull=_topA.filter(a=>(a.score||0)>0.05).length, _bear=_topA.filter(a=>(a.score||0)<-0.05).length;
    const _dir=_bull>_bear?'↑ HAUSSIER':_bear>_bull?'↓ BAISSIER':'→ NEUTRE';
    const _col=_bull>_bear?'var(--up)':_bear>_bull?'var(--down)':'var(--gold)';
    const _chips=_topA.map(a=>{const cc=(a.score||0)>0.05?'var(--up)':(a.score||0)<-0.05?'var(--down)':'var(--gold)';return `<span style="background:var(--s2);border:1px solid ${cc}33;border-radius:6px;padding:3px 7px;font-size:9px;color:${cc};">${a.type || a.name} ${((a.score||0)>=0?'+':'')+((a.score||0).toFixed(2))}</span>`;}).join('');   // [GO CSS · écran 3] la spécialité, pas 🧬 (tous les sièges portent 🧬)
    _consMkt.innerHTML=`<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:4px 0;"><span style="font-size:9px;font-weight:700;color:${_col};background:${_col}22;padding:3px 8px;border-radius:6px;white-space:nowrap;">${_dir}</span>${_chips}</div>`;
  }
}

function selectPair(pair) {
  S.activePair = pair;
  renderMarket();
  drawMobileChart();
  renderAnalysis();
  showToast('Paire: '+pair);
}

// [GO CSS · écran 4 · 14/11/2026] écran DAO par priorité (Rams « Go css », maquette validée « Go » 13:59), affichage seul :
//  En bref (#daoBref : bots · analystes · propositions) · Propositions (#daoPropZone, montrée seulement s'il y en a) ·
//  Classement T$ en deux groupes — bots (rôle 'execution', les maîtres, comme l'écran Agents) puis analystes —, 2 colonnes,
//  chaque ligne garde son rang sur tous ; un analyste se lit par sa spécialité (a.type), son nom en dessous ; la série seulement
//  si elle existe. Ids gardés : wrow_ / wv_ / wn_ / wbar_ (patchGovCards), gc_ / vf_ / va_ / vs_for_ / vs_ag_ / vbtns_. Style : css/31-dao-zones.css.
function _daoIsBot(a) { return (a.role || 'fundamental') === 'execution'; }
function _daoStreak(n) {
  n = Math.trunc(Number(n) || 0);
  if (!n) return '';
  return n > 0 ? `<span class="dao-stk up">🔥 ${n} gain${n > 1 ? 's' : ''} d'affilée</span>`
               : `<span class="dao-stk dn">❄ ${-n} perte${n < -1 ? 's' : ''} d'affilée</span>`;
}
// la liste des propositions SANS la proposition de paire EN VOTE : elle a sa grande carte (#daoNewPairCard, renderDAO) — avant, elle était montrée deux fois ;
// une proposition de paire passée (exécutée, rejetée) garde sa petite carte, comme avant
function _daoGovProps() { return (S.proposals || []).filter(p => !(p.isPairProposal && p.status === 'active')); }
function _daoPropZone() {
  const z = document.getElementById('daoPropZone'); if (!z) return;
  const on = _daoGovProps().length > 0 || !!document.getElementById('daoNewPairCard');
  if (z.classList.contains('on') !== on) z.classList.toggle('on', on);
}
// clé du classement : l'ordre, les spécialités et les séries — si elle change, buildGovCards rebâtit (patchGovCards ne fait que les chiffres)
function _daoKey(sorted) { return sorted.map(a => a.id + ':' + (a.type || '') + ':' + Math.trunc(Number(a.streak) || 0)).join('|'); }
function _daoBrefRender(sorted) {
  const set = (id, t) => { const e = document.getElementById(id); if (e && e.textContent !== t) e.textContent = t; };
  const T = a => Math.floor(Number(a.fitness) || 0);
  const rank = new Map(sorted.map((a, i) => [a.id, i + 1]));
  const bots = sorted.filter(_daoIsBot), ana = sorted.filter(a => !_daoIsBot(a));
  const r1 = bots.length ? rank.get(bots[0].id) : 0, devant = bots.length ? ana.filter(a => rank.get(a.id) < r1).length : 0;
  set('daoBrefBots', String(bots.length));
  set('daoBrefBotsBest', bots[0] ? '1er : ' + bots[0].name : '—');
  set('daoBrefBotsSub', bots[0] ? T(bots[0]) + ' T$ · rang ' + r1 + ' sur ' + sorted.length : '—');
  set('daoBrefAna', String(ana.length));
  set('daoBrefAnaBest', ana[0] ? '1er : ' + (ana[0].type || ana[0].name) : '—');
  set('daoBrefAnaSub', ana[0] ? T(ana[0]) + ' T$' + (bots.length ? ' · ' + devant + ' devant le 1er bot' : '') : '—');
  const act = (S.proposals || []).filter(p => p.status === 'active').length;
  set('daoBrefProp', String(act));
  set('daoBrefPropBest', act ? act + ' en vote' : 'aucune active');
  set('daoClsSub', 'marché interne · rang sur ' + sorted.length);
  set('daoGrpBotsSub', bots.length + (bots.length ? ' · le 1er au rang ' + r1 : ''));
  set('daoGrpAnaSub', ana.length + (bots.length ? ' · ' + devant + ' devant le 1er bot' : ''));
}

function buildGovCards() {
  if(!S.proposals) S.proposals = [];
  // [02/08/2026] purge définitive des anciennes propositions « position » codées en dur
  // (#42/#43) : le bot agit en autonome, pas via la DAO.
  S.proposals = S.proposals.filter(p => p.id !== 42 && p.id !== 43);
  if(!S.totalTFlows) S.totalTFlows = 0;
  const gl = document.getElementById('mobileGovList');
  // [GO CSS · écran 4] sans les propositions de paire (grande carte) ; vide = la zone se cache, la tuile « Propositions » d'En bref le dit
  gl.innerHTML = _daoGovProps().map(p=>`
    <div class="gov-card" id="gc_${p.id}">
      <div class="gov-id">Proposition #${p.id}</div>
      <div class="gov-desc">${p.desc}</div>
      <div class="vote-progress">
        <div class="vote-for-fill"  id="vf_${p.id}" style="width:0%"></div>
        <div class="vote-against-fill" id="va_${p.id}" style="width:0%"></div>
      </div>
      <div class="vote-stat-row">
        <span class="vote-stat-for"    id="vs_for_${p.id}">↑ Pour: 0 G$ (0%)</span>
        <span class="vote-stat-against" id="vs_ag_${p.id}">↓ Contre: 0 G$ (0%)</span>
      </div>
      <div id="vbtns_${p.id}" class="gov-bot">🤖 Décision bot · vote automatique</div>
    </div>`).join('');
  _daoPropZone();

  // Classement T$ — trié par fitness, deux groupes (bots puis analystes), rang sur tous
  const wl = document.getElementById('mobileWallets');
  const sorted = [...S.agents].sort((a,b)=>b.fitness-a.fitness);
  const maxFit = Math.max(1, sorted[0]?.fitness || 1);
  const rank = new Map(sorted.map((a, i) => [a.id, i + 1]));
  const medals = ['🥇','🥈','🥉'];
  const row = (a, i, half) => {
    const r = rank.get(a.id), bot = _daoIsBot(a);
    const nom = `<span id="wn_${a.id}">${a.name}</span>`;
    return `<div class="dao-row${i >= half ? ' dao-c2' : ''}" id="wrow_${a.id}">
      <div class="dao-rk${r <= 3 ? ' m' : ''}">${medals[r - 1] || r}</div>
      <div class="dao-em">${a.emoji}</div>
      <div class="dao-mid">
        <div class="dao-top"><span class="dao-nm">${bot ? nom : (a.type || a.name)}</span><span class="dao-tv"><span id="wv_${a.id}">${Math.floor(a.fitness)}</span> <small>T$</small></span></div>
        <div class="dao-bar"><div id="wbar_${a.id}" style="width:${Math.round(a.fitness/maxFit*100)}%;background:${a.color};"></div></div>
        <div class="dao-sub"><span>${bot ? (a.type || '') : nom}</span>${_daoStreak(a.streak)}</div>
      </div>
    </div>`;
  };
  const grp = (arr, titre, subId) => {
    const half = Math.ceil(arr.length / 2);
    return arr.length ? `<div class="dao-grp"><div class="dao-grp-h"><span>${titre}</span><em id="${subId}"></em></div>
      <div class="dao-rows" style="--rows:${half}">${arr.map((a, i) => row(a, i, half)).join('')}</div></div>` : '';
  };
  wl.innerHTML = grp(sorted.filter(_daoIsBot), 'Bots · les maîtres', 'daoGrpBotsSub') + grp(sorted.filter(a => !_daoIsBot(a)), 'Analystes', 'daoGrpAnaSub');
  wl.dataset.k = _daoKey(sorted);
  _daoBrefRender(sorted);
}

function patchGovCards() {
  // [GO CSS · écran 4 · 14/11/2026] l'ordre, une spécialité ou une série a changé : on rebâtit (rangs, groupes) AVANT de poser les chiffres,
  // pour que les cartes de propositions rebâties reçoivent tout de suite leurs votes (relecture du 14/11)
  const _wl = document.getElementById('mobileWallets');
  if (_wl && _wl.children.length && _wl.dataset.k !== _daoKey([...S.agents].sort((a,b)=>b.fitness-a.fitness))) buildGovCards();
  S.proposals.forEach(p=>{
    const total = p.forVotes+p.againstVotes;
    const fp = (p.forVotes/total*100);
    const ap = (p.againstVotes/total*100);
    const elFor  = document.getElementById('vf_'+p.id);
    const elAg   = document.getElementById('va_'+p.id);
    const elSFor = document.getElementById('vs_for_'+p.id);
    const elSAg  = document.getElementById('vs_ag_'+p.id);
    const elBtns = document.getElementById('vbtns_'+p.id);
    if(!elFor) return;
    elFor.style.width = fp+'%';
    if(elAg)   elAg.style.width   = ap+'%';
    if(elSFor) elSFor.textContent = `↑ Pour: ${p.forVotes.toLocaleString()} G$ (${fp.toFixed(0)}%)`;
    if(elSAg)  elSAg.textContent  = `↓ Contre: ${p.againstVotes.toLocaleString()} G$ (${ap.toFixed(0)}%)`;
    // Bot auto-execution check — execute when consensus reached
    if(p.status === 'active' && !p.isPairProposal) {
      const total = p.forVotes + p.againstVotes;
      const forPct = total > 0 ? p.forVotes / total : 0;
      if(forPct >= 0.65 && total > 500 && !p._executed) {
        p._executed = true;
        p.status = 'executed';
        if(elBtns) elBtns.innerHTML = '<div style="text-align:center;font-size:10px;color:var(--up);padding:5px 0;">✅ Décision bot exécutée on-chain</div>';
        S.chainLog.push({ icon:'✅', desc:`DAO #${p.id}: "${p.desc.slice(0,40)}" exécuté · ${(forPct*100).toFixed(0)}% consensus`, hash:rndHash(), time:nowStr() });
        bumpVersion('DAO #'+p.id+' exécuté');
      } else if(p.status !== 'executed' && elBtns) {
        const pct = total > 0 ? (forPct*100).toFixed(0) : 0;
        const eta = total > 0 && forPct < 0.65 ? Math.ceil((0.65*total - p.forVotes) / Math.max(1, p.forVotes/Math.max(1,S.cycle))) : 0;
        elBtns.textContent = `🤖 Bot · ${pct}% · ${forPct>=0.65?'prêt à exécuter':eta>0?'~'+eta+' cycles':'en attente'}`;
        elBtns.style.color = forPct>=0.65?'var(--up)':forPct>0.5?'var(--gold)':'var(--pur)';
      }
    } else if(p._executed || p.status === 'executed') {
      if(elBtns && !elBtns.textContent.includes('Exécuté') && !elBtns.innerHTML.includes('✅')) {
        elBtns.innerHTML = '<div style="text-align:center;font-size:10px;color:var(--up);padding:5px 0;">✅ Exécuté on-chain</div>';
      }
    }
  });

  // Patch wallet scoreboard values
  const sorted2 = [...S.agents].sort((a,b)=>b.fitness-a.fitness);
  const maxFit2 = Math.max(1, sorted2[0]?.fitness || 1);
  S.agents.forEach(a=>{
    const wv   = document.getElementById('wv_'+a.id);
    const wn   = document.getElementById('wn_'+a.id);
    const wbar = document.getElementById('wbar_'+a.id);
    if(!wv) return;
    wv.textContent   = Math.floor(a.fitness);
    if(wn) wn.textContent = a.name;
    if(wbar) wbar.style.width = Math.round(a.fitness/maxFit2*100)+'%';
  });
  _daoBrefRender(sorted2);   // [GO CSS · écran 4] En bref suit les chiffres
}

function renderDAO() {
  const gl = document.getElementById('mobileGovList');
  if(!gl) return;
  // v6.5 FIX: always call buildGovCards on first render OR when proposals change
  // Previously: never called when S.proposals.length===0 → mobileWallets empty
  const wl = document.getElementById('mobileWallets');
  if(gl.children.length !== _daoGovProps().length || (wl && !wl.children.length)) {   // [GO CSS · écran 4] la liste sans les propositions de paire ; vide = 0 enfant (avant : le message « Aucune proposition » faisait tout rebâtir à chaque passage)
    buildGovCards();
  }

  // Agents vote automatically every 10 ticks based on fitness×score
  if(tick % 10 === 0) {
    S.proposals.filter(p => p.status==='active' && !p._executed).forEach(p => {
      S.agents.forEach(a => {
        const weight = Math.floor(Math.abs(a.score) * (a.fitness * 0.004));
        if(weight < 1) return;
        if(a.score > 0.15)       p.forVotes     += weight;
        else if(a.score < -0.15) p.againstVotes += weight;
      });
    });
  }

  // ── Dynamic Pair Proposal Card (Feature #3) ───────────────
  let pairProposalEl = document.getElementById('daoNewPairCard');
  const pairProp = S.proposals.find(p => p.isPairProposal && p.status === 'active');
  if(pairProp) {
    if(!pairProposalEl) {
      pairProposalEl = document.createElement('div');
      pairProposalEl.id = 'daoNewPairCard';
      gl.parentNode.insertBefore(pairProposalEl, gl);
    }
    const cfg = pairProp.pairCfg || {};
    const totalVotes = (pairProp.forVotes + pairProp.againstVotes) || 1;
    const forPct = Math.round(pairProp.forVotes / totalVotes * 100);
    const remaining = Math.max(0, (pairProp.autoPassAt || 0) - S.cycle);
    pairProposalEl.innerHTML = `
      <div class="pair-proposal-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div style="font-size:28px;">${cfg.emoji||'🌐'}</div>
          <div>
            <div class="pair-proposal-sym">${pairProp.pairSym}/USDT</div>
            <div class="pair-proposal-name">${cfg.name||''} · Corrélation: <span style="color:${cfg.corr==='LOW'?'var(--up)':cfg.corr==='MED'?'var(--gold)':'var(--down)'};">${cfg.corr||'?'}</span></div>
          </div>
        </div>
        <div class="pair-proposal-rationale">"${pairProp.rationale||''}"</div>
        <div class="pair-proposal-stats">
          <div class="pair-proposal-stat">
            <div class="pair-proposal-stat-val" style="color:var(--up)">${pairProp.forVotes.toLocaleString()}</div>
            <div class="pair-proposal-stat-lbl">G$ Pour</div>
          </div>
          <div class="pair-proposal-stat">
            <div class="pair-proposal-stat-val" style="color:var(--down)">${pairProp.againstVotes.toLocaleString()}</div>
            <div class="pair-proposal-stat-lbl">G$ Contre</div>
          </div>
          <div class="pair-proposal-stat">
            <div class="pair-proposal-stat-val">${forPct}%</div>
            <div class="pair-proposal-stat-lbl">Consensus</div>
          </div>
          <div class="pair-proposal-stat">
            <div class="pair-proposal-stat-val" style="color:var(--gold)">${remaining}</div>
            <div class="pair-proposal-stat-lbl">Cycles</div>
          </div>
        </div>
        <div style="height:4px;border-radius:100px;background:var(--s3);margin-top:10px;overflow:hidden;">
          <div style="width:${forPct}%;height:100%;background:linear-gradient(90deg,var(--up),var(--ice));border-radius:100px;transition:width 1s;"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px;">
          <button class="pair-activate-btn" onclick="activateDynamicPair('${pairProp.pairSym}')" style="margin-top:0;">
            ✅ Activer ${pairProp.pairSym}/USDT
          </button>
          <button onclick="rejectPairProposal('${pairProp.pairSym}')" style="
            padding:10px 14px;background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.25);
            border-radius:10px;color:var(--down);font-size:11px;font-weight:600;font-family:var(--font-display);cursor:pointer;">
            ✕ Passer
          </button>
        </div>
      </div>`;
  } else if(pairProposalEl) {
    pairProposalEl.remove();
  }
  _daoPropZone();   // [GO CSS · écran 4] la zone Propositions suit la grande carte

  patchGovCards();
}

// [GO CSS · écran 5 · 14/11/2026] Écran Chain par priorité (Rams 14/11 15:03 « Go css », maquette montrée, « Ok » 15:16 ; doc projet
// claude/MAQUETTE-CHAIN-20261114.md) — affichage seul, rien de ce qui ouvre ou ferme un trade. Quatre tuiles en tête = les onglets (Trades · Décisions ·
// Apprentissage · Système), chacune avec son nombre et sa dernière ligne ; « Tout le journal » à côté de « Ce que le système a appris » (11b).
// L'écran s'ouvre sur les TRADES : avant, sur « Tout », le journal seul, où aucun trade n'apparaît (les trades ne vivent que dans ps.trades).
// Trades groupés par jour, mise à 2 décimales, résultat coloré ; journal : une ligne, heure à droite, lignes identiques groupées (×n), plus de
// « hash » (02 rndHash : tiré au hasard, pas une preuve). La liste n'est rebâtie que si le journal, les trades, l'onglet, le mode ou le jour changent
// (avant : à chaque passage, toutes les 5 s). Badge de l'onglet : trades nouveaux depuis la dernière visite de Chain, par mode (clé d'affichage
// aura_chain_vu) — avant : le nombre de lignes du journal, « 9+ » en permanence. L'onglet « DAO » disparaît : votes → Décisions, prix / réseau → Système.
let _chainFilter = 'trade';

// Nature d'une ligne du journal : décision (trade ouvert ou fermé, sortie, refus, vote, argent, bunker) · apprentissage · système (le reste).
// Ordre : 02 _eventKind (trade, argent, bunker → décision ; réseau → système ; évolution → apprentissage), puis les règles apprises, puis l'icône et le texte.
// Ouvertures : « BOT LONG SOL/USDT @… » (10f) et « Position LONG BTC/USDT | … » (02 openPosition, manuel) n'ont pas de nature dans 02 : leur icône 🟢 / 🔴.
const _CHAIN_DEC_KINDS = { ouverture: 1, fermeture: 1, veto: 1, argent: 1, tendance: 1, bunker: 1, sortie_trailing: 1, sortie_zombie: 1, sortie_consensus: 1, sortie_tp: 1, sortie_sl: 1 };
const _CHAIN_DEC_ICONS = ['🗳', '🟢', '🔴', '🚨', '🤖', '🤖⚡', '🎛️', '🎯', '💥', '🛑', '⛔', '🔗', '🧭', '📅', '₿', '📐', '🔒', '⏳', '🔌', '✕', '🏖️', '💶', '🏦', '💎', '✏️'];
const _CHAIN_LEARN_ICONS = ['🧠', '🧬', '🔄', '⛓', '💭', '🪞', '🦋', '🌀', '📝', '🎓', '💤', '🧮', '🪜', '⚖️'];
const _CHAIN_DEC_RE = /^Sortie |refus|annul|\bouvert|ferm[ée]|Trade MANUEL|contr[ôo]le|URGENCE|BUNKER|Anti-revenge|TP atteint|SL d[ée]clench|LIQUIDATION|Perte max|Trailing|Pyramide|TWAP|Vote|\bvoix |DAO #|Transfert|Injection|Vacances|Plein R[ée]gime|Stop c[ôo]t[ée] exchange|Pause streak|d[ée]sactiv|Garde comportementale/i;
const _CHAIN_LEARN_RE = /appris|Apprentissage|Learn\[/i, _CHAIN_RULE_RE = /^(Stop|Gain|Horizon|Emplacements) appris|^Learn\[/;
const _chainCatMemo = new WeakMap();
function _chainCat(tx) {
  if (!tx || typeof tx !== 'object') return 'sys';
  const m = _chainCatMemo.get(tx); if (m) return m;
  const k = (typeof _eventKind === 'function') ? _eventKind(tx) : null, d = String(tx.desc || '');
  const c = _CHAIN_DEC_KINDS[k] ? 'dec' : (k === 'reseau') ? 'sys' : (k === 'evolution' || _CHAIN_RULE_RE.test(d)) ? 'learn'
    : (_CHAIN_DEC_ICONS.includes(tx.icon) || _CHAIN_DEC_RE.test(d)) ? 'dec'
    : (_CHAIN_LEARN_ICONS.includes(tx.icon) || tx.category === 'learn' || _CHAIN_LEARN_RE.test(d)) ? 'learn' : 'sys';
  _chainCatMemo.set(tx, c); return c;
}
// heure HH:MM d'une ligne du journal (« 13:25:46 », ou « 3:06:04 PM » selon la langue de la tablette)
function _chainHM(s) {
  const m = String(s || '').match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]\.?M\.?)?/i); if (!m) return String(s || '');
  let h = +m[1]; if (m[3]) { const pm = /p/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
  return String(h).padStart(2, '0') + ':' + m[2];
}
// formats français, réutilisés (un Intl.NumberFormat par forme : ~45× moins cher que toLocaleString à chaque nombre)
const _chainNF = {};
function _chainFmt(n, k, o) { return (_chainNF[k] || (_chainNF[k] = new Intl.NumberFormat('fr-FR', o))).format(n); }
function _chainMoney(v) { const n = Number(v) || 0; return (n < 0 ? '−' : '') + '$' + _chainFmt(Math.abs(n), 'm2', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function _chainPx(v) {
  if (v == null) return '?'; const n = Number(v); if (!isFinite(n)) return '?';
  return n >= 100 ? _chainFmt(n, 'm2', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (n >= 1 ? _chainFmt(n, 'p4', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : _chainFmt(n, 's4', { maximumSignificantDigits: 4 }));
}
function _chainDay(ts, now) {
  const p = n => String(n).padStart(2, '0'), d = new Date(ts), t = new Date(now), y = new Date(now - 864e5);
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  return (same(d, t) ? "Aujourd'hui · " : (same(d, y) ? 'Hier · ' : '')) + ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d.getDay()] + ' ' + p(d.getDate()) + '/' + p(d.getMonth() + 1);
}
// Dernier trade VU sur l'écran Chain, par mode (clé d'affichage aura_chain_vu, nouvelle) ; écrite seulement quand un trade plus récent est vu.
function _chainVu(mode, ts) {
  let v = _chainVu._v;
  if (!v) { v = {}; try { v = JSON.parse(localStorage.getItem('aura_chain_vu') || '{}') || {}; } catch (e) { v = {}; } _chainVu._v = v; }
  if (ts !== undefined && !(v[mode] >= ts)) { v[mode] = ts; try { localStorage.setItem('aura_chain_vu', JSON.stringify(v)); } catch (e) {} }
  return v[mode];
}
function _chainTradeRow(pair, t) {
  const close = t.type !== 'open', dir = t.side === 'buy' ? 'LONG' : 'SHORT', pnl = Number(t.pnlUsdt) || 0, p = n => String(n).padStart(2, '0');
  const icon = close ? (pnl >= 0 ? '✅' : '❌') : (t.side === 'buy' ? '🟢' : '🔴'), d = new Date(t.ts || 0), hm = t.ts ? p(d.getHours()) + ':' + p(d.getMinutes()) : '—';
  const what = close ? `${dir} fermé · ${_chainPx(t.entryPrice)} → ${_chainPx(t.price)}` : `${dir} ouvert · mise ${_chainMoney(t.stakeUsdt)} à ${_chainPx(t.price)}`;
  const pct = (close && t.pnl != null && isFinite(Number(t.pnl))) ? ` <i>(${Number(t.pnl) < 0 ? '−' : '+'}${_chainFmt(Math.abs(Number(t.pnl)), 'q2', { maximumFractionDigits: 2 })} %)</i>` : '';
  const res = close ? `<b class="cz-res ${pnl >= 0 ? 'up' : 'dn'}">${pnl >= 0 ? '+' : ''}${_chainMoney(pnl)}${pct}</b>` : '';
  return `<div class="chain-row cz-tr"><div class="chain-icon-wrap">${icon}</div><div class="chain-content"><div class="chain-desc"><b class="cz-pair">${pair}</b> <span class="cz-what">${what}</span></div></div>`
    + `<div class="cz-r">${res}<span class="chain-time">${hm}</span></div></div>`;
}

// Trades du mode à l'écran (historique RÉEL, ps.trades par paire, paire retirée comprise) : un passage sans allocation — nombre, dernier.
function _chainScan() {
  const ps = S.pairStates || {}; let n = 0, pair = null, t = null;
  for (const p in ps) { const arr = (ps[p] && ps[p].trades) || []; n += arr.length;
    for (let i = 0; i < arr.length; i++) if (!t || (arr[i].ts || 0) > (t.ts || 0)) { t = arr[i]; pair = p; } }
  return { ps, n, pair, t, ts: t ? (t.ts || 0) : 0 };
}
// Badge de l'onglet Chain : trades nouveaux depuis la dernière visite de Chain (1re lecture d'un mode : rien de nouveau). Appelé par renderChain et,
// hors de l'écran Chain, toutes les 10 s par le battement de 08 (avant : le badge n'était posé que par renderChain, au nombre de lignes du journal).
function _chainBadge(sc, mode) {
  const b = document.getElementById('chainCountBadge'); if (!b) return;
  sc = sc || _chainScan(); mode = mode || ((typeof _walletKey === 'function') ? _walletKey(S.tradingMode) : S.tradingMode);
  let vu = _chainVu(mode);
  if (vu === undefined || S.currentPage === 4) { _chainVu(mode, sc.ts); vu = _chainVu(mode); }
  let nv = 0;
  if (sc.ts > vu) for (const p in sc.ps) ((sc.ps[p] && sc.ps[p].trades) || []).forEach(t => { if ((t.ts || 0) > vu) nv++; });
  const bt = nv > 0 ? (nv > 9 ? '9+' : String(nv)) : '';
  if (b.textContent !== bt) b.textContent = bt;
  b.style.display = nv > 0 && S.currentPage !== 4 ? '' : 'none';
}

function filterChain(filter, el) {
  _chainFilter = filter;
  renderChain();
}

function renderChain() {
  const cl = document.getElementById('mobileChainList');
  if(!cl) return;
  const txt = (id, v) => { const e = document.getElementById(id); if (e && e.textContent !== String(v)) e.textContent = v; };
  const scrM = (typeof _walletKey === 'function') ? _walletKey(S.tradingMode) : S.tradingMode;

  const sc = _chainScan(), _ps = sc.ps, nT = sc.n, lastP = sc.pair, lastT = sc.t, lastTs = sc.ts;
  _chainBadge(sc, scrM);

  const log = (S.chainLog || []).slice().reverse();
  const cat = { dec: [], learn: [], sys: [] }; log.forEach(tx => cat[_chainCat(tx)].push(tx));

  // Tuiles (léger : le texte n'est écrit que s'il change)
  if (lastT) { const c = lastT.type !== 'open', dir = lastT.side === 'buy' ? 'LONG' : 'SHORT', pnl = Number(lastT.pnlUsdt) || 0;
    txt('czN_trade', nT); txt('czL_trade', lastP + ' ' + dir + (c ? ' fermé ' + (pnl >= 0 ? '+' : '') + _chainMoney(pnl) : ' ouvert'));
    txt('czS_trade', 'dernier · ' + (typeof fmtDT === 'function' ? fmtDT(lastTs).slice(0, 11) : '')); }
  else { txt('czN_trade', 0); txt('czL_trade', 'aucun trade dans ce mode'); txt('czS_trade', ''); }
  ['dec', 'learn', 'sys'].forEach(f => { const x = cat[f][0]; txt('czN_' + f, cat[f].length);
    const lab = (x && x.m && x.m !== scrM && typeof _modeLab === 'function') ? _modeLab(x.m) + ' · ' : '';   // une ligne d'un autre mode dit son nom, comme dans la liste
    txt('czL_' + f, x ? lab + String(x.desc || '').replace(/<[^>]*>/g, '') : 'rien dans le journal'); txt('czS_' + f, x ? 'dernière · ' + _chainHM(x.time) : ''); });
  txt('chaintab-all', 'Tout le journal · ' + log.length);
  document.querySelectorAll('#page4 [data-f]').forEach(b => b.classList.toggle('active', b.dataset.f === _chainFilter));

  // La liste : rebâtie seulement si quelque chose a changé (avant : à chaque passage)
  // clé : ce que montre l'onglet — trades (nombre, dernier) ou journal (longueur, dernière ligne) —, le mode et le jour (« Aujourd'hui », « Hier »)
  const now = Date.now(), last = log[0];
  const key = [_chainFilter, scrM, _chainDay(now, now)].concat(_chainFilter === 'trade' ? [nT, lastTs] : [log.length, last ? (last.time + '|' + last.hash + '|' + last.desc) : '']).join('§');
  if (cl._chainK === key) return;
  cl._chainK = key;
  const T = { trade: ['Trades', 'historique réel · 60 derniers'], dec: ['Décisions', 'trades, sorties, refus, votes'], learn: ['Apprentissage', 'agents, génomes, évolution'],
    sys: ['Système', 'prix, rythme des bots, démarrage'], all: ['Tout le journal', '30 dernières lignes'] }[_chainFilter] || ['Journal', ''];
  txt('chainHeadT', T[0]); txt('chainHeadSub', T[1]);

  if (_chainFilter === 'trade') {
    const rows = [];
    for (const pair in _ps) ((_ps[pair] && _ps[pair].trades) || []).forEach(t => rows.push({ pair, t }));
    rows.sort((a, b) => (b.t.ts || 0) - (a.t.ts || 0));
    let day = '', html = '';
    rows.slice(0, 60).forEach(x => { const dk = x.t.ts ? _chainDay(x.t.ts, now) : 'Sans date'; if (dk !== day) { day = dk; html += `<div class="cz-day">${dk}</div>`; } html += _chainTradeRow(x.pair, x.t); });
    cl.innerHTML = html || '<div class="cz-empty">Aucun trade dans ce mode.</div>';
    return;
  }
  if (!log.length) { cl.innerHTML = '<div class="cz-empty">En attente des premières lignes du journal…</div>'; return; }

  // Lignes identiques (même mode, même icône, même texte) groupées : la plus récente, ×n, de la première à la dernière heure
  const src = _chainFilter === 'all' ? log : (cat[_chainFilter] || []);
  const grp = [], idx = {};
  src.forEach(tx => { const k = (tx.m || '') + '|' + tx.icon + '|' + tx.desc;
    if (idx[k] != null) { const g = grp[idx[k]]; g.n++; g.first = tx.time; } else { idx[k] = grp.length; grp.push({ tx, n: 1, first: tx.time }); } });
  const iconColor = {
    '💚':'var(--up)','🟢':'var(--up)','✅':'var(--up)','▶':'var(--up)',
    '🔴':'var(--down)','❌':'var(--down)','⏸':'var(--down)',
    '🧬':'var(--pur)','🧠':'var(--ice)',
    '💸':'var(--gold)','🗳':'var(--gold)','🪙':'var(--gold)',
    '⛓':'var(--t3)','🏛':'var(--t2)','🔑':'var(--t2)',
  };
  // [MODES SÉPARÉS · 10/10/2026] une ligne écrite par un AUTRE mode que celui de l'écran dit son nom (marque m posée par 02 _chainStamp) : AA / EV / RE, à la
  // couleur du mode. Les lignes du mode affiché et celles qui ne sont d'aucun mode restent comme avant.
  const _mCol = { sim: 'var(--ice)', paperReal: 'var(--up)', real: 'var(--down)' };
  const _mChip = tx => (tx.m && tx.m !== scrM && typeof _modeLab === 'function')
    ? `<span class="chain-mode" style="border:1px solid ${_mCol[tx.m] || 'var(--t3)'};color:${_mCol[tx.m] || 'var(--t3)'};">${_modeLab(tx.m)}</span>` : '';
  cl.innerHTML = grp.slice(0, 30).map(({ tx, n, first }) => {
    const tm = n > 1 ? `<span class="cz-x">×${n}</span>${_chainHM(first)} → ${_chainHM(tx.time)}` : _chainHM(tx.time);
    return `<div class="chain-row"><div class="chain-icon-wrap" style="color:${iconColor[tx.icon] || 'var(--t2)'}">${tx.icon}</div>`
      + `<div class="chain-content"><div class="chain-desc">${_mChip(tx)}${tx.desc}</div></div><div class="cz-r"><span class="chain-time">${tm}</span></div></div>`;
  }).join('') || '<div class="cz-empty">Rien dans cette catégorie.</div>';
}

// ============================================================
// PAGE 5 — FISCAL
// ============================================================
// [GO CSS · écran 6 · 14/11/2026] l'écran Fiscal par priorité (Rams 14/11 15:56 « Go css », maquette montrée, « Ok » 16:15) — affichage seul :
// quatre tuiles = les onglets (⚖ Impôt · 💸 Frais · 💱 Paires · 🧰 Outils = Export + Réglages réunis) ; chaque onglet n'est rebâti que si ce qu'il
// montre change (avant : Frais, Paires, Export et ⚙ rebâtis à chaque passage du battement, toutes les 3 s — un champ de ⚙ perdait le doigt en pleine
// saisie) ; dollars au format français (16b _fiscUsd). L'onglet ⚖ Impôt est rendu par 16b _fiscRenderPage. Rien ici ne calcule l'impôt ni les frais.
const _FZ_PANELS = { tax: ['tax'], global: ['global'], pairs: ['pairs'], outils: ['export', 'settings'] };
const _fzKeys = {};
function _fzTab(tab) { if (tab === 'export' || tab === 'settings') return 'outils'; return _FZ_PANELS[tab] ? tab : null; }
function _fzSame(slot, key, el) { if (_fzKeys[slot] === key && el && el.childElementCount) return true; _fzKeys[slot] = key; return false; }
function _fzNum(v) { v = Number(v); return isFinite(v) ? v : 0; }
function _fzUsd(v, sign) { return (typeof _fiscUsd === 'function') ? _fiscUsd(v, sign) : ((_fzNum(v) < 0 ? '−' : (sign && _fzNum(v) > 0 ? '+' : '')) + '$' + Math.abs(_fzNum(v)).toFixed(2)); }
function _fzPct(v, d) { d = (d == null) ? 2 : d; return _fzNum(v).toFixed(d).replace('.', ',') + ' %'; }
function _fzEsc(s) { return (typeof _fiscEsc === 'function') ? _fiscEsc(s) : String(s == null ? '' : s).replace(/[&<>]/g, ''); }   // 16b _fiscEsc échappe tout ; repli sans guillemets dans la classe (les extracteurs de fonctions des bancs lisent ' et " comme des chaînes)
function _fzSec(t, s) { return '<div class="fz-sec"><span>' + t + '</span>' + (s ? '<em>' + s + '</em>' : '') + '</div>'; }
function _fzRow(lbl, val, col) { return '<div class="fx-row"><span>' + lbl + '</span><span style="color:' + (col || 'var(--t1)') + ';">' + val + '</span></div>'; }
function _fzModeLbl() { const m = (typeof _walletKey === 'function') ? _walletKey() : 'sim'; return (typeof _FISC_MODE_LBL !== 'undefined' && _FISC_MODE_LBL[m]) || m; }
function _fzDay(t) { return (typeof _fiscDay === 'function') ? _fiscDay(t) : 'Sans date'; }
function _fzHm(t) { const d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
// Les bots ouvrent-ils dans ce mode ? Mêmes règles que 09c : pas en MANU (l. 70) ; en EV, tant que la voix tendance tient l'argent (15b _tlrTientEV, l. 75), non.
function _fzBotsOuvrent() {
  if (S.botAutoMode === false) return false;   // 09c:70 : le bot n'agit qu'en AUTO
  return !(S.tradingMode === 'paperReal' && typeof window !== 'undefined' && typeof window._tlrTientEV === 'function' && window._tlrTientEV());
}
// [GO NETTOYAGE · 19/10/2026] (ETAT n° 59) mise DE BASE que le bot prendrait sur cette paire (10f, « engagement quasi-total ») : la part du capital libre
// (trading moins 2 % moins les mises engagées) qui revient à cette paire (÷ les paires vivantes sans position, 2 au moins), avec la mise de la paire comme
// plancher, bornée comme 09c la borne (95 % du trading) ; ensuite la conviction, la qualité de la paire et les gardes (09c) la modulent. Calcul inchangé
// (avant : dans renderFiscalPairs, carte par carte).
function _fzNextStake(pair) {
  const acc = Math.max(0, Number(S.tradingAccount) || 0), capT = Math.max(0, acc - Math.max(1, acc * 0.02));
  const eng = (S.openPositions || []).reduce((a, p) => a + (Number(p.stakeUsdt) || 0), 0), held = {};
  (S.openPositions || []).forEach(p => { if (p && p.pair) held[p.pair] = 1; });
  const live = (typeof _livePairs === 'function') ? _livePairs() : [];   // les paires VIVANTES, comme 10f
  const slots = live.filter(k => !held[k]).length, floor = Math.max(0, Number(S.pairStates[pair]?.stake) || 0);
  let st = Math.max(floor, Math.max(0, capT - eng) / Math.max(2, slots));
  if (st > acc * 0.95) {   // la borne de 09c : le disponible moins 2 %, partagé entre les emplacements libres
    const slotsMax = (S.tradingMode === 'real') ? 1 : ((S.paperRealConfig && S.paperRealConfig.maxConcurrentPos) || 1);
    const free = Math.max(1, slotsMax - ((S.openPositions && S.openPositions.length) || 0));
    st = Math.max((typeof _stakeFloor === 'function') ? _stakeFloor() : 0, ((typeof _stakeRound === 'function') ? _stakeRound : (x => x))((acc - Math.max(1, acc * 0.02)) / free));
  }
  return st;
}

// Les lignes de 💱 Paires : chaque paire de PAIRS et chaque paire qui a des frais dans byPair (une paire retirée de PAIRS par 11 garde les siens : GBP/USDT en AA),
// coût = byPair.gross (exchange + glissement à la fermeture, funding pendant la tenue, 02 recordFees / applyFundingFees), net = brut − coût.
// « Hors paire » = ce que le mode compte sans paire (intérêts du levier, 02 applyLeverageBorrowFees) ; l'impôt, dû par régime et par année (registre 16),
// a sa ligne. Le total donne ainsi les chiffres de 💸 Frais : frais = totalGross, net = brut − totalGross − impôt.
function _fzPairRows() {
  const f = S.fees || {}, bp = f.byPair || {};
  const keys = Object.keys(PAIRS).concat(Object.keys(bp).filter(p => !PAIRS[p] && (_fzNum(bp[p].trades) > 0 || Math.abs(_fzNum(bp[p].gross)) > 0.005)));
  const rows = keys.map(p => { const b = bp[p] || {}, ex = _fzNum(b.tradingFees), sl = _fzNum(b.slippage), gr = _fzNum(b.gross), br = _fzNum(b.pnlGross);
    return { p, c: (PAIRS[p] || {}).color, out: !PAIRS[p], t: _fzNum(b.trades), ex, sl, fu: gr - ex - sl, co: gr, br, ne: br - gr }; })
    .sort((a, b) => b.co - a.co || b.t - a.t);
  const sum = k => rows.reduce((a, r) => a + r[k], 0);
  const hors = { co: _fzNum(f.totalGross) - sum('co'), br: _fzNum(f.totalPnlGross) - sum('br') };
  return { rows, hors, tax: calcTaxProvision() };
}

// Les quatre tuiles : chacune dit son chiffre ; écrites seulement si le texte change
function _fzSet(t, v, s) { const a = document.getElementById('fzV_' + t), b = document.getElementById('fzS_' + t); if (a && a.innerHTML !== v) a.innerHTML = v; if (b && b.innerHTML !== s) b.innerHTML = s; }
function _fzBref() {
  const f = S.fees || {}, y = (typeof _fiscYearOf === 'function') ? _fiscYearOf(Date.now()) : new Date().getFullYear();
  const tax = calcTaxProvision(), net = _fzNum(f.totalPnlGross) - _fzNum(f.totalGross) - tax;
  const region = S.taxConfig && S.taxConfig.region;
  if (region && region !== 'BE') _fzSet('tax', '—', 'région ' + _fzEsc(region) + ' : aucun impôt provisionné');   // le registre n'applique que la loi belge (16b)
  else if (typeof _fiscRegimeNow === 'function') {
    const r = _fiscRegimeNow(), m = r.mode, L = (typeof _fiscLedger === 'function') ? _fiscLedger(m, false) : null, yr = (L && L.years[y]) || null;
    _fzSet('tax', (typeof _fiscEur === 'function') ? _fiscEur(r.d.due) : '', '<b style="color:' + r.col + ';">' + r.pct + ' · ' + (r.auto ? 'spéculatif' : 'normal') + '</b> · dépôt ' + _fzUsd(yr ? yr.provUsd : 0));
  }
  _fzSet('global', _fzUsd(-_fzNum(f.totalGross)), _fzNum(f.tradeCount) + ' trades · net <b style="color:' + (net < 0 ? 'var(--down)' : 'var(--up)') + ';">' + _fzUsd(net, true) + '</b>');
  const pr = _fzPairRows().rows.filter(r => r.t > 0), worst = pr[0];   // les lignes du tableau, triées par coût
  _fzSet('pairs', String(pr.length), worst ? 'la plus coûteuse : ' + _fzEsc(worst.p.replace('/USDT', '')) + ' ' + _fzUsd(-worst.co) : 'aucun trade fermé');
  const reg = ((S.taxConfig && S.taxConfig.regions) || {})[region] || {}, com = (S.fiscalCfg && _fzNum(S.fiscalCfg.commune)) || 0;
  _fzSet('outils', '5 exports', 'réglages · ' + _fzEsc(reg.label || region || '') + ' · commune ' + String(com).replace('.', ',') + ' %');
}

function switchFiscalTab(tab, el) {
  tab = _fzTab(tab) || 'tax';
  ['global', 'pairs', 'tax', 'export', 'settings'].forEach(t => {
    const p = document.getElementById('fpanel-' + t);
    if (p) p.style.display = _FZ_PANELS[tab].indexOf(t) >= 0 ? '' : 'none';
  });
  document.querySelectorAll('#fiscBref .fz-tile').forEach(b => b.classList.toggle('active', b.id === 'ftab-' + tab));
  renderFiscal(tab);
}

function renderFiscal(tab) {
  // [GO FISCAL · 07/10/2026] sans onglet demandé : celui qui est affiché (⚖ Impôt par défaut)
  tab = _fzTab(tab) || _fzTab(((document.querySelector('#fiscBref .fz-tile.active') || {}).id || 'ftab-tax').replace('ftab-', '')) || 'tax';
  try { _fzBref(); } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
  if(tab==='global')        renderFiscalGlobal();
  else if(tab==='pairs')    renderFiscalPairs();
  else if(tab==='tax')      renderFiscalTax();
  else { renderFiscalExport(); renderFiscalSettings(); }
}

// ── Unrealized P&L banner for open manual positions ────────
function renderOpenPnlBanner() {
  const el = document.getElementById('openPnlBanner');
  if(!el) return;

  const manualPos = S.openPositions.filter(p => p.auto !== true);
  if(manualPos.length === 0) { el.innerHTML = ''; return; }

  // Compute total unrealized
  let totalUnreal = 0, totalInvested = 0;
  const rows = manualPos.map(pos => {
    const ps  = S.pairStates[pos.pair];
    const cfg = PAIRS[pos.pair];
    if(!ps) return null;
    // [CARTES · 05/10/2026] « ↑ DOT/USDT @$1 » : le prix courant TRONQUÉ à l'entier, lu comme la mise (« pas le prix misé ») — la ligne dit
    // maintenant ce que c'est : ta position (👤 MAN), sa mise, son entrée, son P&L en direct (même calcul que les cartes, 09f1 _abPosPnl)
    const _pl = (typeof _abPosPnl === 'function') ? _abPosPnl(pos, ps.price)
      : { pct: (pos.side === 'long' ? (ps.price - pos.entryPrice) : (pos.entryPrice - ps.price)) / pos.entryPrice * 100, usd: 0 };
    const pnlPct = _pl.pct;
    const pnlUsd = (typeof _abPosPnl === 'function') ? _pl.usd : (pos.stakeUsdt * (pnlPct / 100));
    totalUnreal   += pnlUsd;
    totalInvested += pos.stakeUsdt;
    const col   = pnlUsd >= 0 ? 'var(--up)' : 'var(--down)';
    const arrow = pos.side === 'long' ? '↑' : '↓';
    const fpx = (x) => (typeof _abFmtPx === 'function') ? _abFmtPx(pos.pair, x) : String(x);
    const _u = v => (v >= 0 ? '+' : '−') + fmt$2(Math.abs(v)), _q = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') + ' %';   // [GO CSS FINITIONS · 14/11/2026] avant « $-6.75 »
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;
                 border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:6px;">
        ${pos._voix === 'tendance' ? '<span class="op-who op-voix">📈 Tendance</span>' : '<span class="op-who">👤 MAN</span>'}
        <span style="font-size:10px;color:${pos.side==='long'?'var(--up)':'var(--down)'};">${arrow}</span>
        <span style="font-size:10px;font-weight:600;color:var(--t1);">${pos.pair}</span>
        <span style="font-size:8px;color:var(--t3);">mise ${fmt$2(Number(pos.stakeUsdt) || 0)} · entrée ${fpx(pos.entryPrice)}</span>
      </div>
      <div style="text-align:right;">
        <span style="font-size:11px;font-weight:700;color:${col};">${_u(pnlUsd)}</span>
        <span style="font-size:8px;color:var(--t3);margin-left:4px;">(${_q(pnlPct)})</span>
      </div>
    </div>`;
  }).filter(Boolean).join('');

  const totCol   = totalUnreal >= 0 ? 'var(--up)' : 'var(--down)';
  const totPct   = totalInvested > 0 ? (totalUnreal/totalInvested*100) : 0;
  const _u = v => (v >= 0 ? '+' : '−') + fmt$2(Math.abs(v)), _q = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') + ' %';
  const nV = manualPos.filter(p => p._voix === 'tendance').length, nM = manualPos.length - nV;   // [GO CSS FINITIONS · 14/11/2026] (n° 88) qui tient quoi

  el.innerHTML = `
  <div style="background:var(--s1);border:1px solid ${totalUnreal>=0?'rgba(0,232,122,.2)':'rgba(255,61,107,.2)'};
              border-radius:12px;padding:10px 13px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
      <span style="font-size:9px;font-weight:700;color:var(--t2);">📂 Positions ouvertes (${manualPos.length})${nV ? ` · ${nV} de la voix tendance` : ''}${nV && nM ? ` · ${nM} à toi` : ''}</span>
      <div style="text-align:right;">
        <span style="font-size:13px;font-weight:800;color:${totCol};">${_u(totalUnreal)}</span>
        <span style="font-size:8px;color:var(--t3);margin-left:4px;">${_q(totPct)}</span>
      </div>
    </div>
    <div style="font-size:9px;">${rows}</div>
  </div>`;
}

function renderFiscalMini() {
  const el = document.getElementById('fiscalMiniBar');
  if(!el) return;
  const f   = S.fees;
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const tax = calcTaxProvision();
  const res = f.feeReserveAccount;
  const eff = f.totalPnlGross > 0
    ? ((f.totalGross + tax) / f.totalPnlGross * 100).toFixed(1) : '0.0';
  const taxNote = reg && reg.rate === 0
    ? '<span style="color:var(--up);font-size:9px;">✓ Exonéré</span>'
    : `<span class="fiscal-mini-val" style="color:var(--gold);font-size:10px;">−$${tax.toFixed(2)} impôt</span>`;

  el.innerHTML = `<div class="fiscal-mini-bar" onclick="goPage(5,null,document.getElementById('nav5'))">
    <div class="fiscal-mini-icon">🏦</div>
    <div class="fiscal-mini-body">
      <div class="fiscal-mini-title">Réserve Fiscale · ${reg ? reg.label : S.taxConfig.region}</div>
      <div class="fiscal-mini-vals">
        <span class="fiscal-mini-val" style="color:var(--gold);">$${res.toFixed(2)}</span>
        <span class="fiscal-mini-sep">·</span>
        <span class="fiscal-mini-val" style="color:var(--down);font-size:10px;">−$${f.totalGross.toFixed(2)} frais</span>
        ${S.leverageTotalFees > 0 ? `<span class="fiscal-mini-sep">·</span><span class="fiscal-mini-val" style="color:var(--down);font-size:10px;">−$${S.leverageTotalFees.toFixed(3)} lev</span>` : ''}
        <span class="fiscal-mini-sep">·</span>
        ${taxNote}
        <span class="fiscal-mini-sep">·</span>
        <span class="fiscal-mini-val" style="color:var(--t3);font-size:9px;">${eff}% eff.</span>
      </div>
    </div>
    <div class="fiscal-mini-arrow">›</div>
  </div>`;
}

// [GO CSS · écran 6 · 14/11/2026] 💸 Frais : quatre chiffres (brut, frais, impôt, net), alertes, détail des frais, comptes liés, derniers frais groupés par jour.
// Avant : « P&L Brut $21.02 » sans le signe moins (valeur absolue) ; « Compte Réserve Fiscal $58.83 » = la réserve frais (cumul des frais payés, ETAT n° 77)
// plus la réserve fiscale — ce n'était pas de l'impôt, les deux sont séparés ; sous-lignes fausses (« Maker si conviction ≥80% » : l'entrée est toujours
// taker, la sortie maker ou taker selon la sortie, 02:4615-4619 ; « 0.01% par cycle » : funding par 8 h au taux réglé, 02:599, 02:4744) ; badge « SESSION »
// (c'est le cumul du mode). Le résultat net reste brut − frais − impôt du registre, comme avant.
function renderFiscalGlobal() {
  const sumEl = document.getElementById('fiscalSummary');
  if(!sumEl) return;
  const f = S.fees, fc = S.feeConfig || {}, tax = calcTaxProvision();
  const fiscRes = _fzNum(S.fiscalReserveAccount), log = f.feeLog || [], flog = S.fiscalReserveLog || [];
  const covered = (S.openPositions || []).filter(p => p._reservedAmount > 0).length;
  const key = [_fzModeLbl(), f.tradeCount, _fzNum(f.totalGross).toFixed(4), _fzNum(f.totalTradingFees).toFixed(4), _fzNum(f.totalSlippage).toFixed(4), _fzNum(f.totalFunding).toFixed(4),
    _fzNum(f.totalPnlGross).toFixed(4), _fzNum(f.feeReserveAccount).toFixed(4), tax.toFixed(4), fiscRes.toFixed(4), _fzNum(S.antiNegReserve).toFixed(2), covered,
    _fzNum(S.ownFundsInjected).toFixed(2), _fzNum(S.leverageTotalFees).toFixed(4), log.length, log[0] && (log[0].ts || log[0].time), flog.length, JSON.stringify(fc), S.taxConfig && S.taxConfig.region].join('|');
  if (_fzSame('global', key, sumEl)) return;
  const brut = _fzNum(f.totalPnlGross), frais = _fzNum(f.totalGross), net = brut - frais - tax;
  const cU = v => v < 0 ? 'var(--down)' : 'var(--up)';
  sumEl.innerHTML = _fzSec('💸 Frais et résultat', 'cumul ' + _fzModeLbl() + ' · ' + _fzNum(f.tradeCount) + ' trades fermés')
    + '<div class="fz-kpi">'
    + '<div class="fz-k"><span class="fz-l">Résultat brut</span><b style="color:' + cU(brut) + ';">' + _fzUsd(brut, true) + '</b><span class="fz-s">avant frais</span></div>'
    + '<div class="fz-k"><span class="fz-l">Frais</span><b style="color:var(--down);">' + _fzUsd(-frais) + '</b><span class="fz-s">exchange · glissement · funding</span></div>'
    + '<div class="fz-k"><span class="fz-l">Impôt provisionné</span><b style="color:var(--gold);">' + _fzUsd(-tax) + '</b><span class="fz-s">registre ⚖ Impôt</span></div>'
    + '<div class="fz-k"><span class="fz-l">Résultat net</span><b style="color:' + cU(net) + ';">' + _fzUsd(net, true) + '</b><span class="fz-s">après frais et impôt</span></div></div>';

  // ── alertes (mêmes règles qu'avant) ──
  const alertEl = document.getElementById('fiscalAlertZone');
  if(alertEl) {
    const alerts = [];
    if(S.taxConfig.region === 'BE') {
      if(brut > 37500 && brut <= 40000) alerts.push({ icon:'⚠️', col:'var(--gold)', msg:'Proche du seuil déclaratif (37 500 €) — résultat ' + _fzUsd(brut) });
      else if(brut > 40000) alerts.push({ icon:'🚨', col:'var(--down)', msg:'Seuil 40 000 € dépassé — vérifier avec un comptable' });
    }
    if(S.taxConfig.region === 'FR' && brut > 9000 && brut <= 10000) alerts.push({ icon:'⚠️', col:'var(--gold)', msg:'Proche du seuil abattement (10 000 €)' });
    // v7.1 P2: la couverture impôts utilise fiscalReserveAccount (dédié au fisc)
    if(fiscRes < tax * 1.1 && tax > 5) alerts.push({ icon:'💰', col:'#ff9500', msg:'Réserve fiscale (' + _fzUsd(fiscRes) + ') insuffisante pour l\'impôt (' + _fzUsd(tax) + ')' });
    if(brut > 0 && frais / brut > 0.25) alerts.push({ icon:'📊', col:'var(--pur)', msg:'Frais élevés : ' + _fzPct(frais / brut * 100, 1) + ' du résultat brut' });
    if(net < -200) alerts.push({ icon:'📉', col:'var(--down)', msg:'Résultat net négatif : ' + _fzUsd(net) });
    alertEl.innerHTML = alerts.length
      ? alerts.map(a => '<div class="fz-alert" style="--c:' + a.col + ';"><span>' + a.icon + '</span><span>' + _fzEsc(a.msg) + '</span></div>').join('')
      : '<div class="fz-alert" style="--c:var(--up);"><span>✅</span><span>Aucune alerte fiscale</span></div>';
  }

  // ── détail des frais (barres) + comptes liés ──
  const bdEl = document.getElementById('fiscalBreakdown');
  if(bdEl) {
    const total = Math.max(0.01, frais + tax);
    const items = [
      ['Frais d\'exchange', 'maker ' + _fzPct(fc.makerRate * 100) + ' / taker ' + _fzPct(fc.takerRate * 100), f.totalTradingFees, 'var(--down)', 'entrée taker · sortie maker ou taker selon la sortie'],
      ['Glissement', _fzPct(fc.slippage * 100, 3) + ' par côté', f.totalSlippage, 'var(--pur)', 'écart de prix à l\'exécution, à l\'entrée et à la sortie'],
      ['Financement', _fzPct(fc.fundingRate * 100, 3) + ' par 8 h', f.totalFunding, 'var(--ice)', 'sur la mise, pendant la tenue'],
      ['Provision fiscale', 'registre', tax, 'var(--gold)', 'impôt dû de l\'année (⚖ Impôt)'],
    ];
    bdEl.innerHTML = _fzSec('📊 Détail des frais', 'part de chaque coût') + '<div class="fx-card">'
      + items.map(it => { const pct = Math.min(100, _fzNum(it[2]) / total * 100);
        return '<div class="fz-bar"><div class="fz-bar1"><span>' + it[0] + ' <span class="fx-dim">· ' + it[1] + '</span></span><b style="color:' + it[3] + ';">' + _fzUsd(-_fzNum(it[2])) + '</b></div>'
          + '<div class="fz-bar2"><i style="width:' + pct.toFixed(1) + '%;background:' + it[3] + ';"></i></div>'
          + '<div class="fz-bar3"><span>' + it[4] + '</span><span>' + _fzPct(pct, 1) + '</span></div></div>'; }).join('') + '</div>'
      + _fzSec('🏦 Comptes liés', 'ce que la fiscalité met de côté')
      + '<div class="fx-card"><div class="fz-acc">'
      + _fzRow('Réserve frais <span class="fx-dim">· cumul des frais payés</span>', _fzUsd(f.feeReserveAccount))
      + _fzRow('Réserve fiscale dédiée', _fzUsd(fiscRes), 'var(--gold)')
      + _fzRow('Réserve anti-négatif <span class="fx-dim">· ' + covered + ' trade' + (covered > 1 ? 's' : '') + ' couvert' + (covered > 1 ? 's' : '') + '</span>', _fzUsd(S.antiNegReserve), 'var(--ice)')
      + _fzRow('Frais du levier', _fzUsd(S.leverageTotalFees), 'var(--gold)')
      + _fzRow('Fonds propres injectés <span class="fx-dim">· exonérés</span>', _fzUsd(S.ownFundsInjected), 'var(--up)')
      + _fzRow('Dépôts fiscaux <span class="fx-dim">· détail : ⚖ Impôt › Dépôt fiscal</span>', String(flog.length), 'var(--t2)')
      + '</div></div>';
  }

  // ── derniers frais : une entrée par trade, groupées par jour ──
  const flEl = document.getElementById('feeLog');
  if(flEl) {
    if(!log.length) { flEl.innerHTML = _fzSec('🧾 Derniers frais', '') + '<div class="fz-list"><div class="fz-tr fz-tr2">En attente des premiers trades…</div></div>'; return; }
    const out = [_fzSec('🧾 Derniers frais', Math.min(15, log.length) + ' derniers trades fermés'), '<div class="fz-list">']; let last = '';
    log.slice(0, 15).forEach(e => {
      const dy = e.ts ? _fzDay(e.ts) : 'Sans date';
      if (dy !== last) { out.push('<div class="fz-day">' + dy + '</div>'); last = dy; }
      const tx = _fzNum(e.taxAmount), pnlN = _fzNum(e.pnlNet);   // [GO FISCAL · 07/10/2026] impôt signé : + versé au dépôt, − rendu (perte du même régime)
      out.push('<div class="fz-fl"><span class="fz-t">' + (e.ts ? _fzHm(e.ts) : _fzEsc(String(e.time || '').slice(0, 5))) + '</span>'
        + '<span class="fz-fl1">' + (_fzNum(e.pnlGross) >= 0 ? '💚' : '🔴') + ' <b>' + _fzEsc(e.pair) + '</b><span class="fx-dim">mise ' + _fzUsd(e.notional) + '</span></span>'
        + '<span class="fz-fr" style="color:var(--down);">' + _fzUsd(-_fzNum(e.totalFee)) + '<i style="color:' + cU(pnlN) + ';">net ' + _fzUsd(pnlN, true) + '</i></span>'
        + '<span class="fz-fl2">exchange ' + _fzUsd(-_fzNum(e.tradingFee)) + ' · glissement ' + _fzUsd(-_fzNum(e.slipFee))
        + ' · impôt ' + (tx <= -0.005 ? _fzUsd(-tx, true) : _fzUsd(-tx)) + (e.regime ? ' (' + (e.regime === 'normal' ? '10 %' : '33 %') + ')' : '') + '</span></div>');
    });
    out.push('</div>');
    flEl.innerHTML = out.join('');
  }
}

// [GO CSS · écran 6 · 14/11/2026] 💱 Paires : un tableau, de la paire la plus coûteuse à la moins coûteuse (lignes : _fzPairRows), puis « Hors paire » s'il y en a,
// l'impôt de l'année et le total — mêmes chiffres que 💸 Frais. Avant : 12 cartes de 270 px, « P&L Net » d'une paire sans son funding (byPair.pnlNet),
// un « Prov. impôt » par paire (mouvements au dépôt, toutes années) qui ne s'additionnait pas à l'impôt de 💸 (dû de l'année), et un 2e P&L net sans le funding (Export).
// Retirés (dit à Rams, « Ok ») : « 💡 Optimisation » (« réduire la fréquence des trades » contredit sa règle, « signal LMSR > 250 % » impossible) ;
// « Prochain trade estimé » là où les bots n'ouvrent pas (MANU, EV tenue par la voix : 09c:70, 75) — ailleurs, une ligne sous le tableau (_fzNextStake).
function renderFiscalPairs() {
  const el = document.getElementById('feesByPair');
  if(!el) return;
  const f = S.fees, fc = S.feeConfig || {}, bots = _fzBotsOuvrent(), y = (typeof _fiscYearOf === 'function') ? _fiscYearOf(Date.now()) : new Date().getFullYear();
  const next = bots ? Object.keys(PAIRS).map(p => _fzNextStake(p)) : [];
  const R = _fzPairRows();
  const key = [_fzModeLbl(), f.tradeCount, _fzNum(f.totalGross).toFixed(4), _fzNum(f.totalPnlGross).toFixed(4), R.tax.toFixed(4), JSON.stringify(R.rows.map(r => [r.p, r.t, r.co.toFixed(4), r.ex.toFixed(4), r.br.toFixed(4)])),
    bots, next.map(x => x.toFixed(2)).join(), JSON.stringify(fc)].join('|');
  if (_fzSame('pairs', key, el)) return;
  const cU = v => v < 0 ? 'var(--down)' : 'var(--up)', blank = '<span></span>';
  const line = (r, cls) => '<div class="fz-pt' + (cls || '') + '"><span' + (r.c ? ' style="color:' + r.c + ';"' : '') + '>' + _fzEsc(r.p.replace('/USDT', '')) + (r.out ? ' <i class="fx-dim">· retirée</i>' : '') + '</span>'
    + '<span>' + (r.t == null ? '' : r.t) + '</span>'
    + (r.ex == null ? blank + blank + blank : '<span style="color:var(--down);">' + _fzUsd(-r.ex) + '</span><span style="color:var(--down);">' + _fzUsd(-r.sl) + '</span><span style="color:var(--ice);">' + _fzUsd(-r.fu) + '</span>')
    + '<span style="color:' + (r.tax ? 'var(--gold)' : 'var(--down)') + ';"><b>' + _fzUsd(-r.co) + '</b></span>'
    + (r.br == null ? blank : '<span style="color:' + cU(r.br) + ';">' + _fzUsd(r.br, true) + '</span>')
    + '<span style="color:' + cU(r.ne) + ';"><b>' + _fzUsd(r.ne, true) + '</b></span></div>';
  const T = { p: 'Total', t: 0, ex: 0, sl: 0, fu: 0, co: 0, br: 0, ne: 0 };
  R.rows.forEach(r => ['t', 'ex', 'sl', 'fu', 'co', 'br', 'ne'].forEach(k => { T[k] += r[k]; }));
  let extra = '';
  if (Math.abs(R.hors.co) > 0.005 || Math.abs(R.hors.br) > 0.005) {
    extra += line({ p: 'Hors paire', co: R.hors.co, br: Math.abs(R.hors.br) > 0.005 ? R.hors.br : null, ne: R.hors.br - R.hors.co }, ' fz-xr');
    T.co += R.hors.co; T.br += R.hors.br; T.ne += R.hors.br - R.hors.co; T.ex = T.sl = T.fu = null;
  }
  extra += line({ p: 'Impôt ' + y, co: R.tax, ne: -R.tax, tax: true }, ' fz-xr');
  T.co += R.tax; T.ne -= R.tax;
  let nextHtml = '';
  if (bots && next.length) {
    const lo = Math.min.apply(null, next), hi = Math.max.apply(null, next), ar = s => s * ((fc.takerRate || 0) * 2 + (fc.slippage || 0) * 2), one = Math.abs(hi - lo) < 0.005;
    nextHtml = '<div class="fx-card fz-next"><span class="fz-l">Prochain trade d\'un bot</span><span>mise de base ' + (one ? _fzUsd(lo) : 'de ' + _fzUsd(lo) + ' à ' + _fzUsd(hi) + ' selon la paire')
      + ' · frais aller-retour ' + _fzUsd(-ar(lo)) + (one ? '' : ' à ' + _fzUsd(-ar(hi))) + ' · impôt : sur le gain seulement</span></div>';
  }
  el.innerHTML = _fzSec('💱 Frais par paire', 'cumul ' + _fzModeLbl() + ' · de la plus coûteuse à la moins coûteuse')
    + '<div class="fz-list"><div class="fz-pt fz-ph"><span>Paire</span><span>Trades</span><span>Exchange</span><span>Glissem.</span><span>Funding</span><span>Coût</span><span>Brut</span><span>Net</span></div>'
    + R.rows.map(r => line(r, r.t || Math.abs(r.co) > 0.005 ? '' : ' fz-z')).join('') + extra + line(T, ' fz-ptot') + '</div>'
    + '<div class="fz-note">Coût d\'une paire = exchange + glissement + funding (pris pendant la tenue) ; net = brut − coût. « Hors paire » : ce que le mode compte sans paire (intérêts du levier). '
    + 'L\'impôt se calcule par régime et par année (⚖ Impôt). Le total donne les chiffres de 💸 Frais.</div>'
    + nextHtml;
}

// [GO FISCAL · 07/10/2026] l'onglet ⚖ Impôt = le registre légal belge du mode affiché (16 _fiscRenderPage) : dépôt, dû par
// régime, exonération, bot fiscal, par crypto, historique de chaque trade, années, réglages, la loi et ses sources.
// Avant : 10 % ou 33 % (régime deviné) × (P&L cumulé − frais), et des conseils écrits à la main.
function renderFiscalTax() {
  const el = document.getElementById('taxPanel');
  if(!el) return;
  if (typeof _fiscRenderPage === 'function') { try { _fiscRenderPage(el); } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} } }
}

// [GO CSS · écran 6 · 14/11/2026] 🧰 Outils = 📥 Export puis ⚙ Réglages, dans le même onglet. Les cinq exports ensemble (le registre fiscal, avant au bas de
// l'onglet Impôt, les rejoint) ; « Données à exporter » retiré (les chiffres de 💸 Frais, avec un 2e « P&L net » : −79,85 $ contre −80,20 $, sans le funding).
// ETAT n° 68 inchangé : les exports de 09h passent encore par un lien blob dans l'app Android.
function renderFiscalExport() {
  const el = document.getElementById('exportPanel');
  if(!el) return;
  const f = S.fees, m = (typeof _walletKey === 'function') ? _walletKey() : 'sim';
  const L = (typeof _fiscLedger === 'function') ? _fiscLedger(m, false) : null, nh = L ? L.hist.length : 0, nl = (f.feeLog || []).length;
  const key = [m, f.tradeCount, nl, nh].join('|');
  if (_fzSame('export', key, el)) return;
  const b = (fn, t, s, c) => '<button class="fz-eb" style="--c:' + c + ';" onclick="' + fn + '"><b>' + t + '</b><span>' + s + '</span></button>';
  el.innerHTML = _fzSec('📥 Exporter', '💾 stockage local · ' + _fzNum(f.tradeCount) + ' trades · ' + nl + ' frais')
    + '<div class="fz-exp">'
    + (nh ? b('_fiscExportCsv()', '🧾 Registre fiscal ' + _fzModeLbl(), 'CSV · ' + nh + ' trades du registre', 'var(--gold)') : '')
    + b('exportTradesCSV()', '📥 Trades complets', 'CSV · ' + _fzNum(f.tradeCount) + ' trades', 'var(--up)')
    + b('exportFeesCSV()', '📥 Journal des frais', 'CSV · ' + nl + ' entrées', 'var(--down)')
    + b('exportSummaryCSV()', '📥 Résumé fiscal', 'CSV · par paire + total', 'var(--gold)')
    + b('exportFullJSON()', '📦 Backup complet', 'JSON · toutes les données', 'var(--pur)')
    + '</div><div class="fz-note">Les CSV s\'ouvrent dans Excel, Google Sheets ou un logiciel comptable.</div>';
}

// ⚙ Réglages : les réglages fiscaux (additionnels communaux, plus-values hors AURA — avant dans l'onglet Impôt, mêmes champs, mêmes fonctions de 16b),
// les frais de trading, la région (la choisie en grand, les autres en grille). Jamais rebâti pendant une saisie, ni si rien n'a changé
// (avant : rebâti toutes les 3 s par le battement de 08, le champ perdait le doigt).
function renderFiscalSettings() {
  const el = document.getElementById('taxSettings');
  if(!el) return;
  try { if (el.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName)) return; } catch(e) {}
  const regions = S.taxConfig.regions, cur = S.taxConfig.region, fc = S.feeConfig;
  const cfg = (typeof _fiscCfg === 'function') ? _fiscCfg() : { commune: 0, ext: {} }, y = (typeof _fiscYearOf === 'function') ? _fiscYearOf(Date.now()) : new Date().getFullYear();
  const key = [JSON.stringify(fc), JSON.stringify(cfg), cur, y].join('|');
  if (_fzSame('settings', key, el)) return;
  const inp = (k, lab, hint) => '<div><label class="fz-lab" for="fee_' + k + '">' + lab + ' <span class="fx-dim">· ' + hint + '</span></label>'
    + '<input class="fz-in" type="number" id="fee_' + k + '" step="0.001" min="0" max="5" value="' + (fc[k] * 100).toFixed(3) + '" oninput="saveFeeSettings()"></div>';
  const rate = r => r.rate === 0 ? '0 %' : (r.rate * 100 * r.inclusion).toFixed(1).replace('.', ',') + ' %';
  const R = regions[cur] || {}, lb = String(R.label || cur || '');
  el.innerHTML = _fzSec('⚙ Réglages fiscaux', 'registre ⚖ Impôt')
    + '<div class="fx-card"><div class="fz-f2">'
    + '<div><label class="fz-lab" for="fxCommune">Additionnels communaux <span class="fx-dim">· % de l\'impôt à 33 %, taux de ta commune</span></label>'
    + '<input class="fz-in" id="fxCommune" type="number" min="0" max="15" step="0.1" value="' + _fzNum(cfg.commune) + '" onchange="_fiscSetCommune(this.value)"></div>'
    + '<div><label class="fz-lab" for="fxExt">Plus-values ' + y + ' hors AURA, régime normal <span class="fx-dim">· €, perte en négatif ; RE seulement</span></label>'
    + '<input class="fz-in" id="fxExt" type="number" step="1" value="' + _fzNum(cfg.ext && cfg.ext[y]) + '" onchange="_fiscSetExt(this.value)"></div>'
    + '</div></div>'
    + _fzSec('💸 Frais de trading', 'appliqués à chaque trade')
    + '<div class="fx-card"><div class="fz-f2">' + inp('makerRate', 'Maker %', 'ordre limite') + inp('takerRate', 'Taker %', 'ordre au marché')
    + inp('slippage', 'Glissement %', 'par côté') + inp('fundingRate', 'Funding %', 'par 8 h') + '</div>'
    + '<div class="fz-ar">Frais aller-retour estimés : <b class="fee-total-sum" style="color:var(--down);">' + _fzPct((fc.makerRate + fc.takerRate + fc.slippage * 2 + fc.fundingRate) * 100, 3) + '</b></div></div>'
    + _fzSec('🌍 Région fiscale', 'Belgique = registre trade par trade')
    + '<div class="fx-card"><div class="fz-rsel"><span>' + _fzEsc(lb.split(' ')[0]) + '</span><div><b>' + _fzEsc(lb.split(' ').slice(1).join(' ')) + '</b>'
    + '<em>' + _fzEsc(R.method || '') + (R.note ? ' · ' + _fzEsc(R.note) : '') + '</em></div><strong>' + rate(R) + '</strong></div></div>'
    + '<div class="fz-rg">' + Object.keys(regions).filter(k => k !== cur).map(k => { const r = regions[k], l = String(r.label || k);
      return '<button class="fz-rb" onclick="selectRegion(\'' + k + '\')"><span>' + _fzEsc(l.split(' ')[0]) + '</span><span>' + _fzEsc(l.split(' ').slice(1).join(' ')) + '</span><b>' + rate(r) + '</b></button>'; }).join('') + '</div>'
    + '<div class="fz-note">Belgique : loi du 03/04/2026, appliquée trade par trade par le registre ⚖ Impôt (MANU LONG sans levier = normal ; AUTO, SHORT ou levier = spéculatif). '
    + 'Autre région : aucun impôt provisionné. Le fisc qualifie en dernier ressort ; en cas de doute, un comptable ou une décision anticipée du SPF Finances.</div>';
}

function saveFeeSettings() {
  const get = id => parseFloat(document.getElementById(id)?.value || 0) / 100;
  S.feeConfig.makerRate   = Math.max(0, Math.min(0.05, get('fee_makerRate')));
  S.feeConfig.takerRate   = Math.max(0, Math.min(0.05, get('fee_takerRate')));
  S.feeConfig.slippage    = Math.max(0, Math.min(0.05, get('fee_slippage')));
  S.feeConfig.fundingRate = Math.max(0, Math.min(0.05, get('fee_fundingRate')));
  // Re-render the summary line live
  const sumEl = document.querySelector('#taxSettings .fee-total-sum');
  if(sumEl) sumEl.textContent =   // [GO CSS · écran 6 · 14/11/2026] la ligne existe enfin (avant : aucune balise .fee-total-sum, rien ne bougeait), au format français
    _fzPct((S.feeConfig.makerRate + S.feeConfig.takerRate + S.feeConfig.slippage*2 + S.feeConfig.fundingRate)*100, 3);
  showToast('⚙️ Frais mis à jour', 2800, 'user');
}

function selectRegion(key) {
  S.taxConfig.region = key;
  renderFiscalSettings();  // rebuild selection
  renderFiscalTax();       // update tax panel
  try { _fzBref(); } catch(e) {}   // [GO CSS · écran 6 · 14/11/2026] la tuile 🧰 Outils dit la région
  showToast('🌍 Région: '+S.taxConfig.regions[key].label, 2800, 'user');
}

// ============================================================
// v3.1 — INTELLIGENCE BANNER
// ============================================================
function updateIntelBanner() {
  const iconEl  = document.getElementById('intelIcon');
  const textEl  = document.getElementById('intelText');
  const badgeEl = document.getElementById('intelBadge');
  if(!iconEl || !textEl || !badgeEl) return;

  const pairs   = _livePairs();   // [PAIRES VIVANTES · 10/10/2026] (avant : paire retirée comprise)
  const avgProb = pairs.reduce((s,k) => s + lmsrP(S.pairStates[k]), 0) / Math.max(1, pairs.length);
  const topAgent= [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>b.fitness-a.fitness)[0];
  const totalMem= S.agents.reduce((s,a)=>s+(a.memory?a.memory.length:0),0);
  const openPos = S.openPositions.length;
  const wonMem  = S.globalMemoryPool.filter(e=>e.episode&&e.episode.won).length;
  const memWR   = S.globalMemoryPool.length > 0 ? Math.round(wonMem/S.globalMemoryPool.length*100) : 0;

  let icon, text, badge, bannerBorder;

  if(S.dreamActive && S.currentDream) {
    icon   = '💤';
    text   = `<strong>Dream Cycle #${S.currentDream.id}</strong> — stress-test ${S.dreamProgress}% · agents recalibrés en temps réel`;
    badge  = 'DREAM';
    bannerBorder = 'rgba(167,139,250,.3)';
  } else if(openPos > 0) {
    const dir = avgProb > 0.5 ? '↑' : '↓';
    const col = avgProb > 0.5 ? '#00e87a' : '#ff3d6b';
    icon = avgProb > 0.55 ? '🟢' : avgProb < 0.45 ? '🔴' : '🟡';
    text = `<strong>${openPos} position(s) ouverte(s)</strong> · LMSR <span style="color:${col}">${dir} ${(avgProb*100).toFixed(0)}%</span> · Meilleur: <strong>${topAgent?.name||'—'}</strong> (${Math.floor(topAgent?.fitness||0)} T$)`;
    badge = avgProb > 0.55 ? 'LONG' : avgProb < 0.45 ? 'SHORT' : 'NEUTRE';
    bannerBorder = avgProb > 0.55 ? 'rgba(0,232,122,.25)' : avgProb < 0.45 ? 'rgba(255,61,107,.25)' : 'rgba(245,200,66,.2)';
  } else if(totalMem > 20) {
    icon = '💭';
    text = `<strong>Mémoire collective</strong> · ${totalMem} souvenirs · ${memWR} % de votes justes · Pool: ${S.globalMemoryPool.length} · Rappels actifs`;
    badge = 'MÉMOIRE';
    bannerBorder = 'rgba(56,212,245,.2)';
  } else if(S.activePairProposal) {
    icon = '🌐';
    const prop = S.proposals.find(p=>p.isPairProposal&&p.status==='active');
    const forPct = prop ? Math.round(prop.forVotes/(prop.forVotes+prop.againstVotes)*100) : 0;
    text = `<strong>DAO vote en cours</strong> · Proposition ${S.activePairProposal}/USDT · <span style="color:var(--up)">${forPct}% pour</span> · vote auto dans ${Math.max(0,(prop?.autoPassAt||0)-S.cycle)} cycles`;
    badge = 'DAO VOTE';
    bannerBorder = 'rgba(245,200,66,.25)';
  } else {
    const dir = avgProb > 0.5 ? 'haussier' : avgProb < 0.5 ? 'baissier' : 'neutre';
    const col = avgProb > 0.52 ? '#00e87a' : avgProb < 0.48 ? '#ff3d6b' : '#f5c842';
    icon = S.botAutoMode === false ? '🎛️' : '🧠';
    const levInfo = S.leverageBorrowed > 0 ? ` · ⚡ $${Math.floor(S.leverageBorrowed)} lev actif` : '';
    const modeChip = S.botAutoMode === false
      ? ` · <span class="mode-indicator-chip manual">🎛️ MAN</span>`
      : ` · <span class="mode-indicator-chip auto">🤖 AUTO</span>`;
    text = `Consensus <span style="color:${col}"><strong>${dir}</strong></span> · LMSR ${(avgProb*100).toFixed(0)}% · <strong>${topAgent?.name||'—'}</strong>${levInfo}${modeChip}`;
    badge = 'INTELLIGENCE';
    bannerBorder = 'rgba(167,139,250,.15)';
  }

  iconEl.innerHTML   = icon;
  textEl.innerHTML   = text;
  badgeEl.textContent= badge;
  const banner = document.getElementById('intelBanner');
  if(banner) banner.style.borderColor = bannerBorder;
}

// ============================================================
// v3.1 — STREAK COUNTER
// ============================================================
function updateStreakBadge() {
  const el = document.getElementById('streakBadge');
  if(!el) return;

  // Count streak from learningHistory (most recent outcomes)
  const hist = S.learningHistory.filter(h => h.source === 'trade' || h.source === 'position');
  if(hist.length === 0) { el.textContent = '— streak'; el.className = 'streak-badge neu'; return; }

  let streak = 0;
  const last = hist[hist.length-1].won;
  for(let i = hist.length-1; i >= 0; i--) {
    if(hist[i].won === last) streak++;
    else break;
  }

  if(last) {
    el.textContent = `🔥 ${streak}W`;
    el.className = 'streak-badge win';
  } else {
    el.textContent = `${streak}L ↓`;
    el.className = 'streak-badge loss';
  }
}

// ============================================================
// v3.1 — AGENT HEATMAP GRID
// ============================================================
function renderAgentHeatmap() {
  const grid = document.getElementById('agentHeatmapGrid');
  if(!grid) return;

  const analysisAgents = S.agents.filter(a => !a.isBot);
  const maxFit = Math.max(1, ...analysisAgents.map(a=>a.fitness));

  // Rebuild only if count changed
  if(grid.children.length !== analysisAgents.length) {
    grid.style.gridTemplateColumns = `repeat(${Math.min(5, analysisAgents.length)}, 1fr)`;
    grid.innerHTML = analysisAgents.map(a => `
      <div class="heatmap-cell" id="hc_${a.id}" onclick="showMemoryOverlay('${a.id}')" title="${a.name}">
        <div class="hc-lbl">${a.type || a.name}</div>
        <div class="hc-emoji">${a.emoji}</div>
        <div class="hc-score" id="hcs_${a.id}">+0.00</div>
        <div class="hc-fit"  id="hcf_${a.id}">0T$</div>
      </div>`).join('');
  }

  analysisAgents.forEach(a => {
    const cell  = document.getElementById('hc_'+a.id);
    const score = document.getElementById('hcs_'+a.id);
    const fit   = document.getElementById('hcf_'+a.id);
    if(!cell) return;

    const s = a.score;
    const fitNorm = Math.min(1, a.fitness / maxFit);
    const alpha   = 0.08 + Math.abs(s) * 0.45;

    // Background color: green if positive, red if negative, slate if neutral
    let bg, borderCol, textCol;
    if(s > 0.12) {
      bg = `rgba(0,232,122,${alpha})`; borderCol = `rgba(0,232,122,${alpha+.1})`; textCol = '#00e87a';
    } else if(s < -0.12) {
      bg = `rgba(255,61,107,${alpha})`; borderCol = `rgba(255,61,107,${alpha+.1})`; textCol = '#ff3d6b';
    } else {
      bg = `rgba(56,212,245,0.05)`; borderCol = 'rgba(56,212,245,.1)'; textCol = '#8899bb';
    }

    cell.style.background   = bg;
    cell.style.border       = `1px solid ${borderCol}`;
    cell.style.boxShadow    = Math.abs(s) > 0.5 ? `0 0 8px ${borderCol}` : 'none';

    if(score) { score.textContent = (s>=0?'+':'')+s.toFixed(2); score.style.color = textCol; }
    if(fit)   { fit.textContent   = a.fitness >= 1000 ? (a.fitness/1000).toFixed(1)+'k' : Math.floor(a.fitness)+'T$'; }

    // Pulse on high conviction
    if(Math.abs(s) > 0.7 && tick % 6 === 0) {
      cell.style.transform = 'scale(1.05)';
      setTimeout(()=>{ if(cell) cell.style.transform=''; }, 300);
    }
  });
}

// ============================================================
// v3.1 — AGENT CORRELATION MATRIX (Canvas)
// ============================================================
let _corrLastTick = -1;

function renderCorrMatrix() {
  const canvas = document.getElementById('corrMatrixCanvas');
  if(!canvas) return;
  if(canvas.closest && canvas.closest('.mk-fold:not(.open)')) return;   // [GO CSS · écran 3 · 14/11/2026] volet Agents fermé : rien à dessiner (09i _mkFold redessine à l'ouverture)
  if(tick - _corrLastTick < 5) return;
  _corrLastTick = tick;

  const agents = S.agents.filter(a => !a.isBot && !a.isMeta).slice(0, 8);
  const n = agents.length;
  if(n < 2) return;

  const dpr = window.devicePixelRatio || 1;
  let W = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 0;
  if(W < 10) { _corrLastTick=-1; requestAnimationFrame(()=>{_corrLastTick=-10;}); W=300; }
  // [GO AFFICHAGE 3 · 15/11/2026] (n° 93) chaque agent est NOMMÉ dans le canvas : sa spécialité (type, comme les puces de l'écran Marché — tous les sièges
  // portent 🧬 et un nom « Hybrid Gen-… ») avec un numéro, en colonne à gauche ; la diagonale porte ce numéro (il nomme les colonnes) ; le titre est sous la
  // grille, dans le canvas. Avant : 🧬 sur toute la diagonale, noms écrits à droite de la grille (x ≥ largeur : hors du canvas), titre sous le canvas (invisible).
  const _cmFont = '500 11px monospace';
  const _cmLab = agents.map((a, i) => (i + 1) + ' ' + String(a.type || String(a.name || '').split('·')[0].trim() || a.id || '·'));
  const _cm0 = canvas.getContext('2d');   // mesure seulement (le redimensionnement plus bas remet son état à zéro)
  let labW = 0;
  if (_cm0) { _cm0.font = _cmFont; _cmLab.forEach(t => { labW = Math.max(labW, _cm0.measureText(t).width); }); } else labW = 7 * Math.max(..._cmLab.map(t => t.length));
  labW = Math.ceil(Math.min(W * 0.42, labW + 8));
  const cellSize = Math.floor((W - labW) / n);
  const H = cellSize * n + 16;
  canvas.width=W*dpr; canvas.height=H*dpr; canvas.style.height=H+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.translate(labW, 0);   // la grille commence après la colonne des noms

  // Pearson correlation using fitnessHistory (real time series)
  function pearson(xs, ys) {
    const len = Math.min(xs.length, ys.length);
    if(len < 4) return 0;
    const ax = xs.slice(-len).reduce((a,b)=>a+b,0)/len;
    const ay = ys.slice(-len).reduce((a,b)=>a+b,0)/len;
    let num=0, dx2=0, dy2=0;
    for(let k=0;k<len;k++){
      const dx=xs[xs.length-len+k]-ax, dy=ys[ys.length-len+k]-ay;
      num+=dx*dy; dx2+=dx*dx; dy2+=dy*dy;
    }
    const denom = Math.sqrt(dx2*dy2);
    return denom < 1e-10 ? 0 : Math.max(-1, Math.min(1, num/denom));
  }

  for(let i=0;i<n;i++) {
    for(let j=0;j<n;j++) {
      const ai=agents[i], aj=agents[j];
      let corr;
      if(i===j) {
        corr = 1.0;
      } else {
        const hi = ai.fitnessHistory || [ai.fitness];
        const hj = aj.fitnessHistory || [aj.fitness];
        if(hi.length >= 4 && hj.length >= 4) {
          corr = pearson(hi, hj);
        } else {
          // Fallback: score direction agreement weighted by magnitude
          const si=ai.score||0, sj=aj.score||0;
          if(Math.abs(si)<0.02||Math.abs(sj)<0.02) { corr=0; }
          else {
            const sameDir=(si>0&&sj>0)||(si<0&&sj<0);
            corr = sameDir ? Math.min(0.8,Math.abs(si)*Math.abs(sj)*6) : -Math.min(0.8,Math.abs(si)*Math.abs(sj)*6);
          }
        }
      }

      // Color: green=aligned, red=opposed, dark=neutral
      let r,g,b,a;
      if(i===j) { r=0;g=200;b=120;a=0.65; }
      else if(corr>0.3) { const t=corr; r=0;g=Math.round(t*230);b=Math.round(t*80);a=0.15+t*0.6; }
      else if(corr<-0.3) { const t=Math.abs(corr); r=Math.round(t*255);g=30;b=60;a=0.15+t*0.6; }
      else { r=136;g=153;b=187;a=0.07+Math.abs(corr)*0.15; }

      ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
      ctx.fillRect(j*cellSize, i*cellSize, cellSize-1, cellSize-1);

      // Cell content
      if(i===j) {
        // Diagonal: le numéro de l'agent (il nomme la colonne) — [GO AFFICHAGE 3 · 15/11/2026] (n° 93) avant : son emoji, 🧬 pour tous
        ctx.fillStyle='rgba(255,255,255,.9)';
        ctx.font=`bold ${Math.max(11, Math.round(cellSize*0.4))}px monospace`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(String(i+1), j*cellSize+cellSize/2, i*cellSize+cellSize/2);
      } else if(Math.abs(corr) > 0.25) {
        // Off-diagonal: show correlation value
        ctx.fillStyle=corr>0?'rgba(0,232,122,0.9)':'rgba(255,61,107,0.9)';
        ctx.font=`bold ${Math.round(cellSize*0.28)}px monospace`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText((corr>=0?'+':'')+corr.toFixed(1), j*cellSize+cellSize/2, i*cellSize+cellSize/2);
      }
    }
  }

  // Noms à gauche de la grille (dans le canvas), coupés « … » s'ils dépassent leur colonne
  ctx.font=_cmFont; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillStyle='rgba(200,210,230,.85)';
  for(let i=0;i<n;i++) {
    let t = _cmLab[i];
    while (t.length > 2 && ctx.measureText(t).width > labW - 6) t = t.slice(0, -2) + '…';
    ctx.fillText(t, -labW + 2, i*cellSize+cellSize/2);
  }
  ctx.font='500 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillStyle='rgba(136,153,187,.6)';
  ctx.fillText('ACCORD INTER-AGENTS', (W - labW)/2, H-3);
}

function renderAll() {
  renderHome();
  renderPairPnl();
  // Build static scaffolding once, then patch
  buildAgentCards();
  patchAgentCards();
  buildGovCards();
  patchGovCards();
  renderMarket();
  renderChain();
  // v3.1 new renders
  updateIntelBanner();
  updateStreakBadge();
  renderAgentHeatmap();
  // v7.2 Phase 16b · renderOpenPosSummary retiré : DOM éléments n'existent plus depuis v6.8,
  // la fonction bail immédiatement — nettoyage dead code.
  setTimeout(renderCorrMatrix, 80);   // slight delay — canvas needs layout first
}

// ============================================================
// LMSR THRESHOLD DRAG — yellow marker on action card bar
// ============================================================
let _thrDrag = null;   // { pair, trackEl }

function startThresholdDrag(e, pair) {
  e.preventDefault();
  e.stopPropagation();
  const pairKey = pair.replace('/','_');
  const track   = document.getElementById('ac2_track_'+pairKey);
  if(!track) return;
  _thrDrag = { pair, pairKey, track };
  track.setPointerCapture(e.pointerId);
  track.addEventListener('pointermove',  _onThrDragMove, { passive:false });
  track.addEventListener('pointerup',    _onThrDragEnd);
  track.addEventListener('pointercancel',_onThrDragEnd);
  _applyThresholdFromEvent(e);
}

function _onThrDragMove(e) {
  if(!_thrDrag) return;
  e.preventDefault();
  _applyThresholdFromEvent(e);
}

function _onThrDragEnd(e) {
  if(!_thrDrag) return;
  const track = _thrDrag.track;
  track.removeEventListener('pointermove',  _onThrDragMove);
  track.removeEventListener('pointerup',    _onThrDragEnd);
  track.removeEventListener('pointercancel',_onThrDragEnd);
  _applyThresholdFromEvent(e);
  const { pair } = _thrDrag;
  const ps = S.pairStates[pair];
  showToast('⚡ '+pair+' seuil: '+(ps.threshold*100).toFixed(0)+'% · cycle: '+fmtDur(ps.cycleMax));
  _thrDrag = null;
}

function _applyThresholdFromEvent(e) {
  if(!_thrDrag) return;
  const { pair, pairKey, track } = _thrDrag;
  const rect  = track.getBoundingClientRect();
  const rawX  = (e.clientX - rect.left) / rect.width;    // 0..1
  const clamped = Math.max(0.52, Math.min(0.95, rawX));  // 52–95%

  const ps = S.pairStates[pair];
  if(!ps) return;
  ps.threshold = clamped;

  // Live DOM update (no full re-render needed)
  const thrPct  = clamped * 100;
  const lthrPct = (1 - clamped) * 100;
  const thrL  = document.getElementById('ac2_thr_l_'+pairKey);
  const thrR  = document.getElementById('ac2_thr_r_'+pairKey);
  const zone  = document.getElementById('ac2_zone_'+pairKey);
  const lbl   = document.getElementById('ac2_thrlbl_'+pairKey);
  if(thrL) thrL.style.left  = lthrPct+'%';
  if(thrR) thrR.style.left  = thrPct+'%';
  if(zone) { zone.style.left = lthrPct+'%'; zone.style.width = (thrPct - lthrPct)+'%'; }
  if(lbl)  lbl.textContent  = thrPct.toFixed(0)+'% · '+fmtDur(ps.cycleMax);
}


// ============================================================
// POSITION EDIT — entry price, TP, SL, flip, stake
// ============================================================
let _editModal = null;  // current edit modal state

function openPosEdit(posId) {
  const pos = S.openPositions.find(p => p.id === posId);
  if(!pos) return;
  const cfg = PAIRS[pos.pair];
  const ps  = S.pairStates[pos.pair];
  if(!cfg || !ps) return;

  // [GO LEVIER · 18/10/2026] les champs reçoivent la valeur EXACTE : tronquée (Math.floor pour les paires à 0–2 décimales), elle était réécrite sur la
  // position au premier « ✓ Appliquer » — DOT à 6,80 : entrée 6 → +4 $ créés en changeant seulement le TP (relecture du 18/10)
  const fmtInput = v => String(Number(v));

  // TP/SL distance hints
  const curPrice = ps.price;
  // [GO CSS FINITIONS · 14/11/2026] (n° 86) indices ±2 % : avant, 0 décimale sous dec 4 (DOT à 0,76 : « 1 » et « 1 ») ; texte = pxTxt, champ vide = pxIn (point décimal)
  const tpV = pos.side==='long' ? curPrice * 1.02 : curPrice * 0.98, slV = pos.side==='long' ? curPrice * 0.98 : curPrice * 1.02;
  const tpHint = pxTxt(pos.pair, tpV), slHint = pxTxt(pos.pair, slV);

  const modal = document.getElementById('posEditModal');
  if(!modal) return;

  _editModal = { posId, cfg, ps };

  document.getElementById('peModalTitle').textContent  = pos.pair+' — '+pos.side.toUpperCase();
  document.getElementById('peEntryInput').value        = fmtInput(pos.entryPrice);
  try { document.getElementById('peEntryInput').readOnly = true; } catch(e) {}   // [GO LEVIER · 18/10/2026] le prix d'entrée est celui de l'achat : il se lit, il ne s'écrit pas
  document.getElementById('peTpInput').value           = pos.tp  ? fmtInput(pos.tp)  : '';
  document.getElementById('peSlInput').value           = pos.sl  ? fmtInput(pos.sl)  : '';
  document.getElementById('peStakeInput').value        = pos.stakeUsdt;
  document.getElementById('peTpHint').textContent      = '+2%: '+tpHint;
  document.getElementById('peSlHint').textContent      = '−2%: '+slHint;
  document.getElementById('peTpInput').placeholder     = pxIn(pos.pair, tpV);
  document.getElementById('peSlInput').placeholder     = pxIn(pos.pair, slV);
  document.getElementById('peFlipBtn').textContent     = pos.side==='long' ? '↓ Convertir en SHORT' : '↑ Convertir en LONG';
  document.getElementById('peFlipBtn').style.background= pos.side==='long' ? 'rgba(255,61,107,.12)' : 'rgba(0,232,122,.12)';
  document.getElementById('peFlipBtn').style.color     = pos.side==='long' ? 'var(--down)' : 'var(--up)';

  modal.classList.add('show');
}

function closePosEditModal() {
  const modal = document.getElementById('posEditModal');
  if(modal) modal.classList.remove('show');
  _editModal = null;
}
// Alias for backdrop click
const closeEditModal = closePosEditModal;

function applyPosEdit() {
  if(!_editModal) return;
  const pos = S.openPositions.find(p => p.id === _editModal.posId);
  if(!pos) { closePosEditModal(); return; }
  if (pos._voix === 'tendance') { showToast('📈 ' + pos.pair + ' : position de la voix tendance — ni TP, ni SL, ni inversion (elle se retourne seule) ; ✕ pour la fermer', 3500, 'warn'); closePosEditModal(); return; }   // [GO TENDANCE RÉELLE · 12/11/2026]

  const entry = parseFloat(document.getElementById('peEntryInput').value);
  const tp    = parseFloat(document.getElementById('peTpInput').value);
  const sl    = parseFloat(document.getElementById('peSlInput').value);
  const stake = parseFloat(document.getElementById('peStakeInput').value);

  let changed = [];

  // [GO LEVIER · 18/10/2026] le prix d'entrée d'une position ouverte ne se modifie plus : il fabriquait du résultat (entrée 100 → 50 en LONG : +100 % à la
  // fermeture, sans que le prix ait bougé). Un écart est refusé et dit.
  let _entryMsg = null;
  if(!isNaN(entry) && entry > 0 && entry !== pos.entryPrice) {
    _entryMsg = '⚠ Prix d\'entrée non modifié : c\'est le prix de l\'achat (il ne se change pas)';
  }
  if(!isNaN(tp) && tp > 0) {
    pos.tp = tp;
    changed.push('TP→'+pxTxt(pos.pair, tp));   // [GO AFFICHAGE 3 · 15/11/2026] (n° 86c) prix par 02 pxTxt
  } else if(document.getElementById('peTpInput').value === '') {
    pos.tp = null; changed.push('TP effacé');
  }
  if(!isNaN(sl) && sl > 0) {
    pos.sl = sl;
    changed.push('SL→'+pxTxt(pos.pair, sl));
  } else if(document.getElementById('peSlInput').value === '') {
    pos.sl = null; changed.push('SL effacé');
  }
  // [GO LEVIER · 18/10/2026] (ETAT n° 26) Changer la MISE d'une position ouverte, c'est acheter ou vendre : la mise ajoutée est retirée du trading et
  // achète au prix du moment (02 _addToPosition, la règle de « ↑ Renforcer » et de la pyramide : prix d'entrée moyen, exposition ajoutée, levier de
  // la position gardé). Avant : stakeUsdt était réécrit sans rien débiter — 30 → 40 $ créait +10 $ à la fermeture, 40 → 30 $ en détruisait 10.
  // Réduire = vendre une partie : il n'existe pas encore de vente partielle juste (frais, impôt, historique) — refusé, et dit.
  let _stakeMsg = null, _stakeAdded = false;
  if(!isNaN(stake) && stake >= 10 && stake !== pos.stakeUsdt) {
    const _add = stake - (Number(pos.stakeUsdt) || 0);
    const _ps = S.pairStates[pos.pair], _px = Number(_ps && _ps.price);
    if (!(_add > 0)) {
      _stakeMsg = '⚠ Mise non réduite : réduire une position ouverte, c\'est en vendre une partie — ferme-la (✕) puis rouvre avec la mise voulue';
    } else if (!((S.tradingAccount || 0) >= _add)) {
      _stakeMsg = '⚠ Mise non changée : il faut ' + fmt$2(_add) + ' au trading (' + fmt$2(S.tradingAccount || 0) + ' disponibles)';
    } else if (!(_px > 0) || typeof _addToPosition !== 'function' || _addToPosition(pos, _add, _px) === null) {
      _stakeMsg = '⚠ Mise non changée : pas de prix, position illisible ou exécution TWAP en cours';
    } else {
      S.tradingAccount = Math.max(0, (S.tradingAccount || 0) - _add);
      S.portfolio = (typeof _computePortfolio === 'function') ? _computePortfolio() : S.portfolio;
      _stakeAdded = true;
      changed.push('Mise→$' + (Number(pos.stakeUsdt) || 0).toFixed(2) + ' (+' + fmt$2(_add) + ' achetés au prix du moment, retirés du trading · entrée moyenne ' + Number(pos.entryPrice).toPrecision(6) + ')');
    }
  }

  if (_entryMsg) _stakeMsg = _stakeMsg ? _entryMsg + ' · ' + _stakeMsg : _entryMsg;
  if(changed.length) {
    // un achat (mise ajoutée) se voit toujours ; les autres changements gardent le niveau « info » d'avant (masqué hors mode verbeux)
    showToast('✓ '+pos.pair+': '+changed.join(' · ') + (_stakeMsg ? ' · ' + _stakeMsg : ''), _stakeMsg ? 5000 : (_stakeAdded ? 4000 : 2800), _stakeMsg ? 'warn' : (_stakeAdded ? 'user' : 'info'));
    S.chainLog.push({ icon:'✏️', desc:'Edit '+pos.pair+' '+pos.side.toUpperCase()+': '+changed.join(', '), hash:rndHash(), time:nowStr() });
  } else if (_stakeMsg) {
    showToast(pos.pair + ' : ' + _stakeMsg, 5000, 'warn');
  }
  closePosEditModal();
}

// [GO LEVIER · 18/10/2026] « ↓ Convertir » ferme VRAIMENT puis rouvre dans l'autre sens (07 manuInvert : closePosition — résultat, frais, impôt, historique,
// emprunt rendu — puis openPosition avec la même mise, le même levier, les mêmes distances de TP / SL et tes consignes). Avant : le sens et le prix d'entrée
// étaient réécrits sur la position — le résultat latent disparaissait sans être réalisé (une perte de 9 $ effacée, relecture du 18/10).
function flipPosition(posId) {
  const resolvedId = posId || _editModal?.posId;
  const pos = S.openPositions.find(p => p.id === resolvedId);
  if(!pos || pos.auto === true) return;
  closePosEditModal();
  if (typeof manuInvert === 'function') manuInvert(pos.pair);
  else showToast('⚠ ' + pos.pair + ' : conversion indisponible', 2500, 'warn');
}

function setTpSl(posId, type, pct) {
  // Quick TP/SL setter via percentage buttons in modal
  if(!_editModal) return;
  const pos = S.openPositions.find(p=>p.id===_editModal.posId);
  if(!pos) return;
  const ps = S.pairStates[pos.pair];
  if(!ps) return;
  const cur = ps.price;
  // [GO N° 86D · 15/11/2026] (ETAT n° 86d) le champ reçoit 02 pxIn (les décimales du prix affiché, point décimal) : « ✓ Appliquer » écrit ce champ sur la position.
  // Avant : toFixed(dec ≥ 4 ? dec : 2) — DOT à 0,734 : TP +1 % → 0.74 (+0,82 %) ; PEPE à 0,00000404 : TP +1 % d'un LONG → 0.000004, sous le prix (TP « atteint » au passage suivant).
  let price;
  if(type==='tp') {
    price = pos.side==='long' ? cur*(1+pct/100) : cur*(1-pct/100);
    const inp = document.getElementById('peTpInput');
    if(inp) inp.value = pxIn(pos.pair, price);
  } else {
    price = pos.side==='long' ? cur*(1-pct/100) : cur*(1+pct/100);
    const inp = document.getElementById('peSlInput');
    if(inp) inp.value = pxIn(pos.pair, price);
  }
}

// ============================================================

// ============================================================
// INDICATEURS TECHNIQUES — 10 indicateurs complets
// ============================================================

// ── Utilitaires de base ──────────────────────────────────────
function _closes(candles){ return candles.map(c=>c.c); }
function _highs(candles) { return candles.map(c=>c.h); }
function _lows(candles)  { return candles.map(c=>c.l); }
function _mean(arr)      { return arr.reduce((a,b)=>a+b,0)/arr.length; }

// ── 1. MM — Moyenne Mobile Simple ───────────────────────────
function calcSMA(closes, period) {
  if(closes.length < period) return null;
  return _mean(closes.slice(-period));
}

// ── 2. MME — Moyenne Mobile Exponentielle ───────────────────
function calcEMA(closes, period) {
  if(closes.length < period) return null;
  const k = 2/(period+1);
  let ema = _mean(closes.slice(0,period));
  for(let i=period; i<closes.length; i++) ema = closes[i]*k + ema*(1-k);
  return ema;
}

// Returns full EMA series (array, same length as closes from period onward)
function calcEMASeries(closes, period) {
  if(closes.length < period) return [];
  const k = 2/(period+1);
  const out = [_mean(closes.slice(0,period))];
  for(let i=period; i<closes.length; i++)
    out.push(closes[i]*k + out[out.length-1]*(1-k));
  return out;
}

// ── 3. Oscillateur Stochastique (%K / %D) ───────────────────
function calcStochastic(candles, kPeriod=14, dPeriod=3, smoothK=3) {
  if(candles.length < kPeriod) return null;
  const rawK = [];
  for(let i=kPeriod-1; i<candles.length; i++) {
    const slice = candles.slice(i-kPeriod+1, i+1);
    const hiH   = Math.max(...slice.map(c=>c.h));
    const loL   = Math.min(...slice.map(c=>c.l));
    rawK.push(hiH===loL ? 50 : ((candles[i].c-loL)/(hiH-loL))*100);
  }
  // Smooth %K
  const smK = rawK.length >= smoothK
    ? rawK.slice(-Math.max(smoothK, rawK.length - 30 + smoothK))
    : rawK;
  const kVal = _mean(smK.slice(-smoothK));
  // %D = SMA(smoothK) of %K
  const dSrc = rawK.slice(-dPeriod);
  const dVal = _mean(dSrc);
  const prev = rawK.length >= 2 ? rawK[rawK.length-2] : kVal;
  return { k:kVal, d:dVal, prev, cross: (kVal>dVal && prev<=dVal) ? 'bull' : (kVal<dVal && prev>=dVal) ? 'bear' : null };
}

// ── 4. MACD (12/26/9) ────────────────────────────────────────
function calcMACD(candles) {
  if(candles.length < 26) return null;
  const closes = _closes(candles);
  const ema12  = calcEMA(closes, 12);
  const ema26  = calcEMA(closes, 26);
  if(!ema12 || !ema26) return null;
  const macdVal = ema12 - ema26;
  // Signal: EMA(9) of rolling MACD values
  const macdSeries = [];
  for(let i=26; i<=closes.length; i++) {
    const e12 = calcEMA(closes.slice(0,i), 12);
    const e26 = calcEMA(closes.slice(0,i), 26);
    if(e12 && e26) macdSeries.push(e12-e26);
  }
  const signalVal = calcEMA(macdSeries, Math.min(9, macdSeries.length));
  const hist      = macdVal - (signalVal||0);
  const prevHist  = macdSeries.length >= 2 ? macdSeries[macdSeries.length-2] - (signalVal||0) : hist;
  return {
    macd:    macdVal,
    signal:  signalVal||0,
    hist,
    prevHist,
    cross:   (hist>0 && prevHist<=0) ? 'bull' : (hist<0 && prevHist>=0) ? 'bear' : null
  };
}

// ── 5. Bandes de Bollinger ───────────────────────────────────
function calcBollinger(candles, period=20, mult=2) {
  const n = Math.min(period, candles.length);
  if(n < 5) return null;
  const closes = candles.slice(-n).map(c=>c.c);
  const mean   = _mean(closes);
  const std    = Math.sqrt(_mean(closes.map(c=>(c-mean)**2)));
  const cur    = closes[closes.length-1];
  const upper  = mean + mult*std;
  const lower  = mean - mult*std;
  const bw     = std > 0 ? (upper-lower)/mean : 0;     // bandwidth %
  const pct    = std > 0 ? (cur-lower)/(upper-lower) : 0.5;
  // Squeeze: bandwidth in lower 20% of recent range → compression
  const squeeze = bw < 0.02;
  return { upper, lower, middle:mean, std, pct, cur, bw, squeeze };
}

// ── 6. RSI (14) avec divergence ─────────────────────────────
function calcRSI(candles, period=14) {
  if(candles.length < period+2) return null;
  const closes = _closes(candles);
  // Wilder smoothing (proper RSI)
  let avgGain=0, avgLoss=0;
  for(let i=1; i<=period; i++){
    const d=closes[i]-closes[i-1];
    if(d>0) avgGain+=d; else avgLoss+=Math.abs(d);
  }
  avgGain /= period; avgLoss /= period;
  for(let i=period+1; i<closes.length; i++){
    const d=closes[i]-closes[i-1];
    avgGain = (avgGain*(period-1)+(d>0?d:0))/period;
    avgLoss = (avgLoss*(period-1)+(d<0?Math.abs(d):0))/period;
  }
  const rsi = avgLoss===0 ? 100 : 100-(100/(1+avgGain/avgLoss));

  // Divergence: price new high but RSI lower high (bearish div) or inverse
  let divergence = null;
  if(candles.length >= period+6) {
    const recentC = closes.slice(-6);
    const priceUp = recentC[5] > recentC[0];
    // approx prev RSI using slice
    const prevCandles = candles.slice(0,-3);
    const prevRsiRaw  = calcRSI(prevCandles, period);
    if(prevRsiRaw !== null) {
      if(priceUp && rsi < prevRsiRaw - 5)    divergence = 'bear'; // bearish div
      if(!priceUp && rsi > prevRsiRaw + 5)   divergence = 'bull'; // bullish div
    }
  }
  return { value:rsi, divergence };
}

// ── 7. Fibonacci Retracements ────────────────────────────────
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
function calcFibonacci(candles) {
  if(candles.length < 5) return null;
  const n      = Math.min(50, candles.length);
  const recent = candles.slice(-n);
  const swing_h = Math.max(...recent.map(c=>c.h));
  const swing_l = Math.min(...recent.map(c=>c.l));
  const range   = swing_h - swing_l;
  const cur     = recent[recent.length-1].c;
  const trend   = recent[recent.length-1].c > recent[0].c ? 'up' : 'down';
  // Retracement levels from swing high (down-trend correction) or swing low (up-trend)
  const levels = FIB_LEVELS.map(f => ({
    ratio: f,
    price: trend==='up' ? swing_h - f*range : swing_l + f*range,
    label: (f*100).toFixed(1)+'%'
  }));
  // Find nearest support/resistance from fib levels
  const dists = levels.map(l => ({ ...l, dist: Math.abs(cur - l.price)/cur*100 }));
  const nearest = dists.reduce((a,b)=>a.dist<b.dist?a:b);
  const below   = dists.filter(l=>l.price<=cur).sort((a,b)=>b.price-a.price)[0];
  const above   = dists.filter(l=>l.price> cur).sort((a,b)=>a.price-b.price)[0];
  return { levels, nearest, below, above, swing_h, swing_l, trend, cur };
}

// ── 8. Ichimoku Cloud ────────────────────────────────────────
function calcIchimoku(candles) {
  const n = candles.length;
  if(n < 52) return null;
  const hi = _highs(candles), lo = _lows(candles), cl = _closes(candles);

  const midN = (arr, i, p) => {
    const sl = arr.slice(Math.max(0,i-p+1), i+1);
    return (Math.max(...sl)+Math.min(...sl))/2;
  };

  // Current (last bar) values
  const i = n-1;
  const tenkan  = midN(candles.map(c=>c.h), i, 9)===midN(candles.map(c=>c.l), i, 9)
    ? (Math.max(...candles.slice(-9).map(c=>c.h))+Math.min(...candles.slice(-9).map(c=>c.l)))/2
    : (Math.max(...candles.slice(-9).map(c=>c.h))+Math.min(...candles.slice(-9).map(c=>c.l)))/2;
  const kijun   = (Math.max(...candles.slice(-26).map(c=>c.h))+Math.min(...candles.slice(-26).map(c=>c.l)))/2;
  const senkouA = (tenkan+kijun)/2;                      // displaced +26
  // Senkou B (52-period midline, displaced +26)
  const senkouB = (Math.max(...candles.slice(-52).map(c=>c.h))+Math.min(...candles.slice(-52).map(c=>c.l)))/2;
  const chikou  = cl[i];   // current close, displaced -26

  // Use 26-bar-ago cloud as current cloud (approximation without forward shift)
  const cloudRef  = candles.slice(-52, -26);
  const cloudA26  = cloudRef.length >= 2
    ? ((Math.max(...cloudRef.map(c=>c.h))+Math.min(...cloudRef.map(c=>c.l)))/2
      + (Math.max(...candles.slice(-78,-52).map(c=>c.h))||0+Math.min(...candles.slice(-78,-52).map(c=>c.l))||0)/2) / 2
    : senkouA;
  const cloudB26  = cloudRef.length >= 2
    ? (Math.max(...cloudRef.slice(-52).map(c=>c.h))+Math.min(...cloudRef.slice(-52).map(c=>c.l)))/2
    : senkouB;

  const cur    = cl[i];
  const cloudTop    = Math.max(cloudA26, cloudB26);
  const cloudBottom = Math.min(cloudA26, cloudB26);
  const aboveCloud  = cur > cloudTop;
  const belowCloud  = cur < cloudBottom;
  const tkCross     = tenkan > kijun ? 'bull' : tenkan < kijun ? 'bear' : null;

  return { tenkan, kijun, senkouA, senkouB, chikou,
           cloudTop, cloudBottom, aboveCloud, belowCloud, tkCross, cur };
}

// ── 9. Écart-type (Volatilité σ) ────────────────────────────
function calcStdDev(candles, period=20) {
  const n = Math.min(period, candles.length);
  if(n < 3) return null;
  const closes = candles.slice(-n).map(c=>c.c);
  const mu     = _mean(closes);
  const sigma  = Math.sqrt(_mean(closes.map(c=>(c-mu)**2)));
  const cv     = mu > 0 ? sigma/mu : 0;  // coefficient of variation
  const atr    = _mean(candles.slice(-n).map((c,i,arr)=>{
    if(i===0) return c.h-c.l;
    const prev = arr[i-1];
    return Math.max(c.h-c.l, Math.abs(c.h-prev.c), Math.abs(c.l-prev.c));
  }));
  // [AUDIT CV · 16/08/2026] l'annualisation supposait des bougies JOURNALIÈRES (×√252)
  // sur des bougies courtes : AnnVol faux d'un ordre de grandeur → neutralisée (0, plus
  // affichée). Régime recalibré sur l'échelle RÉELLE mesurée en prod (BTC calme ≈ 0.01%,
  // marché vivant ≈ 0.1%+) — l'ancien seuil 1% rendait le régime « faible » permanent.
  const annualVol = 0;
  const regime    = cv < 0.001 ? 'faible' : cv < 0.0035 ? 'normal' : 'élevé';
  return { sigma, cv, atr, annualVol, regime };
}

// ── 10. ADX — Indice du Mouvement Directionnel ──────────────
function calcADX(candles, period=14) {
  if(candles.length < period+1) return null;
  const n = candles.length;

  // True Range + DM arrays
  const tr=[], pdm=[], ndm=[];
  for(let i=1; i<n; i++){
    const cur=candles[i], prev=candles[i-1];
    tr.push(Math.max(cur.h-cur.l, Math.abs(cur.h-prev.c), Math.abs(cur.l-prev.c)));
    const upMove   = cur.h-prev.h;
    const downMove = prev.l-cur.l;
    pdm.push(upMove>downMove && upMove>0 ? upMove : 0);
    ndm.push(downMove>upMove && downMove>0 ? downMove : 0);
  }

  // Wilder smoothing
  const smooth = (arr, p) => {
    let s = arr.slice(0,p).reduce((a,b)=>a+b,0);
    const out = [s];
    for(let i=p; i<arr.length; i++){ s = s - s/p + arr[i]; out.push(s); }
    return out;
  };

  const sTR  = smooth(tr,  period);
  const sPDM = smooth(pdm, period);
  const sNDM = smooth(ndm, period);

  const diP  = sTR.map((t,i)=>t>0?sPDM[i]/t*100:0);
  const diN  = sTR.map((t,i)=>t>0?sNDM[i]/t*100:0);
  const dx   = diP.map((p,i)=>{
    const sum=Math.abs(p+diN[i]);
    return sum>0?Math.abs(p-diN[i])/sum*100:0;
  });
  // ADX = smoothed DX
  // [FIX ADX · 14/08/2026] l'ADX était la SOMME lissée de DX (le smooth de Wilder ci-
  // dessus est une somme — correct pour TR/DM car DI est un ratio où l'échelle s'annule,
  // FAUX pour l'ADX) : valeurs ~14× trop hautes (209.6 vu en prod = vrai ADX ~15).
  // Depuis toujours : « adx<20 » jamais vrai → gate DCA muet ; « adx>25 » toujours vrai
  // → poids tendance du composite renforcé à tort. Moyenne de Wilder exacte :
  const _pA = Math.min(period, dx.length);
  let _adxV = dx.slice(0, _pA).reduce((a,b)=>a+b,0) / _pA;
  for (let i = _pA; i < dx.length; i++) _adxV = (_adxV * (_pA - 1) + dx[i]) / _pA;
  const adx = _adxV;
  const diPl = diP[diP.length-1];
  const diNl = diN[diN.length-1];
  const trend = adx > 25 ? (diPl > diNl ? 'bull' : 'bear') : 'ranging';
  const strength = adx > 50 ? 'très fort' : adx > 25 ? 'fort' : adx > 20 ? 'modéré' : 'faible';
  return { adx, diPlus:diPl, diMinus:diNl, trend, strength };
}

// ── Agrégation complète des signaux techniques ───────────────
// [MODES SÉPARÉS · 10/10/2026] Le cache « _techCache » est RETIRÉ : il ne servait jamais. Depuis le génome de paire (17/09) la clé LUE portait l'empreinte du
// génome et la clé ÉCRITE ne la portait pas : elles ne pouvaient pas être égales (sonde du 10/10, vraie app, 1 h : 171 738 appels, 0 relu du cache). Le
// comportement est donc inchangé : comme avant, chaque appel recalcule. Le réparer n'était pas un détail : sa clé (nombre de bougies + prix à 2 décimales) ne
// dit pas le contenu des bougies — PEPE vaut « 0.00 » à toute heure — et ne dit pas le mode : réparé tel quel, il aurait servi à l'EV des signaux calculés sur
// les bougies fabriquées de l'école (la leçon de _fundCache, plus bas). Un vrai cache demande sa propre preuve (mêmes signaux, bit pour bit) : mission à part.
// Mesure laissée pour elle : ces appels pèsent près de la moitié du calcul du battement dans la sonde (34,6 s sur 75,2 s, ≈ 48 appels par battement).
function getTechSignals(pair) {
  const ps = S.pairStates[pair];
  if(!ps || !ps.candles || ps.candles.length < 5) return null;
  // [GÉNOME DE PAIRE · 17/09/2026] les périodes et les poids viennent du génome DE LA PAIRE (03) — plus des constantes
  // identiques pour BTC et PEPE.
  const GP = (typeof _pairGenomeOf === 'function') ? _pairGenomeOf(pair) : { rsi:14, stoch:14, adx:14, emaFast:9, emaSlow:21, emaLong:50, smaFast:10, smaSlow:20, smaLong:50, wTrend:1.2, wMomentum:1.3, wVolatility:1 };
  const candles = ps.candles;
  const closes  = _closes(candles);
  const highs   = _highs(candles);
  const lows    = _lows(candles);

  // Compute all 10 indicators
  const sma10   = calcSMA(closes, Math.min(GP.smaFast, closes.length));
  const sma20   = calcSMA(closes, Math.min(GP.smaSlow, closes.length));
  const sma50   = calcSMA(closes, Math.min(GP.smaLong, closes.length));
  const ema9    = calcEMA(closes, Math.min(GP.emaFast, closes.length));
  const ema21   = calcEMA(closes, Math.min(GP.emaSlow, closes.length));
  const ema50   = calcEMA(closes, Math.min(GP.emaLong, closes.length));
  const stoch   = calcStochastic(candles, Math.min(GP.stoch, candles.length-1));
  const macd    = calcMACD(candles);
  const boll    = calcBollinger(candles);
  const rsiData = calcRSI(candles, Math.min(GP.rsi, candles.length-2));
  const fib     = calcFibonacci(candles);
  const ichi    = candles.length >= 52 ? calcIchimoku(candles) : null;
  const stddev  = calcStdDev(candles);
  const adx     = calcADX(candles, Math.min(GP.adx, candles.length-2));

  const cur = ps.price;

  // Build signal objects with weight for each indicator
  const signals = {};

  // 1. MM
  if(sma10 && sma20) {
    signals.mm = {
      signal: sma10>sma20 ? 'bull' : 'bear',
      label:  (sma10>sma20 ? `SMA${GP.smaFast}>SMA${GP.smaSlow} ↑` : `SMA${GP.smaFast}<SMA${GP.smaSlow} ↓`),
      detail: `SMA${GP.smaFast}:${sma10.toFixed(2)} SMA${GP.smaSlow}:${sma20.toFixed(2)}${sma50?` SMA${GP.smaLong}:${sma50.toFixed(2)}`:''}`,
      weight: GP.wTrend * 0.83   // [GÉNOME DE PAIRE] tendance (défaut 1)
    };
  }

  // 2. MME
  if(ema9 && ema21) {
    signals.mme = {
      signal: ema9>ema21 ? 'bull' : 'bear',
      label:  (ema9>ema21 ? `EMA${GP.emaFast}>EMA${GP.emaSlow} ↑` : `EMA${GP.emaFast}<EMA${GP.emaSlow} ↓`),
      detail: `EMA${GP.emaFast}:${ema9.toFixed(2)} EMA${GP.emaSlow}:${ema21.toFixed(2)}${ema50?` EMA${GP.emaLong}:${ema50.toFixed(2)}`:''}`,
      weight: GP.wTrend   // [GÉNOME DE PAIRE] tendance (défaut 1,2)
    };
  }

  // 3. Stochastique
  if(stoch) {
    const overbought = stoch.k > 80;
    const oversold   = stoch.k < 20;
    signals.stoch = {
      signal: oversold?'bull':overbought?'bear': stoch.cross==='bull'?'bull':stoch.cross==='bear'?'bear':'neut',
      label:  oversold?`Survendu %K:${stoch.k.toFixed(0)}`:overbought?`Suracheté %K:${stoch.k.toFixed(0)}`:stoch.cross?`Croisement ${stoch.cross==='bull'?'↑':'↓'}`:`%K:${stoch.k.toFixed(0)} %D:${stoch.d.toFixed(0)}`,
      detail: `%K:${stoch.k.toFixed(1)} %D:${stoch.d.toFixed(1)}${stoch.cross?' '+stoch.cross:''}`,
      weight: GP.wMomentum * 0.92   // [GÉNOME DE PAIRE] momentum (défaut 1,2)
    };
  }

  // 4. MACD
  if(macd) {
    signals.macd = {
      signal: macd.hist>0?'bull':'bear',
      label:  macd.cross?`Croix MACD ${macd.cross==='bull'?'↑':'↓'}`:macd.hist>0?'MACD ↑':'MACD ↓',
      detail: `MACD:${macd.macd.toFixed(3)} Sig:${macd.signal.toFixed(3)} Hist:${macd.hist.toFixed(3)}`,
      weight: GP.wMomentum   // [GÉNOME DE PAIRE] momentum (défaut 1,3)
    };
  }

  // 5. Bollinger
  if(boll) {
    signals.boll = {
      signal: boll.pct>0.85?'bear':boll.pct<0.15?'bull':'neut',
      label:  boll.squeeze?'⚡ Squeeze':boll.pct>0.85?'Bande sup. ↓':boll.pct<0.15?'Bande inf. ↑':'Milieu',
      detail: `%B:${(boll.pct*100).toFixed(0)}% σ:${boll.std.toFixed(2)} BW:${(boll.bw*100).toFixed(1)}%`,
      weight: GP.wVolatility   // [GÉNOME DE PAIRE] volatilité (défaut 1)
    };
  }

  // 6. RSI
  if(rsiData) {
    const rsi = rsiData.value;
    signals.rsi = {
      signal: rsi<30?'bull':rsi>70?'bear': rsiData.divergence==='bull'?'bull':rsiData.divergence==='bear'?'bear':'neut',
      label:  rsi<30?`Survendu ${rsi.toFixed(0)}`:rsi>70?`Suracheté ${rsi.toFixed(0)}`:rsiData.divergence?`Div. ${rsiData.divergence==='bull'?'haussière':'baissière'}`:`RSI:${rsi.toFixed(0)}`,
      detail: `RSI:${rsi.toFixed(1)}${rsiData.divergence?' div:'+rsiData.divergence:''}`,
      weight: GP.wMomentum   // [GÉNOME DE PAIRE] momentum (défaut 1,3)
    };
  }

  // 7. Fibonacci
  if(fib) {
    const near = fib.nearest;
    signals.fib = {
      signal: near.dist<1.0?(fib.trend==='up'&&near.ratio>0.5?'bull':fib.trend==='down'&&near.ratio<0.5?'bear':'neut'):'neut',
      label:  near.dist<1.0?`Fib ${near.label} proche`:`Fib ${fib.trend==='up'?'↑':'↓'} swing`,
      detail: `Niv:${near.label}@${near.price.toFixed(2)} (${near.dist.toFixed(1)}% dist) ${fib.trend}`,
      weight: 0.8
    };
  }

  // 8. Ichimoku
  if(ichi) {
    signals.ichi = {
      signal: ichi.aboveCloud?'bull':ichi.belowCloud?'bear':'neut',
      label:  ichi.aboveCloud?'Au-dessus nuage ↑':ichi.belowCloud?'Sous nuage ↓':'Dans le nuage',
      detail: `T:${ichi.tenkan.toFixed(2)} K:${ichi.kijun.toFixed(2)} Cross:${ichi.tkCross||'none'}`,
      weight: GP.wTrend   // [GÉNOME DE PAIRE] tendance (défaut 1,2)
    };
  }

  // 9. Écart-type
  if(stddev) {
    signals.sigma = {
      signal: stddev.regime==='faible'?'neut':stddev.cv>0.005?'bear':'neut',   // [16/08] seuil recalibré (0.5% sur 20 bougies = vraie tension)
      label:  `Vol. ${stddev.regime} (σ:${stddev.sigma.toFixed(2)})`,
      detail: `ATR:${stddev.atr.toFixed(2)} CV:${(stddev.cv*100).toFixed(3)}%`,
      weight: 0.7
    };
  }

  // 10. ADX
  if(adx) {
    signals.adx = {
      signal: adx.trend==='bull'?'bull':adx.trend==='bear'?'bear':'neut',
      label:  adx.trend==='ranging'?`ADX:${adx.adx.toFixed(0)} range`:adx.trend==='bull'?`ADX:${adx.adx.toFixed(0)} ↑ fort`:`ADX:${adx.adx.toFixed(0)} ↓ fort`,
      detail: `ADX:${adx.adx.toFixed(1)} DI+:${adx.diPlus.toFixed(1)} DI-:${adx.diMinus.toFixed(1)} [${adx.strength}]`,
      weight: 1.1
    };
  }

  // [GO FIGURES 2 · 14/11/2026] AUCUNE FIGURE dans la décision (n° 74 du registre). Depuis le 09/08 (« NUTRITION »), la meilleure figure d'avant
  // (06 _detectPatterns, clôtures seules) entrait ici comme un signal, poids = sa confiance : sur 24 mois de vraies bougies, elle parlait sur 95,5 % des
  // bougies (surtout un faux « Double Top / Bottom », tolérance 2 %), sans aucun talent (z −2,7 à −0,2). Retirée sur le verdict ENTRE de
  // rejeu/porte_figures_2.js (règles écrites avant toute donnée, 14/11). Portée : avant le retrait, une seule voix avait une qualité (fundamental_v1,
  // talent à 15 min), que le retrait ne touche pas ; la décision commune apprise ne gagnait rien avant et ne gagne rien après (24 h : −13,6 → −2,7 pb
  // en bougies closes, −25,5 → −37,2 pb en bougie en cours). Mesuré après la relecture, hors règles : atScore seul, sans talent avec ou sans figure
  // (z ≤ 1,5). Non mesuré : la part fondamentale du composite (10f), la porte |atScore| ≥ 0,35 de 09c, techBonus de 10f / 10h, l'AA.
  // Les figures sur vraies bougies (06 _detectCandlePatterns) n'y entrent pas non plus (rejeu/porte_figures.js, 26/10).
  // signals.pattern n'est plus jamais posé : atScore, les signaux comptés par 10f / 10h (techBonus) et les listes de signaux à l'écran n'en ont plus.

  // ── Score pondéré ──────────────────────────────────────────
  let scoreSum=0, weightSum=0;
  Object.values(signals).forEach(s => {
    if(!s) return;
    scoreSum  += (s.signal==='bull'?1:s.signal==='bear'?-1:0) * (s.weight||1);
    weightSum += s.weight||1;
  });
  const atScore = weightSum>0 ? scoreSum/weightSum : 0;

  // ── Indicateurs bruts accessibles par le bot ──────────────
  const raw = { sma10, sma20, sma50, ema9, ema21, ema50, stoch, macd, boll,
                rsi:rsiData, fib, ichi, stddev, adx };

  const result = { signals, atScore, raw };
  return result;
}

const _fundCache = {};
function getFundamentalSignals(pair) {
  const ps = S.pairStates[pair];
  if(!ps) return null;
  const tick5 = Math.floor(S.cycle / 5);
  // [ÉCOLE VIVANTE · 10/10/2026] le cache est tenu PAR MODE. Avant, sa clé était la paire seule : une valeur calculée pendant le passage de l'AA (variation de SES
  // bougies fabriquées, SON marché LMSR, tendance de SON BTC) était relue par le cycle EV de la même paire s'il tombait dans les 5 cycles suivants (S.cycle est commun
  // aux modes) — 3 % des cycles EV avec l'AA figée, 5 à 8 % avec l'AA vivante (relecture adverse du 10/10, app réelle, 4 tirages de 6 h). Chaque mode relit le sien.
  if(_fundCache[pair] && _fundCache[pair].tick === tick5 && _fundCache[pair].mode === S.tradingMode) return _fundCache[pair].val;

  const agentById = id => S.agents.find(a=>a.id===id)||{score:0,conf:0.5};
  const macro  = agentById('macro_v1');
  const sent   = agentById('sentiment_v2');
  const geo    = agentById('geopolitic_v1');
  const sec    = agentById('security_v1');
  const nlp    = agentById('nlp_v1');
  const fund   = agentById('fundamental_v1');
  const vol    = agentById('volume_v1');
  const corr   = agentById('corr_v1');
  const vola   = agentById('volatility_v1');
  const onchain= agentById('onchain_v1');

  // ── Prix actif et tendances simulées (seront remplacées par vraies APIs) ──
  const cur     = ps.price;
  const ch24    = ps.pnl24h || 0;
  const volAvg  = ps.candles && ps.candles.length>1
    ? ps.candles.slice(-20).reduce((s,c)=>s+c.v,0)/20 : 1;


  // Dans une vraie intégration : fetch FRED, Bloomberg, Alpha Vantage, etc.
  // Ici chaque indicateur est calculé/estimé à partir des données disponibles

  // [S2 · 26/08/2026] Les 8 « fondamentaux » proxys (EPS/PE/rate/CPI/NFP/EV/marge/
  // croissance) sont SUPPRIMÉS : c'étaient la variation 24h, le volume et macro.score
  // recomptés sous d'autres noms (audit S2). Restent les sources réellement distinctes.
  const debtScore = sec.score * 0.7;      // Debt/Equity (security agent)
  const nlpScore  = nlp.score;            // [MACRO RÉEL · 26/09/2026] la tuile NLP lisait sentiment_v2 (RSI) : elle lit nlp_v1 (news CoinStats)

  // ── LMSR + corrélation BTC ─────────────────────────────────────────────
  // v6.5: LMSR score enriched with live agent consensus (not just qYes/qNo ratio)
  const _totalFit2 = S.agents.reduce((s,a) => s+(a.fitness||1), 0) || 1;
  const _agCons2   = S.agents.reduce((s,a) => {
    const sig = Math.abs(a.score||0) > 0.005 ? (a.score||0) : 0;  // v6.9: threshold réduit
    return s + sig * (a.fitness||1) / _totalFit2;
  }, 0);
  const lmsrRaw2   = (lmsrP(ps)-0.5)*2;
  const lmsrScore  = (lmsrRaw2 * 0.5 + _agCons2 * 0.5);  // blend LMSR + agents
  const btcPs     = S.pairStates['BTC/USDT'];
  const btcTrend  = (btcPs && pair!=='BTC/USDT') ? (btcPs.pnl24h>0?1:-1)*0.6 : 0;

  // ── Score fondamental pondéré — 10 indicateurs + 8 agents spécialisés ──
  const fundScore = Math.max(-1, Math.min(1,
    // [S2 · 26/08/2026, audit] AF DÉDUPLIQUÉE — avant : macro.score compté 3×
    // (rate/cpi/nfp, signes s'annulant) et 5 proxys du PRIX déguisés en fondamentaux
    // (eps/pe/ev/margin/growth = variation 24h & volume sous d'autres noms) : le
    // composite re-pesait le momentum en se croyant diversifié. Désormais : macro ×1,
    // un SEUL terme momentum honnête, poids libérés vers les sources indépendantes.
    // [S3 · 03/09/2026] macro (0.12) et nlp (0.09) RETIRÉS : l'audit a prouvé que
    // ces agents lisaient fundScore lui-même (circularité AF→agent→AF, aucune source
    // externe). Poids réalloués aux sources RÉELLES : momentum, sentiment (momentum
    // court), volatilité/volume/corr, tendance BTC. L'AF est plus petite et VRAIE.
    (ch24 > 1 ? 0.5 : ch24 < -1 ? -0.5 : ch24 * 0.4) * 0.12 +  // Momentum 24h (assumé)
    debtScore   * 0.04 +   // Debt/Equity (security agent)
    lmsrScore   * 0.14 +   // LMSR consensus interne
    sent.score  * 0.12 +   // Momentum court (ex « sentiment social », proxy assumé)
    geo.score   * 0.06 +   // Contexte 1 h / 4 h (ex « géopolitique », ex « régime de volatilité »)
    onchain.score * 0.06 + // Accumulation/distribution bougies (ex « on-chain »)
    sec.score   * 0.03 +   // Sécurité
    vol.score   * 0.04 +   // Volume/Flux
    corr.score  * 0.04 +   // Corrélation cross-asset
    vola.score * -0.03 +   // Volatilité inverse (haute vol → prudence)
    btcTrend    * 0.06     // Corrélation BTC
  ));

  const result = {
    // 10 indicateurs fondamentaux officiels
    // [S2 · 26/08] Les 8 tuiles « fondamentales » proxys sont remplacées par la vérité :
    // [MACRO RÉEL · 26/09/2026] les étiquettes disent ce que chaque tuile LIT (audit 26/09 : 7 tuiles sur 11 étaient du prix déguisé)
    momentum:{ score:(ch24 > 1 ? 0.5 : ch24 < -1 ? -0.5 : ch24 * 0.4), conf:0.70, label:'Momentum 24h', detail:'Variation du prix sur 24 h' },
    macroAgg:{ score:macro.score*0.7, conf:macro.conf,  label:'Macro',           detail:'Fear & Greed · dominance BTC · cap 24 h · '+macro.name },
    debt:    { score:debtScore,      conf:sec.conf,     label:'Volatilité (sécurité)', detail:'Écart-type du prix, agent sécurité · '+sec.name },
    nlp:     { score:nlpScore,       conf:nlp.conf,     label:'News',            detail:'Titres 24 h scorés (CoinStats) · '+nlp.name },
    // Facteurs contextuels agents
    lmsr:    { score:lmsrScore,      conf:1.0,          label:'LMSR marché',     detail:'Consensus agents interne ×'+S.agents.length },
    sentiment:{ score:sent.score,   conf:sent.conf,    label:'Élan (RSI)',      detail:'RSI et momentum des bougies · '+sent.name },
    geo:     { score:geo.score,      conf:geo.conf,     label:'Contexte 1 h / 4 h', detail:'Tendance des horizons 1 h et 4 h (EMA en unités d\'ATR) · '+geo.name },   // [CONTEXTE 1 H / 4 H · 26/09/2026]
    onchain: { score:onchain.score,  conf:onchain.conf, label:'Corps de bougies', detail:'Pression acheteuse/vendeuse des bougies · '+onchain.name },
    security:{ score:sec.score,      conf:sec.conf,     label:'Sécurité (volatilité)', detail:'Veto sur volatilité anormale · '+sec.name },
    volume:  { score:vol.score,      conf:vol.conf,     label:'Volume réel',     detail:'Volume des bougies Binance · '+vol.name },
    corr:    { score:btcTrend,       conf:0.70,         label:'Correl. BTC',     detail:pair==='BTC/USDT'?'Référence':'+60% suivi BTC' },
    // [GO CSS FINITIONS · 14/11/2026] (n° 92) les deux facteurs du score qui n'avaient pas de tuile (affichage seul : la décision ne lit que fundScore)
    corrAg:  { score:corr.score,     conf:corr.conf,    label:'Corrélations',    detail:'Agent corrélation entre actifs · '+corr.name },
    vola:    { score:vola.score,     conf:vola.conf,    label:'Volatilité',      detail:'Compte en sens inverse : haute volatilité → prudence · '+vola.name },
    // Score global
    fundScore
  };
  _fundCache[pair] = { tick: Math.floor(S.cycle / 5), mode: S.tradingMode, val: result };
  return result;
}

// Single-pair composite signal
function getCompositeSignal(pair) {
  const tech = getTechSignals(pair);
  const fund = getFundamentalSignals(pair);
  if(!tech||!fund) return null;
  const composite = Math.max(-1, Math.min(1, tech.atScore*0.60 + fund.fundScore*0.40));
  const pct       = Math.round((composite+1)*50);
  const signal    = composite > 0.2 ? 'LONG' : composite < -0.2 ? 'SHORT' : 'NEUTRE';
  const col       = composite > 0.2 ? 'var(--up)' : composite < -0.2 ? 'var(--down)' : 'var(--gold)';
  const strength  = Math.abs(composite)>0.6?'FORT':Math.abs(composite)>0.3?'MODÉRÉ':'FAIBLE';
  return { composite, pct, signal, col, strength, tech, fund };
}

// All-pairs composite signals map — used by bot + composite panel
function getAllCompositeSignals() {
  const map = {};
  Object.keys(PAIRS).forEach(pair => {
    map[pair] = getCompositeSignal(pair);
  });
  return map;
}

function renderTechnicalPanel() {
  const el = document.getElementById('technicalPanel'); if(!el) return;
  const tech = getTechSignals(S.activePair);
  if(!tech){ el.innerHTML='<div style="color:var(--t3);font-size:11px;padding:12px;">Données en cours…</div>'; return; }
  const { signals, atScore, raw } = tech;
  const atCol = atScore>0.2?'var(--up)':atScore<-0.2?'var(--down)':'var(--gold)';
  const atLbl = atScore>0.2?'↑ HAUSSIER':atScore<-0.2?'↓ BAISSIER':'→ NEUTRE';
  const atPct = ((atScore+1)*50).toFixed(0);

  const rows = [
    { icon:'📉', name:'1. Moyenne Mobile (MM)',                   sig: signals.mm    },
    { icon:'📈', name:'2. Moy. Mobile Exponentielle (MME)',       sig: signals.mme   },
    { icon:'🎲', name:'3. Oscillateur Stochastique (%K/%D)',      sig: signals.stoch },
    { icon:'⚡', name:'4. MACD (Conv./Div. MM)',                   sig: signals.macd  },
    { icon:'🎯', name:'5. Bandes de Bollinger',                   sig: signals.boll  },
    { icon:'💪', name:'6. RSI — Force Relative',                  sig: signals.rsi   },
    { icon:'🌀', name:'7. Retracements de Fibonacci',             sig: signals.fib   },
    { icon:'☁️', name:'8. Nuage d\'Ichimoku',                     sig: signals.ichi  },
    { icon:'📐', name:'9. Écart-type (σ / ATR)',                  sig: signals.sigma },
    { icon:'📡', name:'10. ADX — Mouvement Directionnel Moyen',   sig: signals.adx   },
  ].filter(r => r.sig);

  el.innerHTML = `<div class="signal-card">
    <div class="signal-card-header">
      <div class="signal-card-title">Analyse Technique — ${S.activePair}</div>
      <div class="signal-card-val" style="color:${atCol}">${atLbl}</div>
    </div>
    <div style="padding:6px 14px 4px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:8px;color:var(--t3);">Score pondéré — 10 indicateurs techniques</span>
        <span style="font-size:9px;font-weight:700;color:${atCol};">${atScore>=0?'+':''}${(atScore*100).toFixed(0)}%</span>
      </div>
      <div class="composite-bar-track">
        <div class="composite-bar-fill" style="width:${atPct}%;background:${atCol};box-shadow:0 0 6px ${atCol}44;"></div>
        <div style="position:absolute;left:50%;top:0;height:100%;width:1px;background:rgba(255,255,255,.2);"></div>
      </div>
    </div>
    ${rows.map(r => {
      const cls  = r.sig.signal==='bull'?'badge-bull':r.sig.signal==='bear'?'badge-bear':'badge-neut';
      const wBar = `<div style="height:1px;background:var(--s3);margin-top:2px;width:44px;"><div style="height:100%;width:${Math.min(100,(r.sig.weight||1)/1.5*100).toFixed(0)}%;background:${r.sig.signal==='bull'?'var(--up)':r.sig.signal==='bear'?'var(--down)':'var(--gold)'};"></div></div>`;
      return `<div class="signal-row-item">
        <div>
          <div class="signal-row-label">${r.icon} ${r.name}</div>
          <div class="signal-row-detail">${r.sig.detail||''}</div>
          ${wBar}
        </div>
        <span class="signal-row-badge ${cls}">${r.sig.label}</span>
      </div>`;
    }).join('')}
  </div>`;
}

function renderFundamentalPanel() {
  const el = document.getElementById('fundamentalPanel'); if(!el) return;
  const fund = getFundamentalSignals(S.activePair); if(!fund) return;
  const fundCol = fund.fundScore>0.2?'var(--up)':fund.fundScore<-0.2?'var(--down)':'var(--gold)';
  const fundLbl = fund.fundScore>0.2?'↑ POSITIF':fund.fundScore<-0.2?'↓ NÉGATIF':'→ NEUTRE';
  const fundPct = ((fund.fundScore+1)*50).toFixed(0);

  // [GO CSS FINITIONS · 14/11/2026] (ETAT n° 92) avant : « 10 Indicateurs Fondamentaux » annoncés pour 2 montrés (8 clés supprimées le 26/08, S2), « 14 facteurs »
  // pour 11 dans le score, et 5 facteurs du score sans tuile. Désormais : les 11 facteurs du score (getFundamentalSignals, même poids), du plus lourd au plus
  // léger, puis Macro et News, montrés pour information (retirés du score le 03/09, S3). Affichage seul.
  const officialItems = [
    {icon:'📡', key:'lmsr',      w:14},
    {icon:'💹', key:'momentum',  w:12},
    {icon:'⚡', key:'sentiment', w:12},
    {icon:'🌍', key:'geo',       w:6},
    {icon:'🕯️', key:'onchain',   w:6},
    {icon:'🔗', key:'corr',      w:6},
    {icon:'⚖️', key:'debt',      w:4},
    {icon:'📦', key:'volume',    w:4},
    {icon:'🧭', key:'corrAg',    w:4},
    {icon:'🔒', key:'security',  w:3},
    {icon:'🌊', key:'vola',      w:-3},
  ];
  const contextItems = [
    {icon:'🏦', key:'macroAgg'},
    {icon:'📰', key:'nlp'},
  ];

  function renderItem(icon, d, w) {
    if(!d) return '';
    const sc   = (w && w < 0) ? -d.score : d.score;   // [GO CSS FINITIONS · 14/11/2026] poids négatif (volatilité) : flèche et couleur = l'effet sur le score
    const cls  = sc>0.1?'badge-bull':sc<-0.1?'badge-bear':'badge-neut';
    const lbl  = sc>0.1?`↑ ${(sc*100).toFixed(0)}%`:sc<-0.1?`↓ ${(Math.abs(sc)*100).toFixed(0)}%`:'→ 0%';
    const col  = sc>=0?'var(--up)':'var(--down)';
    return `<div class="signal-row-item">
      <div style="flex:1;min-width:0;">
        <div class="signal-row-label">${icon} ${d.label}${w ? ` <span class="mk-w">poids ${w < 0 ? '−' + (-w) : w} %</span>` : ''}</div>
        <div class="signal-row-detail">${d.detail}</div>
        <div style="height:2px;background:var(--s3);border-radius:2px;margin-top:3px;width:55px;">
          <div style="height:100%;width:${(d.conf*100).toFixed(0)}%;background:${col};border-radius:2px;transition:width .4s;"></div>
        </div>
      </div>
      <span class="signal-row-badge ${cls}">${lbl}</span>
    </div>`;
  }

  el.innerHTML = `<div class="signal-card">
    <div class="signal-card-header">
      <div class="signal-card-title">Analyse Fondamentale — ${S.activePair}</div>
      <div class="signal-card-val" style="color:${fundCol}">${fundLbl}</div>
    </div>
    <div style="padding:6px 14px 4px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <span style="font-size:8px;color:var(--t3);">Score pondéré · ${officialItems.length} facteurs</span>
        <span style="font-size:9px;font-weight:700;color:${fundCol};">${fund.fundScore>=0?'+':''}${(fund.fundScore*100).toFixed(0)}%</span>
      </div>
      <div class="composite-bar-track">
        <div class="composite-bar-fill" style="width:${fundPct}%;background:${fundCol};box-shadow:0 0 6px ${fundCol}44;"></div>
        <div style="position:absolute;left:50%;top:0;height:100%;width:1px;background:rgba(255,255,255,.2);"></div>
      </div>
    </div>
    <div style="padding:4px 14px 2px;">
      <div style="font-size:7px;font-weight:700;color:var(--ice);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;padding-top:4px;border-top:1px solid var(--border);">
        📋 Dans le score · ${officialItems.length} facteurs
      </div>
      ${officialItems.map(({icon,key,w}) => renderItem(icon, fund[key], w)).join('')}
    </div>
    <div style="padding:4px 14px 8px;">
      <div style="font-size:7px;font-weight:700;color:var(--gold);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;padding-top:6px;border-top:1px solid var(--border);">
        🧩 Pour information · hors score
      </div>
      ${contextItems.map(({icon,key}) => renderItem(icon, fund[key])).join('')}
    </div>
  </div>`;
}

// Cache composite signals across pages
let _compSigsCache = null, _compSigsTick = -1;
function getCachedCompositeSignals() {
  if(_compSigsTick === S.cycle) return _compSigsCache;
  _compSigsCache = getAllCompositeSignals();
  _compSigsTick = S.cycle;
  return _compSigsCache;
}

function renderCompositePanel() {
  const el = document.getElementById('compositePanel');
  if(!el) return;

  const allSigs = getCachedCompositeSignals();
  const pairs   = Object.keys(PAIRS);

  // ── Inject composite into LMSR + nudge agents for ALL pairs ──
  // [MARCHÉ RÉPARÉ · 30/09/2026] en EV / RE plus rien n'écrit le marché d'une paire que les mises des agents (03 _mktCycle) : cette injection reste en AA
  if (!((typeof _mktOn === 'function') && _mktOn())) pairs.forEach(pair => {
    const comp = allSigs[pair];
    const ps   = S.pairStates[pair];
    if(!comp || !ps) return;

    // Target probability from composite: map [-1,+1] → [0.15, 0.85]
    const targetProb = 0.5 + comp.composite * 0.35;
    const curProb    = lmsrP(ps);
    const diff       = targetProb - curProb;

    // Soft nudge toward target — proportional to signal strength + confidence
    const strength   = Math.abs(comp.composite) * (comp.tech?.confidence || 0.5);
    const nudge      = diff * strength * 4;   // max ~±2 per tick

    if(nudge > 0)      ps.qYes = Math.max(10, ps.qYes + nudge);
    else if(nudge < 0) ps.qNo  = Math.max(10, ps.qNo  - nudge);

    // Mean-revert total volume toward 100+100 baseline to prevent unbounded growth
    const total    = ps.qYes + ps.qNo;
    if(total > 800) {
      const ratio  = 200 / total;
      ps.qYes      = Math.max(10, ps.qYes * ratio);
      ps.qNo       = Math.max(10, ps.qNo  * ratio);
    }
  });

  // [S3 · 03/09/2026] Le tirage des agents vers le composite (tick%15, avec bruit
  // aléatoire) est SUPPRIMÉ — 2e tête de la boucle de faux consensus (la 1re tranchée
  // en S2). Les agents n'apprennent que par learnFromOutcome (03) et lessonNudge.

  // ── Render per-pair grid ──
  el.innerHTML = `
  <div class="signal-card" style="overflow:hidden;">
    <div class="signal-card-header">
      <div class="signal-card-title">Signal Composite — toutes paires</div>
      <div class="pill pill-pur" style="font-size:8px;">BOT ACTIF</div>
    </div>
    ${pairs.map(pair => {
      const comp = allSigs[pair];
      const cfg  = PAIRS[pair];
      if(!comp) return `<div class="signal-row-item" style="opacity:.4;"><div>${pair}</div><span style="color:var(--t3);font-size:9px;">—</span></div>`;

      const { composite, signal, col, strength, tech, fund } = comp;
      const pct    = Math.round((composite+1)*50);
      const tCol   = tech.atScore  >= 0 ? 'var(--up)' : 'var(--down)';
      const fCol   = fund.fundScore >= 0 ? 'var(--up)' : 'var(--down)';
      const sigs   = Object.values(tech.signals||{}).filter(Boolean);
      const bulls  = sigs.filter(s=>s.signal==='bull').length;
      const bears  = sigs.filter(s=>s.signal==='bear').length;
      const neuts  = sigs.filter(s=>s.signal==='neut').length;
      const actionIcon = signal==='LONG'?'↑':signal==='SHORT'?'↓':'—';
      const actionBg   = signal==='LONG'?'rgba(0,232,122,.1)':signal==='SHORT'?'rgba(255,61,107,.1)':'rgba(245,200,66,.07)';

      // Top 2 confirming indicators
      const topSigs = sigs
        .filter(s => (signal==='LONG'&&s.signal==='bull')||(signal==='SHORT'&&s.signal==='bear'))
        .slice(0,2)
        .map(s => s.label.replace(/[↑↓]/g,'').trim())
        .join(' · ');

      return `
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);">
        <!-- Header row: pair + action badge -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:10px;font-weight:700;color:${cfg.color};">${pair}</span>
            <span style="font-size:8px;color:var(--t3);">${(composite*100>=0?'+':'')+  (composite*100).toFixed(0)}%</span>
          </div>
          <div style="display:flex;align-items:center;gap:5px;">
            <span style="font-size:8px;color:var(--t3);">${strength}</span>
            <span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:8px;background:${actionBg};color:${col};border:1px solid ${col}33;">${actionIcon} ${signal}</span>
          </div>
        </div>
        <!-- Global bar -->
        <div class="composite-bar-track" style="height:5px;margin-bottom:5px;">
          <div class="composite-bar-fill" style="width:${pct}%;background:${col};box-shadow:0 0 5px ${col}44;height:100%;"></div>
          <div style="position:absolute;left:50%;top:0;height:100%;width:1px;background:rgba(255,255,255,.15);"></div>
        </div>
        <!-- AT / AF sub-bars -->
        <div style="display:flex;gap:6px;margin-bottom:5px;">
          <div style="flex:1;">
            <div style="font-size:7px;color:var(--t3);margin-bottom:1px;">AT ${tech.atScore>=0?'+':''}${(tech.atScore*100).toFixed(0)}%</div>
            <div style="height:3px;background:var(--s3);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${Math.round((tech.atScore+1)*50)}%;background:${tCol};border-radius:2px;"></div>
            </div>
          </div>
          <div style="flex:1;">
            <div style="font-size:7px;color:var(--t3);margin-bottom:1px;">AF ${fund.fundScore>=0?'+':''}${(fund.fundScore*100).toFixed(0)}%</div>
            <div style="height:3px;background:var(--s3);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${Math.round((fund.fundScore+1)*50)}%;background:${fCol};border-radius:2px;"></div>
            </div>
          </div>
        </div>
        <!-- Consensus pills + top indicators -->
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
          <span style="font-size:8px;color:var(--up);">↑${bulls}</span>
          <div style="width:40px;height:4px;background:var(--s3);border-radius:2px;overflow:hidden;display:flex;">
            <div style="flex:${bulls};background:var(--up);"></div>
            <div style="flex:${neuts};background:var(--gold);opacity:.4;"></div>
            <div style="flex:${bears};background:var(--down);"></div>
          </div>
          <span style="font-size:8px;color:var(--down);">${bears}↓</span>
          ${topSigs ? `<span style="font-size:7px;color:var(--t3);margin-left:2px;">${topSigs}</span>` : ''}
        </div>
      </div>`;
    }).join('')}
    <div style="padding:8px 14px;font-size:8px;color:var(--t3);line-height:1.6;">
      ↑ 10 indicateurs AT + 14 facteurs AF injectés dans le LMSR de chaque paire · Signal composite indépendant par paire
    </div>
  </div>`;
}


function renderAnalysis() {
  renderTechnicalPanel();
  renderFundamentalPanel();
  renderCompositePanel();
}

function mVote(id, support) {
  const p = S.proposals.find(x=>x.id===id);
  if(!p||p.userVoted) return;
  if(support) p.forVotes += 500;
  else p.againstVotes += 500;
  p.userVoted = true;
  S.chainLog.push({ icon:'🗳', desc:`Vote humain #${id}: ${support?'POUR':'CONTRE'}`, hash:rndHash(), time:nowStr() });
  showToast(support?'✓ Vote POUR enregistré on-chain':'✓ Vote CONTRE enregistré on-chain');
  patchGovCards();
  renderChain();
}

function setMobileTf(tf, el) {
  S.tf = tf;
  document.querySelectorAll('.tf-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  drawMobileChart();
}

// ============================================================
// ENHANCED TOAST STACK — v3.1
// ============================================================
const _toastQueue = [];
let   _toastCount = 0;

const TOAST_ICONS = {
  '🧬': { color: 'var(--up)',   bar: '#00e87a' },
  '💤': { color: 'var(--pur)',  bar: '#a78bfa' },
  '🌐': { color: 'var(--gold)', bar: '#f5c842' },
  '✅': { color: 'var(--up)',   bar: '#00e87a' },
  '💰': { color: 'var(--up)',   bar: '#00e87a' },
  '📉': { color: 'var(--down)', bar: '#ff3d6b' },
  '⚠':  { color: 'var(--gold)', bar: '#f5c842' },
  '❌': { color: 'var(--down)', bar: '#ff3d6b' },
  '▶':  { color: 'var(--ice)',  bar: '#38d4f5' },
  '⏸':  { color: 'var(--gold)', bar: '#f5c842' },
  '🔄': { color: 'var(--ice)',  bar: '#38d4f5' },
  '🔖': { color: 'var(--pur)',  bar: '#a78bfa' },
  'default': { color: 'var(--t2)', bar: '#38d4f5' },
};

// v7.0: Toast filtering par niveau
// 'critical' = toujours visible (erreurs)
// 'user'     = toujours visible (actions user)
// 'info'     = silencieux par défaut (bot trades, evolutions)
// Mode verbeux: S.toastVerbose = true pour tout voir
function showToast(msg, duration = 2800, level = 'info') {
  // Level 'info' masqué par défaut — visibles seulement si mode verbeux
  if(level === 'info' && S.toastVerbose !== true) {
    // v7.12 fix: toasts info ne polluent plus chainLog (icon cassée + truncate destructif)
    // Seulement incrémenter le compteur silencé pour badge
    S._silencedCount = (S._silencedCount || 0) + 1;
    return;
  }
  // [MODES SÉPARÉS · 10/10/2026] un message produit par un mode qui n'est PAS à l'écran (02 _modeBehind) dit son nom, après son icône : « ⛔ [AA] Perte max · … ».
  // Avant, rien ne le distinguait d'un message du mode affiché (sonde du 10/10 : « ⚠ ETH/USDT SHORT ouvert … » de l'EV sur l'écran de l'AA).
  // L'ÉCOLE derrière un autre écran ne montre que le critique : ses sorties de routine (trailing, anti-zombie, perte max d'un trade d'argent fictif) restent au
  // journal, marquées AA, sans passer devant l'écran de l'EV ou du RE. EV et RE derrière l'écran : tout ce qui se serait affiché s'affiche, étiqueté.
  if (typeof _modeBehind === 'function' && _modeBehind()) {
    if (S.tradingMode === 'sim' && level !== 'critical') { S._silencedCount = (S._silencedCount || 0) + 1; return; }
    msg = _toastModeTag(msg, S.tradingMode);
  }
  // Dedupe: skip if same message shown in last 1.5s
  const now = Date.now();
  if(window._lastToastMsg === msg && (now - (window._lastToastTs||0)) < 1500) return;
  window._lastToastMsg = msg;
  window._lastToastTs  = now;
  _showToast_orig(msg, duration);
}
// « ⛔ Perte max · … » → « ⛔ [AA] Perte max · … » : le nom du mode après l'icône de tête (celle que _showToast_orig détache), sinon en tête
function _toastModeTag(msg, mode) {
  const s = String(msg), lab = '[' + ((typeof _modeLab === 'function') ? _modeLab(mode) : mode) + '] ';
  const m = s.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?\s*/u);
  return m ? (m[0].trimEnd() + ' ' + lab + s.slice(m[0].length)) : (lab + s);
}
window._toastModeTag = _toastModeTag;
function _showToast_orig(msg, duration = 2800) {
  const stack = document.getElementById('toastStack');
  if(!stack) return;

  // Parse: extract leading emoji as icon
  const emojiMatch = msg.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
  const icon  = emojiMatch ? emojiMatch[0] : '◆';
  const body  = emojiMatch ? msg.slice(icon.length).trim() : msg;

  // Split on · for title/sub
  const parts = body.split(' · ');
  const title = parts[0] || body;
  const sub   = parts.slice(1).join(' · ');

  const theme = TOAST_ICONS[icon] || TOAST_ICONS['default'];

  const id   = 'ti_' + (++_toastCount);
  const item = document.createElement('div');
  item.className = 'toast-item';
  item.id = id;
  item.style.borderColor = `rgba(${hexToRgb(theme.bar) || '56,212,245'},.15)`;
  item.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      <div class="toast-title" style="color:${theme.color}">${escHtml(title)}</div>
      ${sub ? `<div class="toast-sub">${escHtml(sub)}</div>` : ''}
    </div>
    <div class="toast-bar" style="background:${theme.bar};animation-duration:${duration}ms"></div>`;
  stack.appendChild(item);

  // Limit visible toasts to 4
  const items = stack.querySelectorAll('.toast-item:not(.removing)');
  if(items.length > 4) {
    dismissToast(items[0].id);
  }

  setTimeout(() => dismissToast(id), duration);
}

function dismissToast(id) {
  const el = document.getElementById(id);
  if(!el || el.classList.contains('removing')) return;
  el.classList.add('removing');
  setTimeout(() => el.remove(), 380);
}

function hexToRgb(hex) {
  if(!hex || !hex.startsWith('#')) return '56,212,245';
  const h = hex.replace('#','');
  const full = h.length === 3 ? h.split('').map(x=>x+x).join('') : h;
  const m = full.match(/.{2}/g);
  if(!m || m.length < 3) return '56,212,245';
  return m.slice(0,3).map(x => parseInt(x,16)).join(',');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================================
// SIMULATION TICK — multi-pair
// ============================================================
let tick = 0;

// [WAKE LOCK ECRAN · 02/08/2026] Android (surtout Samsung) suspend les timers d'un WebView au
// PREMIER PLAN quand l'ecran est statique/inactif (gestion batterie) -> gels de plusieurs
// secondes alors que document.hidden reste false (d'ou les logs 'ecran visible, blocage reel'
// avec heap sain et simTick rapide : ce n'est pas un blocage JS, c'est l'OS qui fige le JS).
// On demande un verrou d'ecran pour empecher cette mise en veille ; il est relache quand la
// page est masquee, on le re-acquiert au retour et periodiquement par securite.
// [SONDE LONGTASK PERMANENTE · 08/08/2026] L'observateur longtask et le chrono nominatif
// annonces dans les entetes du fichier avaient DISPARU du code (seuls les commentaires
// restaient) -> tous les gels "ecran visible" etaient inattribues. Reinstalles ici, en
// PERMANENT : le verdict est ecrit DANS la ligne de gel elle-meme.
//  - "JS ⏱ Xs/N · op nom" = vrai blocage JS de X s cumulees sur N longtasks, la derniere
//    operation lourde annoncee via _perfOp est nommee.
//  - "JS inactif (suspension OS)" = aucun longtask pendant le trou : l'OS a fige la boucle
//    (Samsung suspend les timers d'un WebView meme au premier plan) — pas un bug code.
(function _auraLongTaskProbe(){
  try {
    if (typeof PerformanceObserver === 'undefined') return;
    window._auraLongTasks = window._auraLongTasks || [];
    var _obs = new PerformanceObserver(function(list){
      try {
        list.getEntries().forEach(function(e){
          window._auraLongTasks.push({ start: e.startTime, dur: e.duration });
        });
        if (window._auraLongTasks.length > 40) window._auraLongTasks.splice(0, window._auraLongTasks.length - 40);
      } catch(err){}
    });
    _obs.observe({ entryTypes: ['longtask'] });
  } catch(e){}
})();
// [GEL BOOT · 11/09/2026] SONDE LoAF (long-animation-frame, Chrome ≥ 123 / WebView ≥ 123) :
// pour chaque frame > 500 ms, le NAVIGATEUR nomme lui-même le script (fichier:position,
// fonction) et son appelant (TimerHandler, event-listener, IDBRequest.onsuccess, fetch/then,
// continuation await…), plus la part de rendu (style/layout). Couvre les continuations
// await et les callbacks IDB, invisibles pour le chrono de 00. Reprise dans la ligne 🐌
// et dans S.perfLog.gels (persistant). Si non supporté : _auraLoafSupported=false, rien d'autre.
(function _auraLoafProbe(){
  try {
    if (typeof window === 'undefined') return;
    // texte d'attribution d'une frame (partagé : ligne 🐌 au tick, rattachement tardif)
    window._auraLoafStr = function(f){
      try {
        var top = (f && f.scripts && f.scripts[0]) || null;
        return ' · LoAF ' + (f.dur/1000).toFixed(1) + 's'
          + (top ? (' ' + (top.src || '?') + ':' + (top.fn || 'anonyme') + '@' + top.pos + ' ← ' + (top.inv || top.type || '?') + ' ' + (top.dur/1000).toFixed(1) + 's') : ' sans script')
          + ' · rendu ' + ((f.render || 0)/1000).toFixed(1) + 's';
      } catch(e) { return ''; }
    };
    // [20260911b] RATTACHEMENT TARDIF : la frame LoAF n'est finalisée qu'après le rendu qui suit le
    // longtask, donc APRÈS le tick de simTick qui a déjà écrit le gel (« LoAF aucun »). Quand elle
    // arrive, on la rattache au dernier gel dont la fenêtre [pStart, pEnd] la chevauche et on
    // réécrit la ligne 🐌 (retrouvée par son hash) si elle est encore dans le journal.
    window._auraLoafAttach = function(f){
      try {
        var S0 = null; try { S0 = (0, eval)('S'); } catch(e) {}
        if (!S0 || !S0.perfLog || !Array.isArray(S0.perfLog.gels)) return false;
        var end = f.start + f.dur, gels = S0.perfLog.gels;
        for (var i = gels.length - 1; i >= 0 && i >= gels.length - 5; i--) {
          var g = gels[i];
          if (!g || typeof g.pStart !== 'number' || typeof g.pEnd !== 'number') continue;
          if (end > g.pStart && f.start <= g.pEnd) {
            if (g.loaf && g.loaf.dur >= f.dur) return false;   // déjà une frame au moins aussi longue
            g.loaf = { dur: f.dur, block: f.block, script: f.script, render: f.render, scripts: f.scripts };
            if (g.hash && Array.isArray(S0.chainLog)) {
              for (var k = S0.chainLog.length - 1; k >= 0; k--) {
                var line = S0.chainLog[k];
                if (line && line.hash === g.hash && typeof line.desc === 'string') { line.desc = line.desc.replace(/ · LoAF .*$/, '') + window._auraLoafStr(f); break; }
              }
            }
            return true;
          }
        }
      } catch(e) {}
      return false;
    };
    if (typeof PerformanceObserver === 'undefined') { window._auraLoafSupported = false; return; }
    var sup = PerformanceObserver.supportedEntryTypes;
    if (!sup || sup.indexOf('long-animation-frame') === -1) { window._auraLoafSupported = false; return; }
    window._auraLoafSupported = true;
    window._auraLoafs = window._auraLoafs || [];
    var _obs = new PerformanceObserver(function(list){
      try {
        list.getEntries().forEach(function(e){
          if (!e || !(e.duration >= 500)) return;
          var scripts = [];
          try {
            (e.scripts || []).forEach(function(sc){
              scripts.push({
                dur: Math.round(sc.duration || 0),
                inv: String(sc.invoker || ''),
                type: String(sc.invokerType || ''),
                fn: String(sc.sourceFunctionName || ''),
                src: String(sc.sourceURL || '').split('?')[0].split('/').pop(),
                pos: (sc.sourceCharPosition != null) ? sc.sourceCharPosition : -1,
                layout: Math.round(sc.forcedStyleAndLayoutDuration || 0),
                pause: Math.round(sc.pauseDuration || 0)
              });
            });
          } catch(err) {}
          scripts.sort(function(a, b){ return b.dur - a.dur; });
          var scriptMs = 0; scripts.forEach(function(sc){ scriptMs += sc.dur; });
          var end = e.startTime + e.duration;
          var renderMs = (e.renderStart && e.renderStart > 0) ? Math.max(0, Math.round(end - e.renderStart)) : 0;
          var rec = { start: e.startTime, dur: Math.round(e.duration), block: Math.round(e.blockingDuration || 0), script: scriptMs, render: renderMs, scripts: scripts.slice(0, 3) };
          window._auraLoafs.push(rec);
          if (window._auraLoafs.length > 40) window._auraLoafs.splice(0, window._auraLoafs.length - 40);
          try { window._auraLoafAttach(rec); } catch(err) {}
          // [20260911b] anneau DURABLE des frames ≥ 1 s, indépendant des gels : même sans trou
          // mesuré par simTick, les scripts nommés par le navigateur survivent dans le snapshot.
          if (rec.dur >= 1000) {
            try {
              var S0 = null; try { S0 = (0, eval)('S'); } catch(err) {}
              if (S0) {
                if (!S0.perfLog || typeof S0.perfLog !== 'object') S0.perfLog = { gels: [], lent: [], heap: [], boots: [] };
                if (!Array.isArray(S0.perfLog.loaf)) S0.perfLog.loaf = [];
                S0.perfLog.loaf.push({ t: Date.now(), time: new Date().toLocaleString(), pStart: rec.start, dur: rec.dur, block: rec.block, script: rec.script, render: rec.render, scripts: rec.scripts });
                if (S0.perfLog.loaf.length > 20) S0.perfLog.loaf.splice(0, S0.perfLog.loaf.length - 20);
              }
            } catch(err) {}
          }
        });
      } catch(err) {}
    });
    _obs.observe({ type: 'long-animation-frame', buffered: true });
  } catch(e) { try { window._auraLoafSupported = false; } catch(x) {} }
})();

// [GEL BOOT · 11/09/2026] RELEVÉ MÉMOIRE PÉRIODIQUE : heap JS + nœuds DOM toutes les 10 min dans
// S.perfLog.heap (144 points = 24 h), persistant dans le snapshot : donne la PENTE Mo/h (lue par
// la sonde Mémoire du Guardian) au lieu d'une lecture isolée dans une ligne de gel (228 Mo au
// boot du 10/09, 468 Mo après ~23 h le 09/09). Premier point à +1 min (état restauré).
(function _auraHeapSampler(){
  try {
    if (typeof window === 'undefined' || window._auraHeapSamplerOn) return;
    window._auraHeapSamplerOn = true;
    function _sample(){
      try {
        var S0 = null; try { S0 = (0, eval)('S'); } catch(e) {}
        if (!S0 || !S0.agents) return;
        if (!S0.perfLog || typeof S0.perfLog !== 'object') S0.perfLog = { gels: [], lent: [], heap: [], boots: [] };
        if (!Array.isArray(S0.perfLog.heap)) S0.perfLog.heap = [];
        var h = null, l = null;
        try { var pm = performance.memory; if (pm && pm.usedJSHeapSize) { h = Math.round(pm.usedJSHeapSize/1048576); l = Math.round(pm.jsHeapSizeLimit/1048576); } } catch(e) {}
        var d = null; try { d = document.getElementsByTagName('*').length; } catch(e) {}
        S0.perfLog.heap.push({ t: Date.now(), time: new Date().toLocaleString(), heap: h, limit: l, dom: d, cycle: S0.cycle, page: S0.currentPage });
        if (S0.perfLog.heap.length > 144) S0.perfLog.heap.splice(0, S0.perfLog.heap.length - 144);
      } catch(e) {}
    }
    setTimeout(_sample, 60000);
    setInterval(_sample, 600000);
  } catch(e) {}
})();
// Marqueur d'operation lourde : chaque fonction suspecte s'annonce (saveState, backups
// Guardian, etc.) pour que le prochain gel porte son NOM au lieu de "unknown".
if (typeof window !== 'undefined' && !window._perfOp) {
  window._perfOp = function(name){
    try {
      window._auraLastOp = { name: String(name), at: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now() };
    } catch(e){}
  };
}

(function _auraScreenWakeLock(){
  var _wl = null;
  async function _acquire(){
    try {
      if (typeof document === 'undefined' || document.hidden) return;
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !_wl) {
        _wl = await navigator.wakeLock.request('screen');
        _wl.addEventListener('release', function(){ _wl = null; });
      }
    } catch(e) { _wl = null; }
  }
  try {
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'visible') _acquire();
    });
    _acquire();
    setInterval(_acquire, 30000);
  } catch(e) {}
})();

// ═══ [1b-b · 15/09/2026] PROJECTION DES KLINES BINANCE DANS ps.candles (EV / RE) ═══
// La tf du mode (_getActiveRealTimeframe, 15 m) = celle que la porte lit : une seule série, une seule vérité.
// Série périmée (_realCandlesStale, critère des portes) → ps.candles inchangé, ps._candlesStale = true : on ne
// fabrique rien, l'analyse reste sur la dernière vérité connue et la porte refuse d'ouvrir (10g/08).
// Pas de réallocation si la dernière bougie n'a pas bougé (même ts, même close). Les bougies gardent o/h/l/c/v
// (ce que lisent getTechSignals, scouts, patterns, régime) et portent leur ts Binance.
// [GÉNOME DE PAIRE · 17/09/2026] une paire par jour (clé jour locale), seulement en EV/RE, seulement si la paire a
// assez d'histoire réelle (≥ 5 trades du mode) : sans résultats, muter serait du bruit.
function _pairGenomeRollover() {
  if (!(S.tradingMode === 'paperReal' || S.tradingMode === 'real')) return 0;
  if (typeof _pairGenomeEvolve !== 'function') return 0;
  const d = new Date(), day = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  if (!S._pairGenomeDay) S._pairGenomeDay = {};
  let n = 0;
  _livePairs().some(pair => {   // [PAIRES VIVANTES · 10/10/2026] une paire retirée ne prend plus le tour du jour
    const ps = S.pairStates[pair];
    if (!ps || (ps.totalTrades || 0) < 5) return false;
    if (S._pairGenomeDay[pair] === day) return false;
    S._pairGenomeDay[pair] = day;
    const r = _pairGenomeEvolve(pair, 0.15, Number(ps.totalPnlUsd) || 0);
    if (r && S.chainLog) {
      S.chainLog.push({ icon: '\uD83E\uDDEC', desc: 'G\u00e9nome de paire ' + pair + ' : ' + r.changed + '/' + r.genes + ' g\u00e8nes mut\u00e9s (P&L de r\u00e9f\u00e9rence ' + (Number(ps.totalPnlUsd) || 0).toFixed(2) + ' $)', hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    n++; return true;   // une seule paire par passage
  });
  return n;
}
window._pairGenomeRollover = _pairGenomeRollover;

function _projectRealCandles() {
  if (!(S.tradingMode === 'paperReal' || S.tradingMode === 'real')) return 0;
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  let n = 0;
  _livePairEntries().forEach(([pair, ps]) => {   // [PAIRES VIVANTES · 10/10/2026]
    if (!ps) return;
    const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf]) || [];
    const stale = (typeof _realCandlesStale === 'function') ? _realCandlesStale(pair, tf) : (arr.length < 30);
    if (stale) { ps._candlesStale = true; return; }
    const src = arr.slice(-60);
    const lastK = src[src.length - 1];
    const cur = ps.candles;
    if (cur && cur._real && cur._srcTs === lastK.ts && cur.length === src.length && cur[cur.length - 1].c === lastK.c) { ps._candlesStale = false; return; }
    const out = src.map(k => { const o = { o: k.o, h: k.h, l: k.l, c: k.c, v: k.v, ts: k.ts }; if (k && k._gap === true) o._gap = true; if (k && k._r) o._r = 1; return o; });   // [DÉGEL DES VOIX · 02/10/2026] marques gardées : bouche-trou (une série trouée n'est plus projetée : 02 _realCandlesStale) et bougie REST (_r : source du volume, lue par volume_v1)
    out._srcTs = lastK.ts; out._real = true;
    ps.candles = out;
    ps._candlesStale = false;
    // variation sur la fenêtre (même sémantique que pour AA : régime, 02:656) — bornée ±40 %
    const c0 = out[0].c;
    if (c0 > 0) ps.pnl24h = Math.max(-40, Math.min(40, ((lastK.c - c0) / c0) * 100));
    n++;
  });
  return n;
}
window._projectRealCandles = _projectRealCandles;

// [MARCHÉ LMSR À PART · 28/09/2026] Le portefeuille de marché d'un agent : a.lmsrWallet — sa fitness au dernier jugement (_lmsrRefill, appelée par la porte
// unique de 03 à chaque écriture de la fitness : jugement, abstention, recompute), moins le coût de ses ordres depuis (_lmsrSpend, qui compte aussi la
// dépense du génome dans a.lmsrSpent ; 07 remet les deux à la naissance). Sans portefeuille (agent d'avant, première passe) : sa fitness, comme avant.
// Un coût non fini (S.b nul → exp(q/0) → NaN) n'est ni retiré ni compté : avant il rendait la fitness NaN.
function _lmsrWallet(a) { if (!a) return 0; if (typeof a.lmsrWallet !== 'number' || !isFinite(a.lmsrWallet)) a.lmsrWallet = Number(a.fitness) || 0; return a.lmsrWallet; }
function _lmsrRefill(a) { if (a) a.lmsrWallet = Number(a.fitness) || 0; return a ? a.lmsrWallet : 0; }
function _lmsrSpend(a, cost) { if (a && isFinite(cost)) { a.lmsrWallet = _lmsrWallet(a) - cost; a.lmsrSpent = (Number(a.lmsrSpent) || 0) + cost; } }
window._lmsrWallet = _lmsrWallet; window._lmsrRefill = _lmsrRefill; window._lmsrSpend = _lmsrSpend;
// Rejeu avant livraison (app réelle en accéléré, 81 h, 9 fenêtres de 9 h, 2 tirages, ce code, comparé au même rejeu avec 20260928a) : tirage 1 : 0 trades, net 0 $ ; tirage 2 : 0 trades, net 0 $ ; 0 erreur. Fitness vivante hors de sa
// définition en fin de fenêtre (le débit du marché) : avec ce code : tirage 1 0 sur 144, tirage 2 0 sur 141 — avec 20260928a (même harnais, mêmes fenêtres) : 12 sur 144 (écart moyen -242 T$, jusqu'à -737) et 15 sur 142 (écart moyen -228 T$, jusqu'à -580). sièges ≤ 80 T$ en fin de fenêtre (cumul des 9 fenêtres) : ce code 40 vivante / 38 bougie et 38 vivante / 32 bougie — 20260928a : 43 vivante / 35 bougie et 42 vivante / 31 bougie. fitness vivante = horizons pour les sièges au record complet en fin de fenêtre : ce code 97/97 et 96/96 — 20260928a : 90/100 et 85/96.
// Évolutions (hook du harnais dans triggerEvolution) : tirage 1 : 78 évolutions (03 (après jugements) : 78), cible = le plus faible par fitness vivante 78, = le siège que les horizons retireraient 78, désaccord des deux définitions 16, cible au record complet 18, cible débitée 0 — tirage 2 : 77 évolutions (03 (après jugements) : 77), cible = le plus faible par fitness vivante 77, = le siège que les horizons retireraient 77, désaccord des deux définitions 19, cible au record complet 18, cible débitée 0 — 20260928a : 77 et 77 évolutions. Nouveau-nés : ce code : tirage 1 39 nouveau-nés en fin de fenêtre, fitness moyenne 436, 11 sous 150, 4 sans preuve (dont 0 sous 350) ; tirage 2 42 nouveau-nés en fin de fenêtre, fitness moyenne 385, 16 sous 150, 6 sans preuve (dont 0 sous 350) — 20260928a : 42 nouveau-nés en fin de fenêtre, fitness moyenne 345, 14 sous 150, 4 sans preuve (dont 1 sous 350) ; 41 nouveau-nés en fin de fenêtre, fitness moyenne 379, 12 sous 150, 6 sans preuve (dont 1 sous 350). Dépense de marché : tirage 1 : 81 sièges-fenêtres avec dépense, 1025 T$ en moyenne par siège et par fenêtre de 9 h, max 15651 ; tirage 2 : 85 sièges-fenêtres avec dépense, 1027 T$ en moyenne par siège et par fenêtre de 9 h, max 18595.
// ═══ [ÉCOLE VIVANTE · 10/10/2026] LE MARCHÉ DE L'ÉCOLE (AA) : UNE BOUGIE FABRIQUÉE PAR PAIRE ═══
// Le corps est celui du bloc « New candle » de simTick, déplacé tel quel (mêmes formules, même ordre des tirages) pour être appelé de DEUX endroits :
//  · AA à l'écran : par simTick, un tick sur trois, comme avant ;
//  · AA en play derrière un autre écran : par le multiplexeur de simTick, à chaque passage de l'AA (un tick sur trois aussi), après ses cycles.
// Avant, seul le premier existait : derrière l'EV, les cycles de l'AA tournaient (≈ 900 par heure) sur un prix et des bougies qui ne bougeaient plus — elle ouvrait,
// le prix restait au prix d'entrée, la position était refermée à +0,00 %, et recommençait (backup 10/10 : 89 fermetures sur 89 au prix d'entrée exact en trois jours,
// 58 sur PEPE au même prix à 16 chiffres ; sonde navigateur : 0,000 % de mouvement sur les 13 paires en une heure pour 908 cycles). Les modes réels en arrière-plan
// reçoivent leur prix du flux Binance depuis le 27/09 (plus haut) ; l'AA n'avait pas l'équivalent. Écrit dans S.pairStates : celui du mode EN COURS de traitement.
// Ne touche ni l'EV ni le RE ; l'école ne note toujours pas les agents (03 learnFromOutcome, 17/09).
function _simCandleStep() {
  Object.entries(S.pairStates).forEach(([pair, ps]) => {
    try {   // une paire en défaut n'arrête ni les suivantes ni le battement ; l'erreur est comptée et dite une fois au journal (00 _decErr)
    const cfg  = PAIRS[pair];
    // [ÉCOLE VIVANTE · 10/10/2026] paire RETIRÉE (11 : sortie de PAIRS, pairState gardé) : pas de réglage, pas de bougie. Avant, cfg.vol levait une exception ici à
    // chaque passage — GBP/USDT depuis le 22/09 : le battement s'arrêtait net un tick sur trois quand l'AA était à l'écran (exception avalée par le minuteur de 01,
    // invisible au Guardian), et la paire suivante (BNB/USDT) n'a jamais eu une seule bougie d'école.
    if (!cfg || !ps || !Array.isArray(ps.candles)) return;
    // [MODES SÉPARÉS · 10/10/2026] amplitude nulle ou illisible (cfg.vol : 0, NaN) : pas de bougie — son volume serait « x / 0 » (Infinity ou NaN) et son prix NaN.
    // Ne change rien pour une paire réglée (banc G1 : générateur identique au bit près).
    if (!(cfg.vol > 0) || !isFinite(cfg.vol)) return;
    const last = ps.candles[ps.candles.length - 1] || { c: ps.price };

    // ── Prix simule SANS retroaction des agents (30/07/2026) ──────────
    // Le terme retire etait : lmsrBias = (lmsrP(ps) - 0.5) * cfg.vol * 0.7
    // Il faisait bouger le prix DANS LA DIRECTION que les agents predisaient.
    // Boucle fermee : les agents predisent -> le prix leur donne raison ->
    // ils sont recompenses -> leur conviction se renforce. Mesure : a la
    // valeur observee lmsrProb=0.5658, 38,5 % du mouvement entre deux
    // ancrages reels etait produit par les agents eux-memes ; au-dela de
    // lmsrProb=0.70 ils fabriquaient plus de 100 % du prix.
    // Comme S.agents est GLOBAL (non cloisonne par mode), cette population
    // entrainee dans un monde qui lui obeissait decidait ensuite en EV et RE
    // sur de vrais prix, ou sa prediction n a aucun pouvoir causal.
    // Le prix simule ne doit dependre que du marche et du hasard.
    // Mean-reversion component: gently pull toward a recent moving avg
    const closes       = ps.candles.slice(-20).map(c => c.c);
    const ma20         = closes.length > 3 ? closes.reduce((a,b)=>a+b,0)/closes.length : last.c;
    const reversionPull= (ma20 - last.c) * 0.015;  // gentle, realistic
    // Random walk (GBM-like)
    const noise        = (Math.random() - 0.5) * cfg.vol * 1.4;
    // Occasional larger moves (fat tails — realistic crypto)
    const fatTail      = Math.random() < 0.04 ? (Math.random()-0.5)*cfg.vol*4 : 0;

    const ch = reversionPull + noise + fatTail;
    const o  = last.c;
    const c  = o + ch;
    const h  = Math.max(o, c) + Math.abs(ch)*0.3 + Math.random()*cfg.vol*0.3;
    const l  = Math.min(o, c) - Math.abs(ch)*0.3 - Math.random()*cfg.vol*0.3;
    const v  = Math.abs(ch) / cfg.vol * 1000 + Math.random() * 500;

    ps.candles.push({ o, h, l, c, v });
    if(ps.candles.length > 60) ps.candles.shift();

    // Apply price — no hard min/max clamp when real prices are live (they set the range)
    // Always use live price — no clamp when real data available
    ps.price = _pricesFetched ? c : Math.max(cfg.minP, Math.min(cfg.maxP, c));
    // pnl24h reflète la VRAIE variation du prix simulé sur la fenêtre de bougies
    // (avant : marche aléatoire déconnectée du prix, sans rappel → régime figé en
    //  BULL/BEAR en permanence). Désormais le régime suit réellement le marché simulé.
    if (ps.candles.length >= 2) {
      const _oldC = ps.candles[0].c;
      ps.pnl24h = (_oldC > 0) ? Math.max(-40, Math.min(40, ((c - _oldC) / _oldC) * 100)) : 0;
    }
    } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
  });
}
window._simCandleStep = _simCandleStep;

// ═══ [MODES SÉPARÉS · 10/10/2026] LA SURVEILLANCE D'UN MODE EN PLAY DERRIÈRE L'ÉCRAN (go Rams 10/10 20:01 : « Go pour tout ») ═══
// Le multiplexeur donnait à un mode d'arrière-plan ses cycles, les sorties de ses bots sur TP / SL (10f _botExitSweep) et le garde-fou de perte max (10f
// _lossCapSweep). Tout le reste vivait APRÈS lui dans simTick, donc pour le seul mode à l'écran :
//  · 07 learnFromOpenPositions — malgré son nom, les sorties : trailing stop, anti-zombie, bascule de la décision commune et, pour une position MANUELLE,
//    son TP, son SL et la liquidation à −90 % ;
//  · 09e _manConsignesWatchdog — tes consignes (perte max, durée) sur une position manuelle ;
//  · 02 estimateStakes — la mise réglée par paire (plancher de la mise des bots, mise d'une ouverture manuelle) ;
//  · 02 applyFundingFees / applyLeverageBorrowFees — financement et intérêts du levier, toutes les 30 s ;
//  · le recalcul du portefeuille.
// Sonde du 10/10 (vraie app, backup 18:38, AA à l'écran, EV en play derrière) : position manuelle EV, SHORT ETH, TP à −1 % — le marché baisse de 3 %, le TP
// est dépassé, la position reste ouverte 28 min (fin de la sonde) ; position manuelle EV avec une durée de 5 min : jamais fermée. Dans l'autre sens (EV à
// l'écran, AA derrière), l'école n'avait ni trailing, ni anti-zombie, ni bascule, ni financement, et son portefeuille n'était recalculé qu'à son retour.
// Ici : les MÊMES fonctions, aux MÊMES cadences que pour le mode affiché (sorties et mises un tick sur trois — la cadence d'un mode d'arrière-plan —,
// consignes un tick sur douze, financement un tick sur trente), dans le contexte du mode traité (S.tradingMode : ses positions, ses prix, ses comptes). Rien
// ici pour le mode à l'écran : il garde ses appels plus bas dans simTick, inchangés. Chaque appel a sa garde.
// PAS repris pour un mode derrière l'écran (dit) : les ordres LMSR des agents en AA (son marché LMSR reste figé derrière l'écran : ils dépensent le
// portefeuille de marché des sièges, commun aux modes) ; le déclencheur de rêve, les propositions de paires, le coup de pouce anti-stagnation, la courbe du
// portefeuille et le P&L de session (calculés pour le mode affiché).
function _bgModeWatch(tk) {
  const g = (fn) => { try { fn(); } catch (e) { try { window._decErr && window._decErr(e); } catch (_e) {} } };
  // le P&L latent de chaque position (pos.pnl, pos.pnlUsdt, pos.currentVal) : pour le mode à l'écran c'est le rendu des positions qui le tient à jour (02
  // renderPositions, même formule, sur l'exposition totale) ; le garde-fou des consignes lit pos.pnlUsdt pour ta perte max
  g(() => { (S.openPositions || []).forEach(pos => {
    const ps = pos && S.pairStates[pos.pair];
    if (!ps || !(Number(ps.price) > 0) || !(Number(pos.entryPrice) > 0)) return;
    _posMark(pos, ps.price);   // [GO LEVIER · 18/10/2026] ce que closePosition réaliserait (02) — avant : exposition × % sans borne, valeur = exposition + résultat
  }); });
  // [GO NETTOYAGE · 19/10/2026] (ETAT n° 52 et registre n° 18) le contrôle de solvabilité (02 _leverageMarginCheck : fermer AVANT que les pertes, frais,
  // impôt et dettes dépassent ce que le trading tient) pour CE mode, à chaque passage (ses prix viennent d'être relus) — avant : seulement pour le mode
  // à l'écran, un mode en play derrière l'écran pouvait passer sous zéro sans que personne ne ferme.
  g(() => { if (window._leverageMarginCheck) window._leverageMarginCheck(); });
  g(() => { if (typeof learnFromOpenPositions === 'function') learnFromOpenPositions(); });
  g(() => { if (typeof estimateStakes === 'function') estimateStakes(); });
  if (tk % 4 === 0) g(() => { if (typeof _manConsignesWatchdog === 'function') _manConsignesWatchdog(); });
  if (tk % 30 === 0) g(() => { if (typeof applyFundingFees === 'function') applyFundingFees(); if (typeof applyLeverageBorrowFees === 'function') applyLeverageBorrowFees(); });
  g(() => { if (typeof _computePortfolio === 'function') S.portfolio = _computePortfolio(); });
  // [GO ALERTES 2 · 14/11/2026] (ETAT n° 66) les alertes P&L de CE mode (04 checkPnlAlerts : EV / RE seulement derrière l'écran, message étiqueté, pas de
  // bandeau) — avant : seuls renderHome et une fermeture du mode à l'écran les vérifiaient, un mode en play derrière l'écran n'en recevait aucune.
  g(() => { if (typeof checkPnlAlerts === 'function') checkPnlAlerts(); });
  // (ETAT n° 34b) le Twin de CE mode avance sur SES prix (07 tickTwinLive, un Twin par mode) à chaque passage (3 s ; à l'écran : 4 s)
  g(() => { if (typeof tickTwinLive === 'function') tickTwinLive(); });
}
window._bgModeWatch = _bgModeWatch;

function simTick() {
  // v7.2 Phase 18 · Perf monitoring (rolling window, sans impact perceptible)
  const _perfStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  tick++;
  // [PHASES DU TICK — 06/09/2026] chrono par phase : la plus lente du tick est
  // conservee dans S.perf.slowest et reprise par la ligne « LENT: timer » (00).
  var _phLast = _perfStart, _phMax = { name: '', ms: 0 };
  function _phEnd(name){ try { var t = performance.now(); var d = t - _phLast; if (d > _phMax.ms) _phMax = { name: name, ms: d }; _phLast = t; } catch(e) {} }

  // [MONITEUR DE GEL · 02/08/2026] mesure le trou depuis le tick precedent. Le battement
  // vise ~1 s ; si >3 s, on journalise la NATURE du gel pour diagnostiquer sans profiler :
  //  - ecran masque  -> Android throttle les timers en arriere-plan (attendu, pas un bug code)
  //  - ecran visible -> vrai blocage du thread (a corriger) + duree du dernier simTick.
  try {
    if (!S.perf) S.perf = {};
    const _now = _perfStart;
    if (S.perf._lastTickAt) {
      const _gap = (_now - S.perf._lastTickAt) / 1000;
      if (_gap > 3) {
        const _hidden = (typeof document !== 'undefined' && document.hidden);
        // Heap JS (Chrome Android l'expose) : tranche entre pause GC/pression memoire
        // (heap proche de la limite) et operation lourde (heap bas).
        // [GEL BOOT 11/09] les valeurs numériques sont conservées pour l'enregistrement durable S.perfLog.gels
        let _memStr = '', _heapU = null, _heapL = null, _domN = null, _wsD = null, _jsSum = null, _jsN = 0, _osIdle = false, _opFull = null;
        try {
          const pm = (typeof performance !== 'undefined') ? performance.memory : null;
          if (pm && pm.usedJSHeapSize) {
            const _u = Math.round(pm.usedJSHeapSize/1048576);
            const _l = Math.round(pm.jsHeapSizeLimit/1048576);
            _heapU = _u; _heapL = _l;
            _memStr = ` · heap ${_u}/${_l}Mo`;
          }
        } catch(e) {}
        let _domStr = '';
        try {
          const _nodes = (typeof document !== 'undefined' && document.getElementsByTagName) ? document.getElementsByTagName('*').length : 0;
          _domN = _nodes;
          _domStr = ' · dom ' + _nodes + ' · page ' + ((typeof S!=='undefined'&&S)?S.currentPage:'?');
        } catch(e) {}
        let _wsStr = '';
        try {
          const _wsNow = (typeof window!=='undefined' && window._auraWsMsgCount) || 0;
          const _wsDelta = _wsNow - (S.perf._wsLast || 0);
          _wsD = _wsDelta;
          _wsStr = ' · ws +' + _wsDelta;
        } catch(e) {}
        // [VERDICT LONGTASK · 08/08/2026] somme les longtasks tombes DANS le trou :
        // couverture significative = blocage JS (nomme via _auraLastOp) ; sinon = OS.
        let _ltStr = '';
        try {
          const _lts = (typeof window !== 'undefined' && window._auraLongTasks) || [];
          const _gapStart = _now - _gap * 1000;
          let _ltSum = 0, _ltN = 0;
          _lts.forEach(function(t){
            if ((t.start + t.dur) > _gapStart && t.start < _now) { _ltSum += t.dur; _ltN++; }
          });
          if (_ltSum > 500) {
            let _opStr = '';
            const _op = (typeof window !== 'undefined') ? window._auraLastOp : null;
            if (_op && _op.at > (_gapStart - 5000) && _op.at < _now) { _opStr = ' · op ' + _op.name; _opFull = String(_op.name); }   // fenêtre élargie 2→5s (16/08)
            _jsSum = Math.round(_ltSum/100)/10; _jsN = _ltN;
            _ltStr = ' · JS ⏱ ' + (_ltSum/1000).toFixed(1) + 's/' + _ltN + _opStr;
          } else if (!_hidden) {
            _osIdle = true;
            _ltStr = ' · JS inactif (suspension OS)';
          }
        } catch(e) {}
        // [GEL BOOT · 11/09/2026] ATTRIBUTION LoAF : la plus longue frame chevauchant le trou ;
        // le navigateur nomme le script (fichier:position, fonction) et son appelant.
        let _loafStr = '', _loafRec = null;
        const _pStart = _now - _gap * 1000;   // fenêtre du trou en performance.now (rattachement tardif LoAF)
        const _hash = Math.random().toString(36).slice(2,8);   // hash commun ligne 🐌 / enregistrement durable
        try {
          const _lfs = (typeof window !== 'undefined' && window._auraLoafs) || [];
          let _best = null;
          _lfs.forEach(function(f){ if ((f.start + f.dur) > _pStart && f.start < _now && (!_best || f.dur > _best.dur)) _best = f; });
          if (_best) {
            const _top = (_best.scripts && _best.scripts[0]) || null;
            _loafRec = { dur: _best.dur, block: _best.block, script: _best.script, render: _best.render, scripts: _best.scripts };
            _loafStr = (typeof window !== 'undefined' && typeof window._auraLoafStr === 'function') ? window._auraLoafStr(_best)
              : (' · LoAF ' + (_best.dur/1000).toFixed(1) + 's'
                + (_top ? (' ' + (_top.src || '?') + ':' + (_top.fn || 'anonyme') + '@' + _top.pos + ' ← ' + (_top.inv || _top.type || '?') + ' ' + (_top.dur/1000).toFixed(1) + 's') : ' sans script')
                + ' · rendu ' + (_best.render/1000).toFixed(1) + 's');
          } else if (typeof window !== 'undefined' && window._auraLoafSupported === true) {
            _loafStr = ' · LoAF aucun';   // la frame arrive en général après ce tick : rattachée plus tard par _auraLoafAttach
          }
        } catch(e) {}
        S.perf.gaps    = (S.perf.gaps || 0) + 1;
        S.perf.maxGapS = Math.max(S.perf.maxGapS || 0, Math.round(_gap*10)/10);
        S.perf.lastGapS = Math.round(_gap*10)/10;
        if (S.chainLog) {
          S.chainLog.push({
            icon: _hidden ? '📴' : '🐌',
            desc: `Gel ${_gap.toFixed(1)}s · tick ${Math.round(S.perf.lastMs||0)}ms · ${_hidden ? 'ecran masque (throttle Android)' : 'ecran visible'}${_ltStr}${_memStr}${_domStr}${_wsStr}${_loafStr}`,
            hash: _hash, time: new Date().toLocaleTimeString()
          });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        }
        // [GEL BOOT · 11/09/2026] MÉMOIRE DURABLE : 30 derniers gels, nom d'op COMPLET (jamais tronqué),
        // valeurs numériques + LoAF, persistés dans le snapshot (09b1) → survivent à la rotation du
        // journal (100 lignes, ~4 min en pleine activité) et à une mort de l'app.
        try {
          if (!S.perfLog || typeof S.perfLog !== 'object') S.perfLog = { gels: [], lent: [], heap: [], boots: [] };
          if (!Array.isArray(S.perfLog.gels)) S.perfLog.gels = [];
          S.perfLog.gels.push({
            t: Date.now(), time: new Date().toLocaleString(), gap: Math.round(_gap*10)/10, tickMs: Math.round(S.perf.lastMs||0),
            hidden: !!_hidden, jsSum: _jsSum, jsN: _jsN, osIdle: _osIdle, op: _opFull,
            heapU: _heapU, heapL: _heapL, dom: _domN, page: (typeof S.currentPage !== 'undefined' ? S.currentPage : null), ws: _wsD,
            loaf: _loafRec, pStart: Math.round(_pStart), pEnd: Math.round(_now), hash: _hash
          });
          if (S.perfLog.gels.length > 30) S.perfLog.gels.splice(0, S.perfLog.gels.length - 30);
        } catch(e) {}
      }
    }
    S.perf._lastTickAt = _now;
    try { S.perf._wsLast = (typeof window!=='undefined' && window._auraWsMsgCount) || 0; } catch(e) {}
  } catch(e) {}

  // ═══ MULTIPLEXEUR 3 MODES · Etape 1 du SIMULTANE (conception Rams) ═══
  // Chaque mode EN PLAY bat a CHAQUE tick, quel que soit l'ecran : bascule
  // ATOMIQUE de contexte (les accesseurs routent argent/positions/journal/
  // compteurs vers le wallet du mode traite), protection SL/TP du mode, puis
  // cycles independants des paires. Le mode AFFICHE est traite en DERNIER pour
  // que le contexte final soit toujours celui de l'ecran (renders inchanges).
  // Le Reel n'entre ici que si TU l'as mis en play — et ses ouvertures restent
  // gouvernees par les Regles Reel v2 (MANU jamais ; AUTO : bases solides).
  var _mDisp = S.tradingMode;
  // [ÉCOLE VIVANTE · 10/10/2026] le mode que le battement voit à l'écran en commençant, gardé pour 02 _schoolBehind : pendant le tick, S.tradingMode est basculé
  // vers les modes d'arrière-plan (ici, 10f _lossCapSweep, 04 executePending) — une fermeture de l'AA faite alors n'est pas une fermeture de l'écran.
  window._auraScreenMode = _mDisp;
  var _mRun  = [];
  try {
    ['sim','paperReal','real'].forEach(function(_m){
      if (_m !== _mDisp && window._isModeRunning && window._isModeRunning(_m)) _mRun.push(_m);
    });
  } catch(e) {}
  _mRun.push(_mDisp);
  window._bgResolve = false;
  // [1b-a · 14/09/2026] GARDE-FOU PERTE MAX REBRANCHÉ (1 tick sur 3) — règle Rams du 06/07 (« le bot surveille et
  // stoppe si perte trop importante, même si je l'ai oublié ») : elle prime sur celle du 27/07 (« aucun plafond,
  // le bot gère ses sorties »), parce que le bot ne PEUT pas gérer ses sorties quand la bougie ne se ferme pas
  // (audit 14/09 : _lossCapSweep sans appelant depuis le 26/07, DOT/DOGE sous leur SL 2 jours). Plafond inchangé :
  // 2 × SL prévu, borné 1,5-3 %, tous modes en play, positions manuelles comprises (10f).
  // La protection de solvabilité du levier reste le filet si le flux venait à s'interrompre.
  // [GO NETTOYAGE · 19/10/2026] (ETAT n° 52, règle Rams du 18/10 : « la réserve anti-négatif calcule en permanence, à chaque seconde ») le contrôle de
  // solvabilité du mode à l'écran tourne À CHAQUE battement (1 s) — avant : 1 tick sur 3 ; sans position ouverte il sort aussitôt. Les modes en play
  // derrière l'écran ont le leur dans _bgModeWatch, après leurs prix.
  try { if (window._leverageMarginCheck) window._leverageMarginCheck(); } catch(e) {}
  if (tick % 3 === 0) {
    try { if (window._lossCapSweep) window._lossCapSweep(); } catch(e) {}
  }
  _mRun.forEach(function(_m){
    var _isBg = (_m !== _mDisp);
    // ★ PERF 26/07 · un cycle de paire dure 40 a 120 SECONDES : resoudre les
    // modes d'arriere-plan a chaque seconde triplait le travail du battement
    // pour rien (l'interface devenait molle, le changement de mode tardait).
    // Ils sont desormais traites 1 tick sur 3, avec un decompte de 3 : le
    // resultat est identique a la seconde pres, pour un tiers du cout.
    // Le mode AFFICHE, lui, garde sa precision a la seconde.
    if (_isBg && (tick % 3 !== 0)) return;
    var _step = _isBg ? 3 : 1;
    if (_isBg) { window._bgFrom = _mDisp; S.tradingMode = _m; window._bgResolve = true; }   // [MODES SÉPARÉS · 10/10/2026] + le mode de l'écran, gardé pour 02 _screenMode
    // [HORIZONS APPRIS · 27/09/2026] mode réel (EV / RE) traité en arrière-plan : ses paires reçoivent le dernier prix RÉEL accepté (02 _rcLastPrice,
    // s'il a moins de 2 min) — le flux n'écrit ps.price que dans le mode à l'écran : sans ça, les entrées, stops, perte max et sorties de ce mode
    // lisaient un prix qui datait (relecture indépendante du 27/09)
    if (_isBg && (S.tradingMode === 'paperReal' || S.tradingMode === 'real') && typeof _rcLastPrice === 'function' && typeof _rcPriceAge === 'function') {
      try { _livePairs().forEach(function (p) { var q = S.pairStates[p]; if (q && _rcPriceAge(p) <= 120000) { var lp = Number(_rcLastPrice(p)); if (lp > 0) q.price = lp; } }); } catch (e) {}   // [PAIRES VIVANTES · 10/10/2026]
    }
    try {
      // Protection SL/TP du mode traite (les positions EV/RE sont surveillees
      // MEME quand un autre mode est a l'ecran — "stop si je l'ai oublie").
      if (S.tradingMode === 'paperReal' || S.tradingMode === 'real') {
        try { _applyPaperRealProtection(); } catch(e) {}
      }
      // [GÉNOME DE PAIRE · 17/09/2026] rollover quotidien : une paire EV/RE par jour fait évoluer son génome TA
      // (périodes + poids), avec pour « fitness » le P&L net réalisé de la paire dans ce mode. Une seule mutation par
      // paire et par jour : les périodes sont le socle de 60 % du composite, elles ne doivent pas bouger sans arrêt.
      try { _pairGenomeRollover(); } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
      // [JOURNAL DES ÉVÉNEMENTS · 20/09/2026] le relais se perd si S.chainLog est remplacé : on le repose (no-op sinon).
      try { if (typeof _installChainTap === 'function') _installChainTap(); } catch(e) {}
      // [1b-b · 15/09/2026] EV/RE : l'analyse (14 indicateurs, 13 scouts, régime, patterns) lit les klines Binance
      // de la tf du mode — les MÊMES que la porte 10g/08 — projetées dans ps.candles à chaque passage du mode.
      // AA garde son générateur (bloc « New candle » plus bas, désormais réservé au mode sim).
      try { _projectRealCandles(); } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
      // [1b-a · 14/09/2026] sorties TP / SL / breakeven des positions BOT vérifiées ici, sur ps.price, à chaque
      // passage du mode traité — plus seulement à la résolution du cycle (10f _botExitSweep).
      try { if (window._pathRecord) window._pathRecord(); } catch(e) {}   // [MÉMOIRE DES CHEMINS · 22/09/2026] avant les sorties : le chemin d'abord
      try { if (window._botExitSweep) window._botExitSweep(); } catch(e) {}
      try { if (window._fleetHeartbeat) window._fleetHeartbeat(); } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }   // [SURVEILLANCE PERMANENTE · 27/09/2026] les bots, au rythme du mode
      // [PAIRES VIVANTES · 10/10/2026] seules les paires vivantes ont un cycle. Avant, la paire retirée gardait le sien dans chaque mode : en AA l'analyse
      // complète (signaux techniques sur ses bougies figées, vote des 23 voix, photo des votes) à chaque passage, en EV un passage arrêté à la porte, et
      // S.cycle — l'horloge commune des caches et des périodes de grâce — avançait pour elle (sonde 1 h sur le backup du 10/10 : 50 passages en AA, 30 en EV).
      _livePairEntries().forEach(([pair, ps]) => {
        ps.cycleTimer -= _step;
        if(ps.cycleTimer <= 0) {
          ps.cycleTimer = ps.cycleMax;
          S.cycle++;
          resolvePairCycle(pair, ps);
        }
      });
    } catch(e) {}
    // [ÉCOLE VIVANTE · 10/10/2026] AA en play derrière un autre écran : son marché avance comme à l'écran — le prix va vers l'ancrage reçu de CoinGecko (02
    // blendRealPrices ; l'ancrage est posé par 02 _schoolBgAnchor au moment où le prix arrive), puis une bougie fabriquée par paire (_simCandleStep). Même cadence
    // qu'à l'écran (un tick sur trois), après les cycles comme à l'écran. S.tradingMode vaut 'sim' ici : S.pairStates est celui de l'AA, rien d'autre n'est écrit.
    // Deux gardes séparées : un état abîmé qui fait échouer le mélange n'empêche pas la bougie.
    // [MODES SÉPARÉS · 10/10/2026] un mode en play derrière l'écran reçoit la surveillance que le mode affiché reçoit plus bas (sorties, consignes, financement,
    // portefeuille) : _bgModeWatch, ci-dessus. Après ses cycles et avant sa bougie, dans l'ordre du mode à l'écran.
    if (_isBg) { try { _bgModeWatch(tick); } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} } }
    if (_isBg && S.tradingMode === 'sim') {
      try { blendRealPrices(); } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
      try { _simCandleStep(); } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
    }
    if (_isBg) { S.tradingMode = _mDisp; window._bgResolve = false; }
  });

  try { if (window._botMeritAudit) window._botMeritAudit(); } catch(e) {}   // [SURVEILLANCE PERMANENTE · 27/09/2026] affirmations jugées dès que le marché tranche
  _phEnd('cycles paires + protection');
  //  Global ring timer (display only — BTC/USDT reference) ──
  // S.cycleMax is the user-chosen global display reference — DO NOT overwrite it from per-pair
  const refPs = S.pairStates['BTC/USDT'] || Object.values(S.pairStates)[0];
  if(refPs) {
    S.cycleTimer = refPs.cycleTimer;
    // Only sync cycleMax to display label, not to S.cycleMax (which is user-controlled)
  }

  // ── Funding fees: once every 30 ticks (≈ 30s) per open position ──
  if(tick % 30 === 0) { applyFundingFees(); applyLeverageBorrowFees(); }

  // [RETRAIT REDISTRIBUTION · 16/09/2026] l'appel redistributeFitness (toutes les 40 s) est retiré : sans effet depuis la
  // fitness glissante (20260916c), la fonction n'existe plus (02).

  // ── v7.1 PHASE 1 · Fetch USD/EUR rate (tick 1 puis toutes les 60 ticks ≈ 60s) ──
  if(tick === 1 || tick % 60 === 0) { try { fetchUsdEurRate(); } catch(e) {} }

  // Phase display (page 1 agents tab only — home no longer has it)
  const phasePct = 1 - S.cycleTimer/S.cycleMax;
  let phase = 'COLLECTE';
  if(phasePct > .2 && phasePct < .6) phase = 'MARCHÉ';
  else if(phasePct >= .6) phase = 'RÉSOLUTION';
  const phaseEl = document.getElementById('cyclePhase');
  if(phaseEl) phaseEl.textContent = phase;

  // Agent score nudge toward composite consensus every 4 ticks (no random drift)
  if(tick % 4 === 0) {
    const allSigs2 = getCachedCompositeSignals();
    const avgComp2 = Object.values(allSigs2).reduce((s,c)=>s+(c?c.composite:0),0) / Object.keys(PAIRS).length;
    S.agents.forEach(a => {
      // v7.3 OPT · Bots & Meta : score verrouillé à 0 (role neutre par design, évite dérive)
      if(a.isBot || a.isMeta) { a.score = 0; return; }
      // [S3 · 03/09/2026] 3e tête de la boucle supprimée : plus aucun tirage des
      // scores faibles vers la moyenne du composite. Un score faible reste faible
      // tant que les RÉSULTATS ne l'ont pas fait bouger.
      // v7.3 OPT · Conf auto-recovery supprimée — la conf doit refléter la perf réelle
      // v7.3 OPT · MÉMOIRE INTER-AGENTS : les agents consultent les leçons récentes
      // Leçons de < 50 cycles et pertinentes (sévérité > 0.15) → légère influence sur le score
      if(S.agentLessons && S.agentLessons.length > 0) {
        const recentLessons = S.agentLessons.filter(l => (S.cycle - l.cycle) < 50 && l.severity > 0.15);
        if(recentLessons.length > 0) {
          // Moyenne pondérée des directions gagnantes récentes, poids = sévérité × récence
          const lessonNudge = recentLessons.reduce((sum, l) => {
            const recency = Math.max(0, 1 - (S.cycle - l.cycle) / 50);
            return sum + l.direction * l.severity * recency;
          }, 0) / recentLessons.length;
          // Nudge très léger (×0.008) pour ne pas dominer les propres convictions
          a.score = Math.max(-1, Math.min(1, a.score + lessonNudge * 0.008));
        }
      }
    });
  }

  _phEnd('nudge scores + frais + redistribution');
  // LMSR orders — agents votent sur toutes les paires (toutes les 6s)
  // [MARCHÉ LMSR À PART · 28/09/2026] le portefeuille de marché du siège (a.lmsrWallet = sa fitness au dernier jugement, moins ses ordres depuis) remplace
  // a.fitness ici, et seulement ici : la taille des ordres (8 % du portefeuille, réparti par paire) et les gardes (portefeuille > moitié de l'ordre) le lisent,
  // le coût lui est retiré (_lmsrSpend) et compté dans a.lmsrSpent ; la fitness n'est plus touchée. Même arithmétique qu'avant, même flux, même marché.
  // Un coût non fini (S.b nul après un retour arrière : exp(q/0)) n'est ni retiré ni compté.
  if(tick % 6 === 0) {
    const pairList  = Object.keys(PAIRS);
    const nPairs    = pairList.length;

    // [MARCHÉ RÉPARÉ · 30/09/2026] en EV / RE, le marché d'une paire, ce sont ses manches (03 _mktCycle : chaque agent mise SON vote de la paire, payé à
    // la clôture de la bougie) ; ces ordres-ci — le biais global a.score sur toutes les paires, jamais payés — ne tournent plus qu'en AA, inchangés
    if (!((typeof _mktOn === 'function') && _mktOn())) S.agents.forEach(a => {
      const sig        = a.score;
      // Budget total divisé par le nb de paires pour éviter la sur-exposition
      const budgetPerPair = (_lmsrWallet(a) * .08) / nPairs;   // [MARCHÉ LMSR À PART · 28/09/2026] le portefeuille de marché (avant : la fitness)
      if(budgetPerPair <= 0) return;

      pairList.forEach(pair => {
        const ps = S.pairStates[pair];
        if(!ps) return;

        // Légère variation par paire (±20%) pour diversifier les signaux
        const pairBias = 0.8 + Math.random() * 0.4;
        const budget   = budgetPerPair * pairBias;

        if(sig > .1) {
          const d = Math.floor(budget * sig * 1.8);
          if(d > 0 && a.lmsrWallet > d * .5) {   // [MARCHÉ LMSR À PART · 28/09/2026] (avant : la fitness)
            const cost = lmsrBuyYes(ps, d);
            _lmsrSpend(a, cost);   // [MARCHÉ LMSR À PART · 28/09/2026] (avant : retiré de la fitness)
          }
        } else if(sig < -.1) {
          const d = Math.floor(budget * Math.abs(sig) * 1.8);
          if(d > 0 && a.lmsrWallet > d * .4) {   // [MARCHÉ LMSR À PART · 28/09/2026] (avant : la fitness)
            const cost = lmsrBuyNo(ps, d);
            _lmsrSpend(a, cost);   // [MARCHÉ LMSR À PART · 28/09/2026] (avant : retiré de la fitness)
          }
        }
      });
    });
  }

  _phEnd('votes LMSR');
  // v7.3 OPT · Soft learning plus rapide (5→3 ticks, ~1.5s à 500ms/tick)
  if(tick % 3 === 0) {
    learnFromOpenPositions();
    estimateStakes();            // Bot recalcule les mises optimales
    updateAllPairCtrlLabels();   // Sync affichage steppers
  }

  _phEnd('learnFromOpenPositions + estimateStakes');
  // ── DREAM TRIGGER (Feature #2) — check after every pair resolution ──
  if(tick % 8 === 0 && !S.dreamActive) {
    _livePairs().forEach(pair => {   // [PAIRES VIVANTES · 10/10/2026] une paire retirée, « hold » pour toujours, ne compte plus ses attentes
      const ps = S.pairStates[pair];
      if(ps.lastAction === 'hold') {
        S._holdConsecutive[pair] = (S._holdConsecutive[pair] || 0) + 1;
        if(shouldTriggerDream(pair)) {
          S._holdConsecutive[pair] = 0;
          setTimeout(triggerDreamCycle, 400);
        }
      } else {
        S._holdConsecutive[pair] = 0;
      }
    });
  }

  // ── DYNAMIC PAIR PROPOSAL (Feature #3) — check every 60 ticks ──
  if(tick % 60 === 0) {
    proposeDynamicPair();
    checkPairProposalAutoPass();
  }

  // v6.9: AUTO-DIAGNOSTIC — boost convGate si bot stagne
  if(!S._lastTradeCount) S._lastTradeCount = S.totalTrades || 0;
  if(!S._tradeStagnationTicks) S._tradeStagnationTicks = 0;
  const _currentTrades = S.totalTrades || 0;
  if(_currentTrades > S._lastTradeCount) {
    S._lastTradeCount = _currentTrades;
    S._tradeStagnationTicks = 0;
    S._convBoost = 0; // reset boost
  } else {
    S._tradeStagnationTicks = (S._tradeStagnationTicks || 0) + 1;
    // Après 150 ticks sans trade → boost progressif de 0 à 0.06 sur les 30 ticks suivants
    if(S._tradeStagnationTicks > 150 && S._tradeStagnationTicks < 300) {
      S._convBoost = Math.min(0.06, (S._tradeStagnationTicks - 150) / 30 * 0.06);
    } else if(S._tradeStagnationTicks >= 300) {
      // Cap maximum: -0.06 sur les seuils (convGate descend de 0.18 à 0.12)
      S._convBoost = 0.06;
    }
  }

  // v7.0: Update regime badge chaque tick (léger)
  if(typeof detectMarketRegime === 'function') {
    const _r = detectMarketRegime();
    try { if (typeof _notifRegimeWatch === 'function') _notifRegimeWatch(_r); } catch(e) {}   // [GO ALERTES · 15/10/2026] notification « changement de régime » (07)
    const _rb = document.getElementById('regimeBadge');
    const _rbOld = document.getElementById('regimeBadgeOld'); // v15 · doublon Brain Network
    if(_rb && _r) {
      const labels = {
        bull:          { t:'▲ BULL',     c:'var(--up)',    bg:'rgba(0,232,122,.12)', br:'rgba(0,232,122,.3)' },
        bear:          { t:'▼ BEAR',     c:'var(--down)',  bg:'rgba(255,61,107,.12)', br:'rgba(255,61,107,.3)' },
        volatile_bull: { t:'▲▲ VOL+',    c:'var(--up)',    bg:'rgba(0,232,122,.15)', br:'rgba(0,232,122,.4)' },
        volatile_bear: { t:'▼▼ VOL−',    c:'var(--down)',  bg:'rgba(255,61,107,.15)', br:'rgba(255,61,107,.4)' },
        volatile:      { t:'◈ VOLATILE', c:'var(--gold)',  bg:'rgba(245,200,66,.12)', br:'rgba(245,200,66,.3)' },
        calm:          { t:'◌ CALM',     c:'var(--t2)',    bg:'rgba(120,130,150,.1)', br:'rgba(120,130,150,.3)' }
      };
      const lb = labels[_r] || labels.calm;
      [_rb, _rbOld].forEach(el => {
        if(!el) return;
        el.style.display = '';
        el.textContent = lb.t;
        el.style.color = lb.c;
        el.style.background = lb.bg;
        el.style.borderColor = lb.br;
      });
    }
  }

  _phEnd('dream trigger + regime badge');
  // Blend real prices smoothly every tick
  blendRealPrices();

  // ── Prix reels : recuperation toutes les ~15 s (30/07/2026) ──────────
  // Cet appel etait imbrique dans `if(tick % 3 === 0){ if(tick % 15 === 1) }`.
  // tick ≡ 1 (mod 15) implique tick ≡ 1 (mod 3) : l intersection avec
  // tick ≡ 0 (mod 3) est VIDE. Verifie sur 3000 ticks : 0 occurrence.
  // fetchLivePrices n etait donc JAMAIS appele depuis la boucle de tick, et
  // le reancrage aux prix reels ne survivait que par le watchdog 45 s.
  if(tick % 15 === 1) fetchLivePrices();

  // New candle for ALL pairs every 3 ticks
  if(tick % 3 === 0) {
  if(tick % 4 === 0 && typeof _fpEmergencyCheck === 'function') _fpEmergencyCheck();  // v7.12 P1: watchdog FP
  if(tick % 2 === 0 && typeof updatePairBricks === 'function' && S.currentPage === 0) updatePairBricks();  // v7.12 P2: briques
  if(typeof updateActionBricks === 'function' && S.currentPage === 0) updateActionBricks();  // v7.12 P2: briques actions · [CARTES · 05/10/2026] à chaque battement (prix, 24 h et P&L en direct ; la courbe garde 1 sur 2)
  if(tick % 2 === 0 && typeof updateManBricks === 'function' && S.currentPage === 0) updateManBricks();  // v7.12 P2: briques man
  if(tick % 4 === 0 && typeof _manConsignesWatchdog === 'function') _manConsignesWatchdog();  // v7.12 P2: watchdog man
  if(tick % 2 === 0 && typeof _updateAutoBarCounters === 'function' && S.currentPage === 0) _updateAutoBarCounters();  // v7.12 auto-bar counters
  if(tick % 30 === 0 && typeof _evaluatePairPerformance === 'function') _evaluatePairPerformance();  // v7.12 P2: eval win rate
  if(_priceSource === 2 && tick % 2 === 0) _simulationTickAll();  // v7.12: keep SIM moving

    // [1b-b · 15/09/2026] GÉNÉRATEUR RÉSERVÉ À AA : en EV/RE ps.candles vient des klines Binance (_projectRealCandles,
    // battement ci-dessus). Avant, ce bloc fabriquait 60 bougies de marche aléatoire (mèches, volumes, corps inventés)
    // pour le mode AFFICHÉ, EV compris, et écrasait ps.price avec le close synthétique toutes les 3 s.
    // [ÉCOLE VIVANTE · 10/10/2026] le corps est dans _simCandleStep (plus haut, inchangé) : l'AA en play derrière un autre écran l'appelle aussi (multiplexeur).
    if (S.tradingMode === 'sim') _simCandleStep();
  }

  // ★ "PORTFOLIO DRIFT" SUPPRIME (05/07/2026) · ce mecanisme creait de l'argent
  // aleatoire (±0.08% toutes les 5 s, biais POSITIF ≈ +21%/jour compose) : les
  // portefeuilles gonflaient tout seuls sans aucun trade (+50 $ fantomes en 3
  // jours sur AA et EV, preuves dans le backup Guardian du 05/07). Desormais les
  // gains ne peuvent venir QUE des trades. On garde le recalcul portfolio + P&L
  // de session (photo reelle, zero creation d'argent).
  if(tick % 5 === 0) {
    S.portfolio = (typeof _computePortfolio==='function') ? _computePortfolio() : ((S.cashAccount||0)+(S.tradingAccount||0));   // [23/08] canonique
    if(!S._startPortfolio) S._startPortfolio = S.portfolio;
    const sessionGain = S.portfolio - S._startPortfolio;
    S.pnl24h = S._startPortfolio > 0
      ? (sessionGain / S._startPortfolio * 100)
      : 0;
  }
  if(tick % 5 === 0) {
    S.pnlHistory.push(S.portfolio);
    if(S.pnlHistory.length > 80) S.pnlHistory.shift();
  }

  // Rafraîchir la modale « Fermer les positions » en TEMPS RÉEL tant qu'elle est visible
  // (P&L $ live sur le prix courant, quel que soit l'onglet affiché).
  { const _cpm = document.getElementById('closePositionsModal');
    if(_cpm && _cpm.style.display === 'flex' && typeof renderClosePositionsList === 'function') renderClosePositionsList(); }

  // Badge ⊗ de l'EN-TÊTE : visible sur TOUTES les pages, donc rafraîchi ici quelle que soit
  // la page affichée. [FIX 04/08/2026] avant, il n'était rafraîchi que dans le bloc HOME :
  // une clôture survenue pendant qu'on regardait CHAIN laissait le badge figé à « 1 »
  // (incohérence UI=1 vs S=0 relevée par Guardian, revenue deux fois).
  if(tick % 2 === 0 && !(typeof document !== 'undefined' && document.hidden)) {
    if(typeof _updateCloseAllBadge === 'function') _updateCloseAllBadge();
  }

  _phEnd('bougies + briques + portfolio');
  // [GO ALERTES · 15/10/2026] alertes qui ne dépendent pas de l'écran — à chaque battement, quelle que soit la page, écran éteint compris (ici S est le mode
  // affiché : les modes d'arrière-plan ont été rendus plus haut). Alertes prix (06, prix réel Binance) : avant, renderHome seulement (accueil, écran allumé).
  // Résumé Telegram de la semaine (06) : n'agit que si son interrupteur est mis et que 7 jours sont passés.
  try { if (typeof checkPriceAlerts === 'function') checkPriceAlerts(); } catch(e) {}
  try { if (typeof _tgHebdoTick === 'function') _tgHebdoTick(); } catch(e) {}
  // [GO NETTOYAGE · 18/10/2026] (ETAT n° 34) Twin Live au battement, 1 tick sur 4 (la cadence du rendu de l'accueil), quelle que soit la page, écran éteint
  // compris — avant : seulement à l'ouverture de l'accueil (02 goPage). Il n'écrit que S.twin (positions et P&L VIRTUELS) : ni argent, ni décision.
  if (tick % 4 === 0) { try { if (typeof tickTwinLive === 'function') tickTwinLive(); } catch(e) {} }
  // [GO ALERTES 2 · 14/11/2026] (ETAT n° 66) alertes P&L du mode à l'écran au battement, quelle que soit la page, écran éteint compris (04 checkPnlAlerts) —
  // avant : seulement au rendu de l'accueil (accueil affiché, écran allumé) et après une fermeture. Les modes derrière l'écran : _bgModeWatch, plus haut.
  try { if (typeof checkPnlAlerts === 'function') checkPnlAlerts(); } catch(e) {}
  // ── Render active page (throttled) · SAUTÉ si l'écran est masqué : inutile de peindre une
  //    interface invisible, et ça évite un rattrapage brutal au retour. Le trading et
  //    l'apprentissage (au-dessus) continuent normalement — aucune donnée n'est affectée. ──
  if(S.currentPage === 0 && !(typeof document !== 'undefined' && document.hidden)) {
    // Home: tiered rendering — price display every tick, heavy work throttled
    renderHomePrices();                          // prices + cycle timers only (fast)
    updateMarketMood();                          // v5 · mood bar (light)
    if(tick % 2 === 0) { renderPositions(); renderActionsGrid(); renderPairPnl(); }
    // [PHASE 1 · 12/09/2026] rotation roster « 1 paire/tick » RETIRÉE : elle n'existait que pour écraser a.score
    // (« consensus max » = le bruit de la dernière paire). Le roster est calculé par 10f à chaque résolution de LA paire
    // (ps.roster, dans le mode traité), par 09c à l'ouverture, et par les panneaux debate/swarm pour la paire active.
    if(tick % 3 === 0) { drawActionMiniCharts(); updatePairBtnStates(); updateAllPairCtrlLabels(); updateBotThoughts(); }
    if(tick % 4 === 0) { updatePairAnalysisPanels(); try{Object.keys(PAIRS).forEach(ac2UpdateXInd);}catch(e){} syncPairPresets(); updateIntelBanner(); updateStreakBadge(); try { renderHome(); updateFiscalMini(); renderAnalyticsPanel(); if(typeof renderPendingActions === 'function') renderPendingActions(); } catch(e) { console.warn('tick render:', e); }

    _phEnd('rendus home');
    // v6.9: Évolution continue — vérification chaque 8 ticks
    // [ANTI-CHURN GC · 03/08/2026] le limiteur 1 fusion/60s vit DANS triggerEvolution (07),
    // à la source, pour couvrir aussi les 3 appels par-décision du fichier 03.
    if(tick % 8 === 0) {
      try {
        // Période de grâce : un agent né il y a moins de 60 cycles n'est PAS évolué
        // (sinon les hybrides, nés faibles, étaient retraités avant d'avoir fait leurs
        // preuves → boucle d'évolution infinie). On lui laisse le temps de trader.
        const _GRACE = 60;
        const _evolvable = a => !a.isBot && !a.isMeta && (S.cycle - (a._bornCycle || 0)) >= _GRACE;
        const _agents2 = [...S.agents].filter(_evolvable).sort((a,b)=>a.fitness-b.fitness);
        // [ÉVOLUTION APPRISE · 28/09/2026] _evoOk (03) : le niveau appris (gain / nuisance) quand il est prouvé, sinon le nombre posé à la main (300, 400)
        const _ok = (a, d) => (typeof _evoOk === 'function') ? _evoOk(a, d) : (a.fitness < d);
        const _wD = _agents2.find(a => _ok(a, 300));   // le plus faible RECYCLABLE (sans règle : _agents2[0] s'il est sous 300, comme avant)
        if(_wD) triggerEvolution(_wD, { trig: 'D' });
        // Forcer aussi évolution des agents avec score plat (stagnation), hors période de grâce
        const _stagnant = _agents2.find(a => Math.abs(a.score||0) < 0.03 && _ok(a, 400));
        if(_stagnant && tick % 24 === 0) triggerEvolution(_stagnant, { trig: 'E' });
      } catch(_e) {}
    }
  _phEnd('evolution');
  // [PHASE 1 · 12/09/2026] rafraîchissement roster « pour l'UI » (paire active, 4 ticks) RETIRÉ : il écrasait a.score ;
  // renderAnalyticsPanel ci-dessus calcule déjà le roster de la paire active quand l'onglet debate/swarm est affiché.
  }
    if(tick % 5 === 0) drawSparkline();
  }
  else if(S.currentPage === 1) {
    // Agents: patch every tick, sparklines every 5
    patchAgentCards();
    if(tick % 3 === 0) renderAgentHeatmap();
    if(tick % 5 === 0) renderAgents();
    // Dream dot badge
    const dd = document.getElementById('dreamDotBadge');
    if(dd) dd.style.display = S.dreamActive ? 'inline-block' : 'none';
  }
  else if(S.currentPage === 2) {
    renderMarket();
    if(tick % 3 === 0) { drawMiniCharts(); drawMobileChart(); }
    if(tick % 4 === 0) renderCorrMatrix();
    if(tick % 5 === 0) renderAnalysis();   // AT + AF + composite
  }
  else if(S.currentPage === 3) {
    if(tick % 2 === 0) patchGovCards();
    if(tick % 5 === 0) renderDAO();
  }
  else if(S.currentPage === 4) {
    if(tick % 5 === 0) renderChain();   // [ANTI-CHURN 04/08/2026] 5s suffisent pour un journal ; à 2s, la reconstruction innerHTML + historique trades générait du churn résiduel (gel 6.1s vu sur page 4)
  }
  else if(S.currentPage === 5) {
    if(tick % 3 === 0) {
      const tab = document.querySelector('[id^="ftab-"].active')?.id?.replace('ftab-','') || 'global';
      renderFiscal(tab);
    }
  }
  // [GO CSS · écran 5 · 14/11/2026] hors de l'écran Chain : le badge de son onglet (trades nouveaux depuis la dernière visite), toutes les 10 s
  if(S.currentPage !== 4 && tick % 10 === 0 && typeof _chainBadge === 'function') { try { _chainBadge(); } catch(e) {} }
  // v7.2 Phase 18 · Fin instrumentation perf (rolling 20 ticks)
  try {
    const _perfEnd = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const _dur = _perfEnd - _perfStart;
    if(!S.perf) S.perf = { tickDurations: [], avgMs: 0, maxMs: 0, samples: 0 };
    S.perf.tickDurations.push(_dur);
    if(S.perf.tickDurations.length > 20) S.perf.tickDurations.shift();
    S.perf.samples = S.perf.tickDurations.length;
    S.perf.avgMs = S.perf.tickDurations.reduce((a,b)=>a+b,0) / S.perf.samples;
    S.perf.maxMs = Math.max(...S.perf.tickDurations);
    S.perf.lastMs = _dur;
    _phEnd('rendus page ' + S.currentPage);
    S.perf.slowest = { name: _phMax.name, ms: Math.round(_phMax.ms) };
  } catch(e) {}
}

// ── Seuils de trading optimisés pour réduire les frais ──────
// Frais aller-retour estimé: takerRate×2 + slippage×2 = ~0.30%
// On ne trade que si la conviction justifie au moins 3× les frais
// v7.3 OPT · constantes obsolètes supprimées (CONV_THRESHOLD, DIR_THRESHOLD, TRADE_THRESHOLD,
// STOP_LOSS_X, BREAKEVEN_PCT) — elles n'étaient jamais lues. Les vrais seuils sont inline :
//   - Entrée trade (voir 03-...buid.js) : shouldTrade = conviction > minMoveNeeded * 2.0 && |composite| > 0.28
//   - TP/SL bot :    tpPct/slPct dérivés de conviction et volCV (plus bas dans ce module)

// Résoudre UN cycle pour UNE paire — appelé par simTick quand ps.cycleTimer atteint 0
// ════════════════════════════════════════════════════════════════════
// v7.12 LIVRAISON 4 · WRAPPER MODE TRADING (sim/real)
// ════════════════════════════════════════════════════════════════════
// Décide si le bot fait son cycle : sim → toujours, real → uniquement
// quand une nouvelle bougie de la paire+timeframe choisi vient de se fermer
// ET que la paire est active ET que le kill switch n'est pas en pause.
// ════════════════════════════════════════════════════════════════════

// Fonction resolvePairCycle stubbed (originale tronquée à l'upload)
// ═══ Sections reconstruites (renderXxx → initXxx) ═══

// Backtest : init existe déjà, render = appeler init
function renderBacktestSection() {
  if (typeof initBacktestSection === 'function') initBacktestSection();
}
window.renderBacktestSection = renderBacktestSection;

// Replay : init existe, render = appeler init
function renderReplaySection() {
  if (typeof initReplaySection === 'function') initReplaySection();
}
window.renderReplaySection = renderReplaySection;

// What-if : reconstruction complète (init était tronqué)
function initWhatifSection() {
  var el = document.getElementById('whatifSection');
  if (!el) return;
  // Valeurs par défaut basées sur la perf actuelle si dispo
  var defWr   = (S && S.totalTrades>0) ? Math.round((S.winTrades||0)/S.totalTrades*100) : 55;
  var defAvgW = 1.5, defAvgL = 1.0;
  var defFees = 0.1, defStake = 50, defTrades = 100;
  el.innerHTML =
    '<div style="background:var(--s1,#0d0d1a);border:1px solid rgba(56,212,245,.15);border-radius:12px;padding:14px;margin-bottom:10px;">'
    + '<div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ice,#38d4f5);margin-bottom:10px;">🔮 What-if · Simulateur</div>'
    + '<div style="font-size:9px;color:var(--t3,#888);line-height:1.5;margin-bottom:10px;">Simule l\'impact de différents paramètres sur ton P&L théorique.</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">'
    + _wifInput('Win Rate (%)', 'wifWr', defWr, 30, 90, 1)
    + _wifInput('Trades', 'wifTrades', defTrades, 10, 1000, 10)
    + _wifInput('Avg Win (%)', 'wifAvgW', defAvgW, 0.1, 10, 0.1)
    + _wifInput('Avg Loss (%)', 'wifAvgL', defAvgL, 0.1, 10, 0.1)
    + _wifInput('Mise ($)', 'wifStake', defStake, 1, 1000, 5)
    + _wifInput('Frais (%)', 'wifFees', defFees, 0, 1, 0.05)
    + '</div>'
    + '<button onclick="runWhatif()" style="width:100%;padding:9px;border-radius:8px;background:rgba(56,212,245,.12);border:1px solid rgba(56,212,245,.3);color:var(--ice,#38d4f5);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">🔮 Calculer</button>'
    + '<div id="wifResults" style="margin-top:10px;display:none;"></div>'
    + '</div>';
}
function _wifInput(lbl, id, val, mn, mx, step) {
  return '<div><label style="font-size:8px;color:var(--t3,#888);text-transform:uppercase;letter-spacing:.06em;">' + lbl + '</label>'
       + '<input type="number" id="' + id + '" value="' + val + '" min="' + mn + '" max="' + mx + '" step="' + step + '" '
       + 'style="width:100%;padding:6px 8px;border-radius:6px;background:var(--s2,#111);border:1px solid var(--border,#222);color:var(--t1,#fff);font-size:11px;font-family:var(--font-mono,monospace);"></div>';
}
function runWhatif() {
  var wr     = parseFloat(document.getElementById('wifWr').value)     || 55;
  var trades = parseInt  (document.getElementById('wifTrades').value) || 100;
  var avgW   = parseFloat(document.getElementById('wifAvgW').value)   || 1.5;
  var avgL   = parseFloat(document.getElementById('wifAvgL').value)   || 1.0;
  var stake  = parseFloat(document.getElementById('wifStake').value)  || 50;
  var fees   = parseFloat(document.getElementById('wifFees').value)   || 0.1;
  var r = _simulateWhatIf({wr:wr, trades:trades, avgWin:avgW, avgLoss:avgL, stake:stake, fees:fees});
  var col = function(v){ return v>=0?'var(--up,#00e87a)':'var(--down,#ff3d6b)'; };
  var html = '<div style="background:var(--s2,#111);border-radius:10px;padding:12px;font-size:10px;line-height:1.8;">'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Wins / Loss</span><span style="font-weight:700;">' + r.nWins + ' / ' + r.nLoss + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Gain brut</span><span style="color:var(--up,#00e87a);font-weight:700;">+$' + r.grossWin.toFixed(2) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Perte brute</span><span style="color:var(--down,#ff3d6b);font-weight:700;">-$' + r.grossLoss.toFixed(2) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Frais totaux</span><span style="font-weight:700;">$' + r.totalFees.toFixed(2) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--border,#222);margin-top:6px;padding-top:6px;"><span style="color:var(--t1,#fff);font-weight:800;">P&L NET</span><span style="color:' + col(r.netPnl) + ';font-weight:900;font-size:13px;">' + (r.netPnl>=0?'+':'') + '$' + r.netPnl.toFixed(2) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Expectancy</span><span style="color:' + col(r.expectancy) + ';font-weight:700;">' + (r.expectancy>=0?'+':'') + (r.expectancy*100).toFixed(2) + '%</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">ROI</span><span style="color:' + col(r.roi) + ';font-weight:700;">' + (r.roi>=0?'+':'') + r.roi.toFixed(1) + '%</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Drawdown estimé</span><span style="color:var(--gold,#f5c842);font-weight:700;">$' + r.estMaxDD.toFixed(2) + ' (' + r.maxConsecLoss + ' pertes)</span></div>'
    + '</div>';
  var rd = document.getElementById('wifResults');
  if (rd) { rd.innerHTML = html; rd.style.display = 'block'; }
}
function renderWhatifSection() { initWhatifSection(); }
window.initWhatifSection = initWhatifSection;
window.runWhatif = runWhatif;
window.renderWhatifSection = renderWhatifSection;
window._wifInput = _wifInput;

// resolvePairCycle RESTAURÉE de v39 (la version dans v108/93+v94 était cassée — signature et logique fausses)
function resolvePairCycle(pair, ps) {
  // MODE SIM (par défaut) : comportement original
  if (!_isRealLike()) {
    return _resolvePairCycleCore(pair, ps);
  }

  // v7.12 LIVRAISON 8 · MODE PAPIER RÉEL : règles strictes
  if (S.tradingMode === 'paperReal') {
    return _resolvePaperRealCycle(pair, ps);
  }

  // ── MODE REAL (existant) ──
  // Paire active ?
  if (!(S.realActivePairs && S.realActivePairs[pair])) return;

  // Kill switch en pause ?
  const ks = (S.realKillSwitch && S.realKillSwitch[pair]) || null;
  if (ks && ks.paused) return;

  const tf = S.realTimeframe || '15m';
  const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf]) || [];

  // [1b-a · 14/09/2026] FRAÎCHEUR AVANT « nouvelle bougie close » (même ordre que la porte EV, 10g) : une série
  // figée ne produit jamais de nouvelle bougie, l'ancien test placé après `closedTs <= lastSeenTs` était donc
  // inatteignable. Série courte ou périmée (> max(2,5 tf, 2 min)) → refetch REST (limité en 02) et on attend.
  const tfMs = { '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1j': 86400000 }[tf] || 900000;
  const stalenessThreshold = Math.max(tfMs * 2.5, 120000);
  const dataAge = arr.length ? (Date.now() - arr[arr.length - 1].ts) : Infinity;   // âge de la bougie EN COURS
  if (arr.length < 30 || dataAge > stalenessThreshold) {
    if (typeof _fetchAndBootstrapRealCandles === 'function') _fetchAndBootstrapRealCandles(pair, tf);
    return;  // Attendre les données fraîches — pas de kill switch
  }
  // [DÉGEL DES VOIX · 02/10/2026] série TROUÉE (bouche-trou de coupure parmi les 60 bougies que lisent les voix, 02 _realCandlesHoled) : les vraies
  // bougies sont redemandées à Binance (REST, limité en 02) et on attend — aucune décision, aucun jugement sur un prix inventé. Pas de kill switch.
  if (typeof _realCandlesHoled === 'function' && _realCandlesHoled(arr)) {
    if (typeof _fetchAndBootstrapRealCandles === 'function') _fetchAndBootstrapRealCandles(pair, tf);
    return;
  }

  // Dernière bougie (live) — on déclenche le cycle quand une bougie se FERME
  // Une bougie se ferme quand sa ts change (la dernière bougie de arr est la nouvelle bougie en cours)
  // On retient le ts de la dernière bougie close (avant-dernière, car la dernière est en cours)
  if (arr.length < 2) return;
  const closedTs = arr[arr.length - 2].ts;   // ts de la dernière bougie complète
  const lastSeenTs = (S.realPairCycle && S.realPairCycle[pair]) || 0;
  if (closedTs <= lastSeenTs) return;        // pas de nouvelle bougie fermée
  if (!S.realPairCycle) S.realPairCycle = {};
  S.realPairCycle[pair] = closedTs;

  // Tout va bien → exécuter le cycle bot sur ce signal de bougie fermée
  return _resolvePairCycleCore(pair, ps);
}
if(typeof resolvePairCycle==='function') window.resolvePairCycle = resolvePairCycle;


// ════════════════════════════════════════════════════════════════════════
// AURA8 v93 · DÉBUT BLOC RESTAURATION
// ════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
// AURA8 v93 · BLOC RESTAURATION AUTO-INJECTÉ
// 59 fonctions reconstruites + variables module-level
// Sources : v69/v91
// 12 stubs vides de v92 remplacés par vraies versions
// 47 fonctions absentes restaurées
