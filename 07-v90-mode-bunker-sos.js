// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 07/10
// Contient : v90-mode-bunker-sos, veille-news-sociale, v5-1-brain-network-interactivity-tap-toolt, all-pairs-lmsr-gauges, open-positions-summary-home-page-v3-4
// ════════════════════════════════════════════════════════════
// ═══ v90 · MODE BUNKER SOS ═══
// Se déclenche automatiquement quand le capital chute de X%
// Passe en mode ultra-conservateur : mises minimales, bots en veille,
// positions réduites au strict minimum, alerte Telegram

let _bunkerTimer  = null;
const _BK_CAP_REF_KEY = 'aura_bunker_cap_ref_v90';

function _bkGet() {
  if(!S.bunkerCfg) S.bunkerCfg = {
    enabled:        true,
    triggerDropPct: 10,   // % de chute pour déclencher
    active:         false,
    startCapital:   null,
    triggerTs:      null,
    actions: {
      pauseBot:     true,
      reduceMises:  true,
      closePositions: false,  // risqué — off par défaut
      sendTelegram: true,
      saveBackup:   true,
    },
    minStakePct:    5,    // % des mises normales en mode bunker
    recoveryPct:    3,    // % de remontée pour sortir auto
  };
  return S.bunkerCfg;
}

// Initialiser la référence de capital
function _bkInitCapRef() {
  const cap = S.tradingAccount||0;
  if(cap>0) {
    // v118 FIX · Toujours réinitialiser la référence au démarrage
    // Évite les déclenchements parasites basés sur des anciens highs de sessions précédentes
    // La référence repart du capital actuel → le bunker ne peut déclencher que sur une chute FUTURE
    localStorage.setItem(_BK_CAP_REF_KEY, cap.toString());
  }
}

function _bkGetCapRef() {
  return parseFloat(localStorage.getItem(_BK_CAP_REF_KEY)||'0') || S.tradingAccount||1000;
}

// Vérifier si le bunker doit se déclencher
function checkBunker() {
  const cfg = _bkGet();
  if(!cfg.enabled || cfg.active) return;

  const cap    = S.tradingAccount||0;
  const capRef = _bkGetCapRef();
  if(capRef<=0) return;

  const dropPct = (capRef-cap)/capRef*100;

  if(dropPct >= cfg.triggerDropPct) {
    activateBunker(dropPct);
  }
  // Mettre à jour la référence si le capital monte (nouveau high)
  if(cap > capRef) {
    localStorage.setItem(_BK_CAP_REF_KEY, cap.toString());
  }
}
window.checkBunker = checkBunker;

function activateBunker(dropPct) {
  const cfg = _bkGet();
  if(cfg.active) return;
  cfg.active      = true;
  cfg.triggerTs   = Date.now();
  cfg.startCapital= S.tradingAccount||0;
  const dropStr   = (dropPct||0).toFixed(1);

  // Actions immédiates
  if(cfg.actions.pauseBot) {
  // S.botAutoMode = false;
  // S.mode = 'manual';
  // (S.agents||[]).forEach(a=>{ a._bunkerPaused=true; });
  }
  if(cfg.actions.reduceMises) {
    const prevStake = S.stakeConfig?.defaultStake||S.stakeUsdt||20;
    const newStake  = Math.max(1, Math.round(prevStake*cfg.minStakePct/100));
    if(S.stakeConfig) S.stakeConfig.defaultStake = newStake;
    S.stakeUsdt = newStake;
    (S.agents||[]).forEach(a=>{ if(a.stake&&!a._bunkerOrigStake) { a._bunkerOrigStake=a.stake; a.stake=Math.max(1,Math.round(a.stake*cfg.minStakePct/100)); }});
  }
  if(cfg.actions.closePositions) {
    try { urgenceCloseAll?.(); } catch(e) {}
  }
  if(cfg.actions.saveBackup) {
    try { _abExecute?.('bunker'); } catch(e) {}
  }
  if(cfg.actions.sendTelegram) {
    try { tgOnUrgence?.(`🚨 BUNKER : capital chute de ${dropStr}% · $${(S.tradingAccount||0).toFixed(2)}`); } catch(e) {}
  }

  // Bannière
  document.getElementById('bunkerBanner')?.classList.add('show');
  document.getElementById('pages')?.style.setProperty('padding-top','28px');
  _bkUpdateBanner();

  // Vibration et son
  try { navigator.vibrate?.([500,100,500,100,500]); } catch(e) {}
  try { if(typeof playSound==='function') playSound('urgence'); } catch(e) {}

  // Toast
  showToast(`🚨 BUNKER activé — Capital -${dropStr}% · Mises réduites`, 5000, 'warn');
  S.chainLog = S.chainLog||[];
  S.chainLog.push({icon:'🚨',desc:`BUNKER: capital -${dropStr}% ($${(S.tradingAccount||0).toFixed(2)}) · actions ${Object.entries(cfg.actions).filter(([,v])=>v).map(([k])=>k).join(',')}`,hash:Math.random().toString(36).slice(2,8),time:new Date().toLocaleTimeString()});

  _bunkerTimer = setInterval(_bkAutoCheck, 60000);
  renderBunkerSection();
}
window.activateBunker = activateBunker;

// Check auto sortie
function _bkAutoCheck() {
  const cfg    = _bkGet();
  if(!cfg.active) return;
  _bkUpdateBanner();
  const cap    = S.tradingAccount||0;
  const start  = cfg.startCapital||cap;
  if(start>0 && (cap-start)/start*100 >= cfg.recoveryPct) {
    showToast(`✅ Capital récupéré +${cfg.recoveryPct}% — Bunker levé automatiquement`, 3500, 'win');
    exitBunker();
  }
}

function _bkUpdateBanner() {
  const cfg    = _bkGet();
  const capRef = _bkGetCapRef();
  const cap    = S.tradingAccount||0;
  const drop   = capRef>0?(capRef-cap)/capRef*100:0;
  const infoEl = document.getElementById('bunkerInfo');
  if(infoEl) infoEl.textContent = `Capital -${drop.toFixed(1)}% depuis la référence · $${cap.toFixed(0)}`;
}

function exitBunker() {
  const cfg = _bkGet();
  clearInterval(_bunkerTimer); _bunkerTimer=null;

  // Restaurer mises
  (S.agents||[]).forEach(a=>{
    if(a._bunkerOrigStake) { a.stake=a._bunkerOrigStake; delete a._bunkerOrigStake; }
    delete a._bunkerPaused;
  });

  // Nouvelle référence = capital actuel
  const cap = S.tradingAccount||0;
  if(cap>0) localStorage.setItem(_BK_CAP_REF_KEY, cap.toString());

  cfg.active = false;
  document.getElementById('bunkerBanner')?.classList.remove('show');
  document.getElementById('pages')?.style.removeProperty('padding-top');
  showToast('🏳️ Mode Bunker levé — Capital référence réinitialisé', 3000, 'win');
  renderBunkerSection();
}
window.exitBunker = exitBunker;

function toggleBkAction(key) {
  const cfg = _bkGet();
  cfg.actions[key] = !cfg.actions[key];
  renderBunkerSection();
}
window.toggleBkAction = toggleBkAction;

function updateBkParam(key, val) {
  const cfg = _bkGet();
  cfg[key] = parseFloat(val)||0;
  renderBunkerSection();
}
window.updateBkParam = updateBkParam;

// Vérification automatique toutes les 2min
setInterval(()=>{ try { checkBunker(); } catch(e){}; }, 120000);
// Init référence au démarrage
setTimeout(()=>{ _bkInitCapRef(); _bkGet(); if(_bkGet().active){ document.getElementById('bunkerBanner')?.classList.add('show'); document.getElementById('pages')?.style.setProperty('padding-top','28px'); } }, 2000);

function renderBunkerSection() {
  const el  = document.getElementById('bunkerSection');
  if(!el) return;
  const cfg = _bkGet();
  const capRef = _bkGetCapRef();
  const cap    = S.tradingAccount||0;
  const dropPct= capRef>0?(capRef-cap)/capRef*100:0;
  const trigColor = dropPct >= cfg.triggerDropPct ? 'var(--down)' : dropPct >= cfg.triggerDropPct*0.7 ? 'var(--gold)' : 'var(--up)';

  el.innerHTML = `
    <div class="bk-section">
      <div class="bk-title">🚨 Mode Bunker SOS
        <span style="font-size:8px;color:${cfg.active?'var(--down)':'var(--t3)'};font-weight:400;">${cfg.active?'ACTIF':'En veille'}</span>
      </div>

      <!-- Status -->
      <div class="bk-status">
        <div style="font-size:28px;margin-bottom:6px;">${cfg.active?'🚨':'🛡️'}</div>
        <div style="font-size:${cfg.active?14:11}px;font-weight:900;color:${cfg.active?'var(--down)':'var(--t1)'};">${cfg.active?'BUNKER ACTIVÉ':'Protection active'}</div>
        <div style="font-size:9px;color:var(--t3);margin-top:4px;">
          Référence capital : $${capRef.toFixed(0)} · Actuel : $${cap.toFixed(0)}
        </div>
        <div style="font-size:11px;font-weight:700;margin-top:4px;color:${trigColor};">
          Chute actuelle : ${dropPct.toFixed(1)}% / seuil ${cfg.triggerDropPct}%
        </div>
        ${cfg.active?`
        <button onclick="exitBunker()" style="margin-top:8px;padding:6px 16px;border-radius:7px;background:rgba(255,61,107,.12);border:1px solid rgba(255,61,107,.3);color:var(--down);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;">🏳️ Lever le bunker</button>`:''}
      </div>

      <!-- Toggle principal -->
      <div style="display:flex;align-items:center;gap:10px;background:var(--s2);border-radius:8px;padding:8px 10px;margin-bottom:10px;">
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:var(--t1);">Activation automatique</div>
          <div style="font-size:8px;color:var(--t3);">Déclenché si capital chute de ${cfg.triggerDropPct}%</div>
        </div>
        <button onclick="updateBkParam('enabled',${!cfg.enabled?1:0});renderBunkerSection();"
          style="padding:5px 12px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;
                 background:${cfg.enabled?'rgba(255,61,107,.12)':'rgba(255,255,255,.06)'};
                 border:1px solid ${cfg.enabled?'rgba(255,61,107,.3)':'var(--border)'};
                 color:${cfg.enabled?'var(--down)':'var(--t3)'};">
          ${cfg.enabled?'✅ Actif':'Activer'}
        </button>
      </div>

      <!-- Paramètres -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Paramètres</div>
      ${[
        {k:'triggerDropPct', lbl:'Seuil déclenchement', unit:'%', min:3, max:50, step:1},
        {k:'minStakePct',    lbl:'Mises réduites à',    unit:'%', min:1, max:30, step:1},
        {k:'recoveryPct',    lbl:'Remontée auto-sortie', unit:'%', min:1, max:20, step:1},
      ].map(p=>`<div class="bk-trigger-row">
        <span style="color:var(--t2);min-width:110px;">${p.lbl}</span>
        <input type="range" class="bk-slider" min="${p.min}" max="${p.max}" step="${p.step}"
          value="${cfg[p.k]||0}" oninput="updateBkParam('${p.k}',this.value);document.getElementById('bkV_${p.k}').textContent=this.value+' ${p.unit}';">
        <span id="bkV_${p.k}" style="font-size:9px;font-family:var(--font-mono);min-width:38px;text-align:right;color:var(--down);">${cfg[p.k]} ${p.unit}</span>
      </div>`).join('')}

      <!-- Actions -->
      <div style="font-size:9px;color:var(--t3);margin:8px 0 5px;">Actions au déclenchement</div>
      ${[
        {k:'pauseBot',       lbl:'⏸ Mettre le bot en pause'},
        {k:'reduceMises',    lbl:'📉 Réduire les mises'},
        {k:'closePositions', lbl:'🛑 Fermer les positions (risqué)'},
        {k:'sendTelegram',   lbl:'📲 Alerter via Telegram'},
        {k:'saveBackup',     lbl:'💾 Sauvegarder un backup'},
      ].map(a=>`<div class="bk-action">
        <span style="flex:1;color:var(--t2);">${a.lbl}</span>
        <button onclick="toggleBkAction('${a.k}')"
          style="padding:3px 10px;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;font-family:inherit;
                 background:${cfg.actions[a.k]?'rgba(255,61,107,.12)':'rgba(255,255,255,.06)'};
                 border:1px solid ${cfg.actions[a.k]?'rgba(255,61,107,.3)':'var(--border)'};
                 color:${cfg.actions[a.k]?'var(--down)':'var(--t3)'};">
          ${cfg.actions[a.k]?'✅ ON':'OFF'}
        </button>
      </div>`).join('')}

      <!-- Test -->
      <button onclick="activateBunker(cfg.triggerDropPct)"
        style="width:100%;margin-top:8px;padding:8px;border-radius:7px;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--t3);font-size:9px;cursor:pointer;font-family:inherit;">
        🧪 Simuler un déclenchement (test)
      </button>

      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">
        Vérification automatique toutes les 2min · Sortie auto si capital remonte ${cfg.recoveryPct}%
      </div>
    </div>`;
}
window.renderBunkerSection = renderBunkerSection;



// Fermer le mode cinéma si touche Escape
document.addEventListener('keydown', e=>{ if(e.key==='Escape'&&_cinActive) closeCinema(); });



// Auto-sync au démarrage
setTimeout(()=>{ try { memRecordSession(); } catch(e){}; }, 3000);






// Vérifier au démarrage si les vacances sont actives
setTimeout(()=>{
  const cfg = _vacGet();
  if(cfg.active) {
    document.getElementById('vacancesBanner')?.classList.add('show');
    document.getElementById('pages')?.style.setProperty('padding-top','28px');
    _vacUpdateBanner();
    _vacTimer = setInterval(_vacDailyCheck, 3600000);
  }
}, 500);


// Auto-fetch au premier rendu
setTimeout(()=>{ try { _lbFetchBenchmarks().then(renderLeaderboardSection); } catch(e){} }, 1500);


// Hook dans renderHome pour mettre à jour le widget si ouvert







// Auto-fetch au premier chargement de l'onglet Analytics
setTimeout(()=>{ try { refreshPriceHist(false); } catch(e){} }, 2000);








// ═══ v64 · AVATAR PERSONNALISÉ ═══
// Emoji + couleur + pseudo + rang basé sur les performances réelles
// Affiché dans l'en-tête, les exports, le dashboard public

const _AV_EMOJIS = [
  '🦁','🐯','🦅','🦊','🐺','🦋','🦄','🐉','🤖','👾',
  '🎯','⚡','🔥','💎','🚀','🌙','⭐','🏆','💀','🎭',
  '🧠','🌊','🎮','🎪','🦸','🕵️','🧙','🥷','🤺','🎲',
];

const _AV_COLORS = [
  '#38d4f5','#00e87a','#ff3d6b','#f5c842','#a855f7',
  '#f97316','#ec4899','#06b6d4','#84cc16','#ef4444',
  '#8b5cf6','#14b8a6',
];

// Rang automatique basé sur les performances
function _avComputeRank() {
  const n  = S.totalTrades||0;
  const wr = n>0?Math.round((S.winTrades||0)/n*100):0;
  const totalPnl = Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalPnlUsd||0),0);
  const m  = typeof computeAdvancedMetrics==='function'?computeAdvancedMetrics():null;
  const sharpe = m?.sharpe||0;

  // Score combiné
  const score = (wr*0.4) + (Math.min(n,200)/200*100*0.2) + (Math.min(Math.max(totalPnl,0),1000)/1000*100*0.2) + (Math.min(Math.max(sharpe,0),3)/3*100*0.2);

  if(score>=85) return {rank:'LÉGENDE',emoji:'👑',col:'#f5c842',next:'Tu es au sommet.'};
  if(score>=70) return {rank:'MAÎTRE',emoji:'💎',col:'#a855f7',next:`${Math.ceil(85-score)} pts pour LÉGENDE`};
  if(score>=55) return {rank:'EXPERT',emoji:'🔥',col:'#f97316',next:`${Math.ceil(70-score)} pts pour MAÎTRE`};
  if(score>=40) return {rank:'AVANCÉ',emoji:'⚡',col:'#38d4f5',next:`${Math.ceil(55-score)} pts pour EXPERT`};
  if(score>=25) return {rank:'INTERMÉDIAIRE',emoji:'🌱',col:'#00e87a',next:`${Math.ceil(40-score)} pts pour AVANCÉ`};
  return {rank:'DÉBUTANT',emoji:'🐣',col:'#9ca3af',next:`${Math.ceil(25-score)} pts pour INTERMÉDIAIRE`};
}

function _avGet() {
  if(!S.avatar) S.avatar = {
    emoji: _AV_EMOJIS[0],
    color: _AV_COLORS[0],
    pseudo: 'AURA Trader',
    showInHeader: true,
  };
  return S.avatar;
}

function setAvEmoji(emoji) {
  const av = _avGet();
  av.emoji = emoji;
  _avUpdateHeader();
  renderAvatarSection();
}
window.setAvEmoji = setAvEmoji;

function setAvColor(color) {
  const av = _avGet();
  av.color = color;
  _avUpdateHeader();
  renderAvatarSection();
}
window.setAvColor = setAvColor;

function updateAvPseudo() {
  const av  = _avGet();
  const el  = document.getElementById('avPseudoInput');
  if(el) av.pseudo = el.value.trim().slice(0,25)||'AURA Trader';
  _avUpdateHeader();
  // Sync avec dashboard public
  if(S.dashPublic) S.dashPublic.nickname = av.pseudo;
}
window.updateAvPseudo = updateAvPseudo;

function _avUpdateHeader() {
  const av = _avGet();
  // Mettre à jour le logo si possible
  const logo = document.querySelector('.logo-text, #logoArea, .header-logo');
  if(logo) logo.title = av.pseudo;
  // Mettre à jour versionDisplay avec le pseudo
  const vd = document.getElementById('versionDisplay');
  if(vd && av.showInHeader) vd.title = av.emoji+' '+av.pseudo;
}

function renderAvatarSection() {
  const el  = document.getElementById('avatarSection');
  if(!el) return;
  const av  = _avGet();
  const rank= _avComputeRank();
  const n   = S.totalTrades||0;
  const wr  = n>0?Math.round((S.winTrades||0)/n*100):0;
  const totalPnl = Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalPnlUsd||0),0);

  // Hall of fame (top agents comme "compagnons")
  const topAgents = [...(S.agents||[])].sort((a,b)=>(b.fitness||0)-(a.fitness||0)).slice(0,3);

  el.innerHTML = `
    <div class="av-section">
      <div class="av-title">🎭 Avatar Personnalisé</div>

      <!-- Aperçu -->
      <div class="av-preview">
        <div class="av-circle" style="background:${av.color}22;border-color:${av.color};">
          ${av.emoji}
          <div style="position:absolute;bottom:-4px;right:-4px;font-size:14px;">${rank.emoji}</div>
        </div>
        <div class="av-name" style="color:${av.color};">${av.pseudo}</div>
        <span class="av-badge" style="background:${rank.col}18;color:${rank.col};">
          ${rank.rank}
        </span>
        <div style="font-size:8px;color:var(--t3);margin-top:6px;">
          ${n} trades · ${wr}% WR · ${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)} net
        </div>
        <div style="font-size:8px;color:var(--t3);margin-top:2px;">${rank.next}</div>
      </div>

      <!-- Pseudo -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:4px;">Ton pseudo</div>
      <input class="av-input" id="avPseudoInput" type="text" maxlength="25"
        value="${av.pseudo}" onchange="updateAvPseudo()" placeholder="Ton nom de trader">

      <!-- Choix emoji -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Ton emoji</div>
      <div class="av-grid">
        ${_AV_EMOJIS.map(e=>`
          <button class="av-emoji-btn ${e===av.emoji?'active':''}" onclick="setAvEmoji('${e}')"
            style="${e===av.emoji?'background:rgba(56,212,245,.12);':''}">
            ${e}
          </button>`).join('')}
      </div>

      <!-- Choix couleur -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Ta couleur</div>
      <div class="av-color-grid">
        ${_AV_COLORS.map(col=>`
          <div class="av-color-btn ${col===av.color?'active':''}"
            style="background:${col};${col===av.color?'border-color:var(--t1);':''}"
            onclick="setAvColor('${col}')"></div>`).join('')}
      </div>

      <!-- Rang & progression -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Rangs disponibles</div>
      ${[
        {r:'DÉBUTANT',e:'🐣',c:'#9ca3af',req:'Commencer à trader'},
        {r:'INTERMÉDIAIRE',e:'🌱',c:'#00e87a',req:'Score ≥ 25'},
        {r:'AVANCÉ',e:'⚡',c:'#38d4f5',req:'Score ≥ 40'},
        {r:'EXPERT',e:'🔥',c:'#f97316',req:'Score ≥ 55'},
        {r:'MAÎTRE',e:'💎',c:'#a855f7',req:'Score ≥ 70'},
        {r:'LÉGENDE',e:'👑',c:'#f5c842',req:'Score ≥ 85'},
      ].map(rk=>`<div class="av-hof">
        <span style="font-size:18px;">${rk.e}</span>
        <div style="flex:1;">
          <span style="font-weight:700;color:${rk.c};">${rk.r}</span>
          <div style="font-size:8px;color:var(--t3);">${rk.req}</div>
        </div>
        ${rk.r===rank.rank?`<span class="av-rank-badge" style="background:${rk.c}18;color:${rk.c};">ACTIF</span>`:''}
      </div>`).join('')}

      <!-- Top agents compagnons -->
      ${topAgents.length>0?`
      <div style="font-size:9px;color:var(--t3);margin:8px 0 5px;">Tes agents compagnons</div>
      ${topAgents.map(a=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:10px;">
        <span style="font-size:18px;">${a.emoji||'🤖'}</span>
        <span style="font-weight:700;color:var(--t1);">${a.name||'—'}</span>
        <span style="flex:1;"></span>
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--ice);">${Math.floor(a.fitness||0)} T$</span>
      </div>`).join('')}`:''}
    </div>`;
}
window.renderAvatarSection = renderAvatarSection;
// ═══ v65 · CITATIONS MOTIVATIONNELLES ═══
// 50 citations triées par contexte (victoire, défaite, discipline, risk, patience)
// Citation du jour déterministe + aléatoire + adaptée au contexte AURA

const _CITATIONS = [
  // 🏆 Victoire / Performance
  {text:"Le secret du succès, c'est de savoir quelque chose que personne d'autre ne sait.",author:"Aristote Onassis",cat:"victoire"},
  {text:"Chaque trade gagnant est la preuve que ton système fonctionne. Fais-lui confiance.",author:"AURA ∞",cat:"victoire"},
  {text:"La confiance se construit un trade à la fois.",author:"Mark Douglas",cat:"victoire"},
  {text:"Les marchés récompensent la patience et punissent l'impatience.",author:"Warren Buffett",cat:"victoire"},
  {text:"Une série de victoires ne vient pas du talent, elle vient du process.",author:"AURA ∞",cat:"victoire"},
  {text:"Le succès est la somme de petits efforts répétés jour après jour.",author:"Robert Collier",cat:"victoire"},
  {text:"Gagne avec humilité. Chaque marché peut te surprendre demain.",author:"AURA ∞",cat:"victoire"},

  // 💪 Discipline / Méthode
  {text:"Les amateurs espèrent. Les professionnels travaillent.",author:"Garry Kasparov",cat:"discipline"},
  {text:"Un plan sans exécution est un rêve. Une exécution sans plan est un cauchemar.",author:"AURA ∞",cat:"discipline"},
  {text:"La discipline est le pont entre les objectifs et les résultats.",author:"Jim Rohn",cat:"discipline"},
  {text:"Suis ton système même quand tu n'en as pas envie. C'est exactement là que les profits se cachent.",author:"AURA ∞",cat:"discipline"},
  {text:"Les marchés ne bougent pas selon tes émotions. Adapte-toi.",author:"George Soros",cat:"discipline"},
  {text:"Chaque règle de trading que tu brises coûte de l'argent.",author:"Alexander Elder",cat:"discipline"},
  {text:"La consistance est plus précieuse que la perfection.",author:"AURA ∞",cat:"discipline"},
  {text:"La patience n'est pas passive. C'est la forme la plus haute d'action.",author:"Lao Tseu",cat:"discipline"},

  // 📉 Après une perte
  {text:"Une perte n'est qu'un coût d'apprentissage que tu ne payeras pas deux fois.",author:"AURA ∞",cat:"perte"},
  {text:"Il n'existe pas de trader gagnant qui n'ait jamais perdu.",author:"Paul Tudor Jones",cat:"perte"},
  {text:"Ce n'est pas combien tu perds qui compte, c'est combien tu gardes.",author:"Warren Buffett",cat:"perte"},
  {text:"Après chaque tempête, le soleil revient. Reste dans le jeu.",author:"AURA ∞",cat:"perte"},
  {text:"Un professionnel accepte la perte. Un amateur la nie.",author:"Mark Douglas",cat:"perte"},
  {text:"La résilience est le vrai edge du trader.",author:"AURA ∞",cat:"perte"},
  {text:"Protège ton capital. Il te permettra de trader un autre jour.",author:"Jesse Livermore",cat:"perte"},
  {text:"La perte fait partie du jeu. Ce qui compte, c'est ton espérance mathématique sur mille trades.",author:"AURA ∞",cat:"perte"},

  // ⚖️ Gestion du risque
  {text:"La règle n°1 : ne jamais perdre d'argent. Règle n°2 : ne jamais oublier la règle n°1.",author:"Warren Buffett",cat:"risque"},
  {text:"Le risque vient de ne pas savoir ce que tu fais.",author:"Warren Buffett",cat:"risque"},
  {text:"Size your position like you know you might be wrong.",author:"Ray Dalio",cat:"risque"},
  {text:"Survivre est la priorité. Les profits viennent ensuite.",author:"AURA ∞",cat:"risque"},
  {text:"Ne risque jamais ce que tu ne peux pas te permettre de perdre.",author:"Nick Leeson",cat:"risque"},
  {text:"Un bon risk management permet de revenir jouer demain.",author:"AURA ∞",cat:"risque"},
  {text:"La différence entre un trader et un joueur : la gestion du risque.",author:"AURA ∞",cat:"risque"},

  // 🧠 Psychologie / Mindset
  {text:"Tes émotions sont les meilleurs indicateurs à contre-suivre.",author:"AURA ∞",cat:"mindset"},
  {text:"Le marché est un transfert d'argent des impatients vers les patients.",author:"Warren Buffett",cat:"mindset"},
  {text:"Ton pire ennemi en trading, c'est toi-même.",author:"Jesse Livermore",cat:"mindset"},
  {text:"Quand tu veux forcer un trade, c'est souvent le signal de ne rien faire.",author:"AURA ∞",cat:"mindset"},
  {text:"Le calme est l'arme secrète du trader.",author:"AURA ∞",cat:"mindset"},
  {text:"L'ego est le plus grand ennemi du trading.",author:"Ray Dalio",cat:"mindset"},
  {text:"Trade ce que tu vois, pas ce que tu crois.",author:"AURA ∞",cat:"mindset"},
  {text:"Un trader sans journal est un médecin sans dossier patient.",author:"AURA ∞",cat:"mindset"},

  // 🚀 Crypto / Innovation
  {text:"Bitcoin est l'internet de l'argent.",author:"Andreas Antonopoulos",cat:"crypto"},
  {text:"Le crypto ne dort jamais. Mais toi, tu devrais.",author:"AURA ∞",cat:"crypto"},
  {text:"La volatilité n'est pas un bug, c'est une feature.",author:"AURA ∞",cat:"crypto"},
  {text:"Dans le crypto, la patience est mesurée en cycles de halving.",author:"AURA ∞",cat:"crypto"},
  {text:"Le marché crypto amplifie tout : les gains, les pertes et les émotions.",author:"AURA ∞",cat:"crypto"},
  {text:"HODLer sans comprendre, c'est parier. Trader avec un système, c'est investir.",author:"AURA ∞",cat:"crypto"},

  // ✨ Inspirationnelles
  {text:"Ce que tu répètes chaque jour devient ce que tu es.",author:"AURA ∞",cat:"inspiration"},
  {text:"Le meilleur moment pour commencer était hier. Le deuxième meilleur moment, c'est maintenant.",author:"Proverbe chinois",cat:"inspiration"},
  {text:"La route du succès est toujours en construction.",author:"Lily Tomlin",cat:"inspiration"},
  {text:"Chaque expert était un jour un débutant.",author:"Helen Hayes",cat:"inspiration"},
  {text:"Les opportunités ne se perdent pas. Elles vont simplement à quelqu'un d'autre.",author:"AURA ∞",cat:"inspiration"},
];

let _citCurrentIdx = 0;
let _citFilter     = 'all';

// Citation du jour (déterministe par date)
function _citOfDay() {
  const dayNum = Math.floor(Date.now()/86400000);
  return _CITATIONS[dayNum % _CITATIONS.length];
}

// Citation adaptée au contexte AURA
function _citContextual() {
  const n  = S.totalTrades||0;
  const wr = n>0?Math.round((S.winTrades||0)/n*100):0;
  const lastTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.ts).sort((a,b)=>b.ts-a.ts).slice(0,3)
  );
  const recentLoss = lastTrades.filter(t=>(t.pnlUsdt||0)<0).length;

  // Choisir la catégorie selon le contexte
  let cat = 'mindset';
  if(n===0)          cat = 'inspiration';
  else if(recentLoss>=2) cat = 'perte';
  else if(wr>=65)        cat = 'victoire';
  else if(wr<45&&n>10)   cat = 'discipline';
  else                   cat = ['mindset','risque','crypto','discipline'][Math.floor(Math.random()*4)];

  const pool = _CITATIONS.filter(c=>c.cat===cat);
  return pool[Math.floor(Math.random()*pool.length)] || _CITATIONS[0];
}

function nextCitation() {
  const pool = _citFilter==='all' ? _CITATIONS : _CITATIONS.filter(c=>c.cat===_citFilter);
  _citCurrentIdx = (_citCurrentIdx+1) % pool.length;
  renderCitationSection();
}
window.nextCitation = nextCitation;

function prevCitation() {
  const pool = _citFilter==='all' ? _CITATIONS : _CITATIONS.filter(c=>c.cat===_citFilter);
  _citCurrentIdx = (_citCurrentIdx-1+pool.length) % pool.length;
  renderCitationSection();
}
window.prevCitation = prevCitation;

function setCitFilter(f) {
  _citFilter    = f;
  _citCurrentIdx= 0;
  renderCitationSection();
}
window.setCitFilter = setCitFilter;

function shareCitation() {
  const pool = _citFilter==='all' ? _CITATIONS : _CITATIONS.filter(c=>c.cat===_citFilter);
  const cit  = pool[_citCurrentIdx]||pool[0];
  const text = `"${cit.text}"\n— ${cit.author}\n\n📊 AURA ∞ Trading`;
  if(navigator.share) {
    navigator.share({text}).catch(()=>{});
  } else if(navigator.clipboard) {
    navigator.clipboard.writeText(text).then(()=>_showCitToast('📋 Citation copiée !'));
  }
}
window.shareCitation = shareCitation;

function _showCitToast(msg) {
  const el = document.getElementById('citToast');
  const tx = document.getElementById('citToastText');
  if(!el||!tx) return;
  tx.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2500);
}

// Afficher citation aléatoire comme toast (appelable depuis partout)
function showMotivationalQuote() {
  const cit = _citContextual();
  _showCitToast(`"${cit.text.slice(0,80)}${cit.text.length>80?'…':''}" — ${cit.author}`);
}
window.showMotivationalQuote = showMotivationalQuote;

// Afficher une citation après chaque trade gagnant
const _origCheckBadges = typeof checkBadges==='function' ? checkBadges : null;
function _maybeShowQuote() {
  const lastT = Object.values(S.pairStates||{}).flatMap(ps=>ps.trades||[]).filter(t=>t.type==='position').sort((a,b)=>(b.ts||0)-(a.ts||0))[0];
  if(lastT&&(lastT.pnlUsdt||0)>0&&(Date.now()-(lastT.ts||0))<5000) {
    setTimeout(showMotivationalQuote, 1500);
  }
}

function renderCitationSection() {
  const el = document.getElementById('citationSection');
  if(!el) return;

  const pool = _citFilter==='all' ? _CITATIONS : _CITATIONS.filter(c=>c.cat===_citFilter);
  const idx  = _citCurrentIdx % pool.length;
  const cit  = pool[idx] || _CITATIONS[0];
  const daily= _citOfDay();
  const ctx  = _citContextual();

  const catColors = {victoire:'var(--up)',discipline:'var(--ice)',perte:'var(--t3)',risque:'var(--down)',mindset:'var(--pur)',crypto:'var(--gold)',inspiration:'#ec4899'};
  const catEmojis = {victoire:'🏆',discipline:'⚖️',perte:'💪',risque:'🛡️',mindset:'🧠',crypto:'₿',inspiration:'✨',all:'📖'};
  const col  = catColors[cit.cat]||'var(--t1)';

  el.innerHTML = `
    <div class="cit-section">
      <div class="cit-title">💬 Citations Motivationnelles
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${_CITATIONS.length} citations</span>
      </div>

      <!-- Citation du jour pour le contexte -->
      <div class="cit-daily-card">
        <div style="font-size:8px;color:var(--pur);font-weight:700;margin-bottom:6px;">🌟 Pour toi en ce moment</div>
        <div style="font-size:11px;font-style:italic;color:var(--t1);line-height:1.5;margin-bottom:4px;">"${ctx.text}"</div>
        <div style="font-size:8px;color:var(--t3);">— ${ctx.author}</div>
      </div>

      <!-- Filtres catégories -->
      <div class="cit-filter-row">
        ${['all','victoire','discipline','perte','risque','mindset','crypto','inspiration'].map(f=>`
          <button class="cit-filter ${_citFilter===f?'active':''}" onclick="setCitFilter('${f}')">
            ${catEmojis[f]||'📖'} ${f==='all'?'Toutes':f.charAt(0).toUpperCase()+f.slice(1)}
          </button>`).join('')}
      </div>

      <!-- Citation principale -->
      <div class="cit-main">
        <span class="cit-category" style="background:${col}18;color:${col};">${catEmojis[cit.cat]} ${cit.cat}</span>
        <div class="cit-text">"${cit.text}"</div>
        <div class="cit-author">— ${cit.author}</div>
      </div>

      <!-- Navigation + partage -->
      <div class="cit-btn-row">
        <button class="cit-btn" onclick="prevCitation()">◀ Préc.</button>
        <button class="cit-btn" onclick="shareCitation()" style="background:rgba(167,139,250,.08);border-color:rgba(167,139,250,.25);color:var(--pur);">📤 Partager</button>
        <button class="cit-btn" onclick="nextCitation()">Suiv. ▶</button>
      </div>

      <!-- Citation du jour -->
      <div style="background:rgba(56,212,245,.04);border:1px solid rgba(56,212,245,.1);border-radius:8px;padding:8px 10px;">
        <div style="font-size:8px;color:var(--ice);font-weight:700;margin-bottom:4px;">📅 Citation du jour</div>
        <div style="font-size:10px;font-style:italic;color:var(--t2);line-height:1.4;">"${daily.text}"</div>
        <div style="font-size:8px;color:var(--t3);margin-top:3px;">— ${daily.author}</div>
      </div>

      <div style="font-size:8px;color:var(--t3);text-align:center;margin-top:8px;">
        ${idx+1}/${pool.length} · Une citation apparaît aussi après chaque trade gagnant 🏆
      </div>
    </div>`;
}
window.renderCitationSection = renderCitationSection;











// Init : afficher bouton PiP
setTimeout(()=>{ document.getElementById('pipBtnOpen')?.classList.add('show'); }, 1000);







// ═══ v48 · THEME SWITCHER ═══
let _tsOpen = false;

function toggleTsSwitcher() {
  _tsOpen = !_tsOpen;
  const menu = document.getElementById('themeSwitcherMenu');
  if(menu) menu.classList.toggle('show', _tsOpen);
  if(_tsOpen) _updateTsMenu();
}
window.toggleTsSwitcher = toggleTsSwitcher;

function closeTsSwitcher() {
  _tsOpen = false;
  const menu = document.getElementById('themeSwitcherMenu');
  if(menu) menu.classList.remove('show');
}
window.closeTsSwitcher = closeTsSwitcher;

function _updateTsMenu() {
  const cur    = S.uiSettings?.theme || 'nuit';
  const autoOn = S.uiSettings?.themeAuto || false;
  // Marquer le thème actif
  ['nuit','aube','jour','deep'].forEach(k=>{
    const el = document.getElementById('ts-'+k);
    if(el) el.classList.toggle('active', cur===k);
  });
  const autoEl = document.getElementById('ts-auto');
  if(autoEl) {
    autoEl.classList.toggle('active', autoOn);
    autoEl.textContent = (autoOn ? '✅ ' : '') + '🌓 Auto';
  }
  // Emoji bouton selon thème actuel
  const icons = { nuit:'🌙', aube:'🌆', jour:'☀️', deep:'🌑' };
  const btn = document.getElementById('themeSwitcherBtn');
  if(btn) btn.textContent = icons[cur] || '🎨';
}
window._updateTsMenu = _updateTsMenu;

// Fermer si clic en dehors
document.addEventListener('click', e=>{
  if(_tsOpen && !document.getElementById('themeSwitcher')?.contains(e.target)) closeTsSwitcher();
});

// Hook dans applyTheme pour mettre à jour le bouton
const _origApplyTheme = typeof applyTheme==='function' ? applyTheme : null;
if(_origApplyTheme) {
  window.applyTheme = function(key, save) {
    _origApplyTheme(key, save);
    setTimeout(_updateTsMenu, 50);
  };
}

// Init bouton au démarrage
setTimeout(_updateTsMenu, 500);




function exportHebdoPdf(offset) {
  const { trades, monday, sunday } = _getWeekTrades(offset);
  const stats = _analyzeWeek(trades, monday, sunday);
  const fmtDate = d => d.toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
  const now = new Date();

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>AURA — Résumé semaine ${fmtDate(monday)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;padding:15mm;font-size:10pt;}
h1{font-size:18pt;font-weight:900;color:#0a0a1a;margin-bottom:4px;}
h2{font-size:11pt;font-weight:700;color:#1a1a2e;margin:14px 0 6px;border-bottom:2px solid #e5e7eb;padding-bottom:3px;}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0;}
.kpi{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:8px;text-align:center;}
.kpi-val{font-size:15pt;font-weight:800;display:block;}
.kpi-lbl{font-size:7pt;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-top:2px;}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:9pt;}
th{background:#1a1a2e;color:#fff;padding:5px 8px;text-align:left;font-size:8pt;}
td{padding:4px 8px;border-bottom:1px solid #f1f5f9;}
tr:nth-child(even) td{background:#f8fafc;}
.win{color:#16a34a;font-weight:700;} .loss{color:#dc2626;font-weight:700;}
.insight{background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:8px 10px;font-size:9pt;margin:8px 0;line-height:1.6;}
.footer{margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:7pt;color:#9ca3af;display:flex;justify-content:space-between;}
@media print{body{padding:8mm;}}
</style></head><body>
<h1>AURA ∞ — Résumé hebdomadaire</h1>
<p style="color:#6b7280;font-size:9pt;margin-bottom:16px;">
  Semaine du ${fmtDate(monday)} au ${fmtDate(sunday)} · Généré le ${now.toLocaleDateString('fr-FR')}
</p>
<h2>📊 Performance de la semaine</h2>
<div class="kpi-grid">
  <div class="kpi"><span class="kpi-val" style="color:${stats.totalPnl>=0?'#16a34a':'#dc2626'};">${stats.totalPnl>=0?'+':''}$${stats.totalPnl.toFixed(2)}</span><span class="kpi-lbl">P&L Net</span></div>
  <div class="kpi"><span class="kpi-val" style="color:${(stats.wr||0)>=0.55?'#16a34a':'#dc2626'};">${stats.wr!==null?Math.round(stats.wr*100)+'%':'—'}</span><span class="kpi-lbl">Win Rate</span></div>
  <div class="kpi"><span class="kpi-val">${stats.n}</span><span class="kpi-lbl">Trades</span></div>
  <div class="kpi"><span class="kpi-val" style="color:#16a34a;">+$${stats.avgWin.toFixed(2)}</span><span class="kpi-lbl">Gain moyen</span></div>
  <div class="kpi"><span class="kpi-val" style="color:#dc2626;">-$${stats.avgLoss.toFixed(2)}</span><span class="kpi-lbl">Perte moyenne</span></div>
  <div class="kpi"><span class="kpi-val">${stats.avgWin>0&&stats.avgLoss>0?(stats.avgWin/stats.avgLoss).toFixed(2):'—'}</span><span class="kpi-lbl">R/R Ratio</span></div>
</div>
<h2>₿ Par paire</h2>
<table><tr><th>Paire</th><th>Trades</th><th>WR%</th><th>P&L $</th></tr>
${stats.pairRanked.map(([pair,p])=>`<tr><td><b>${pair}</b></td><td>${p.count}</td><td class="${p.count>0&&p.wins/p.count>=0.55?'win':'loss'}">${p.count>0?Math.round(p.wins/p.count*100)+'%':'—'}</td><td class="${p.pnl>=0?'win':'loss'}">${p.pnl>=0?'+':''}$${p.pnl.toFixed(2)}</td></tr>`).join('')}
</table>
<h2>💡 Insights automatiques</h2>
<div class="insight">${stats.insights.map(i=>`<div>▸ ${i}</div>`).join('')}</div>
<h2>📈 Détail des trades</h2>
<table><tr><th>#</th><th>Date</th><th>Paire</th><th>Côté</th><th>P&L $</th><th>Résultat</th></tr>
${trades.map((t,i)=>`<tr><td>${i+1}</td><td>${t.time||'—'}</td><td>${t.pair||'—'}</td><td>${t.side==='buy'?'LONG':'SHORT'}</td><td class="${(t.pnlUsdt||0)>=0?'win':'loss'}">${(t.pnlUsdt||0)>=0?'+':''}$${(t.pnlUsdt||0).toFixed(2)}</td><td class="${(t.pnlUsdt||0)>=0?'win':'loss'}">${(t.pnlUsdt||0)>=0?'✅ WIN':'❌ LOSS'}</td></tr>`).join('')}
</table>
<div class="footer"><span>AURA ∞ — Adaptive Universal Risk Architect</span><span>Rapport automatique</span></div>

<!-- v79 WIDGET COMPACT -->
<div id="compactWidgetTab" onclick="toggleCompactWidget()" title="Widget compact">⊛</div>
<div id="compactWidget">
  <div class="cw-row">
    <span class="cw-lbl">Capital</span>
    <span class="cw-val" id="cwCapital" style="color:var(--ice);">$0</span>
  </div>
  <div class="cw-row">
    <span class="cw-lbl">P&L 24h</span>
    <span class="cw-val" id="cwPnl">$0</span>
  </div>
  <div class="cw-sep"></div>
  <div class="cw-row">
    <span class="cw-lbl">WR</span>
    <span class="cw-val" id="cwWr">—</span>
  </div>
  <div class="cw-row">
    <span class="cw-lbl">Trades</span>
    <span class="cw-val" id="cwTrades">0</span>
  </div>
  <div class="cw-sep"></div>
  <div id="cwPairs" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;"></div>
  <div class="cw-row" style="margin-top:3px;">
    <span class="cw-lbl" id="cwRegime" style="font-size:7px;letter-spacing:.05em;"></span>
    <span id="cwPos" style="font-size:8px;font-weight:700;"></span>
  </div>
</div>

<!-- v81 VACANCES BANNER -->
<div id="vacancesBanner">
  <span>🏖️ MODE VACANCES</span>
  <span id="vacBannerInfo" style="opacity:.8;font-size:8px;"></span>
  <button onclick="exitVacancesMode()" style="background:rgba(255,255,255,.2);border:none;border-radius:6px;color:#fff;font-size:9px;font-weight:700;padding:2px 8px;cursor:pointer;">✕ Quitter</button>
</div>

<!-- v83 MOMENT DE GRACE -->
<div id="graceOverlay">
  <div class="gr-stars" id="grStars">⭐⭐⭐</div>
  <div class="gr-title">Moment de Grâce</div>
  <div class="gr-label" id="grLabel">Alignement parfait</div>
  <div class="gr-condition" id="grCondition"></div>
  <div class="gr-metrics" id="grMetrics"></div>
  <div class="gr-msg" id="grMsg"></div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
    <button class="gr-action-btn" onclick="graceActNow()">⚡ Trader maintenant</button>
    <button class="gr-action-btn" onclick="closeGrace()" style="background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15);color:rgba(255,255,255,.6);">Plus tard</button>
  </div>
  <div class="gr-dismiss" onclick="closeGrace()">Ignorer</div>
</div>

<!-- v84 ANTI-REVENGE -->
<div id="revengeBlock">
  <div class="rv-pulse">🛑</div>
  <div class="rv-title">STOP — REVENGE TRADING</div>
  <div class="rv-msg" id="rvMsg">Tu viens de perdre. Tes émotions veulent récupérer maintenant. Mais les données montrent que tes trades dans cet état finissent mal.</div>
  <div class="rv-stat" id="rvStat"></div>
  <div class="rv-breathe"></div>
  <div class="rv-timer" id="rvTimer">15:00</div>
  <div class="rv-timer-lbl">Temps de refroidissement</div>
  <button class="rv-unlock-btn" id="rvUnlockBtn" onclick="unlockRevenge()" disabled style="opacity:.3;cursor:default;">
    Continuer à trader (disponible dans <span id="rvUnlockIn">15:00</span>)
  </button>
  <div style="margin-top:10px;font-size:8px;color:rgba(255,255,255,.25);">Respire. Le marché sera encore là dans 15 minutes.</div>
</div>

<!-- v88 MODE CINÉMA -->
<div id="cinemaOverlay" onclick="closeCinema()">
  <!-- Top bar -->
  <div class="cin-top-bar">
    <span class="cin-logo">AURA ∞</span>
    <span class="cin-time" id="cinTime">--:--</span>
    <span class="cin-logo" id="cinRegime">CALM</span>
  </div>

  <!-- Centre -->
  <div class="cin-center" onclick="event.stopPropagation()">
    <div>
      <div class="cin-portfolio">Portfolio</div>
      <div class="cin-amount" id="cinAmount" style="color:#fff;">$0</div>
    </div>
    <div class="cin-pnl-row" id="cinPnlRow"></div>
    <div class="cin-pairs-row" id="cinPairsRow"></div>
  </div>

  <!-- Ticker -->
  <div class="cin-ticker">
    <div class="cin-ticker-track" id="cinTickerTrack"></div>
  </div>

  <!-- Bottom bar -->
  <div class="cin-bot-bar">
    <div class="cin-stat"><span class="cin-stat-val" id="cinWr">—</span><span class="cin-stat-lbl">Win Rate</span></div>
    <div class="cin-stat"><span class="cin-stat-val" id="cinTrades">0</span><span class="cin-stat-lbl">Trades</span></div>
    <div class="cin-stat"><span class="cin-stat-val" id="cinPos">0</span><span class="cin-stat-lbl">Positions</span></div>
    <div class="cin-stat"><span class="cin-stat-val" id="cinAgents">0</span><span class="cin-stat-lbl">Agents</span></div>
    <div class="cin-stat"><span class="cin-stat-val" id="cinRisk">—</span><span class="cin-stat-lbl">Risque</span></div>
  </div>

  <span class="cin-close-hint">Tap pour quitter</span>
</div>

<!-- v90 BUNKER BANNER -->
<div id="bunkerBanner">
  <span>🚨 MODE BUNKER ACTIF</span>
  <span id="bunkerInfo" style="opacity:.7;font-size:8px;"></span>
  <button onclick="exitBunker()" style="background:rgba(255,255,255,.1);border:none;border-radius:5px;color:#ff6b6b;font-size:8px;font-weight:700;padding:2px 8px;cursor:pointer;">LEVER</button>
</div>
</body></html>`;

  const win = window.open('','_blank','width=900,height=700');
  if(!win) { showToast('⚠ Autoriser les popups', 2000, 'warn'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(), 800);
  showToast('📄 Résumé hebdo ouvert — Enregistrer en PDF', 3000, 'user');
}
window.exportHebdoPdf = exportHebdoPdf;


// ═══ PANNEAU OUTILS AVANCÉS ═══
let _outilsTab = 'ui';

const _OUTILS_TABS = {
  ui: {
    label: '🎨 UI',
    sections: [
      { id:'nightModeSection', render:'renderNightModeSection', init:null },
      { id:'zenSection',       render:'renderZenSection',       init:null },
      { id:'badgesSection',     render:'renderBadgesSection',     init:null },
      { id:'multiCompteSection', render:'renderMultiCompteSection', init:null },
      { id:'avatarSection',      render:'renderAvatarSection',      init:null },
      { id:'cinemaSection',     render:'renderCinemaSection',     init:null },
      { id:'vacancesSection',    render:'renderVacancesSection',    init:null },
      { id:'compactWidgetSection', render:'renderCompactWidgetSection', init:null },
      { id:'soundSection',      render:'renderSoundSection',      init:null },
      { id:'citationSection',    render:'renderCitationSection',    init:null },
      { id:'demoSection',        render:'renderDemoSection',        init:null },
      { id:'dashPublicSection',  render:'renderDashPublicSection',  init:null },
      { id:'fundManagerSection',  render:'renderFundManagerSection',  init:null },
      { id:'widgetSection',       render:'renderWidgetSection',       init:null },
      { id:'pipSection',          render:'renderPipSection',          init:null },
      { id:'aodSection',          render:'renderAodSection',          init:null },
      { id:'gsSection',           render:'renderGsSection',           init:null },
      { id:'apiSection',          render:'renderApiSection',          init:null },
    ]
  },
  analytics: {
    label: '📊 Analytics',
    sections: [
      { id:'riskScoreSection',  render:'renderRiskScoreSection',  init:null },
      { id:'graceSection',      render:'renderGraceSection',      init:null },
      { id:'weatherSection',    render:'renderWeatherSection',    init:null },
      { id:'memorySection',     render:'renderMemorySection',     init:null },
      { id:'conscienceSection',  render:'renderConscienceSection',  init:null },
      { id:'leaderboardSection', render:'renderLeaderboardSection', init:null },
      { id:'priceHistSection',  render:'renderPriceHistSection',  init:null },
      { id:'riskScoreSection',  render:'renderRiskScoreSection',  init:null },
      { id:'btcImpactSection',  render:'renderBtcImpactSection',  init:null },
      { id:'corrSection',         render:'renderCorrSection',         init:null },
      { id:'calSection',          render:'renderCalSection',          init:null },
      { id:'newsScoreSection',    render:'renderNewsScoreSection',    init:null },
      { id:'feeAnalysisSection',  render:'renderFeeAnalysisSection',  init:null },
      { id:'patternSection',      render:'renderPatternSection',      init:null },
      { id:'fiscalSection',       render:'renderFiscalSection',       init:null },
      { id:'coachSection',        render:'renderCoachSection',        init:null },
      { id:'pairScoreSection',    render:'renderPairScoreSection',    init:null },
      { id:'heatmapSection',      render:'renderHeatmapSection',      init:null },
      { id:'drawdownSection',     render:'renderDrawdownSection',     init:null },
      { id:'mlPredSection',       render:'renderMlPredSection',       init:null },
      { id:'sentimentNewsSection',render:'renderSentimentNewsSection',init:null },
    ]
  },
  agents: {
    label: '🤖 Agents',
    sections: [
      { id:'agentHistorySection', render:'renderAgentHistorySection', init:null },
      { id:'learningAccelSection',render:'renderLearningAccelSection',init:null },
      { id:'stratCompSection',    render:'renderStratCompSection',    init:null },
    ]
  },
  trading: {
    label: '⚡ Trading',
    sections: [
      { id:'timingOptSection',    render:'renderTimingOptSection',    init:null },
      { id:'pyramideSection',     render:'renderPyramideSection',     init:null },
      { id:'sortiePartiSection',  render:'renderSortiePartiSection',  init:null },
      { id:'trailingStopSection', render:'renderTrailingStopSection', init:null },
      { id:'hedgeAutoSection',    render:'renderHedgeAutoSection',    init:null },
    ]
  },
  alertes: {
    label: '🔔 Alertes',
    sections: [
      { id:'priceAlertSection',    render:'renderPriceAlertSection',   init:null },
      { id:'alertsSection2',      render:'renderAlertsSection',       init:null },
      { id:'anomalySection2',     render:'renderAnomalySection',      init:null },
      { id:'bunkerSection',     render:'renderBunkerSection',     init:null },
      { id:'antiRevengeSection',  render:'renderAntiRevengeSection',  init:null },
      { id:'telegramSection',   render:'renderTelegramSection',   init:null },
      { id:'fatigueBotSection',   render:'renderFatigueBotSection',   init:null },
    ]
  },
  outils: {
    label: '🛠 Outils',
    sections: [
      { id:'whatifSection',       render:null, init:'initWhatIfSection' },
      { id:'backtestSection',     render:null, init:'initBacktestSection' },
      { id:'replaySection',       render:null, init:'initReplaySection' },
      { id:'urgenceSection',       render:'renderUrgenceSection',      init:null },
      { id:'stressTestSection',    render:'renderStressTestSection',   init:null },
      { id:'adnSection',         render:'renderAdnSection',         init:null },
      { id:'calcSection',       render:'renderCalcSection',       init:null },
      { id:'paperUltraSection',  render:'renderPaperUltraSection',  init:null },
      { id:'diffSection',       render:'renderDiffSection',       init:null },
      { id:'calcSection',       render:'renderCalcSection',       init:null },
      { id:'vaultSection',      render:'renderVaultSection',      init:null },
      { id:'autoBackupSection',     render:'renderAutoBackupSection',    init:null },
      { id:'pdfReportSection2',   render:'renderPdfReportSection',    init:null },
      { id:'xlExportSection',      render:'renderXlExportSection',      init:null },
      { id:'hebdoSection',          render:'renderHebdoSection',          init:null },
    ]
  },
};

function openOutils(tab) {
  _outilsTab = tab || 'analytics';
  const panel = document.getElementById('outilsPanel');
  if(panel) panel.classList.add('show');
  _renderOutilsTab();
}
window.openOutils = openOutils;

function closeOutils() {
  const panel = document.getElementById('outilsPanel');
  if(panel) panel.classList.remove('show');
}
window.closeOutils = closeOutils;

function switchOutilsTab(tab, btn) {
  _outilsTab = tab;
  // Mettre à jour les boutons
  document.querySelectorAll('.outils-tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  _renderOutilsTab();
}
window.switchOutilsTab = switchOutilsTab;

function _renderOutilsTab() {
  const content = document.getElementById('outilsContent');
  if(!content) return;

  const tab = _OUTILS_TABS[_outilsTab];
  if(!tab) return;

  // Créer les divs pour chaque section de cet onglet
  content.innerHTML = tab.sections.map(s =>
    `<div id="${s.id}" style="margin-bottom:0;"></div>`
  ).join('');

  // Rendre chaque section
  tab.sections.forEach(s => {
    try {
      if(s.render && typeof window[s.render] === 'function') {
        // Mapper les IDs de section vers les bons éléments
        const el = document.getElementById(s.id);
        if(el) {
          // Hack : temporairement renommer l'ID si besoin
          const origId = s.id.replace(/2$/, '');
          if(origId !== s.id) {
            // section avec ID modifié (alertsSection2 etc)
            const orig = document.getElementById(origId);
            if(orig) orig.id = s.id + '_bak';
            el.id = origId;
            window[s.render]();
            el.id = s.id;
            if(orig) orig.id = origId;
          } else {
            window[s.render]();
          }
        }
      }
      if(s.init && typeof window[s.init] === 'function') {
        window[s.init]();
      }
    } catch(e) { console.warn('Outils render error:', s.id, e); }
  });

  // Scroll en haut
  const body = document.getElementById('outilsBody');
  if(body) body.scrollTop = 0;
}
window._renderOutilsTab = _renderOutilsTab;

















function _showReplayEvent(ev) {
  const stream = document.getElementById('rpStream');
  if(!stream) return;
  const div = document.createElement('div');
  div.className = 'rp-event ' + ev.type;
  div.innerHTML = `
    <div class="rp-event-icon">${ev.icon}</div>
    <div class="rp-event-body">
      <div class="rp-event-time">${ev.time}${ev.pair?' · '+ev.pair:''}</div>
      <div class="rp-event-text">${ev.text}</div>
    </div>`;
  stream.insertBefore(div, stream.firstChild);
  // Garder max 30 événements affichés
  while(stream.children.length > 30) stream.removeChild(stream.lastChild);
}

function _updateReplayUI() {
  const n = _RP.events.length;
  const i = _RP.idx;

  // Progress bar
  const fill = document.getElementById('rpFill');
  if(fill) fill.style.width = n>0 ? (i/n*100).toFixed(1)+'%' : '0%';

  const posLbl = document.getElementById('rpPosLbl');
  if(posLbl) posLbl.textContent = i+' / '+n;

  // P&L cumulé jusqu'à l'index actuel
  const cumPnl = _RP.events.slice(0,i).reduce((s,e)=>s+(e.pnlUsd||0),0);
  const pnlLbl = document.getElementById('rpPnlLbl');
  if(pnlLbl) {
    pnlLbl.textContent = 'P&L: '+(cumPnl>=0?'+':'')+'$'+cumPnl.toFixed(2);
    pnlLbl.style.color = cumPnl>=0?'var(--up)':'var(--down)';
  }

  // Clock
  const clk = document.getElementById('rpClock');
  if(clk && i>0 && _RP.events[i-1]) {
    clk.textContent = new Date(_RP.events[i-1].ts).toLocaleTimeString();
  }

  // Stats mini
  const statsEl = document.getElementById('rpStats');
  if(statsEl) {
    const done = _RP.events.slice(0,i);
    const trades = done.filter(e=>e.type.startsWith('trade'));
    const wins   = done.filter(e=>e.type==='trade-win').length;
    const wr     = trades.length>0 ? Math.round(wins/trades.length*100) : 0;
    statsEl.innerHTML = [
      {val:trades.length, lbl:'Trades', col:'var(--t1)'},
      {val:wr+'%', lbl:'Win Rate', col:wr>=55?'var(--up)':'var(--down)'},
      {val:(cumPnl>=0?'+':'')+'$'+Math.abs(cumPnl).toFixed(2), lbl:'P&L Net', col:cumPnl>=0?'var(--up)':'var(--down)'},
    ].map(m=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:6px;text-align:center;">
      <span style="font-size:14px;font-weight:800;font-family:var(--font-mono);color:${m.col};display:block;">${m.val}</span>
      <span style="font-size:8px;color:var(--t3);">${m.lbl}</span>
    </div>`).join('');
  }
}






// ═══════════════════════════════════════════════════════════════════
// v20 · VEILLE MARCHÉ — Phase 1 : Sources + Affichage
// Sources : alternative.me (Fear&Greed) + CoinGecko (global + trending)
// Tout gratuit, pas de clé API requise, pas de backend
// ═══════════════════════════════════════════════════════════════════

const _VEILLE_CACHE = {
  fearGreed:  null,
  global:     null,
  trending:   null,
  lastFetch:  0,
  isFetching: false,
};
const _VEILLE_TTL = 5 * 60 * 1000; // 5 minutes de cache

// ── Fetch Fear & Greed Index (alternative.me) ──
async function _fetchFearGreed() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=2&format=json', {
      signal: AbortSignal.timeout(8000)
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data.data || [];
  } catch(e) {
    console.warn('[Veille] Fear&Greed fetch error:', e.message);
    return null;
  }
}

// ── Fetch Global Market Data (CoinGecko) ──
async function _fetchGlobal() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', {
      signal: AbortSignal.timeout(8000)
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data.data || null;
  } catch(e) {
    console.warn('[Veille] CoinGecko global fetch error:', e.message);
    return null;
  }
}

// ── Fetch Trending (CoinGecko) ──
async function _fetchTrending() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      signal: AbortSignal.timeout(8000)
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data.coins || [];
  } catch(e) {
    console.warn('[Veille] CoinGecko trending fetch error:', e.message);
    return null;
  }
}

// ── Rafraîchir toutes les sources ──
async function refreshVeilleMarche(force) {
  const now = Date.now();
  if(!force && _VEILLE_CACHE.lastFetch > 0 && (now - _VEILLE_CACHE.lastFetch) < _VEILLE_TTL) {
    renderVeilleMarche(); // Juste re-render depuis le cache
    return;
  }
  if(_VEILLE_CACHE.isFetching) return;
  _VEILLE_CACHE.isFetching = true;

  // Afficher loading
  ['veilleFeGrBody','veilleNewsBody','veilleDomBody','veilleTrendBody'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = '<div class="veille-loading">⏳ Chargement…</div>';
  });

  const [fg, global, trending] = await Promise.all([
    _fetchFearGreed(),
    _fetchGlobal(),
    _fetchTrending(),
  ]);

  if(fg)       _VEILLE_CACHE.fearGreed = fg;
  if(global)   _VEILLE_CACHE.global    = global;
  if(trending) _VEILLE_CACHE.trending  = trending;
  _VEILLE_CACHE.lastFetch   = Date.now();
  _VEILLE_CACHE.isFetching  = false;

  renderVeilleMarche();

  // Stocker dans S pour persistance session
  if(!S.veilleCache) S.veilleCache = {};
  S.veilleCache.fearGreed = _VEILLE_CACHE.fearGreed;
  S.veilleCache.global    = _VEILLE_CACHE.global;
  S.veilleCache.trending  = _VEILLE_CACHE.trending;
  S.veilleCache.lastFetch = _VEILLE_CACHE.lastFetch;
}
window.refreshVeilleMarche = refreshVeilleMarche;

// ── Rendu Veille Marché ──
function renderVeilleMarche() {
  _renderFearGreed();
  _renderNews();
  _renderDominance();
  _renderTrending();
  // v21 · Phase 2 : Sentiment global
  _renderSentiment();

  const el = document.getElementById('veilleLastUpdate');
  if(el && _VEILLE_CACHE.lastFetch > 0) {
    const ago = Math.floor((Date.now() - _VEILLE_CACHE.lastFetch) / 60000);
    el.textContent = ago === 0 ? 'Mis à jour il y a moins d\'1 min'
                   : `Mis à jour il y a ${ago} min`;
  }
}
window.renderVeilleMarche = renderVeilleMarche;

// ── Rendu Fear & Greed ──
function _renderFearGreed() {
  const el = document.getElementById('veilleFeGrBody');
  if(!el) return;
  const data = _VEILLE_CACHE.fearGreed;
  if(!data || data.length === 0) {
    el.innerHTML = '<div class="veille-loading">⚠ Données indisponibles</div>'; return;
  }
  const now  = data[0];
  const prev = data[1];
  const val  = parseInt(now.value);
  const color = val <= 25 ? '#ef4444'   // Extreme Fear
              : val <= 45 ? '#f97316'   // Fear
              : val <= 55 ? '#eab308'   // Neutral
              : val <= 75 ? '#84cc16'   // Greed
              :             '#22c55e';  // Extreme Greed
  const label = now.value_classification;
  const prevVal = prev ? parseInt(prev.value) : null;
  const delta = prevVal !== null ? val - prevVal : 0;
  const deltaStr = delta === 0 ? '' : (delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`);

  // Alerte si Extreme Fear ou Extreme Greed
  const alert = (val <= 20 || val >= 80)
    ? `<div class="veille-alert-warn">⚠ ${val <= 20 ? 'Peur extrême — opportunité potentielle' : 'Cupidité extrême — risque de correction'}</div>`
    : '';

  el.innerHTML = `
    ${alert}
    <div class="veille-fg-gauge">
      <div class="veille-fg-number" style="color:${color};">${val}</div>
      <div class="veille-fg-bar-wrap">
        <div class="veille-fg-bar">
          <div class="veille-fg-bar-fill" style="width:${val}%;background:${color};"></div>
        </div>
        <div class="veille-fg-label" style="color:${color};">${label}</div>
        <div class="veille-fg-sub">${deltaStr ? `Hier: ${prevVal} (${deltaStr})` : 'Mis à jour quotidiennement'}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--t3);padding-top:4px;border-top:1px solid rgba(255,255,255,.05);">
      <span>0 = Peur extrême</span>
      <span>50 = Neutre</span>
      <span>100 = Cupidité extrême</span>
    </div>`;

  // Stocker dans S pour les bots
  if(!S.veilleData) S.veilleData = {};
  S.veilleData.fearGreedValue = val;
  S.veilleData.fearGreedLabel = label;
}

// ── Rendu News (via CoinGecko trending comme proxy actualité) ──
function _renderNews() {
  const el = document.getElementById('veilleNewsBody');
  if(!el) return;
  const global = _VEILLE_CACHE.global;
  if(!global) {
    el.innerHTML = '<div class="veille-loading">⚠ Données indisponibles</div>'; return;
  }
  // On utilise les données globales pour générer un résumé de l'état du marché
  const mktCap = global.total_market_cap?.usd;
  const mktCapStr = mktCap ? (mktCap / 1e12).toFixed(2) + 'T$' : '—';
  const mktChange = global.market_cap_change_percentage_24h_usd?.toFixed(2) || '0';
  const vol24h = global.total_volume?.usd;
  const volStr = vol24h ? (vol24h / 1e9).toFixed(1) + 'Md$' : '—';
  const activeCryptos = global.active_cryptocurrencies?.toLocaleString() || '—';
  const mktChangeColor = parseFloat(mktChange) >= 0 ? 'var(--up)' : 'var(--down)';

  el.innerHTML = `
    <div class="veille-news-item">
      <div class="veille-news-title">Capitalisation totale du marché crypto</div>
      <div style="font-size:14px;font-weight:800;font-family:var(--font-mono);color:var(--t1);">${mktCapStr}
        <span style="font-size:11px;color:${mktChangeColor};margin-left:6px;">${parseFloat(mktChange)>=0?'+':''}${mktChange}% 24h</span>
      </div>
    </div>
    <div class="veille-news-item">
      <div class="veille-news-title">Volume 24h global</div>
      <div style="font-size:13px;font-weight:700;font-family:var(--font-mono);color:var(--ice);">${volStr}</div>
    </div>
    <div class="veille-news-item">
      <div class="veille-news-title">Cryptomonnaies actives</div>
      <div style="font-size:13px;font-weight:700;font-family:var(--font-mono);color:var(--t1);">${activeCryptos}</div>
    </div>
  `;
}

// ── Rendu Dominance BTC / ETH ──
function _renderDominance() {
  const el = document.getElementById('veilleDomBody');
  if(!el) return;
  const global = _VEILLE_CACHE.global;
  if(!global) {
    el.innerHTML = '<div class="veille-loading">⚠ Données indisponibles</div>'; return;
  }
  const dom = global.market_cap_percentage || {};
  const btc = (dom.btc || 0).toFixed(1);
  const eth = (dom.eth || 0).toFixed(1);
  const others = (100 - (dom.btc||0) - (dom.eth||0)).toFixed(1);

  // Alerte si dominance BTC > 60% (risque altcoins)
  const alert = parseFloat(btc) > 60
    ? '<div class="veille-alert-warn">⚠ Dominance BTC élevée — altcoins sous pression</div>'
    : parseFloat(btc) < 40
    ? '<div class="veille-alert-warn">⚠ Dominance BTC faible — saison altcoins possible</div>'
    : '';

  el.innerHTML = `
    ${alert}
    <div class="veille-dom-row">
      <span class="veille-dom-label">₿ Bitcoin</span>
      <span class="veille-dom-val" style="color:#f7931a;">${btc}%</span>
    </div>
    <div class="veille-dom-bar">
      <div style="height:100%;width:${btc}%;background:#f7931a;border-radius:100px;"></div>
    </div>
    <div class="veille-dom-row">
      <span class="veille-dom-label">Ξ Ethereum</span>
      <span class="veille-dom-val" style="color:#627eea;">${eth}%</span>
    </div>
    <div class="veille-dom-bar">
      <div style="height:100%;width:${eth}%;background:#627eea;border-radius:100px;"></div>
    </div>
    <div class="veille-dom-row">
      <span class="veille-dom-label">🌐 Autres</span>
      <span class="veille-dom-val" style="color:var(--t2);">${others}%</span>
    </div>
    <div class="veille-dom-bar">
      <div style="height:100%;width:${others}%;background:var(--t3);border-radius:100px;"></div>
    </div>`;

  // Stocker dans S pour les bots
  if(!S.veilleData) S.veilleData = {};
  S.veilleData.btcDominance = parseFloat(btc);
  S.veilleData.ethDominance = parseFloat(eth);
}

// ── Rendu Trending ──
function _renderTrending() {
  const el = document.getElementById('veilleTrendBody');
  if(!el) return;
  const trending = _VEILLE_CACHE.trending;
  if(!trending || trending.length === 0) {
    el.innerHTML = '<div class="veille-loading">⚠ Données indisponibles</div>'; return;
  }
  const items = trending.slice(0, 7);
  el.innerHTML = items.map((c, i) => {
    const coin = c.item;
    const score = (coin.score || 0);
    const priceChange = coin.data?.price_change_percentage_24h?.usd;
    const pctStr = priceChange !== undefined
      ? `<span class="veille-trend-pct" style="color:${priceChange>=0?'var(--up)':'var(--down)'};">${priceChange>=0?'+':''}${priceChange.toFixed(1)}%</span>`
      : '';
    return `
      <div class="veille-trend-item">
        <span class="veille-trend-rank">#${i+1}</span>
        <span class="veille-trend-name">${coin.thumb ? `<img src="${coin.thumb}" style="width:14px;height:14px;border-radius:50%;margin-right:4px;vertical-align:middle;">` : ''}${coin.symbol}</span>
        ${pctStr}
      </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// v21 · VEILLE MARCHÉ PHASE 2 — Analyse sentiment basique
// Combine Fear&Greed + Dominance BTC + Régime marché interne
// → Score de sentiment global -100 à +100
// → Signal : HAUSSIER / NEUTRE / BAISSIER + recommandation
// ═══════════════════════════════════════════════════════════════════

function computeVeilleSentiment() {
  let score = 0;
  const factors = [];

  // 1. Fear & Greed (poids 40%)
  const fg = _VEILLE_CACHE.fearGreed;
  if(fg && fg.length > 0) {
    const val = parseInt(fg[0].value);
    // 0-100 → -40 à +40 (centré sur 50)
    const fgScore = ((val - 50) / 50) * 40;
    score += fgScore;
    if(val <= 25)       factors.push({ emoji:'😨', text:`Peur extrême (${val})`, impact: fgScore, col:'var(--down)' });
    else if(val <= 45)  factors.push({ emoji:'😟', text:`Peur (${val})`, impact: fgScore, col:'#f97316' });
    else if(val <= 55)  factors.push({ emoji:'😐', text:`Neutre (${val})`, impact: fgScore, col:'var(--gold)' });
    else if(val <= 75)  factors.push({ emoji:'😊', text:`Appétit (${val})`, impact: fgScore, col:'#84cc16' });
    else                factors.push({ emoji:'🤑', text:`Euphorie (${val})`, impact: fgScore, col:'var(--up)' });
  }

  // 2. Dominance BTC (poids 20%)
  const global = _VEILLE_CACHE.global;
  if(global) {
    const btcDom = global.market_cap_percentage?.btc || 50;
    const mktChange = global.market_cap_change_percentage_24h_usd || 0;
    // Marché en hausse = haussier
    const mktScore = Math.min(20, Math.max(-20, mktChange * 2));
    score += mktScore;
    factors.push({
      emoji: mktChange >= 0 ? '📈' : '📉',
      text: `Marché global ${mktChange >= 0 ? '+' : ''}${mktChange.toFixed(1)}% 24h`,
      impact: mktScore,
      col: mktChange >= 0 ? 'var(--up)' : 'var(--down)'
    });
    // Dominance BTC > 55% = risque altcoins
    if(btcDom > 55) {
      score -= 10;
      factors.push({ emoji:'₿', text:`Dominance BTC élevée ${btcDom.toFixed(0)}%`, impact:-10, col:'var(--gold)' });
    } else if(btcDom < 45) {
      score += 5;
      factors.push({ emoji:'🌐', text:`Saison altcoins ${btcDom.toFixed(0)}%`, impact:5, col:'var(--up)' });
    }
  }

  // 3. Régime marché interne AURA (poids 40%)
  const regime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : (S._paperRealCurrentRegime || 'calm');
  const regimeScores = {
    bull:          { score: 40, label: '▲ BULL interne',     col: 'var(--up)' },
    volatile_bull: { score: 20, label: '▲▲ Volatile+',       col: '#84cc16' },
    calm:          { score:  0, label: '◌ CALM interne',     col: 'var(--t2)' },
    volatile:      { score:-10, label: '◈ Volatile neutre',  col: 'var(--gold)' },
    volatile_bear: { score:-30, label: '▼▼ Volatile−',       col: '#f97316' },
    bear:          { score:-40, label: '▼ BEAR interne',     col: 'var(--down)' },
  };
  const rs = regimeScores[regime] || regimeScores.calm;
  score += rs.score;
  factors.push({ emoji: '🤖', text: rs.label, impact: rs.score, col: rs.col });

  // Clamp -100 à +100
  score = Math.max(-100, Math.min(100, Math.round(score)));

  // Signal global
  const signal = score >=  30 ? { label:'HAUSSIER',  emoji:'🟢', col:'var(--up)',   advice:'Conditions favorables. Les bots peuvent trader normalement.' }
               : score >= -30 ? { label:'NEUTRE',     emoji:'🟡', col:'var(--gold)', advice:'Marché indécis. Réduire les mises, attendre confirmation.' }
               :                { label:'BAISSIER',   emoji:'🔴', col:'var(--down)', advice:'Conditions défavorables. Privilégier les positions courtes ou HOLD.' };

  // Stocker dans S pour les bots (Phase 3)
  if(!S.veilleData) S.veilleData = {};
  S.veilleData.sentimentScore  = score;
  S.veilleData.sentimentSignal = signal.label;
  S.veilleData.sentimentTs     = Date.now();

  return { score, signal, factors };
}
window.computeVeilleSentiment = computeVeilleSentiment;

// ── Rendu Sentiment ──
function _renderSentiment() {
  const el = document.getElementById('veilleSentimentBody');
  if(!el) return;

  // Si pas encore de données fetchées
  if(!_VEILLE_CACHE.fearGreed && !_VEILLE_CACHE.global) {
    el.innerHTML = '<div class="veille-loading">Données en attente — rafraîchis la Veille Marché.</div>';
    return;
  }

  const { score, signal, factors } = computeVeilleSentiment();
  const barPct = ((score + 100) / 200 * 100).toFixed(1); // 0-100%

  el.innerHTML = `
    <!-- Score principal -->
    <div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:32px;font-weight:900;font-family:var(--font-mono);color:${signal.col};">
        ${score >= 0 ? '+' : ''}${score}
      </div>
      <div style="font-size:14px;font-weight:800;color:${signal.col};letter-spacing:.05em;margin:3px 0;">
        ${signal.emoji} ${signal.label}
      </div>
    </div>

    <!-- Barre -100 à +100 -->
    <div style="position:relative;height:10px;background:linear-gradient(90deg,var(--down),var(--gold),var(--up));border-radius:100px;margin-bottom:4px;">
      <div style="position:absolute;top:-2px;left:calc(${barPct}% - 7px);width:14px;height:14px;background:#fff;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,.5);border:2px solid ${signal.col};"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--t3);margin-bottom:10px;">
      <span>-100 Très baissier</span>
      <span>0 Neutre</span>
      <span>+100 Très haussier</span>
    </div>

    <!-- Conseil -->
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:10px;color:var(--t2);line-height:1.5;">
      💡 ${signal.advice}
    </div>

    <!-- Facteurs -->
    <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Facteurs analysés</div>
    ${factors.map(f => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;">
        <span>${f.emoji} <span style="color:${f.col};">${f.text}</span></span>
        <span style="font-family:var(--font-mono);font-weight:700;color:${f.impact>=0?'var(--up)':'var(--down)'};">${f.impact>=0?'+':''}${f.impact.toFixed(0)}</span>
      </div>`).join('')}

    <!-- v22 · Impact sur les bots -->
    <div style="margin-top:10px;padding:8px 10px;background:rgba(56,212,245,.06);border:1px solid rgba(56,212,245,.2);border-radius:8px;">
      <div style="font-size:9px;font-weight:700;color:var(--ice);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">🤖 Impact sur les bots (Phase 3)</div>
      ${(function() {
        const sent = score;
        const rows = [];
        if(sent <= -60) rows.push({ col:'var(--down)', text:'LONG bloqués automatiquement (sentiment < -60)' });
        else if(sent >= 60) rows.push({ col:'var(--down)', text:'SHORT bloqués automatiquement (sentiment > +60)' });
        else rows.push({ col:'var(--up)', text:'Aucun blocage actif' });

        let multStr = 'Mises normales (×1.0)';
        if(sent >= 50)       multStr = 'Mises augmentées ×1.3 (marché haussier)';
        else if(sent >= 20)  multStr = 'Mises augmentées ×1.1';
        else if(sent <= -50) multStr = 'Mises réduites ×0.6 (marché baissier)';
        else if(sent <= -20) multStr = 'Mises réduites ×0.8';
        rows.push({ col: sent >= 20 ? 'var(--up)' : sent <= -20 ? 'var(--gold)' : 'var(--t2)', text: multStr });

        return rows.map(r => `
          <div style="font-size:10px;color:${r.col};display:flex;align-items:center;gap:5px;margin-bottom:3px;">
            <span>▸</span><span>${r.text}</span>
          </div>`).join('');
      })()}
    </div>
  `;
}
function _initVeilleOnPageChange(page) {
  if(page !== 2) return;
  // Restaurer depuis S si disponible
  if(S.veilleCache) {
    if(S.veilleCache.fearGreed) _VEILLE_CACHE.fearGreed = S.veilleCache.fearGreed;
    if(S.veilleCache.global)    _VEILLE_CACHE.global    = S.veilleCache.global;
    if(S.veilleCache.trending)  _VEILLE_CACHE.trending  = S.veilleCache.trending;
    if(S.veilleCache.lastFetch) _VEILLE_CACHE.lastFetch = S.veilleCache.lastFetch;
  }
  refreshVeilleMarche();
}

// ═══════════════════════════════════════════════════════════════════
// v19 · #38 NOTIFICATIONS PUSH ANDROID
// Web Notifications API — fonctionne en PWA installée
// ═══════════════════════════════════════════════════════════════════

// Config notifications (persistée dans S)
function _initNotifConfig() {
  if(!S.notifConfig) S.notifConfig = {
    enabled:        false,
    tradeOpen:      true,   // trade ouvert
    tradeClose:     true,   // trade fermé (avec P&L)
    tpSl:           true,   // TP ou SL atteint
    drawdownAlert:  true,   // drawdown > 10%
    twinAlert:      false,  // Twin Live alerte
    regimeChange:   false,  // changement de régime marché
    lastNotifTs:    0,      // timestamp dernière notif (anti-spam 30s)
  };
}

// Demander la permission
async function requestNotifPermission() {
  if(!('Notification' in window)) {
    showToast('⚠ Notifications non supportées sur ce navigateur', 3000, 'warn');
    return;
  }
  try {
    const result = await Notification.requestPermission();
    if(result === 'granted') {
      _initNotifConfig();
      S.notifConfig.enabled = true;
      showToast('🔔 Notifications activées !', 2500, 'win');
      // Notification de test
      setTimeout(() => {
        sendNotif('🎉 AURA ∞ — Notifications actives !',
          'Tu recevras des alertes pour tes trades et événements importants.', '🔔');
      }, 500);
    } else {
      showToast('⚠ Permission refusée — active les notifs dans les réglages Chrome', 4000, 'warn');
    }
    renderNotifSettings();
  } catch(e) {
    showToast('⚠ Erreur notifications : ' + e.message, 3000, 'warn');
  }
}
window.requestNotifPermission = requestNotifPermission;

// Envoyer une notification (avec anti-spam 30s)
function sendNotif(title, body, icon) {
  _initNotifConfig();
  if(!S.notifConfig.enabled) return;
  if(Notification.permission !== 'granted') return;
  // Anti-spam : pas plus d'une notif toutes les 30s
  const now = Date.now();
  if(now - (S.notifConfig.lastNotifTs||0) < 30000) return;
  S.notifConfig.lastNotifTs = now;
  try {
    const n = new Notification(title, {
      body,
      icon: icon || '🤖',
      badge: '🤖',
      tag: 'aura-notif',
      renotify: true,
      vibrate: [200, 100, 200],
    });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 8000);
  } catch(e) { console.warn('Notif error:', e); }
}
window.sendNotif = sendNotif;

// Notification : trade ouvert
function notifTradeOpen(pair, side, stake) {
  _initNotifConfig();
  if(!S.notifConfig.tradeOpen) return;
  const sideStr = side === 'long' ? '↑ LONG' : '↓ SHORT';
  sendNotif(
    `🤖 AURA — Position ouverte`,
    `${pair} ${sideStr} · $${(stake||0).toFixed(0)}`,
    side === 'long' ? '📈' : '📉'
  );
}
window.notifTradeOpen = notifTradeOpen;

// Notification : trade fermé
function notifTradeClose(pair, side, pnlUsd, pnlPct) {
  _initNotifConfig();
  if(!S.notifConfig.tradeClose) return;
  const win = pnlUsd >= 0;
  const emoji = win ? '✅' : '❌';
  const pnlStr = (win?'+':'') + '$' + Math.abs(pnlUsd).toFixed(2)
               + ' (' + (win?'+':'') + pnlPct.toFixed(2) + '%)';
  sendNotif(
    `${emoji} AURA — Trade clôturé`,
    `${pair} · ${pnlStr}`,
    win ? '💰' : '📉'
  );
}
window.notifTradeClose = notifTradeClose;

// Notification : drawdown critique
function notifDrawdown(ddPct) {
  _initNotifConfig();
  if(!S.notifConfig.drawdownAlert) return;
  sendNotif(
    '⚠️ AURA — Drawdown critique',
    `Drawdown ${ddPct.toFixed(1)}% — surveille tes positions`,
    '⚠️'
  );
}
window.notifDrawdown = notifDrawdown;

// Notification : changement de régime
function notifRegimeChange(newRegime) {
  _initNotifConfig();
  if(!S.notifConfig.regimeChange) return;
  const labels = { bull:'🟢 BULL', bear:'🔴 BEAR', volatile:'🟡 VOLATILE', calm:'⚪ CALM' };
  sendNotif(
    '📊 AURA — Régime marché changé',
    `Nouveau régime : ${labels[newRegime] || newRegime.toUpperCase()}`,
    '📊'
  );
}
window.notifRegimeChange = notifRegimeChange;

// Notification Twin Live
function notifTwinAlert(msg) {
  _initNotifConfig();
  if(!S.notifConfig.twinAlert) return;
  sendNotif('👯 AURA Twin Live', msg, '👯');
}
window.notifTwinAlert = notifTwinAlert;

// Toggle un type de notification
function toggleNotifType(type) {
  _initNotifConfig();
  S.notifConfig[type] = !S.notifConfig[type];
  renderNotifSettings();
}
window.toggleNotifType = toggleNotifType;

// Rendu de la section Notifications dans les Réglages
function renderNotifSettings() {
  const el = document.getElementById('notifSettingsSection');
  if(!el) return;
  _initNotifConfig();
  const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  const cfg  = S.notifConfig;
  const permLabel = perm === 'granted' ? '✅ Accordée'
                  : perm === 'denied'  ? '❌ Refusée'
                  : perm === 'unsupported' ? '⚠ Non supporté'
                  : '⏳ En attente';
  const permClass = perm === 'granted' ? 'granted'
                  : perm === 'denied'  ? 'denied'
                  : 'default';

  const types = [
    { key:'tradeOpen',     label:'Trade ouvert',        emoji:'📥', sub:'À chaque ouverture de position' },
    { key:'tradeClose',    label:'Trade fermé',          emoji:'📤', sub:'Avec résultat P&L' },
    { key:'tpSl',          label:'TP / SL atteint',      emoji:'🎯', sub:'Alerte prix cible ou stop' },
    { key:'drawdownAlert', label:'Drawdown critique',    emoji:'⚠️', sub:'Si drawdown > 10%' },
    { key:'twinAlert',     label:'Twin Live alerte',     emoji:'👯', sub:'Quand Twin surpasse le bot' },
    { key:'regimeChange',  label:'Changement de régime', emoji:'📊', sub:'BULL / BEAR / VOLATILE' },
  ];

  el.innerHTML = `
    <div class="notif-section">
      <div class="notif-section-title">🔔 Notifications Push</div>

      <!-- Permission -->
      <div class="notif-permission-bar">
        <div>
          <div class="notif-permission-label">Permission navigateur</div>
          <div style="font-size:8px;color:var(--t3);margin-top:2px;">Requis pour recevoir des alertes</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="notif-permission-status ${permClass}">${permLabel}</span>
          ${perm !== 'granted' && perm !== 'denied' ? `
            <button class="notif-request-btn" onclick="requestNotifPermission()">Activer</button>
          ` : ''}
          ${perm === 'granted' ? `
            <button class="notif-request-btn" onclick="sendNotif('🔔 Test AURA','Notifications fonctionnelles !','🔔')">Test</button>
          ` : ''}
        </div>
      </div>

      ${perm !== 'granted' ? `
        <div style="font-size:9px;color:var(--t3);text-align:center;padding:8px;line-height:1.5;">
          Appuie sur "Activer" puis autorise les notifications dans Chrome.<br>
          Fonctionne mieux si AURA est installée en PWA.
        </div>
      ` : `
        <!-- Types de notifications -->
        <div>
          ${types.map(t => `
            <div class="notif-row">
              <div class="notif-row-label">
                <span>${t.emoji}</span>
                <div>
                  <span>${t.label}</span>
                  <span class="notif-row-sub">${t.sub}</span>
                </div>
              </div>
              <button
                class="notif-toggle ${cfg[t.key] ? 'on' : ''}"
                onclick="toggleNotifType('${t.key}')"
                title="${cfg[t.key] ? 'Désactiver' : 'Activer'}"
              ></button>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}
window.renderNotifSettings = renderNotifSettings;

// ═══════════════════════════════════════════════════════════════════
// v18 · #52 TWIN LIVE BOT — Bot observateur parallèle
// Stratégie alternative : seuils LMSR + 10%, stakes réduits à 60%
// Aucun capital réel engagé — observation pure
// ═══════════════════════════════════════════════════════════════════

function _initTwin() {
  if(!S.twin) S.twin = {
    active:     false,
    virtualPnl: 0,
    wins:       0,
    losses:     0,
    trades:     [],       // { ts, pair, side, virtualPnl, realPnl, stake }
    openPos:    {},       // { pair: { side, entryPrice, stake, ts } }
    // Paramètres stratégie alternative
    lmsrThreshold: 0.55,  // moins sélectif que le bot (0.60)
    stakeMultiplier: 0.6,  // 60% du stake du bot principal
    maxConcurrent: 3,      // max 3 positions simultanées
  };
}

// Appelé à chaque tick — le Twin "décide" en parallèle
function tickTwinLive() {
  _initTwin();
  if(!S.twin.active) return;

  const pairs = Object.keys(PAIRS || {});
  pairs.forEach(pair => {
    const ps  = S.pairStates[pair];
    if(!ps || !ps.price) return;

    const openPos = S.twin.openPos[pair];

    // ── Clôture virtuelle : si position ouverte > 2 cycles ou TP/SL atteint ──
    if(openPos) {
      const price = ps.price;
      const pnlPct = openPos.side === 'long'
        ? (price - openPos.entryPrice) / openPos.entryPrice * 100
        : (openPos.entryPrice - price) / openPos.entryPrice * 100;

      const shouldClose = Math.abs(pnlPct) > 2.5  // TP/SL 2.5%
                       || (Date.now() - openPos.ts) > (ps.cycleMax || 120) * 2000;

      if(shouldClose) {
        const virtualPnl = openPos.stake * pnlPct / 100;
        S.twin.virtualPnl += virtualPnl;
        if(virtualPnl >= 0) S.twin.wins++; else S.twin.losses++;
        S.twin.trades.push({
          ts: Date.now(), pair,
          side: openPos.side,
          virtualPnl,
          realPnl: null,  // on n'a pas le vrai P&L en parallèle
          stake: openPos.stake,
          pnlPct
        });
        if(S.twin.trades.length > 50) S.twin.trades.shift();
        delete S.twin.openPos[pair];
      }
      return;
    }

    // ── Ouverture virtuelle : seuil LMSR différent ──
    const concurrentCount = Object.keys(S.twin.openPos).length;
    if(concurrentCount >= S.twin.maxConcurrent) return;

    const prob  = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    const thr   = S.twin.lmsrThreshold;
    const side  = prob > (1 - thr + 0.5) ? 'long' : prob < (thr - 0.5 + (1-thr)) ? 'short' : null;

    // Seuil simplifié : long si > 0.55, short si < 0.45
    const goLong  = prob > thr;
    const goShort = prob < (1 - thr);

    if(goLong || goShort) {
      const realStake = ps.stake || 10;
      const twinStake = realStake * S.twin.stakeMultiplier;
      S.twin.openPos[pair] = {
        side:       goLong ? 'long' : 'short',
        entryPrice: ps.price,
        stake:      twinStake,
        ts:         Date.now(),
      };
    }
  });

  // Rafraîchir UI si sur la page HOME
  if(S.currentPage === 0) {
    try { renderTwinLive(); } catch(e) {}
  }
}
window.tickTwinLive = tickTwinLive;

function toggleTwinLive() {
  _initTwin();
  S.twin.active = !S.twin.active;
  renderTwinLive();
  const btn = document.querySelector('.twin-toggle');
  if(btn) btn.textContent = S.twin.active ? 'Désactiver' : 'Activer';
  showToast(S.twin.active ? '👯 Twin Live activé' : '👯 Twin Live désactivé', 1800, S.twin.active ? 'win' : 'user');
}
window.toggleTwinLive = toggleTwinLive;

function renderTwinLive() {
  _initTwin();
  const twin = S.twin;
  const badgeEl   = document.getElementById('twinBadge');
  const mainPnlEl = document.getElementById('twinMainPnl');
  const altPnlEl  = document.getElementById('twinAltPnl');
  const mainWrEl  = document.getElementById('twinMainWr');
  const altWrEl   = document.getElementById('twinAltWr');
  const insightEl = document.getElementById('twinInsight');
  const tradesEl  = document.getElementById('twinTrades');
  const toggleBtn = document.querySelector('.twin-toggle');

  if(badgeEl) {
    badgeEl.textContent = twin.active ? 'ACTIF' : 'INACTIF';
    badgeEl.className = 'twin-badge ' + (twin.active ? 'on' : 'off');
  }
  if(toggleBtn) toggleBtn.textContent = twin.active ? 'Désactiver' : 'Activer';

  // P&L bot principal
  const mainPnl = (S._totalCompounded || 0) + (S.portfolio && S._startPortfolio ? (S.portfolio - S._startPortfolio) : 0);
  const mainWr  = S.totalTrades > 0 ? Math.round(S.winTrades / S.totalTrades * 100) : 0;
  const twinWr  = (twin.wins + twin.losses) > 0 ? Math.round(twin.wins / (twin.wins + twin.losses) * 100) : 0;

  if(mainPnlEl) {
    mainPnlEl.textContent = (mainPnl >= 0 ? '+' : '') + '$' + mainPnl.toFixed(2);
    mainPnlEl.style.color = mainPnl >= 0 ? 'var(--up)' : 'var(--down)';
  }
  if(altPnlEl) {
    altPnlEl.textContent = twin.active || twin.trades.length > 0
      ? (twin.virtualPnl >= 0 ? '+' : '') + '$' + twin.virtualPnl.toFixed(2)
      : '—';
    altPnlEl.style.color = twin.virtualPnl >= 0 ? 'var(--up)' : 'var(--down)';
  }
  if(mainWrEl) mainWrEl.textContent = S.totalTrades > 0 ? `WR ${mainWr}% · ${S.totalTrades} trades` : '—';
  if(altWrEl)  altWrEl.textContent  = twin.trades.length > 0 ? `WR ${twinWr}% · ${twin.trades.length} trades` : '—';

  // Insight
  if(insightEl) {
    if(!twin.active && twin.trades.length === 0) {
      insightEl.textContent = 'Activez le Twin pour démarrer l\'observation parallèle.';
    } else {
      const delta = twin.virtualPnl - mainPnl;
      const n = twin.trades.length;
      if(n < 3) {
        insightEl.textContent = `⏳ ${n}/3 trades nécessaires pour l'analyse comparative…`;
      } else if(Math.abs(delta) < 1) {
        insightEl.textContent = `⚖️ Performances équivalentes sur ${n} trades. Les deux stratégies convergent.`;
      } else if(twin.virtualPnl > mainPnl) {
        insightEl.textContent = `🔵 Twin +$${Math.abs(delta).toFixed(2)} devant sur ${n} trades. Stratégie moins sélective plus rentable ici.`;
        insightEl.style.color = 'var(--pur)';
      } else {
        insightEl.textContent = `✅ Bot principal +$${Math.abs(delta).toFixed(2)} devant sur ${n} trades. Sélectivité payante.`;
        insightEl.style.color = 'var(--up)';
      }
    }
  }

  // Derniers trades Twin
  if(tradesEl) {
    const recent = twin.trades.slice().reverse().slice(0, 8);
    if(recent.length === 0) {
      tradesEl.innerHTML = '';
    } else {
      tradesEl.innerHTML = recent.map(t => {
        const win = t.virtualPnl >= 0;
        const ago = Math.floor((Date.now() - t.ts) / 60000);
        return `<div class="twin-trade-row">
          <span>${t.pair} ${t.side === 'long' ? '↑' : '↓'}</span>
          <span style="color:${win?'var(--up)':'var(--down)'}">
            ${win?'+':''}$${t.virtualPnl.toFixed(2)} (${t.pnlPct?.toFixed(2)||'?'}%)
          </span>
          <span>il y a ${ago}m</span>
        </div>`;
      }).join('');
    }
  }
}
window.renderTwinLive = renderTwinLive;

// ═══════════════════════════════════════════════════════════════
// v15 · #24 TRUST SCORE GLOBAL — Santé du système 0-100
// ═══════════════════════════════════════════════════════════════

function computeTrustScore() {
  let score = 100;
  const reasons = [];

  // 1. Win Rate (max -25 pts)
  const totalTrades = S.totalTrades || 0;
  const winRate = totalTrades > 0 ? (S.winTrades || 0) / totalTrades : null;
  if (winRate !== null) {
    if (winRate < 0.30)      { score -= 25; reasons.push('WR critique ' + Math.round(winRate*100) + '%'); }
    else if (winRate < 0.50) { score -= 15; reasons.push('WR faible ' + Math.round(winRate*100) + '%'); }
    else if (winRate < 0.60) { score -= 5; }
  } else {
    score -= 5; // pas encore de trades
  }

  // 2. Drawdown (max -20 pts)
  const dd = S.perf?.maxDrawdown || 0;
  if (dd < -0.20)      { score -= 20; reasons.push('Drawdown sévère ' + (dd*100).toFixed(1) + '%'); }
  else if (dd < -0.10) { score -= 10; reasons.push('Drawdown élevé ' + (dd*100).toFixed(1) + '%'); }
  else if (dd < -0.05) { score -= 5; }

  // 3. Sharpe ratio (max -15 pts)
  const sharpe = S.perf?.sharpe || 0;
  if (sharpe < -0.5)  { score -= 15; reasons.push('Sharpe négatif ' + sharpe.toFixed(2)); }
  else if (sharpe < 0) { score -= 8; }
  else if (sharpe < 0.5) { score -= 3; }

  // 4. P&L net (max -15 pts)
  const pnlNet = S.fees?.totalPnlNet || 0;
  const portfolio = S.portfolio || 0;
  if (portfolio > 0 && pnlNet < 0) {
    const pnlPct = Math.abs(pnlNet) / portfolio;
    if (pnlPct > 0.05)      { score -= 15; reasons.push('P&L net négatif'); }
    else if (pnlPct > 0.02) { score -= 8; }
    else                    { score -= 3; }
  }

  // 5. Agents actifs et sains (max -10 pts)
  const agents = S.agents || [];
  const brokenAgents = agents.filter(a => (a.fitness || 0) <= 80).length;
  const brokenPct = agents.length > 0 ? brokenAgents / agents.length : 0;
  if (brokenPct > 0.5)      { score -= 10; reasons.push(brokenAgents + ' agents cassés'); }
  else if (brokenPct > 0.3) { score -= 5; }

  // 6. Capital engagé (max -10 pts)
  const cap = typeof getCapitalSummary === 'function' ? getCapitalSummary() : null;
  if (cap && cap.maxAllowed > 0) {
    const engagePct = cap.staked / cap.maxAllowed;
    if (engagePct > 0.90) { score -= 10; reasons.push('Surexposition capital'); }
    else if (engagePct > 0.75) { score -= 5; }
  }

  // 7. Régime marché défavorable (max -5 pts)
  const regime = S._paperRealCurrentRegime || S.regime || 'calm';
  if (regime === 'volatile_bear' || regime === 'bear') {
    score -= 5; reasons.push('Régime baissier');
  }

  // 8. v21 · Score sentiment Veille Marché (max -10 pts)
  if(S.veilleData && typeof S.veilleData.sentimentScore === 'number') {
    const sentTs = S.veilleData.sentimentTs || 0;
    const sentFresh = (Date.now() - sentTs) < 30 * 60 * 1000; // < 30 min
    if(sentFresh) {
      const sent = S.veilleData.sentimentScore;
      if(sent <= -50)       { score -= 10; reasons.push('Sentiment très baissier'); }
      else if(sent <= -20)  { score -= 5; reasons.push('Sentiment baissier'); }
      else if(sent >= 50)   { score += 5; } // bonus si très haussier
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Label
  const label = score >= 80 ? '✅ Optimal'
              : score >= 60 ? '🟡 Surveillance'
              : score >= 40 ? '🟠 Attention'
              : '🔴 Critique';

  // Couleur barre
  const color = score >= 80 ? 'var(--up)'
              : score >= 60 ? '#f59e0b'
              : score >= 40 ? '#f97316'
              : 'var(--down)';

  return { score, label, color, reasons };
}
window.computeTrustScore = computeTrustScore;

function updateTrustScore() {
  const ts = computeTrustScore();
  const barEl    = document.getElementById('trustScoreBar');
  const valEl    = document.getElementById('trustScoreVal');
  const lblEl    = document.getElementById('trustScoreLabel');
  const detailEl = document.getElementById('trustScoreDetail');
  if(barEl) {
    barEl.style.width      = ts.score + '%';
    barEl.style.background = ts.color;
  }
  if(valEl) {
    valEl.textContent = ts.score;
    valEl.style.color = ts.color;
  }
  if(lblEl) lblEl.textContent = ts.label;
  if(detailEl) {
    detailEl.textContent = ts.reasons.length > 0
      ? '⚠ ' + ts.reasons.slice(0, 3).join(' · ')
      : '✓ Tous les indicateurs sont sains';
    detailEl.style.color = ts.reasons.length > 0 ? 'var(--gold)' : 'var(--up)';
  }
}
window.updateTrustScore = updateTrustScore;

// ═══════════════════════════════════════════════════════════════
// v11quater · MODE MANU ENRICHI — TP/SL + Boutons + Capital
// ═══════════════════════════════════════════════════════════════

// Calcule les propositions TP/SL du bot selon RSI/Régime/ATR
function _calcBotTpSl(pair, side) {
  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps || !cfg) return { tp: null, sl: null };

  const price  = ps.price;
  const atr    = ps.atr || (price * 0.005);   // fallback 0.5%
  const regime = ps.regime || 'calm';
  const rsi    = ps.rsi14 || 50;

  // Facteurs selon régime
  const mult = regime === 'volatile' ? 2.2
             : regime === 'calm'     ? 1.4
             : regime === 'bear'     ? 1.1
             : 1.6;

  const tpDist = atr * mult * 1.5;   // TP plus loin que SL
  const slDist = atr * mult;

  let tp, sl;
  if(side === 'long') {
    tp = price + tpDist;
    sl = price - slDist;
  } else {
    tp = price - tpDist;
    sl = price + slDist;
  }

  const dec = cfg.dec >= 4 ? cfg.dec : 2;
  return {
    tp: parseFloat(tp.toFixed(dec)),
    sl: parseFloat(sl.toFixed(dec))
  };
}
window._calcBotTpSl = _calcBotTpSl;

// Formater prix selon la paire
function _fmtTpSlPrice(pair, price) {
  const cfg = PAIRS[pair];
  if(!cfg) return price.toFixed(2);
  return cfg.dec >= 4 ? price.toFixed(cfg.dec) : '$'+Math.floor(price).toLocaleString();
}

// Renforcer position existante (augmenter la mise de 20%)
function manuReinforce(pair) {
  const pos = S.openPositions.find(p => p.pair === pair);
  if(!pos) { showToast('⚠ Pas de position ouverte sur '+pair, 2000, 'warn'); return; }
  const ps = S.pairStates[pair];
  if(!ps) return;
  const addStake = Math.max(5, Math.round((pos.stakeUsdt || 0) * 0.2));
  if(S.tradingAccount < addStake) {
    showToast('⚠ Capital insuffisant pour renforcer', 2000, 'warn'); return;
  }
  S.tradingAccount -= addStake;
  S.portfolio = S.cashAccount + S.tradingAccount;
  pos.stakeUsdt     = (pos.stakeUsdt || 0) + addStake;
  pos.totalExposure = (pos.totalExposure || 0) + addStake;
  showToast('✅ '+pair+' renforcé +$'+addStake, 2000, 'win');
  if(typeof renderActionsGrid === 'function') try { renderActionsGrid(); } catch(e) {}
  if(typeof renderOpenPosSummary === 'function') try { renderOpenPosSummary(); } catch(e) {}
}
window.manuReinforce = manuReinforce;

// Inverser position (fermer et ouvrir dans l'autre sens)
function manuInvert(pair) {
  const pos = S.openPositions.find(p => p.pair === pair);
  if(!pos) { showToast('⚠ Pas de position ouverte sur '+pair, 2000, 'warn'); return; }
  const newSide = pos.side === 'long' ? 'short' : 'long';
  closePosition(pos.id);
  setTimeout(() => {
    openPosition(pair, newSide);
    showToast('🔄 '+pair+' inversé → '+newSide.toUpperCase(), 2500, 'win');
  }, 100);
}
window.manuInvert = manuInvert;

// Fermer position MANU
function manuClose(pair) {
  const pos = S.openPositions.find(p => p.pair === pair);
  if(!pos) { showToast('⚠ Pas de position ouverte sur '+pair, 2000, 'warn'); return; }
  closePosition(pos.id);
  showToast('✅ '+pair+' — position fermée', 2000, 'win');
}
window.manuClose = manuClose;

// Modifier TP d'une position (clic sur cellule)
function manuEditTp(pair) {
  const pos = S.openPositions.find(p => p.pair === pair);
  if(!pos) return;
  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps || !cfg) return;
  const dec  = cfg.dec >= 4 ? cfg.dec : 2;
  const curr = pos.tp ? pos.tp.toFixed(dec) : '';
  const val  = prompt('🎯 Target (TP) pour '+pair+' :\nPrix actuel : '+ps.price.toFixed(dec)+'\nEntrez le prix cible :', curr);
  if(val === null) return;
  const n = parseFloat(val);
  if(!isFinite(n) || n <= 0) { showToast('⚠ Prix invalide', 1500, 'warn'); return; }
  pos.tp = n;
  showToast('🎯 TP '+pair+' → '+n.toFixed(dec), 1800, 'win');
  if(typeof renderActionsGrid === 'function') try { renderActionsGrid(); } catch(e) {}
}
window.manuEditTp = manuEditTp;

// Modifier SL d'une position (clic sur cellule)
function manuEditSl(pair) {
  const pos = S.openPositions.find(p => p.pair === pair);
  if(!pos) return;
  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps || !cfg) return;
  const dec  = cfg.dec >= 4 ? cfg.dec : 2;
  const curr = pos.sl ? pos.sl.toFixed(dec) : '';
  const val  = prompt('🛑 Stop Loss (SL) pour '+pair+' :\nPrix actuel : '+ps.price.toFixed(dec)+'\nEntrez le prix stop :', curr);
  if(val === null) return;
  const n = parseFloat(val);
  if(!isFinite(n) || n <= 0) { showToast('⚠ Prix invalide', 1500, 'warn'); return; }
  pos.sl = n;
  showToast('🛑 SL '+pair+' → '+n.toFixed(dec), 1800, 'win');
  if(typeof renderActionsGrid === 'function') try { renderActionsGrid(); } catch(e) {}
}
window.manuEditSl = manuEditSl;

// Réinitialiser TP/SL aux valeurs proposées par le bot
function manuResetTpSl(pair) {
  const pos = S.openPositions.find(p => p.pair === pair);
  if(!pos) return;
  const proposal = _calcBotTpSl(pair, pos.side);
  pos.tp = proposal.tp;
  pos.sl = proposal.sl;
  showToast('↻ '+pair+' TP/SL réinitialisés par bot', 1800, 'win');
  if(typeof renderActionsGrid === 'function') try { renderActionsGrid(); } catch(e) {}
}
window.manuResetTpSl = manuResetTpSl;









// ════════════════════════════════════════════════════════════
// OVERRIDE switchAnalyticsTab + renderAnalyticsPanel for v5.4
// ════════════════════════════════════════════════════════════
// v5.8 FIX — _V54_TABS declaration moved to top of v5.4 block (avoid TDZ)
_analyticsTab = 'debate';  // default to new feature

function switchAnalyticsTab(tab, btn) {
  _analyticsTab = tab;
  _V54_TABS.forEach(t => {
    const panel = document.getElementById('apanel-'+t);
    const tabEl = document.getElementById('atab-'+t);
    if(panel) panel.style.display = t === tab ? '' : 'none';
    if(tabEl) tabEl.classList.toggle('active', t === tab);
  });
  renderAnalyticsPanel();
}

function renderAnalyticsPanel() {
  // v7.11 FIX · Intelligence est affichée sur HOME (page 0), pas Agents (page 1)
  if(S.currentPage !== 0) return;
  if     (_analyticsTab === 'debate')    renderDebatePanel();
  else if(_analyticsTab === 'swarm')     renderSwarmPanel();
  else if(_analyticsTab === 'fleet')     renderFleetPanel();
  else if(_analyticsTab === 'mirror')    renderMirrorPanel();
  else if(_analyticsTab === 'resonance') renderResonancePanel();
  else if(_analyticsTab === 'cascade')   renderCascadePanel();
  else if(_analyticsTab === 'dreams')    renderDreamsPanel();
  else if(_analyticsTab === 'perf')      renderPerfMetricsPanel();
  else if(_analyticsTab === 'horizon')   renderHorizonPanel();
  else if(_analyticsTab === 'heatmap')   renderHeatmapPanel();
  else if(_analyticsTab === 'whatif')    renderWhatIfPanel();
  else if(_analyticsTab === 'leadlag')   renderLeadLagPanel();
}







// ════════════════════════════════════════════════════════════
// v5.0 — HERO COUNT-UP animation
// ════════════════════════════════════════════════════════════
let _lastHeroVal = null;
function animateHeroValue(newVal) {
  const el = document.getElementById('heroVal');
  if(!el) return;
  if(_lastHeroVal === null) { _lastHeroVal = newVal; return; }

  const delta = newVal - _lastHeroVal;
  if(Math.abs(delta) < 0.01) return;

  // Trigger beat animation
  el.classList.add('beat');
  setTimeout(() => el.classList.remove('beat'), 1250);

  // Color flash
  if(delta > 0) {
    el.classList.add('count-up');
    setTimeout(() => el.classList.remove('count-up'), 800);
  } else {
    el.classList.add('count-down');
    setTimeout(() => el.classList.remove('count-down'), 800);
  }

  _lastHeroVal = newVal;
}

// ════════════════════════════════════════════════════════════
// v5.0 — SOUND SYSTEM (subtle, toggleable)
// ════════════════════════════════════════════════════════════
let _soundEnabled = false;
let _audioCtx = null;

function toggleSound() {
  _soundEnabled = !_soundEnabled;
  const btn = document.getElementById('soundToggle');
  if(btn) {
    btn.classList.toggle('muted', !_soundEnabled);
    btn.innerHTML = _soundEnabled ? '\u{1F50A}' : '\u{1F507}';
  }
  if(_soundEnabled && !_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  showToast(_soundEnabled ? 'Son activ\u00e9' : 'Son d\u00e9sactiv\u00e9');
  try { navigator.vibrate && navigator.vibrate(8); } catch(e) {}
  try { localStorage.setItem('nexus_sound', _soundEnabled ? '1' : '0'); } catch(e) {}
}

function playTone(freq = 440, duration = 80, volume = 0.05, type = 'sine') {
  if(!_soundEnabled || !_audioCtx) return;
  try {
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, _audioCtx.currentTime);
    gain.gain.setValueAtTime(0, _audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, _audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + duration/1000);
    osc.connect(gain); gain.connect(_audioCtx.destination);
    osc.start();
    osc.stop(_audioCtx.currentTime + duration/1000);
  } catch(e) {}
}

// Init sound from storage
try {
  if(localStorage.getItem('nexus_sound') === '1') {
    _soundEnabled = true;
    setTimeout(() => {
      const btn = document.getElementById('soundToggle');
      if(btn) { btn.classList.remove('muted'); btn.innerHTML = '\u{1F50A}'; }
    }, 500);
  }
} catch(e) {}

// ════════════════════════════════════════════════════════════
// v5.1 — VICTORY PARTICLES · Celebration on big wins
// ════════════════════════════════════════════════════════════
function emitVictoryParticles(count, emojis) {
  count = count || 40;
  emojis = emojis || ['\u{1F4B0}','\u{2728}','\u{1F389}','\u{1F4B8}','\u{2B50}','\u{1F4B5}'];
  let container = document.querySelector('.victory-particles');
  if(!container) {
    container = document.createElement('div');
    container.className = 'victory-particles';
    document.body.appendChild(container);
  }
  const W = window.innerWidth, H = window.innerHeight;
  for(let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'vp-particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = (W/2) + 'px';
    p.style.top  = (H/2 - 50) + 'px';
    p.style.setProperty('--dx', (Math.random() * W - W/2).toFixed(0) + 'px');
    p.style.setProperty('--dy', (Math.random() * 80 - 40).toFixed(0) + 'px');
    p.style.animationDelay = (Math.random() * 0.2).toFixed(2) + 's';
    container.appendChild(p);
    setTimeout(() => p.remove(), 2800);
  }
  setTimeout(() => { if(container && container.children.length === 0) container.remove(); }, 3500);
}

function emitLossParticles(count) {
  count = count || 20;
  let container = document.querySelector('.victory-particles');
  if(!container) {
    container = document.createElement('div');
    container.className = 'victory-particles';
    document.body.appendChild(container);
  }
  const W = window.innerWidth, H = window.innerHeight;
  const emojis = ['\u{1F4A7}','\u{1F4A5}','\u{2744}'];
  for(let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'vp-particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = (W/2) + 'px';
    p.style.top  = (H/2 - 30) + 'px';
    p.style.setProperty('--dx', (Math.random() * W*.5 - W*.25).toFixed(0) + 'px');
    p.style.setProperty('--dy', '100px');
    p.style.animationDelay = (Math.random() * 0.15).toFixed(2) + 's';
    container.appendChild(p);
    setTimeout(() => p.remove(), 2800);
  }
  setTimeout(() => { if(container && container.children.length === 0) container.remove(); }, 3500);
}

// ════════════════════════════════════════════════════════════
// v5.1 — MILESTONE BANNER · Big event notifications
// ════════════════════════════════════════════════════════════
function showMilestone(icon, text, isLoss, duration) {
  isLoss = !!isLoss;
  duration = duration || 3200;
  // FIX toast collé : si un milestone est déjà affiché, on ignore les nouveaux pendant son
  // affichage (sinon des milestones qui s'enchaînent réarment le timer en boucle → banner figé).
  const now = Date.now();
  if (window._msShownUntil && now < window._msShownUntil) return;
  window._msShownUntil = now + duration;
  let banner = document.querySelector('.milestone-banner');
  if(!banner) {
    banner = document.createElement('div');
    banner.className = 'milestone-banner';
    document.body.appendChild(banner);
  }
  banner.className = 'milestone-banner' + (isLoss ? ' loss' : '');
  banner.innerHTML = '<span class="ms-icon">' + icon + '</span>' + text;
  requestAnimationFrame(() => banner.classList.add('show'));
  clearTimeout(window._msTimeout);
  window._msTimeout = setTimeout(() => {
    banner.classList.remove('show');
    window._msShownUntil = 0;
  }, duration);
  try { navigator.vibrate && navigator.vibrate(isLoss ? [20,40,20] : [15,30,15,30,15]); } catch(e) {}
  if(!isLoss) {
    playTone(523.25, 120, 0.05, 'triangle');
    setTimeout(() => playTone(659.25, 120, 0.05, 'triangle'), 100);
    setTimeout(() => playTone(783.99, 200, 0.05, 'triangle'), 220);
  } else {
    playTone(329.63, 180, 0.04, 'sine');
    setTimeout(() => playTone(261.63, 220, 0.04, 'sine'), 180);
  }
}

// ════════════════════════════════════════════════════════════
// v5.1 — BRAIN NETWORK INTERACTIVITY (tap = tooltip)
// ════════════════════════════════════════════════════════════
function initBrainInteraction() {
  const canvas = document.getElementById('brainCanvas');
  const wrap   = document.querySelector('.brain-canvas-wrap');
  const tip    = document.getElementById('brainTooltip');
  if(!canvas || !tip || !wrap) return;
  if(window._brainInteractionHooked) return;
  window._brainInteractionHooked = true;

  const handleTap = (e) => {
    if(!_brainNodes) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    let closest = null, minDist = 22;
    _brainNodes.nodes.forEach(n => {
      const dx = n.x - x, dy = n.y - y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if(d < minDist) { minDist = d; closest = n; }
    });

    if(closest) {
      const a = closest.a;
      const nameEl = document.getElementById('brainTtName');
      const scEl   = document.getElementById('brainTtScore');
      const fitEl  = document.getElementById('brainTtFitness');
      if(nameEl) nameEl.innerHTML = (a.emoji || '') + ' ' + (a.name || '?');
      const sc = a.score || 0;
      if(scEl) {
        scEl.innerHTML = 'Score: ' + (sc>=0?'+':'') + sc.toFixed(2) +
                         ' &middot; Conf: ' + Math.round((a.conf||0)*100) + '%';
        scEl.style.color = sc > 0.1 ? 'var(--up)' : sc < -0.1 ? 'var(--down)' : 'var(--t2)';
      }
      if(fitEl) fitEl.textContent = 'Fitness: ' + (a.fitness||0).toFixed(0) + ' T$ · Rôle: ' + (a.type || a.source || '—');

      const wrapRect = wrap.getBoundingClientRect();
      const tipW = 170;
      let left = closest.x - tipW/2;
      if(left < 4) left = 4;
      if(left + tipW > wrapRect.width - 4) left = wrapRect.width - tipW - 4;
      tip.style.left = left + 'px';
      tip.style.top  = Math.max(2, closest.y - 60) + 'px';
      tip.style.width = tipW + 'px';
      tip.classList.add('show');
      clearTimeout(window._brainTipTimeout);
      window._brainTipTimeout = setTimeout(() => tip.classList.remove('show'), 2500);
      try { navigator.vibrate && navigator.vibrate(6); } catch(e) {}
    } else {
      tip.classList.remove('show');
    }
  };

  canvas.addEventListener('click', handleTap);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleTap(e); }, { passive: false });
}

function bumpVersion(reason) {
  // v6.6: version figée — plus d'auto-incrément
  // La version affichée reste v6.5 (fixée dans le code)
}

// ── Évolution d'un agent sous-performant ──────────────────────
function triggerEvolution(weak) {
  const candidates = [...S.agents].filter(a=>!a.isBot&&!a.isMeta&&a.id!==weak.id)
                                   .sort((a,b)=>b.fitness-a.fitness);
  const p1 = candidates[0], p2 = candidates[1];
  if(!p1||!p2) return;

  const genNum = (S._genCount = (S._genCount||1) + 1);
  const prevName = weak.name;

  S.evoLog.push({ type:'removed', title:'⚰ '+prevName+' retraité', desc:`Fitness: ${Math.floor(weak.fitness)} T$ · ${weak.errors||0} erreurs`, time:nowStr() });

  // Croisement génétique des meilleurs parents
  weak.name    = `Hybrid Gen-${genNum}`;
  weak.emoji   = '🧬';
  weak.type    = p1.type.split('·')[0].trim()+'·'+p2.type.split('·')[0].trim();
  weak.source  = p1.source.split('/')[0]+'/'+p2.source.split('/')[0];
  weak.role    = 'hybrid';
  weak.fitness = 120;
  weak.score   = (p1.score * 0.6 + p2.score * 0.4) + (Math.random() - 0.5) * 0.08;
  weak.conf    = Math.min(0.80, (p1.conf * 0.6 + p2.conf * 0.4));
  weak.color   = p1.color;
  weak.errors  = 0; weak.corrections = 0; weak.streak = 0;
  weak.memory  = [];
  weak.fitnessHistory = [120];
  // v7.3 OPT · Hériter le regimeFitness du meilleur parent (fusion pondérée 60/40)
  const mergeRegimeFit = (rf1, rf2) => {
    const merged = {};
    const keys = new Set([...Object.keys(rf1||{}), ...Object.keys(rf2||{})]);
    keys.forEach(k => {
      const a = rf1?.[k] || {wins:0,total:0,sumPnl:0};
      const b = rf2?.[k] || {wins:0,total:0,sumPnl:0};
      merged[k] = {
        wins:   Math.round(a.wins   * 0.6 + b.wins   * 0.4),
        total:  Math.round(a.total  * 0.6 + b.total  * 0.4),
        sumPnl: a.sumPnl * 0.6 + b.sumPnl * 0.4
      };
    });
    return merged;
  };
  weak.regimeFitness = mergeRegimeFit(p1.regimeFitness, p2.regimeFitness);

  if(S.evoLog.length > 50) S.evoLog.splice(0, S.evoLog.length - 50);
  S.evoLog.push({ type:'new', title:'🧬 '+weak.name+' déployé', desc:`Parents: ${p1.name} × ${p2.name} | Gen-${genNum}`, time:nowStr() });
  S.chainLog.push({ icon:'🧬', desc:`Évolueur: ${weak.name} remplace ${prevName} | fitness cible: 300 T$`, hash:rndHash(), time:nowStr() });
  showToast('🧬 '+weak.name+' évolué depuis '+p1.name+' × '+p2.name);
  bumpVersion(`Évolution Gen-${genNum} · ${weak.name}`);
  buildAgentCards(); patchAgentCards();
}

// ============================================================
// DREAM SEQUENCES — Feature #2
// L'Évolueur génère des scénarios synthétiques quand le marché
// stagne (hold consécutifs). Les agents votent, les seuils
// de risque sont recalibrés, les résultats stockés dans S.dreams.
// ============================================================

const DREAM_SCENARIOS = [
  { id:'flash_crash',    icon:'💥', name:'Flash Crash',       sub:'-18% en 4 minutes',      direction:-1, magnitude:0.18, vol:3.5, duration:8  },
  { id:'parabolic_run',  icon:'🚀', name:'Parabolic Run',     sub:'+22% en 6 minutes',       direction: 1, magnitude:0.22, vol:2.8, duration:10 },
  { id:'liquidity_void', icon:'🌑', name:'Void de Liquidité', sub:'Spread ×8, order book vide', direction:-1, magnitude:0.09, vol:5.0, duration:6  },
  { id:'regulatory_ban', icon:'⚖️', name:'Choc Réglementaire',sub:'-28% ouverture gap',      direction:-1, magnitude:0.28, vol:4.2, duration:5  },
  { id:'whale_pump',     icon:'🐋', name:'Whale Pump',        sub:'+14% en 2 minutes',       direction: 1, magnitude:0.14, vol:2.2, duration:7  },
  { id:'sideways_grind', icon:'😴', name:'Consolidation',     sub:'±0.3% pendant 2h',        direction: 0, magnitude:0.003,vol:0.3, duration:15 },
];

let _dreamTimeout = null;

function shouldTriggerDream(pair) {
  if(S.dreamActive) return false;
  if(!S._holdConsecutive) S._holdConsecutive = {};
  const h = S._holdConsecutive[pair] || 0;
  // Trigger after 5+ consecutive holds on any pair, roughly every 90 cycles max
  return h >= 5 && (S.cycle % 90 === 0 || h === 5);
}

function triggerDreamCycle() {
  if(S.dreamActive) return;
  S.dreamActive   = true;
  S.dreamProgress = 0;

  // Pick 3 random scenarios
  const shuffled = [...DREAM_SCENARIOS].sort(() => Math.random() - 0.5).slice(0, 3);
  const dreamRun = {
    id:        S.dreams.length + 1,
    startCycle:S.cycle,
    time:      nowStr(),
    scenarios: shuffled.map(sc => ({ ...sc, agentVotes: 0, agentAgainst: 0, outcome: null, calibration: null })),
    complete:  false,
    insight:   ''
  };
  S.currentDream = dreamRun;

  S.chainLog.push({ icon:'💤', desc:`Évolueur déclenche Dream Cycle #${dreamRun.id} · ${shuffled.length} scénarios`, hash:rndHash(), time:nowStr() });
  showToast('💤 Dream Cycle #' + dreamRun.id + ' — stress-test en cours…');

  let scIdx = 0;
  function runNextScenario() {
    if(scIdx >= dreamRun.scenarios.length) {
      finalizeDream(dreamRun);
      return;
    }
    runDreamScenario(dreamRun, scIdx, () => {
      scIdx++;
      S.dreamProgress = Math.round((scIdx / dreamRun.scenarios.length) * 100);
      _dreamTimeout = setTimeout(runNextScenario, 1200);
    });
  }
  runNextScenario();
}

function runDreamScenario(dreamRun, idx, onDone) {
  const sc  = dreamRun.scenarios[idx];
  const ref = S.pairStates['BTC/USDT'] || Object.values(S.pairStates)[0];
  if(!ref) { onDone(); return; }

  // Simulate synthetic price path (shadow — no real impact on S.pairStates)
  const basePrice = ref.price;
  const shadowCandles = [];
  let p = basePrice;
  for(let i = 0; i < sc.duration; i++) {
    const trend = sc.direction * sc.magnitude * (1 - i / sc.duration) * basePrice / sc.duration;
    const noise = (Math.random() - 0.5) * PAIRS['BTC/USDT'].vol * sc.vol;
    const c = p + trend + noise;
    shadowCandles.push({ o: p, c, h: Math.max(p,c)*1.002, l: Math.min(p,c)*0.998 });
    p = c;
  }
  const priceDelta = (shadowCandles[shadowCandles.length-1].c - basePrice) / basePrice;

  // Agents vote on the scenario
  let forVotes = 0, againstVotes = 0;
  S.agents.filter(a => !a.isBot && !a.isMeta).forEach(a => {
    const expectedDir = sc.direction;
    const agentDir    = a.score > 0.1 ? 1 : a.score < -0.1 ? -1 : 0;
    const aligned     = agentDir === expectedDir || expectedDir === 0;
    const weight      = (a.fitness || 1) * (a.conf || 0.5);
    if(aligned) forVotes    += weight;
    else        againstVotes += weight;

    // Soft learning from the dream: agents who were "wrong" get nudged
    if(!aligned && Math.abs(a.score) > 0.15) {
      a.conf  = Math.max(0.35, a.conf - 0.006);
      a.score = Math.max(-1, Math.min(1, a.score * 0.97));
    }
  });

  // Calibration output: adjust thresholds based on extreme scenario severity
  let calibration = null;
  if(Math.abs(priceDelta) > 0.10) {
    // Extreme event — tighten stop-losses across all pairs
    calibration = { type: 'tighten_sl', factor: 0.85, reason: sc.name };
    Object.values(S.pairStates).forEach(ps => {
      ps.threshold = Math.min(0.82, (ps.threshold || 0.65) + 0.03);
    });
  } else if(sc.id === 'sideways_grind') {
    // Low vol regime — widen cycle timers
    calibration = { type: 'widen_cycles', factor: 1.2, reason: sc.name };
  }

  sc.agentVotes   = Math.round(forVotes);
  sc.agentAgainst = Math.round(againstVotes);
  sc.outcome      = { priceDelta, shadowCandles: shadowCandles.length, survived: Math.abs(priceDelta) < 0.25 };
  sc.calibration  = calibration;

  onDone();
}

function finalizeDream(dreamRun) {
  dreamRun.complete = true;
  S.dreamActive     = false;
  S.dreamProgress   = 100;
  S.currentDream    = null;
  if(_dreamTimeout) { clearTimeout(_dreamTimeout); _dreamTimeout = null; }

  // Generate insight
  const extremes = dreamRun.scenarios.filter(s => s.outcome && Math.abs(s.outcome.priceDelta) > 0.08);
  const survived = dreamRun.scenarios.every(s => !s.outcome || s.outcome.survived);
  dreamRun.insight = survived
    ? `Système résilient sur les ${dreamRun.scenarios.length} scénarios testés. Paramètres de risque stables.`
    : `${extremes.length} scénario(s) critique(s) détecté(s). Seuils TP/SL recalibrés sur toutes les paires.`;

  S.dreams.unshift(dreamRun);
  if(S.dreams.length > 10) S.dreams.pop();
  if(S.evoLog.length > 50) S.evoLog.splice(0, S.evoLog.length - 50);

  S.evoLog.push({
    type: 'dream',
    title: `💤 Dream #${dreamRun.id} terminé`,
    desc:  dreamRun.insight,
    time:  nowStr(),
    dreamId: dreamRun.id
  });
  S.chainLog.push({ icon:'💤', desc:`Dream #${dreamRun.id} · ${dreamRun.insight.slice(0,60)}`, hash:rndHash(), time:nowStr() });
  showToast('✅ Dream #' + dreamRun.id + (survived ? ' · Système résilient' : ' · Seuils recalibrés'));
  bumpVersion(`Dream #${dreamRun.id} · ${survived ? 'résilient' : 'recalibré'}`);
  updateIntelBanner();
}

// ============================================================
// DYNAMIC PAIR via DAO — Feature #3
// L'Évolueur évalue la diversification. Si insuffisante,
// il propose une nouvelle paire via une DAO proposal.
// Quand le vote passe, la paire est instanciée dynamiquement.
// ============================================================

let _pairProposalCooldown = 0;  // Minimum cycles between proposals

function evaluatePairDiversity() {
  const nPairs = Object.keys(S.pairStates).length;
  // Simple heuristic: propose when <6 pairs and after cooldown
  if(nPairs >= 6) return false;
  if(S.cycle < _pairProposalCooldown) return false;
  if(S.activePairProposal) return false;
  // Also require min portfolio size to justify diversification
  if(S.portfolio < 15000) return false;
  return true;
}

function proposeDynamicPair() {
  if(!evaluatePairDiversity()) return;

  // Filter out already-active pairs and already-proposed
  const activeSyms = new Set(Object.keys(PAIRS).map(k => k.split('/')[0]));
  const candidates = S.pairCandidates.filter(c => !activeSyms.has(c.sym));
  if(candidates.length === 0) return;

  // Score candidates: prefer low-corr and high-relevance to current market
  const avgAgentScore = S.agents.reduce((s,a)=>s+a.score,0)/S.agents.length;
  const scored = candidates.map(c => {
    let score = c.corr === 'LOW' ? 1.0 : c.corr === 'MED' ? 0.65 : 0.3;
    score += Math.random() * 0.2; // slight randomness
    return { ...c, _score: score };
  }).sort((a,b) => b._score - a._score);

  const chosen = scored[0];
  S.activePairProposal = chosen.sym;
  _pairProposalCooldown = S.cycle + 120;

  
  const totalFit = S.agents.reduce((s,a)=>s+(a.fitness||1),0);
  const forVotes = Math.round(
    S.agents.filter(a => a.score > 0 || a.role === 'fundamental')
      .reduce((s,a)=>s+(a.fitness||1),0) / totalFit * 3800 + Math.random()*400
  );
  const againstVotes = Math.round(
    S.agents.filter(a => a.score <= 0 && a.role !== 'fundamental')
      .reduce((s,a)=>s+(a.fitness||1),0) / totalFit * 1200 + Math.random()*200
  );

  const proposal = {
    id:            100 + S.dreams.length + S.proposals.length,
    desc:          `Ajouter ${chosen.sym}/USDT au portefeuille actif`,
    forVotes,
    againstVotes,
    status:        'active',
    userVoted:     false,
    isPairProposal:true,
    pairSym:       chosen.sym,
    pairCfg:       chosen,
    rationale:     chosen.rationale,
    autoPassAt:    S.cycle + 30,  // Auto-pass if not acted on
  };
  S.proposals.unshift(proposal);

  S.chainLog.push({ icon:'🌐', desc:`Évolueur propose ${chosen.sym}/USDT · corrélation ${chosen.corr} · diversification portefeuille`, hash:rndHash(), time:nowStr() });
  showToast('🌐 Nouvelle paire proposée: ' + chosen.sym + '/USDT');
}

function activateDynamicPair(sym) {
  const candidate = S.pairCandidates.find(c => c.sym === sym);
  if(!candidate) return;
  const pairKey = sym + '/USDT';
  if(PAIRS[pairKey]) { showToast('⚠️ ' + pairKey + ' déjà active', 2800, 'critical'); return; }

  // Register in PAIRS
  PAIRS[pairKey] = {
    sym:        candidate.sym,
    color:      candidate.color,
    startPrice: candidate.startPrice,
    vol:        candidate.vol,
    minP:       candidate.minP,
    maxP:       candidate.maxP,
    dec:        candidate.dec
  };
  S.pairStates[pairKey] = makePairState(PAIRS[pairKey]);

  // Mark proposal as executed
  const prop = S.proposals.find(p => p.isPairProposal && p.pairSym === sym);
  if(prop) prop.status = 'executed';
  S.activePairProposal = null;

  // Remove from candidates
  const idx = S.pairCandidates.findIndex(c => c.sym === sym);
  if(idx >= 0) S.pairCandidates.splice(idx, 1);

  // Add fiscal entry for new pair
  if(!S.fees.byPair[pairKey]) {
    S.fees.byPair[pairKey] = { tradingFees:0, funding:0, slippage:0, gross:0, tax:0, pnlGross:0, pnlNet:0, trades:0, netPct:0 };
  }

  S.chainLog.push({ icon:'🌐', desc:`${pairKey} activée · DAO vote exécuté · portefeuille élargi à ${Object.keys(PAIRS).length} paires`, hash:rndHash(), time:nowStr() });
  S.evoLog.push({ type:'pair', title:'🌐 ' + pairKey + ' activée', desc:`DAO vote · corrélation ${candidate.corr} · capital alloué automatiquement`, time:nowStr() });
  showToast('✅ ' + pairKey + ' activée — trading en cours !');
  bumpVersion(`Paire ${pairKey} activée · ${Object.keys(PAIRS).length} paires actives`);
  updateIntelBanner();

  // Rebuild UI to include new pair
  buildPairPosButtons?.();
  renderActionsGrid?.();
  renderAll?.();
}

// Auto-resolve pair proposals
function rejectPairProposal(sym) {
  const prop = S.proposals.find(p => p.isPairProposal && p.pairSym === sym && p.status === 'active');
  if(!prop) return;
  prop.status = 'rejected';
  S.activePairProposal = null;
  _pairProposalCooldown = S.cycle + 60;  // wait 60 cycles before proposing again
  // Remove from candidates permanently for this session
  const idx = S.pairCandidates.findIndex(c => c.sym === sym);
  if(idx >= 0) S.pairCandidates.splice(idx, 1);
  S.chainLog.push({ icon:'✕', desc:`Paire ${sym}/USDT rejetée par utilisateur`, hash:rndHash(), time:nowStr() });
  showToast('✕ ' + sym + '/USDT rejeté · prochain candidat dans 60 cycles');
  renderDAO();
}

function checkPairProposalAutoPass() {
  S.proposals.forEach(p => {
    if(p.isPairProposal && p.status === 'active' && p.autoPassAt && S.cycle >= p.autoPassAt) {
      // Pair proposals require user approval — auto-pass disabled
      // User must click "Activer" button in DAO tab
      // But we mark as "ready" after vote threshold
      p._readyToActivate = (p.forVotes > p.againstVotes * 1.3);
      if(p._readyToActivate) {
        showToast('🌐 ' + p.pairSym + '/USDT prêt · en attente de votre accord');
      }
    }
  });
}

// Called every tick to apply unrealised position PnL as a soft signal to agents
function learnFromOpenPositions() {
  if(S.openPositions.length === 0) return;
  S.openPositions.forEach(pos => {
    const ps  = S.pairStates[pos.pair];
    if(!ps) return;
    const cur = ps.price;
    const unrealisedPct = pos.side === 'long'
      ? ((cur - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - cur) / pos.entryPrice) * 100;

    // Only apply if the position has been open for at least a bit (avoid noise on open)
    if(Math.abs(unrealisedPct) < 0.5) return;

    // Soft learning — half weight of a realised trade
    S.agents.forEach(a => {
      const winning  = unrealisedPct > 0;
      const aligned  = (winning && a.score > 0) || (!winning && a.score < 0);
      const nudge    = Math.abs(a.score) * Math.abs(unrealisedPct) * 0.5;  // v6.9: nudge x1.67
      if(aligned) {
        a.fitness = Math.min(a.fitness + nudge, a.fitness * 1.01);
      } else {
        a.fitness = Math.max(50, a.fitness - nudge * 0.5);  // v8.0 LIVRAISON 27 FIX · borne min unifiée à 50
      }
    });

    // ═══ v7.12 · PACK RÉSILIENCE · 3 nouvelles stratégies de sortie ═══
    // Applicables à TOUTES les positions (auto et manuelles)
    
    // Calculer le P&L % courant
    const _cExitPct = pos.side === 'long'
      ? ((cur - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - cur) / pos.entryPrice) * 100;
    
    // Mémoriser le peak P&L pour trailing stop
    if (!pos._peakPct) pos._peakPct = 0;
    if (_cExitPct > pos._peakPct) pos._peakPct = _cExitPct;
    
    // ── A. TRAILING STOP ──
    // Si on a atteint un pic de +1% min et qu'on retombe de 0.5 points par rapport au pic,
    // on ferme pour verrouiller le gain.
    // Ex: pic +1.5% → seuil trailing = +1.0% → si prix repasse sous +1.0%, fermeture
    if (pos._peakPct >= 1.0) {
      const trailingDrop = pos._peakPct - _cExitPct;
      if (trailingDrop >= 0.5) {
        closePosition(pos.id, pos.auto === true);
        S.chainLog.push({
          icon: '🎯',
          desc: `Trailing stop · ${pos.pair} ${pos.side.toUpperCase()} · pic +${pos._peakPct.toFixed(2)}% → sortie @+${_cExitPct.toFixed(2)}%`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        if (typeof showToast === 'function') showToast('🎯 Trailing stop · ' + pos.pair + ' +' + _cExitPct.toFixed(2) + '% verrouillé', 3000, 'user');
        return;
      }
    }
    
    // ── C. TIMER ANTI-ZOMBIE ──
    // Si position ouverte > 30 min ET P&L entre -0.3% et +0.3% (flat) → fermer
    const posAgeMs = Date.now() - (pos.openedAt || Date.now());
    if (posAgeMs > 30 * 60 * 1000 && Math.abs(_cExitPct) < 0.3) {
      closePosition(pos.id, pos.auto === true);
      S.chainLog.push({
        icon: '⏱',
        desc: `Timer anti-zombie · ${pos.pair} · ${Math.round(posAgeMs/60000)}min flat (${_cExitPct>=0?'+':''}${_cExitPct.toFixed(2)}%)`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      if (typeof showToast === 'function') showToast('⏱ ' + pos.pair + ' fermé (30min flat)', 2500, 'user');
      return;
    }
    
    // ── D. CONSENSUS SWITCH ──
    // Si le consensus du Brain bascule à l'opposé de notre side
    // (LONG détient, Brain vote SHORT fortement → fermer)
    // On utilise LMSR (prob de LONG) : < 0.35 = strong SHORT, > 0.65 = strong LONG
    if (pos.auto === true && typeof lmsrP === 'function') {
      const brainProb = lmsrP(ps);  // 0 = SHORT, 1 = LONG
      const conflict = (pos.side === 'long' && brainProb < 0.35) ||
                       (pos.side === 'short' && brainProb > 0.65);
      if (conflict && _cExitPct > -0.2) {  // seulement si pas trop en perte (éviter sell au pire moment)
        closePosition(pos.id, true);
        S.chainLog.push({
          icon: '🔄',
          desc: `Consensus switch · ${pos.pair} ${pos.side.toUpperCase()} · Brain bascule (LMSR ${(brainProb*100).toFixed(0)}%)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        if (typeof showToast === 'function') showToast('🔄 ' + pos.pair + ' fermé (Brain a basculé)', 2800, 'user');
        return;
      }
    }

    // ── TP/SL monitoring for manual positions ──────────────
    if(pos.auto !== true) {
      // Take Profit
      if(pos.tp !== null) {
        const tpHit = pos.side==='long' ? cur >= pos.tp : cur <= pos.tp;
        if(tpHit) {
          closePosition(pos.id, false);  // user-set TP — always allowed
          S.chainLog.push({ icon:'🎯', desc:`TP atteint ${pos.pair} ${pos.side.toUpperCase()} @${cur.toFixed(2)}`, hash:rndHash(), time:nowStr() });
          showToast('🎯 TP atteint — '+pos.pair+' fermé');
          return;
        }
      }
      // v7.12 · BUG FIX ADA · Liquidation automatique à -90%
      // Comme un vrai exchange : si la perte approche -100%, on ferme avant pour protéger
      {
        const rawLossPct = pos.side === 'long'
          ? ((cur - pos.entryPrice) / pos.entryPrice) * 100
          : ((pos.entryPrice - cur) / pos.entryPrice) * 100;
        if (rawLossPct <= -90) {
          closePosition(pos.id, false);
          S.chainLog.push({ icon:'💥', desc:`LIQUIDATION ${pos.pair} ${pos.side.toUpperCase()} @${cur.toFixed(pos.pair.includes('USDT')&&ps.price<10?4:2)} · perte extrême évitée`, hash:rndHash(), time:nowStr() });
          showToast('💥 Liquidation — '+pos.pair+' (garde-fou -90%)', 4000, 'critical');
          return;
        }
      }
      // Stop Loss
      if(pos.sl !== null) {
        const slHit = pos.side==='long' ? cur <= pos.sl : cur >= pos.sl;
        if(slHit) {
          closePosition(pos.id, false);  // user-set SL — always allowed
          S.chainLog.push({ icon:'🛑', desc:`SL déclenché ${pos.pair} ${pos.side.toUpperCase()} @${cur.toFixed(2)}`, hash:rndHash(), time:nowStr() });
          showToast('🛑 Stop Loss — '+pos.pair+' fermé', 2800, 'critical');
          return;
        }
      }
    }
  });
}
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(()=>{ document.getElementById('installBanner').classList.add('show'); }, 3000);
});

window.addEventListener('appinstalled', () => {
  document.getElementById('installBanner').classList.remove('show');
  showToast('✓ NEXUS ajouté à l\'écran d\'accueil');
});

function triggerInstall() {
  dismissInstall();
  if(deferredPrompt) {
    // Android/Chrome native prompt
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(r => {
      if(r.outcome==='accepted') showToast('✓ NEXUS installé !');
      deferredPrompt = null;
    });
  } else {
    // Show modal with OS-specific steps
    const modal = document.getElementById('installModal');
    const inner = document.getElementById('installModalInner');
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    document.getElementById('iosGuide').style.display     = isIOS ? 'block' : 'none';
    document.getElementById('androidGuide').style.display = isIOS ? 'none' : 'block';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    inner.style.transform = 'translateY(0)';
  }
}

function closeInstallModal() {
  const modal = document.getElementById('installModal');
  const inner = document.getElementById('installModalInner');
  modal.style.opacity = '0';
  modal.style.pointerEvents = 'none';
  inner.style.transform = 'translateY(40px)';
}

function dismissInstall() {
  document.getElementById('installBanner').classList.remove('show');
}

// Inject PWA manifest dynamically
(function injectManifest(){
  const manifest = {
    name:'AURA ∞',
    short_name:'AURA ∞',
    description:'AURA ∞ — Adaptive Universal Risk Architect',
    start_url:'/aura/AURA_v8_complet.html',
    display:'standalone',
    background_color:'#050709',
    theme_color:'#f5b800',
    orientation:'portrait',
    icons:[{
      src:"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><defs><linearGradient id='g1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23ffe066'/><stop offset='50%25' stop-color='%23f5b800'/><stop offset='100%25' stop-color='%23d4661a'/></linearGradient><linearGradient id='g2' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%237dd3fc'/><stop offset='50%25' stop-color='%230ea5e9'/><stop offset='100%25' stop-color='%231e3a8a'/></linearGradient></defs><rect width='512' height='512' rx='112' fill='%23050709'/><text y='280' font-size='130' x='50%25' text-anchor='middle' fill='url(%23g1)' font-family='sans-serif' font-weight='900'>AURA</text><text y='420' font-size='160' x='50%25' text-anchor='middle' fill='url(%23g2)' font-family='sans-serif' font-weight='700'>∞</text></svg>",
      sizes:'512x512',type:'image/svg+xml',purpose:'any maskable'
    }]
  };
  const blob = new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'});
  const url  = URL.createObjectURL(blob);
  const link = document.getElementById('pwaManifest');
  if(link) link.href = url;

  // Show iOS banner after 4s if not standalone
  if(!window.navigator.standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
    setTimeout(()=>document.getElementById('installBanner').classList.add('show'), 4000);
  }
})();

// ============================================================
// PAIR P&L RENDERING
// ============================================================
function renderPairPnl() {
  const pairs = Object.keys(PAIRS).map(pair => {
    const ps = S.pairStates[pair];
    return { pair, ps, cfg: PAIRS[pair], usd: ps.totalPnlUsd, pct: ps.totalPnlPct, trades: ps.totalTrades, wr: ps.totalTrades > 0 ? Math.round(ps.winTrades/ps.totalTrades*100) : 0 };
  }).sort((a, b) => b.usd - a.usd);  // best first

  const totalUsd    = pairs.reduce((s, p) => s + p.usd, 0);
  const totalTrades = pairs.reduce((s, p) => s + p.trades, 0);
  const maxAbs      = Math.max(1, ...pairs.map(p => Math.abs(p.usd)));

  // Global header
  const gUsd = document.getElementById('globalPnlUsd');
  const gPct = document.getElementById('globalPnlPct');
  const gTr  = document.getElementById('globalPnlTrades');
  const col  = totalUsd >= 0 ? 'var(--up)' : 'var(--down)';
  if(gUsd) { gUsd.textContent = (totalUsd>=0?'+':'')+fmt$(totalUsd); gUsd.style.color = col; }
  if(gPct) { gPct.textContent = (totalUsd>=0?'+':'')+totalUsd.toFixed(1)+'$'; gPct.style.color = col; }
  if(gTr)  { gTr.textContent  = totalTrades+' trades'; }

  // Stacked bars
  const barsEl = document.getElementById('pairPnlBars');
  if(!barsEl) return;
  // Patch or build bars — build once, patch values
  const existBars = barsEl.querySelectorAll('[data-pairbar]');
  if(existBars.length !== pairs.length) {
    // Build scaffold
    barsEl.innerHTML = pairs.map(({ pair, cfg }) => `
    <div data-pairbar="${pair}" style="display:grid;grid-template-columns:70px 1fr 60px;gap:8px;align-items:center;cursor:pointer;" onclick="goPage(2);">
      <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
        <div style="width:6px;height:6px;border-radius:50%;background:${cfg.color};flex-shrink:0;"></div>
        <span style="font-size:10px;font-weight:700;color:${cfg.color};">${pair.replace('/USDT','')}</span>
        <span class="pb-open-badge" id="pb_badge_${pair.replace('/','_')}" style="display:none;font-size:8px;color:var(--ice);background:rgba(56,212,245,.1);padding:1px 5px;border-radius:4px;"></span>
      </div>
      <div style="position:relative;height:8px;background:var(--s3);border-radius:100px;overflow:hidden;">
        <div class="pb-fill" id="pb_fill_${pair.replace('/','_')}" style="position:absolute;left:0;height:100%;width:0%;background:#00e87a;border-radius:100px;transition:width .5s;"></div>
      </div>
      <div style="text-align:right;">
        <div class="pb-usd" id="pb_usd_${pair.replace('/','_')}" style="font-size:11px;font-weight:700;color:var(--up);">$0</div>
        <div class="pb-meta" id="pb_meta_${pair.replace('/','_')}" style="font-size:8px;color:var(--t3);">0t</div>
      </div>
    </div>`).join('');
  }
  // Patch values
  pairs.forEach(({ pair, cfg, usd, trades, wr }) => {
    const k    = pair.replace('/','_');
    const up   = usd >= 0;
    const bcol = up ? '#00e87a' : '#ff3d6b';
    const barPct = Math.min(100, (Math.abs(usd) / maxAbs) * 100);
    const fillEl  = document.getElementById('pb_fill_'+k);
    const usdEl   = document.getElementById('pb_usd_'+k);
    const metaEl  = document.getElementById('pb_meta_'+k);
    const badgeEl = document.getElementById('pb_badge_'+k);
    const pos     = S.openPositions.find(p => p.pair === pair);
    if(fillEl)  { fillEl.style.width = barPct+'%'; fillEl.style.background = bcol; fillEl.style.left = up?'0':'auto'; fillEl.style.right = up?'auto':'0'; }
    if(usdEl)   { usdEl.textContent = (up?'+':'')+fmt$(usd); usdEl.style.color = up?'var(--up)':'var(--down)'; }
    if(metaEl)  metaEl.textContent = trades+'t · '+wr+'%';
    if(badgeEl) {
      if(pos) {
        const exp = pos.totalExposure || pos.stakeUsdt;
        badgeEl.textContent = (pos.side==='long'?'↑':'↓')+' $'+exp;
        badgeEl.style.display = '';
      } else { badgeEl.style.display = 'none'; }
    }
  });

}

// v8.0 LIVRAISON 37 · Wrapper de confirmation propre pour Reset P&L cumulé
// v8.0 LIVRAISON 38 · Wrapper de confirmation pour Factory Reset
function _confirmFactoryReset() {
  const msg = 'Reset complet ? Toutes les données seront effacées.\n\nAction IRRÉVERSIBLE.\n\nContinuer ?';
  if (confirm(msg)) {
    if (typeof factoryReset === 'function') {
      factoryReset();
    } else {
      alert('Erreur : factoryReset introuvable');
    }
  }
}
window._confirmFactoryReset = _confirmFactoryReset;

// v8.0 LIVRAISON 41 · Wrapper RESET COMPLET COHÉRENT 

function _confirmFullCoherentReset() {
  const msg = 'RESET COMPLET COHÉRENT ?\n\n' +
    'Cette action remet à zéro :\n' +
    '• paperRealStats (compteurs trades par paire)\n' +
    '• heatmap (statistiques par heure/jour/régime)\n' +
    '• _lossStreaks (séries de pertes)\n' +
    '• paperRealKillSwitch (pauses auto)\n' +
    '• tradeContextMemory (mémoire contexte)\n' +
    '• S.totalTrades / S.winTrades\n' +
    '• fees.byPair (frais par paire)\n\n' +
    'NE TOUCHE PAS À : portfolio, agents, bots, paramètres.\n\n' +
    'Continuer ?';
  if (!confirm(msg)) return;
  
  try {
    
    S.paperRealStats = {};
    
    // v8.0 LIVRAISON 41 FIX · heatmap structure réelle byHour + byWeekday
    S.heatmap = { byHour: {}, byWeekday: {} };
    
    // Reset loss streaks
    S._lossStreaks = {};
    
    // Reset kill switches
    S.paperRealKillSwitch = {};
    
    // v8.0 LIVRAISON 41 FIX · tradeContextMemory est un ARRAY (pas un objet)
    S.tradeContextMemory = [];
    
    // Reset compteurs globaux
    S.totalTrades = 0;
    S.winTrades = 0;
    S.paperRealConsecLosses = 0;
    
    // Reset fees byPair ET totaux (v11quinquies FIX)
    if (S.fees && S.fees.byPair) {
      Object.keys(S.fees.byPair).forEach(pair => {
        S.fees.byPair[pair] = { tradingFees:0, slippage:0, gross:0, tax:0, pnlGross:0, pnlNet:0, trades:0, netPct:0 };
      });
    }
    S.fees.totalFees    = 0;
    S.fees.totalPnlGross = 0;
    S.fees.totalPnlNet  = 0;
    
    // v11quinquies FIX : reset pnlHistory + recalibrer _startPortfolio
    S.pnlHistory = [];
    const _now = (S.cashAccount||0) + (S.tradingAccount||0);
    S._startPortfolio = _now;
    if (S.pnlPeriod) {
      S.pnlPeriod.todayStartPortfolio = _now;
      S.pnlPeriod.weekStartPortfolio  = _now;
    }
    
    // Reset pairStates.trades (la liste des trades par paire)
    Object.keys(S.pairStates || {}).forEach(pair => {
      if (S.pairStates[pair].trades) S.pairStates[pair].trades = [];
      if (S.pairStates[pair].totalTrades !== undefined) S.pairStates[pair].totalTrades = 0;
      if (S.pairStates[pair].winTrades !== undefined) S.pairStates[pair].winTrades = 0;
      if (S.pairStates[pair].totalPnlUsd !== undefined) S.pairStates[pair].totalPnlUsd = 0;
    });
    
    // Sauvegarde immédiate
    if (typeof saveState === 'function') saveState();
    
    if (typeof showToast === 'function') {
      showToast('✅ Reset complet cohérent effectué', 4000, 'user');
    }
    
    // Refresh UI
    if (typeof renderHome === 'function') renderHome();
    if (typeof renderSettingsPanel === 'function') renderSettingsPanel();
  } catch(e) {
    alert('Erreur lors du reset : ' + e.message);
  }
}
window._confirmFullCoherentReset = _confirmFullCoherentReset;


function _detectPaperRealStatsCorruption() {
  if (!S.paperRealStats) return false;
  let corrupted = false;
  Object.entries(S.paperRealStats).forEach(([pair, stats]) => {
    const trades = stats.trades || 0;
    const wins = stats.wins || 0;
    const losses = stats.losses || 0;
    // Anomalies : trades > 1000, ou wins+losses != trades, ou 100% WR sur >100 trades
    if (trades > 1000) {
      console.warn('[CORRUPTION] paperRealStats.' + pair + ' : ' + trades + ' trades (anormal)');
      corrupted = true;
    }
    if (wins + losses !== trades && trades > 10) {
      console.warn('[CORRUPTION] paperRealStats.' + pair + ' : wins(' + wins + ') + losses(' + losses + ') != trades(' + trades + ')');
      corrupted = true;
    }
    if (trades > 100 && wins === trades) {
      console.warn('[CORRUPTION] paperRealStats.' + pair + ' : 100% WR sur ' + trades + ' trades (impossible)');
      corrupted = true;
    }
  });
  return corrupted;
}
window._detectPaperRealStatsCorruption = _detectPaperRealStatsCorruption;

function _confirmResetPnlCumule() {
  const msg = 'Remettre à zéro le P&L cumulé de toutes les paires ?\n\nCette action n\'efface PAS tes trades, juste les compteurs P&L cumulés affichés sur l\'écran d\'accueil.';
  if (confirm(msg)) {
    if (typeof resetPairPnl === 'function') {
      resetPairPnl();
      if (typeof showToast === 'function') {
        showToast('✅ P&L cumulé remis à zéro', 2800, 'user');
      }
    } else {
      alert('❌ Erreur : fonction resetPairPnl introuvable');
    }
  }
}
window._confirmResetPnlCumule = _confirmResetPnlCumule;

function resetPairPnl() {
  Object.values(S.pairStates).forEach(ps => {
    ps.totalPnlUsd = 0; ps.totalPnlPct = 0;
    ps.totalTrades = 0; ps.winTrades   = 0;
    ps.bestTrade   = null; ps.worstTrade = null;
  });
  S.totalTrades = 0; S.winTrades = 0;
  renderPairPnl();
  showToast('↺ P&L remis à zéro · toutes paires', 2800, 'user');
  S.chainLog.push({ icon:'↺', desc:'P&L reset · toutes paires · cycle #'+S.cycle, hash:rndHash(), time:nowStr() });
}

// ============================================================
// ALL-PAIRS LMSR GAUGES
// ============================================================


// v7.12 · restauré — version originale qui remplit les cartes classiques
function renderActionsGrid() {
  const grid = document.getElementById('actionsGrid');
  if(!grid) return;

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const ps   = S.pairStates[pair];
    const prob = lmsrP(ps);
    const pct  = prob * 100;
    let action='hold', actionLabel='HOLD';
    if(prob > .6)  { action='buy';  actionLabel='🤖 BUY';  }
    else if(prob < .4) { action='sell'; actionLabel='🤖 SELL'; }

    // If user has a manual position, show that instead of bot signal
    const manualPos = S.openPositions.find(p => p.pair===pair && p.auto!==true);
    const botPos    = S.openPositions.find(p => p.pair===pair && p.auto===true);
    const dispLabel = manualPos
      ? (manualPos.side==='long' ? '🔒 LONG' : '🔒 SHORT')
      : botPos
      ? (botPos.side==='long' ? '🟢 LONG ●' : '🔴 SHORT ●')
      : actionLabel;
    const dispAction = (manualPos || botPos)
      ? ((manualPos||botPos).side==='long' ? 'buy' : 'sell')
      : action;
    const pairKey  = pair.replace('/','_');
    const priceStr = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : ('$'+Math.floor(ps.price).toLocaleString());
    const probCol  = dispAction==='buy'?'var(--up)':dispAction==='sell'?'var(--down)':'var(--gold)';

    // ── Wrapper colonne (carte + positions dessous) ──
    let wrapper = document.getElementById('acwrap_'+pairKey);
    if(!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'acwrap_'+pairKey;
      wrapper.className = 'ac-pair-wrap';
      grid.appendChild(wrapper);
    }

    // ── Carte action ──
    let el = document.getElementById('ac2_'+pairKey);
    if(!el) {
      el = document.createElement('div');
      el.id = 'ac2_'+pairKey;
      el.className = 'action-card '+dispAction + (S.botAutoMode === false ? ' manual-mode-dim' : ''); el.setAttribute('data-pair', pair);
      // Compute pair stats for header
      const pWin = ps.totalTrades > 0 ? Math.round(ps.winTrades/ps.totalTrades*100) : null;
      const p24 = ps.pnl24h || 0;
      const pVolAtr = ps.atr || 0;
      el.innerHTML = `
        <div class="action-glow"></div>
        <!-- Badge 24h change — absolu top-right -->
        <div class="ac-change24"
             id="ac2_pnl24_${pairKey}"
             style="background:${p24>=0?'rgba(0,232,122,.12)':'rgba(255,61,107,.12)'};color:${p24>=0?'var(--up)':'var(--down)'};">
          ${p24>=0?'+':''}${p24.toFixed(2)}%
        </div>

        <!-- Ligne 1 : Nom de la paire + signal LMSR -->
        <div class="action-card-pair">
          <span class="ac-pair-name" style="color:${cfg.color};">${pair}</span>
          <span id="ac2_sig_${pairKey}" class="ac-pair-lmsr">${pct>=50?'↑':'↓'}${pct.toFixed(0)}%</span>
        </div>

        <!-- Ligne 2 : WR · trades · σ -->
        <div class="ac-header-stats">
          <span class="ac-stat-pill ${pWin>=60?'win':pWin!==null&&pWin<40?'loss':'neutral'}" id="ac2_wr_${pairKey}">
            ${pWin!==null?pWin+'%':'—'}<span style="opacity:.6;font-size:7px;"> WR</span>
          </span>
          <span class="ac-stat-pill ice" id="ac2_trc_${pairKey}">
            ${ps.totalTrades}<span style="opacity:.6;font-size:7px;"> tr</span>
          </span>
          <span class="ac-volatility" id="ac2_vol_${pairKey}">~${(pVolAtr*100).toFixed(2)}% σ</span>
        </div>

        <!-- Ligne 3 : État principal + live dot -->
        <div class="action-card-action" id="ac2_act_${pairKey}">
          ${dispLabel}
        </div>
        <!-- Prix courant -->
        <div class="action-card-price" id="ac2_px_${pairKey}">${priceStr}</div>

        <!-- Top agents + score consensus -->
        <div class="ac-agents-bar" id="ac2_agbar_${pairKey}">
          <span class="ac-agents-bar-label">Top</span>
          <span id="ac2_agdots_${pairKey}" style="display:flex;gap:3px;flex:1;overflow:hidden;"></span>
          <span id="ac2_agscore_${pairKey}" style="font-family:var(--font-mono);font-size:8px;font-weight:700;color:var(--pur);white-space:nowrap;">+0.00</span>
        </div>

        <!-- Suggestion bot (mode MANUEL uniquement) -->
        <div id="ac2_suggest_${pairKey}" style="display:none;"></div>

        <!-- v7.12 · SPARKLINE prix récent -->
        <div class="ac-sparkline">
          <canvas id="ac2_spark_${pairKey}"></canvas>
          <span class="ac-sparkline-tag">20P</span>
        </div>

        <!-- v7.12 · VOLUME 24H bar -->
        <div class="ac-volbar-wrap">
          <div class="ac-volbar-top">
            <span class="ac-volbar-lbl">Volume 24h</span>
            <span class="ac-volbar-val" id="ac2_volval_${pairKey}">—</span>
          </div>
          <div class="ac-volbar-track">
            <div class="ac-volbar-fill" id="ac2_volfill_${pairKey}" style="width:0%;"></div>
          </div>
        </div>

        <!-- v7.12 · RANGÉE D'INDICATEURS -->
        <div class="ac-xind-row">
          <div class="ac-xind">
            <span class="ac-xind-lbl">RSI 14</span>
            <span class="ac-xind-val" id="ac2_rsi_${pairKey}" style="color:var(--gold);">—</span>
          </div>
          <div class="ac-xind">
            <span class="ac-xind-lbl">Momentum</span>
            <span class="ac-xind-val" id="ac2_mom_${pairKey}" style="color:var(--ice);">—</span>
          </div>
          <div class="ac-xind">
            <span class="ac-xind-lbl">Régime</span>
            <span class="ac-xind-val" id="ac2_regmini_${pairKey}" style="color:var(--ice);font-size:8px;">—</span>
          </div>
          <div class="ac-xind">
            <span class="ac-xind-lbl">Streak</span>
            <span class="ac-xind-val" id="ac2_streak_${pairKey}" style="color:var(--t3);">—</span>
          </div>
        </div>

        <!-- Données : mise / timer / cycle / frais -->
        <div class="ac-pnl-block" id="ac2_pnl_${pairKey}">
          <!-- Mise engagée -->
          <div class="ac-pnl-row">
            <span class="ac-pnl-label">Mise</span>
            <span class="ac-pnl-stake" id="ac2_st_${pairKey}">$${ps.stake||'—'}</span>
          </div>
          <!-- Timer arc + countdown -->
          <div class="ac-pnl-row" id="ac2_timerrow_${pairKey}" style="gap:6px;margin:2px 0;">
            <svg width="22" height="22" viewBox="0 0 40 40" style="flex-shrink:0;transform:rotate(-90deg);">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="4"/>
              <circle cx="20" cy="20" r="16" fill="none" stroke-width="4"
                stroke-linecap="round" stroke-dasharray="100 100"
                id="ac2_arc_${pairKey}"
                style="transition:stroke-dasharray .9s linear,stroke .4s;"/>
            </svg>
            <div style="flex:1;min-width:0;overflow:hidden;">
              <div id="ac2_timelbl_${pairKey}" style="font-size:8px;color:var(--t3);line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Scan...</div>
              <div id="ac2_timer_${pairKey}" style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--ice);line-height:1.2;">—</div>
            </div>
            <!-- Cycle durée à droite -->
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:7px;color:var(--t3);margin-bottom:1px;">Cycle</div>
              <div style="display:flex;align-items:center;gap:2px;">
                <span id="ac2_freq_${pairKey}" style="font-family:var(--font-mono);font-size:9px;font-weight:600;color:${ps.userCycleSet?'var(--ice)':'var(--pur)'};">${fmtDur(ps.cycleMax)}</span>
                <span id="ac2_autoind_${pairKey}" style="font-size:8px;cursor:pointer;opacity:.7;" onclick="resetCycleToAuto('${pair}')" title="Remettre cycle en auto">${ps.userCycleSet?'🔒':'🤖'}</span>
              </div>
            </div>
          </div>
          <div class="ac-divider"></div>
          <!-- Frais + Net/trade -->
          <div class="ac-pnl-row">
            <span class="ac-pnl-label">Frais est.</span>
            <span class="ac-pnl-fee" id="ac2_fee_${pairKey}" style="color:var(--down);">—</span>
          </div>
          <div class="ac-pnl-row">
            <span class="ac-pnl-label">Net/trade</span>
            <span id="ac2_netpt_${pairKey}" style="font-size:9px;font-weight:600;color:var(--t3);">—</span>
          </div>
          <!-- Valeur live position (masqué si pas de position) -->
          <div class="ac-pnl-row" id="ac2_liverow_${pairKey}" style="display:none;">
            <span class="ac-pnl-label">Valeur</span>
            <span class="ac-pnl-val" id="ac2_val_${pairKey}">—</span>
          </div>
          <div class="ac-pnl-row" id="ac2_gprow_${pairKey}" style="display:none;">
            <span class="ac-pnl-label">G/P net</span>
            <span class="ac-pnl-gp" id="ac2_gp_${pairKey}">—</span>
          </div>
        </div>

        <!-- Mini sparkline -->
        <div class="ac-mini-chart">
          <canvas id="ac2_chart_${pairKey}" style="width:100%;height:34px;display:block;"></canvas>
        </div>

        <!-- P&L cumulatif total -->
        <div class="ac-cum-pnl ${ps.totalPnlUsd>0?'up':ps.totalPnlUsd<0?'down':''}" id="ac2_cumwrap_${pairKey}">
          <span class="ac-cum-lbl">P&L cumul.</span>
          <span class="ac-cum-val" id="ac2_cum_${pairKey}" style="color:${ps.totalPnlUsd>=0?'var(--up)':'var(--down)'};">
            ${ps.totalPnlUsd>=0?'+':''}${fmt$(ps.totalPnlUsd||0)}
          </span>
        </div>

        <!-- Barre LMSR interactive (probabilité prédictive) -->
        <div class="ac-lmsr-wrap">
          <div class="ac-lmsr-track" id="ac2_track_${pairKey}"
               style="cursor:ew-resize;touch-action:none;"
               onpointerdown="startThresholdDrag(event,'${pair}')">
            <div class="ac-lmsr-fill"        id="ac2_lbar_${pairKey}"  style="left:${pct}%"></div>
            <div class="ac-lmsr-center"></div>
            <div class="ac-lmsr-threshold-l" id="ac2_thr_l_${pairKey}" style="left:${(1-(ps.threshold||0.65))*100}%;"></div>
            <div class="ac-lmsr-threshold-r" id="ac2_thr_r_${pairKey}" style="left:${(ps.threshold||0.65)*100}%;"></div>
            <div class="ac-lmsr-zone"         id="ac2_zone_${pairKey}"  style="left:${(1-(ps.threshold||0.65))*100}%;width:${((ps.threshold||0.65)*2-1)*100}%;"></div>
          </div>
          <div class="ac-lmsr-labels">
            <span style="color:var(--down);font-size:7px;">S ${((1-(ps.threshold||0.65))*100).toFixed(0)}%</span>
            <span id="ac2_prob_${pairKey}" style="color:${probCol};font-size:9px;font-weight:700;">${pct>=50?'↑':'↓'}${pct.toFixed(0)}%</span>
            <span style="color:var(--up);font-size:7px;">${((ps.threshold||0.65)*100).toFixed(0)}% B</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:3px;align-items:center;">
            <span style="font-size:7px;color:var(--t3);">⟵ seuil déclench. ⟶</span>
            <span id="ac2_thrlbl_${pairKey}" style="font-size:8px;font-weight:600;color:var(--gold);">${((ps.threshold||0.65)*100).toFixed(0)}% · ${fmtDur(ps.cycleMax)}</span>
          </div>
          <!-- Barre de conviction -->
          <div style="margin-top:4px;height:3px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;">
            <div id="ac2_conv_${pairKey}" style="height:100%;width:${Math.min(100,Math.abs(pct-50)*4)}%;background:${probCol};border-radius:3px;transition:width .6s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px;">
            <span id="ac2_regime_${pairKey}" style="font-size:7px;color:var(--t3);">—</span>
            <span id="ac2_pnlsum_${pairKey}" style="font-size:7px;color:var(--t3);">—</span>
          </div>
        </div>`;
      wrapper.appendChild(el);
      setTimeout(()=>{try{ac2UpdateXInd(pair);}catch(e){}},100);

      // ── Bloc positions pour cette paire (sous la carte) ──
      const posBlock = document.createElement('div');
      posBlock.id = 'ac2_poslist_'+pairKey;
      posBlock.className = 'ac-pos-block';
      wrapper.appendChild(posBlock);
    } else {
      // Patch carte existante
      const _isMan = S.botAutoMode === false;
      const _wantClass = 'action-card '+dispAction + (_isMan ? ' manual-mode-dim' : '');
      if(el.className !== _wantClass) el.className = _wantClass;
      const actEl  = document.getElementById('ac2_act_'+pairKey);
      const probEl = document.getElementById('ac2_prob_'+pairKey);
      const pxEl   = document.getElementById('ac2_px_'+pairKey);
      const sigEl  = document.getElementById('ac2_sig_'+pairKey);
      const lbar   = document.getElementById('ac2_lbar_'+pairKey);
      if(actEl)  actEl.textContent  = dispLabel;
      if(probEl) { probEl.textContent = (pct>=50?'↑':'↓')+pct.toFixed(0)+'%'; probEl.style.color = probCol; }
      if(pxEl)   pxEl.textContent   = priceStr;
      if(lbar)   lbar.style.left    = pct+'%';

      // Patch new v4.0 elements: stats pills, 24h badge, agents bar, cum P&L
      const wrEl     = document.getElementById('ac2_wr_'+pairKey);
      const trcEl    = document.getElementById('ac2_trc_'+pairKey);
      const volEl    = document.getElementById('ac2_vol_'+pairKey);
      const p24El    = document.getElementById('ac2_pnl24_'+pairKey);
      const cumEl    = document.getElementById('ac2_cum_'+pairKey);
      const cumWrap  = document.getElementById('ac2_cumwrap_'+pairKey);
      const agDotsEl = document.getElementById('ac2_agdots_'+pairKey);
      const agScEl   = document.getElementById('ac2_agscore_'+pairKey);

      const pWin = ps.totalTrades > 0 ? Math.round(ps.winTrades/ps.totalTrades*100) : null;
      if(wrEl) {
        wrEl.innerHTML = (pWin!==null?pWin+'%':'—') + ' <span style="font-size:7px;opacity:.7;">WR</span>';
        wrEl.className = 'ac-stat-pill ' + (pWin>=60?'win':pWin!==null&&pWin<40?'loss':'neutral');
      }
      if(trcEl) trcEl.innerHTML = ps.totalTrades + ' <span style="font-size:7px;opacity:.7;">trades</span>';
      if(volEl) volEl.textContent = '~' + ((ps.atr||0)*100).toFixed(2) + '% σ';

      const p24 = ps.pnl24h || 0;
      if(p24El) {
        p24El.textContent = (p24>=0?'+':'') + p24.toFixed(2) + '%';
        p24El.style.background = p24>=0 ? 'rgba(0,232,122,.12)' : 'rgba(255,61,107,.12)';
        p24El.style.color      = p24>=0 ? 'var(--up)' : 'var(--down)';
      }

      if(cumEl) {
        cumEl.textContent = (ps.totalPnlUsd>=0?'+':'') + fmt$(ps.totalPnlUsd||0);
        cumEl.style.color = ps.totalPnlUsd>=0 ? 'var(--up)' : 'var(--down)';
      }
      if(cumWrap) {
        cumWrap.className = 'ac-cum-pnl ' + (ps.totalPnlUsd>0?'up':ps.totalPnlUsd<0?'down':'');
      }

      // ═══ v4.2 + v11quater — Bot suggestion + MANU enrichi ═══
      const sugEl = document.getElementById('ac2_suggest_'+pairKey);
      if(sugEl) {
        const isManMode = S.botAutoMode === false;
        const hasPos    = !!(manualPos || botPos);
        const activePos = S.openPositions.find(p => p.pair === pair);
        const isManPos  = activePos && activePos.auto === false;

        if(isManMode && hasPos && isManPos) {
          // ─── Position MANU ouverte : bloc enrichi TP/SL + boutons ───
          const p      = activePos;
          const dec    = cfg.dec >= 4 ? cfg.dec : 2;
          const price  = ps.price;

          // TP
          const tpPrice  = p.tp;
          const tpPct    = tpPrice ? (p.side==='long' ? (tpPrice-p.entryPrice)/p.entryPrice*100 : (p.entryPrice-tpPrice)/p.entryPrice*100) : null;
          const tpGain   = tpPrice ? Math.abs(p.stakeUsdt * (tpPct||0) / 100) : null;

          // SL
          const slPrice  = p.sl;
          const slPct    = slPrice ? (p.side==='long' ? (p.entryPrice-slPrice)/p.entryPrice*100 : (slPrice-p.entryPrice)/p.entryPrice*100) : null;
          const slLoss   = slPrice ? Math.abs(p.stakeUsdt * (slPct||0) / 100) : null;

          // Capital restant
          const capRestant = (S.tradingAccount || 0);

          const fmtP  = v => v != null ? (cfg.dec>=4 ? v.toFixed(cfg.dec) : '$'+Math.floor(v).toLocaleString()) : '—';
          const fmtPct= v => v != null ? (v>=0?'+':'')+v.toFixed(2)+'%' : '—';
          const fmtUsd= v => v != null ? (v>=0?'+':'-')+'$'+Math.abs(v).toFixed(2) : '—';

          sugEl.style.display = '';
          sugEl.innerHTML = `
            <div class="ac-manu-block">
              <div class="ac-manu-capital">
                <span class="lbl">Capital disponible</span>
                <span class="val">$${capRestant.toFixed(2)}<span class="sub">(${(capRestant/(S.portfolio||1)*100).toFixed(1)}% total)</span></span>
              </div>
              <div class="ac-tpsl-row">
                <span class="ac-tpsl-label tp">🎯 TP</span>
                <div class="ac-tpsl-formats">
                  <div class="ac-tpsl-cell tp" onclick="manuEditTp('${pair}')">
                    <span class="cell-lbl">Prix</span>
                    <span class="cell-val">${fmtP(tpPrice)}</span>
                  </div>
                  <div class="ac-tpsl-cell tp" onclick="manuEditTp('${pair}')">
                    <span class="cell-lbl">% écart</span>
                    <span class="cell-val">${fmtPct(tpPct)}</span>
                  </div>
                  <div class="ac-tpsl-cell tp" onclick="manuEditTp('${pair}')">
                    <span class="cell-lbl">$ gain</span>
                    <span class="cell-val">${tpGain != null ? '+$'+tpGain.toFixed(2) : '—'}</span>
                  </div>
                </div>
              </div>
              <div class="ac-tpsl-row">
                <span class="ac-tpsl-label sl">🛑 SL</span>
                <div class="ac-tpsl-formats">
                  <div class="ac-tpsl-cell sl" onclick="manuEditSl('${pair}')">
                    <span class="cell-lbl">Prix</span>
                    <span class="cell-val">${fmtP(slPrice)}</span>
                  </div>
                  <div class="ac-tpsl-cell sl" onclick="manuEditSl('${pair}')">
                    <span class="cell-lbl">% écart</span>
                    <span class="cell-val">${slPct != null ? '-'+slPct.toFixed(2)+'%' : '—'}</span>
                  </div>
                  <div class="ac-tpsl-cell sl" onclick="manuEditSl('${pair}')">
                    <span class="cell-lbl">$ perte</span>
                    <span class="cell-val">${slLoss != null ? '-$'+slLoss.toFixed(2) : '—'}</span>
                  </div>
                </div>
              </div>
              <div class="ac-tpsl-bot-hint">⚡ valeurs proposées par bot · cliquer pour modifier</div>
              <div class="ac-manu-actions">
                <button class="ac-manu-btn reinforce" onclick="manuReinforce('${pair}')">↑ Renforcer</button>
                <button class="ac-manu-btn invert"    onclick="manuInvert('${pair}')">↓ Inverser</button>
                <button class="ac-manu-btn close-pos" onclick="manuClose('${pair}')">✕ Fermer</button>
              </div>
              <div class="ac-manu-reset" onclick="manuResetTpSl('${pair}')">↻ Réinitialiser propositions bot</div>
            </div>`;

        } else if(isManMode && !hasPos) {
          // Pas de position : suggestion bot habituelle
          const prob2    = lmsrP(ps);
          const wouldAct = prob2 > 0.60 ? 'buy' : prob2 < 0.40 ? 'sell' : 'hold';
          const sugStake = Math.max(10, Math.floor((ps.stake||20)));
          const priceStr2 = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
          const convPct  = Math.round(Math.abs(prob2-0.5)*200);
          if(wouldAct === 'hold') {
            sugEl.style.display = '';
            sugEl.innerHTML = `
              <div class="ac-suggest-bar" style="background:linear-gradient(90deg,rgba(245,200,66,.12) 0%,rgba(56,212,245,.04) 100%);border-color:rgba(245,200,66,.25);">
                <span class="ac-suggest-text" style="color:var(--gold);">💡 Bot suggère <strong>HOLD</strong> · LMSR ${(prob2*100).toFixed(0)}% (attente)</span>
                <button class="ac-suggest-apply hold" disabled style="cursor:default;opacity:.6;">—</button>
              </div>`;
          } else {
            const sideLbl = wouldAct==='buy'?'LONG':'SHORT';
            sugEl.style.display = '';
            sugEl.innerHTML = `
              <div class="ac-suggest-bar">
                <span class="ac-suggest-text">💡 Bot suggère <strong>${sideLbl}</strong> @ ${priceStr2} · mise $${sugStake} · conv. ${convPct}%</span>
                <button class="ac-suggest-apply ${wouldAct}" onclick="applyBotSuggestion('${pair}','${wouldAct==='buy'?'long':'short'}',${sugStake})">✓ Appliquer</button>
              </div>`;
          }
        } else if(isManMode && hasPos && botPos && !manualPos) {
          sugEl.style.display = '';
          sugEl.innerHTML = `<div class="ac-man-mode-hint">🎛️ Position bot active · vous seul pouvez fermer (bouton ✕)</div>`;
        } else {
          sugEl.style.display = 'none';
          sugEl.innerHTML = '';
        }
      }

      // Top 3 agents with highest |score*fitness| contribution
      if(agDotsEl && agScEl) {
        const ranked = [...S.agents].filter(a=>!a.isBot&&!a.isMeta)
          .sort((a,b) => Math.abs((b.score||0)*(b.fitness||1)) - Math.abs((a.score||0)*(a.fitness||1)))
          .slice(0,3);
        const avgScore = ranked.reduce((s,a)=>s+(a.score||0),0) / Math.max(1,ranked.length);
        agDotsEl.innerHTML = ranked.map(a => {
          const sc = a.score||0;
          const col = sc>0.1?'var(--up)':sc<-0.1?'var(--down)':'var(--t3)';
          const bg  = sc>0.1?'rgba(0,232,122,.15)':sc<-0.1?'rgba(255,61,107,.15)':'rgba(136,153,187,.1)';
          return `<span class="ac-agent-dot" style="background:${bg};color:${col};border-color:${col};" title="${a.name} · ${(sc>=0?'+':'')+sc.toFixed(2)}">${a.emoji}</span>`;
        }).join('');
        agScEl.textContent = (avgScore>=0?'+':'') + avgScore.toFixed(2);
        agScEl.style.color = avgScore>0.1?'var(--up)':avgScore<-0.1?'var(--down)':'var(--pur)';
      }

      // ── Live countdown timer — based on ps.lastAction (last BOT decision) ──
      const timerEl  = document.getElementById('ac2_timer_'+pairKey);
      const timeLbl  = document.getElementById('ac2_timelbl_'+pairKey);
      const arcEl    = document.getElementById('ac2_arc_'+pairKey);

      if(timerEl && timeLbl) {
        const ct       = Math.max(1, ps.cycleTimer || 1);
        const maxT     = ps.cycleMax || 30;
        const fracLeft = ct / maxT;
        const pos      = S.openPositions.find(p => p.pair === pair);
        const isManual = pos ? pos.auto !== true : false;
        const lastAct  = ps.lastAction || 'hold';

        // Manual position — bot is locked out
        if(isManual) {
          timeLbl.textContent = '🔒 Manuel';
          timeLbl.style.color = 'var(--gold)';
          const holdSec = ps.holdStartTs ? Math.floor((Date.now()-ps.holdStartTs)/1000) : 0;
          timerEl.textContent = fmtDur(holdSec) + ' · bot pause';
          timerEl.style.color = 'var(--gold)';
          if(arcEl) {
            const CIRC = 2*Math.PI*16  // v7.12 · r=16;
            arcEl.style.strokeDasharray = `${(fracLeft*CIRC).toFixed(1)} ${CIRC.toFixed(1)}`;
            arcEl.style.stroke = '#f5c842';
          }
          // Frequency label sync
          const freqEl2m = document.getElementById('ac2_freq_'+pairKey);
          if(freqEl2m) freqEl2m.textContent = fmtDur(ps.cycleMax);
        } else {
          const dispState = pos
            ? (pos.side === 'long' ? 'long' : 'short')
            : lastAct;
          const justFired = ct >= maxT - 1;

        if(dispState === 'long' || dispState === 'buy') {
          // v7.11 · Distinction claire : "LONG actif" si position ouverte,
          // "Signal ↑ LONG" si c'est une prédiction (pas encore de position)
          timeLbl.textContent = pos ? '🟢 LONG actif' : '↗ Signal LONG';
          timeLbl.style.color = 'var(--up)';
          timerEl.style.color = justFired ? 'var(--up)' : ct<=5?'var(--down)':ct<=Math.ceil(maxT*0.2)?'var(--gold)':'var(--up)';
        } else if(dispState === 'short' || dispState === 'sell') {
          timeLbl.textContent = pos ? '🔴 SHORT actif' : '↘ Signal SHORT';
          timeLbl.style.color = 'var(--down)';
          timerEl.style.color = justFired ? 'var(--down)' : ct<=5?'var(--down)':ct<=Math.ceil(maxT*0.2)?'var(--gold)':'var(--ice)';
        } else {
          // HOLD — affiche l'âge du hold + mention "prochain scan"
          const holdSec = ps.holdStartTs
            ? Math.floor((Date.now() - ps.holdStartTs) / 1000) : 0;
          timeLbl.textContent = holdSec > 0 ? '⏸ Hold ' + fmtDur(holdSec) : '🔍 Scan...';
          timeLbl.style.color = 'var(--gold)';
          timerEl.style.color = 'var(--gold)';
        }

        // Countdown text — show "⚡" flash on just-fired
        timerEl.textContent = justFired
          ? '⚡ ' + fmtCountdown(ct)
          : fmtCountdown(ct);

        // ── Cycle progress arc update ──
        if(arcEl) {
          const CIRC = 2 * Math.PI * 16;  // v7.12 · r=16
          const dash = fracLeft * CIRC;
          const col  = dispState==='long'||dispState==='buy' ? '#00e87a'
                     : dispState==='short'||dispState==='sell' ? '#ff3d6b'
                     : '#f5c842';
          arcEl.style.strokeDasharray  = `${dash.toFixed(1)} ${CIRC.toFixed(1)}`;
          arcEl.style.stroke           = col;
        }
        } // end else (non-manual)
      }

      // Frequency label sync
      const freqEl2 = document.getElementById('ac2_freq_'+pairKey);
      if(freqEl2) freqEl2.textContent = fmtDur(ps.cycleMax);

      // Threshold markers
      const thrL    = document.getElementById('ac2_thr_l_'+pairKey);
      const thrR    = document.getElementById('ac2_thr_r_'+pairKey);
      const zone    = document.getElementById('ac2_zone_'+pairKey);
      const thrLbl  = document.getElementById('ac2_thrlbl_'+pairKey);
      const thr     = ps.threshold || 0.65;
      const thrPct  = thr * 100;
      const lthrPct = (1 - thr) * 100;
      if(thrL)   thrL.style.left  = lthrPct+'%';
      if(thrR)   thrR.style.left  = thrPct+'%';
      if(zone)   { zone.style.left = lthrPct+'%'; zone.style.width = (thrPct - lthrPct)+'%'; }
      if(thrLbl) thrLbl.textContent = thrPct.toFixed(0)+'% · '+fmtDur(ps.cycleMax);
      // Update labels
      if(probEl) {
        const lLbl = probEl.parentNode?.querySelector('span:first-child');
        const rLbl = probEl.parentNode?.querySelector('span:last-child');
        if(lLbl) lLbl.textContent = 'S '+lthrPct.toFixed(0)+'%';
        if(rLbl) rLbl.textContent = thrPct.toFixed(0)+'% B';
      }

      // Conviction bar update
      const convBar = document.getElementById('ac2_conv_'+pairKey);
      const convPct = Math.min(100, Math.abs(pct-50)*4);
      if(convBar) { convBar.style.width = convPct+'%'; convBar.style.background = probCol; }

      // ── Market regime indicator ──────────────────────────────
      const regimeEl  = document.getElementById('ac2_regime_'+pairKey);
      const pnlSumEl  = document.getElementById('ac2_pnlsum_'+pairKey);
      if(regimeEl) {
        const candles = ps.candles || [];
        if(candles.length >= 10) {
          const closes  = candles.map(c=>c.c);
          const recent  = closes.slice(-10);
          const mn = Math.min(...recent), mx = Math.max(...recent);
          const rangePct = (mx - mn) / mn * 100;
          const ma5  = recent.slice(-5).reduce((s,v)=>s+v,0)/5;
          const ma10 = recent.reduce((s,v)=>s+v,0)/10;
          const trending = Math.abs(ma5-ma10)/ma10 > 0.003;  // >0.3% divergence
          const volatile = rangePct > 3.0;
          if(trending && ma5 > ma10) {
            regimeEl.textContent = '📈 Tendance haussière';
            regimeEl.style.color = 'var(--up)';
          } else if(trending && ma5 < ma10) {
            regimeEl.textContent = '📉 Tendance baissière';
            regimeEl.style.color = 'var(--down)';
          } else if(volatile) {
            regimeEl.textContent = '⚡ Volatil';
            regimeEl.style.color = '#ff9500';
          } else {
            regimeEl.textContent = '↔ Consolidation';
            regimeEl.style.color = 'var(--gold)';
          }
        } else {
          regimeEl.textContent = '⏳ Données…';
          regimeEl.style.color = 'var(--t3)';
        }
      }
      if(pnlSumEl) {
        const pnlUsd = ps.totalPnlUsd || 0;
        const wr     = ps.totalTrades > 0 ? Math.round(ps.winTrades/ps.totalTrades*100) : null;
        pnlSumEl.textContent = (pnlUsd>=0?'+':'')+pnlUsd.toFixed(1)+'$ '+(wr!==null?wr+'%win':'');
        pnlSumEl.style.color = pnlUsd >= 0 ? 'rgba(0,232,122,.7)' : 'rgba(255,61,107,.7)';
      }

      // ── Live stake + P&L ──
      const stEl      = document.getElementById('ac2_st_'+pairKey);
      const valEl     = document.getElementById('ac2_val_'+pairKey);
      const gpEl      = document.getElementById('ac2_gp_'+pairKey);
      const liveRow   = document.getElementById('ac2_liverow_'+pairKey);
      const gpRow     = document.getElementById('ac2_gprow_'+pairKey);
      const pos       = S.openPositions.find(p=>p.pair===pair);

      // ── Stake display with leverage ──
      if(stEl) {
        const lev     = ps.pairLeverage || 1;
        const baseStk = ps.stake || 0;
        const effStk  = baseStk * lev;
        if(lev > 1) {
          stEl.innerHTML = `$${baseStk}<span style="color:var(--gold);font-size:9px;"> ×${lev}</span><span style="color:var(--up);font-size:9px;font-weight:700;"> =$${effStk}</span>`;
        } else {
          stEl.textContent = '$'+baseStk;
        }
      }

      // ── Frais estimés + net par trade ──
      const feeEl   = document.getElementById('ac2_fee_'+pairKey);
      const netPtEl = document.getElementById('ac2_netpt_'+pairKey);
      if(feeEl || netPtEl) {
        const fc    = S.feeConfig;
        const reg   = S.taxConfig.regions[S.taxConfig.region];
        // v11quinquies · BUG FIX : utiliser la position réelle si ouverte, sinon le stake configuré
        const _activePos = S.openPositions ? S.openPositions.find(p => p.pair === pair) : null;
        const stake = _activePos ? (_activePos.stakeUsdt || ps.stake || 0) : (ps.stake||0) * (ps.pairLeverage||1);
        if(stake > 0) {
          const roundTripFee = stake * (fc.takerRate * 2 + fc.slippage * 2);
          const fundFee      = stake * fc.fundingRate;
          const totalFeeEst  = roundTripFee + fundFee;
          if(feeEl) feeEl.textContent = '−$'+totalFeeEst.toFixed(2);
          // Expected net: conviction-based expected move − fees − tax provision
          const conviction  = Math.abs(lmsrP(ps) - 0.5) * 2;
          const taxPct      = (reg?.inclusion||0)*(reg?.rate||0);
          const expectedMove= stake * conviction * 0.015;  // 1.5% per unit conviction
          const taxProv     = expectedMove > totalFeeEst ? (expectedMove-totalFeeEst)*taxPct : 0;
          const netExpect   = expectedMove - totalFeeEst - taxProv;
          if(netPtEl) {
            netPtEl.textContent = (netExpect>=0?'+':'')+'$'+netExpect.toFixed(2);
            netPtEl.style.color = netExpect >= 0 ? 'var(--up)' : 'var(--down)';
          }
        } else {
          if(feeEl)   feeEl.textContent   = 'En attente…';
          if(netPtEl) netPtEl.textContent = '—';
        }
      }

      if(pos) {
        // Position ouverte — calcul P&L live brut
        const pnlPct = pos.side==='long'
          ? ((ps.price - pos.entryPrice) / pos.entryPrice) * 100
          : ((pos.entryPrice - ps.price) / pos.entryPrice) * 100;
        const pnlUsdGross = pos.stakeUsdt * (pnlPct/100);

        // Frais déjà courus (aller) + frais sortie estimés
        const fc         = S.feeConfig;
        const reg        = S.taxConfig.regions[S.taxConfig.region];
        const entryFee   = pos.stakeUsdt * (fc.takerRate + fc.slippage);
        const exitFee    = pos.stakeUsdt * (fc.takerRate + fc.slippage);
        const fundCost   = pos.stakeUsdt * fc.fundingRate;
        const totalFee   = entryFee + exitFee + fundCost;
        // Provision fiscale sur gain brut - frais
        const netGain    = pnlUsdGross - totalFee;
        const taxProv    = netGain > 0 ? netGain * reg.inclusion * reg.rate : 0;
        const pnlUsdNet  = pnlUsdGross - totalFee - taxProv;

        const curVal     = pos.stakeUsdt + pnlUsdGross;
        const up         = pnlUsdNet >= 0;
        const col        = up ? 'var(--up)' : 'var(--down)';

        if(liveRow) liveRow.style.display = '';
        if(gpRow)   gpRow.style.display   = '';
        if(valEl) {
          valEl.textContent = '$'+curVal.toFixed(1);
          valEl.style.color = pnlUsdGross>=0 ? 'var(--up)' : 'var(--down)';
        }
        if(gpEl) {
          // Show: brut → net après frais+tax
          const brutStr = (pnlUsdGross>=0?'+':'')+pnlUsdGross.toFixed(1)+'$';
          const netStr  = (pnlUsdNet>=0?'+':'')+pnlUsdNet.toFixed(1)+'$';
          gpEl.innerHTML = `<span style="color:${pnlUsdGross>=0?'var(--up)':'var(--down)'};">${brutStr}</span>`
            + `<span style="color:var(--t3);font-size:8px;"> → net </span>`
            + `<span style="color:${col};">${netStr}</span>`;
          gpEl.style.color = col;
        }
        // Update pos object
        pos.pnl        = pnlPct;
        pos.pnlUsdt    = pnlUsdGross;
        pos.currentVal = curVal;
      } else {
        if(liveRow) liveRow.style.display = 'none';
        if(gpRow)   gpRow.style.display   = 'none';
      }

      if(sigEl) {
        const avgScore = S.agents.reduce((s,a)=>s+a.score,0)/S.agents.length;
        sigEl.textContent = (avgScore>=0?'+':'')+avgScore.toFixed(2);
        sigEl.className = 'pill '+(avgScore>.05?'pill-up':avgScore<-.05?'pill-down':'pill-gold');
      }
    }

    // ── Positions inline sous la carte — toujours rerendu ──
    renderInlinePosForPair(pair, pairKey, cfg, ps);
  });
}

// Affiche les positions ouvertes de la paire sous sa carte d'action
function renderInlinePosForPair(pair, pairKey, cfg, ps) {
  const wrapper = document.getElementById('acwrap_'+pairKey);
  const block   = document.getElementById('ac2_poslist_'+pairKey);
  if(!block || !wrapper) return;

  const positions = S.openPositions.filter(p=>p.pair===pair);

  // Update PnL live for all positions of this pair — sur l'exposition totale
  positions.forEach(pos => {
    if(!ps) return;
    const exp     = pos.totalExposure || pos.stakeUsdt;
    pos.pnl       = pos.side==='long'
      ? ((ps.price - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - ps.price) / pos.entryPrice) * 100;
    pos.pnlUsdt   = exp * (pos.pnl / 100);
    pos.currentVal= exp + pos.pnlUsdt;
  });

  if(positions.length === 0) {
    wrapper.classList.remove('has-pos');
    block.innerHTML = '';
    return;
  }

  wrapper.classList.add('has-pos');

  block.innerHTML = positions.map(pos => {
    const up      = pos.pnl >= 0;
    const pnlCls  = up ? 'up' : 'down';
    const pnlStr  = (up?'+':'')+pos.pnl.toFixed(2)+'%';
    const usdtStr = (up?'+':'−')+'$'+Math.abs(pos.pnlUsdt).toFixed(1);
    const curStr  = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
    const entStr  = cfg.dec>=4 ? pos.entryPrice.toFixed(cfg.dec) : '$'+Math.floor(pos.entryPrice).toLocaleString();
    const barW    = Math.min(100, Math.abs(pos.pnl) * 8);
    const durStr  = pos.entryTs ? fmtSince(pos.entryTs) : pos.entryTime||'—';
    const ctClamped = Math.max(1, ps.cycleTimer || 1);
    const justFiredPos = ctClamped >= (ps.cycleMax||30) - 1;
    const nextStr = justFiredPos ? '⚡ ' + fmtCountdown(ctClamped) : fmtCountdown(ctClamped);
    const nextCol = justFiredPos ? 'var(--up)' : ctClamped<=5 ? 'var(--down)' : ctClamped<=Math.ceil((ps.cycleMax||30)*0.2) ? 'var(--gold)' : 'var(--ice)';
    const isManual = pos.auto !== true;
    const sideLabel = pos.side==='long' ? '↑ LONG' : '↓ SHORT';
    const sideCls   = pos.side==='long' ? 'long' : 'short';

    // TP/SL distance from current price
    const tpDistPct = pos.tp ? (pos.side==='long'
      ? ((pos.tp - ps.price) / ps.price * 100)
      : ((ps.price - pos.tp) / ps.price * 100)) : null;
    const slDistPct = pos.sl ? (pos.side==='long'
      ? ((ps.price - pos.sl) / ps.price * 100)
      : ((pos.sl - ps.price) / ps.price * 100)) : null;

    const manualBadge = isManual
      ? `<span style="font-size:8px;font-weight:600;background:rgba(245,200,66,.15);color:var(--gold);border:1px solid rgba(245,200,66,.3);padding:2px 7px;border-radius:5px;margin-left:4px;">🔒 Manuel</span>`
      : `<span style="font-size:8px;font-weight:600;background:rgba(56,212,245,.1);color:var(--ice);border:1px solid rgba(56,212,245,.25);padding:2px 7px;border-radius:5px;margin-left:4px;">🤖 Bot IA</span>`;

    const botStatus = isManual
      ? `<span style="font-size:7px;color:var(--gold);">Bot en pause · surveille</span>`
      : `<div style="display:flex;gap:5px;align-items:center;">
           ${tpDistPct!==null ? `<span style="font-size:9px;font-weight:600;color:var(--up);">🎯 ${tpDistPct>=0?'+':''}${tpDistPct.toFixed(2)}%</span>` : ''}
           ${slDistPct!==null ? `<span style="font-size:9px;font-weight:600;color:var(--down);">🛑 −${Math.abs(slDistPct).toFixed(2)}%</span>` : ''}
           <span style="font-size:7px;color:var(--t3);">${fmtDur(pos._holdCycles||0)} cycles</span>
         </div>`;

    const tpLine = pos.tp ? `<span style="font-size:7px;color:var(--up);margin-left:4px;">🎯${cfg.dec>=4?pos.tp.toFixed(cfg.dec):'$'+Math.floor(pos.tp).toLocaleString()}</span>` : '';
    const slLine = pos.sl ? `<span style="font-size:7px;color:var(--down);margin-left:4px;">🛑${cfg.dec>=4?pos.sl.toFixed(cfg.dec):'$'+Math.floor(pos.sl).toLocaleString()}</span>` : '';

    // Bot positions: close button visible but shows warning; manual: full edit
    const editBtn = isManual
      ? `<button onclick="openPosEdit('${pos.id}')" style="background:rgba(245,200,66,.1);color:var(--gold);border:1px solid rgba(245,200,66,.25);border-radius:6px;padding:3px 8px;font-size:9px;cursor:pointer;margin-left:4px;">✏️</button>`
      : `<button onclick="if(confirm('Forcer la clôture du bot sur ${pair}?'))closePosition('${pos.id}',false)" style="background:rgba(56,212,245,.07);color:var(--ice);border:1px solid rgba(56,212,245,.2);border-radius:6px;padding:3px 7px;font-size:8px;cursor:pointer;margin-left:3px;">⏹</button>`;
    // v16 · #25 Bouton Pourquoi ?
    const whyBtn = `<button onclick="openWhyModal('${pos.id}')" title="Pourquoi cette position ?" style="background:rgba(167,139,250,.1);color:var(--pur);border:1px solid rgba(167,139,250,.3);border-radius:6px;padding:3px 7px;font-size:9px;cursor:pointer;margin-left:3px;font-weight:700;">?</button>`;
    return `
    <div class="ac-pos-item${isManual?' ac-pos-manual':''}">
      <div class="ac-pos-row1">
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
          <span class="ac-pos-side ${sideCls}">${sideLabel}</span>
          <span class="ac-pos-stake">${pos.levBorrowed > 0 ? `<span style="font-size:11px;font-weight:800;color:var(--gold);">$${pos.totalExposure||pos.stakeUsdt}</span> <span style="font-size:8px;color:var(--t3);">($${pos.stakeUsdt}+$${pos.levBorrowed} lev)</span>` : `<span style="font-size:12px;font-weight:700;color:var(--gold);">$${pos.stakeUsdt}</span>`}</span>
          ${manualBadge}
          ${editBtn}
          ${whyBtn}
        </div>
        <button class="ac-pos-close" onclick="closePosition('${pos.id}')">✕</button>
      </div>
      ${(tpLine||slLine) ? `<div style="display:flex;gap:2px;margin-top:3px;flex-wrap:wrap;">${tpLine}${slLine}</div>` : ''}
      <div class="ac-pos-row2">
        <span style="font-size:10px;color:var(--t2);font-family:var(--font-mono);">${entStr}<span style="color:var(--t3);margin:0 3px;">→</span>${curStr}</span>
        <div style="display:flex;gap:5px;align-items:center;">
          <span class="ac-pos-pnl-pct ${pnlCls}">${pnlStr}</span>
          <span class="ac-pos-usd ${pnlCls}">${usdtStr}</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
        <span style="font-size:9px;color:var(--t3);">⏱ <span style="color:var(--t2);font-family:var(--font-mono);">${durStr}</span></span>
        ${botStatus}
      </div>
      <div class="ac-pos-bar">
        <div class="ac-pos-bar-fill" style="width:${barW}%;background:${up?'var(--up)':'var(--down)'};"></div>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// OPEN POSITIONS SUMMARY — Home page (v3.4)
// ============================================================
function renderOpenPosSummary() {
  const header = document.getElementById('openPosSummaryHeader');
  const cards  = document.getElementById('openPosSummaryCards');
  if(!header || !cards) return;

  const positions = S.openPositions;
  if(positions.length === 0) {
    header.style.display = 'none';
    cards.innerHTML = '';
    return;
  }

  header.style.display = '';
  const countEl = document.getElementById('openPosCount');
  if(countEl) countEl.textContent = positions.length;
  // Count badge colored by overall health
  const totalUnrPnl = positions.reduce((s,p) => {
    const ps2 = S.pairStates[p.pair];
    if(!ps2) return s;
    const exp2 = p.totalExposure || p.stakeUsdt;
    const pct2 = p.side==='long' ? ((ps2.price - p.entryPrice)/p.entryPrice*100) : ((p.entryPrice - ps2.price)/p.entryPrice*100);
    return s + (exp2 * pct2/100);
  }, 0);
  if(countEl) {
    countEl.textContent = positions.length + ' · ' + (totalUnrPnl>=0?'+':'−') + '$' + Math.abs(totalUnrPnl).toFixed(1);
    countEl.className = 'pill ' + (totalUnrPnl>=0?'pill-up':'pill-down');
  }
  // Total exposure + leverage
  const totalExp = positions.reduce((s,p)=>s+(p.totalExposure||p.stakeUsdt), 0);
  const totalLev = positions.reduce((s,p)=>s+(p.levBorrowed||0), 0);
  const expEl = document.getElementById('openPosExposure');
  if(expEl) {
    expEl.textContent = totalLev > 0 ? `$${totalExp} exposé · ⚡$${totalLev} lev` : `$${totalExp} exposé`;
  }

  cards.innerHTML = positions.map(pos => {
    const ps      = S.pairStates[pos.pair];
    const cfg     = PAIRS[pos.pair];
    if(!ps || !cfg) return '';

    const exp     = pos.totalExposure || pos.stakeUsdt;
    pos.pnl       = pos.side === 'long'
      ? ((ps.price - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - ps.price) / pos.entryPrice) * 100;
    pos.pnlUsdt   = exp * (pos.pnl / 100);
    pos.currentVal= exp + pos.pnlUsdt;
    // Track peak P&L for the whole position lifetime
    if(pos._peakPnl == null || pos.pnl > pos._peakPnl) pos._peakPnl = pos.pnl;

    const up       = pos.pnl >= 0;
    const pnlStr   = (up?'+':'')+pos.pnl.toFixed(2)+'%';
    const usdStr   = (up?'+':'−')+'$'+Math.abs(pos.pnlUsdt).toFixed(1);
    const col      = up ? 'var(--up)' : 'var(--down)';
    const isManual = pos.auto !== true;
    const sideCol  = pos.side==='long' ? 'var(--up)' : 'var(--down)';
    const sideLbl  = pos.side==='long' ? '↑ LONG' : '↓ SHORT';
    const fmtP     = (p) => cfg.dec>=4 ? p.toFixed(cfg.dec) : '$'+Math.floor(p).toLocaleString();
    const ctDown   = ps.cycleTimer || 0;
    const nextEv   = ctDown <= 5 ? `⚡ ${fmtCountdown(ctDown)}` : `⏱ ${fmtCountdown(ctDown)}`;
    const levStr   = pos.levBorrowed > 0
      ? ` <span style="color:var(--gold);font-size:9px;">+$${pos.levBorrowed} lev = <strong>$${exp}</strong></span>` : '';
    const cycleMode = ps.userCycleSet ? '🔒 '+fmtDur(ps.cycleMax) : '🤖 '+fmtDur(ps.cycleMax);
    const tpInfo   = pos.tp ? ` · 🎯${fmtP(pos.tp)}` : '';
    const slInfo   = pos.sl ? ` · 🛑${fmtP(pos.sl)}` : '';

    // TP/SL progress bar
    const tpPct = pos.tp && pos.side==='long' ? Math.min(100, Math.max(0, (ps.price - pos.entryPrice)/(pos.tp - pos.entryPrice)*100)) :
                  pos.tp && pos.side==='short' ? Math.min(100, Math.max(0, (pos.entryPrice - ps.price)/(pos.entryPrice - pos.tp)*100)) : -1;
    const slDist = pos.sl ? Math.abs(ps.price - pos.sl) / pos.entryPrice * 100 : null;
    const tpBar  = tpPct >= 0 ? `
      <div style="margin:5px 0 2px;">
        <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--t3);margin-bottom:2px;">
          <span>Entrée</span><span style="color:var(--up);">🎯 TP ${tpPct.toFixed(0)}%</span>
          ${slDist ? `<span style="color:var(--down);">🛑 ${slDist.toFixed(2)}% risk</span>` : ''}
        </div>
        <div style="height:4px;background:var(--s3);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${tpPct}%;background:${up?'var(--up)':'var(--down)'};border-radius:4px;transition:width .5s;"></div>
        </div>
      </div>` : '';
    // Duration — time held
    const heldMs = pos.openedAt ? (Date.now() - pos.openedAt) : 0;
    const heldMin = Math.floor(heldMs/60000);
    const heldStr = heldMin < 60 ? heldMin+'m' : Math.floor(heldMin/60)+'h'+(heldMin%60)+'m';
    // Entry marker position on TP bar (0% since entry is the start)
    const pairColor = cfg.color;
    return `
    <div class="open-pos-summary${isManual?' manual':''} ${up?'':'loss'}">
      <div class="ops-pulse-dot"></div>

      <!-- Top row: pair + badges + PnL -->
      <div class="ops-top-row">
        <div class="ops-pair-wrap">
          <div class="ops-pair" style="color:${pairColor};">${pos.pair}</div>
          <div class="ops-pair-sub">
            <span class="ops-badge" style="background:${pos.side==='long'?'rgba(0,232,122,.14)':'rgba(255,61,107,.14)'};color:${sideCol};">${sideLbl}</span>
            <span class="ops-mode-badge${isManual?' manual':''}">${isManual?'🔒 MANUEL':'🤖 BOT IA'}</span>
            ${heldMin>0?`<span style="font-size:8px;color:var(--t3);">⏱ ${heldStr}</span>`:''}
            ${pos.conviction!=null?`<span style="font-size:8px;color:var(--pur);">◆ Conv. ${(pos.conviction*100).toFixed(0)}%</span>`:''}
          </div>
        </div>
        <div class="ops-pnl-wrap">
          <div class="ops-pnl" style="color:${col};">${pnlStr}</div>
          <div class="ops-usdt" style="color:${col};">${usdStr}</div>
          <div style="font-size:8px;color:var(--t3);margin-top:2px;">Peak: ${pos._peakPnl!=null?(pos._peakPnl>=0?'+':'')+pos._peakPnl.toFixed(2)+'%':'—'}</div>
        </div>
      </div>

      <!-- Price journey -->
      <div class="ops-price-row">
        <div class="ops-price-col">
          <span class="ops-price-lbl">Entrée</span>
          <span class="ops-price-val">${fmtP(pos.entryPrice)}</span>
        </div>
        <div class="ops-price-col" style="align-items:center;text-align:center;">
          <span class="ops-price-lbl" style="color:${col};">${up?'↗':'↘'} Live</span>
          <span class="ops-price-val" style="color:${col};font-size:12px;">${fmtP(ps.price)}</span>
        </div>
        <div class="ops-price-col" style="align-items:flex-end;text-align:right;">
          <span class="ops-price-lbl">${pos.tp?'🎯 TP':pos.sl?'🛑 SL':'Cible'}</span>
          <span class="ops-price-val" style="color:${pos.tp?'var(--up)':pos.sl?'var(--down)':'var(--t3)'};">${pos.tp?fmtP(pos.tp):pos.sl?fmtP(pos.sl):'—'}</span>
        </div>
      </div>

      <!-- Stake + leverage -->
      <div class="ops-stake-row">
        <div>
          <div class="ops-stake-label">Mise · Exposition</div>
          <div>
            <span class="ops-stake-val">$${pos.stakeUsdt}</span>
            ${pos.levBorrowed>0?`<span class="ops-lev-chip">⚡ +$${pos.levBorrowed} lev</span>`:''}
          </div>
        </div>
        ${pos.levBorrowed>0?`<div style="text-align:right;">
          <div style="font-size:8px;color:var(--t3);">Total exposé</div>
          <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--gold);">$${exp}</div>
        </div>`:`<div style="text-align:right;">
          <div style="font-size:8px;color:var(--t3);">Valeur</div>
          <div style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:${col};">$${pos.currentVal.toFixed(1)}</div>
        </div>`}
      </div>

      ${(() => {
        // Risk / Reward calculation
        if(pos.tp && pos.sl) {
          const rewardPct = pos.side==='long' ? (pos.tp - pos.entryPrice)/pos.entryPrice*100 : (pos.entryPrice - pos.tp)/pos.entryPrice*100;
          const riskPct   = pos.side==='long' ? (pos.entryPrice - pos.sl)/pos.entryPrice*100 : (pos.sl - pos.entryPrice)/pos.entryPrice*100;
          const rr = Math.abs(rewardPct / Math.max(0.01, riskPct));
          return `<div class="ops-rr-row">
            <div class="ops-rr-item">
              <span class="ops-rr-lbl">🎯 Gain cible</span>
              <span class="ops-rr-val" style="color:var(--up);">+${rewardPct.toFixed(2)}% ($${(exp*rewardPct/100).toFixed(1)})</span>
            </div>
            <div class="ops-rr-item" style="align-items:center;text-align:center;">
              <span class="ops-rr-lbl">R:R</span>
              <span class="ops-rr-val" style="color:${rr>=2?'var(--up)':rr>=1?'var(--gold)':'var(--down)'};">1:${rr.toFixed(1)}</span>
            </div>
            <div class="ops-rr-item" style="align-items:flex-end;text-align:right;">
              <span class="ops-rr-lbl">🛑 Risque</span>
              <span class="ops-rr-val" style="color:var(--down);">−${riskPct.toFixed(2)}% (−$${(exp*riskPct/100).toFixed(1)})</span>
            </div>
          </div>`;
        }
        return '';
      })()}

      ${pos._openAgents && pos._openAgents.length > 0 ? `
      <!-- Agents reasoning (why this position was opened) -->
      <div class="ops-reasoning">
        <div class="ops-reasoning-title">
          <span>◆</span> <span>${pos._openReason || 'Consensus agents'}</span>
        </div>
        <div class="ops-reasoning-agents">
          ${pos._openAgents.slice(0,5).map(a => `<span class="ops-reasoning-agent">${a.emoji} ${a.name} ${(a.score>=0?'+':'')+a.score.toFixed(2)}</span>`).join('')}
        </div>
      </div>` : ''}

      ${tpPct >= 0 ? `
      <!-- TP/SL progress -->
      <div class="ops-tpsl-row">
        <div class="ops-tpsl-labels">
          <span>Entrée</span>
          <span style="text-align:center;color:${up?'var(--up)':'var(--down)'};">Progression ${tpPct.toFixed(0)}% vers TP</span>
          <span style="color:var(--up);">🎯 TP</span>
        </div>
        <div class="ops-tpsl-bar">
          <div class="ops-tpsl-entry-marker"></div>
          <div class="ops-tpsl-fill" style="width:${tpPct}%;background:${up?'var(--up)':'var(--down)'};"></div>
        </div>
        ${slDist ? `<div style="font-size:8px;color:var(--t3);margin-top:3px;text-align:right;">🛑 SL à ${slDist.toFixed(2)}% du prix actuel</div>`:''}
      </div>` : ''}

      <!-- Meta row -->
      <div class="ops-meta-row">
        <div class="ops-countdown${ctDown<=5?' urgent':''}">
          ${ctDown<=5?'⚡':'⏱'} ${fmtCountdown(ctDown)}
        </div>
        <div class="ops-cycle-mode">
          ${ps.userCycleSet?'🔒 Cycle manuel':'🤖 Cycle auto'} · ${fmtDur(ps.cycleMax)}
        </div>
        <button class="ops-close" onclick="closePosition('${pos.id}')">✕ Fermer</button>
      </div>
    </div>`;
  }).join('');
}

// ── Fast price-only update (every tick) ─────────────────
let _homePricesFirstRender = true;
function renderHomePrices() {
  // Portfolio total
  const total = S.cashAccount + S.tradingAccount;
  const _prevTotal = S.portfolio;
  S.portfolio = total;
  // v7.1 P1: affichage = (caisse + réserve fiscale) × USD/EUR. S.portfolio reste interne = cash+trading.
  computePortfolioTotal();
  setEl('heroVal', fmtEUR(S.portfolioTotal));
  // v5 · hero beat + tone on significant change
  // FIX flash boot : au tout premier rendu, l'écart entre le portfolio sauvegardé et le
  // total recalculé n'est PAS un vrai gain/perte (juste un recalage au chargement) → on n'anime pas.
  if(_homePricesFirstRender) {
    _homePricesFirstRender = false;
    _lastHeroVal = total;
  } else if(_prevTotal && Math.abs(total - _prevTotal) > 15) {
    animateHeroValue(total);
    const d = total - _prevTotal;
    if(d > 50) playTone(660, 80, 0.04, 'sine');
    else if(d < -50) playTone(330, 90, 0.04, 'sine');
  } else if(_lastHeroVal === null) {
    _lastHeroVal = total;
  }

  // Session PnL badge
  if(!S._startPortfolio) S._startPortfolio = total;
  // ═══ v8.0 LIVRAISON 25 · P&L de la JOURNÉE (recalibrage minuit) ═══
  // Plus de calcul "depuis injection" qui donnait des % absurdes.
  // On utilise les périodes recalibrées : aujourd'hui par défaut.
  let pnl = 0;
  let sessionGain = 0;
  if (typeof _computePnlByPeriod === 'function') {
    const periods = _computePnlByPeriod();
    if (periods.today.hasData) {
      pnl = periods.today.pct;
      sessionGain = periods.today.usd;
    } else {
      // Fallback : session start
      sessionGain = total - S._startPortfolio;
      pnl = S._startPortfolio > 0 ? (sessionGain / S._startPortfolio * 100) : 0;
    }
  } else {
    // Fallback ancien comportement si pas de période
    sessionGain = total - S._startPortfolio;
    pnl = S._startPortfolio > 0 ? (sessionGain / S._startPortfolio * 100) : 0;
  }
  const pb = document.getElementById('heroPnlBadge');
  if(pb) {
    pb.textContent = (pnl>=0?'↑ +':'↓ ')+Math.abs(pnl).toFixed(2)+'%'+(sessionGain!==0?' ('+fmt$(sessionGain)+')':'');
    pb.className = 'pnl-badge '+(pnl>=0?'up':'down');
    pb.title = 'P&L aujourd\'hui · reset auto à minuit · voir Réglages pour Semaine/Mois';
  }

  // Cycle badge
  setEl('qCycleBadge', '#'+S.cycle);
  // Keep hero mode chip in sync
  const _heroModeChip = document.getElementById('heroModeChip');
  if(_heroModeChip) {
    const wantClass = 'mode-indicator-chip ' + (S.botAutoMode !== false ? 'auto' : 'manual');
    if(_heroModeChip.className !== wantClass) _heroModeChip.className = wantClass;
    const wantHtml = S.botAutoMode !== false ? '🤖 AUTO' : '🎛️ MAN';
    if(_heroModeChip.innerHTML !== wantHtml) _heroModeChip.innerHTML = wantHtml;
  }
  // v118 · FIX DÉSYNC en-tête / portefeuille :
  // l'en-tête (modeLabelText) n'était mis à jour QUE sur toggle explicite, jamais dans
  // la boucle de rendu. Donc tout code qui faisait S.botAutoMode=... en direct (pause,
  // bunker, restauration de state...) laissait l'en-tête figé alors que le chip, lui,
  // se resynchronisait ici. On synchronise l'en-tête AU MÊME ENDROIT que le chip,
  // depuis la même variable → les deux ne peuvent plus jamais diverger.
  const _modeLbl = document.getElementById('modeLabelText');
  const _modeBtn = document.getElementById('modeToggleBtn');
  const _wantAuto = S.botAutoMode !== false;
  if(_modeLbl) {
    const _wantLbl = _wantAuto ? 'AUTO' : 'MAN';
    if(_modeLbl.textContent !== _wantLbl) _modeLbl.textContent = _wantLbl;
  }
  if(_modeBtn) {
    const _wantBtnCls = _wantAuto ? 'auto' : 'manual';
    if(_modeBtn.className !== _wantBtnCls) _modeBtn.className = _wantBtnCls;
  }
  // Signal stats for actions header (BUY/SELL/HOLD counts)
  let _buyN=0, _sellN=0, _holdN=0;
  Object.values(S.pairStates).forEach(psx => {
    const prb = lmsrP(psx);
    if(prb > 0.6) _buyN++;
    else if(prb < 0.4) _sellN++;
    else _holdN++;
  });
  const stEl = document.getElementById('actionsSignalStats');
  if(stEl) stEl.textContent = `↑${_buyN} ↓${_sellN} →${_holdN}`;
  setEl('actionsLive', Object.keys(PAIRS).length+' PAIRES');

  // Live prices on action cards per pair
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const ps  = S.pairStates[pair];
    if(!ps) return;
    const k   = pair.replace('/','_');
    const px  = document.getElementById('ac2_price_'+k);
    const p24 = document.getElementById('ac2_pnl24_'+k);
    const prc = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
    if(px) px.textContent = prc;
    if(p24) {
      p24.textContent = (ps.pnl24h>=0?'+':'')+ps.pnl24h.toFixed(2)+'%';
      p24.style.color = ps.pnl24h>=0?'var(--up)':'var(--down)';
    }
    // Cycle countdown per pair
    const timerEl = document.getElementById('ac2_timer_'+k);
    if(timerEl) {
      const ct = ps.cycleTimer || 0;
      timerEl.textContent = fmtCountdown(ct);
      timerEl.style.color = ct<=5?'var(--down)':ct<=Math.ceil((ps.cycleMax||30)*0.2)?'var(--gold)':'var(--ice)';
    }
    // Live open pos PnL on action card
    const botPos = S.openPositions.find(p => p.pair===pair && p.auto===true);
    const manPos = S.openPositions.find(p => p.pair===pair && p.auto!==true);
    const pos    = manPos || botPos;
    if(pos) {
      const exp  = pos.totalExposure || pos.stakeUsdt;
      const pPnl = pos.side==='long'
        ? ((ps.price - pos.entryPrice) / pos.entryPrice * 100)
        : ((pos.entryPrice - ps.price) / pos.entryPrice * 100);
      const pUsd = exp * (pPnl / 100);
      const liveEl = document.getElementById('ac2_liverow_'+k);
      const gpEl   = document.getElementById('ac2_gprow_'+k);
      const valEl  = document.getElementById('ac2_val_'+k);
      const gpEv   = document.getElementById('ac2_gp_'+k);
      if(liveEl) liveEl.style.display = '';
      if(gpEl)   gpEl.style.display   = '';
      if(valEl)  valEl.textContent    = fmt$(pos.currentVal||exp);
      if(gpEv) {
        gpEv.textContent = (pPnl>=0?'+':'')+pPnl.toFixed(2)+'% ('+( pUsd>=0?'+':'−')+'$'+Math.abs(pUsd).toFixed(1)+')';
        gpEv.style.color = pPnl>=0?'var(--up)':'var(--down)';
      }
    }
  });

  // Capital bar fast update — v15 · min visuel 2% + % en 2 décimales
  const cap = getCapitalSummary();
  const capFill = document.getElementById('capBarFill');
  if(capFill) {
    const pct = Math.round(cap.usedPct * 100) / 100;  // 2 décimales
    // v15 · Min visuel 2% si > 0 pour que la barre reste visible
    const visualPct = (pct > 0 && pct < 2) ? 2 : pct;
    if (capFill._lastPct !== pct) {
      capFill._lastPct = pct;
      capFill.style.width = visualPct+'%';
      const newBg = pct>90?'var(--down)':pct>70?'var(--gold)':'var(--up)';
      if (capFill._lastBg !== newBg) {
        capFill._lastBg = newBg;
        capFill.style.background = newBg;
      }
    }
  }
  // Libellés numériques : update seulement si changement
  const _capPctStr = cap.usedPct.toFixed(2)+'%';  // v15 · 2 décimales
  const capPctEl = document.getElementById('capBarPct');
  if (capPctEl && capPctEl.textContent !== _capPctStr) capPctEl.textContent = _capPctStr;
  const _capStakedStr = fmt$(cap.staked);
  const capStakedEl = document.getElementById('capStaked');
  if (capStakedEl && capStakedEl.textContent !== _capStakedStr) capStakedEl.textContent = _capStakedStr;
  const _capMaxStr = fmt$(cap.maxAllowed);
  const capMaxEl = document.getElementById('capMax');
  if (capMaxEl && capMaxEl.textContent !== _capMaxStr) capMaxEl.textContent = _capMaxStr;
  const capFreeEl = document.getElementById('capFree');
  if(capFreeEl) {
    const _capFreeStr = fmt$(cap.free);
    if (capFreeEl.textContent !== _capFreeStr) capFreeEl.textContent = _capFreeStr;
    const newColor = cap.free < 100 ? 'var(--down)' : 'var(--up)';
    if (capFreeEl._lastColor !== newColor) {
      capFreeEl._lastColor = newColor;
      capFreeEl.style.color = newColor;
    }
  }
}

function renderHome() {
  // ── WALLET CARD ──────────────────────────────
  // v7.5 FIX · Suppression de la dérivation circulaire "trading = portfolio - cash"
  // qui faisait remonter le trading après un reset. tradingAccount est maintenant
  // une source de vérité indépendante (modifiée uniquement par transferts/trades/drift).
  const total = (S.cashAccount || 0) + (S.tradingAccount || 0);  // recalcul local pour l'affichage seulement
  const posVal = S.openPositions.reduce((s,p)=>{
    const ps = S.pairStates[p.pair];
    return s + (ps ? parseFloat(p.amount) * ps.price : 0);
  }, 0);
  const tradingPower = S.tradingAccount * S.leverage;

  // Percentages
  const cashPct  = total > 0 ? (S.cashAccount / total * 100) : 0;
  const tradPct  = total > 0 ? (S.tradingAccount / total * 100) : 0;
  const posPct   = total > 0 ? Math.min(20, (posVal / total * 100)) : 0;

  // Avg LMSR prob across all pairs
  const avgProb  = Object.values(S.pairStates).reduce((s,ps)=>s+lmsrP(ps),0) / Object.keys(PAIRS).length;

  // Patch
  // v7.1 P1: hero value = portfolioTotal EUR (cash + fiscal × USD/EUR). S.portfolio reste interne.
  computePortfolioTotal();
  setEl('heroVal', fmtEUR(S.portfolioTotal));
  // v8.0 LIVRAISON 26 · Affichage P&L par période — COHÉRENT avec P&L NET et P&L SESSION
  // On utilise periods.today qui est calibré à minuit, basé sur S.portfolio (équivaut au P&L SESSION du dashboard)
  let pnlForDisplay = 0;
  let gainForDisplay = 0;
  let periodLabel = '';
  if (typeof _computePnlByPeriod === 'function') {
    const periods = _computePnlByPeriod();
    if (periods.today.hasData) {
      pnlForDisplay = periods.today.pct;
      gainForDisplay = periods.today.usd;
      periodLabel = ' aujourd\'hui';
    } else if (S._startPortfolio) {
      gainForDisplay = S.portfolio - S._startPortfolio;
      pnlForDisplay = S._startPortfolio > 0 ? (gainForDisplay / S._startPortfolio * 100) : 0;
      periodLabel = ' session';
    }
  } else if (S._startPortfolio) {
    gainForDisplay = S.portfolio - S._startPortfolio;
    pnlForDisplay = S._startPortfolio > 0 ? (gainForDisplay / S._startPortfolio * 100) : 0;
  }
  const pb = document.getElementById('heroPnlBadge');
  if(pb) {
    const gainStr = gainForDisplay !== 0
      ? ` (${gainForDisplay>=0?'+':''}${fmt$(gainForDisplay)})`
      : '';
    pb.textContent = (pnlForDisplay>=0?'↑ +':'↓ ')+Math.abs(pnlForDisplay).toFixed(2)+'%'+gainStr;
    pb.className = 'pnl-badge '+(pnlForDisplay>=0?'up':'down');
    pb.title = 'P&L' + periodLabel + ' · ce % inclut les positions ouvertes (latentes). P&L NET en bas montre les trades clos uniquement.';
  }
  // Global cycle counter (kept for chain log)
  setEl('qCycleBadge', '#'+S.cycle);

  // Accounts · v7.2: fmt$2 (2 décimales) pour précision centime sur les balances
  setEl('cashVal',  fmt$2(S.cashAccount));
  setEl('cashPct',  cashPct.toFixed(1)+'%');
  setEl('tradVal',  fmt$2(S.tradingAccount));
  setEl('tradPct',  tradPct.toFixed(1)+'%');

  // v7.2 Phase 15 · Témoin santé trading vs dettes fiscales
  try {
    const _health = computeTradingHealth();
    // v7.2 Phase 16a · Déverrouillage margin-call si remonté ≥ warn
    try { clearMarginCallLockIfRecovered(_health); } catch(e) {}
    const _healthEl = document.getElementById('tradHealthSub');
    if(_healthEl) {
      if(_health.state === 'healthy') {
        // Si aucune dette → on cache complètement l'indicateur (pas polluant)
        if(_health.totalDue < 0.01) {
          _healthEl.innerHTML = '';
        } else {
          _healthEl.innerHTML = `<span class="lev-status-dot stable-green"></span><span class="lev-status-text stable-green">${_health.label}</span>`;
        }
      } else if(_health.state === 'warn') {
        _healthEl.innerHTML = `<span class="lev-status-dot blink-orange"></span><span class="lev-status-text blink-orange">${_health.label}</span>`;
      } else if(_health.state === 'critical') {
        _healthEl.innerHTML = `<span class="lev-status-dot blink-red"></span><span class="lev-status-text blink-red">${_health.label}</span>`;
      } else if(_health.state === 'breached') {
        _healthEl.innerHTML = `<span class="lev-status-dot stable-red"></span><span class="lev-status-text stable-red">⚠ ${_health.label}</span>`;
        // v7.2 Phase 16a · Déclenchement margin-call AUTOMATIQUE
        // Une seule fois par situation (flag _marginCallFired), clôture + transfert vers fisc
        try { triggerMarginCall(_health); } catch(e) { console.warn('margin-call:', e); }
      }
    }
  } catch(e) { /* fail-safe */ }

  // Leverage reserve display (v6.6: show leverage-adjusted capacity)
  syncLeverageReserve();
  const levBorrow  = S.leverageBorrowed || 0;
  const curLev     = Math.max(1, S.leverage || 1);
  // v7.2 Phase 6 fix: afficher S.leverageReserve calculé par syncLeverageReserve
  // (formule spec: trading × maxMult × index). L'ancien calcul local ignorait Phase 6.
  setEl('levReserveVal', fmt$2(S.leverageReserve || 0));
  // v7.2 Phase 14a/b · Couleur valeur + témoin lumineux selon index
  // - index = 0 → valeur GRIS PLAT + texte "LEVIER DÉSACTIVÉ" stable gris
  // - index = 1 → valeur ORANGE + dot vert stable + texte "LEVIER ACTIF ×1" vert
  // - index ≥ 2 → valeur ORANGE (décroissante quand emprunts) + dot bleu clignotant + texte "LEVIER ACTIF ×N" bleu clignotant
  const idxNow = Math.max(0, S.leverage || 0);
  // Sync le stepper d'affichage (au cas où state restauré depuis snapshot)
  const _levDispEl = document.getElementById('leverageDisp');
  if(_levDispEl && _levDispEl.textContent !== '×'+idxNow) _levDispEl.textContent = '×'+idxNow;
  const levValEl = document.getElementById('levReserveVal');
  if(levValEl) {
    if(idxNow === 0) {
      levValEl.style.color = 'var(--t3)';  // gris plat
    } else {
      levValEl.style.color = '#ff9500';  // orange
    }
  }
  const levSubEl = document.getElementById('levBorrowedSub');
  if(levSubEl) {
    if(idxNow === 0) {
      levSubEl.innerHTML = `<span class="lev-status-dot stable-gray"></span><span class="lev-status-text stable-gray">LEVIER DÉSACTIVÉ</span>`;
    } else if(idxNow === 1) {
      const engaged = levBorrow > 0 ? ' · Engagé ' + fmt$2(levBorrow) : '';
      levSubEl.innerHTML = `<span class="lev-status-dot stable-green"></span><span class="lev-status-text stable-green">LEVIER ACTIF ×1</span><span style="color:var(--t3);font-size:8px;">${engaged}</span>`;
    } else {
      const engaged = levBorrow > 0 ? ' · Engagé ' + fmt$2(levBorrow) : '';
      levSubEl.innerHTML = `<span class="lev-status-dot blink-blue"></span><span class="lev-status-text blink-blue">LEVIER ACTIF ×${idxNow}</span><span style="color:var(--t3);font-size:8px;">${engaged}</span>`;
    }
  }

  // v7.2 PHASE 11 · Wallet 2ème ligne · Réserve fiscale + Fonds propres exonérés
  setEl('fiscalResVal', fmt$2(S.fiscalReserveAccount || 0));
  const _fiscalCount = (S.fiscalReserveLog || []).length;
  setEl('fiscalResSub', _fiscalCount + (_fiscalCount > 1 ? ' dépôts' : ' dépôt'));
  setEl('ownFundsVal', fmtEUR((S.ownFundsInjected || 0) * (S.usdEurRate || 0.92)));  // v7.6 · affiché en EUR
  const _ownCount = (S.ownFundsLog || []).length;
  setEl('ownFundsSub', _ownCount === 0 ? 'Capital initial'
                   : _ownCount + (_ownCount > 1 ? ' injections' : ' injection'));

  // Cash account lock indicator
  const cashEl = document.getElementById('cashVal');
  if(cashEl) cashEl.style.color = 'var(--ice)';  // blue = locked/safe

  // Capital bar handled in renderHomePrices (fast path)

  // v7.12 · Allocation bar Caisse/Trading/Positions (restaurée + Capital Engagé en plus)
  // STABILITÉ · ne met à jour que si valeur arrondie a changé (évite tremblement à chaque tick)
  const cb = document.getElementById('wAllocCash');
  const tb = document.getElementById('wAllocTrade');
  const pb2= document.getElementById('wAllocPos');
  // Arrondi à l'entier pour stabilité visuelle
  const cashW = Math.max(2, Math.round(cashPct - posPct));
  const tradW = Math.max(2, Math.round(tradPct));
  const posW  = Math.max(1, Math.round(posPct));
  if(cb && cb._lastW !== cashW) { cb._lastW = cashW; cb.style.width = cashW+'%'; }
  if(tb && tb._lastW !== tradW) { tb._lastW = tradW; tb.style.width = tradW+'%'; }
  if(pb2 && pb2._lastW !== posW) { pb2._lastW = posW; pb2.style.width = posW+'%'; }

  // Stats row
  // v8.0 LIVRAISON 27 FIX · win rate par défaut 0% (pas 62% inventé)
  const wr = S.totalTrades>0?Math.round(S.winTrades/S.totalTrades*100):0;
  setEl('qWin',      wr+'%');
  setEl('qCycleBadge', '#'+S.cycle);

  // Trades
  const allTrades = Object.values(S.pairStates).reduce((s,ps)=>s+ps.totalTrades,0);
  setEl('tradeCountMobile', allTrades+' TRADES');
  setEl('cycleTrades', allTrades);
  setEl('qActivePairs', Object.keys(PAIRS).length + (S.activePairProposal ? '+1' : ''));

  // Trade list — auto-trades + position closes, tri par heure décroissant
  // ── Trades list : toutes paires, triées par heure décroissante ──
  // Fusionner tous les trades + ajouter un timestamp numérique pour tri correct
  const allT = Object.entries(S.pairStates)
    .flatMap(([pair, ps]) => ps.trades.map(t => ({ ...t, pair })))
    .sort((a, b) => {
      // Tri par timestamp numérique si disponible, sinon par time string
      const ta = a.ts || 0;
      const tb = b.ts || 0;
      if(ta !== tb) return tb - ta;   // plus récent en premier
      if(a.time === b.time) return (b.type==='position'?1:0)-(a.type==='position'?1:0);
      return a.time < b.time ? 1 : -1;
    })
    .slice(0, 5);

  const tl = document.getElementById('mobileTradeList');
  tl.innerHTML = allT.map(t => {
    const isClose = t.type === 'position';
    const isOpen  = t.type === 'open';
    const isPos   = isClose || isOpen;
    const cfg     = PAIRS[t.pair];
    if(!cfg) return '';
    const isBuy   = t.side === 'buy';
    const iconBg  = isBuy ? 'rgba(0,232,122,.12)' : 'rgba(255,61,107,.12)';
    const icon    = isClose ? (isBuy?'📈':'📉') : isOpen ? (isBuy?'🔼':'🔽') : (isBuy?'↑':'↓');
    const label   = isClose ? (isBuy?'LONG ✓':'SHORT ✓')
                  : isOpen  ? (isBuy?'LONG →':'SHORT →')
                  : (isBuy  ? 'BUY':'SELL');
    const pillCls = isBuy ? 'pill-up' : 'pill-down';
    const priceStr= cfg.dec>=4 ? parseFloat(t.price).toFixed(cfg.dec) : '$'+Math.floor(t.price).toLocaleString();
    const entryStr= isClose && t.entryPrice
      ? (cfg.dec>=4 ? parseFloat(t.entryPrice).toFixed(cfg.dec) : '$'+Math.floor(t.entryPrice).toLocaleString())
      : null;

    const badgeHtml = isClose ? ' <span style="font-size:8px;background:rgba(167,139,250,.15);color:var(--pur);padding:1px 4px;border-radius:4px;">CLOSE</span>'
                    : isOpen  ? ' <span style="font-size:8px;background:rgba(56,212,245,.12);color:var(--ice);padding:1px 4px;border-radius:4px;">OPEN</span>'
                    : '';

    const pnlColor = (t.pnl||0) >= 0 ? 'var(--up)' : 'var(--down)';
    const usdtLine = t.stakeUsdt
      ? `<div style="font-size:9px;color:var(--t3);margin-top:2px;">
           <span style="color:var(--t2);">$${t.stakeUsdt}</span>
           ${t.pnlUsdt!=null&&t.pnlUsdt!==0 ? (t.pnlUsdt>=0
             ? ' · <span style="color:var(--up)">+$'+Math.abs(t.pnlUsdt).toFixed(2)+'</span>'
             : ' · <span style="color:var(--down)">−$'+Math.abs(t.pnlUsdt).toFixed(2)+'</span>') : ''}
           ${badgeHtml}
           ${t.fee!=null&&t.fee>0 ? ' · <span style="color:var(--down)">fee:−$'+t.fee.toFixed(3)+'</span>' : ''}
         </div>`
      : '';
    const entryLine = entryStr
      ? `<div style="font-size:8px;color:var(--t3);margin-top:1px;">entrée: ${entryStr} → sortie: ${priceStr}</div>`
      : '';

    const pnlVal  = t.pnl != null ? t.pnl : 0;
    const pnlShow = isOpen ? '' : `<div class="trade-pnl" style="color:${pnlColor}">${pnlVal>=0?'+':''}${pnlVal.toFixed(2)}%</div>`;

    return `
  <div class="trade-item${isClose?' trade-item-pos':''}">
    <div class="trade-icon-wrap ${t.side}" style="background:${iconBg}">${icon}</div>
    <div class="trade-info">
      <div class="trade-pair">${t.pair} · <span class="pill ${pillCls}">${label}</span></div>
      <div class="trade-detail">${t.amount||'—'} ${cfg.sym}${!entryStr?' · @'+priceStr:''}</div>
      ${entryLine}
      ${usdtLine}
    </div>
    <div style="text-align:right;">
      ${pnlShow}
      <div class="trade-time">${t.time||''}</div>
    </div>
  </div>`;
  }).join('') || '<div style="color:var(--t3);font-size:11px;padding:12px 0;text-align:center;">Aucun trade pour l\'instant…</div>';

  // Portfolio drift removed from renderHome — handled in simTick only

  // v8.0 LIVRAISON 26 FIX · Drawdown ne peut JAMAIS être positif (par définition)
  // Le drawdown = perte depuis le peak. Si portfolio = peak ou supérieur, dd = 0.
  const peak = S.pnlHistory.length > 0
    ? Math.max(...S.pnlHistory, S.portfolio)
    : S.portfolio;
  let dd = peak > 0 ? ((S.portfolio - peak) / peak * 100) : 0;
  if (dd > 0) dd = 0; // garantie : drawdown ≤ 0
  setEl('qDD', dd.toFixed(1)+'%');
  const ddEl = document.getElementById('qDD');
  if(ddEl) ddEl.style.color = dd >= -0.5 ? 'var(--up)' : 'var(--down)';

  // v8.0 LIVRAISON 26 FIX · Sharpe stabilisé — minimum 15 valeurs pour fiabilité
  const sharpe = (() => {
    if(S.pnlHistory.length < 15) return null;
    const returns = S.pnlHistory.slice(-30).map((v,i,a)=> i>0 ? (v-a[i-1])/a[i-1]*100 : 0).slice(1);
    if (returns.length < 10) return null;
    const avg = returns.reduce((s,v)=>s+v,0) / returns.length;
    const std = Math.sqrt(returns.reduce((s,v)=>s+(v-avg)**2,0) / returns.length) || 0.001;
    return std > 0.001 ? avg / std : 0;
  })();
  const sharpeEl = document.getElementById('qSharpe');
  if(sharpeEl && sharpe !== null) {
    sharpeEl.textContent = sharpe.toFixed(2);
    sharpeEl.style.color = sharpe>0.5?'var(--up)':sharpe>0?'var(--gold)':'var(--down)';
  }

  // Compounded profits display
  const compEl = document.getElementById('qCompounded');
  if(compEl) {
    // v8.0 LIVRAISON 27 FIX · affiche la vraie valeur composée (persistée entre sessions)
    const comp = S._totalCompounded||0;
    compEl.textContent = (comp>=0?'+':'')+'$'+comp.toFixed(0);
    compEl.style.color = comp>=0?'var(--up)':'var(--down)';
  }

  // ── Stats row 2 : frais, efficacité, P&L net, réserve ──
  const f       = S.fees;
  const taxLive = calcTaxProvision();
  const netPnl  = f.totalPnlGross - f.totalGross - taxLive;
  // v8.0 LIVRAISON 27 FIX · Efficacité visible même quand P&L global négatif
  // Formule : % du P&L brut retenu après frais. Si P&L brut négatif, on affiche
  // le ratio frais/pertes comme indicateur de coût.
  let eff = null;
  if (f.totalGross > 0) {
    if (f.totalPnlGross > 0) {
      // P&L positif : % conservé après frais
      eff = (100 - (f.totalGross + taxLive) / f.totalPnlGross * 100).toFixed(1);
    } else {
      // P&L négatif : frais en % des pertes (combien les frais alourdissent)
      const totalLoss = Math.abs(f.totalPnlGross) || 0.01;
      eff = (-(f.totalGross / totalLoss) * 100).toFixed(1);
    }
  }

  const feesEl  = document.getElementById('qFeesTotal');
  const effEl   = document.getElementById('qEfficiency');
  const netEl   = document.getElementById('qPnlNet');
  const resEl   = document.getElementById('qReserve');

  if(feesEl) {
    feesEl.textContent = '-$'+f.totalGross.toFixed(2);
    feesEl.style.color = 'var(--down)';
  }
  if(effEl) {
    effEl.textContent = eff !== null ? eff+'%' : '—';
    // v8.0 LIVRAISON 27 FIX · couleur cohérente avec l'état
    const effVal = parseFloat(eff);
    if (f.totalPnlGross > 0) {
      // Mode positif : % retenu (plus c'est haut, mieux c'est)
      effEl.style.color = effVal >= 95 ? 'var(--up)' : effVal >= 85 ? 'var(--gold)' : 'var(--down)';
    } else {
      // Mode négatif : % de frais sur pertes (toujours mauvais, rouge)
      effEl.style.color = 'var(--down)';
    }
  }
  if(netEl) {
    // v8.0 LIVRAISON 27 · P&L NET = gains réalisés MOINS toutes les frais
    // Différent de P&L SESSION qui inclut les positions ouvertes (latentes)
    netEl.textContent = (netPnl>=0?'+':'')+netPnl.toFixed(2)+'$';
    netEl.style.color = netPnl >= 0 ? 'var(--up)' : 'var(--down)';
    netEl.title = 'P&L NET = trades fermés - frais - taxes. Différent du P&L SESSION qui inclut les positions ouvertes.';
  }
  if(resEl) {
    resEl.textContent = '$'+f.feeReserveAccount.toFixed(0);
  }

  // ── Stats row 3 : best agent, avg cycle, generations, composite signal ──
  const analAgents = S.agents.filter(a=>!a.isBot&&!a.isMeta);
  const best = analAgents.length ? [...analAgents].sort((a,b)=>b.fitness-a.fitness)[0] : null;
  const avgCycleMs = Object.values(S.pairStates).reduce((s,ps)=>s+ps.cycleMax,0)/Object.keys(PAIRS).length;
  // Live LMSR consensus across all pairs
  const pairKeys = Object.keys(PAIRS);
  const avgLmsr  = pairKeys.reduce((s,p) => s + lmsrP(S.pairStates[p]||{}), 0) / Math.max(1, pairKeys.length);
  const avgComp  = (avgLmsr - 0.5) * 2;  // -1 to +1

  setEl('qBestAgent', best ? best.emoji+' '+best.name.split(' ')[0]+' '+Math.floor(best.fitness)+'T$' : '—');
  const bestEl = document.getElementById('qBestAgent');
  if(bestEl) bestEl.style.color = best ? (best.fitness>500?'var(--up)':'var(--gold)') : 'var(--t3)';

  setEl('qAvgCycle', fmtDur(Math.round(avgCycleMs)));
  setEl('qGenCount', S._genCount || 0);

  // Session duration + daily P&L
  const sessSec  = Math.floor((Date.now() - (S._sessionStart||Date.now())) / 1000);
  const sessStr  = sessSec < 60 ? sessSec+'s'
    : sessSec < 3600 ? Math.floor(sessSec/60)+'m '+( sessSec%60)+'s'
    : Math.floor(sessSec/3600)+'h '+ Math.floor((sessSec%3600)/60)+'m';
  setEl('qSession', sessStr);
  // v8.0 LIVRAISON 26 FIX · P&L SESSION utilise la période journalière recalibrée
  // Plus de chiffre absurde -$488 776 dû à un _startPortfolio corrompu
  let sessGain = 0;
  if (typeof _computePnlByPeriod === 'function') {
    const _periods = _computePnlByPeriod();
    if (_periods.today.hasData) {
      sessGain = _periods.today.usd;
    } else {
      // Fallback propre : si pas de période, on affiche 0
      sessGain = 0;
    }
  }
  const spEl = document.getElementById('qSessionPnl');
  if(spEl) {
    spEl.textContent = (sessGain>=0?'+$':'−$')+Math.abs(sessGain).toFixed(1);
    spEl.style.color = sessGain>=0?'var(--up)':'var(--down)';
  }

  // Session info — leverage utilization (v6.8: sync with levBorrowedSub block above)
  // NOTE: levBorrowedSub already set above (lines ~49-56) — only update if borrowed
  if(S.leverageBorrowed > 0) {
    const levUtil = S.leverageReserve > 0
      ? Math.round(S.leverageBorrowed / (S.leverageReserve + S.leverageBorrowed) * 100)
      : 0;
    const levEl3 = document.getElementById('levBorrowedSub');
    if(levEl3) {
      levEl3.textContent = `Emprunté: ${fmt$(S.leverageBorrowed)} (${levUtil}%)`;
      levEl3.style.color = levUtil > 70 ? 'var(--down)' : levUtil > 40 ? 'var(--gold)' : 'var(--down)';
    }
    
    // ═══ v7.12 · Q1:D · Alerte visible si capacité levier > 90% ═══
    // Calcul de la capacité absolue (base × mult, pas base × mult × index)
    const _p9Base = (S._autoLevBase && S._autoLevBase > 0) ? S._autoLevBase : (S.tradingAccount || 0);
    const _p9MaxCap = _p9Base * (S.leverageMaxMult || 10);
    const _p9UsagePct = _p9MaxCap > 0 ? ((S.leverageBorrowed || 0) / _p9MaxCap) * 100 : 0;
    
    let _p9Alert = document.getElementById('p9LevAlert');
    if (!_p9Alert && levEl3 && levEl3.parentNode) {
      _p9Alert = document.createElement('div');
      _p9Alert.id = 'p9LevAlert';
      _p9Alert.style.cssText = 'display:none;margin-top:4px;padding:4px 8px;background:rgba(255,61,107,.15);border:1px solid rgba(255,61,107,.5);border-radius:6px;font-size:9px;font-weight:700;color:var(--down);letter-spacing:.04em;font-family:var(--font-mono);text-align:center;animation:nexusSavePulse 1.5s ease-out infinite;';
      levEl3.parentNode.appendChild(_p9Alert);
    }
    if (_p9Alert) {
      if (_p9UsagePct >= 95) {
        _p9Alert.style.display = 'block';
        _p9Alert.innerHTML = '🛑 ' + _p9UsagePct.toFixed(0) + '% · EMPRUNT BLOQUÉ';
        _p9Alert.style.background = 'rgba(255,61,107,.25)';
        _p9Alert.style.borderColor = 'var(--down)';
      } else if (_p9UsagePct >= 90) {
        _p9Alert.style.display = 'block';
        _p9Alert.innerHTML = '⚠ ' + _p9UsagePct.toFixed(0) + '% · proche du max';
        _p9Alert.style.background = 'rgba(245,166,35,.18)';
        _p9Alert.style.borderColor = 'rgba(245,166,35,.6)';
        _p9Alert.style.color = '#f5a623';
      } else {
        _p9Alert.style.display = 'none';
      }
    }
  }

  const sigEl2 = document.getElementById('qBotSignal');
  if(sigEl2) {
    const strength = Math.abs(avgComp);
    if(avgComp > 0.2)       { sigEl2.textContent='↑ LONG'; sigEl2.style.color='var(--up)'; }
    else if(avgComp < -0.2) { sigEl2.textContent='↓ SHORT'; sigEl2.style.color='var(--down)'; }
    else                    { sigEl2.textContent='→ NEUTRE'; sigEl2.style.color='var(--gold)'; }
  }

  renderFiscalMini();
  renderOpenPnlBanner();
  try { if(typeof updateTrustScore === 'function') updateTrustScore(); } catch(e) {}
  try { if(typeof renderJournal === 'function') renderJournal(); } catch(e) {}
  try { if(typeof renderTwinLive === 'function') renderTwinLive(); } catch(e) {}
  try { if(typeof btcImpactTick==='function') btcImpactTick(); } catch(e) {}
  if(_cwOpen) try { _updateCompactWidget(); } catch(e) {}
  try { if(typeof checkGraceMoment==='function') checkGraceMoment(false); } catch(e) {}
  // v118 FIX · checkBunker() retiré de la boucle de rendu (causait déclenchement parasite à chaque frame)
  // Le bunker tourne uniquement via son timer dédié (toutes les 120s) + _bkInitCapRef() au démarrage
  // v23 · Vérifier alertes P&L (silencieux)
  try { if(typeof checkPnlAlerts === 'function') checkPnlAlerts(); } catch(e) {}
  // v69 · Alertes prix temps réel
  try { if(typeof checkPriceAlerts === 'function') checkPriceAlerts(); } catch(e) {}
  try { if(typeof checkBadges === 'function') checkBadges(); } catch(e) {}
}

/* ── stable agent card IDs so we never rebuild the whole list ── */
function buildAgentCards() {
  const list = document.getElementById('mobileAgentList');
  if(!list) return;
  // Init fitness history if not present
  S.agents.forEach(a => { if(!a.fitnessHistory) a.fitnessHistory = [a.fitness]; });

  const roleColor = { fundamental:'var(--ice)', technical:'var(--up)', sentiment:'var(--pur)',
                      context:'var(--gold)', execution:'var(--down)', meta:'var(--pur)', hybrid:'var(--up)' };
  const roleLabel = { fundamental:'FONDAMENTAL', technical:'TECHNIQUE', sentiment:'SENTIMENT',
                      context:'CONTEXTE', execution:'BOT EXÉ.', meta:'META·IA', hybrid:'HYBRIDE' };

  // Group agents by role
  const groups = [
    { key:'fundamental', label:'📊 Analyse Fondamentale' },
    { key:'technical',   label:'📈 Analyse Technique' },
    { key:'sentiment',   label:'💬 Sentiment & NLP' },
    { key:'context',     label:'🌍 Contexte Global' },
    { key:'execution',   label:'⚡ Bots d\'Exécution' },
    { key:'meta',        label:'🧬 Méta-Évolueur' },
    { key:'hybrid',      label:'🔀 Hybrides Évolutifs' },
  ];

  let html = '';
  groups.forEach(g => {
    const groupAgents = S.agents.filter(a => (a.role||'fundamental') === g.key);
    if(!groupAgents.length) return;
    html += `<div style="font-size:8px;font-weight:700;color:var(--t3);letter-spacing:.1em;text-transform:uppercase;
               padding:6px 0 3px;margin-top:4px;border-top:1px solid var(--border);">${g.label}</div>`;
    groupAgents.forEach((a,i) => {
      const rCol  = roleColor[a.role||'fundamental'] || 'var(--t3)';
      const rLbl  = roleLabel[a.role||'fundamental'] || a.role?.toUpperCase();
      const botBadge = a.isBot
        ? `<span style="font-size:6px;background:rgba(255,61,107,.15);color:var(--down);border:1px solid rgba(255,61,107,.3);padding:1px 4px;border-radius:4px;margin-left:3px;">BOT</span>`
        : a.isMeta
        ? `<span style="font-size:6px;background:rgba(157,78,221,.2);color:var(--pur);border:1px solid rgba(157,78,221,.3);padding:1px 4px;border-radius:4px;margin-left:3px;">META</span>`
        : '';
      const errBadge = (a.errors||0) > 3
        ? `<span style="font-size:6px;background:rgba(255,61,107,.12);color:var(--down);padding:1px 4px;border-radius:4px;margin-left:3px;">⚠ ${a.errors} err.</span>` : '';
      const streakBadge = (a.streak||0) >= 3
        ? `<span style="font-size:6px;background:rgba(0,232,122,.1);color:var(--up);padding:1px 4px;border-radius:4px;margin-left:3px;">🔥 ${a.streak}</span>` : '';

      html += `
  <div class="agent-card" id="agcard_${a.id}" data-agent-role="${a.role||'fundamental'}" style="animation-delay:${i*.04}s">
    <div class="agent-avatar" style="background:rgba(255,255,255,.04)" id="av_${a.id}">${a.emoji}</div>
    <div class="agent-info">
      <div class="agent-name-row">
        <div style="display:flex;align-items:center;gap:2px;flex-wrap:wrap;">
          <span class="agent-name" id="an_${a.id}">${a.name}</span>
          ${botBadge}${errBadge}${streakBadge}
        </div>
        <div class="pill pill-up" id="as_${a.id}">+0.000</div>
      </div>
      <div style="font-size:7px;color:${rCol};letter-spacing:.06em;font-weight:600;margin-bottom:1px;">${rLbl}</div>
      <div class="agent-type-row" id="at_${a.id}">${a.type} · ${a.source}</div>
      <div class="agent-fitness-wrap">
        <div class="agent-fitness-label">
          <span>T$: <strong class="fit-val" id="af_${a.id}" style="color:var(--gold)">0</strong></span>
          <span>Conf: <span id="aconf_${a.id}">0</span>%</span>
          <span id="aerr_${a.id}" style="color:var(--t3);font-size:8px;"></span>
        </div>
        <div class="agent-fitness-bar">
          <div class="agent-fitness-fill" id="afb_${a.id}" style="width:0%;background:${a.color};transition:width .4s;"></div>
        </div>
      </div>
      <canvas id="aspk_${a.id}" style="width:100%;height:22px;margin-top:3px;display:block;border-radius:3px;"></canvas>
      <div class="agent-meta-row">
        <span class="pill pill-up" id="am_${a.id}">—</span>
        <span class="pill pill-ice" id="alrn_${a.id}">0 apprent.</span>
        <span id="awratio_${a.id}" style="font-size:8px;color:var(--t3);">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--t3);margin-top:3px;">
        <span>Reward: <span id="arwd_${a.id}" style="color:var(--gold)">0</span></span>
        <span id="amem_${a.id}" style="color:var(--t3);font-size:7px;"></span>
      </div>
      <div id="amstrip_${a.id}" class="memory-strip" onclick="showMemoryOverlay('${a.id}')" style="display:none;">
        <div class="memory-strip-label">
          <span>💭 DERNIÈRE MÉMOIRE</span>
          <span id="amem_cnt_${a.id}" style="color:var(--ice)">0 ep.</span>
        </div>
        <div class="memory-metaphor" id="amem_text_${a.id}">—</div>
        <div class="memory-meta">
          <span><span id="amem_pnl_${a.id}">—</span></span>
          <span id="amem_pair_${a.id}" style="color:var(--t3)">—</span>
          <span style="color:var(--t3)">Tap pour voir tout</span>
        </div>
      </div>
    </div>
  </div>`;
    });
  });
  list.innerHTML = html;
}

function patchAgentCards() {
  // Record fitness history every call (throttled to avoid too many points)
  // v6.9: record fitness every tick for real-time Pearson (capped at 100 pts)
  if(tick % 1 === 0) {
    S.agents.forEach(a => {
      if(!a.fitnessHistory) a.fitnessHistory = [a.fitness, a.fitness];
      a.fitnessHistory.push(a.fitness + (Math.random()-0.5)*0.5);  // tiny noise to avoid flat line
      if(a.fitnessHistory.length > 60) a.fitnessHistory.shift();
    });
  }

  S.agents.forEach(a => {
    const sc = a.score;
    const scStr = (sc>=0?'+':'')+sc.toFixed(3);
    const scCls = sc>.1?'pill-up':sc<-.1?'pill-down':'pill-gold';
    const fitPct = Math.min(100,(a.fitness/1500)*100);
    const events = a.learningEvents || 0;
    const reward = a.totalReward   || 0;

    const elScore = document.getElementById('as_'+a.id);
    const elMeta  = document.getElementById('am_'+a.id);
    const elFit   = document.getElementById('af_'+a.id);
    const elConf  = document.getElementById('aconf_'+a.id);
    const elBar   = document.getElementById('afb_'+a.id);
    const elName  = document.getElementById('an_'+a.id);
    const elType  = document.getElementById('at_'+a.id);
    const elAv    = document.getElementById('av_'+a.id);
    const elLrn   = document.getElementById('alrn_'+a.id);
    const elRwd   = document.getElementById('arwd_'+a.id);
    const elRatio = document.getElementById('awratio_'+a.id);
    if(!elScore) return;

    elScore.textContent = scStr;
    elScore.className = 'pill '+scCls;
    if(elMeta)  { elMeta.textContent = 'Score: '+scStr; elMeta.className = 'pill '+scCls; }
    if(elFit)   elFit.textContent  = Math.floor(a.fitness);
    if(elConf)  elConf.textContent = (a.conf*100).toFixed(0);
    if(elBar)   elBar.style.width  = fitPct+'%';
    if(elName)  elName.textContent = a.name;
    if(elType)  elType.textContent = a.type+' · '+a.source;
    if(elAv)    elAv.textContent   = a.emoji;

    if(elLrn) {
      elLrn.textContent = events+' apprent.';
      elLrn.className = 'pill '+(events>20?'pill-up':events>5?'pill-ice':'pill-gold');
    }
    if(elRwd) {
      elRwd.textContent = (reward>=0?'+':'')+reward.toFixed(0);
      elRwd.style.color = reward>=0?'var(--up)':'var(--down)';
    }
    if(elRatio && events>0) {
      elRatio.textContent = reward>=0 ? '✓ Aligné' : '✗ Dérivé';
      elRatio.style.color = reward>=0 ? 'var(--up)' : 'var(--down)';
    }

    // ── amem legacy element — show memory count ──
    const elMemLegacy = document.getElementById('amem_'+a.id);
    if(elMemLegacy && a.memory && a.memory.length > 0) {
      const wonMem  = a.memory.filter(e => e.won).length;
      elMemLegacy.textContent = `💭 ${a.memory.length} mém. · ${wonMem}✓`;
      elMemLegacy.style.color = wonMem > a.memory.length/2 ? 'var(--up)' : 'var(--down)';
    }
    const elMstrip   = document.getElementById('amstrip_'+a.id);
    const elMemText  = document.getElementById('amem_text_'+a.id);
    const elMemPnl   = document.getElementById('amem_pnl_'+a.id);
    const elMemPair  = document.getElementById('amem_pair_'+a.id);
    const elMemCnt   = document.getElementById('amem_cnt_'+a.id);
    if(elMstrip && a.memory && a.memory.length > 0) {
      elMstrip.style.display = '';
      const last = a.memory[a.memory.length - 1];
      if(elMemText) elMemText.textContent = last.metaphor
        ? '"' + last.metaphor.slice(0, 90) + (last.metaphor.length > 90 ? '…' : '') + '"'
        : '—';
      if(elMemPnl) {
        elMemPnl.textContent = (last.pnl >= 0 ? '+' : '') + last.pnl + '%';
        elMemPnl.style.color = last.won ? 'var(--up)' : 'var(--down)';
      }
      if(elMemPair) elMemPair.textContent = last.pair || '—';
      if(elMemCnt)  elMemCnt.textContent  = a.memory.length + ' ep.';
    }

    // Draw fitness sparkline — retina-aware bezier
    const cv = document.getElementById('aspk_'+a.id);
    if(cv && a.fitnessHistory && a.fitnessHistory.length > 1) {
      const dpr = window.devicePixelRatio || 1;
      const cW  = cv.offsetWidth || cv.parentElement?.offsetWidth || 200;
      const cH  = 22;
      cv.width  = cW * dpr;
      cv.height = cH * dpr;
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = cW, H = cH;
      const data = a.fitnessHistory;
      const mn = Math.min(...data), mx = Math.max(...data);
      const rng = mx - mn || 1;
      ctx.clearRect(0, 0, W, H);
      const pts = data.map((v,i) => ({ x:(i/(data.length-1))*W, y:H-((v-mn)/rng)*(H-4)-2 }));
      const up  = data[data.length-1] >= data[0];
      const col = up ? '#00e87a' : '#ff3d6b';
      // Gradient fill
      const grad = ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0, up?'rgba(0,232,122,.18)':'rgba(255,61,107,.18)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.moveTo(0, H);
      ctx.lineTo(pts[0].x, pts[0].y);
      for(let i=1;i<pts.length;i++){
        const cx=(pts[i-1].x+pts[i].x)/2;
        ctx.bezierCurveTo(cx,pts[i-1].y,cx,pts[i].y,pts[i].x,pts[i].y);
      }
      ctx.lineTo(W,H); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
      // Line
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for(let i=1;i<pts.length;i++){
        const cx=(pts[i-1].x+pts[i].x)/2;
        ctx.bezierCurveTo(cx,pts[i-1].y,cx,pts[i].y,pts[i].x,pts[i].y);
      }
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
      // Last point dot
      const last = pts[pts.length-1];
      ctx.beginPath(); ctx.arc(last.x, last.y, 2, 0, Math.PI*2);
      ctx.fillStyle = col; ctx.fill();
    }
  });

  // v6.4 · ACTIFS counter — agents with meaningful signal
  const activeAgentCount = S.agents.filter(a => Math.abs(a.score||0) > 0.01).length;  // v6.9: seuil actif réduit
  const acEl = document.getElementById('agentCountMobile');
  if(acEl) {
    acEl.textContent = activeAgentCount + ' ACTIFS';
    acEl.className = 'pill ' + (activeAgentCount >= 10 ? 'pill-up' : activeAgentCount >= 5 ? 'pill-gold' : 'pill-down');
  }

  // ── Global Memory Stats Bar (Feature #1) ─────────────────
  if(tick % 4 === 0) {
    const poolEl  = document.getElementById('memPoolCount');
    const wonEl   = document.getElementById('memPoolWon');
    const dreamEl = document.getElementById('memDreamCount');
    const rcEl    = document.getElementById('memRecallBadge');
    if(poolEl)  poolEl.textContent  = S.globalMemoryPool.length;
    if(wonEl)   wonEl.textContent   = S.globalMemoryPool.filter(e => e.episode && e.episode.won).length;
    if(dreamEl) dreamEl.textContent = S.dreams.length;
    if(rcEl) {
      if(S.dreamActive) {
        rcEl.textContent = '💤 DREAM EN COURS…';
        rcEl.style.color = 'var(--pur)';
      } else {
        const totalMem = S.agents.reduce((s,a) => s + (a.memory ? a.memory.length : 0), 0);
        rcEl.textContent = totalMem > 0 ? `✓ ${totalMem} épisodes chargés` : 'EN ATTENTE';
        rcEl.style.color = totalMem > 0 ? 'var(--ice)' : 'var(--t3)';
      }
    }
  }
}

function renderAgentsEvo() {
  const ev = document.getElementById('mobileEvoList');
  if(!ev) return;

  // ── Active Dream Progress Banner ──────────────────────────
  let dreamBanner = document.getElementById('dreamActiveBanner');
  if(S.dreamActive && S.currentDream) {
    if(!dreamBanner) {
      dreamBanner = document.createElement('div');
      dreamBanner.id = 'dreamActiveBanner';
      ev.parentNode.insertBefore(dreamBanner, ev);
    }
    const sc = S.currentDream.scenarios;
    const doneIdx = sc.filter(s => s.outcome).length;
    dreamBanner.innerHTML = `
      <div class="dream-card">
        <div class="dream-card-header">
          <div class="dream-card-title">
            <span class="dream-active-pulse">&#x1F4A4;</span>
            Dream Cycle #${S.currentDream.id} &middot; En cours
          </div>
          <div class="dream-card-badge">${doneIdx}/${sc.length} sc&eacute;narios</div>
        </div>
        <div class="dream-scenario-list">
          ${sc.map((s,i) => `
            <div class="dream-scenario ${i===doneIdx?'active-dream':''}">
              <div class="dream-scenario-icon">${s.icon}</div>
              <div class="dream-scenario-body">
                <div class="dream-scenario-name">${s.name}</div>
                <div class="dream-scenario-sub">${s.sub}</div>
              </div>
              <div class="dream-scenario-vote" style="color:${i<doneIdx?(s.outcome&&s.outcome.survived?'var(--up)':'var(--down)'):'var(--t3)'}">
                ${i<doneIdx?(s.outcome&&s.outcome.survived?'&#x2713; OK':'&#x26A0; Critique'):'&hellip;'}
              </div>
            </div>`).join('')}
        </div>
        <div class="dream-progress"><div class="dream-progress-fill" style="width:${S.dreamProgress}%"></div></div>
        <div class="dream-status">
          <span>Stress-test &middot; agents recalib.</span>
          <span style="color:var(--pur)">${S.dreamProgress}%</span>
        </div>
      </div>`;
  } else if(dreamBanner) {
    dreamBanner.remove();
  }

  // ── Full evo log ─────────────────────────────────────────
  const allLogs = S.evoLog.slice().reverse();
  if(allLogs.length === 0 && !S.dreamActive) {
    if(!document.getElementById('evoEmpty'))
      ev.innerHTML = '<div id="evoEmpty" style="color:var(--t3);font-size:11px;padding:12px 0;">Premier cycle d\'&eacute;volution en cours&hellip;</div>';
    return;
  }
  const rendered = ev.querySelectorAll('.evo-item,.dream-evo-item').length;
  if(allLogs.length !== rendered) {
    document.getElementById('evoEmpty')?.remove();
    ev.innerHTML = '';
    allLogs.slice(0,25).forEach(e => {
      const div = document.createElement('div');
      if(e.type === 'dream') {
        const dd = e.dreamId != null ? S.dreams.find(d => d.id === e.dreamId) : null;
        div.className = 'dream-evo-item';
        div.innerHTML = `<div class="dream-card" style="margin:8px 16px 0;">
          <div class="dream-card-header">
            <div class="dream-card-title">&#x1F4A4; Dream #${dd?dd.id:'?'} &middot; Termin&eacute;</div>
            <div class="dream-card-badge">${e.time}</div>
          </div>
          <div style="font-size:9.5px;color:var(--t2);line-height:1.45;margin-bottom:6px;font-style:italic;">"${dd?dd.insight:e.desc}"</div>
          ${dd?`<div class="dream-scenario-list">${dd.scenarios.slice(0,3).map(s=>`
            <div class="dream-scenario">
              <div class="dream-scenario-icon">${s.icon}</div>
              <div class="dream-scenario-body">
                <div class="dream-scenario-name">${s.name}</div>
                <div class="dream-scenario-sub">${s.calibration?'&#x26A1; '+s.calibration.type:'&#x2713; Stable'}</div>
              </div>
              <div class="dream-scenario-vote" style="color:${s.outcome&&s.outcome.survived?'var(--up)':'var(--down)'}">
                ${s.outcome&&s.outcome.survived?'&#x2713;':'&#x26A0;'} ${s.outcome?(s.outcome.priceDelta*100>0?'+':'')+Math.round(s.outcome.priceDelta*100)+'%':''}
              </div>
            </div>`).join('')}</div>`:''}
        </div>`;
      } else if(e.type === 'pair') {
        div.className = 'evo-item';
        div.innerHTML = `
          <div class="evo-icon" style="background:rgba(245,200,66,.12);font-size:16px;">&#x1F310;</div>
          <div class="evo-content">
            <div class="evo-title">${e.title}</div>
            <div class="evo-sub">${e.desc}</div>
            <div class="evo-time">${e.time}</div>
          </div>`;
      } else {
        div.className = 'evo-item';
        div.innerHTML = `
          <div class="evo-icon" style="background:${e.type==='new'?'rgba(0,232,122,.1)':'rgba(255,61,107,.1)'}">
            ${e.type==='new'?'&#x1F9EC;':'&#x26B0;'}
          </div>
          <div class="evo-content">
            <div class="evo-title">${e.title}</div>
            <div class="evo-sub">${e.desc}</div>
            <div class="evo-time">${e.time}</div>
          </div>`;
      }
      ev.appendChild(div);
    });
  }
}
// ============================================================
// AGENT PAGE TABS
// ============================================================
function switchAgentTab(tab, el) {
  ['agents','learn','evo'].forEach(t => {
    const panel = document.getElementById('agentPanel-'+t);
    const btn   = document.getElementById('tab-'+t);
    if(panel) panel.style.display = t===tab ? '' : 'none';
    if(btn)   btn.classList.toggle('active', t===tab);
  });
  if(tab === 'learn') renderLearningHistory();
  if(tab === 'evo')   { renderAgentsEvo(); if(S.dreamActive) setTimeout(renderAgentsEvo, 800); }
}

