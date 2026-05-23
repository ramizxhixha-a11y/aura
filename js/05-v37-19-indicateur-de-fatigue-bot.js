// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 05/10
// Contient : v37-19-indicateur-de-fatigue-bot, v43-13-export-rapport-pdf-mensuel, v47-mode-zen, v55-picture-in-picture
// ════════════════════════════════════════════════════════════
// ═══ v37 · #19 INDICATEUR DE FATIGUE BOT ═══
// Score de "fatigue" 0-100 calculé sur 6 facteurs :
// 1. Pertes consécutives globales   2. Agents dégradés
// 3. Positions longues durées       4. Cycles depuis dernier gain
// 5. Fréquence de trading           6. Drawdown actuel

function computeBotFatigue() {
  let fatigue = 0;
  const factors = [];
  const agents  = S.agents || [];
  const openPos = S.openPositions || [];
  const ps      = S.pairStates || {};

  // ── Facteur 1 : Pertes consécutives globales (max 25pts) ──
  const consecLoss = S.paperRealConsecLosses || 0;
  const maxConsec  = S.paperRealConfig?.maxConsecLosses || 3;
  const consecPct  = Math.min(1, consecLoss / maxConsec);
  const consecFat  = Math.round(consecPct * 25);
  fatigue += consecFat;
  factors.push({ icon:'🔴', label:'Pertes consécutives', val:consecLoss+'/'+maxConsec,
    pct:consecPct, fat:consecFat,
    desc: consecLoss===0 ? 'Aucune perte récente' : consecLoss+' pertes consécutives · seuil '+maxConsec });

  // ── Facteur 2 : Agents dégradés (max 20pts) ──
  const brokenPct = agents.length>0 ? agents.filter(a=>(a.fitness||0)<150).length/agents.length : 0;
  const brokenFat = Math.round(brokenPct * 20);
  fatigue += brokenFat;
  factors.push({ icon:'🤖', label:'Agents dégradés', val:Math.round(brokenPct*100)+'%',
    pct:brokenPct, fat:brokenFat,
    desc:`${agents.filter(a=>(a.fitness||0)<150).length}/${agents.length} agents sous 150 T$` });

  // ── Facteur 3 : Positions bloquées trop longtemps (max 20pts) ──
  const now = Date.now();
  const longPos = openPos.filter(p=>p.entryTs && (now-p.entryTs)>7200000); // >2h
  const longPosPct = openPos.length>0 ? longPos.length/openPos.length : 0;
  const longPosFat = Math.min(20, longPos.length * 8);
  fatigue += longPosFat;
  factors.push({ icon:'⏰', label:'Positions bloquées >2h', val:longPos.length,
    pct:Math.min(1,longPosFat/20), fat:longPosFat,
    desc: longPos.length===0 ? 'Toutes les positions récentes' : longPos.map(p=>p.pair).join(', ') });

  // ── Facteur 4 : Cycles sans trade (max 15pts) ──
  const allTrades = Object.values(ps).flatMap(p=>(p.trades||[]).filter(t=>t.type==='position'));
  const lastTradeTs = allTrades.length>0 ? Math.max(...allTrades.map(t=>t.ts||0)) : 0;
  const minsSinceLastTrade = lastTradeTs>0 ? (now-lastTradeTs)/60000 : 0;
  const silenceFat = lastTradeTs>0 ? Math.min(15, Math.round(minsSinceLastTrade/20)) : 0;
  fatigue += silenceFat;
  factors.push({ icon:'😴', label:'Silence depuis dernier trade',
    val: lastTradeTs>0 ? (minsSinceLastTrade<60?Math.round(minsSinceLastTrade)+'min':Math.round(minsSinceLastTrade/60)+'h') : '—',
    pct:Math.min(1,silenceFat/15), fat:silenceFat,
    desc: lastTradeTs===0 ? 'Aucun trade enregistré' : 'Il y a '+Math.round(minsSinceLastTrade)+'min' });

  // ── Facteur 5 : Drawdown (max 10pts) ──
  const dd = Math.abs(S.perf?.maxDrawdown || 0) * 100;
  const ddFat = Math.min(10, Math.round(dd/2));
  fatigue += ddFat;
  factors.push({ icon:'📉', label:'Drawdown actuel', val:dd.toFixed(1)+'%',
    pct:Math.min(1,ddFat/10), fat:ddFat,
    desc: dd<3 ? 'Drawdown minimal' : dd<8 ? 'Drawdown modéré' : 'Drawdown important' });

  // ── Facteur 6 : Streaks de pertes par paire (max 10pts) ──
  const lossStreaks = S._lossStreaks || {};
  const maxStreak = Math.max(0, ...Object.values(lossStreaks).map(s=>s.current||0));
  const streakFat = Math.min(10, maxStreak * 3);
  fatigue += streakFat;
  factors.push({ icon:'💔', label:'Streak pertes max (paire)', val:maxStreak>0?'-'+maxStreak:'—',
    pct:Math.min(1,streakFat/10), fat:streakFat,
    desc: maxStreak===0 ? 'Aucun streak de pertes' : 'Pire streak : '+maxStreak+' pertes consécutives' });

  fatigue = Math.min(100, Math.max(0, fatigue));

  // Label
  const label = fatigue >= 75 ? 'ÉPUISÉ'
              : fatigue >= 50 ? 'FATIGUÉ'
              : fatigue >= 25 ? 'ACTIF'
              : 'FRAIS';
  const color = fatigue >= 75 ? 'var(--down)'
              : fatigue >= 50 ? '#f97316'
              : fatigue >= 25 ? 'var(--gold)'
              : 'var(--up)';

  // Recommandation
  const reco = fatigue >= 75 ? '⛔ Pause recommandée — réduire les stakes ou mettre en pause le bot.'
             : fatigue >= 50 ? '⚠️ Surveille le bot de près — possible dégradation des performances.'
             : fatigue >= 25 ? '✅ Bot en bonne forme — quelques signaux à surveiller.'
             : '🚀 Bot au top — conditions optimales pour trader.';

  // Fatigue par paire
  const pairFatigue = {};
  Object.entries(ps).forEach(([pair, pstate])=>{
    let pf = 0;
    const streak = lossStreaks[pair]?.current || 0;
    pf += Math.min(40, streak * 15);
    const hasLongPos = openPos.some(p=>p.pair===pair && p.entryTs && (now-p.entryTs)>7200000);
    if(hasLongPos) pf += 30;
    const pairWR = pstate.totalTrades>0 ? (pstate.winTrades||0)/pstate.totalTrades : null;
    if(pairWR !== null && pairWR < 0.4) pf += 30;
    pairFatigue[pair] = Math.min(100, pf);
  });

  return { fatigue, label, color, factors, reco, pairFatigue };
}
window.computeBotFatigue = computeBotFatigue;

function renderFatigueBotSection() {
  const el = document.getElementById('fatigueBotSection');
  if(!el) return;

  const { fatigue, label, color, factors, reco, pairFatigue } = computeBotFatigue();
  const barPct = fatigue.toFixed(1);

  el.innerHTML = `
    <div class="fb-section">
      <div class="fb-title">
        😴 Indicateur de Fatigue Bot
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Mis à jour en temps réel</span>
      </div>

      <!-- Jauge principale -->
      <div class="fb-gauge-wrap">
        <div class="fb-gauge-num" style="color:${color};">${fatigue}</div>
        <div class="fb-gauge-lbl" style="color:${color};">${label}</div>
      </div>
      <div class="fb-gauge-bar">
        <div class="fb-gauge-cursor" style="left:${barPct}%;color:${color};"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--t3);margin-bottom:10px;">
        <span>0 — Frais</span><span>50 — Fatigué</span><span>100 — Épuisé</span>
      </div>

      <!-- Recommandation -->
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:10px;color:var(--t2);line-height:1.5;">
        ${reco}
      </div>

      <!-- Facteurs -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Facteurs analysés</div>
      ${factors.map(f=>{
        const fc = f.fat>=15?'var(--down)':f.fat>=8?'var(--gold)':'var(--up)';
        return `<div class="fb-factor">
          <div class="fb-factor-icon">${f.icon}</div>
          <div class="fb-factor-body">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:var(--t2);">${f.label}</span>
              <span style="font-family:var(--font-mono);font-weight:700;color:${fc};font-size:10px;">+${f.fat}pts</span>
            </div>
            <div class="fb-factor-bar">
              <div class="fb-factor-fill" style="width:${Math.round(f.pct*100)}%;background:${fc};"></div>
            </div>
            <div style="font-size:8px;color:var(--t3);">${f.desc} · val: ${f.val}</div>
          </div>
        </div>`;
      }).join('')}

      <!-- Fatigue par paire -->
      <div style="font-size:9px;color:var(--t3);margin:10px 0 6px;">Fatigue par paire</div>
      <div class="fb-pair-grid">
        ${Object.entries(pairFatigue).sort((a,b)=>b[1]-a[1]).map(([pair,pf])=>{
          const pc = pf>=70?'var(--down)':pf>=40?'var(--gold)':'var(--up)';
          return `<div class="fb-pair-card">
            <div class="fb-pair-name" style="color:${PAIRS[pair]?.color||'var(--t1)'};">${pair.replace('/USDT','')}</div>
            <div class="fb-pair-bar"><div class="fb-pair-fill" style="width:${pf}%;background:${pc};"></div></div>
            <div class="fb-pair-val">${pf}% · ${pf>=70?'Repos':pf>=40?'Surveille':'OK'}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}
window.renderFatigueBotSection = renderFatigueBotSection;
// ═══ v38 · #28 MODE HEDGE AUTOMATIQUE ═══
// Interface de contrôle du système de hedging défensif existant
// + Hedge manuel instantané + Log des actions hedge

function toggleHedging() {
  if(!S.paperRealConfig) S.paperRealConfig = {};
  S.paperRealConfig.hedgingEnabled = !S.paperRealConfig.hedgingEnabled;
  showToast(S.paperRealConfig.hedgingEnabled ? '🛡️ Hedge automatique activé' : '⏸ Hedge automatique désactivé', 2000, 'win');
  renderHedgeAutoSection();
}
window.toggleHedging = toggleHedging;

function updateHedgeParam(key, val) {
  if(!S.paperRealConfig) S.paperRealConfig = {};
  S.paperRealConfig[key] = parseFloat(val) || 0;
  renderHedgeAutoSection();
}
window.updateHedgeParam = updateHedgeParam;

// Hedge manuel immédiat sur la paire la plus volatile
function manualHedge() {
  const candidate = typeof _findMostVolatilePair==='function' ? _findMostVolatilePair() : null;
  if(!candidate) { showToast('⚠ Aucune paire candidate pour le hedge', 2000, 'warn'); return; }
  const stake = Math.max(10, (S.tradingAccount||0) * 0.02);
  if(stake > (S.tradingAccount||0)) { showToast('⚠ Capital insuffisant pour le hedge', 2000, 'warn'); return; }
  // Ouvrir une position SHORT défensive
  try {
    if(typeof autoOpenPosition === 'function') {
      autoOpenPosition(candidate, 'short', stake);
      showToast('🛡️ Hedge ouvert : '+candidate+' SHORT $'+stake.toFixed(0), 3000, 'win');
    } else {
      showToast('⚠ Moteur d\'ouverture indisponible', 2000, 'warn');
    }
  } catch(e) {
    showToast('⚠ Erreur hedge : '+e.message, 2000, 'warn');
  }
  renderHedgeAutoSection();
}
window.manualHedge = manualHedge;

// Fermer tous les hedges ouverts
function closeAllHedges() {
  const hedgePos = (S.openPositions||[]).filter(p=>p._isHedge||false);
  if(hedgePos.length===0) { showToast('Aucun hedge à fermer', 1500, 'user'); return; }
  hedgePos.forEach(p=>{ try { if(typeof closePosition==='function') closePosition(p.id, false); } catch(e){} });
  showToast('✅ '+hedgePos.length+' hedge(s) fermé(s)', 2000, 'win');
  renderHedgeAutoSection();
}
window.closeAllHedges = closeAllHedges;

function renderHedgeAutoSection() {
  const el = document.getElementById('hedgeAutoSection');
  if(!el) return;

  const cfg      = S.paperRealConfig || {};
  const enabled  = cfg.hedgingEnabled || false;
  const adapt    = S.adaptiveState   || {};
  const lastAct  = adapt.lastHedgeAction;
  const hedgeActive = adapt.hedgeActive || false;
  const stress   = typeof _detectSystemicBearStress==='function' ? _detectSystemicBearStress() : {streak:0,regime:'calm'};
  const triggerStreak = cfg.hedgingTriggerBearStreak || 3;
  const maxAlloc = cfg.hedgingMaxAllocPct || 2.0;
  const openHedges = (S.openPositions||[]).filter(p=>p.side==='short'&&p.auto===true);

  // Log des 5 dernières entrées chain sur le hedge
  const hedgeLog = (S.chainLog||[]).filter(e=>e.icon==='🛡️').slice(-5).reverse();

  // Statut
  const statusClass = !enabled ? 'off' : hedgeActive ? 'active' : stress.streak>=triggerStreak ? 'triggered' : 'on';
  const statusLabel = !enabled ? 'Désactivé' : hedgeActive ? '🛡️ Hedge actif' : stress.streak>=triggerStreak ? '⚡ Seuil atteint' : '✅ En veille';
  const statusColor = !enabled ? 'var(--t3)' : hedgeActive ? 'var(--up)' : stress.streak>=triggerStreak ? 'var(--gold)' : 'var(--ice)';

  el.innerHTML = `
    <div class="hg-section">
      <div class="hg-title">
        🛡️ Hedge Automatique
        <span style="font-size:9px;font-weight:700;color:${statusColor};">${statusLabel}</span>
      </div>

      <!-- Statut actuel -->
      <div class="hg-status-card ${statusClass}">
        <div class="hg-status-header">
          <span class="hg-status-title">${enabled ? 'Système actif' : 'Système désactivé'}</span>
          <span class="hg-badge" style="background:${enabled?'rgba(56,212,245,.12)':'rgba(255,255,255,.06)'};color:${enabled?'var(--ice)':'var(--t3)'};">${enabled?'ON':'OFF'}</span>
        </div>
        <div class="hg-row"><span style="color:var(--t3);">Stress marché actuel</span><span style="font-weight:700;color:${stress.streak>=triggerStreak?'var(--down)':stress.streak>0?'var(--gold)':'var(--up)'};">${stress.streak} BEAR / ${triggerStreak} seuil</span></div>
        <div class="hg-row"><span style="color:var(--t3);">Régime détecté</span><span style="font-weight:700;color:var(--t1);">${(stress.regime||'calm').toUpperCase()}</span></div>
        <div class="hg-row"><span style="color:var(--t3);">Positions SHORT actives</span><span style="font-weight:700;color:${openHedges.length>0?'var(--up)':'var(--t3)'};">${openHedges.length}</span></div>
        ${lastAct ? `<div class="hg-row"><span style="color:var(--t3);">Dernier déclenchement</span><span style="font-weight:700;color:var(--gold);">${lastAct.candidate?.replace('/USDT','')||'?'} · $${lastAct.stake||'?'}</span></div>` : ''}
      </div>

      <!-- Paramètres -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Paramètres</div>
      <div class="hg-param-row">
        <span class="hg-param-lbl">Seuil BEAR streak (bougies)</span>
        <input type="number" class="hg-param-input" value="${triggerStreak}" min="1" max="10" step="1"
          onchange="updateHedgeParam('hedgingTriggerBearStreak',this.value)">
      </div>
      <div class="hg-param-row">
        <span class="hg-param-lbl">Allocation max hedge (% capital)</span>
        <input type="number" class="hg-param-input" value="${maxAlloc}" min="0.5" max="10" step="0.5"
          onchange="updateHedgeParam('hedgingMaxAllocPct',this.value)">
      </div>

      <!-- Boutons -->
      <button class="hg-toggle-btn" onclick="toggleHedging()"
        style="background:${enabled?'rgba(255,255,255,.04)':'rgba(56,212,245,.1)'};border-color:${enabled?'var(--border)':'rgba(56,212,245,.3)'};color:${enabled?'var(--t3)':'var(--ice)'};">
        ${enabled ? '⏸ Désactiver le hedge auto' : '▶ Activer le hedge auto'}
      </button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
        <button onclick="manualHedge()" style="padding:8px;border-radius:7px;background:rgba(245,200,66,.1);border:1px solid rgba(245,200,66,.3);color:var(--gold);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;">🛡️ Hedge manuel</button>
        <button onclick="closeAllHedges()" style="padding:8px;border-radius:7px;background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.25);color:var(--down);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;">✕ Fermer hedges</button>
      </div>

      <!-- Log hedge -->
      ${hedgeLog.length>0 ? `
        <div style="font-size:9px;color:var(--t3);margin:10px 0 5px;">Journal hedge</div>
        ${hedgeLog.map(e=>`<div class="hg-log-item">
          <span style="font-size:14px;">🛡️</span>
          <div>
            <div style="color:var(--t2);line-height:1.4;">${e.desc||''}</div>
            <div style="color:var(--t3);font-size:8px;">${e.time||'—'}</div>
          </div>
        </div>`).join('')}` : `
        <div style="text-align:center;padding:10px;font-size:9px;color:var(--t3);">
          Aucune action hedge enregistrée — le hedge se déclenche automatiquement en régime BEAR prolongé.
        </div>`}
    </div>`;
}
window.renderHedgeAutoSection = renderHedgeAutoSection;
// ═══ v39 · #30 OPTIMISEUR DE TIMING D'ENTRÉE ═══
// Analyse les signaux actuels + historique heatmap + ML
// pour scorer le moment optimal d'entrée sur une paire (0-100)

let _otPair = null;

// Calculer le score de timing pour une paire donnée
function computeTimingScore(pair) {
  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps || !cfg) return null;

  const signals = [];
  let score = 50; // base neutre

  // ── Signal 1 : LMSR conviction (max ±20) ──
  const prob = typeof lmsrP==='function' ? lmsrP(ps) : 0.5;
  const lmsrDelta = (prob - 0.5) * 40;
  score += lmsrDelta;
  signals.push({ icon:'🧠', label:'LMSR Conviction', val:(prob*100).toFixed(0)+'%',
    pct: Math.abs(prob-0.5)*2, col: lmsrDelta>0?'var(--up)':'var(--down)',
    dir: lmsrDelta>0?'Haussier':'Baissier', delta:lmsrDelta });

  // ── Signal 2 : RSI position (max ±15) ──
  const rsi = ps.rsi14 || 50;
  let rsiDelta = 0;
  if(rsi < 30)       rsiDelta =  15; // survente → rebond probable
  else if(rsi < 40)  rsiDelta =   8;
  else if(rsi > 70)  rsiDelta = -15; // surachat → retournement probable
  else if(rsi > 60)  rsiDelta =  -8;
  score += rsiDelta;
  signals.push({ icon:'⚡', label:'RSI 14', val:rsi.toFixed(0),
    pct: Math.abs(rsiDelta)/15, col: rsiDelta>0?'var(--up)':rsiDelta<0?'var(--down)':'var(--t3)',
    dir: rsiDelta>5?'Survente':rsiDelta<-5?'Surachat':'Neutre', delta:rsiDelta });

  // ── Signal 3 : Momentum (max ±10) ──
  const mom = ps.momentum || 0;
  const momDelta = Math.max(-10, Math.min(10, mom * 500));
  score += momDelta;
  signals.push({ icon:'💨', label:'Momentum', val:(mom*100).toFixed(3)+'%',
    pct: Math.abs(momDelta)/10, col: momDelta>0?'var(--up)':momDelta<0?'var(--down)':'var(--t3)',
    dir: momDelta>3?'Positif':momDelta<-3?'Négatif':'Plat', delta:momDelta });

  // ── Signal 4 : Heure optimale (heatmap) (max ±10) ──
  const hm = S.heatmap || {};
  const h  = new Date().getHours();
  const hourData = hm.byHour?.[h] || { count:0, pnl:0, wins:0 };
  let hourDelta = 0;
  if(hourData.count >= 3) {
    const hourWR = hourData.wins / hourData.count;
    hourDelta = Math.max(-10, Math.min(10, (hourWR - 0.5) * 20));
  }
  score += hourDelta;
  signals.push({ icon:'🕐', label:`Heure actuelle (${h}h)`,
    val: hourData.count>=2 ? Math.round((hourData.wins/(hourData.count||1))*100)+'% WR ('+hourData.count+' trades)' : 'Pas de données',
    pct: Math.abs(hourDelta)/10, col: hourDelta>0?'var(--up)':hourDelta<0?'var(--down)':'var(--t3)',
    dir: hourDelta>3?'Créneau favorable':hourDelta<-3?'Créneau défavorable':'Neutre', delta:hourDelta });

  // ── Signal 5 : Régime marché (max ±10) ──
  const regime = ps.regime || (typeof detectMarketRegime==='function' ? detectMarketRegime() : 'calm');
  const regimeDelta = { bull:10, volatile_bull:5, calm:0, volatile:-3, volatile_bear:-8, bear:-10 }[regime] || 0;
  score += regimeDelta;
  signals.push({ icon:'📊', label:'Régime marché', val:regime.toUpperCase(),
    pct: Math.abs(regimeDelta)/10, col: regimeDelta>0?'var(--up)':regimeDelta<0?'var(--down)':'var(--t3)',
    dir: regimeDelta>0?'Favorable':'Défavorable ou neutre', delta:regimeDelta });

  // ── Signal 6 : Fatigue paire (max -10) ──
  const fat = computeBotFatigue?.();
  const pairFat = fat?.pairFatigue?.[pair] || 0;
  const fatDelta = -Math.round(pairFat / 10);
  score += fatDelta;
  signals.push({ icon:'😴', label:'Fatigue paire', val:pairFat+'%',
    pct: pairFat/100, col: pairFat>=50?'var(--down)':'var(--t3)',
    dir: pairFat>=70?'Paire fatiguée':pairFat>=40?'Légère fatigue':'Paire fraîche', delta:fatDelta });

  // Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Label
  const label = score >= 75 ? 'ENTRER MAINTENANT'
              : score >= 60 ? 'MOMENT FAVORABLE'
              : score >= 45 ? 'ATTENDRE'
              : score >= 30 ? 'DÉCONSEILLÉ'
              : 'ÉVITER';
  const color = score >= 75 ? 'var(--up)'
              : score >= 60 ? '#84cc16'
              : score >= 45 ? 'var(--gold)'
              : score >= 30 ? '#f97316'
              : 'var(--down)';

  // Meilleures fenêtres de trading (heatmap)
  const bestWindows = [];
  if(hm.byHour) {
    const hourRanked = Array.from({length:24},(_,i)=>({h:i,...(hm.byHour[i]||{count:0,pnl:0,wins:0})}))
      .filter(x=>x.count>=2).sort((a,b)=>b.pnl-a.pnl).slice(0,3);
    hourRanked.forEach(hw=>{
      const wr = Math.round(hw.wins/hw.count*100);
      bestWindows.push({ label:hw.h+'h', val:'+$'+hw.pnl.toFixed(2), sub:wr+'%WR · '+hw.count+' trades', best:true });
    });
  }

  // Signal ML prédiction
  const mlPred = typeof predictNextCandle==='function' ? predictNextCandle(pair) : null;
  if(mlPred) {
    signals.push({ icon:'🔮', label:'Prédiction ML', val:mlPred.direction+' '+mlPred.confidence+'%',
      pct: mlPred.confidence/100, col: mlPred.direction==='HAUSSE'?'var(--up)':mlPred.direction==='BAISSE'?'var(--down)':'var(--t3)',
      dir: mlPred.direction, delta: mlPred.direction==='HAUSSE'?5:mlPred.direction==='BAISSE'?-5:0 });
  }

  return { score, label, color, signals, bestWindows, pair };
}
window.computeTimingScore = computeTimingScore;

function renderTimingOptSection() {
  const el = document.getElementById('timingOptSection');
  if(!el) return;

  const pairs = Object.keys(PAIRS||{});
  if(!_otPair || !pairs.includes(_otPair)) _otPair = pairs[0];

  const t = computeTimingScore(_otPair);
  if(!t) return;

  const barPct = t.score.toFixed(0);

  el.innerHTML = `
    <div class="ot-section">
      <div class="ot-title">
        ⏱️ Optimiseur de Timing
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Score d'entrée optimal</span>
      </div>

      <!-- Sélecteur paire -->
      <div class="ot-pair-select">
        ${pairs.map(p=>`<button class="ot-pair-btn ${p===_otPair?'active':''}"
          onclick="_otPair='${p}';renderTimingOptSection();">${p.replace('/USDT','')}</button>`).join('')}
      </div>

      <!-- Score principal -->
      <div class="ot-score-main">
        <div class="ot-score-num" style="color:${t.color};">${t.score}</div>
        <div class="ot-score-lbl" style="color:${t.color};">${t.label}</div>
      </div>
      <div class="ot-bar">
        <div class="ot-bar-cursor" style="left:${barPct}%;color:${t.color};"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--t3);margin-bottom:10px;">
        <span>0 — Éviter</span><span>50 — Neutre</span><span>100 — Optimal</span>
      </div>

      <!-- Signaux -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Signaux analysés</div>
      ${t.signals.map(s=>`
        <div class="ot-signal-row">
          <span class="ot-signal-icon">${s.icon}</span>
          <span style="color:var(--t2);min-width:120px;font-size:9px;">${s.label}</span>
          <div class="ot-signal-bar">
            <div class="ot-signal-fill" style="width:${Math.round(s.pct*100)}%;background:${s.col};"></div>
          </div>
          <span style="color:${s.col};font-size:9px;font-weight:700;min-width:45px;text-align:right;">${s.delta>=0?'+':''}${s.delta.toFixed(0)}pts</span>
        </div>
        <div style="font-size:8px;color:var(--t3);margin:-2px 0 4px 21px;">${s.dir} · ${s.val}</div>`).join('')}

      <!-- Meilleures fenêtres -->
      ${t.bestWindows.length>0 ? `
        <div style="font-size:9px;color:var(--t3);margin-top:10px;margin-bottom:5px;">Meilleures fenêtres (heatmap)</div>
        <div class="ot-window-grid">
          ${t.bestWindows.map((w,i)=>`
            <div class="ot-window-card ${w.best&&i===0?'best':''}">
              <span class="ot-window-val" style="color:${i===0?'var(--up)':'var(--t1)'};">${w.label}</span>
              <span style="font-size:10px;font-weight:700;color:var(--up);display:block;">${w.val}</span>
              <span class="ot-window-lbl">${w.sub}</span>
            </div>`).join('')}
        </div>` : `<div style="font-size:9px;color:var(--t3);margin-top:8px;text-align:center;">Heatmap vide — fais quelques trades pour calibrer les fenêtres optimales.</div>`}
    </div>`;
}
window.renderTimingOptSection = renderTimingOptSection;
// ═══ v40 · #16 PYRAMIDE DE POSITIONS (Averaging Down Intelligent) ═══
// Ajouter des entrées à une position existante selon des règles de sécurité :
// - Prix plus favorable que l'entrée initiale
// - Max 3 entrées totales par position
// - Stake dégressif (×0.6 par entrée supplémentaire)
// - Capital disponible suffisant

const _PY_CFG = {
  maxEntries:    3,     // max entrées par position
  stakeDecay:    0.6,   // mise ×0.6 à chaque entrée
  minDropPct:    0.5,   // prix doit avoir baissé (LONG) ou monté (SHORT) de X% avant d'ajouter
};

// Ajouter une entrée à une position existante (averaging down/up)
function pyramidPosition(posId) {
  const pos = (S.openPositions||[]).find(p=>p.id===posId);
  if(!pos) { showToast('⚠ Position introuvable', 1500, 'warn'); return; }

  const ps     = S.pairStates[pos.pair];
  const price  = ps?.price || pos.entryPrice;
  const entries= pos._pyramidEntries || [];

  // Vérifications sécurité
  if(entries.length >= _PY_CFG.maxEntries - 1) {
    showToast('⚠ Maximum '+_PY_CFG.maxEntries+' entrées atteint', 2000, 'warn'); return;
  }

  // Vérifier que le prix est plus favorable (LONG = prix baissé, SHORT = prix monté)
  const dropPct = pos.side==='long'
    ? (pos.entryPrice - price) / pos.entryPrice * 100
    : (price - pos.entryPrice) / pos.entryPrice * 100;

  if(dropPct < _PY_CFG.minDropPct) {
    showToast(`⚠ Prix pas assez favorable (${dropPct.toFixed(2)}% vs min ${_PY_CFG.minDropPct}%)`, 2500, 'warn');
    return;
  }

  // Calculer la mise de cette entrée
  const baseStake = pos.stakeUsdt || 10;
  const newStake  = Math.max(5, baseStake * Math.pow(_PY_CFG.stakeDecay, entries.length + 1));
  const rounded   = Math.round(newStake / 5) * 5;

  if(rounded > (S.tradingAccount||0)) {
    showToast('⚠ Capital insuffisant ($'+S.tradingAccount?.toFixed(0)+')', 2000, 'warn'); return;
  }

  // Ajouter l'entrée
  if(!pos._pyramidEntries) pos._pyramidEntries = [];
  pos._pyramidEntries.push({ price, stake:rounded, ts:Date.now() });

  // Mettre à jour l'entrée moyenne
  const allEntries = [{ price:pos.entryPrice, stake:pos.stakeUsdt }, ...pos._pyramidEntries];
  const totalStake = allEntries.reduce((s,e)=>s+e.stake,0);
  const avgEntry   = allEntries.reduce((s,e)=>s+e.price*e.stake,0) / totalStake;

  pos._avgEntryPrice = avgEntry;
  pos.stakeUsdt      = totalStake;
  pos.totalExposure  = totalStake;

  // Déduire du capital
  S.tradingAccount = Math.max(0, (S.tradingAccount||0) - rounded);

  // Log
  S.chainLog.push({ icon:'📐', desc:`Pyramide: +$${rounded} sur ${pos.pair} ${pos.side.toUpperCase()} · Entrée ${entries.length+2}/${_PY_CFG.maxEntries} · Prix moy: ${avgEntry.toFixed(PAIRS[pos.pair]?.dec>=4?PAIRS[pos.pair].dec:2)}`, hash:rndHash(), time:nowStr() });
  showToast('📐 Entrée ajoutée · $'+rounded+' · Prix moy: '+avgEntry.toFixed(2), 2500, 'win');
  renderPyramideSection();
}
window.pyramidPosition = pyramidPosition;

function renderPyramideSection() {
  const el = document.getElementById('pyramideSection');
  if(!el) return;

  const openPos = (S.openPositions||[]);
  const hasPos  = openPos.length > 0;

  el.innerHTML = `
    <div class="py-section">
      <div class="py-title">
        📐 Pyramide de Positions
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Averaging intelligent</span>
      </div>

      <!-- Paramètres -->
      <div class="py-params">
        <div class="py-param">
          <label>Max entrées</label>
          <input type="number" value="${_PY_CFG.maxEntries}" min="2" max="5"
            onchange="_PY_CFG.maxEntries=parseInt(this.value);renderPyramideSection();">
        </div>
        <div class="py-param">
          <label>Drop min. (%)</label>
          <input type="number" value="${_PY_CFG.minDropPct}" min="0.1" max="5" step="0.1"
            onchange="_PY_CFG.minDropPct=parseFloat(this.value);renderPyramideSection();">
        </div>
        <div class="py-param">
          <label>Decay mise</label>
          <input type="number" value="${_PY_CFG.stakeDecay}" min="0.3" max="1" step="0.05"
            onchange="_PY_CFG.stakeDecay=parseFloat(this.value);renderPyramideSection();">
        </div>
        <div class="py-param">
          <label>Capital libre</label>
          <input type="text" value="$${(S.tradingAccount||0).toFixed(0)}" readonly
            style="color:var(--ice);">
        </div>
      </div>

      ${!hasPos
        ? `<div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Ouvre une position pour utiliser la pyramide.</div>`
        : openPos.map(pos=>{
            const ps      = S.pairStates[pos.pair];
            const price   = ps?.price || pos.entryPrice;
            const cfg     = PAIRS[pos.pair];
            const dec     = cfg?.dec>=4?cfg.dec:2;
            const entries = pos._pyramidEntries || [];
            const nEntries= entries.length + 1;
            const avgEntry= pos._avgEntryPrice || pos.entryPrice;
            const pnl     = pos.pnlUsdt || 0;
            const pnlCol  = pnl>=0?'var(--up)':'var(--down)';
            const canAdd  = nEntries < _PY_CFG.maxEntries;
            const dropPct = pos.side==='long'
              ? (pos.entryPrice - price) / pos.entryPrice * 100
              : (price - pos.entryPrice) / pos.entryPrice * 100;
            const nextStake = Math.round(pos.stakeUsdt * Math.pow(_PY_CFG.stakeDecay, nEntries) / 5) * 5;

            return `<div class="py-pos-card">
              <div class="py-pos-header">
                <span class="py-pos-name" style="color:${cfg?.color||'var(--t1)'};">
                  ${pos.pair.replace('/USDT','')} <span style="color:${pos.side==='long'?'var(--up)':'var(--down)'};">${pos.side==='long'?'↑ LONG':'↓ SHORT'}</span>
                </span>
                <span class="py-pos-pnl" style="color:${pnlCol};">${pnl>=0?'+':''}$${pnl.toFixed(2)}</span>
              </div>

              <!-- Entrées existantes -->
              <div class="py-entries">
                <div class="py-entry">
                  <div class="py-entry-dot" style="background:var(--ice);"></div>
                  <span style="color:var(--t2);">Entrée 1 (initiale)</span>
                  <span style="color:var(--t3);">${pos.entryPrice.toFixed(dec)}</span>
                  <span style="font-weight:700;">$${pos.stakeUsdt.toFixed(0)}</span>
                </div>
                ${entries.map((e,i)=>`<div class="py-entry">
                  <div class="py-entry-dot" style="background:var(--pur);"></div>
                  <span style="color:var(--t2);">Entrée ${i+2}</span>
                  <span style="color:var(--t3);">${e.price.toFixed(dec)}</span>
                  <span style="font-weight:700;">$${e.stake.toFixed(0)}</span>
                </div>`).join('')}
              </div>

              <!-- Prix moyen -->
              <div class="py-avg-line">
                <span style="color:var(--t3);">Prix moyen pondéré</span>
                <span style="font-weight:700;color:var(--ice);">${avgEntry.toFixed(dec)}</span>
                <span style="font-size:9px;color:var(--t3);">entrée ${nEntries}/${_PY_CFG.maxEntries}</span>
              </div>

              <!-- Bouton ajouter -->
              ${canAdd
                ? `<button class="py-add-btn"
                    onclick="pyramidPosition('${pos.id}')"
                    style="background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.3);color:var(--pur);">
                    📐 Ajouter entrée ${nEntries+1} · $${nextStake}
                    ${dropPct < _PY_CFG.minDropPct
                      ? `<br><span style="font-size:8px;color:var(--gold);">⚠ Prix pas assez favorable (${dropPct.toFixed(2)}% / min ${_PY_CFG.minDropPct}%)</span>`
                      : `<br><span style="font-size:8px;color:var(--up);">✅ Prix favorable (${dropPct.toFixed(2)}%)</span>`}
                  </button>`
                : `<div style="text-align:center;font-size:9px;color:var(--t3);padding:6px;">Maximum ${_PY_CFG.maxEntries} entrées atteint</div>`}
            </div>`;
          }).join('')}
    </div>`;
}
window.renderPyramideSection = renderPyramideSection;
// ═══ v41 · #17 SORTIE PARTIELLE TP PAR PALIERS ═══
// 3 paliers de prise de profit : 33% position à +1%, +2%, +3%
// Calcul automatique du prix de chaque palier
// Déclenchement manuel ou surveillance automatique

const _SP_PALIERS_DEF = [
  { pct: 1.0, size: 33, label: 'TP1' },  // +1% → fermer 33%
  { pct: 2.0, size: 50, label: 'TP2' },  // +2% → fermer 50% du reste
  { pct: 3.0, size: 100, label: 'TP3' }, // +3% → fermer 100% du reste
];

// Fermeture partielle d'une position (X% de la taille restante)
function closePartial(posId, palierIdx) {
  const pos = (S.openPositions||[]).find(p=>p.id===posId);
  if(!pos) { showToast('⚠ Position introuvable', 1500, 'warn'); return; }

  if(!pos._spPaliers) pos._spPaliers = _SP_PALIERS_DEF.map(p=>({...p, hit:false, closedAt:null, pnlUsd:0}));
  const pal = pos._spPaliers[palierIdx];
  if(!pal || pal.hit) { showToast('⚠ Palier déjà atteint', 1500, 'warn'); return; }

  const ps  = S.pairStates[pos.pair];
  const cur = ps?.price || pos.entryPrice;
  const cfg = PAIRS[pos.pair];
  const dec = cfg?.dec>=4 ? cfg.dec : 2;

  // Calculer le PnL sur la portion fermée
  const remainingStake = pos.stakeUsdt * _spRemainingFactor(pos._spPaliers, palierIdx);
  const closingStake   = remainingStake * (pal.size / 100);

  const rawPct = pos.side==='long'
    ? (cur - pos.entryPrice) / pos.entryPrice * 100
    : (pos.entryPrice - cur) / pos.entryPrice * 100;
  const pnlUsd = closingStake * rawPct / 100;
  const fee    = closingStake * (S.feeConfig?.takerRate||0.001) * 2;
  const netPnl = pnlUsd - fee;

  // Mettre à jour la position
  pal.hit       = true;
  pal.closedAt  = cur;
  pal.pnlUsd    = netPnl;
  pos.stakeUsdt -= closingStake;
  pos.totalExposure = pos.stakeUsdt;

  // Créditer le compte
  S.tradingAccount = (S.tradingAccount||0) + closingStake + netPnl;
  S.portfolio      = (S.cashAccount||0) + S.tradingAccount;

  // Log
  S.chainLog.push({ icon:'🎯', desc:`${pal.label} ${pos.pair} · fermé ${pal.size}% → +$${netPnl.toFixed(2)} net · prix ${cur.toFixed(dec)}`, hash:rndHash(), time:nowStr() });
  showToast('🎯 '+pal.label+' exécuté · +$'+netPnl.toFixed(2), 2500, 'win');
  renderSortiePartiSection();
  renderPyramideSection();
}
window.closePartial = closePartial;

// Calculer le facteur de position restante avant le palier idx
function _spRemainingFactor(paliers, upToIdx) {
  let factor = 1.0;
  for(let i=0; i<upToIdx; i++) {
    if(paliers[i]?.hit) factor *= (1 - paliers[i].size/100);
  }
  return factor;
}

// Surveillance automatique — vérifie si un palier est atteint
function checkSpPaliersAuto() {
  (S.openPositions||[]).forEach(pos=>{
    if(!pos._spEnabled || !pos._spPaliers) return;
    const ps  = S.pairStates[pos.pair];
    if(!ps) return;
    const cur = ps.price;
    const rawPct = pos.side==='long'
      ? (cur - pos.entryPrice) / pos.entryPrice * 100
      : (pos.entryPrice - cur) / pos.entryPrice * 100;

    pos._spPaliers.forEach((pal, i)=>{
      if(!pal.hit && rawPct >= pal.pct) closePartial(pos.id, i);
    });
  });
}
window.checkSpPaliersAuto = checkSpPaliersAuto;
setInterval(checkSpPaliersAuto, 5000); // check toutes les 5s

function toggleSpAuto(posId) {
  const pos = (S.openPositions||[]).find(p=>p.id===posId);
  if(!pos) return;
  pos._spEnabled = !pos._spEnabled;
  if(pos._spEnabled && !pos._spPaliers) {
    pos._spPaliers = _SP_PALIERS_DEF.map(p=>({...p, hit:false, closedAt:null, pnlUsd:0}));
  }
  showToast(pos._spEnabled ? '✅ Paliers auto activés' : '⏸ Paliers auto désactivés', 1500, 'win');
  renderSortiePartiSection();
}
window.toggleSpAuto = toggleSpAuto;

function renderSortiePartiSection() {
  const el = document.getElementById('sortiePartiSection');
  if(!el) return;

  const openPos = S.openPositions||[];

  el.innerHTML = `
    <div class="sp-section">
      <div class="sp-title">
        🎯 Sortie Partielle par Paliers
        <span style="font-size:8px;color:var(--t3);font-weight:400;">TP1/TP2/TP3 automatique</span>
      </div>

      ${openPos.length===0
        ? `<div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Ouvre une position pour configurer les paliers de TP.</div>`
        : openPos.map(pos=>{
            const ps      = S.pairStates[pos.pair];
            const cfg     = PAIRS[pos.pair];
            const dec     = cfg?.dec>=4?cfg.dec:2;
            const cur     = ps?.price || pos.entryPrice;
            const pnlPct  = pos.side==='long'
              ? (cur - pos.entryPrice)/pos.entryPrice*100
              : (pos.entryPrice - cur)/pos.entryPrice*100;
            const paliers = pos._spPaliers || _SP_PALIERS_DEF.map(p=>({...p, hit:false}));
            const pnlCol  = (pos.pnlUsdt||0)>=0?'var(--up)':'var(--down)';
            const hitCount= paliers.filter(p=>p.hit).length;
            const totalPnlPaliers = paliers.filter(p=>p.hit).reduce((s,p)=>s+(p.pnlUsd||0),0);

            // Prix cibles par palier
            const tp1Price = pos.side==='long' ? pos.entryPrice*(1+paliers[0].pct/100) : pos.entryPrice*(1-paliers[0].pct/100);
            const tp2Price = pos.side==='long' ? pos.entryPrice*(1+paliers[1].pct/100) : pos.entryPrice*(1-paliers[1].pct/100);
            const tp3Price = pos.side==='long' ? pos.entryPrice*(1+paliers[2].pct/100) : pos.entryPrice*(1-paliers[2].pct/100);
            const tpPrices = [tp1Price, tp2Price, tp3Price];

            return `<div class="sp-pos-card" style="border-color:${(pos.auto===true?'rgba(167,139,250,.2)':'var(--border)')+''};">
              <div class="sp-pos-header">
                <span style="font-size:12px;font-weight:800;color:${cfg?.color||'var(--t1)'};">
                  ${pos.pair.replace('/USDT','')} <span style="color:${pos.side==='long'?'var(--up)':'var(--down)'};">${pos.side==='long'?'↑':'↓'} ${pos.side.toUpperCase()}</span>
                </span>
                <div style="text-align:right;">
                  <span style="font-size:12px;font-weight:800;font-family:var(--font-mono);color:${pnlCol};">${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}%</span>
                  ${hitCount>0?`<span class="sp-remaining-badge" style="background:rgba(0,232,122,.1);color:var(--up);margin-left:5px;">+$${totalPnlPaliers.toFixed(2)} sécurisé</span>`:''}
                </div>
              </div>

              <!-- Barre progression P&L vs paliers -->
              <div class="sp-progress-wrap">
                <div class="sp-progress-track">
                  <div class="sp-progress-fill" style="width:${Math.min(100, Math.max(0, pnlPct/3*100)).toFixed(1)}%;"></div>
                  ${[33,66,100].map((x,i)=>`<div style="position:absolute;top:0;left:${x}%;width:2px;height:100%;background:rgba(255,255,255,.2);"></div>`).join('')}
                </div>
                <div style="display:flex;justify-content:space-between;font-size:7px;color:var(--t3);">
                  <span>0%</span><span>+1% TP1</span><span>+2% TP2</span><span>+3% TP3</span>
                </div>
              </div>

              <!-- Paliers -->
              ${paliers.map((pal,i)=>{
                const tpPrice = tpPrices[i];
                const distPct = Math.max(0, pal.pct - pnlPct);
                const progressPct = Math.min(100, pnlPct/pal.pct*100);
                const palCol = pal.hit?'var(--up)':pnlPct>=pal.pct?'var(--gold)':'var(--t3)';
                return `<div class="sp-palier">
                  <div class="sp-palier-dot ${pal.hit?'hit':'pending'}" style="color:${palCol};border-color:${palCol};"></div>
                  <span style="color:${palCol};font-weight:700;min-width:28px;">${pal.label}</span>
                  <span style="color:var(--t2);flex:1;">+${pal.pct}% → fermer ${pal.size}%</span>
                  <div class="sp-palier-bar"><div class="sp-palier-fill" style="width:${progressPct.toFixed(0)}%;background:${palCol};"></div></div>
                  ${pal.hit
                    ? `<span style="color:var(--up);font-weight:700;">+$${(pal.pnlUsd||0).toFixed(2)}</span>`
                    : `<button class="sp-close-btn" onclick="closePartial('${pos.id}',${i})"
                        style="background:rgba(0,232,122,.08);border-color:rgba(0,232,122,.25);color:var(--up);">
                        Exécuter
                      </button>`}
                </div>
                <div style="font-size:7px;color:var(--t3);margin:-2px 0 3px 16px;">Prix cible: ${tpPrice.toFixed(dec)} · ${pal.hit?'✅ Exécuté à '+pal.closedAt?.toFixed(dec):distPct>0?'reste +'+distPct.toFixed(2)+'%':'🟡 Seuil atteint'}</div>`;
              }).join('')}

              <!-- Toggle auto -->
              <button onclick="toggleSpAuto('${pos.id}')"
                style="width:100%;margin-top:8px;padding:6px;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;font-family:inherit;background:${pos._spEnabled?'rgba(0,232,122,.1)':'rgba(255,255,255,.04)'};border:1px solid ${pos._spEnabled?'rgba(0,232,122,.3)':'var(--border)'};color:${pos._spEnabled?'var(--up)':'var(--t3)'};">
                ${pos._spEnabled?'⚡ Paliers AUTO activés — surveillance active':'▶ Activer surveillance automatique'}
              </button>
            </div>`;
          }).join('')}
    </div>`;
}
window.renderSortiePartiSection = renderSortiePartiSection;
// ═══ v42 · #18 TRAILING STOP DYNAMIQUE ═══
// Interface de contrôle complète du trailing stop par position
// + Config globale (peakMin, trailDrop) + visualisation graphique

const _TS_GLOBAL_CFG = {
  peakMin:   1.0,  // % min de profit avant activation
  trailDrop: 0.5,  // % de retrait depuis le pic pour déclencher
  enabled:   true,
};

function setTsGlobal(key, val) {
  _TS_GLOBAL_CFG[key] = parseFloat(val) || 0;
  renderTrailingStopSection();
}
window.setTsGlobal = setTsGlobal;

// Activer/désactiver trailing sur une position spécifique
function togglePosTrailing(posId) {
  const pos = (S.openPositions||[]).find(p=>p.id===posId);
  if(!pos) return;
  pos._tsEnabled  = !pos._tsEnabled;
  pos._tsPeakMin  = pos._tsPeakMin  ?? _TS_GLOBAL_CFG.peakMin;
  pos._tsTrailDrop= pos._tsTrailDrop?? _TS_GLOBAL_CFG.trailDrop;
  showToast(pos._tsEnabled ? '🎯 Trailing activé sur '+pos.pair : '⏸ Trailing désactivé', 1500, 'win');
  renderTrailingStopSection();
}
window.togglePosTrailing = togglePosTrailing;

function updatePosTsCfg(posId, key, val) {
  const pos = (S.openPositions||[]).find(p=>p.id===posId);
  if(!pos) return;
  pos[key] = parseFloat(val) || 0;
  renderTrailingStopSection();
}
window.updatePosTsCfg = updatePosTsCfg;

// Surveillance trailing stop indépendante (s'ajoute au système existant pour les positions manuelles)
function checkTrailingStops() {
  (S.openPositions||[]).forEach(pos=>{
    if(!pos._tsEnabled) return;
    const ps  = S.pairStates[pos.pair];
    if(!ps) return;
    const cur = ps.price;
    const pnlPct = pos.side==='long'
      ? (cur - pos.entryPrice)/pos.entryPrice*100
      : (pos.entryPrice - cur)/pos.entryPrice*100;

    // Mettre à jour le pic
    const peakMin = pos._tsPeakMin ?? _TS_GLOBAL_CFG.peakMin;
    const trailDrop = pos._tsTrailDrop ?? _TS_GLOBAL_CFG.trailDrop;
    if(pnlPct > (pos._tsPeakPct||0)) pos._tsPeakPct = pnlPct;

    // Déclencher si pic atteint et retrait suffisant
    if((pos._tsPeakPct||0) >= peakMin) {
      const drop = pos._tsPeakPct - pnlPct;
      if(drop >= trailDrop) {
        pos._tsEnabled = false; // éviter double-déclenchement
        try { closePosition(pos.id, pos.auto===true); } catch(e) {}
        S.chainLog.push({ icon:'🎯', desc:`Trailing v42 · ${pos.pair} · pic +${pos._tsPeakPct.toFixed(2)}% → sortie +${pnlPct.toFixed(2)}%`, hash:rndHash(), time:nowStr() });
        showToast('🎯 Trailing stop · '+pos.pair+' verrouillé +'+pnlPct.toFixed(2)+'%', 3000, 'win');
        renderTrailingStopSection();
      }
    }
  });
}
window.checkTrailingStops = checkTrailingStops;
setInterval(checkTrailingStops, 3000);

function renderTrailingStopSection() {
  const el = document.getElementById('trailingStopSection');
  if(!el) return;

  const openPos = S.openPositions||[];

  el.innerHTML = `
    <div class="ts-section">
      <div class="ts-title">
        🎯 Trailing Stop Dynamique
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Verrou automatique des gains</span>
      </div>

      <!-- Config globale -->
      <div class="ts-global-card">
        <div style="font-size:9px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em;">Paramètres globaux</div>
        <div class="ts-slider-row">
          <span style="color:var(--t2);min-width:110px;">Profit min activation</span>
          <input type="range" class="ts-slider" min="0.3" max="5" step="0.1" value="${_TS_GLOBAL_CFG.peakMin}"
            oninput="setTsGlobal('peakMin',this.value);document.getElementById('tsPeakVal').textContent='+'+this.value+'%'">
          <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:var(--up);min-width:36px;" id="tsPeakVal">+${_TS_GLOBAL_CFG.peakMin}%</span>
        </div>
        <div class="ts-slider-row">
          <span style="color:var(--t2);min-width:110px;">Retrait déclencheur</span>
          <input type="range" class="ts-slider" min="0.1" max="3" step="0.1" value="${_TS_GLOBAL_CFG.trailDrop}"
            oninput="setTsGlobal('trailDrop',this.value);document.getElementById('tsDropVal').textContent='-'+this.value+'%'">
          <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:var(--down);min-width:36px;" id="tsDropVal">-${_TS_GLOBAL_CFG.trailDrop}%</span>
        </div>
        <div style="font-size:8px;color:var(--t3);margin-top:4px;">
          Logique : si profit ≥ +${_TS_GLOBAL_CFG.peakMin}% ET recul de -${_TS_GLOBAL_CFG.trailDrop}% depuis le pic → fermeture automatique.
        </div>
      </div>

      ${openPos.length===0
        ? `<div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Ouvre une position pour activer le trailing stop.</div>`
        : openPos.map(pos=>{
            const ps      = S.pairStates[pos.pair];
            const cfg     = PAIRS[pos.pair];
            const dec     = cfg?.dec>=4?cfg.dec:2;
            const cur     = ps?.price || pos.entryPrice;
            const pnlPct  = pos.side==='long'
              ? (cur - pos.entryPrice)/pos.entryPrice*100
              : (pos.entryPrice - cur)/pos.entryPrice*100;
            const peak    = pos._tsPeakPct || Math.max(0, pnlPct);
            const peakMin = pos._tsPeakMin ?? _TS_GLOBAL_CFG.peakMin;
            const trailDrop = pos._tsTrailDrop ?? _TS_GLOBAL_CFG.trailDrop;
            const stopLevel = Math.max(0, peak - trailDrop);
            const active  = peak >= peakMin;
            const pnlCol  = pnlPct>=0?'var(--up)':'var(--down)';

            // Positions sur la jauge (0 à max(peak,pnlPct)*1.2)
            const maxScale = Math.max(peakMin + 1, peak + 0.5, pnlPct + 0.5);
            const peakPct  = Math.min(98, (peak/maxScale*100));
            const curPct   = Math.min(98, Math.max(0, pnlPct/maxScale*100));
            const stopPct  = Math.min(98, Math.max(0, stopLevel/maxScale*100));
            const fillPct  = Math.min(98, Math.max(0, pnlPct/maxScale*100));
            const fillCol  = pnlPct>=0?'var(--up)':'var(--down)';

            return `<div class="ts-pos-card" style="border-color:${pos._tsEnabled?'rgba(0,232,122,.25)':'var(--border)'};">
              <div class="ts-pos-header">
                <div>
                  <span style="font-size:12px;font-weight:800;color:${cfg?.color||'var(--t1)'};">
                    ${pos.pair.replace('/USDT','')} <span style="color:${pos.side==='long'?'var(--up)':'var(--down)'};">${pos.side==='long'?'↑':'↓'}</span>
                  </span>
                  ${pos._tsEnabled?`<span style="font-size:8px;background:rgba(0,232,122,.12);color:var(--up);padding:1px 6px;border-radius:4px;margin-left:4px;">AUTO</span>`:''}
                </div>
                <span style="font-size:13px;font-weight:800;font-family:var(--font-mono);color:${pnlCol};">${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}%</span>
              </div>

              <!-- Jauge visuelle -->
              <div style="font-size:8px;color:var(--t3);margin-bottom:3px;">Jauge profit vs trailing</div>
              <div class="ts-gauge-wrap">
                <div class="ts-gauge-fill" style="width:${fillPct}%;background:${fillCol};height:100%;border-radius:100px;"></div>
                ${peak>0?`<div class="ts-gauge-peak" style="left:calc(${peakPct}% - 1px);" title="Pic: +${peak.toFixed(2)}%"></div>`:''}
                ${active?`<div class="ts-gauge-stop" style="left:calc(${stopPct}% - 1px);" title="Stop: +${stopLevel.toFixed(2)}%"></div>`:''}
                <div class="ts-gauge-cur" style="left:calc(${curPct}% - 7px);color:${pnlCol};border-color:${pnlCol};"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:7px;color:var(--t3);margin-bottom:8px;">
                <span>0%</span>
                ${active?`<span style="color:var(--down);">🛑 Stop: +${stopLevel.toFixed(2)}%</span>`:`<span style="color:var(--gold);">Activation à +${peakMin}%</span>`}
                <span style="color:var(--gold);">🔔 Pic: +${peak.toFixed(2)}%</span>
              </div>

              <!-- Métriques -->
              <div class="ts-row"><span style="color:var(--t3);">P&L actuel</span><span style="font-weight:700;color:${pnlCol};">${pnlPct>=0?'+':''}${pnlPct.toFixed(3)}%</span></div>
              <div class="ts-row"><span style="color:var(--t3);">Pic atteint</span><span style="font-weight:700;color:var(--gold);">+${peak.toFixed(3)}%</span></div>
              <div class="ts-row"><span style="color:var(--t3);">Niveau stop</span><span style="font-weight:700;color:${active?'var(--down)':'var(--t3)'};">${active?'+'+stopLevel.toFixed(3)+'%':'inactif (< +'+peakMin+'%)'}</span></div>
              <div class="ts-row"><span style="color:var(--t3);">Retrait depuis pic</span><span style="font-weight:700;color:${peak-pnlPct>=trailDrop?'var(--down)':'var(--t3)'};">${(peak-pnlPct).toFixed(3)}% / ${trailDrop}%</span></div>

              <!-- Sliders par position -->
              <div style="margin-top:6px;">
                <div class="ts-slider-row" style="padding:3px 0;">
                  <span style="color:var(--t3);min-width:80px;font-size:9px;">Min activ.</span>
                  <input type="range" class="ts-slider" min="0.3" max="5" step="0.1" value="${peakMin}"
                    oninput="updatePosTsCfg('${pos.id}','_tsPeakMin',this.value);renderTrailingStopSection();">
                  <span style="font-family:var(--font-mono);font-size:9px;color:var(--up);">+${peakMin.toFixed(1)}%</span>
                </div>
                <div class="ts-slider-row" style="padding:3px 0;">
                  <span style="color:var(--t3);min-width:80px;font-size:9px;">Retrait</span>
                  <input type="range" class="ts-slider" min="0.1" max="3" step="0.1" value="${trailDrop}"
                    oninput="updatePosTsCfg('${pos.id}','_tsTrailDrop',this.value);renderTrailingStopSection();">
                  <span style="font-family:var(--font-mono);font-size:9px;color:var(--down);">-${trailDrop.toFixed(1)}%</span>
                </div>
              </div>

              <button class="ts-toggle-btn" onclick="togglePosTrailing('${pos.id}')"
                style="background:${pos._tsEnabled?'rgba(0,232,122,.1)':'rgba(255,255,255,.04)'};border-color:${pos._tsEnabled?'rgba(0,232,122,.3)':'var(--border)'};color:${pos._tsEnabled?'var(--up)':'var(--t3)'};">
                ${pos._tsEnabled?'⚡ Trailing actif — surveillance toutes les 3s':'▶ Activer le trailing stop'}
              </button>
            </div>`;
          }).join('')}
    </div>`;
}
window.renderTrailingStopSection = renderTrailingStopSection;
// ═══ v43 · #13 EXPORT RAPPORT PDF MENSUEL ═══
// Génère un rapport HTML complet dans une nouvelle fenêtre
// Utilise window.print() → Save as PDF dans Chrome
// Contient : résumé, P&L, paires, agents, frais, graphiques ASCII

function _buildReportHTML() {
  // ── Collecter toutes les données ──
  const allTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null)
  );
  const n        = allTrades.length;
  const wins     = allTrades.filter(t=>t.pnlUsdt>0);
  const losses   = allTrades.filter(t=>t.pnlUsdt<=0);
  const wr       = n>0 ? (wins.length/n*100).toFixed(1) : '—';
  const totalPnl = allTrades.reduce((s,t)=>s+(t.pnlUsdt||0),0);
  const avgWin   = wins.length>0 ? wins.reduce((s,t)=>s+t.pnlUsdt,0)/wins.length : 0;
  const avgLoss  = losses.length>0 ? Math.abs(losses.reduce((s,t)=>s+t.pnlUsdt,0)/losses.length) : 0;
  const fees     = S.fees || {};
  const portfolio= S.portfolio || 0;
  const agents   = S.agents || [];
  const m        = typeof computeAdvancedMetrics==='function' ? computeAdvancedMetrics() : null;
  const now      = new Date();
  const monthStr = now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

  // P&L par paire
  const pairStats = Object.entries(S.pairStates||{}).map(([pair,ps])=>({
    pair, trades:ps.totalTrades||0, wins:ps.winTrades||0,
    pnl:ps.totalPnlUsd||0,
    wr: ps.totalTrades>0?Math.round((ps.winTrades||0)/ps.totalTrades*100):null
  })).filter(p=>p.trades>0).sort((a,b)=>b.pnl-a.pnl);

  // Top 5 agents
  const topAgents = [...agents].sort((a,b)=>(b.fitness||0)-(a.fitness||0)).slice(0,5);

  // Graphique ASCII equity simple
  const recentTrades = allTrades.slice(-20);
  let cumPnl = 0;
  const equityCurve = recentTrades.map(t=>{ cumPnl+=t.pnlUsdt||0; return cumPnl; });
  const maxE = Math.max(0.01,...equityCurve.map(Math.abs));
  const asciiChart = equityCurve.length>0 ? (() => {
    const rows = 5;
    let grid = '';
    for(let r=rows;r>=0;r--) {
      let line = '';
      equityCurve.forEach(v=>{
        const ratio = (v+maxE)/(2*maxE);
        const bar   = Math.round(ratio*rows);
        line += bar>=r ? (v>=0?'█':'▓') : '·';
      });
      grid += line + '\n';
    }
    return grid;
  })() : 'Pas de données';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>AURA — Rapport ${monthStr}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color:#111; background:#fff; padding:20mm 15mm; font-size:10pt; }
  h1 { font-size:22pt; font-weight:900; color:#0a0a1a; margin-bottom:4px; }
  h2 { font-size:12pt; font-weight:700; color:#1a1a2e; margin:16px 0 6px; border-bottom:2px solid #e5e7eb; padding-bottom:4px; }
  h3 { font-size:10pt; font-weight:700; color:#374151; margin:10px 0 4px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; padding-bottom:12px; border-bottom:3px solid #1a1a2e; }
  .header-badge { background:#1a1a2e; color:#38d4f5; padding:4px 12px; border-radius:20px; font-size:8pt; font-weight:700; }
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:12px 0; }
  .kpi { background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:10px; text-align:center; }
  .kpi-val { font-size:16pt; font-weight:800; display:block; }
  .kpi-lbl { font-size:7pt; color:#6b7280; text-transform:uppercase; letter-spacing:.06em; margin-top:2px; }
  .kpi.good .kpi-val { color:#16a34a; }
  .kpi.bad  .kpi-val { color:#dc2626; }
  .kpi.ice  .kpi-val { color:#0891b2; }
  .kpi.neu  .kpi-val { color:#374151; }
  table { width:100%; border-collapse:collapse; margin:8px 0; font-size:9pt; }
  th { background:#1a1a2e; color:#fff; padding:6px 8px; text-align:left; font-size:8pt; }
  td { padding:5px 8px; border-bottom:1px solid #f1f5f9; }
  tr:nth-child(even) td { background:#f8fafc; }
  .tag-win { color:#16a34a; font-weight:700; }
  .tag-loss { color:#dc2626; font-weight:700; }
  .chart-box { background:#0a0a1a; color:#00e87a; font-family:monospace; font-size:8pt; padding:10px 12px; border-radius:6px; white-space:pre; line-height:1.3; margin:8px 0; }
  .footer { margin-top:24px; padding-top:10px; border-top:1px solid #e5e7eb; font-size:7pt; color:#9ca3af; display:flex; justify-content:space-between; }
  .disclaimer { background:#fef3c7; border:1px solid #f59e0b; border-radius:6px; padding:8px 10px; margin-top:12px; font-size:8pt; color:#92400e; }
  @media print {
    body { padding:10mm; }
    .kpi-grid { break-inside:avoid; }
    table { break-inside:avoid; }
  }

/* v70 AUTO-BACKUP */
.ab-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.ab-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.ab-slot{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:9px;margin-bottom:5px;display:flex;align-items:center;gap:10px;}
.ab-slot:last-child{margin-bottom:0;}
.ab-slot-icon{font-size:18px;flex-shrink:0;}
.ab-slot-body{flex:1;}
.ab-slot-name{font-size:10px;font-weight:700;color:var(--t1);}
.ab-slot-meta{font-size:8px;color:var(--t3);margin-top:1px;}
.ab-btn{width:100%;padding:9px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;border:1px solid;margin-bottom:6px;transition:all .15s;}
.ab-toggle-row{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--s2);border-radius:8px;margin-bottom:8px;}
.ab-toggle{width:32px;height:18px;background:rgba(255,255,255,.1);border-radius:9px;position:relative;cursor:pointer;border:none;transition:background .2s;flex-shrink:0;}
.ab-toggle.on{background:var(--up);}
.ab-toggle::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#fff;border-radius:50%;transition:left .2s;}
.ab-toggle.on::after{left:16px;}
.ab-progress{height:6px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden;margin:4px 0;}
.ab-progress-fill{height:100%;background:var(--ice);border-radius:100px;transition:width .4s;}


/* v71 BTC IMPACT */
.btc-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.btc-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.btc-live-row{background:var(--s2);border-radius:10px;padding:10px;margin-bottom:10px;display:flex;align-items:center;gap:12px;}
.btc-pct{font-size:28px;font-weight:900;font-family:var(--font-mono);}
.btc-pair-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:10px;}
.btc-pair-card{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px;}
.btc-pair-name{font-size:10px;font-weight:700;margin-bottom:4px;}
.btc-pair-beta{font-size:12px;font-weight:800;font-family:var(--font-mono);}
.btc-pair-desc{font-size:7px;color:var(--t3);margin-top:2px;line-height:1.3;}
.btc-corr-bar{height:4px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden;margin:3px 0;}
.btc-corr-fill{height:100%;border-radius:100px;}
.btc-alert{border-radius:8px;padding:7px 10px;margin-bottom:5px;font-size:9px;line-height:1.4;}
.btc-alert.high{background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);color:var(--down);}
.btc-alert.med{background:rgba(245,200,66,.08);border:1px solid rgba(245,200,66,.2);color:var(--gold);}
.btc-alert.low{background:rgba(0,232,122,.08);border:1px solid rgba(0,232,122,.2);color:var(--up);}


/* v72 SCORE RISQUE */
.risk-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.risk-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.risk-gauge-wrap{display:flex;flex-direction:column;align-items:center;padding:16px;background:var(--s2);border-radius:12px;margin-bottom:10px;}
.risk-score-num{font-size:52px;font-weight:900;font-family:var(--font-mono);line-height:1;}
.risk-score-lbl{font-size:12px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;margin-top:4px;}
.risk-gauge-arc{margin:8px 0;}
.risk-factor{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;}
.risk-factor:last-child{border-bottom:none;}
.risk-factor-name{flex:1;color:var(--t2);}
.risk-factor-bar{width:80px;height:5px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden;flex-shrink:0;}
.risk-factor-fill{height:100%;border-radius:100px;}
.risk-factor-val{font-size:9px;font-weight:700;font-family:var(--font-mono);min-width:28px;text-align:right;}
.risk-rec{border-radius:8px;padding:7px 10px;margin-top:6px;font-size:9px;line-height:1.5;}


/* v73 HISTORIQUE PRIX 7J */
.ph-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.ph-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.ph-pair-card{background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;}
.ph-pair-card:last-child{margin-bottom:0;}
.ph-pair-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.ph-pair-name{font-size:12px;font-weight:800;}
.ph-pair-price{font-size:13px;font-weight:800;font-family:var(--font-mono);}
.ph-pair-change{font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;}
.ph-sparkline{width:100%;height:44px;display:block;margin-bottom:4px;}
.ph-days-row{display:flex;justify-content:space-between;font-size:7px;color:var(--t3);}
.ph-stats-row{display:flex;gap:8px;margin-top:4px;}
.ph-stat{flex:1;text-align:center;}
.ph-stat-val{font-size:9px;font-weight:700;font-family:var(--font-mono);}
.ph-stat-lbl{font-size:7px;color:var(--t3);}
.ph-loading{text-align:center;padding:16px;font-size:10px;color:var(--t3);}


/* v74 CALCULATEUR POSITION */
.calc-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.calc-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.calc-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;}
.calc-row:last-child{border-bottom:none;}
.calc-lbl{color:var(--t2);flex:1;}
.calc-inp{flex:1;background:var(--s3);border:1px solid var(--border);border-radius:6px;color:var(--t1);font-size:11px;padding:5px 8px;font-family:var(--font-mono);text-align:right;}
.calc-inp:focus{border-color:var(--ice);outline:none;}
.calc-unit{font-size:9px;color:var(--t3);min-width:28px;}
.calc-result-box{background:var(--s2);border-radius:10px;padding:12px;margin:10px 0;}
.calc-result-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;}
.calc-result-row:last-child{border-bottom:none;}
.calc-result-val{font-weight:800;font-family:var(--font-mono);}
.calc-risk-bar{height:8px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden;margin:8px 0;}
.calc-risk-fill{height:100%;border-radius:100px;transition:width .4s;}
.calc-preset-row{display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap;}
.calc-preset{padding:4px 10px;border-radius:20px;font-size:9px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:var(--s2);color:var(--t2);font-family:inherit;transition:all .15s;}
.calc-preset.active{background:rgba(56,212,245,.12);border-color:rgba(56,212,245,.3);color:var(--ice);}


/* v75 COMPARAISON BACKUP */
.diff-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.diff-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.diff-cols{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;}
.diff-col{background:var(--s2);border-radius:8px;padding:8px;border:1px solid var(--border);}
.diff-col-title{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;}
.diff-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:9px;}
.diff-row:last-child{border-bottom:none;}
.diff-row-lbl{color:var(--t3);}
.diff-row-val{font-weight:700;font-family:var(--font-mono);}
.diff-delta-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;}
.diff-delta-row:last-child{border-bottom:none;}
.diff-delta-name{color:var(--t2);flex:1;}
.diff-delta-before{font-size:9px;color:var(--t3);min-width:55px;text-align:right;}
.diff-delta-arrow{font-size:10px;color:var(--t3);}
.diff-delta-after{font-size:9px;font-weight:700;min-width:55px;text-align:left;}
.diff-delta-change{font-size:9px;font-weight:800;font-family:var(--font-mono);min-width:50px;text-align:right;}
.diff-upload-zone{border:2px dashed var(--border);border-radius:10px;padding:20px;text-align:center;cursor:pointer;transition:border-color .2s;margin-bottom:8px;}
.diff-upload-zone:hover{border-color:rgba(56,212,245,.4);}


/* v76 MODE PAPIER ULTRA-RÉALISTE */
.pr2-section{background:var(--s1);border:1px solid rgba(167,139,250,.2);border-radius:12px;padding:12px;margin-bottom:10px;}
.pr2-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--pur);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.pr2-badge{display:inline-block;font-size:9px;font-weight:700;padding:2px 8px;border-radius:8px;}
.pr2-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;}
.pr2-row:last-child{border-bottom:none;}
.pr2-slider-row{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:10px;}
.pr2-slider{-webkit-appearance:none;height:4px;border-radius:2px;background:var(--s3);outline:none;flex:1;}
.pr2-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--pur);cursor:pointer;}
.pr2-scenario{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:5px;}
.pr2-toggle-row{display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--s2);border-radius:8px;margin-bottom:6px;}


/* v77 WEBHOOK TELEGRAM */
.tg-section{background:var(--s1);border:1px solid rgba(0,136,204,.3);border-radius:12px;padding:12px;margin-bottom:10px;}
.tg-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#29b6f6;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.tg-inp{width:100%;background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--t1);font-size:10px;padding:7px 10px;font-family:var(--font-mono);margin-bottom:6px;}
.tg-inp:focus{border-color:rgba(0,136,204,.4);outline:none;}
.tg-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;}
.tg-row:last-child{border-bottom:none;}
.tg-btn{padding:8px 14px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;border:1px solid rgba(0,136,204,.4);background:rgba(0,136,204,.1);color:#29b6f6;transition:all .15s;}
.tg-btn:active{background:rgba(0,136,204,.2);}
.tg-btn-full{width:100%;padding:9px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;border:1px solid;margin-bottom:6px;transition:all .15s;}
.tg-toggle{width:32px;height:18px;background:rgba(255,255,255,.1);border-radius:9px;position:relative;cursor:pointer;border:none;transition:background .2s;flex-shrink:0;}
.tg-toggle.on{background:#29b6f6;}
.tg-toggle::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#fff;border-radius:50%;transition:left .2s;}
.tg-toggle.on::after{left:16px;}
.tg-status{font-size:8px;padding:2px 8px;border-radius:6px;font-weight:700;}
.tg-log{background:#000;border-radius:6px;padding:8px;font-family:monospace;font-size:8px;color:#29b6f6;line-height:1.6;max-height:80px;overflow-y:auto;margin-top:6px;border:1px solid rgba(0,136,204,.2);}


/* v78 SONS */
.snd-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.snd-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.snd-preset-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;}
.snd-preset{padding:8px 4px;border-radius:8px;border:2px solid transparent;cursor:pointer;text-align:center;background:var(--s2);transition:all .2s;}
.snd-preset.active{border-color:var(--ice);}
.snd-preset-emoji{font-size:20px;display:block;margin-bottom:3px;}
.snd-preset-name{font-size:8px;font-weight:700;color:var(--t2);}
.snd-event-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;}
.snd-event-row:last-child{border-bottom:none;}
.snd-play-btn{width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:var(--s2);color:var(--t2);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.snd-vol-slider{-webkit-appearance:none;height:4px;border-radius:2px;background:var(--s3);outline:none;flex:1;}
.snd-vol-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--ice);cursor:pointer;}
.snd-toggle{width:32px;height:18px;background:rgba(255,255,255,.1);border-radius:9px;position:relative;cursor:pointer;border:none;transition:background .2s;flex-shrink:0;}
.snd-toggle.on{background:var(--up);}
.snd-toggle::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#fff;border-radius:50%;transition:left .2s;}
.snd-toggle.on::after{left:16px;}


/* v79 WIDGET COMPACT */
#compactWidget{
  position:fixed; top:56px; right:0; z-index:800;
  background:var(--s1); border:1px solid var(--border);
  border-right:none; border-radius:10px 0 0 10px;
  padding:6px 10px 6px 8px;
  transform:translateX(100%); transition:transform .3s;
  min-width:110px;
}
#compactWidget.show{transform:translateX(0);}
#compactWidgetTab{
  position:fixed; top:72px; right:0; z-index:799;
  width:18px; height:40px; background:var(--s2);
  border:1px solid var(--border); border-right:none;
  border-radius:6px 0 0 6px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  font-size:8px; color:var(--t3); writing-mode:vertical-rl;
  letter-spacing:.05em; font-weight:700;
}
.cw-row{display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:9px;}
.cw-lbl{color:var(--t3);font-size:8px;}
.cw-val{font-weight:800;font-family:var(--font-mono);font-size:10px;}
.cw-sep{height:1px;background:rgba(255,255,255,.05);margin:3px 0;}
.cw-pair-dot{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:2px;}
.wc-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.wc-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}


/* v80 LEADERBOARD */
.lb-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.lb-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.lb-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.lb-row:last-child{border-bottom:none;}
.lb-rank{font-size:16px;font-weight:900;font-family:var(--font-mono);min-width:28px;text-align:center;}
.lb-info{flex:1;}
.lb-name{font-size:11px;font-weight:700;color:var(--t1);}
.lb-sub{font-size:8px;color:var(--t3);margin-top:1px;}
.lb-score{text-align:right;}
.lb-pnl{font-size:13px;font-weight:800;font-family:var(--font-mono);}
.lb-wr{font-size:8px;color:var(--t3);}
.lb-bar-wrap{height:4px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden;margin:3px 0;}
.lb-bar-fill{height:100%;border-radius:100px;}
.lb-you-badge{font-size:8px;padding:1px 6px;border-radius:5px;background:rgba(56,212,245,.12);color:var(--ice);font-weight:700;}
.lb-medal{font-size:18px;}


/* v81 MODE VACANCES */
#vacancesBanner{position:fixed;top:0;left:0;right:0;z-index:1100;height:28px;
  background:linear-gradient(90deg,#0891b2,#06b6d4,#22d3ee,#06b6d4,#0891b2);
  background-size:200% 100%;animation:vacShimmer 3s linear infinite;
  display:flex;align-items:center;justify-content:center;gap:10px;
  font-size:10px;font-weight:700;letter-spacing:.05em;color:#fff;
  opacity:0;pointer-events:none;transition:opacity .3s;}
#vacancesBanner.show{opacity:1;pointer-events:auto;}
@keyframes vacShimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
.vac-section{background:rgba(6,182,212,.05);border:1px solid rgba(6,182,212,.2);border-radius:12px;padding:12px;margin-bottom:10px;}
.vac-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#06b6d4;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.vac-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;}
.vac-row:last-child{border-bottom:none;}
.vac-inp{background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t1);font-size:10px;padding:5px 8px;font-family:inherit;width:70px;text-align:center;}
.vac-btn{width:100%;padding:10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:6px;border:1px solid;transition:all .15s;}
.vac-status-card{background:var(--s2);border-radius:10px;padding:12px;text-align:center;margin-bottom:10px;border:1px solid rgba(6,182,212,.2);}


/* v82 AURA CONSCIENCE */
.ac-section{background:var(--s1);border:1px solid rgba(167,139,250,.2);border-radius:12px;padding:12px;margin-bottom:10px;}
.ac-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--pur);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.ac-mirror{background:linear-gradient(135deg,rgba(167,139,250,.06),rgba(56,212,245,.04));border:1px solid rgba(167,139,250,.2);border-radius:12px;padding:14px;margin-bottom:12px;}
.ac-avatar-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.ac-avatar{width:44px;height:44px;border-radius:50%;background:rgba(167,139,250,.15);border:2px solid rgba(167,139,250,.4);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.ac-name{font-size:13px;font-weight:900;color:var(--t1);}
.ac-sub{font-size:8px;color:var(--t3);}
.ac-insight{border-left:3px solid;padding:8px 10px;margin-bottom:6px;border-radius:0 6px 6px 0;font-size:9px;line-height:1.5;}
.ac-insight:last-child{margin-bottom:0;}
.ac-insight.warn{border-color:var(--down);background:rgba(255,61,107,.05);color:var(--t2);}
.ac-insight.caution{border-color:var(--gold);background:rgba(245,200,66,.05);color:var(--t2);}
.ac-insight.good{border-color:var(--up);background:rgba(0,232,122,.05);color:var(--t2);}
.ac-insight.info{border-color:var(--pur);background:rgba(167,139,250,.05);color:var(--t2);}
.ac-pattern-card{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:6px;}
.ac-pattern-card:last-child{margin-bottom:0;}
.ac-pattern-name{font-size:10px;font-weight:700;color:var(--t1);margin-bottom:2px;}
.ac-pattern-desc{font-size:8px;color:var(--t3);line-height:1.4;}
.ac-score-ring{display:flex;flex-direction:column;align-items:center;}
.ac-score-val{font-size:36px;font-weight:900;font-family:var(--font-mono);}
.ac-score-lbl{font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;}


/* v83 MOMENT DE GRACE */
#graceOverlay{
  position:fixed;inset:0;z-index:5000;
  background:rgba(0,0,0,.85);backdrop-filter:blur(10px);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  opacity:0;pointer-events:none;transition:opacity .6s;
  padding:24px;text-align:center;
}
#graceOverlay.show{opacity:1;pointer-events:auto;}
.gr-stars{font-size:28px;letter-spacing:4px;margin-bottom:16px;animation:grStars 1s ease-out;}
@keyframes grStars{from{opacity:0;transform:scale(.5);}to{opacity:1;transform:scale(1);}}
.gr-title{font-size:15px;font-weight:900;color:#f5c842;letter-spacing:.2em;text-transform:uppercase;margin-bottom:4px;}
.gr-label{font-size:11px;color:rgba(245,200,66,.6);letter-spacing:.3em;text-transform:uppercase;margin-bottom:24px;}
.gr-condition{background:rgba(245,200,66,.06);border:1px solid rgba(245,200,66,.2);border-radius:12px;padding:12px 16px;margin-bottom:16px;max-width:300px;width:100%;}
.gr-cond-name{font-size:12px;font-weight:700;color:#f5c842;margin-bottom:6px;}
.gr-cond-desc{font-size:9px;color:rgba(255,255,255,.6);line-height:1.5;}
.gr-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:300px;width:100%;margin-bottom:16px;}
.gr-metric{background:rgba(255,255,255,.05);border-radius:8px;padding:8px;}
.gr-metric-val{font-size:16px;font-weight:800;font-family:monospace;display:block;}
.gr-metric-lbl{font-size:7px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;}
.gr-msg{font-size:11px;font-style:italic;color:rgba(255,255,255,.7);line-height:1.6;max-width:280px;margin-bottom:20px;}
.gr-action-btn{padding:10px 24px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;border:1px solid rgba(245,200,66,.4);background:rgba(245,200,66,.1);color:#f5c842;margin:4px;}
.gr-dismiss{color:rgba(255,255,255,.3);font-size:10px;cursor:pointer;margin-top:8px;padding:6px;}
.gr-section{background:rgba(245,200,66,.04);border:1px solid rgba(245,200,66,.2);border-radius:12px;padding:12px;margin-bottom:10px;}
.gr-title-sec{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.gr-hist-item{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:9px;}
.gr-hist-item:last-child{border-bottom:none;}


/* v84 ANTI-REVENGE TRADING */
#revengeBlock{
  position:fixed;inset:0;z-index:4500;
  background:rgba(0,0,0,.9);backdrop-filter:blur(8px);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  opacity:0;pointer-events:none;transition:opacity .4s;
  padding:24px;text-align:center;
}
#revengeBlock.show{opacity:1;pointer-events:auto;}
.rv-pulse{width:70px;height:70px;border-radius:50%;background:rgba(255,61,107,.15);border:3px solid var(--down);display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:16px;animation:rvPulse 1.2s ease-in-out infinite;}
@keyframes rvPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,61,107,.4);}50%{box-shadow:0 0 0 20px rgba(255,61,107,0);}}
.rv-title{font-size:18px;font-weight:900;color:var(--down);margin-bottom:6px;}
.rv-msg{font-size:10px;color:rgba(255,255,255,.7);line-height:1.6;max-width:280px;margin-bottom:20px;}
.rv-timer{font-size:48px;font-weight:900;font-family:monospace;color:var(--down);margin-bottom:6px;}
.rv-timer-lbl{font-size:9px;color:rgba(255,255,255,.4);letter-spacing:.1em;text-transform:uppercase;margin-bottom:20px;}
.rv-stat{background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);border-radius:8px;padding:8px 14px;margin-bottom:16px;font-size:9px;color:rgba(255,255,255,.7);line-height:1.5;max-width:280px;width:100%;}
.rv-breathe{width:50px;height:50px;border-radius:50%;border:2px solid rgba(255,255,255,.2);margin-bottom:16px;animation:rvBreath 4s ease-in-out infinite;}
@keyframes rvBreath{0%,100%{transform:scale(1);opacity:.3;}50%{transform:scale(1.4);opacity:.7;}}
.rv-unlock-btn{padding:8px 20px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.5);}
.rv-section{background:rgba(255,61,107,.04);border:1px solid rgba(255,61,107,.15);border-radius:12px;padding:12px;margin-bottom:10px;}
.rv-sec-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--down);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.rv-slider{-webkit-appearance:none;height:4px;border-radius:2px;background:var(--s3);outline:none;flex:1;}
.rv-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--down);cursor:pointer;}


/* v85 ADN TRADE */
.adn-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.adn-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.adn-card{background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;}
.adn-card:last-child{margin-bottom:0;}
.adn-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.adn-sig{font-family:monospace;font-size:8px;color:var(--ice);letter-spacing:.08em;background:rgba(56,212,245,.06);padding:3px 7px;border-radius:5px;border:1px solid rgba(56,212,245,.15);}
.adn-strand{display:flex;gap:3px;flex-wrap:wrap;margin-bottom:6px;}
.adn-base{width:14px;height:14px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#fff;cursor:help;flex-shrink:0;}
.adn-row{display:flex;justify-content:space-between;padding:3px 0;font-size:9px;border-bottom:1px solid rgba(255,255,255,.04);}
.adn-row:last-child{border-bottom:none;}
.adn-badge{font-size:8px;padding:1px 6px;border-radius:4px;font-weight:700;}
.adn-filter-row{display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;}
.adn-filter{padding:3px 8px;border-radius:20px;font-size:9px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:var(--s2);color:var(--t2);font-family:inherit;}
.adn-filter.active{background:rgba(56,212,245,.12);border-color:rgba(56,212,245,.3);color:var(--ice);}


/* v86 AURA SE SOUVIENT */
.mem-section{background:var(--s1);border:1px solid rgba(167,139,250,.2);border-radius:12px;padding:12px;margin-bottom:10px;}
.mem-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--pur);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.mem-entry{background:var(--s2);border-left:3px solid;border-radius:0 8px 8px 0;padding:8px 10px;margin-bottom:6px;font-size:9px;}
.mem-entry:last-child{margin-bottom:0;}
.mem-entry-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;}
.mem-entry-type{font-weight:700;font-size:9px;}
.mem-entry-date{font-size:7px;color:var(--t3);}
.mem-entry-body{color:var(--t2);line-height:1.4;}
.mem-session-card{background:rgba(167,139,250,.04);border:1px solid rgba(167,139,250,.1);border-radius:8px;padding:8px 10px;margin-bottom:6px;}
.mem-session-stats{display:flex;gap:12px;font-size:9px;color:var(--t3);margin-top:4px;}
.mem-chat-bubble{background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.15);border-radius:10px 10px 10px 2px;padding:8px 10px;margin-bottom:6px;font-size:9px;font-style:italic;color:var(--t2);line-height:1.4;position:relative;}
.mem-chat-bubble::before{content:'🤖';position:absolute;top:-8px;left:6px;font-size:10px;}


/* v87 MÉTÉO PORTFOLIO */
.wx-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.wx-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.wx-main{border-radius:14px;padding:16px;text-align:center;margin-bottom:12px;position:relative;overflow:hidden;}
.wx-icon{font-size:64px;margin-bottom:6px;display:block;animation:wxFloat 3s ease-in-out infinite;}
@keyframes wxFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
.wx-condition{font-size:15px;font-weight:900;letter-spacing:.05em;margin-bottom:4px;}
.wx-temp{font-size:36px;font-weight:900;font-family:var(--font-mono);}
.wx-unit{font-size:14px;color:rgba(255,255,255,.5);margin-left:2px;}
.wx-desc{font-size:10px;opacity:.8;line-height:1.4;margin-top:6px;}
.wx-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:10px;}
.wx-cell{background:var(--s2);border-radius:8px;padding:8px;text-align:center;border:1px solid var(--border);}
.wx-cell-val{font-size:14px;font-weight:800;font-family:var(--font-mono);display:block;}
.wx-cell-lbl{font-size:7px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-top:2px;}
.wx-forecast{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;}
.wx-fc-day{flex:0 0 56px;background:var(--s2);border-radius:8px;padding:7px 4px;text-align:center;border:1px solid var(--border);}
.wx-fc-label{font-size:7px;color:var(--t3);margin-bottom:4px;}
.wx-fc-icon{font-size:18px;margin-bottom:4px;display:block;}
.wx-fc-temp{font-size:9px;font-weight:700;font-family:var(--font-mono);}
.wx-alert{border-radius:8px;padding:7px 10px;margin-bottom:5px;font-size:9px;line-height:1.4;}


/* v88 MODE CINÉMA */
#cinemaOverlay{
  position:fixed;inset:0;z-index:3500;
  background:#000;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  opacity:0;pointer-events:none;transition:opacity .6s;
  font-family:var(--font-mono);
}
#cinemaOverlay.show{opacity:1;pointer-events:auto;}
.cin-top-bar{position:absolute;top:0;left:0;right:0;height:56px;background:rgba(255,255,255,.03);display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid rgba(255,255,255,.06);}
.cin-logo{font-size:11px;font-weight:900;letter-spacing:.3em;color:rgba(255,255,255,.3);text-transform:uppercase;}
.cin-time{font-size:12px;color:rgba(255,255,255,.2);font-weight:700;}
.cin-center{display:flex;flex-direction:column;align-items:center;gap:20px;}
.cin-portfolio{font-size:14px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.3em;margin-bottom:4px;}
.cin-amount{font-size:72px;font-weight:900;letter-spacing:-.02em;line-height:1;}
.cin-pnl-row{display:flex;align-items:center;gap:16px;font-size:16px;font-weight:700;}
.cin-pairs-row{display:flex;gap:20px;margin-top:8px;}
.cin-pair-block{text-align:center;}
.cin-pair-sym{font-size:9px;color:rgba(255,255,255,.25);letter-spacing:.2em;margin-bottom:3px;}
.cin-pair-price{font-size:13px;font-weight:700;}
.cin-pair-chg{font-size:9px;margin-top:1px;}
.cin-bot-bar{position:absolute;bottom:0;left:0;right:0;height:48px;background:rgba(255,255,255,.02);display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-top:1px solid rgba(255,255,255,.04);}
.cin-stat{text-align:center;}
.cin-stat-val{font-size:12px;font-weight:800;display:block;}
.cin-stat-lbl{font-size:7px;color:rgba(255,255,255,.2);text-transform:uppercase;letter-spacing:.1em;}
.cin-ticker{position:absolute;bottom:48px;left:0;right:0;height:28px;background:rgba(255,255,255,.02);border-top:1px solid rgba(255,255,255,.04);display:flex;align-items:center;overflow:hidden;}
.cin-ticker-track{display:flex;gap:32px;animation:cinTicker 20s linear infinite;white-space:nowrap;padding:0 20px;}
@keyframes cinTicker{from{transform:translateX(0);}to{transform:translateX(-50%)}}
.cin-ticker-item{font-size:9px;color:rgba(255,255,255,.3);}
.cin-close-hint{position:absolute;top:16px;right:16px;font-size:9px;color:rgba(255,255,255,.15);cursor:pointer;}

/* Section UI */
.cm-section{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;}
.cm-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}


/* v89 COFFRE-FORT */
.vault-section{background:var(--s1);border:1px solid rgba(245,200,66,.2);border-radius:12px;padding:12px;margin-bottom:10px;}
.vault-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.vault-door{background:linear-gradient(135deg,rgba(245,200,66,.08),rgba(245,200,66,.03));border:2px solid rgba(245,200,66,.3);border-radius:14px;padding:20px;text-align:center;margin-bottom:12px;}
.vault-icon{font-size:48px;margin-bottom:8px;display:block;}
.vault-lock-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;}
.vault-inp{flex:1;background:rgba(0,0,0,.4);border:1px solid rgba(245,200,66,.2);border-radius:7px;color:var(--gold);font-size:14px;padding:8px 12px;font-family:var(--font-mono);text-align:center;letter-spacing:.1em;}
.vault-inp:focus{border-color:rgba(245,200,66,.5);outline:none;}
.vault-btn{padding:8px 16px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;border:1px solid rgba(245,200,66,.4);background:rgba(245,200,66,.1);color:var(--gold);white-space:nowrap;}
.vault-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;}
.vault-row:last-child{border-bottom:none;}
.vault-slot{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:9px;margin-bottom:5px;display:flex;align-items:center;gap:10px;}
.vault-slot.locked{border-color:rgba(245,200,66,.2);}
.vault-strength{height:4px;border-radius:100px;overflow:hidden;background:rgba(255,255,255,.06);margin-top:4px;}
.vault-strength-fill{height:100%;border-radius:100px;}


/* v90 MODE BUNKER */
#bunkerBanner{position:fixed;top:0;left:0;right:0;z-index:1200;height:28px;
  background:linear-gradient(90deg,#1a0000,#3d0000,#1a0000);
  background-size:200% 100%;animation:bunkerPulse 2s ease-in-out infinite;
  display:flex;align-items:center;justify-content:center;gap:12px;
  font-size:10px;font-weight:700;letter-spacing:.06em;color:#ff6b6b;
  opacity:0;pointer-events:none;transition:opacity .3s;}
#bunkerBanner.show{opacity:1;pointer-events:auto;}
@keyframes bunkerPulse{0%,100%{opacity:.9;}50%{opacity:1;}}
.bk-section{background:rgba(255,61,107,.04);border:1px solid rgba(255,61,107,.2);border-radius:12px;padding:12px;margin-bottom:10px;}
.bk-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--down);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.bk-status{background:linear-gradient(135deg,rgba(255,61,107,.1),rgba(0,0,0,.3));border:1px solid rgba(255,61,107,.3);border-radius:12px;padding:14px;text-align:center;margin-bottom:12px;}
.bk-trigger-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;}
.bk-trigger-row:last-child{border-bottom:none;}
.bk-slider{-webkit-appearance:none;height:4px;border-radius:2px;background:var(--s3);outline:none;flex:1;}
.bk-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--down);cursor:pointer;}
.bk-action{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--s2);border-radius:7px;margin-bottom:5px;font-size:10px;}
.bk-action:last-child{margin-bottom:0;}
.bk-check{width:14px;height:14px;border-radius:3px;flex-shrink:0;}

</style>
</head>
<body>
<div class="header">
  <div>
    <h1>AURA ∞ — Rapport de Trading</h1>
    <div style="color:#6b7280;font-size:9pt;margin-top:4px;">Période : ${monthStr} · Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}</div>
  </div>
  <div>
    <div class="header-badge">ADAPTIVE UNIVERSAL RISK ARCHITECT</div>
    <div style="text-align:right;font-size:8pt;color:#9ca3af;margin-top:6px;">Mode : ${S.tradingMode=== 'paperReal'?'Mode Évaluation d\'apprentissage':'Mode Auto-apprentissage'} · ${agents.length} agents</div>
  </div>
</div>

<h2>📊 Résumé de Performance</h2>
<div class="kpi-grid">
  <div class="kpi ${totalPnl>=0?'good':'bad'}">
    <span class="kpi-val">${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}</span>
    <span class="kpi-lbl">P&L Net Total</span>
  </div>
  <div class="kpi ice">
    <span class="kpi-val">${wr}%</span>
    <span class="kpi-lbl">Win Rate (${n} trades)</span>
  </div>
  <div class="kpi neu">
    <span class="kpi-val">$${portfolio.toFixed(2)}</span>
    <span class="kpi-lbl">Portfolio Total</span>
  </div>
  <div class="kpi ${(fees.totalGross||0)>0?'bad':'neu'}">
    <span class="kpi-val">-$${(fees.totalGross||0).toFixed(2)}</span>
    <span class="kpi-lbl">Frais Totaux</span>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi good"><span class="kpi-val">+$${avgWin.toFixed(2)}</span><span class="kpi-lbl">Gain Moyen</span></div>
  <div class="kpi bad"><span class="kpi-val">-$${avgLoss.toFixed(2)}</span><span class="kpi-lbl">Perte Moyenne</span></div>
  <div class="kpi ${m&&m.sharpe>=1?'good':m&&m.sharpe<0?'bad':'neu'}"><span class="kpi-val">${m?m.sharpe.toFixed(2):'—'}</span><span class="kpi-lbl">Sharpe Ratio</span></div>
  <div class="kpi bad"><span class="kpi-val">${m?m.maxDDPct.toFixed(1)+'%':'—'}</span><span class="kpi-lbl">Max Drawdown</span></div>
</div>

<h2>📈 Equity Curve (20 derniers trades)</h2>
<div class="chart-box">${asciiChart}</div>

<h2>₿ Performance par Paire</h2>
<table>
  <tr><th>Paire</th><th>Trades</th><th>Win Rate</th><th>Gains</th><th>Pertes</th><th>P&L Net</th></tr>
  ${pairStats.map(p=>`<tr>
    <td><strong>${p.pair}</strong></td>
    <td>${p.trades}</td>
    <td class="${(p.wr||0)>=55?'tag-win':'tag-loss'}">${p.wr!==null?p.wr+'%':'—'}</td>
    <td class="tag-win">${p.wins}</td>
    <td class="tag-loss">${p.trades-p.wins}</td>
    <td class="${p.pnl>=0?'tag-win':'tag-loss'}">${p.pnl>=0?'+':''}$${p.pnl.toFixed(2)}</td>
  </tr>`).join('')}
</table>

<h2>💸 Détail des Frais</h2>
<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
  <div class="kpi bad"><span class="kpi-val">-$${(fees.totalTradingFees||0).toFixed(2)}</span><span class="kpi-lbl">Frais Trading</span></div>
  <div class="kpi bad"><span class="kpi-val">-$${(fees.totalSlippage||0).toFixed(2)}</span><span class="kpi-lbl">Slippage</span></div>
  <div class="kpi bad"><span class="kpi-val">-$${(fees.totalFunding||0).toFixed(2)}</span><span class="kpi-lbl">Frais Funding</span></div>
</div>

<h2>🤖 Top 5 Agents</h2>
<table>
  <tr><th>Agent</th><th>Fitness</th><th>Score</th><th>Trades</th><th>Win Rate</th><th>Streak</th></tr>
  ${topAgents.map(a=>{const wr2=a.trades>0?Math.round((a.wins||0)/a.trades*100):null;return`<tr>
    <td>${a.emoji||''} <strong>${a.name||'—'}</strong></td>
    <td><strong>${Math.floor(a.fitness||0)} T$</strong></td>
    <td class="${(a.score||0)>=0?'tag-win':'tag-loss'}">${(a.score||0)>=0?'+':''}${(a.score||0).toFixed(3)}</td>
    <td>${a.trades||0}</td>
    <td class="${(wr2||0)>=55?'tag-win':'tag-loss'}">${wr2!==null?wr2+'%':'—'}</td>
    <td class="${(a.streak||0)>0?'tag-win':(a.streak||0)<0?'tag-loss':''}">${(a.streak||0)===0?'—':(a.streak>0?'W':'L')+Math.abs(a.streak||0)}</td>
  </tr>`}).join('')}
</table>

<div class="disclaimer">
  ⚠ Ce rapport est généré automatiquement par AURA pour information personnelle. 
  Les performances passées ne garantissent pas les résultats futurs. 
  Ce document n'est pas un conseil financier ou fiscal.
</div>

<div class="footer">
  <span>AURA ∞ — Adaptive Universal Risk Architect</span>
  <span>Rapport généré le ${now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
</div>
</body>
</html>`;
}

function exportPdfReport() {
  const html = _buildReportHTML();
  const win  = window.open('','_blank','width=900,height=700');
  if(!win) { showToast('⚠ Autoriser les popups pour exporter le PDF', 3000, 'warn'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(()=>{ win.print(); }, 800);
  showToast('📄 Rapport ouvert — Enregistrer comme PDF dans la boîte d\'impression', 4000, 'user');
}
window.exportPdfReport = exportPdfReport;

function renderPdfReportSection() {
  const el = document.getElementById('pdfReportSection');
  if(!el) return;

  const allTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null)
  );
  const n      = allTrades.length;
  const totalPnl = allTrades.reduce((s,t)=>s+(t.pnlUsdt||0),0);
  const wr     = n>0 ? Math.round(allTrades.filter(t=>t.pnlUsdt>0).length/n*100) : 0;
  const fees   = S.fees || {};
  const now    = new Date();
  const m      = typeof computeAdvancedMetrics==='function' ? computeAdvancedMetrics() : null;

  el.innerHTML = `
    <div class="rp-section">
      <div class="rp-title">
        📄 Rapport PDF Mensuel
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</span>
      </div>

      <div class="rp-section-lbl">Aperçu du rapport</div>
      <div class="rp-preview-card">
        <div class="rp-preview-row"><span style="color:var(--t3);">Trades analysés</span><span style="font-weight:700;">${n}</span></div>
        <div class="rp-preview-row"><span style="color:var(--t3);">P&L Net</span><span style="font-weight:700;color:${totalPnl>=0?'var(--up)':'var(--down)'};">${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}</span></div>
        <div class="rp-preview-row"><span style="color:var(--t3);">Win Rate</span><span style="font-weight:700;color:${wr>=55?'var(--up)':'var(--down)'};">${wr}%</span></div>
        <div class="rp-preview-row"><span style="color:var(--t3);">Sharpe Ratio</span><span style="font-weight:700;">${m?m.sharpe.toFixed(2):'—'}</span></div>
        <div class="rp-preview-row"><span style="color:var(--t3);">Frais totaux</span><span style="font-weight:700;color:var(--down);">-$${(fees.totalGross||0).toFixed(2)}</span></div>
        <div class="rp-preview-row"><span style="color:var(--t3);">Top agent</span><span style="font-weight:700;color:var(--pur);">${(S.agents||[]).sort((a,b)=>(b.fitness||0)-(a.fitness||0))[0]?.name||'—'}</span></div>
      </div>

      <div class="rp-section-lbl">Contenu du rapport</div>
      <div style="font-size:9px;color:var(--t2);line-height:1.8;padding:6px 0;">
        ✅ Résumé de performance (8 KPIs)<br>
        ✅ Equity curve ASCII (20 derniers trades)<br>
        ✅ Performance détaillée par paire<br>
        ✅ Détail des frais (trading, slippage, funding)<br>
        ✅ Top 5 agents (fitness, score, WR, streak)<br>
        ✅ Avertissement légal
      </div>

      <button class="rp-export-btn" onclick="exportPdfReport()">
        📥 Générer et Exporter le PDF
      </button>
      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">
        S'ouvre dans un nouvel onglet → Ctrl+P → Enregistrer en PDF
      </div>
    </div>`;
}
window.renderPdfReportSection = renderPdfReportSection;
// ═══ v44 · #42 EXPORT EXCEL MULTI-ONGLETS ═══
// Pure JS — génère un fichier .xlsx sans librairie externe
// Format : CSV multi-onglets encodé en base64 dans un fichier .xls (compatible Excel/Sheets)
// Onglets : Résumé · Trades · Paires · Agents · Frais · Journal

function _xlCell(v, fmt) {
  if(v === null || v === undefined) return '';
  if(fmt === 'num') return isFinite(v) ? parseFloat(v.toFixed(4)) : 0;
  if(fmt === 'pct') return isFinite(v) ? (v*100).toFixed(2)+'%' : '0%';
  if(fmt === 'usd') return isFinite(v) ? '$'+parseFloat(v).toFixed(2) : '$0.00';
  return String(v);
}

function _csvSheet(headers, rows) {
  const esc = v => {
    const s = String(v ?? '').replace(/"/g,'""');
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
  };
  const lines = [headers.map(esc).join(',')];
  rows.forEach(r => lines.push(r.map(esc).join(',')));
  return lines.join('\n');
}

function buildExcelData() {
  const allTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null)
  ).sort((a,b)=>(a.ts||0)-(b.ts||0));

  const n = allTrades.length;
  const wins = allTrades.filter(t=>t.pnlUsdt>0);
  const losses = allTrades.filter(t=>t.pnlUsdt<=0);
  const totalPnl = allTrades.reduce((s,t)=>s+(t.pnlUsdt||0),0);
  const fees = S.fees || {};
  const agents = S.agents || [];
  const journal = S.dreamJournal || [];
  const m = typeof computeAdvancedMetrics==='function' ? computeAdvancedMetrics() : null;
  const now = new Date().toLocaleDateString('fr-FR');

  // ── Onglet 1 : Résumé ──
  const sheetResume = _csvSheet(
    ['Indicateur','Valeur','Note'],
    [
      ['Date rapport', now, ''],
      ['Portfolio total', _xlCell(S.portfolio,'usd'), ''],
      ['Compte trading', _xlCell(S.tradingAccount,'usd'), ''],
      ['Caisse libre', _xlCell(S.cashAccount,'usd'), ''],
      ['Mode', S.tradingMode||'—', ''],
      ['','',''],
      ['Total trades', n, ''],
      ['Trades gagnants', wins.length, ''],
      ['Trades perdants', losses.length, ''],
      ['Win Rate', n>0?(wins.length/n*100).toFixed(1)+'%':'—', ''],
      ['P&L Net Total', _xlCell(totalPnl,'usd'), ''],
      ['Gain moyen', wins.length>0?_xlCell(wins.reduce((s,t)=>s+t.pnlUsdt,0)/wins.length,'usd'):'—', ''],
      ['Perte moyenne', losses.length>0?_xlCell(Math.abs(losses.reduce((s,t)=>s+t.pnlUsdt,0)/losses.length),'usd'):'—', ''],
      ['','',''],
      ['Sharpe Ratio', m?m.sharpe.toFixed(2):'—', '>1 = bon'],
      ['Calmar Ratio', m?m.calmar.toFixed(2):'—', '>1 = bon'],
      ['Profit Factor', m?m.profitFactor.toFixed(2):'—', '>1.5 = excellent'],
      ['Max Drawdown', m?m.maxDDPct.toFixed(2)+'%':'—', 'Plus proche de 0 = mieux'],
      ['','',''],
      ['Frais trading', _xlCell(fees.totalTradingFees||0,'usd'), ''],
      ['Slippage', _xlCell(fees.totalSlippage||0,'usd'), ''],
      ['Frais funding', _xlCell(fees.totalFunding||0,'usd'), ''],
      ['Total frais', _xlCell(fees.totalGross||0,'usd'), ''],
      ['','',''],
      ['Nb agents', agents.length, ''],
      ['Fitness moyenne', agents.length>0?(agents.reduce((s,a)=>s+(a.fitness||0),0)/agents.length).toFixed(0)+' T$':'—', ''],
      ['Agents élites', agents.filter(a=>(a.fitness||0)>=1900).length, 'fitness ≥ 1900'],
      ['Régime marché', S._paperRealCurrentRegime||'—', ''],
    ]
  );

  // ── Onglet 2 : Trades ──
  const sheetTrades = _csvSheet(
    ['#','Date','Paire','Côté','Stake $','Prix entrée','Prix sortie','P&L $','P&L %','Résultat'],
    allTrades.map((t,i) => [
      i+1,
      t.time||new Date(t.ts||0).toLocaleString('fr-FR'),
      t.pair||'—',
      t.side==='buy'?'LONG':'SHORT',
      _xlCell(t.stakeUsdt,'num'),
      _xlCell(t.entryPrice,'num'),
      _xlCell(t.price,'num'),
      _xlCell(t.pnlUsdt,'num'),
      _xlCell(t.pnl,'num')+'%',
      (t.pnlUsdt||0)>0?'WIN':'LOSS',
    ])
  );

  // ── Onglet 3 : Paires ──
  const pairRows = Object.entries(S.pairStates||{}).map(([pair,ps])=>({
    pair, t:ps.totalTrades||0, w:ps.winTrades||0,
    pnl:ps.totalPnlUsd||0,
    pnlPct:ps.totalPnlPct||0,
  })).sort((a,b)=>b.pnl-a.pnl);

  const sheetPaires = _csvSheet(
    ['Paire','Total trades','Gagnants','Perdants','Win Rate %','P&L $','P&L %','Statut'],
    pairRows.map(p=>[
      p.pair,
      p.t,
      p.w,
      p.t-p.w,
      p.t>0?(p.w/p.t*100).toFixed(1):'—',
      _xlCell(p.pnl,'num'),
      _xlCell(p.pnlPct,'num'),
      p.pnl>0?'✅ Profitable':'❌ Déficitaire',
    ])
  );

  // ── Onglet 4 : Agents ──
  const sheetAgents = _csvSheet(
    ['Rang','Emoji','Nom','Type','Rôle','Fitness T$','Score','Trades','WR%','Streak','Erreurs','Statut'],
    [...agents].sort((a,b)=>(b.fitness||0)-(a.fitness||0)).map((a,i)=>{
      const wr = a.trades>0?Math.round((a.wins||0)/a.trades*100):null;
      return [
        i+1,
        a.emoji||'—',
        a.name||'—',
        a.type||'—',
        a.role||'—',
        Math.floor(a.fitness||0),
        (a.score||0).toFixed(3),
        a.trades||0,
        wr!==null?wr+'%':'—',
        (a.streak||0)===0?'—':(a.streak>0?'W':'L')+Math.abs(a.streak||0),
        a.errors||0,
        (a.fitness||0)>=1900?'Saturé':(a.fitness||0)>=800?'Élite':(a.fitness||0)>=300?'Actif':'Dégradé',
      ];
    })
  );

  // ── Onglet 5 : Frais par paire ──
  const feesByPair = fees.byPair || {};
  const sheetFrais = _csvSheet(
    ['Paire','Frais trading $','Slippage $','Funding $','Total frais $','P&L brut $','P&L net $','Ratio frais/brut %'],
    Object.entries(feesByPair).map(([pair,f])=>[
      pair,
      _xlCell(f.tradingFees||0,'num'),
      _xlCell(f.slippage||0,'num'),
      _xlCell(f.funding||0,'num'),
      _xlCell((f.tradingFees||0)+(f.slippage||0)+(f.funding||0),'num'),
      _xlCell(f.pnlGross||0,'num'),
      _xlCell(f.pnlNet||0,'num'),
      (f.pnlGross||0)>0?((((f.tradingFees||0)+(f.slippage||0))/(f.pnlGross||1))*100).toFixed(1)+'%':'—',
    ])
  );

  // ── Onglet 6 : Journal ──
  const sheetJournal = _csvSheet(
    ['Date','Paire','Sentiment','Note du bot'],
    journal.slice(-100).reverse().map(j=>[
      new Date(j.ts||0).toLocaleString('fr-FR'),
      j.pair||'—',
      j.sentiment||'—',
      (j.text||'').replace(/\n/g,' ').slice(0,200),
    ])
  );

  return { sheetResume, sheetTrades, sheetPaires, sheetAgents, sheetFrais, sheetJournal };
}

function exportExcel() {
  try {
    const btn = document.getElementById('xlExportBtn');
    if(btn) { btn.disabled=true; btn.textContent='⏳ Génération…'; }

    const sheets = buildExcelData();
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10);

    // Format XLS multi-onglets (Biff8 simplifié via HTML table — compatible Excel/Sheets)
    // Chaque onglet = une feuille HTML table dans un workbook HTML
    const xlsContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
${_csvToXmlSheet('Résumé', sheets.sheetResume)}
${_csvToXmlSheet('Trades', sheets.sheetTrades)}
${_csvToXmlSheet('Paires', sheets.sheetPaires)}
${_csvToXmlSheet('Agents', sheets.sheetAgents)}
${_csvToXmlSheet('Frais', sheets.sheetFrais)}
${_csvToXmlSheet('Journal', sheets.sheetJournal)}
</Workbook>`;

    const blob = new Blob([xlsContent], { type:'application/vnd.ms-excel;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `AURA_rapport_${dateStr}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('📊 Excel téléchargé — AURA_rapport_'+dateStr+'.xls', 3000, 'win');
    if(btn) { btn.disabled=false; btn.innerHTML='📊 Exporter Excel (.xls)'; }
  } catch(e) {
    showToast('⚠ Erreur export : '+e.message, 3000, 'warn');
    const btn = document.getElementById('xlExportBtn');
    if(btn) { btn.disabled=false; btn.innerHTML='📊 Exporter Excel (.xls)'; }
  }
}
window.exportExcel = exportExcel;

function _csvToXmlSheet(name, csv) {
  const rows = csv.split('\n').map(r => {
    const cells = _parseCsvRow(r);
    return '<Row>' + cells.map(v => {
      const isNum = v !== '' && !isNaN(v.replace('%','').replace('$','').replace(',','.'));
      const type  = isNum ? 'Number' : 'String';
      const val   = isNum ? v.replace('%','').replace('$','').replace(',','.') : v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return `<Cell><Data ss:Type="${type}">${val}</Data></Cell>`;
    }).join('') + '</Row>';
  }).join('\n');
  return `<Worksheet ss:Name="${name.replace(/&/g,'&amp;').replace(/</g,'&lt;')}"><Table>${rows}</Table></Worksheet>`;
}

function _parseCsvRow(row) {
  const cells = [];
  let cur = '', inQ = false;
  for(let i=0; i<row.length; i++) {
    const ch = row[i];
    if(ch==='"') { if(inQ && row[i+1]==='"') { cur+='"'; i++; } else inQ=!inQ; }
    else if(ch===',' && !inQ) { cells.push(cur); cur=''; }
    else cur+=ch;
  }
  cells.push(cur);
  return cells;
}

function renderXlExportSection() {
  const el = document.getElementById('xlExportSection');
  if(!el) return;

  const allTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position')
  );
  const agents  = S.agents || [];
  const journal = S.dreamJournal || [];
  const paires  = Object.keys(S.pairStates||{}).length;

  const sheets = [
    { icon:'📋', name:'Résumé', desc:'KPIs globaux, métriques, capital', count:'26 lignes' },
    { icon:'📈', name:'Trades', desc:'Tous les trades avec entrée/sortie/P&L', count:allTrades.length+' trades' },
    { icon:'₿',  name:'Paires', desc:'Performance détaillée par paire', count:paires+' paires' },
    { icon:'🤖', name:'Agents', desc:'Classement agents fitness/score/WR', count:agents.length+' agents' },
    { icon:'💸', name:'Frais',  desc:'Frais détaillés par paire', count:paires+' paires' },
    { icon:'📔', name:'Journal',desc:'Journal de bord bot (100 dernières)', count:Math.min(100,journal.length)+' entrées' },
  ];

  el.innerHTML = `
    <div class="xl-section">
      <div class="xl-title">
        📊 Export Excel Multi-onglets
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Format .xls · 6 onglets</span>
      </div>

      ${sheets.map(s=>`
        <div class="xl-sheet-row">
          <span class="xl-sheet-icon">${s.icon}</span>
          <div class="xl-sheet-info">
            <div class="xl-sheet-name">${s.name}</div>
            <div class="xl-sheet-desc">${s.desc}</div>
          </div>
          <span class="xl-sheet-count">${s.count}</span>
        </div>`).join('')}

      <button class="xl-export-btn" id="xlExportBtn" onclick="exportExcel()">
        📊 Exporter Excel (.xls)
      </button>
      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">
        Compatible Microsoft Excel, Google Sheets, LibreOffice
      </div>
    </div>`;
}
window.renderXlExportSection = renderXlExportSection;
// ═══ v45 · #6 RÉSUMÉ HEBDOMADAIRE AUTO ═══
// Analyse les trades de chaque semaine et génère un résumé complet :
// P&L, WR, meilleures/pires paires, insights automatiques

let _rhWeekOffset = 0; // 0 = semaine en cours, 1 = semaine passée, etc.

function _getWeekTrades(offset) {
  // Calculer le lundi de la semaine cible
  const now   = new Date();
  const day   = now.getDay(); // 0=dim, 1=lun...
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon - offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const allTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position' && t.pnlUsdt!=null && t.ts)
  );

  const weekTrades = allTrades.filter(t => t.ts >= monday.getTime() && t.ts <= sunday.getTime());

  return { trades: weekTrades, monday, sunday };
}

function _analyzeWeek(trades, monday, sunday) {
  const n       = trades.length;
  const wins    = trades.filter(t => t.pnlUsdt > 0);
  const losses  = trades.filter(t => t.pnlUsdt <= 0);
  const totalPnl= trades.reduce((s,t)=>s+(t.pnlUsdt||0), 0);
  const wr      = n > 0 ? wins.length/n : null;
  const avgWin  = wins.length>0 ? wins.reduce((s,t)=>s+t.pnlUsdt,0)/wins.length : 0;
  const avgLoss = losses.length>0 ? Math.abs(losses.reduce((s,t)=>s+t.pnlUsdt,0)/losses.length) : 0;
  const fees    = trades.reduce((s,t)=>s+(t.feeUsd||0), 0);

  // Perf par paire cette semaine
  const byPair = {};
  trades.forEach(t=>{
    if(!byPair[t.pair]) byPair[t.pair] = { pnl:0, count:0, wins:0 };
    byPair[t.pair].pnl   += t.pnlUsdt||0;
    byPair[t.pair].count++;
    if(t.pnlUsdt>0) byPair[t.pair].wins++;
  });
  const pairRanked = Object.entries(byPair).sort((a,b)=>b[1].pnl-a[1].pnl);
  const bestPair   = pairRanked[0];
  const worstPair  = pairRanked[pairRanked.length-1];

  // Distribution par jour de semaine
  const byDay = Array(7).fill(null).map(()=>({ pnl:0, count:0 }));
  trades.forEach(t=>{
    const d = new Date(t.ts).getDay();
    byDay[d].pnl   += t.pnlUsdt||0;
    byDay[d].count++;
  });

  // Insights automatiques
  const insights = [];
  if(n === 0) {
    insights.push('📭 Aucun trade cette semaine.');
  } else {
    if(wr !== null && wr >= 0.70) insights.push(`🔥 Excellente semaine ! Win Rate de ${Math.round(wr*100)}%.`);
    else if(wr !== null && wr < 0.40) insights.push(`⚠️ Win Rate faible (${Math.round(wr*100)}%) — revoir la stratégie.`);

    if(totalPnl > 0) insights.push(`💰 Semaine profitable : +$${totalPnl.toFixed(2)} réalisés.`);
    else insights.push(`📉 Semaine déficitaire : $${totalPnl.toFixed(2)}. Analyser les entrées.`);

    if(bestPair && bestPair[1].pnl > 0)  insights.push(`⭐ Meilleure paire : ${bestPair[0].replace('/USDT','')} (+$${bestPair[1].pnl.toFixed(2)})`);
    if(worstPair && worstPair[1].pnl < 0) insights.push(`🎯 À surveiller : ${worstPair[0].replace('/USDT','')} ($${worstPair[1].pnl.toFixed(2)})`);

    if(avgWin > 0 && avgLoss > 0) {
      const rr = avgWin/avgLoss;
      if(rr >= 1.5) insights.push(`📐 Bon R/R : ${rr.toFixed(2)} (gain moy. $${avgWin.toFixed(2)} / perte moy. $${avgLoss.toFixed(2)})`);
      else insights.push(`📐 R/R à améliorer : ${rr.toFixed(2)} — viser TP plus large ou SL plus serré.`);
    }

    const bestDay = byDay.reduce((best,d,i)=>d.pnl>best.pnl?{pnl:d.pnl,idx:i}:best, {pnl:-Infinity,idx:-1});
    const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    if(bestDay.pnl > 0) insights.push(`📅 Meilleur jour : ${dayNames[bestDay.idx]} (+$${bestDay.pnl.toFixed(2)})`);
  }

  return { n, wins:wins.length, losses:losses.length, totalPnl, wr, avgWin, avgLoss,
           fees, byPair, pairRanked, bestPair, worstPair, byDay, insights };
}

function renderHebdoSection() {
  const el = document.getElementById('hebdoSection');
  if(!el) return;

  const { trades, monday, sunday } = _getWeekTrades(_rhWeekOffset);
  const stats = _analyzeWeek(trades, monday, sunday);

  const fmtDate = d => d.toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit'});
  const weekLabel = _rhWeekOffset === 0 ? 'Semaine en cours'
                  : _rhWeekOffset === 1 ? 'Semaine passée'
                  : `Il y a ${_rhWeekOffset} semaines`;
  const dateRange = `${fmtDate(monday)} — ${fmtDate(sunday)}`;
  const pnlCol  = stats.totalPnl >= 0 ? 'var(--up)' : 'var(--down)';

  // Barres jours semaine
  const dayNames = ['D','L','M','M','J','V','S'];
  const maxDayPnl = Math.max(0.01, ...stats.byDay.map(d=>Math.abs(d.pnl)));
  const dayBars = stats.byDay.map((d,i)=>{
    const pct = Math.round(Math.abs(d.pnl)/maxDayPnl*100);
    const col  = d.pnl > 0 ? 'var(--up)' : d.pnl < 0 ? 'var(--down)' : 'rgba(255,255,255,.1)';
    return `<div style="flex:1;text-align:center;">
      <div style="height:30px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:2px;">
        <div style="width:12px;height:${Math.max(2,pct*0.3)}px;background:${col};border-radius:2px 2px 0 0;"></div>
      </div>
      <div style="font-size:8px;color:${d.count>0?'var(--t2)':'var(--t3)'};">${dayNames[i]}</div>
      ${d.count>0?`<div style="font-size:7px;color:${col};">${d.pnl>=0?'+':''}$${d.pnl.toFixed(1)}</div>`:''}
    </div>`;
  }).join('');

  // Top paires
  const pairRows = stats.pairRanked.slice(0,4).map(([pair,p])=>{
    const wr2 = p.count>0 ? Math.round(p.wins/p.count*100) : 0;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:9px;border-bottom:1px solid rgba(255,255,255,.04);">
      <span style="color:var(--t2);">${pair.replace('/USDT','')}</span>
      <span style="color:var(--t3);">${p.count} trades · ${wr2}%WR</span>
      <span style="font-weight:700;color:${p.pnl>=0?'var(--up)':'var(--down)'};">${p.pnl>=0?'+':''}$${p.pnl.toFixed(2)}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="rh-section">
      <div class="rh-title">
        📅 Résumé Hebdomadaire
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${dateRange}</span>
      </div>

      <!-- Navigation semaines -->
      <div class="rh-nav">
        <button class="rh-nav-btn ${_rhWeekOffset===0?'active':''}" onclick="_rhWeekOffset=0;renderHebdoSection();">Cette semaine</button>
        <button class="rh-nav-btn ${_rhWeekOffset===1?'active':''}" onclick="_rhWeekOffset=1;renderHebdoSection();">Semaine passée</button>
        <button class="rh-nav-btn ${_rhWeekOffset===2?'active':''}" onclick="_rhWeekOffset=2;renderHebdoSection();">S-2</button>
        <button class="rh-nav-btn ${_rhWeekOffset===3?'active':''}" onclick="_rhWeekOffset=3;renderHebdoSection();">S-3</button>
      </div>

      <div class="rh-week-card">
        <!-- En-tête semaine -->
        <div class="rh-week-header">
          <span class="rh-week-label">${weekLabel}</span>
          <span class="rh-week-pnl" style="color:${pnlCol};">${stats.totalPnl>=0?'+':''}$${stats.totalPnl.toFixed(2)}</span>
        </div>

        <!-- KPIs -->
        <div class="rh-kpi-grid">
          <div class="rh-kpi">
            <span class="rh-kpi-val">${stats.n}</span>
            <span class="rh-kpi-lbl">Trades</span>
          </div>
          <div class="rh-kpi">
            <span class="rh-kpi-val" style="color:${stats.wr!==null?(stats.wr>=0.55?'var(--up)':'var(--down)'):'var(--t3)'};">${stats.wr!==null?Math.round(stats.wr*100)+'%':'—'}</span>
            <span class="rh-kpi-lbl">Win Rate</span>
          </div>
          <div class="rh-kpi">
            <span class="rh-kpi-val" style="color:${stats.avgWin>stats.avgLoss?'var(--up)':'var(--gold)'};">${stats.avgWin>0&&stats.avgLoss>0?(stats.avgWin/stats.avgLoss).toFixed(2):'—'}</span>
            <span class="rh-kpi-lbl">R/R Ratio</span>
          </div>
          <div class="rh-kpi">
            <span class="rh-kpi-val" style="color:var(--up);">+$${stats.avgWin.toFixed(2)}</span>
            <span class="rh-kpi-lbl">Gain moy.</span>
          </div>
          <div class="rh-kpi">
            <span class="rh-kpi-val" style="color:var(--down);">-$${stats.avgLoss.toFixed(2)}</span>
            <span class="rh-kpi-lbl">Perte moy.</span>
          </div>
          <div class="rh-kpi">
            <span class="rh-kpi-val" style="color:var(--t1);">${stats.wins}W/${stats.losses}L</span>
            <span class="rh-kpi-lbl">W/L</span>
          </div>
        </div>

        <!-- Barres par jour -->
        ${stats.n > 0 ? `
        <div style="font-size:8px;color:var(--t3);margin-bottom:4px;">Distribution par jour</div>
        <div style="display:flex;gap:4px;align-items:flex-end;">${dayBars}</div>` : ''}

        <!-- Top paires -->
        ${stats.pairRanked.length > 0 ? `
        <div style="font-size:8px;color:var(--t3);margin:8px 0 4px;">Performance par paire</div>
        ${pairRows}` : ''}

        <!-- Insights -->
        ${stats.insights.length > 0 ? `
        <div class="rh-insight">
          ${stats.insights.map(i=>`<div>▸ ${i}</div>`).join('')}
        </div>` : ''}
      </div>

      <!-- Bouton export semaine -->
      ${stats.n > 0 ? `
      <button onclick="exportHebdoPdf(${_rhWeekOffset})"
        style="width:100%;padding:8px;border-radius:7px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.3);color:var(--pur);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:6px;">
        📄 Exporter ce résumé en PDF
      </button>` : ''}
    </div>`;
}
window.renderHebdoSection = renderHebdoSection;
// ═══ v46 · #4 MODE NUIT AUTOMATIQUE ═══
const _THEMES = {
  nuit: { name:'🌙 Nuit', desc:'Sombre classique', cls:'', bg:'#050709', s1:'#0b0e14', accent:'#00e87a' },
  aube: { name:'🌆 Aube', desc:'Violet doux', cls:'theme-aube', bg:'#08060f', s1:'#100d1a', accent:'#c084fc' },
  jour: { name:'☀️ Jour', desc:'Clair, lisible soleil', cls:'theme-jour', bg:'#f0f4f8', s1:'#ffffff', accent:'#16a34a' },
  deep: { name:'🌑 Nuit profonde', desc:'Ultra-sombre, batterie', cls:'theme-deep', bg:'#000000', s1:'#060608', accent:'#38d4f5' },
};

function applyTheme(key, save) {
  const t = _THEMES[key]; if(!t) return;
  Object.values(_THEMES).forEach(th=>{ if(th.cls) document.body.classList.remove(th.cls); });
  if(t.cls) document.body.classList.add(t.cls);
  if(save !== false) {
    if(!S.uiSettings) S.uiSettings={};
    S.uiSettings.theme = key;
    try { localStorage.setItem('aura_theme', key); } catch(e) {}
    // v49 · tracker les thèmes utilisés
    if(!S.uiSettings.themesUsed) S.uiSettings.themesUsed=[];
    if(!S.uiSettings.themesUsed.includes(key)) S.uiSettings.themesUsed.push(key);
  }
  try { renderNightModeSection(); } catch(e) {}
}
window.applyTheme = applyTheme;

let _themeTimer = null;
function _checkAutoTheme() {
  if(!S.uiSettings?.themeAuto) return;
  const h = new Date().getHours();
  const ds = S.uiSettings.themeDayStart  ?? 7;
  const ns = S.uiSettings.themeNightStart ?? 20;
  const target = (h>=ds && h<ns) ? 'jour' : (h>=5 && h<ds) ? 'aube' : 'deep';
  if((S.uiSettings?.theme||'nuit') !== target) applyTheme(target, true);
}

function toggleThemeAuto() {
  if(!S.uiSettings) S.uiSettings={};
  S.uiSettings.themeAuto = !S.uiSettings.themeAuto;
  if(S.uiSettings.themeAuto) {
    _themeTimer = setInterval(_checkAutoTheme, 60000);
    _checkAutoTheme();
    showToast('🌓 Thème automatique activé', 1500, 'win');
  } else {
    clearInterval(_themeTimer); _themeTimer = null;
    showToast('⏸ Thème automatique désactivé', 1500, 'user');
  }
  renderNightModeSection();
}
window.toggleThemeAuto = toggleThemeAuto;

function updateThemeSchedule(key, val) {
  if(!S.uiSettings) S.uiSettings={};
  S.uiSettings[key] = parseInt(val)||0;
  if(S.uiSettings.themeAuto) _checkAutoTheme();
  renderNightModeSection();
}
window.updateThemeSchedule = updateThemeSchedule;

function restoreTheme() {
  let saved = S.uiSettings?.theme;
  if(!saved) try { saved = localStorage.getItem('aura_theme'); } catch(e) {}
  if(saved && _THEMES[saved]) applyTheme(saved, false);
  if(S.uiSettings?.themeAuto) { _themeTimer = setInterval(_checkAutoTheme,60000); _checkAutoTheme(); }
}
window.restoreTheme = restoreTheme;

function renderNightModeSection() {
  const el = document.getElementById('nightModeSection');
  if(!el) return;
  const cur   = S.uiSettings?.theme || 'nuit';
  const autoOn= S.uiSettings?.themeAuto || false;
  const ds    = S.uiSettings?.themeDayStart  ?? 7;
  const ns    = S.uiSettings?.themeNightStart ?? 20;
  const h     = new Date().getHours();

  el.innerHTML = `
    <div class="nt-section">
      <div class="nt-title">🎨 Thème & Mode Nuit
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${_THEMES[cur]?.name} · ${h}h</span>
      </div>

      <div class="nt-grid">
        ${Object.entries(_THEMES).map(([key,t])=>`
          <div class="nt-card ${cur===key?'active':''}"
               style="background:${t.bg};border-color:${cur===key?'var(--ice)':'rgba(255,255,255,.06)'};"
               onclick="applyTheme('${key}',true)">
            <div class="nt-preview" style="background:${t.s1};">
              <div class="nt-preview-a" style="background:${t.bg};"></div>
              <div class="nt-preview-b" style="background:${t.s1};"></div>
              <div class="nt-preview-c" style="background:${t.accent};"></div>
            </div>
            <div class="nt-name" style="color:${t.accent};">${t.name}</div>
            <div class="nt-desc" style="color:${t.accent};">${t.desc}</div>
            ${cur===key?'<div style="font-size:7px;color:var(--ice);margin-top:2px;">✓ Actif</div>':''}
          </div>`).join('')}
      </div>

      <div class="nt-auto-row">
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:var(--t1);">🌓 Changement automatique</div>
          <div style="font-size:8px;color:var(--t3);margin-top:1px;">Aube → Jour → Nuit selon l'heure</div>
        </div>
        <button onclick="toggleThemeAuto()"
          style="padding:5px 12px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;
                 background:${autoOn?'rgba(0,232,122,.12)':'rgba(255,255,255,.06)'};
                 border:1px solid ${autoOn?'rgba(0,232,122,.3)':'var(--border)'};
                 color:${autoOn?'var(--up)':'var(--t3)'};">
          ${autoOn?'✅ Actif':'Activer'}
        </button>
      </div>

      ${autoOn?`
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Horaires</div>
      <div class="nt-sched">
        <span style="color:var(--t2);">🌅 Aube</span>
        <span style="color:var(--t3);">5h → ${ds}h</span>
      </div>
      <div class="nt-sched">
        <span style="color:var(--t2);">☀️ Jour</span>
        <div style="display:flex;align-items:center;gap:5px;">
          <input type="number" class="nt-inp" min="5" max="12" value="${ds}"
            onchange="updateThemeSchedule('themeDayStart',this.value)">h →
          <input type="number" class="nt-inp" min="16" max="23" value="${ns}"
            onchange="updateThemeSchedule('themeNightStart',this.value)">h
        </div>
      </div>
      <div class="nt-sched">
        <span style="color:var(--t2);">🌑 Nuit profonde</span>
        <span style="color:var(--t3);">${ns}h → 5h</span>
      </div>
      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">
        Actuellement ${h}h · Thème actif : ${_THEMES[cur]?.name}
      </div>`:''}
    </div>`;
}
window.renderNightModeSection = renderNightModeSection;
// ═══ v47 · MODE ZEN ═══
// Affichage fullscreen ultra-épuré : P&L + WR + Capital + dots paires
// Mise à jour toutes les 3s · animation de respiration

let _zenTimer = null;

function openZen() {
  const el = document.getElementById('zenOverlay');
  if(!el) return;
  el.classList.add('show');
  if(!S.uiSettings) S.uiSettings={}; S.uiSettings.zenUsed=true;
  _updateZen();
  _zenTimer = setInterval(_updateZen, 3000);
  // Masquer la barre de navigation
  try { document.querySelector('.bottom-nav')?.style.setProperty('display','none'); } catch(e) {}
  showToast('🧘 Mode Zen activé — appuyer ✕ pour quitter', 2500, 'user');
}
window.openZen = openZen;

function closeZen() {
  const el = document.getElementById('zenOverlay');
  if(el) el.classList.remove('show');
  clearInterval(_zenTimer); _zenTimer = null;
  try { document.querySelector('.bottom-nav')?.style.removeProperty('display'); } catch(e) {}
}
window.closeZen = closeZen;

function _updateZen() {
  // P&L session
  const startP  = S._startPortfolio || S.portfolio || 0;
  const curP    = S.portfolio || 0;
  const pnl     = curP - startP;
  const pnlCol  = pnl >= 0 ? 'var(--up)' : 'var(--down)';

  // Stats
  const n    = S.totalTrades || 0;
  const wins = S.winTrades   || 0;
  const wr   = n > 0 ? Math.round(wins/n*100) : null;

  // Régime
  const regime = S._paperRealCurrentRegime || 'calm';
  const regimeEmoji = {bull:'▲ BULL', volatile_bull:'▲ VOLATILE+', calm:'◌ CALM',
                       volatile:'◈ VOLATILE', volatile_bear:'▼ VOLATILE−', bear:'▼ BEAR'}[regime] || 'CALM';

  // Mettre à jour les éléments
  const setEl = (id, val, style) => {
    const el = document.getElementById(id);
    if(!el) return;
    if(val !== undefined) el.textContent = val;
    if(style) Object.assign(el.style, style);
  };

  setEl('zenPnl', (pnl>=0?'+':'')+'$'+Math.abs(pnl).toFixed(2), { color: pnlCol });
  setEl('zenSub', pnl >= 0 ? 'P&L NET · SESSION' : 'PERTE SESSION');
  setEl('zenWR',  wr !== null ? wr+'%' : '—', { color: wr!==null?(wr>=55?'var(--up)':'var(--down)'):'var(--t3)' });
  setEl('zenTrades', n);
  setEl('zenCapital', '$'+(S.tradingAccount||0).toFixed(0));
  setEl('zenRegime', regimeEmoji, { color: regime.includes('bull')?'var(--up)':regime.includes('bear')?'var(--down)':'var(--t3)' });

  // Points paires
  const pairsEl = document.getElementById('zenPairs');
  if(pairsEl) {
    pairsEl.innerHTML = Object.entries(S.pairStates||{}).map(([pair,ps])=>{
      const pnlP  = ps.totalPnlUsd || 0;
      const hasPos= (S.openPositions||[]).some(p=>p.pair===pair);
      const col   = hasPos ? 'var(--up)' : pnlP > 0 ? 'rgba(0,232,122,.4)' : pnlP < 0 ? 'rgba(255,61,107,.4)' : 'rgba(255,255,255,.1)';
      const size  = hasPos ? '14px' : '10px';
      return `<div class="zen-pair-dot">
        <div class="zen-pair-circle" style="background:${col};width:${size};height:${size};${hasPos?'box-shadow:0 0 8px '+col+';':''}"></div>
        <span class="zen-pair-lbl">${pair.replace('/USDT','')}</span>
      </div>`;
    }).join('');
  }

  // Couleur cercle respiration selon P&L
  const breath = document.getElementById('zenBreath');
  if(breath) breath.style.borderColor = pnlCol;
}

function renderZenSection() {
  const el = document.getElementById('zenSection');
  if(!el) return;

  const startP = S._startPortfolio || S.portfolio || 0;
  const pnl    = (S.portfolio||0) - startP;
  const n      = S.totalTrades || 0;
  const wr     = n>0 ? Math.round((S.winTrades||0)/n*100) : null;

  el.innerHTML = `
    <div class="nt-section">
      <div class="nt-title">🧘 Mode Zen
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Affichage fullscreen épuré</span>
      </div>

      <!-- Aperçu -->
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center;margin-bottom:10px;">
        <div style="font-size:28px;font-weight:900;font-family:var(--font-mono);color:${pnl>=0?'var(--up)':'var(--down)'};">
          ${pnl>=0?'+':''}$${Math.abs(pnl).toFixed(2)}
        </div>
        <div style="font-size:9px;color:var(--t3);letter-spacing:.15em;text-transform:uppercase;margin:4px 0 12px;">P&L Net Session</div>
        <div style="display:flex;justify-content:center;gap:24px;">
          <div style="text-align:center;">
            <span style="font-size:14px;font-weight:800;color:${wr!==null?(wr>=55?'var(--up)':'var(--down)'):'var(--t3)'};">${wr!==null?wr+'%':'—'}</span>
            <div style="font-size:8px;color:var(--t3);">Win Rate</div>
          </div>
          <div style="text-align:center;">
            <span style="font-size:14px;font-weight:800;">${n}</span>
            <div style="font-size:8px;color:var(--t3);">Trades</div>
          </div>
          <div style="text-align:center;">
            <span style="font-size:14px;font-weight:800;">$${(S.tradingAccount||0).toFixed(0)}</span>
            <div style="font-size:8px;color:var(--t3);">Capital</div>
          </div>
        </div>
      </div>

      <div style="font-size:9px;color:var(--t2);line-height:1.6;padding:6px 0;margin-bottom:8px;">
        Le Mode Zen masque tout et affiche uniquement l'essentiel : ton P&L, ton Win Rate, ton capital, et un point par paire (vert = position ouverte).
        <br>Une animation de respiration t'accompagne. ✨
      </div>

      <button onclick="openZen()"
        style="width:100%;padding:11px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
               background:rgba(56,212,245,.1);border:1px solid rgba(56,212,245,.3);color:var(--ice);">
        🧘 Activer le Mode Zen
      </button>
    </div>`;
}
window.renderZenSection = renderZenSection;
// ═══ v49 · BADGES / ACHIEVEMENTS ═══
const _BADGES = [
  // Trading
  { id:'first_blood',  emoji:'🩸', name:'First Blood',      desc:'Premier trade clôturé',          check:()=>(S.totalTrades||0)>=1,          prog:()=>Math.min(1,(S.totalTrades||0)/1) },
  { id:'ten_trades',   emoji:'📊', name:'Trader Actif',     desc:'10 trades complétés',            check:()=>(S.totalTrades||0)>=10,         prog:()=>Math.min(1,(S.totalTrades||0)/10) },
  { id:'century',      emoji:'💯', name:'Le Centenaire',    desc:'100 trades clôturés',            check:()=>(S.totalTrades||0)>=100,        prog:()=>Math.min(1,(S.totalTrades||0)/100) },
  { id:'win_streak_3', emoji:'🔥', name:'En Feu !',         desc:'3 victoires consécutives',       check:()=>Object.values(S.pairStates||{}).some(p=>(p.streak||0)>=3), prog:()=>Math.min(1,Math.max(...Object.values(S.pairStates||{}).map(p=>p.streak||0),0)/3) },
  { id:'win_streak_5', emoji:'🌋', name:'Inarrêtable',      desc:'5 victoires consécutives',       check:()=>Object.values(S.pairStates||{}).some(p=>(p.streak||0)>=5), prog:()=>Math.min(1,Math.max(...Object.values(S.pairStates||{}).map(p=>p.streak||0),0)/5) },
  { id:'win_streak_10',emoji:'⚡', name:'Électrique',       desc:'10 victoires consécutives',      check:()=>Object.values(S.pairStates||{}).some(p=>(p.streak||0)>=10), prog:()=>Math.min(1,Math.max(...Object.values(S.pairStates||{}).map(p=>p.streak||0),0)/10) },
  // P&L
  { id:'profit_10',    emoji:'💰', name:'Premier Profit',   desc:'Gagner +$10 net',                check:()=>_netPnl()>=10,                  prog:()=>Math.min(1,Math.max(0,_netPnl())/10) },
  { id:'profit_100',   emoji:'💎', name:'Triple Chiffre',   desc:'Gagner +$100 net',               check:()=>_netPnl()>=100,                 prog:()=>Math.min(1,Math.max(0,_netPnl())/100) },
  { id:'profit_1000',  emoji:'🚀', name:'Moon Shot',        desc:'Gagner +$1000 net',              check:()=>_netPnl()>=1000,                prog:()=>Math.min(1,Math.max(0,_netPnl())/1000) },
  // Win Rate
  { id:'wr_60',        emoji:'🎯', name:'Précis',           desc:'60% Win Rate (min 20 trades)',   check:()=>(S.totalTrades||0)>=20&&_wr()>=60, prog:()=>(S.totalTrades||0)>=20?Math.min(1,_wr()/60):Math.min(1,(S.totalTrades||0)/20) },
  { id:'wr_70',        emoji:'🏹', name:'Tireur d\'élite',  desc:'70% Win Rate (min 20 trades)',   check:()=>(S.totalTrades||0)>=20&&_wr()>=70, prog:()=>(S.totalTrades||0)>=20?Math.min(1,_wr()/70):Math.min(1,(S.totalTrades||0)/20) },
  // Agents
  { id:'elite_agent',  emoji:'🤖', name:'Agents Élites',    desc:'5 agents avec fitness ≥1900',    check:()=>(S.agents||[]).filter(a=>(a.fitness||0)>=1900).length>=5, prog:()=>Math.min(1,(S.agents||[]).filter(a=>(a.fitness||0)>=1900).length/5) },
  { id:'gen_10',       emoji:'🧬', name:'Évolution',        desc:'Générations 10 atteinte',        check:()=>(S._genCount||0)>=10,           prog:()=>Math.min(1,(S._genCount||0)/10) },
  // Thèmes
  { id:'zen_master',   emoji:'🧘', name:'Maître Zen',       desc:'Activer le mode Zen',            check:()=>S.uiSettings?.zenUsed||false,   prog:()=>S.uiSettings?.zenUsed?1:0 },
  { id:'theme_changer',emoji:'🎨', name:'Caméléon',         desc:'Utiliser 3 thèmes différents',   check:()=>(S.uiSettings?.themesUsed||[]).length>=3, prog:()=>Math.min(1,((S.uiSettings?.themesUsed||[]).length)/3) },
  // Spéciaux
  { id:'no_loss_day',  emoji:'☀️', name:'Journée Parfaite', desc:'Aucune perte en une journée (5+ trades)', check:()=>_perfectDay(), prog:()=>_perfectDay()?1:0 },
  { id:'night_trader', emoji:'🌙', name:'Trader Nocturne',  desc:'5 trades entre minuit et 6h',   check:()=>_nightTrades()>=5,              prog:()=>Math.min(1,_nightTrades()/5) },
  { id:'diversified',  emoji:'🌐', name:'Diversifié',       desc:'Trader toutes les 8 paires',     check:()=>Object.values(S.pairStates||{}).filter(p=>(p.totalTrades||0)>0).length>=8, prog:()=>Object.values(S.pairStates||{}).filter(p=>(p.totalTrades||0)>0).length/8 },
];

// Helpers
function _netPnl() {
  return Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalPnlUsd||0),0);
}
function _wr() {
  const n=S.totalTrades||0; return n>0?Math.round((S.winTrades||0)/n*100):0;
}
function _perfectDay() {
  const today=new Date().toDateString();
  const todayTrades=Object.values(S.pairStates||{}).flatMap(ps=>(ps.trades||[]).filter(t=>t.type==='position'&&t.ts&&new Date(t.ts).toDateString()===today));
  return todayTrades.length>=5 && todayTrades.every(t=>(t.pnlUsdt||0)>0);
}
function _nightTrades() {
  return Object.values(S.pairStates||{}).flatMap(ps=>(ps.trades||[]).filter(t=>t.type==='position'&&t.ts)).filter(t=>{
    const h=new Date(t.ts).getHours(); return h>=0&&h<6;
  }).length;
}

// Vérifier et débloquer les badges
function checkBadges() {
  if(!S.unlockedBadges) S.unlockedBadges = [];
  const newlyUnlocked = [];
  _BADGES.forEach(b=>{
    if(!S.unlockedBadges.includes(b.id) && b.check()) {
      S.unlockedBadges.push(b.id);
      newlyUnlocked.push(b);
    }
  });
  if(newlyUnlocked.length>0) {
    newlyUnlocked.forEach((b,i)=>setTimeout(()=>_showBadgeToast(b), i*2500));
    try { renderBadgesSection(); } catch(e) {}
  }
}
window.checkBadges = checkBadges;

function _showBadgeToast(badge) {
  const t = document.getElementById('badgeToast');
  const em= document.getElementById('btEmoji');
  const nm= document.getElementById('btName');
  if(!t||!em||!nm) return;
  em.textContent = badge.emoji;
  nm.textContent = badge.name;
  t.classList.add('show');
  try { navigator.vibrate?.([100,50,200]); } catch(e) {}
  setTimeout(()=>t.classList.remove('show'), 3500);
}

function renderBadgesSection() {
  const el = document.getElementById('badgesSection');
  if(!el) return;
  const unlocked = S.unlockedBadges || [];
  const total    = _BADGES.length;
  const doneCount= unlocked.length;

  el.innerHTML = `
    <div class="badge-section">
      <div class="badge-title">
        🏆 Achievements
        <span style="font-size:9px;font-weight:700;color:var(--gold);">${doneCount}/${total} débloqués</span>
      </div>

      <!-- Barre progression globale -->
      <div style="margin-bottom:10px;">
        <div class="badge-prog" style="height:6px;">
          <div class="badge-prog-fill" style="width:${Math.round(doneCount/total*100)}%;"></div>
        </div>
        <div style="font-size:8px;color:var(--t3);margin-top:3px;text-align:right;">${Math.round(doneCount/total*100)}% complété</div>
      </div>

      <div class="badge-grid">
        ${_BADGES.map(b=>{
          const done = unlocked.includes(b.id);
          const pct  = Math.round((b.prog()||0)*100);
          return `<div class="badge-card ${done?'unlocked':'locked'}" title="${b.desc}">
            <span class="badge-emoji">${done?b.emoji:'🔒'}</span>
            <div class="badge-name">${b.name}</div>
            <div class="badge-desc">${b.desc}</div>
            ${!done?`<div class="badge-prog"><div class="badge-prog-fill" style="width:${pct}%;"></div></div>`:''}
            ${done?'<div style="font-size:7px;color:var(--gold);margin-top:3px;">✓ Débloqué</div>':''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
}
window.renderBadgesSection = renderBadgesSection;
// ═══ v50 · MODE MULTI-COMPTE ═══
// Jusqu'à 5 comptes indépendants, chacun avec son propre state (portfolio, trades, agents)
// Stockés dans localStorage. Switcher rapide sans rechargement de page.

const _MC_KEY   = 'aura_mc_slots';
const _MC_MAX   = 5;
const _MC_EMOJIS= ['🔵','🟢','🟡','🔴','🟣'];

// Lire tous les slots depuis localStorage
function _mcLoadSlots() {
  try { return JSON.parse(localStorage.getItem(_MC_KEY)||'[]'); } catch(e) { return []; }
}
function _mcSaveSlots(slots) {
  try { localStorage.setItem(_MC_KEY, JSON.stringify(slots)); } catch(e) {}
}

// Sauvegarder le compte actuel dans le slot actif
function _mcSaveCurrent() {
  const slots = _mcLoadSlots();
  const idx   = S._mcActiveSlot ?? 0;
  const snap  = {
    idx, name: slots[idx]?.name || 'Compte '+(idx+1),
    portfolio: S.portfolio||0,
    tradingAccount: S.tradingAccount||0,
    totalTrades: S.totalTrades||0,
    winTrades: S.winTrades||0,
    pairStates: S.pairStates,
    agents: S.agents,
    fees: S.fees,
    openPositions: S.openPositions,
    tradingMode: S.tradingMode,
    savedAt: Date.now(),
  };
  slots[idx] = snap;
  _mcSaveSlots(slots);
  return snap;
}

// Switcher vers un autre slot
function switchAccount(idx) {
  if(idx === (S._mcActiveSlot??0)) { closeTsSwitcher?.(); return; }

  // Sauvegarder le compte actuel
  _mcSaveCurrent();

  // Charger le nouveau slot
  const slots = _mcLoadSlots();
  const target = slots[idx];

  if(target && target.pairStates) {
    // Restaurer le state du slot cible
    S.portfolio       = target.portfolio ?? 1000;
    S.tradingAccount  = target.tradingAccount ?? 1000;
    S.totalTrades     = target.totalTrades ?? 0;
    S.winTrades       = target.winTrades ?? 0;
    S.pairStates      = target.pairStates;
    S.agents          = target.agents || S.agents;
    S.fees            = target.fees   || S.fees;
    S.openPositions   = target.openPositions || [];
    S.tradingMode     = target.tradingMode || 'sim';
  } else {
    // Nouveau compte vierge
    S.portfolio       = 1000;
    S.tradingAccount  = 1000;
    S.totalTrades     = 0;
    S.winTrades       = 0;
    S.openPositions   = [];
    // Remettre les pairStates à zéro
    Object.values(S.pairStates||{}).forEach(ps=>{
      ps.totalTrades=0; ps.winTrades=0; ps.totalPnlUsd=0;
      ps.totalPnlPct=0; ps.trades=[]; ps.streak=0;
    });
  }

  S._mcActiveSlot = idx;
  if(!slots[idx]) {
    slots[idx] = { idx, name:'Compte '+(idx+1), portfolio:1000, totalTrades:0, savedAt:Date.now() };
    _mcSaveSlots(slots);
  }

  showToast('🔄 Compte '+(idx+1)+' · '+(_EMOJIS?.[idx]||'')+(target?.name||'Nouveau'), 2500, 'win');
  try { renderHome(); } catch(e) {}
  try { renderMultiCompteSection(); } catch(e) {}
}
window.switchAccount = switchAccount;

// Renommer un compte
function renameAccount(idx) {
  const slots = _mcLoadSlots();
  const cur   = slots[idx]?.name || 'Compte '+(idx+1);
  const name  = prompt('Nom du compte :', cur);
  if(!name || name.trim()===cur) return;
  if(!slots[idx]) slots[idx]={idx};
  slots[idx].name = name.trim().slice(0,20);
  _mcSaveSlots(slots);
  renderMultiCompteSection();
}
window.renameAccount = renameAccount;

// Supprimer un slot (sauf actif)
function deleteAccount(idx) {
  if(idx === (S._mcActiveSlot??0)) { showToast('⚠ Impossible de supprimer le compte actif', 2000, 'warn'); return; }
  if(!confirm('Supprimer le compte '+(idx+1)+' ? Toutes les données seront perdues.')) return;
  const slots = _mcLoadSlots();
  slots[idx]  = null;
  _mcSaveSlots(slots);
  renderMultiCompteSection();
  showToast('🗑 Compte '+(idx+1)+' supprimé', 1500, 'user');
}
window.deleteAccount = deleteAccount;

// Créer un nouveau slot
function createAccount() {
  const slots = _mcLoadSlots();
  const freeIdx = [0,1,2,3,4].find(i=>!slots[i]);
  if(freeIdx === undefined) { showToast('⚠ Maximum 5 comptes atteint', 2000, 'warn'); return; }
  slots[freeIdx] = { idx:freeIdx, name:'Compte '+(freeIdx+1), portfolio:1000, totalTrades:0, savedAt:Date.now() };
  _mcSaveSlots(slots);
  switchAccount(freeIdx);
}
window.createAccount = createAccount;

// Auto-save toutes les 30s
setInterval(()=>{ try { _mcSaveCurrent(); } catch(e){} }, 30000);

function renderMultiCompteSection() {
  const el = document.getElementById('multiCompteSection');
  if(!el) return;

  const slots   = _mcLoadSlots();
  const activeIdx = S._mcActiveSlot ?? 0;

  // S'assurer que le slot actif existe
  if(!slots[activeIdx]) {
    slots[activeIdx] = {
      idx:activeIdx, name:'Compte 1',
      portfolio:S.portfolio||0,
      tradingAccount:S.tradingAccount||0,
      totalTrades:S.totalTrades||0,
      winTrades:S.winTrades||0,
      savedAt:Date.now()
    };
    _mcSaveSlots(slots);
  }

  const usedSlots = [0,1,2,3,4].filter(i=>slots[i]);
  const freeSlots = 5 - usedSlots.length;

  el.innerHTML = `
    <div class="mc-section">
      <div class="mc-title">
        👥 Multi-Compte
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${usedSlots.length}/5 comptes</span>
      </div>

      <!-- Chips de switch rapide -->
      <div class="mc-switcher-bar">
        ${usedSlots.map(i=>`
          <button class="mc-chip ${i===activeIdx?'active':''}" onclick="switchAccount(${i})">
            ${_MC_EMOJIS[i]} ${slots[i]?.name||'Compte '+(i+1)}
          </button>`).join('')}
      </div>

      <!-- Liste des comptes -->
      ${[0,1,2,3,4].map(i=>{
        const slot = slots[i];
        if(!slot) return '';
        const isActive = i===activeIdx;
        const wr = slot.totalTrades>0?Math.round((slot.winTrades||0)/slot.totalTrades*100):null;
        const pnl= (slot.portfolio||0) - 1000;
        const ago= slot.savedAt?Math.round((Date.now()-slot.savedAt)/60000)+'min':'—';
        return `<div class="mc-account ${isActive?'active':''}" onclick="switchAccount(${i})">
          <div class="mc-account-avatar" style="background:${isActive?'rgba(56,212,245,.15)':'var(--s3)'};">
            ${_MC_EMOJIS[i]}
          </div>
          <div class="mc-account-info">
            <div class="mc-account-name">${slot.name||'Compte '+(i+1)}</div>
            <div class="mc-account-sub">
              ${slot.totalTrades||0} trades${wr!==null?' · '+wr+'%WR':''} · sync ${ago}
            </div>
          </div>
          <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            <span class="mc-account-pnl" style="color:${(slot.portfolio||0)>=1000?'var(--up)':'var(--down)'};">
              $${(slot.portfolio||0).toFixed(0)}
            </span>
            ${isActive?'<span class="mc-active-badge">ACTIF</span>':''}
            ${!isActive?`<button onclick="event.stopPropagation();deleteAccount(${i})" style="font-size:9px;color:var(--t3);background:none;border:none;cursor:pointer;">🗑</button>`:''}
          </div>
        </div>`;
      }).filter(Boolean).join('')}

      <!-- Bouton nouveau compte -->
      ${freeSlots>0?`<button class="mc-add-btn" onclick="createAccount()">+ Nouveau compte (${freeSlots} disponible${freeSlots>1?'s':''})</button>`:''}

      <!-- Renommer actif -->
      <button onclick="renameAccount(${activeIdx})"
        style="width:100%;margin-top:6px;padding:7px;border-radius:7px;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--t3);font-size:9px;cursor:pointer;font-family:inherit;">
        ✏️ Renommer le compte actif
      </button>

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;line-height:1.5;">
        Chaque compte a ses propres trades, agents et portfolio.<br>
        Sauvegarde automatique toutes les 30 secondes.
      </div>
    </div>`;
}
window.renderMultiCompteSection = renderMultiCompteSection;
// ═══ v51 · MODE DEMO ═══
// Charge un état fictif prédéfini pour montrer AURA à quelqu'un
// sans exposer ses vraies données. 3 scénarios : Débutant, Pro, Crise

let _demoActive = false;
let _demoBackup = null; // sauvegarde du vrai state

const _DEMO_PRESETS = {
  debutant: {
    name: '🌱 Débutant',
    desc: 'Compte de $500, premiers trades, 52% WR',
    portfolio: 523.40, tradingAccount: 521.80, cashAccount: 1.60,
    totalTrades: 15, winTrades: 8,
    pnl24h: 3.20, tradingMode: 'real',
    _paperRealCurrentRegime: 'calm',
    trades: [
      {pair:'BTC/USDT',side:'buy',pnlUsdt:4.20,pnl:0.84,ts:Date.now()-3600000*2,time:'Il y a 2h',type:'position'},
      {pair:'ETH/USDT',side:'sell',pnlUsdt:-2.10,pnl:-0.42,ts:Date.now()-3600000*5,time:'Il y a 5h',type:'position'},
      {pair:'SOL/USDT',side:'buy',pnlUsdt:6.80,pnl:1.36,ts:Date.now()-86400000,time:'Hier',type:'position'},
    ],
    agentFitness: 650,
  },
  pro: {
    name: '🏆 Trader Pro',
    desc: 'Compte de $8 500, 71% WR, Sharpe 1.8',
    portfolio: 8542.30, tradingAccount: 8400.00, cashAccount: 142.30,
    totalTrades: 284, winTrades: 202,
    pnl24h: 127.50, tradingMode: 'real',
    _paperRealCurrentRegime: 'bull',
    trades: [
      {pair:'BTC/USDT',side:'buy',pnlUsdt:85.20,pnl:1.02,ts:Date.now()-1800000,time:'Il y a 30min',type:'position'},
      {pair:'ETH/USDT',side:'buy',pnlUsdt:42.10,pnl:0.84,ts:Date.now()-3600000,time:'Il y a 1h',type:'position'},
      {pair:'XRP/USDT',side:'sell',pnlUsdt:-18.30,pnl:-0.37,ts:Date.now()-7200000,time:'Il y a 2h',type:'position'},
    ],
    agentFitness: 1750,
  },
  crise: {
    name: '📉 Gestion de Crise',
    desc: 'Marché baissier, drawdown 12%, mode rescue actif',
    portfolio: 880.20, tradingAccount: 875.00, cashAccount: 5.20,
    totalTrades: 47, winTrades: 21,
    pnl24h: -34.80, tradingMode: 'real',
    _paperRealCurrentRegime: 'bear',
    trades: [
      {pair:'BTC/USDT',side:'buy',pnlUsdt:-28.40,pnl:-0.57,ts:Date.now()-900000,time:'Il y a 15min',type:'position'},
      {pair:'DOGE/USDT',side:'buy',pnlUsdt:-12.60,pnl:-0.25,ts:Date.now()-3600000,time:'Il y a 1h',type:'position'},
      {pair:'SOL/USDT',side:'sell',pnlUsdt:8.20,pnl:0.16,ts:Date.now()-7200000,time:'Il y a 2h',type:'position'},
    ],
    agentFitness: 320,
  },
};

function enterDemoMode(presetKey) {
  const preset = _DEMO_PRESETS[presetKey];
  if(!preset) return;

  // Sauvegarder le vrai state
  _demoBackup = {
    portfolio: S.portfolio, tradingAccount: S.tradingAccount,
    cashAccount: S.cashAccount, totalTrades: S.totalTrades,
    winTrades: S.winTrades, pnl24h: S.pnl24h,
    tradingMode: S.tradingMode, _paperRealCurrentRegime: S._paperRealCurrentRegime,
    agents: JSON.parse(JSON.stringify(S.agents||[])),
    pairStates: JSON.parse(JSON.stringify(S.pairStates||{})),
    openPositions: JSON.parse(JSON.stringify(S.openPositions||[])),
  };

  // Appliquer le preset
  S.portfolio       = preset.portfolio;
  S.tradingAccount  = preset.tradingAccount;
  S.cashAccount     = preset.cashAccount;
  S.totalTrades     = preset.totalTrades;
  S.winTrades       = preset.winTrades;
  S.pnl24h          = preset.pnl24h;
  S._paperRealCurrentRegime = preset._paperRealCurrentRegime;

  // Peupler les trades dans les pairStates
  Object.values(S.pairStates||{}).forEach((ps,i)=>{
    const t = preset.trades[i % preset.trades.length];
    if(t) { ps.trades = [t]; ps.totalTrades=1; ps.totalPnlUsd=t.pnlUsdt; ps.winTrades=t.pnlUsdt>0?1:0; }
  });

  // Simuler des agents avec la fitness preset
  (S.agents||[]).forEach(a=>{ a.fitness = preset.agentFitness + (Math.random()-0.5)*200; });

  _demoActive = true;
  S._demoMode = presetKey;

  // Afficher la bannière
  document.getElementById('demoBanner')?.classList.add('show');
  // Décaler le contenu
  document.getElementById('pages')?.style.setProperty('padding-top','28px');

  showToast('🎭 Mode Démo : '+preset.name, 2500, 'win');
  try { renderHome(); } catch(e) {}
  try { closeOutils(); } catch(e) {}
}
window.enterDemoMode = enterDemoMode;

function exitDemoMode() {
  if(!_demoBackup) { _demoActive=false; document.getElementById('demoBanner')?.classList.remove('show'); return; }

  // Restaurer le vrai state
  S.portfolio       = _demoBackup.portfolio;
  S.tradingAccount  = _demoBackup.tradingAccount;
  S.cashAccount     = _demoBackup.cashAccount;
  S.totalTrades     = _demoBackup.totalTrades;
  S.winTrades       = _demoBackup.winTrades;
  S.pnl24h          = _demoBackup.pnl24h;
  S.tradingMode     = _demoBackup.tradingMode;
  S._paperRealCurrentRegime = _demoBackup._paperRealCurrentRegime;
  S.agents          = _demoBackup.agents;
  S.pairStates      = _demoBackup.pairStates;
  S.openPositions   = _demoBackup.openPositions;
  S._demoMode       = null;

  _demoActive = false;
  _demoBackup = null;

  document.getElementById('demoBanner')?.classList.remove('show');
  document.getElementById('pages')?.style.removeProperty('padding-top');

  showToast('✅ Mode Démo terminé — données réelles restaurées', 2500, 'win');
  try { renderHome(); } catch(e) {}
}
window.exitDemoMode = exitDemoMode;

function renderDemoSection() {
  const el = document.getElementById('demoSection');
  if(!el) return;

  el.innerHTML = `
    <div class="demo-section">
      <div class="demo-title">
        🎭 Mode Démo
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${_demoActive?'ACTIF · '+(_DEMO_PRESETS[S._demoMode]?.name||''):'Inactif'}</span>
      </div>

      <div style="font-size:9px;color:var(--t2);line-height:1.5;margin-bottom:10px;">
        Montre AURA à quelqu'un avec des données fictives.<br>
        Tes vraies données sont <strong style="color:var(--up);">préservées</strong> et restaurées automatiquement à la sortie.
      </div>

      ${_demoActive?`
        <div style="background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.25);border-radius:8px;padding:10px;text-align:center;margin-bottom:10px;">
          <div style="font-size:12px;font-weight:800;color:var(--pur);">🎭 Démo en cours</div>
          <div style="font-size:9px;color:var(--t3);margin-top:3px;">${_DEMO_PRESETS[S._demoMode]?.name||''}</div>
        </div>
        <button onclick="exitDemoMode()" style="width:100%;padding:10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;background:rgba(255,61,107,.1);border:1px solid rgba(255,61,107,.3);color:var(--down);">
          ✕ Quitter le mode Démo
        </button>
      ` : `
        ${Object.entries(_DEMO_PRESETS).map(([key,p])=>`
          <div class="demo-preset" onclick="enterDemoMode('${key}')">
            <span class="demo-preset-icon">${p.name.split(' ')[0]}</span>
            <div class="demo-preset-info">
              <div class="demo-preset-name">${p.name.replace(/^.\s/,'')}</div>
              <div class="demo-preset-desc">${p.desc}</div>
            </div>
            <span class="demo-preset-badge" style="background:rgba(167,139,250,.1);color:var(--pur);">▶</span>
          </div>`).join('')}
      `}
    </div>`;
}
window.renderDemoSection = renderDemoSection;
// ═══ v52 · DASHBOARD PUBLIC ═══
// Génère une page HTML autonome partageble avec tes stats publiques
// Champs visibles configurables (masquer portfolio réel, etc.)
// Partage par lien ou copie du HTML

const _DP_DEFAULTS = {
  showPortfolio:  false,  // masquer le montant réel
  showWR:         true,
  showTrades:     true,
  showPnlPct:     true,
  showPnlUsd:     false,  // masquer le P&L en $
  showAgents:     true,
  showPairs:      true,
  showSharpe:     true,
  nickname:       'AURA Trader',
};

function _dpGetSettings() {
  if(!S.dashPublic) S.dashPublic = {..._DP_DEFAULTS};
  return S.dashPublic;
}

function toggleDpField(key) {
  const cfg = _dpGetSettings();
  cfg[key] = !cfg[key];
  renderDashPublicSection();
}
window.toggleDpField = toggleDpField;

function updateDpNickname() {
  const el = document.getElementById('dpNickname');
  if(!el) return;
  const cfg = _dpGetSettings();
  cfg.nickname = el.value.trim().slice(0,30) || 'AURA Trader';
}
window.updateDpNickname = updateDpNickname;

function generateDashboardHTML() {
  const cfg   = _dpGetSettings();
  const m     = typeof computeAdvancedMetrics==='function' ? computeAdvancedMetrics() : null;
  const n     = S.totalTrades||0;
  const wr    = n>0 ? Math.round((S.winTrades||0)/n*100) : 0;
  const totalPnl = Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalPnlUsd||0),0);
  const regime= S._paperRealCurrentRegime||'calm';
  const now   = new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

  const pairRows = Object.entries(S.pairStates||{}).filter(([,ps])=>ps.totalTrades>0)
    .map(([pair,ps])=>{
      const pwr = ps.totalTrades>0?Math.round((ps.winTrades||0)/ps.totalTrades*100):0;
      return `<tr>
        <td style="padding:6px 10px;font-weight:600;">${pair}</td>
        <td style="padding:6px 10px;text-align:center;">${ps.totalTrades}</td>
        ${cfg.showWR?`<td style="padding:6px 10px;text-align:center;color:${pwr>=55?'#16a34a':'#dc2626'};">${pwr}%</td>`:''}
        ${cfg.showPnlUsd?`<td style="padding:6px 10px;text-align:right;color:${ps.totalPnlUsd>=0?'#16a34a':'#dc2626'};">${ps.totalPnlUsd>=0?'+':''}$${ps.totalPnlUsd.toFixed(2)}</td>`:''}
      </tr>`;
    }).join('');

  const topAgents = [...(S.agents||[])].sort((a,b)=>(b.fitness||0)-(a.fitness||0)).slice(0,5);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${cfg.nickname} — AURA Dashboard</title>
<meta property="og:title" content="${cfg.nickname} — AURA Trading Dashboard">
<meta property="og:description" content="${n} trades · ${wr}% Win Rate · ${regime.toUpperCase()}">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#050709;color:#e0e0e0;min-height:100vh;padding:20px;}
.card{background:#0b0e14;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;margin-bottom:16px;}
h1{font-size:22px;font-weight:900;color:#fff;margin-bottom:4px;}
h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#666;margin-bottom:12px;}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;}
.kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:4px;}
@media(min-width:500px){.kpi-grid{grid-template-columns:repeat(4,1fr);}}
.kpi{background:#111620;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:12px;text-align:center;}
.kpi-val{font-size:22px;font-weight:900;font-family:monospace;display:block;}
.kpi-lbl{font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.08em;margin-top:3px;}
table{width:100%;border-collapse:collapse;font-size:11px;}
th{background:#111620;padding:6px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#666;}
td{border-bottom:1px solid rgba(255,255,255,.04);}
.agent-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.fit-bar{flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden;}
.fit-fill{height:100%;background:#38d4f5;border-radius:100px;}
.footer{text-align:center;font-size:9px;color:#444;margin-top:20px;}
.regime{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;display:inline-block;}
</style>
</head>
<body>
<div class="card">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
    <div>
      <h1>${cfg.nickname}</h1>
      <div style="font-size:11px;color:#666;margin-top:2px;">AURA ∞ · ${now}</div>
    </div>
    <div>
      <span class="regime" style="background:${regime.includes('bull')?'rgba(0,232,122,.12)':regime.includes('bear')?'rgba(255,61,107,.12)':'rgba(255,255,255,.06)'};color:${regime.includes('bull')?'#00e87a':regime.includes('bear')?'#ff3d6b':'#aaa'};">
        ${regime.toUpperCase()}
      </span>
    </div>
  </div>

  <div class="kpi-grid">
    ${cfg.showTrades?`<div class="kpi"><span class="kpi-val" style="color:#38d4f5;">${n}</span><span class="kpi-lbl">Trades</span></div>`:''}
    ${cfg.showWR?`<div class="kpi"><span class="kpi-val" style="color:${wr>=55?'#00e87a':'#ff3d6b'};">${wr}%</span><span class="kpi-lbl">Win Rate</span></div>`:''}
    ${cfg.showPortfolio?`<div class="kpi"><span class="kpi-val" style="color:#fff;">$${(S.tradingAccount||0).toFixed(0)}</span><span class="kpi-lbl">Portfolio</span></div>`:''}
    ${cfg.showSharpe&&m?`<div class="kpi"><span class="kpi-val" style="color:${m.sharpe>=1?'#00e87a':m.sharpe>=0?'#f5c842':'#ff3d6b'};">${m.sharpe.toFixed(2)}</span><span class="kpi-lbl">Sharpe</span></div>`:''}
    ${cfg.showPnlPct&&m?`<div class="kpi"><span class="kpi-val" style="color:${m.profitFactor>=1?'#00e87a':'#ff3d6b'};">${m.profitFactor.toFixed(2)}</span><span class="kpi-lbl">Profit Factor</span></div>`:''}
    ${cfg.showPnlUsd?`<div class="kpi"><span class="kpi-val" style="color:${totalPnl>=0?'#00e87a':'#ff3d6b'};">${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}</span><span class="kpi-lbl">P&L Net</span></div>`:''}
  </div>
</div>

${cfg.showPairs?`
<div class="card">
  <h2>₿ Performance par paire</h2>
  <table>
    <tr><th>Paire</th><th>Trades</th>${cfg.showWR?'<th>WR</th>':''}${cfg.showPnlUsd?'<th>P&L</th>':''}</tr>
    ${pairRows}
  </table>
</div>`:''}

${cfg.showAgents?`
<div class="card">
  <h2>🤖 Top agents</h2>
  ${topAgents.map(a=>`<div class="agent-row">
    <span style="font-size:18px;">${a.emoji||'🤖'}</span>
    <span style="flex:1;font-size:11px;font-weight:600;">${a.name||'—'}</span>
    <div class="fit-bar"><div class="fit-fill" style="width:${Math.min(100,(a.fitness||0)/20)}%;"></div></div>
    <span style="font-size:10px;color:#38d4f5;min-width:50px;text-align:right;">${Math.floor(a.fitness||0)} T$</span>
  </div>`).join('')}
</div>`:''}

<div class="footer">
  Généré par AURA ∞ — Adaptive Universal Risk Architect<br>
  Dashboard public · ${now}
</div>
</body>
</html>`;
}
window.generateDashboardHTML = generateDashboardHTML;

function shareDashboard() {
  const html = generateDashboardHTML();
  const blob = new Blob([html], {type:'text/html'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download='aura_dashboard_public.html';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('📤 Dashboard téléchargé — partage le fichier HTML', 3000, 'win');
}
window.shareDashboard = shareDashboard;

function previewDashboard() {
  const html = generateDashboardHTML();
  const win  = window.open('','_blank','width=500,height=700');
  if(!win) { showToast('⚠ Autoriser les popups', 2000, 'warn'); return; }
  win.document.write(html); win.document.close();
}
window.previewDashboard = previewDashboard;

function renderDashPublicSection() {
  const el = document.getElementById('dashPublicSection');
  if(!el) return;
  const cfg = _dpGetSettings();
  const n   = S.totalTrades||0;
  const wr  = n>0?Math.round((S.winTrades||0)/n*100):0;

  const fields = [
    {key:'showPortfolio', lbl:'💰 Afficher le portfolio ($)'},
    {key:'showWR',        lbl:'🎯 Win Rate'},
    {key:'showTrades',    lbl:'📊 Nombre de trades'},
    {key:'showPnlUsd',    lbl:'💵 P&L en dollars'},
    {key:'showPnlPct',    lbl:'📈 Profit Factor'},
    {key:'showSharpe',    lbl:'📐 Sharpe Ratio'},
    {key:'showAgents',    lbl:'🤖 Top Agents'},
    {key:'showPairs',     lbl:'₿ Performance par paire'},
  ];

  el.innerHTML = `
    <div class="dp-section">
      <div class="dp-title">📤 Dashboard Public
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Partager tes stats</span>
      </div>

      <!-- Pseudo -->
      <div style="margin-bottom:10px;">
        <div style="font-size:9px;color:var(--t3);margin-bottom:4px;">Ton pseudo public</div>
        <input id="dpNickname" type="text" maxlength="30" value="${cfg.nickname}"
          onchange="updateDpNickname()"
          style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:7px;color:var(--t1);font-size:11px;padding:7px 10px;font-family:inherit;">
      </div>

      <!-- Champs visibles -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Champs visibles</div>
      ${fields.map(f=>`
        <div class="dp-field-row">
          <span class="dp-field-lbl">${f.lbl}</span>
          <button class="dp-toggle ${cfg[f.key]?'on':''}" onclick="toggleDpField('${f.key}')"></button>
        </div>`).join('')}

      <!-- Aperçu mini -->
      <div style="margin:10px 0 6px;font-size:9px;color:var(--t3);">Aperçu</div>
      <div class="dp-preview">
        <div class="dp-preview-header">
          <span style="font-size:12px;font-weight:800;">${cfg.nickname}</span>
          <span style="font-size:9px;color:var(--t3);">AURA ∞</span>
        </div>
        ${cfg.showTrades?`<div class="dp-stat-row"><span style="color:var(--t2);">Trades</span><span style="font-weight:700;">${n}</span></div>`:''}
        ${cfg.showWR?`<div class="dp-stat-row"><span style="color:var(--t2);">Win Rate</span><span style="font-weight:700;color:${wr>=55?'var(--up)':'var(--down)'};">${wr}%</span></div>`:''}
        ${cfg.showPortfolio?`<div class="dp-stat-row"><span style="color:var(--t2);">Portfolio</span><span style="font-weight:700;">$${(S.tradingAccount||0).toFixed(0)}</span></div>`:''}
      </div>

      <!-- Boutons -->
      <button class="dp-share-btn" onclick="previewDashboard()"
        style="background:rgba(56,212,245,.08);border-color:rgba(56,212,245,.25);color:var(--ice);">
        👁 Prévisualiser
      </button>
      <button class="dp-share-btn" onclick="shareDashboard()"
        style="background:rgba(0,232,122,.08);border-color:rgba(0,232,122,.25);color:var(--up);">
        📥 Télécharger le dashboard HTML
      </button>
      <div style="font-size:8px;color:var(--t3);text-align:center;line-height:1.5;">
        Fichier HTML autonome — partage par email, WhatsApp, Discord ou héberge sur GitHub Pages
      </div>
    </div>`;
}
window.renderDashPublicSection = renderDashPublicSection;
// ═══ v53 · FUND MANAGER ═══
// Gérer plusieurs investisseurs fictifs avec leur allocation, P&L, frais de gestion
// Génère un rapport de performance par investisseur

function _fmInit() {
  if(!S.fundManager) S.fundManager = {
    fundName: 'AURA Fund',
    managementFee: 2.0,  // % annuel
    performanceFee: 20.0, // % des gains
    investors: [
      { id:1, name:'Investisseur A', emoji:'👤', allocation:5000, since:Date.now()-86400000*30 },
      { id:2, name:'Investisseur B', emoji:'👥', allocation:3000, since:Date.now()-86400000*15 },
    ],
    nextId: 3,
  };
}

function _fmCalcStats() {
  _fmInit();
  const fm    = S.fundManager;
  const totalPnlPct = S.totalTrades>0 ? (() => {
    const allT = Object.values(S.pairStates||{}).flatMap(ps=>(ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null));
    const sum  = allT.reduce((s,t)=>s+(t.pnl||0),0);
    return allT.length>0 ? sum/allT.length : 0;
  })() : 0;

  const totalAlloc = fm.investors.reduce((s,inv)=>s+(inv.allocation||0),0);
  const navPerUnit = 1 + totalPnlPct/100;

  // Calculer la perf de chaque investisseur
  return fm.investors.map(inv=>{
    const daysInvested  = Math.max(1, Math.round((Date.now()-inv.since)/86400000));
    const pnlAmt        = (inv.allocation||0) * (totalPnlPct/100);
    const perfFee       = Math.max(0, pnlAmt * (fm.performanceFee/100));
    const mgmtFee       = (inv.allocation||0) * (fm.managementFee/100) * (daysInvested/365);
    const netPnl        = pnlAmt - perfFee - mgmtFee;
    const pnlPct        = (inv.allocation||0)>0 ? (netPnl/(inv.allocation||0)*100) : 0;
    return { ...inv, pnlAmt, perfFee, mgmtFee, netPnl, pnlPct, daysInvested, totalAlloc };
  });
}

function addInvestor() {
  _fmInit();
  const name  = prompt('Nom de l\'investisseur :', 'Investisseur '+S.fundManager.nextId);
  if(!name) return;
  const alloc = parseFloat(prompt('Allocation ($) :', '1000')||'0');
  if(!isFinite(alloc)||alloc<=0) { showToast('⚠ Montant invalide', 1500,'warn'); return; }
  S.fundManager.investors.push({
    id: S.fundManager.nextId++,
    name: name.trim().slice(0,25),
    emoji: ['👤','👥','🏦','💼','🌐'][Math.floor(Math.random()*5)],
    allocation: alloc,
    since: Date.now(),
  });
  showToast('✅ Investisseur ajouté', 1500, 'win');
  renderFundManagerSection();
}
window.addInvestor = addInvestor;

function removeInvestor(id) {
  _fmInit();
  if(!confirm('Retirer cet investisseur ?')) return;
  S.fundManager.investors = S.fundManager.investors.filter(i=>i.id!==id);
  renderFundManagerSection();
}
window.removeInvestor = removeInvestor;

function updateFundParam(key, val) {
  _fmInit();
  S.fundManager[key] = parseFloat(val)||0;
  renderFundManagerSection();
}
window.updateFundParam = updateFundParam;

function updateFundName() {
  _fmInit();
  const el = document.getElementById('fmFundName');
  if(el) S.fundManager.fundName = el.value.trim().slice(0,30)||'AURA Fund';
}
window.updateFundName = updateFundName;

function exportFundReport() {
  _fmInit();
  const fm      = S.fundManager;
  const stats   = _fmCalcStats();
  const totalAlloc  = stats.reduce((s,i)=>s+(i.allocation||0),0);
  const totalPnl    = stats.reduce((s,i)=>s+(i.netPnl||0),0);
  const totalFees   = stats.reduce((s,i)=>s+(i.perfFee||0)+(i.mgmtFee||0),0);
  const now = new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>${fm.fundName} — Rapport de Performance</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;padding:15mm;font-size:10pt;}
h1{font-size:20pt;font-weight:900;color:#0a0a1a;}
h2{font-size:11pt;font-weight:700;color:#1a1a2e;margin:14px 0 6px;border-bottom:2px solid #e5e7eb;padding-bottom:3px;}
.kpi{display:inline-block;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;text-align:center;margin:4px;}
.kv{font-size:16pt;font-weight:800;display:block;}
.kl{font-size:7pt;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:9pt;}
th{background:#1a1a2e;color:#fff;padding:6px 8px;text-align:left;font-size:8pt;}
td{padding:5px 8px;border-bottom:1px solid #f1f5f9;}
.win{color:#16a34a;font-weight:700;} .loss{color:#dc2626;font-weight:700;}
.footer{margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:7pt;color:#9ca3af;display:flex;justify-content:space-between;}
</style></head><body>
<h1>${fm.fundName}</h1>
<p style="color:#6b7280;font-size:9pt;margin:4px 0 16px;">Rapport de performance · ${now} · AURA ∞</p>
<div style="margin-bottom:16px;">
  <div class="kpi"><span class="kv">$${totalAlloc.toFixed(0)}</span><span class="kl">AUM Total</span></div>
  <div class="kpi"><span class="kv" style="color:${totalPnl>=0?'#16a34a':'#dc2626'};">${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}</span><span class="kl">P&L Net clients</span></div>
  <div class="kpi"><span class="kv">$${totalFees.toFixed(2)}</span><span class="kl">Frais de gestion</span></div>
  <div class="kpi"><span class="kv">${fm.investors.length}</span><span class="kl">Investisseurs</span></div>
</div>
<h2>👥 Performance par investisseur</h2>
<table><tr><th>Investisseur</th><th>Allocation</th><th>Jours</th><th>P&L brut</th><th>Frais perf.</th><th>Frais gestion</th><th>P&L net</th><th>Rendement</th></tr>
${stats.map(i=>`<tr>
  <td><b>${i.name}</b></td>
  <td>$${(i.allocation||0).toFixed(0)}</td>
  <td>${i.daysInvested}j</td>
  <td class="${i.pnlAmt>=0?'win':'loss'}">${i.pnlAmt>=0?'+':''}$${i.pnlAmt.toFixed(2)}</td>
  <td style="color:#d97706;">-$${i.perfFee.toFixed(2)}</td>
  <td style="color:#d97706;">-$${i.mgmtFee.toFixed(2)}</td>
  <td class="${i.netPnl>=0?'win':'loss'}">${i.netPnl>=0?'+':''}$${i.netPnl.toFixed(2)}</td>
  <td class="${i.pnlPct>=0?'win':'loss'}">${i.pnlPct>=0?'+':''}${i.pnlPct.toFixed(2)}%</td>
</tr>`).join('')}
</table>
<h2>💼 Structure des frais</h2>
<p style="font-size:9pt;color:#374151;">Management fee : ${fm.managementFee}% /an · Performance fee : ${fm.performanceFee}% des gains</p>
<div class="footer"><span>${fm.fundName} · Powered by AURA ∞</span><span>${now}</span></div>
</body></html>`;

  const win = window.open('','_blank','width=900,height=600');
  if(!win) { showToast('⚠ Autoriser les popups', 2000,'warn'); return; }
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(()=>win.print(), 600);
  showToast('📄 Rapport Fund Manager généré', 2500, 'win');
}
window.exportFundReport = exportFundReport;

function renderFundManagerSection() {
  const el = document.getElementById('fundManagerSection');
  if(!el) return;
  _fmInit();
  const fm       = S.fundManager;
  const stats    = _fmCalcStats();
  const totalAlloc  = stats.reduce((s,i)=>s+(i.allocation||0),0);
  const totalNetPnl = stats.reduce((s,i)=>s+(i.netPnl||0),0);
  const totalFees   = stats.reduce((s,i)=>s+(i.perfFee||0)+(i.mgmtFee||0),0);
  const wr       = S.totalTrades>0 ? Math.round((S.winTrades||0)/S.totalTrades*100) : 0;

  el.innerHTML = `
    <div class="fm-section">
      <div class="fm-title">💼 Fund Manager
        <span style="font-size:8px;color:var(--gold);font-weight:400;">Gérer tes investisseurs</span>
      </div>

      <!-- Nom du fonds -->
      <input id="fmFundName" type="text" maxlength="30" value="${fm.fundName}"
        onchange="updateFundName()"
        style="width:100%;background:var(--s2);border:1px solid rgba(245,200,66,.3);border-radius:7px;color:var(--gold);font-size:12px;font-weight:700;padding:7px 10px;font-family:inherit;margin-bottom:10px;">

      <!-- KPIs fonds -->
      <div class="fm-kpi-grid">
        <div class="fm-kpi"><span class="fm-kpi-val" style="color:var(--gold);">$${totalAlloc.toFixed(0)}</span><span class="fm-kpi-lbl">AUM Total</span></div>
        <div class="fm-kpi"><span class="fm-kpi-val" style="color:${totalNetPnl>=0?'var(--up)':'var(--down)'};">${totalNetPnl>=0?'+':''}$${totalNetPnl.toFixed(2)}</span><span class="fm-kpi-lbl">P&L net clients</span></div>
        <div class="fm-kpi"><span class="fm-kpi-val" style="color:var(--gold);">$${totalFees.toFixed(2)}</span><span class="fm-kpi-lbl">Frais perçus</span></div>
        <div class="fm-kpi"><span class="fm-kpi-val">${fm.investors.length}</span><span class="fm-kpi-lbl">Investisseurs</span></div>
      </div>

      <!-- Frais configuration -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:8px;color:var(--t3);margin-bottom:3px;">Mgmt fee (% /an)</div>
          <input type="number" min="0" max="5" step="0.1" value="${fm.managementFee}"
            onchange="updateFundParam('managementFee',this.value)"
            style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t1);font-size:11px;padding:5px 8px;font-family:inherit;">
        </div>
        <div>
          <div style="font-size:8px;color:var(--t3);margin-bottom:3px;">Perf fee (% gains)</div>
          <input type="number" min="0" max="50" step="1" value="${fm.performanceFee}"
            onchange="updateFundParam('performanceFee',this.value)"
            style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t1);font-size:11px;padding:5px 8px;font-family:inherit;">
        </div>
      </div>

      <!-- Liste investisseurs -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Investisseurs (${stats.length})</div>
      ${stats.map(inv=>{
        const allocPct = totalAlloc>0?Math.round(inv.allocation/totalAlloc*100):0;
        return `<div class="fm-investor">
          <div class="fm-investor-avatar">${inv.emoji}</div>
          <div class="fm-investor-info">
            <div class="fm-investor-name">${inv.name}</div>
            <div class="fm-investor-sub">$${inv.allocation.toFixed(0)} · ${inv.daysInvested}j · ${allocPct}% du fonds</div>
            <div class="fm-alloc-bar"><div class="fm-alloc-fill" style="width:${allocPct}%;background:var(--gold);"></div></div>
          </div>
          <div class="fm-investor-pnl">
            <div style="font-size:12px;font-weight:800;font-family:var(--font-mono);color:${inv.netPnl>=0?'var(--up)':'var(--down)'};">${inv.netPnl>=0?'+':''}$${inv.netPnl.toFixed(2)}</div>
            <div style="font-size:8px;color:var(--t3);">${inv.pnlPct>=0?'+':''}${inv.pnlPct.toFixed(2)}%</div>
            <button onclick="removeInvestor(${inv.id})" style="font-size:9px;color:var(--t3);background:none;border:none;cursor:pointer;margin-top:2px;">🗑</button>
          </div>
        </div>`;
      }).join('')}

      <button class="fm-add-btn" onclick="addInvestor()">+ Ajouter un investisseur</button>

      <!-- Performance globale -->
      <div style="margin-top:10px;">
        <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Performance du fonds</div>
        <div class="fm-perf-row"><span style="color:var(--t2);">Win Rate stratégie</span><span style="font-weight:700;color:${wr>=55?'var(--up)':'var(--down)'};">${wr}%</span></div>
        <div class="fm-perf-row"><span style="color:var(--t2);">Total trades</span><span style="font-weight:700;">${S.totalTrades||0}</span></div>
        <div class="fm-perf-row"><span style="color:var(--t2);">Frais mgmt perçus</span><span style="font-weight:700;color:var(--gold);">$${stats.reduce((s,i)=>s+i.mgmtFee,0).toFixed(2)}</span></div>
        <div class="fm-perf-row"><span style="color:var(--t2);">Frais perf perçus</span><span style="font-weight:700;color:var(--gold);">$${stats.reduce((s,i)=>s+i.perfFee,0).toFixed(2)}</span></div>
      </div>

      <button onclick="exportFundReport()"
        style="width:100%;margin-top:10px;padding:9px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;background:rgba(245,200,66,.1);border:1px solid rgba(245,200,66,.3);color:var(--gold);">
        📄 Exporter rapport investisseurs (PDF)
      </button>
    </div>`;
}
window.renderFundManagerSection = renderFundManagerSection;
// ═══ v54 · WIDGET ANDROID ═══
// Génère une mini-page HTML autonome optimisée pour l'écran d'accueil Android
// Données exportées au moment du téléchargement
// L'utilisateur l'ajoute via Chrome → "Ajouter à l'écran d'accueil"

function _buildWidgetHTML() {
  const n      = S.totalTrades || 0;
  const wins   = S.winTrades   || 0;
  const wr     = n > 0 ? Math.round(wins/n*100) : 0;
  const pnl24h = S.pnl24h || 0;
  const capital= S.tradingAccount || 0;
  const regime = S._paperRealCurrentRegime || 'calm';
  const openPos= (S.openPositions||[]).length;
  const agents = S.agents || [];
  const avgFit = agents.length>0 ? Math.round(agents.reduce((s,a)=>s+(a.fitness||0),0)/agents.length) : 0;
  const now    = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  const today  = new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});

  const pnlCol = pnl24h >= 0 ? '#00e87a' : '#ff3d6b';
  const wrCol  = wr >= 55 ? '#00e87a' : '#ff3d6b';
  const regColor = regime.includes('bull')?'#00e87a':regime.includes('bear')?'#ff3d6b':'#38d4f5';
  const regLabel = {bull:'▲ BULL',volatile_bull:'▲ VOLT+',calm:'◌ CALM',volatile:'◈ VOLT',volatile_bear:'▼ VOLT−',bear:'▼ BEAR'}[regime]||'CALM';

  // Paires avec positions ouvertes
  const activePairs = (S.openPositions||[]).map(p=>p.pair?.replace('/USDT','')||'?').join(' · ') || '—';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#050709">
<title>AURA Widget</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{width:100%;height:100%;overflow:hidden;}
body{background:#050709;color:#e0e0e0;font-family:'SF Pro Display',system-ui,sans-serif;
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;}
.widget{width:100%;max-width:320px;background:linear-gradient(135deg,#0b0e14,#0f1520);
  border-radius:20px;border:1px solid rgba(255,255,255,.08);padding:14px;
  box-shadow:0 8px 32px rgba(0,0,0,.6);}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.logo{font-size:11px;font-weight:900;color:#38d4f5;letter-spacing:.1em;}
.time{font-size:10px;color:#555;}
.pnl-row{display:flex;align-items:baseline;gap:6px;margin-bottom:6px;}
.pnl-val{font-size:28px;font-weight:900;font-family:monospace;color:${pnlCol};}
.pnl-lbl{font-size:9px;color:#555;text-transform:uppercase;letter-spacing:.08em;}
.regime-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;
  color:${regColor};background:${regColor}18;margin-bottom:10px;}
.stats-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;}
.stat{background:rgba(255,255,255,.04);border-radius:8px;padding:7px;text-align:center;}
.stat-val{font-size:14px;font-weight:800;font-family:monospace;display:block;}
.stat-lbl{font-size:7px;color:#555;text-transform:uppercase;letter-spacing:.06em;margin-top:2px;}
.footer-row{display:flex;justify-content:space-between;align-items:center;
  border-top:1px solid rgba(255,255,255,.05);padding-top:8px;font-size:9px;color:#444;}
.dot{width:6px;height:6px;border-radius:50%;background:#00e87a;display:inline-block;margin-right:4px;
  animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
.pos-badge{background:rgba(0,232,122,.1);color:#00e87a;padding:1px 6px;border-radius:5px;font-size:8px;font-weight:700;}
</style>
</head>
<body>
<div class="widget">
  <div class="header">
    <span class="logo">AURA ∞</span>
    <span class="time">${today} · ${now}</span>
  </div>

  <div class="pnl-row">
    <span class="pnl-val">${pnl24h>=0?'+':''}$${Math.abs(pnl24h).toFixed(2)}</span>
    <span class="pnl-lbl">P&L 24h</span>
  </div>

  <span class="regime-badge">${regLabel}</span>

  <div class="stats-grid">
    <div class="stat">
      <span class="stat-val" style="color:${wrCol};">${wr}%</span>
      <span class="stat-lbl">Win Rate</span>
    </div>
    <div class="stat">
      <span class="stat-val" style="color:#fff;">$${capital.toFixed(0)}</span>
      <span class="stat-lbl">Capital</span>
    </div>
    <div class="stat">
      <span class="stat-val" style="color:#38d4f5;">${n}</span>
      <span class="stat-lbl">Trades</span>
    </div>
  </div>

  <div class="footer-row">
    <span><span class="dot"></span>${openPos > 0 ? openPos+' pos. ouvertes' : 'Aucune position'}</span>
    ${openPos > 0 ? `<span class="pos-badge">${activePairs}</span>` : `<span style="color:#333;">${avgFit} T$ moy.</span>`}
  </div>
</div>
<div style="margin-top:8px;font-size:8px;color:#333;text-align:center;">
  Généré le ${new Date().toLocaleString('fr-FR')} · Données figées
</div>
</body>
</html>`;
}

function downloadWidget() {
  const html = _buildWidgetHTML();
  const blob = new Blob([html], {type:'text/html'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download='AURA_widget.html';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('📱 Widget téléchargé — ouvre dans Chrome → ⋮ → Ajouter à l\'écran d\'accueil', 5000, 'user');
}
window.downloadWidget = downloadWidget;

function previewWidget() {
  const html = _buildWidgetHTML();
  const win  = window.open('','_blank','width=360,height=280');
  if(!win){ showToast('⚠ Autoriser les popups', 2000,'warn'); return; }
  win.document.write(html); win.document.close();
}
window.previewWidget = previewWidget;

function renderWidgetSection() {
  const el = document.getElementById('widgetSection');
  if(!el) return;

  const n      = S.totalTrades||0;
  const wr     = n>0?Math.round((S.winTrades||0)/n*100):0;
  const pnl24h = S.pnl24h||0;
  const capital= S.tradingAccount||0;
  const openPos= (S.openPositions||[]).length;

  el.innerHTML = `
    <div class="wd-section">
      <div class="wd-title">📱 Widget Android
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Écran d'accueil</span>
      </div>

      <!-- Aperçu widget -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Aperçu du widget</div>
      <div class="wd-preview">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:10px;font-weight:900;color:#38d4f5;letter-spacing:.1em;">AURA ∞</span>
          <span style="font-size:9px;color:#555;">${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</span>
        </div>
        <div style="font-size:24px;font-weight:900;font-family:var(--font-mono);color:${pnl24h>=0?'var(--up)':'var(--down)'};">
          ${pnl24h>=0?'+':''}$${Math.abs(pnl24h).toFixed(2)}
        </div>
        <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:.08em;margin:2px 0 8px;">P&L 24h</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:8px;">
          ${[
            {v:wr+'%', l:'WR', c:wr>=55?'var(--up)':'var(--down)'},
            {v:'$'+capital.toFixed(0), l:'Capital', c:'#fff'},
            {v:n, l:'Trades', c:'var(--ice)'},
          ].map(s=>`<div style="background:rgba(255,255,255,.04);border-radius:6px;padding:5px;text-align:center;">
            <div style="font-size:13px;font-weight:800;font-family:var(--font-mono);color:${s.c};">${s.v}</div>
            <div style="font-size:7px;color:#555;text-transform:uppercase;margin-top:1px;">${s.l}</div>
          </div>`).join('')}
        </div>
        <div style="border-top:1px solid rgba(255,255,255,.05);padding-top:6px;font-size:9px;color:#444;">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#00e87a;margin-right:4px;"></span>
          ${openPos>0?openPos+' position(s) ouverte(s)':'Aucune position'}
        </div>
      </div>

      <!-- Instructions -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Comment l'installer</div>
      ${[
        ['1', 'Télécharge le widget ci-dessous'],
        ['2', 'Ouvre le fichier AURA_widget.html dans Chrome Android'],
        ['3', 'Appuie sur ⋮ (3 points) → <b style="color:var(--t1);">Ajouter à l\'écran d\'accueil</b>'],
        ['4', 'Donne-lui un nom : "AURA" et confirme'],
        ['5', 'Une icône AURA apparaît sur ton bureau — tap = widget !'],
      ].map(([n,t])=>`<div class="wd-step">
        <div class="wd-step-num">${n}</div>
        <div class="wd-step-text">${t}</div>
      </div>`).join('')}

      <!-- Boutons -->
      <button class="wd-btn" onclick="previewWidget()"
        style="background:rgba(56,212,245,.08);border-color:rgba(56,212,245,.25);color:var(--ice);">
        👁 Prévisualiser le widget
      </button>
      <button class="wd-btn" onclick="downloadWidget()"
        style="background:rgba(0,232,122,.08);border-color:rgba(0,232,122,.25);color:var(--up);">
        📥 Télécharger AURA_widget.html
      </button>
      <div style="font-size:8px;color:var(--t3);text-align:center;line-height:1.5;">
        ⚠️ Les données sont figées au moment du téléchargement.<br>
        Re-télécharge pour mettre à jour le widget.
      </div>
    </div>`;
}
window.renderWidgetSection = renderWidgetSection;
// ═══ v55 · PICTURE IN PICTURE ═══
// Fenêtre flottante draggable avec stats temps réel
// Reste visible pendant qu'on navigue dans l'app

let _pipOpen   = false;
let _pipTimer  = null;
let _pipDragging = false;
let _pipDragX = 0, _pipDragY = 0;

function openPip() {
  _pipOpen = true;
  document.getElementById('pipWindow')?.classList.add('show');
  document.getElementById('pipBtnOpen')?.classList.remove('show');
  _updatePip();
  _pipTimer = setInterval(_updatePip, 3000);
  _initPipDrag();
  showToast('⊞ PiP activé — glisse pour déplacer', 2000, 'user');
}
window.openPip = openPip;

function closePip() {
  _pipOpen = false;
  clearInterval(_pipTimer);
  document.getElementById('pipWindow')?.classList.remove('show');
  document.getElementById('pipBtnOpen')?.classList.add('show');
}
window.closePip = closePip;

function togglePip() {
  if(_pipOpen) closePip(); else openPip();
}
window.togglePip = togglePip;

function _updatePip() {
  const n      = S.totalTrades||0;
  const wr     = n>0?Math.round((S.winTrades||0)/n*100):0;
  const pnl24h = S.pnl24h||0;
  const capital= S.tradingAccount||0;
  const openPos= (S.openPositions||[]).length;
  const regime = S._paperRealCurrentRegime||'calm';
  const regLabel={bull:'▲ BULL',volatile_bull:'▲ VOLT+',calm:'◌ CALM',volatile:'◈ VOLT',volatile_bear:'▼ VOLT−',bear:'▼ BEAR'}[regime]||'CALM';
  const regColor= regime.includes('bull')?'#00e87a':regime.includes('bear')?'#ff3d6b':'#38d4f5';
  const pnlCol  = pnl24h>=0?'#00e87a':'#ff3d6b';
  const wrCol   = wr>=55?'#00e87a':'#ff3d6b';

  const setV=(id,v,col)=>{ const e=document.getElementById(id); if(e){e.textContent=v; if(col) e.style.color=col; }};

  setV('pipPnl', (pnl24h>=0?'+':'')+'$'+Math.abs(pnl24h).toFixed(2), pnlCol);
  setV('pipPnlLbl', pnl24h>=0?'P&L 24H ▲':'P&L 24H ▼');
  setV('pipWR', wr+'%', wrCol);
  setV('pipPos', openPos, openPos>0?'#00e87a':'#555');
  setV('pipTrades', n);
  setV('pipCapital', '$'+capital.toFixed(0));
  setV('pipRegime', regLabel, regColor);
}

// Drag & Drop
function _initPipDrag() {
  const win = document.getElementById('pipWindow');
  if(!win || win._dragInit) return;
  win._dragInit = true;

  const onStart = e => {
    _pipDragging = true;
    const touch = e.touches?.[0] || e;
    const rect  = win.getBoundingClientRect();
    _pipDragX = touch.clientX - rect.left;
    _pipDragY = touch.clientY - rect.top;
    e.preventDefault();
  };
  const onMove = e => {
    if(!_pipDragging) return;
    const touch = e.touches?.[0] || e;
    const x = Math.max(0, Math.min(window.innerWidth-160, touch.clientX - _pipDragX));
    const y = Math.max(0, Math.min(window.innerHeight-200, touch.clientY - _pipDragY));
    win.style.left  = x+'px';
    win.style.top   = y+'px';
    win.style.bottom= 'auto';
    e.preventDefault();
  };
  const onEnd = () => { _pipDragging = false; };

  win.addEventListener('touchstart', onStart, {passive:false});
  win.addEventListener('touchmove',  onMove,  {passive:false});
  win.addEventListener('touchend',   onEnd);
  win.addEventListener('mousedown',  onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onEnd);
}

// Afficher le bouton PiP quand on est sur une page différente
function _pipShowBtn() {
  const btn = document.getElementById('pipBtnOpen');
  if(btn && !_pipOpen) btn.classList.add('show');
}

function renderPipSection() {
  const el = document.getElementById('pipSection');
  if(!el) return;
  const n    = S.totalTrades||0;
  const wr   = n>0?Math.round((S.winTrades||0)/n*100):0;
  const pnl24= S.pnl24h||0;
  const cap  = S.tradingAccount||0;
  const pos  = (S.openPositions||[]).length;

  el.innerHTML = `
    <div class="wd-section">
      <div class="wd-title">⊞ Picture in Picture
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${_pipOpen?'✅ Actif':'Inactif'}</span>
      </div>

      <!-- Aperçu PiP -->
      <div style="background:#000;border-radius:14px;padding:10px;border:1px solid rgba(56,212,245,.2);margin-bottom:10px;width:160px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:8px;font-weight:900;color:#38d4f5;">AURA ∞</span>
          <span style="font-size:8px;color:#333;">✕</span>
        </div>
        <div style="font-size:18px;font-weight:900;font-family:var(--font-mono);color:${pnl24>=0?'var(--up)':'var(--down)'};">${pnl24>=0?'+':''}$${Math.abs(pnl24).toFixed(2)}</div>
        <div style="font-size:7px;color:#555;text-transform:uppercase;margin:1px 0 6px;">P&L 24H</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
          ${[{v:wr+'%',l:'WR'},{v:pos,l:'Pos.'},{v:n,l:'Trades'},{v:'$'+cap.toFixed(0),l:'Capital'}].map(s=>`
          <div style="background:rgba(255,255,255,.04);border-radius:5px;padding:3px;text-align:center;">
            <span style="font-size:11px;font-weight:800;font-family:var(--font-mono);display:block;">${s.v}</span>
            <span style="font-size:6px;color:#555;">${s.l}</span>
          </div>`).join('')}
        </div>
      </div>

      <div style="font-size:9px;color:var(--t2);line-height:1.5;margin-bottom:10px;">
        Fenêtre flottante draggable qui reste visible pendant que tu navigues dans l'app.
        Mise à jour toutes les <strong style="color:var(--t1);">3 secondes</strong>.
      </div>

      <button onclick="togglePip()"
        style="width:100%;padding:10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
               background:${_pipOpen?'rgba(255,61,107,.08)':'rgba(56,212,245,.08)'};
               border:1px solid ${_pipOpen?'rgba(255,61,107,.25)':'rgba(56,212,245,.25)'};
               color:${_pipOpen?'var(--down)':'var(--ice)'};">
        ${_pipOpen?'⊟ Fermer le PiP':'⊞ Ouvrir le PiP'}
      </button>
      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">
        Le bouton ⊞ apparaît aussi en bas à gauche de l'écran
      </div>
    </div>`;
}
window.renderPipSection = renderPipSection;
// ═══ v56 · ALWAYS ON DISPLAY ═══
// Écran AOD façon Galaxy — fond noir, stats en temps réel, horloge
// Active le Wake Lock pour garder l'écran allumé

let _aodOpen   = false;
let _aodTimer  = null;
let _aodClock  = null;
let _aodWakeLock = null;
let _aodDotIdx = 0;

async function openAod() {
  _aodOpen = true;
  const el = document.getElementById('aodOverlay');
  if(el) el.classList.add('show');

  // Wake Lock — garder l'écran allumé
  try {
    if('wakeLock' in navigator) {
      _aodWakeLock = await navigator.wakeLock.request('screen');
    }
  } catch(e) { console.log('WakeLock non disponible'); }

  _updateAod();
  _aodTimer = setInterval(_updateAod, 3000);
  _aodClock = setInterval(_updateAodClock, 1000);
  _updateAodClock();

  showToast('🔆 Always On Display activé — tap pour quitter', 2500, 'user');
}
window.openAod = openAod;

function closeAod() {
  _aodOpen = false;
  clearInterval(_aodTimer); _aodTimer = null;
  clearInterval(_aodClock); _aodClock = null;
  const el = document.getElementById('aodOverlay');
  if(el) el.classList.remove('show');
  // Libérer le wake lock
  try { _aodWakeLock?.release(); _aodWakeLock = null; } catch(e) {}
}
window.closeAod = closeAod;

function _updateAodClock() {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2,'0');
  const mm  = String(now.getMinutes()).padStart(2,'0');
  const el  = document.getElementById('aodTime');
  if(el) el.textContent = hh+':'+mm;
  const dateEl = document.getElementById('aodDate');
  if(dateEl) dateEl.textContent = now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
}

function _updateAod() {
  const n      = S.totalTrades||0;
  const wr     = n>0?Math.round((S.winTrades||0)/n*100):0;
  const startP = S._startPortfolio || S.portfolio || 0;
  const pnl    = (S.portfolio||0) - startP;
  const capital= S.tradingAccount||0;
  const regime = S._paperRealCurrentRegime||'calm';
  const regLabel={bull:'▲ BULL',volatile_bull:'▲ VOLATILE+',calm:'◌ CALM',volatile:'◈ VOLATILE',volatile_bear:'▼ VOLATILE−',bear:'▼ BEAR'}[regime]||'CALM';
  const pnlCol = pnl>=0?'rgba(0,232,122,.9)':'rgba(255,61,107,.9)';
  const wrCol  = wr>=55?'rgba(0,232,122,.7)':'rgba(255,61,107,.7)';

  const s = (id,v,col)=>{ const e=document.getElementById(id); if(e){e.textContent=v; if(col) e.style.color=col; }};
  s('aodPnl', (pnl>=0?'+':'')+'$'+Math.abs(pnl).toFixed(2), pnlCol);
  s('aodSub', pnl>=0?'P&L NET SESSION ▲':'P&L NET SESSION ▼');
  s('aodWR', wr+'%', wrCol);
  s('aodTrades', n);
  s('aodCapital', '$'+capital.toFixed(0));
  s('aodRegime', regLabel, 'rgba(255,255,255,.2)');

  // Dots animés (indicateur paires actives)
  const openPairs = new Set((S.openPositions||[]).map(p=>p.pair));
  const allPairs  = Object.keys(S.pairStates||{});
  allPairs.forEach((pair,i)=>{
    const dot = document.getElementById('aodDot'+i);
    if(dot) dot.className = 'aod-dot' + (openPairs.has(pair)?' active':'');
  });
}

function renderAodSection() {
  const el = document.getElementById('aodSection');
  if(!el) return;

  el.innerHTML = `
    <div class="wd-section">
      <div class="wd-title">🔆 Always on Display
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${_aodOpen?'✅ Actif':'Inactif'}</span>
      </div>

      <!-- Aperçu AOD -->
      <div style="background:#000;border-radius:16px;padding:20px;text-align:center;margin-bottom:10px;border:1px solid rgba(255,255,255,.06);">
        <div style="font-size:36px;font-weight:200;font-family:var(--font-mono);color:rgba(255,255,255,.85);line-height:1;margin-bottom:4px;">
          ${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}
        </div>
        <div style="font-size:9px;color:rgba(255,255,255,.25);letter-spacing:.15em;text-transform:uppercase;margin-bottom:16px;">
          ${new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}
        </div>
        <div style="font-size:22px;font-weight:700;font-family:var(--font-mono);color:${(S.pnl24h||0)>=0?'rgba(0,232,122,.9)':'rgba(255,61,107,.9)'};">
          ${(S.pnl24h||0)>=0?'+':''}$${Math.abs(S.pnl24h||0).toFixed(2)}
        </div>
        <div style="font-size:8px;color:rgba(255,255,255,.2);letter-spacing:.2em;text-transform:uppercase;margin-top:3px;">P&L 24H</div>
      </div>

      <div style="font-size:9px;color:var(--t2);line-height:1.5;margin-bottom:10px;">
        Affiche l'heure et tes stats en fond noir. Le Wake Lock maintient l'écran allumé.
        <span style="color:var(--gold);">Tap n'importe où pour quitter.</span>
      </div>

      <button onclick="${_aodOpen?'closeAod()':'openAod()'}"
        style="width:100%;padding:11px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
               background:${_aodOpen?'rgba(255,61,107,.08)':'rgba(245,200,66,.08)'};
               border:1px solid ${_aodOpen?'rgba(255,61,107,.25)':'rgba(245,200,66,.25)'};
               color:${_aodOpen?'var(--down)':'var(--gold)'};">
        ${_aodOpen?'⬛ Désactiver AOD':'🔆 Activer Always on Display'}
      </button>
      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">
        ⚡ Consomme de la batterie — utilise avec l'écran branché
      </div>
    </div>`;
}
window.renderAodSection = renderAodSection;
// ═══ v57 · GOOGLE SHEETS SYNC ═══
// 3 approches : Export CSV · Apps Script · Copier données

// ── Générer CSV d'un dataset ──
function _toCSV(headers, rows) {
  const esc = v=>{ const s=String(v??'').replace(/"/g,'""'); return (s.includes(',')||s.includes('"')||s.includes('\n'))?'"'+s+'"':s; };
  return [headers.map(esc).join(','), ...rows.map(r=>r.map(esc).join(','))].join('\n');
}

function _downloadCSV(content, filename) {
  const blob = new Blob(['\uFEFF'+content], {type:'text/csv;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// Export CSV Trades
function exportGsTrades() {
  const allT = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null)
  ).sort((a,b)=>(a.ts||0)-(b.ts||0));

  const csv = _toCSV(
    ['Date','Paire','Côté','Stake $','Prix entrée','Prix sortie','P&L $','P&L %','Résultat'],
    allT.map(t=>[
      t.time||new Date(t.ts||0).toLocaleString('fr-FR'),
      t.pair||'', t.side==='buy'?'LONG':'SHORT',
      t.stakeUsdt||0, t.entryPrice||0, t.price||0,
      (t.pnlUsdt||0).toFixed(4), (t.pnl||0).toFixed(4),
      (t.pnlUsdt||0)>0?'WIN':'LOSS',
    ])
  );
  _downloadCSV(csv, 'AURA_trades.csv');
  showToast('📊 AURA_trades.csv téléchargé → importer dans Google Sheets', 3000, 'win');
}
window.exportGsTrades = exportGsTrades;

// Export CSV Performance par paire
function exportGsPaires() {
  const rows = Object.entries(S.pairStates||{}).map(([pair,ps])=>[
    pair, ps.totalTrades||0, ps.winTrades||0,
    ps.totalTrades>0?((ps.winTrades||0)/ps.totalTrades*100).toFixed(1):'0',
    (ps.totalPnlUsd||0).toFixed(2), (ps.totalPnlPct||0).toFixed(4),
  ]);
  const csv = _toCSV(['Paire','Trades','Wins','WR%','P&L $','P&L %'], rows);
  _downloadCSV(csv, 'AURA_paires.csv');
  showToast('₿ AURA_paires.csv téléchargé', 2500, 'win');
}
window.exportGsPaires = exportGsPaires;

// Export CSV Agents
function exportGsAgents() {
  const csv = _toCSV(
    ['Rang','Nom','Type','Fitness','Score','Trades','WR%','Streak'],
    [...(S.agents||[])].sort((a,b)=>(b.fitness||0)-(a.fitness||0)).map((a,i)=>[
      i+1, a.name||'', a.type||'', Math.floor(a.fitness||0),
      (a.score||0).toFixed(3), a.trades||0,
      a.trades>0?Math.round((a.wins||0)/a.trades*100):0,
      a.streak||0,
    ])
  );
  _downloadCSV(csv, 'AURA_agents.csv');
  showToast('🤖 AURA_agents.csv téléchargé', 2500, 'win');
}
window.exportGsAgents = exportGsAgents;

// Export CSV Résumé
function exportGsResume() {
  const m  = typeof computeAdvancedMetrics==='function' ? computeAdvancedMetrics() : null;
  const n  = S.totalTrades||0;
  const wr = n>0?Math.round((S.winTrades||0)/n*100):0;
  const totalPnl = Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalPnlUsd||0),0);
  const now = new Date().toLocaleString('fr-FR');
  const csv = _toCSV(['Indicateur','Valeur','Mise à jour'],[
    ['Date export', now, now],
    ['Portfolio', (S.portfolio||0).toFixed(2), now],
    ['Capital trading', (S.tradingAccount||0).toFixed(2), now],
    ['Total trades', n, now],
    ['Win Rate %', wr, now],
    ['P&L Net $', totalPnl.toFixed(2), now],
    ['Sharpe Ratio', m?m.sharpe.toFixed(2):'—', now],
    ['Max Drawdown %', m?m.maxDDPct.toFixed(2):'—', now],
    ['Profit Factor', m?m.profitFactor.toFixed(2):'—', now],
    ['Nb agents', (S.agents||[]).length, now],
    ['Régime marché', S._paperRealCurrentRegime||'calm', now],
    ['Frais totaux $', (S.fees?.totalGross||0).toFixed(2), now],
  ]);
  _downloadCSV(csv, 'AURA_resume.csv');
  showToast('📋 AURA_resume.csv téléchargé', 2500, 'win');
}
window.exportGsResume = exportGsResume;

// Générer le Google Apps Script
function _generateAppsScript() {
  const n  = S.totalTrades||0;
  const wr = n>0?Math.round((S.winTrades||0)/n*100):0;
  const totalPnl = Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalPnlUsd||0),0);
  const pnl24h = S.pnl24h||0;
  const capital= S.tradingAccount||0;
  const now = new Date().toLocaleString('fr-FR');

  // Données aplaties pour Apps Script
  const tradesData = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null).slice(-20)
  ).map(t=>`["${t.time||'—'}","${t.pair||''}","${t.side==='buy'?'LONG':'SHORT'}",${(t.pnlUsdt||0).toFixed(2)},"${(t.pnlUsdt||0)>0?'WIN':'LOSS'}"]`).join(',\n    ');

  return `// ═══ AURA Sync — Google Apps Script ═══
// Générés le ${now}
// Colle ce script dans : Extensions → Apps Script → Exécuter
// Permission requise : modifier le spreadsheet

function importAuraData() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  
  // ── Onglet RÉSUMÉ ──
  let sheet = ss.getSheetByName('AURA Résumé') || ss.insertSheet('AURA Résumé');
  sheet.clearContents();
  const now = new Date().toLocaleString('fr-FR');
  sheet.getRange(1,1,12,3).setValues([
    ['Indicateur','Valeur','Mis à jour'],
    ['Portfolio','${(capital).toFixed(2)}',now],
    ['Win Rate','${wr}%',now],
    ['Total Trades',${n},now],
    ['P&L 24h','${pnl24h>=0?'+':''}${pnl24h.toFixed(2)}',now],
    ['P&L Net Total','${totalPnl.toFixed(2)}',now],
    ['Agents actifs',${(S.agents||[]).length},now],
    ['Régime','${S._paperRealCurrentRegime||'calm'}',now],
    ['Frais totaux','${(S.fees?.totalGross||0).toFixed(2)}',now],
    ['Mode','${S.tradingMode||'sim'}',now],
    ['Version','AURA v${typeof S?.version!==undefined?'8.57':'8.57'}',now],
    ['','',''],
  ]);
  sheet.getRange(1,1,1,3).setBackground('#0b0e14').setFontColor('#38d4f5').setFontWeight('bold');
  
  // ── Onglet TRADES RÉCENTS ──
  let tSheet = ss.getSheetByName('AURA Trades') || ss.insertSheet('AURA Trades');
  tSheet.clearContents();
  const trades = [
    ['Date','Paire','Côté','P&L $','Résultat'],
    ${tradesData||'["—","—","—",0,"—"]'}
  ];
  if(trades.length > 1) {
    tSheet.getRange(1,1,trades.length,5).setValues(trades);
    tSheet.getRange(1,1,1,5).setBackground('#0b0e14').setFontColor('#38d4f5').setFontWeight('bold');
  }
  
  SpreadsheetApp.getUi().alert('✅ AURA data importée dans ' + ss.getName());
}

// Ajouter un menu personnalisé
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🤖 AURA')
    .addItem('Importer les données', 'importAuraData')
    .addToUi();
}`;
}

function copyAppsScript() {
  const script = _generateAppsScript();
  if(navigator.clipboard) {
    navigator.clipboard.writeText(script).then(()=>{
      showToast('📋 Script copié ! Colle dans Google Apps Script', 3000, 'win');
    }).catch(()=>_fallbackCopyScript(script));
  } else {
    _fallbackCopyScript(script);
  }
}
window.copyAppsScript = copyAppsScript;

function _fallbackCopyScript(script) {
  const ta = document.createElement('textarea');
  ta.value = script; ta.style.position='fixed'; ta.style.top='-9999px';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); showToast('📋 Script copié !', 2500, 'win'); } catch(e) { showToast('⚠ Copie manuelle requise', 2000,'warn'); }
  document.body.removeChild(ta);
}

function downloadAppsScript() {
  const script = _generateAppsScript();
  const blob = new Blob([script], {type:'text/plain'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href=url; a.download='AURA_AppScript.gs';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('📥 AURA_AppScript.gs téléchargé', 2500, 'win');
}
window.downloadAppsScript = downloadAppsScript;

function renderGsSection() {
  const el = document.getElementById('gsSection');
  if(!el) return;
  const n = S.totalTrades||0;
  const script_preview = _generateAppsScript().slice(0,300)+'...';

  el.innerHTML = `
    <div class="gs-section">
      <div class="gs-title">
        <span>🟢 Google Sheets Sync</span>
        <span style="font-size:8px;color:#34a85388;font-weight:400;">${n} trades disponibles</span>
      </div>

      <!-- Export CSV rapide -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">① Export CSV direct (importer dans Sheets)</div>
      <div class="gs-csv-grid">
        <button class="gs-csv-btn" onclick="exportGsResume()">📋 Résumé</button>
        <button class="gs-csv-btn" onclick="exportGsTrades()">📈 Trades</button>
        <button class="gs-csv-btn" onclick="exportGsPaires()">₿ Paires</button>
        <button class="gs-csv-btn" onclick="exportGsAgents()">🤖 Agents</button>
      </div>

      <!-- Apps Script -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">② Apps Script (auto-import dans ton Sheet)</div>
      <div class="gs-code">${script_preview.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>

      <button class="gs-btn" onclick="copyAppsScript()"
        style="background:rgba(52,168,83,.1);border-color:rgba(52,168,83,.3);color:#34a853;">
        📋 Copier le Google Apps Script
      </button>
      <button class="gs-btn" onclick="downloadAppsScript()"
        style="background:rgba(52,168,83,.06);border-color:rgba(52,168,83,.2);color:#34a85388;">
        📥 Télécharger .gs
      </button>

      <!-- Instructions -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;margin-top:4px;">③ Instructions Apps Script</div>
      ${[
        ['1','Ouvre un Google Sheet vide'],
        ['2','Extensions → <b style="color:var(--t1);">Apps Script</b>'],
        ['3','Colle le script → Enregistrer → <b style="color:var(--t1);">Exécuter</b>'],
        ['4','Autorise les permissions → Done !'],
        ['5','Menu <b style="color:var(--t1);">🤖 AURA</b> apparaît dans ton Sheet'],
      ].map(([n,t])=>`<div class="gs-step"><div class="gs-step-num">${n}</div><div class="gs-step-text">${t}</div></div>`).join('')}
    </div>`;
}
window.renderGsSection = renderGsSection;
// ═══ v58 · API REST PUBLIQUE ═══
// API locale AURA — expose les données via :
// 1. JSON downloads (endpoints simulés)
// 2. localStorage bridge (scripts externes peuvent lire)
// 3. BroadcastChannel (communication inter-fenêtres)
// 4. Documentation Swagger-like

const _API_VERSION = 'v1';
const _API_BASE     = 'aura-api';
let _apiTab = 'endpoints';

// ── Construire les réponses API ──
function _apiResponse(endpoint) {
  const ts  = Date.now();
  const n   = S.totalTrades||0;
  const wr  = n>0?Math.round((S.winTrades||0)/n*100):0;
  const totalPnl = Object.values(S.pairStates||{}).reduce((s,ps)=>s+(ps.totalPnlUsd||0),0);
  const m   = typeof computeAdvancedMetrics==='function'?computeAdvancedMetrics():null;

  const responses = {
    '/status': {
      status:'ok', version:'AURA v8.57',
      timestamp:ts, mode:S.tradingMode||'sim',
      regime:S._paperRealCurrentRegime||'calm',
      botActive:S.botAutoMode||false,
    },
    '/portfolio': {
      status:'ok', timestamp:ts,
      portfolio:+(S.portfolio||0).toFixed(2),
      tradingAccount:+(S.tradingAccount||0).toFixed(2),
      cashAccount:+(S.cashAccount||0).toFixed(2),
      pnl24h:+(S.pnl24h||0).toFixed(2),
    },
    '/performance': {
      status:'ok', timestamp:ts,
      totalTrades:n, winTrades:S.winTrades||0,
      winRate:wr, totalPnlUsd:+totalPnl.toFixed(2),
      sharpe:m?+m.sharpe.toFixed(3):null,
      maxDrawdownPct:m?+m.maxDDPct.toFixed(2):null,
      profitFactor:m?+m.profitFactor.toFixed(3):null,
    },
    '/pairs': {
      status:'ok', timestamp:ts,
      data:Object.entries(S.pairStates||{}).map(([pair,ps])=>({
        pair, trades:ps.totalTrades||0, wins:ps.winTrades||0,
        wr:ps.totalTrades>0?Math.round((ps.winTrades||0)/ps.totalTrades*100):0,
        pnlUsd:+(ps.totalPnlUsd||0).toFixed(2),
      })),
    },
    '/agents': {
      status:'ok', timestamp:ts, count:(S.agents||[]).length,
      data:[...(S.agents||[])].sort((a,b)=>(b.fitness||0)-(a.fitness||0)).slice(0,10).map(a=>({
        name:a.name||'—', emoji:a.emoji||'🤖',
        fitness:Math.floor(a.fitness||0),
        score:+(a.score||0).toFixed(3),
        trades:a.trades||0,
      })),
    },
    '/positions': {
      status:'ok', timestamp:ts,
      count:(S.openPositions||[]).length,
      data:(S.openPositions||[]).map(p=>({
        pair:p.pair, side:p.side, stake:+(p.stakeUsdt||0).toFixed(2),
        entry:+(p.entryPrice||0).toFixed(4),
        pnlUsd:+(p.pnlUsdt||0).toFixed(2),
      })),
    },
    '/trades': {
      status:'ok', timestamp:ts,
      data:Object.values(S.pairStates||{}).flatMap(ps=>
        (ps.trades||[]).filter(t=>t.type==='position').slice(-10)
      ).sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,20).map(t=>({
        pair:t.pair||'?', side:t.side==='buy'?'LONG':'SHORT',
        pnlUsd:+(t.pnlUsdt||0).toFixed(2),
        pnlPct:+(t.pnl||0).toFixed(3),
        result:(t.pnlUsdt||0)>0?'WIN':'LOSS',
        time:t.time||'—',
      })),
    },
  };
  return responses[endpoint] || {status:'error',message:'Endpoint inconnu'};
}

// ── Exposer dans localStorage (bridge) ──
function _apiPublishToStorage() {
  const endpoints = ['/status','/portfolio','/performance','/pairs','/agents','/positions','/trades'];
  const api = {};
  endpoints.forEach(ep=>{ api[ep.replace('/','aura_api_')] = _apiResponse(ep); });
  try {
    localStorage.setItem('aura_api_manifest', JSON.stringify({
      version:_API_VERSION, base:_API_BASE, endpoints,
      updatedAt:Date.now(), description:'AURA REST API Bridge'
    }));
    endpoints.forEach(ep=>{
      localStorage.setItem(`${_API_BASE}${ep.replace('/','_')}`, JSON.stringify(_apiResponse(ep)));
    });
  } catch(e) { console.warn('API storage error:', e); }
}

// ── BroadcastChannel pour inter-fenêtres ──
let _apiChannel = null;
function _initApiChannel() {
  try {
    _apiChannel = new BroadcastChannel('aura_api');
    _apiChannel.onmessage = e => {
      const {endpoint, requestId} = e.data||{};
      if(endpoint && requestId) {
        _apiChannel.postMessage({requestId, response:_apiResponse(endpoint)});
      }
    };
  } catch(e) {}
}
_initApiChannel();

// Auto-publish toutes les 10s
setInterval(()=>{ try { _apiPublishToStorage(); } catch(e){} }, 10000);

// ── Download JSON endpoint ──
function downloadApiEndpoint(endpoint) {
  const data = _apiResponse(endpoint);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`aura_api${endpoint.replace('/','_')}.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('📥 '+endpoint+' téléchargé', 2000, 'win');
}
window.downloadApiEndpoint = downloadApiEndpoint;

// ── Copier JSON endpoint ──
function copyApiEndpoint(endpoint) {
  const json = JSON.stringify(_apiResponse(endpoint), null, 2);
  if(navigator.clipboard) {
    navigator.clipboard.writeText(json).then(()=>showToast('📋 Copié : '+endpoint, 2000,'win'));
  } else {
    const ta=document.createElement('textarea'); ta.value=json;
    ta.style.position='fixed'; ta.style.top='-9999px';
    document.body.appendChild(ta); ta.select();
    try{document.execCommand('copy'); showToast('📋 Copié !',2000,'win');}catch(e){}
    document.body.removeChild(ta);
  }
}
window.copyApiEndpoint = copyApiEndpoint;

// ── Publier maintenant ──
function publishApiNow() {
  _apiPublishToStorage();
  showToast('📡 API publiée dans localStorage · accessible par d\'autres scripts', 2500, 'win');
}
window.publishApiNow = publishApiNow;

function renderApiSection() {
  const el = document.getElementById('apiSection');
  if(!el) return;

  const endpoints = [
    {path:'/status',      desc:'Statut du bot, régime, mode'},
    {path:'/portfolio',   desc:'Capital, P&L 24h'},
    {path:'/performance', desc:'WR, Sharpe, Drawdown, Profit Factor'},
    {path:'/pairs',       desc:'Performance par paire'},
    {path:'/agents',      desc:'Top 10 agents par fitness'},
    {path:'/positions',   desc:'Positions ouvertes'},
    {path:'/trades',      desc:'20 derniers trades'},
  ];

  // Exemple de code d'utilisation
  const codeExample = `// Lire l'API AURA depuis un autre script
const status = JSON.parse(localStorage.getItem('aura-api_status'));
const portfolio = JSON.parse(localStorage.getItem('aura-api_portfolio'));
console.log('WR:', portfolio?.winRate + '%');

// Ou via BroadcastChannel (inter-fenêtres)
const ch = new BroadcastChannel('aura_api');
ch.postMessage({endpoint:'/performance', requestId:'req1'});
ch.onmessage = e => console.log(e.data.response);`;

  el.innerHTML = `
    <div class="api-section">
      <div class="api-title">
        🔌 API REST Locale
        <div style="display:flex;gap:5px;">
          ${['endpoints','code','test'].map(t=>`<button class="api-tab ${_apiTab===t?'active':''}" onclick="_apiTab='${t}';renderApiSection();">${t==='endpoints'?'📡 Endpoints':t==='code'?'💻 Code':'🧪 Test'}</button>`).join('')}
        </div>
      </div>

      ${_apiTab==='endpoints'?`
        <div style="font-size:8px;color:var(--t3);margin-bottom:6px;">Base : <code style="color:var(--ice);">localStorage · BroadcastChannel('aura_api')</code></div>
        ${endpoints.map(ep=>`
          <div class="api-endpoint">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <span class="api-method api-get">GET</span>
                <span class="api-path">${_API_BASE}${ep.path}</span>
              </div>
              <div style="display:flex;gap:4px;">
                <button onclick="copyApiEndpoint('${ep.path}')" style="font-size:8px;padding:2px 6px;border-radius:4px;background:rgba(56,212,245,.1);border:1px solid rgba(56,212,245,.2);color:var(--ice);cursor:pointer;">📋</button>
                <button onclick="downloadApiEndpoint('${ep.path}')" style="font-size:8px;padding:2px 6px;border-radius:4px;background:rgba(0,232,122,.1);border:1px solid rgba(0,232,122,.2);color:var(--up);cursor:pointer;">📥</button>
              </div>
            </div>
            <div class="api-desc">${ep.desc}</div>
          </div>`).join('')}
        <button class="api-btn" onclick="publishApiNow()"
          style="background:rgba(56,212,245,.08);border-color:rgba(56,212,245,.25);color:var(--ice);">
          📡 Publier l'API maintenant (localStorage)
        </button>
        <div style="font-size:8px;color:var(--t3);text-align:center;">Auto-publication toutes les 10s</div>

      `:''}

      ${_apiTab==='code'?`
        <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Utiliser l'API depuis un script externe</div>
        <div class="api-response" style="color:#38d4f5;">${codeExample.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        <button class="api-btn" onclick="navigator.clipboard?.writeText(${JSON.stringify(codeExample)}).then(()=>showToast('📋 Code copié',2000,'win'))"
          style="background:rgba(56,212,245,.08);border-color:rgba(56,212,245,.25);color:var(--ice);">
          📋 Copier le code
        </button>
      `:''}

      ${_apiTab==='test'?`
        <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Tester un endpoint en direct</div>
        ${endpoints.slice(0,4).map(ep=>{
          const resp = _apiResponse(ep.path);
          const preview = JSON.stringify(resp,null,2).slice(0,200)+'...';
          return `<div class="api-endpoint" onclick="copyApiEndpoint('${ep.path}')">
            <div><span class="api-method api-get">GET</span><span class="api-path">${ep.path}</span></div>
            <div class="api-response">${preview.replace(/</g,'&lt;')}</div>
          </div>`;
        }).join('')}
      `:''}
    </div>`;
}
window.renderApiSection = renderApiSection;
// ═══ v59 · CORRÉLATION ENTRE PAIRES ═══
// Matrice de corrélation basée sur les P&L des trades
// + Détection des paires anti-corrélées (idéales pour diversifier)
// + Recommandations de diversification

function _computeCorrelationMatrix() {
  const pairs = Object.keys(PAIRS||{});
  const ps    = S.pairStates || {};

  // Construire les séries de P&L par paire (alignées dans le temps)
  const series = {};
  pairs.forEach(pair=>{
    const trades = (ps[pair]?.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null&&t.ts);
    // Discrétiser en buckets de 6h
    const buckets = {};
    trades.forEach(t=>{
      const bucket = Math.floor((t.ts||0)/(6*3600000));
      if(!buckets[bucket]) buckets[bucket]=0;
      buckets[bucket] += t.pnlUsdt||0;
    });
    series[pair] = buckets;
  });

  // Trouver tous les buckets communs
  const allBuckets = [...new Set(Object.values(series).flatMap(s=>Object.keys(s)))].sort();

  // Calculer la corrélation de Pearson pour chaque paire de paires
  const matrix = {};
  pairs.forEach(p1=>{
    matrix[p1]={};
    pairs.forEach(p2=>{
      if(p1===p2){ matrix[p1][p2]=1; return; }
      const x = allBuckets.map(b=>series[p1][b]||0);
      const y = allBuckets.map(b=>series[p2][b]||0);
      matrix[p1][p2] = _pearson(x,y);
    });
  });
  return { matrix, pairs, hasTrades: allBuckets.length > 0 };
}

function _pearson(x, y) {
  const n = x.length;
  if(n<2) return 0;
  const mx = x.reduce((s,v)=>s+v,0)/n;
  const my = y.reduce((s,v)=>s+v,0)/n;
  const num   = x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0);
  const dx    = Math.sqrt(x.reduce((s,v)=>s+(v-mx)**2,0));
  const dy    = Math.sqrt(y.reduce((s,v)=>s+(v-my)**2,0));
  if(dx===0||dy===0) return 0;
  return Math.max(-1, Math.min(1, num/(dx*dy)));
}

function _correlColor(r) {
  // -1 = vert (anti-corrélé) · 0 = gris · +1 = rouge (corrélé)
  if(r > 0.7)  return { bg:'rgba(255,61,107,.7)',  text:'#fff' };
  if(r > 0.4)  return { bg:'rgba(255,120,80,.5)',  text:'#fff' };
  if(r > 0.1)  return { bg:'rgba(255,200,100,.25)',text:'var(--t1)' };
  if(r > -0.1) return { bg:'rgba(255,255,255,.07)',text:'var(--t3)' };
  if(r > -0.4) return { bg:'rgba(100,210,180,.25)',text:'var(--t1)' };
  if(r > -0.7) return { bg:'rgba(52,211,153,.4)',  text:'#fff' };
  return              { bg:'rgba(0,232,122,.7)',   text:'#000' };
}

function renderCorrSection() {
  const el = document.getElementById('corrSection');
  if(!el) return;

  const { matrix, pairs, hasTrades } = _computeCorrelationMatrix();
  const n = pairs.length;

  if(!hasTrades) {
    el.innerHTML=`<div class="cor-section"><div class="cor-title">🔗 Corrélation Paires</div>
      <div style="text-align:center;padding:20px;font-size:10px;color:var(--t3);">Minimum 5 trades par paire nécessaires pour calculer la corrélation.</div></div>`;
    return;
  }

  // Matrice SVG
  const cellSize = Math.floor(Math.min(36, (320-30)/n));
  const labelW   = 28;
  const W = labelW + n*cellSize + n;
  const H = labelW + n*cellSize + n;

  let svgCells = '';
  let svgLabels = '';

  // Labels paires
  pairs.forEach((pair,i)=>{
    const sym = pair.replace('/USDT','');
    const col = PAIRS[pair]?.color||'var(--t3)';
    const x   = labelW + i*(cellSize+1) + cellSize/2;
    const y   = labelW - 4;
    svgLabels += `<text x="${x}" y="${y}" text-anchor="middle" font-size="7" fill="${col}" font-weight="700">${sym}</text>`;
    const yr  = labelW + i*(cellSize+1) + cellSize/2;
    svgLabels += `<text x="${labelW-4}" y="${yr+3}" text-anchor="end" font-size="7" fill="${col}" font-weight="700">${sym}</text>`;
  });

  // Cellules
  pairs.forEach((p1,i)=>{
    pairs.forEach((p2,j)=>{
      const r   = matrix[p1]?.[p2] ?? 0;
      const col = _correlColor(r);
      const x   = labelW + j*(cellSize+1);
      const y   = labelW + i*(cellSize+1);
      const txt = p1===p2 ? '—' : r.toFixed(2);
      svgCells  += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${col.bg}" onclick="showToast('${p1.replace('/USDT','')} / ${p2.replace('/USDT','')}: r=${r.toFixed(3)}')"/>`;
      svgCells  += `<text x="${x+cellSize/2}" y="${y+cellSize/2+3}" text-anchor="middle" font-size="7" fill="${col.text}" font-weight="700">${txt}</text>`;
    });
  });

  // Insights automatiques
  const insights = [];
  const anticorr = [], highcorr = [];
  pairs.forEach((p1,i)=>{
    pairs.slice(i+1).forEach(p2=>{
      const r = matrix[p1]?.[p2]??0;
      if(r < -0.4) anticorr.push({p1,p2,r});
      if(r >  0.7) highcorr.push({p1,p2,r});
    });
  });

  if(anticorr.length>0) {
    const best = anticorr.sort((a,b)=>a.r-b.r)[0];
    insights.push({ icon:'✅', text:`<strong>${best.p1.replace('/USDT','')} + ${best.p2.replace('/USDT','')}</strong> sont anti-corrélées (r=${best.r.toFixed(2)}) — excellent duo de diversification. Quand l'une perd, l'autre compense.` });
  }
  if(highcorr.length>0) {
    const worst = highcorr.sort((a,b)=>b.r-a.r)[0];
    insights.push({ icon:'⚠️', text:`<strong>${worst.p1.replace('/USDT','')} + ${worst.p2.replace('/USDT','')}</strong> sont très corrélées (r=${worst.r.toFixed(2)}) — elles bougent ensemble. Trader les deux double le risque sans diversifier.` });
  }
  if(insights.length===0) insights.push({ icon:'📊', text:'Pas encore assez de données pour des insights fiables. Continue à trader !' });

  // Classement paires les moins corrélées (meilleures à combiner)
  const avgCorr = pairs.map(p=>{
    const others = pairs.filter(p2=>p2!==p);
    const avg    = others.reduce((s,p2)=>s+Math.abs(matrix[p]?.[p2]??0),0)/(others.length||1);
    return {pair:p, avg};
  }).sort((a,b)=>a.avg-b.avg);

  el.innerHTML = `
    <div class="cor-section">
      <div class="cor-title">🔗 Corrélation des Paires
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Pearson · buckets 6h</span>
      </div>

      <!-- Matrice SVG -->
      <div style="overflow-x:auto;margin-bottom:8px;">
        <svg width="${W}" height="${H}" style="display:block;">
          ${svgLabels}${svgCells}
        </svg>
      </div>

      <!-- Légende -->
      <div class="cor-legend">
        <div class="cor-legend-item"><div class="cor-legend-dot" style="background:rgba(0,232,122,.7);"></div>Anti-corrélé (-1)</div>
        <div class="cor-legend-item"><div class="cor-legend-dot" style="background:rgba(255,255,255,.07);"></div>Neutre (0)</div>
        <div class="cor-legend-item"><div class="cor-legend-dot" style="background:rgba(255,61,107,.7);"></div>Corrélé (+1)</div>
      </div>

      <!-- Insights -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">💡 Insights</div>
      ${insights.map(i=>`<div class="cor-insight"><span class="cor-insight-icon">${i.icon}</span><span class="cor-insight-text">${i.text}</span></div>`).join('')}

      <!-- Classement diversification -->
      <div style="font-size:9px;color:var(--t3);margin:8px 0 5px;">Meilleures paires pour diversifier (corrélation moy. la plus faible)</div>
      ${avgCorr.slice(0,5).map((p,i)=>`
        <div class="cor-pair-row">
          <span style="font-size:10px;color:var(--t3);min-width:16px;">${i+1}.</span>
          <span style="font-weight:700;color:${PAIRS[p.pair]?.color||'var(--t1)'};">${p.pair.replace('/USDT','')}</span>
          <div style="flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden;margin:0 8px;">
            <div style="height:100%;width:${Math.round((1-p.avg)*100)}%;background:var(--up);border-radius:100px;"></div>
          </div>
          <span style="font-size:9px;color:var(--t3);">moy. ${p.avg.toFixed(2)}</span>
        </div>`).join('')}
    </div>`;
}
window.renderCorrSection = renderCorrSection;
// ═══ v60 · CALENDRIER ÉCONOMIQUE CRYPTO ═══
// Événements récurrents connus + fetch optionnel CoinGecko
// Affiche les events à venir avec impact sur le marché

let _calFilter = 'all'; // 'all' | 'high' | 'crypto'

// Base d'événements récurrents crypto (connus à l'avance)
function _getRecurringEvents() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = now.getMonth();
  const events = [];

  // Expiration options BTC (dernier vendredi du mois)
  const lastFriday = d => {
    const last = new Date(d.getFullYear(), d.getMonth()+1, 0);
    last.setDate(last.getDate() - ((last.getDay()+2)%7));
    return last;
  };

  // Prochains 3 mois
  for(let m=0; m<3; m++) {
    const target = new Date(year, month+m, 1);
    const lf     = lastFriday(target);
    if(lf > now) {
      events.push({
        ts: lf.getTime(), date:lf,
        name:'Expiration Options BTC/ETH (Deribit)',
        impact:'high', category:'crypto',
        desc:'Fortes variations possibles. Les market makers couvrent leurs positions.',
        icon:'⚠️',
      });
    }
  }

  // CPI US (toujours 2e ou 3e mercredi du mois)
  for(let m=0; m<2; m++) {
    const d = new Date(year, month+m, 1);
    let wed = 0, count=0;
    while(count<2) { if(d.getDay()===3) count++; if(count<2) d.setDate(d.getDate()+1); }
    d.setHours(14,30,0,0); // 14h30 UTC
    if(d > now) {
      events.push({
        ts:d.getTime(), date:new Date(d),
        name:'CPI USA (Inflation)',
        impact:'high', category:'macro',
        desc:'Impact fort sur BTC/ETH. Inflation plus haute = pression baissière crypto.',
        icon:'🇺🇸',
      });
    }
  }

  // FOMC (environ 8 fois /an — dates approximatives)
  const fomcDates2026 = [
    new Date('2026-01-28'), new Date('2026-03-18'),
    new Date('2026-04-29'), new Date('2026-06-10'),
    new Date('2026-07-29'), new Date('2026-09-16'),
    new Date('2026-10-28'), new Date('2026-12-09'),
  ];
  fomcDates2026.forEach(d=>{
    if(d>now && d<new Date(now.getTime()+90*86400000)) {
      events.push({
        ts:d.getTime(), date:d,
        name:'Décision taux Fed (FOMC)',
        impact:'high', category:'macro',
        desc:'Impact majeur. Hausse des taux = baissier crypto. Baisse = haussier.',
        icon:'🏦',
      });
    }
  });

  // Funding rates Binance (toutes les 8h : 00h, 08h, 16h UTC)
  const nextFunding = () => {
    const h = now.getHours();
    const hours = [0,8,16];
    const next  = hours.find(hh=>hh>h) ?? 24;
    const d     = new Date(now);
    d.setHours(next===24?0:next,0,0,0);
    if(next===24) d.setDate(d.getDate()+1);
    return d;
  };
  const nf = nextFunding();
  events.push({
    ts:nf.getTime(), date:nf,
    name:'Funding Rate Binance',
    impact:'low', category:'crypto',
    desc:'Rééquilibrage des positions futures. Impact mineur sauf taux extrêmes.',
    icon:'💸',
  });

  // Halving BTC (prochain ~2028)
  const halvingDate = new Date('2028-04-15');
  const daysToHalving = Math.round((halvingDate-now)/86400000);
  events.push({
    ts:halvingDate.getTime(), date:halvingDate,
    name:`Halving Bitcoin (dans ${daysToHalving} jours)`,
    impact:'high', category:'crypto',
    desc:'Réduction de 50% des récompenses mineurs. Historiquement très haussier.',
    icon:'₿',
    special:true,
  });

  // ETF Options (troisième vendredi du mois — opex)
  const thirdFriday = d => {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const fri   = (12-first.getDay())%7;
    return new Date(d.getFullYear(), d.getMonth(), fri+1+14);
  };
  for(let m=0; m<2; m++) {
    const tf = thirdFriday(new Date(year,month+m,1));
    if(tf>now) {
      events.push({
        ts:tf.getTime(), date:tf,
        name:'OpEx ETF Bitcoin (3e vendredi)',
        impact:'med', category:'crypto',
        desc:'Expiration des options ETF spot BTC. Souvent volatile 24-48h avant.',
        icon:'📊',
      });
    }
  }

  return events.sort((a,b)=>a.ts-b.ts);
}

function _fmtCountdown(ts) {
  const diff = ts - Date.now();
  if(diff<0) return 'Passé';
  const d = Math.floor(diff/86400000);
  const h = Math.floor((diff%86400000)/3600000);
  const m = Math.floor((diff%3600000)/60000);
  if(d>0) return `J-${d}`;
  if(h>0) return `${h}h${String(m).padStart(2,'0')}`;
  return `${m}min`;
}

function _groupByDay(events) {
  const groups = {};
  events.forEach(e=>{
    const key = e.date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
    if(!groups[key]) groups[key]=[];
    groups[key].push(e);
  });
  return groups;
}

function renderCalSection() {
  const el = document.getElementById('calSection');
  if(!el) return;

  let events = _getRecurringEvents();
  if(_calFilter==='high')   events = events.filter(e=>e.impact==='high');
  if(_calFilter==='crypto') events = events.filter(e=>e.category==='crypto');

  const groups = _groupByDay(events.slice(0,20));
  const nextHigh = _getRecurringEvents().find(e=>e.impact==='high');

  el.innerHTML = `
    <div class="cal-section">
      <div class="cal-title">
        📅 Calendrier Économique
        ${nextHigh?`<span class="cal-countdown">${_fmtCountdown(nextHigh.ts)} · ${nextHigh.name.split(' ')[0]}</span>`:''}
      </div>

      <!-- Filtres -->
      <div class="cal-filter-row">
        ${[['all','Tous'],['high','🔴 Impact fort'],['crypto','₿ Crypto']].map(([k,l])=>`
          <button class="cal-filter-btn ${_calFilter===k?'active':''}" onclick="_calFilter='${k}';renderCalSection();">${l}</button>`).join('')}
      </div>

      <!-- Légende impact -->
      <div style="display:flex;gap:10px;margin-bottom:8px;font-size:8px;color:var(--t3);">
        <span>🔴 Fort</span><span>🟡 Moyen</span><span>⚪ Faible</span>
      </div>

      <!-- Événements groupés par jour -->
      ${Object.entries(groups).map(([day,evs])=>`
        <div class="cal-day-header">${day}</div>
        ${evs.map(e=>`
          <div class="cal-event">
            <div class="cal-event-time">
              ${e.date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
            </div>
            <div class="cal-event-impact cal-impact-${e.impact}"></div>
            <div class="cal-event-body">
              <div class="cal-event-name">${e.icon} ${e.name}</div>
              <div class="cal-event-meta">${e.desc}</div>
            </div>
            <span class="cal-countdown" style="font-size:8px;">${_fmtCountdown(e.ts)}</span>
          </div>`).join('')}`).join('')}

      ${events.length===0?`<div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Aucun événement dans ce filtre.</div>`:''}

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;line-height:1.4;">
        Événements récurrents crypto & macro · Dates approximatives<br>
        Vérifie toujours sur un calendrier économique officiel.
      </div>
    </div>`;
}
window.renderCalSection = renderCalSection;
// ═══ v61 · SCORING NEWS CRYPTO PAR COIN ═══
// Score individuel pour chaque paire AURA
// Fetch CryptoCompare News → filtre par coin → NLP → score 0-100

const _NS_CACHE = { data:{}, lastFetch:0, isFetching:false };
const _NS_TTL   = 10 * 60 * 1000; // 10min

// Mapping paires → mots-clés de recherche
const _NS_KEYWORDS = {
  'BTC/USDT': ['bitcoin','btc','satoshi','cryptocurrency'],
  'ETH/USDT': ['ethereum','eth','ether','defi','vitalik'],
  'XRP/USDT': ['xrp','ripple','garlinghouse'],
  'SOL/USDT': ['solana','sol','anatoly'],
  'DOGE/USDT':['dogecoin','doge','elon','musk'],
  'ADA/USDT': ['cardano','ada','hoskinson'],
  'AVAX/USDT':['avalanche','avax','subnet'],
  'LINK/USDT':['chainlink','link','oracle','sergey'],
};

const _NS_BULL = ['bull','surge','pump','ath','rally','gain','adoption','approval','upgrade','breakout','listing','partnership','launch','positive'];
const _NS_BEAR = ['bear','crash','dump','hack','ban','sec','lawsuit','fraud','scam','fear','delisting','exploit','vulnerability','penalty','fine'];

function _nsScore(text) {
  const t = (text||'').toLowerCase();
  let bull=0, bear=0;
  _NS_BULL.forEach(w=>{if(t.includes(w)) bull++;});
  _NS_BEAR.forEach(w=>{if(t.includes(w)) bear++;});
  return {bull, bear, score:bull+bear>0?(bull-bear)/(bull+bear):0};
}

async function refreshNewsScores(force) {
  const now = Date.now();
  if(!force && _NS_CACHE.lastFetch>0 && (now-_NS_CACHE.lastFetch)<_NS_TTL) {
    renderNewsScoreSection(); return;
  }
  if(_NS_CACHE.isFetching) return;
  _NS_CACHE.isFetching = true;

  const el = document.getElementById('newsScoreSection');
  if(el) el.innerHTML = '<div class="ns-section"><div class="ns-title">📰 Scoring News</div><div style="text-align:center;padding:20px;font-size:10px;color:var(--t3);">⏳ Chargement…</div></div>';

  try {
    const res  = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&limit=50',
      { signal: AbortSignal.timeout(12000) });
    const data = await res.json();
    const articles = data.Data || [];

    // Scorer chaque paire
    const pairs = Object.keys(PAIRS||{});
    pairs.forEach(pair=>{
      const keywords = _NS_KEYWORDS[pair] || [pair.replace('/USDT','').toLowerCase()];
      const relevant = articles.filter(a=>{
        const t = ((a.title||'')+(a.body||'').slice(0,300)).toLowerCase();
        return keywords.some(k=>t.includes(k));
      });

      let totalBull=0, totalBear=0;
      const top = relevant.slice(0,5).map(a=>{
        const ns = _nsScore(a.title+(a.body||'').slice(0,200));
        totalBull += ns.bull; totalBear += ns.bear;
        return { title:(a.title||'').slice(0,60), ...ns,
          source:a.source_info?.name||a.source||'', age:a.published_on };
      });

      const total = totalBull+totalBear;
      const rawScore = total>0 ? (totalBull-totalBear)/total : 0;
      const score = Math.round((rawScore+1)/2*100);

      _NS_CACHE.data[pair] = {
        score, rawScore, totalBull, totalBear,
        articles:top, count:relevant.length,
        label: score>=70?'HAUSSIER':score>=55?'POSITIF':score>=45?'NEUTRE':score>=35?'NÉGATIF':'BAISSIER',
      };
    });

    _NS_CACHE.lastFetch = Date.now();
    _NS_CACHE.isFetching = false;

    // Stocker dans S.veilleData pour les bots
    if(!S.veilleData) S.veilleData={};
    S.veilleData.newsByPair = _NS_CACHE.data;
    S.veilleData.newsByPairTs = Date.now();

  } catch(e) {
    _NS_CACHE.isFetching = false;
    const el2 = document.getElementById('newsScoreSection');
    if(el2) el2.innerHTML = `<div class="ns-section"><div class="ns-title">📰 Scoring News</div><div style="text-align:center;padding:16px;font-size:10px;color:var(--down);">⚠ Erreur : ${e.message}</div></div>`;
    return;
  }
  renderNewsScoreSection();
}
window.refreshNewsScores = refreshNewsScores;

function renderNewsScoreSection() {
  const el = document.getElementById('newsScoreSection');
  if(!el) return;

  const hasData = Object.keys(_NS_CACHE.data).length > 0;
  const ago = _NS_CACHE.lastFetch>0?Math.floor((Date.now()-_NS_CACHE.lastFetch)/60000)+'min':'—';

  if(!hasData) {
    el.innerHTML = `
      <div class="ns-section">
        <div class="ns-title">📰 Scoring News par Coin</div>
        <div style="text-align:center;padding:16px;">
          <div style="font-size:10px;color:var(--t3);margin-bottom:10px;">Score NLP individuel pour chaque paire · 50 articles analysés</div>
          <button onclick="refreshNewsScores(true)" style="background:rgba(56,212,245,.12);border:1px solid rgba(56,212,245,.3);border-radius:8px;color:var(--ice);font-size:11px;font-weight:700;padding:8px 20px;cursor:pointer;font-family:inherit;">📡 Charger les scores</button>
        </div>
      </div>`;
    return;
  }

  // Trier par score décroissant
  const sorted = Object.entries(_NS_CACHE.data)
    .sort((a,b)=>b[1].score-a[1].score);

  el.innerHTML = `
    <div class="ns-section">
      <div class="ns-title">
        📰 Scoring News par Coin
        <button onclick="refreshNewsScores(true)" style="font-size:8px;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:5px;color:var(--t3);padding:2px 7px;cursor:pointer;font-family:inherit;">🔄 ${ago}</button>
      </div>

      ${sorted.map(([pair,d])=>{
        const col = d.score>=70?'var(--up)':d.score>=55?'#84cc16':d.score>=45?'var(--gold)':d.score>=35?'#f97316':'var(--down)';
        const bgBadge = d.score>=70?'rgba(0,232,122,.12)':d.score>=55?'rgba(132,204,22,.12)':d.score>=45?'rgba(245,200,66,.12)':d.score>=35?'rgba(249,115,22,.12)':'rgba(255,61,107,.12)';
        const pairColor = PAIRS[pair]?.color||'var(--t1)';
        return `<div class="ns-coin-card">
          <div class="ns-coin-header">
            <span class="ns-coin-name" style="color:${pairColor};">${pair.replace('/USDT','')}</span>
            <span style="font-size:9px;color:var(--t3);">${d.count} articles</span>
            <div style="flex:1;"></div>
            <span class="ns-score-badge" style="background:${bgBadge};color:${col};">${d.score} · ${d.label}</span>
          </div>
          <div class="ns-bar">
            <div class="ns-bar-fill" style="width:${d.score}%;background:${col};"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:7px;color:var(--t3);margin-bottom:4px;">
            <span>🟢 ${d.totalBull} bull</span>
            <span>🔴 ${d.totalBear} bear</span>
          </div>
          ${d.articles.slice(0,2).map(a=>`
            <div class="ns-article">
              ${a.rawScore>0.1?'<span class="ns-keyword ns-kw-bull">↑</span>':a.rawScore<-0.1?'<span class="ns-keyword ns-kw-bear">↓</span>':''}
              ${a.title}
            </div>`).join('')}
        </div>`;
      }).join('')}
    </div>`;
}
window.renderNewsScoreSection = renderNewsScoreSection;
// ═══ v62 · ANALYSE DES FRAIS CUMULÉS ═══

function _feeDonut(data) {
  const total = data.reduce((s,d)=>s+d.value,0);
  if(total===0) return '<circle cx="50" cy="50" r="40" fill="rgba(255,255,255,.05)"/>';
  let angle = -90;
  return data.map(d=>{
    const pct=d.value/total;
    const a1=angle*Math.PI/180; angle+=pct*360;
    const a2=angle*Math.PI/180;
    const x1=50+40*Math.cos(a1),y1=50+40*Math.sin(a1);
    const x2=50+40*Math.cos(a2),y2=50+40*Math.sin(a2);
    return `<path d="M50,50 L${x1.toFixed(1)},${y1.toFixed(1)} A40,40 0 ${pct>.5?1:0},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${d.color}"/>`;
  }).join('');
}
window._feeDonut = _feeDonut;

function renderFeeAnalysisSection() {
  const el = document.getElementById('feeAnalysisSection');
  if(!el) return;

  const fees   = S.fees || {};
  const byPair = fees.byPair || {};
  const n      = S.totalTrades||0;
  const allT   = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null)
  );

  const tradingFees = fees.totalTradingFees||0;
  const slippage    = fees.totalSlippage||0;
  const funding     = fees.totalFunding||0;
  const taxProv     = fees.totalTaxProvision||0;
  const totalFees   = tradingFees+slippage+funding+taxProv;
  const feePerTrade = n>0?totalFees/n:0;

  const pnlGross = fees.totalPnlGross||0;
  const pnlNet   = fees.totalPnlNet||allT.reduce((s,t)=>s+(t.pnlUsdt||0),0);
  const feeRatio = pnlGross>0?totalFees/pnlGross*100:0;

  // Projection mensuelle
  const firstTs = Math.min(...allT.filter(t=>t.ts).map(t=>t.ts).filter(isFinite));
  const days    = isFinite(firstTs)&&firstTs>0?Math.max(1,(Date.now()-firstTs)/86400000):1;
  const monthlyFees = (totalFees/days)*30;

  // Donut
  const donutData = [
    {value:tradingFees,col:'#ff3d6b',lbl:'Trading'},
    {value:slippage,   col:'#f97316',lbl:'Slippage'},
    {value:funding,    col:'#f5c842',lbl:'Funding'},
    {value:taxProv,    col:'#38d4f5',lbl:'Taxe'},
  ].filter(d=>d.value>0);

  // Top paires coûteuses
  const pairFees = Object.entries(byPair).map(([pair,f])=>({
    pair, total:(f.tradingFees||0)+(f.slippage||0)+(f.funding||0)
  })).filter(p=>p.total>0).sort((a,b)=>b.total-a.total);
  const maxPF = Math.max(1,...pairFees.map(p=>p.total));

  // Conseils
  const tips = [];
  if(n===0) tips.push({i:'📭',t:'Aucun trade enregistré — les frais s\'accumuleront avec le temps.'});
  else {
    if(feeRatio>30) tips.push({i:'🚨',t:`Frais = ${feeRatio.toFixed(0)}% des gains bruts. Critique — augmente la taille des trades.`});
    if(feePerTrade>2) tips.push({i:'⚠️',t:`$${feePerTrade.toFixed(2)}/trade en frais. Préfère les ordres limit au lieu de market.`});
    if(funding>tradingFees*0.3&&funding>0) tips.push({i:'💡',t:'Frais funding élevés — évite les positions futures longue durée.'});
    if(slippage>tradingFees*0.2&&slippage>0) tips.push({i:'📊',t:'Slippage important — trade en heure de haute liquidité (8h-16h UTC).'});
    if(tips.length===0) tips.push({i:'✅',t:`Frais bien maîtrisés · ${feeRatio.toFixed(1)}% des gains bruts.`});
  }

  el.innerHTML = `
    <div class="fee-section">
      <div class="fee-title">💸 Analyse des Frais Cumulés</div>

      <div class="fee-kpi-grid">
        <div class="fee-kpi"><span class="fee-kpi-val" style="color:var(--down);">-$${totalFees.toFixed(2)}</span><span class="fee-kpi-lbl">Total frais</span></div>
        <div class="fee-kpi"><span class="fee-kpi-val" style="color:${feeRatio<15?'var(--up)':feeRatio<30?'var(--gold)':'var(--down)'};">${feeRatio.toFixed(1)}%</span><span class="fee-kpi-lbl">% gains bruts</span></div>
        <div class="fee-kpi"><span class="fee-kpi-val">-$${feePerTrade.toFixed(3)}</span><span class="fee-kpi-lbl">Frais/trade</span></div>
        <div class="fee-kpi"><span class="fee-kpi-val" style="color:var(--gold);">~$${monthlyFees.toFixed(2)}</span><span class="fee-kpi-lbl">Projection /mois</span></div>
      </div>

      ${donutData.length>0?`
      <div class="fee-donut-wrap">
        <svg width="100" height="100" viewBox="0 0 100 100" style="flex-shrink:0;">
          ${_feeDonut(donutData)}
          <circle cx="50" cy="50" r="26" fill="var(--s2)"/>
          <text x="50" y="47" text-anchor="middle" font-size="9" fill="var(--t3)">Total</text>
          <text x="50" y="59" text-anchor="middle" font-size="8" font-weight="700" fill="var(--down)">-$${totalFees.toFixed(1)}</text>
        </svg>
        <div style="display:flex;flex-direction:column;gap:5px;">
          ${donutData.map(d=>`<div class="fee-legend-item"><div class="fee-legend-dot" style="background:${d.col};"></div><span>${d.lbl} : -$${d.value.toFixed(2)}</span></div>`).join('')}
        </div>
      </div>`:''}

      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Breakdown par type</div>
      ${[{l:'Trading fees',v:tradingFees,c:'#ff3d6b'},{l:'Slippage',v:slippage,c:'#f97316'},{l:'Funding rates',v:funding,c:'#f5c842'},{l:'Provision taxe',v:taxProv,c:'#38d4f5'}]
        .map(f=>`<div class="fee-row"><span style="color:var(--t2);">${f.l}</span><span style="font-family:var(--font-mono);font-weight:700;color:${f.c};">-$${f.v.toFixed(2)}</span></div>`).join('')}

      <div style="font-size:9px;color:var(--t3);margin:8px 0 5px;">P&L Brut vs Net</div>
      <div class="fee-row"><span style="color:var(--t2);">P&L Brut</span><span style="font-weight:700;color:var(--up);">+$${pnlGross.toFixed(2)}</span></div>
      <div class="fee-row"><span style="color:var(--t2);">Frais déduits</span><span style="font-weight:700;color:var(--down);">-$${totalFees.toFixed(2)}</span></div>
      <div class="fee-row"><span style="font-weight:700;color:var(--t1);">P&L Net réel</span><span style="font-weight:800;font-family:var(--font-mono);color:${pnlNet>=0?'var(--up)':'var(--down)'};">${pnlNet>=0?'+':''}$${pnlNet.toFixed(2)}</span></div>

      ${pairFees.length>0?`
      <div style="font-size:9px;color:var(--t3);margin:8px 0 5px;">Top paires les plus coûteuses</div>
      ${pairFees.slice(0,5).map(p=>`<div class="fee-pair-row">
        <span style="font-weight:700;color:${PAIRS[p.pair]?.color||'var(--t1)'};">${p.pair.replace('/USDT','')}</span>
        <div style="flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden;margin:0 8px;">
          <div style="height:100%;width:${Math.round(p.total/maxPF*100)}%;background:var(--down);border-radius:100px;"></div>
        </div>
        <span style="font-size:9px;color:var(--down);font-family:var(--font-mono);">-$${p.total.toFixed(2)}</span>
      </div>`).join('')}`:''}

      <div class="fee-tip">
        ${tips.map(t=>`<div style="margin-bottom:2px;">${t.i} ${t.t}</div>`).join('')}
      </div>
    </div>`;
}
window.renderFeeAnalysisSection = renderFeeAnalysisSection;
