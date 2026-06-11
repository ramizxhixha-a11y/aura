/* ════════════════════════════════════════════════════════════
   09m-wallet-detail.js · v1 (11/06/2026)
   Tap sur une tuile de compte (portefeuille) → panneau « détail » qui monte du bas.
   100% données RÉELLES : valeurs déjà affichées (DOM) + état live (window.S).
   Aucune donnée inventée. Là où rien n'est journalisé → message honnête.
   Charge APRÈS 09l-window-bridge (besoin de window.S).
   ════════════════════════════════════════════════════════════ */
(function(){
  if(window.__walletDetail) return; window.__walletDetail = true;

  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function txt(id){ const e=document.getElementById(id); return e ? e.textContent.trim() : '—'; }
  function S(){ return window.S || {}; }
  function num(v,d){ v=parseFloat(v); return isFinite(v)?v:(d||0); }
  function fmt(n){ return num(n,0).toLocaleString('fr-FR',{maximumFractionDigits:2}); }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* map : la tuile contient tel id de valeur → tel type de compte */
  const TYPE_BY_ID = {
    cashVal:'caisse', tradVal:'trading', levReserveVal:'levier',
    fiscalResVal:'fiscale', ownFundsVal:'fonds', leverageDisp:'regLevier',
    antiNegReserveVal:'antineg', fiscalRegimeVal:'regime', splitDisp:'repart'
  };
  function detectType(tile){ for(const id in TYPE_BY_ID){ if(tile.querySelector('#'+id)) return TYPE_BY_ID[id]; } return null; }

  /* construit le contenu d'un compte à partir des données réelles */
  function build(type){
    const s=S(), tax=s.taxConfig||{}, reg=(tax.regions||{})[tax.region]||{};
    switch(type){

      case 'caisse': return {icn:'🏦', title:'Caisse', big:txt('cashVal'), color:'var(--ice)',
        desc:'Ta réserve personnelle. <b style="color:var(--ice)">Le bot ne peut jamais y toucher</b> — verrou de sécurité absolu.',
        kv:[['Part du portefeuille', txt('cashPct')], ['Accès du bot','🔒 Verrouillé']],
        hist:(Array.isArray(s.cashLog)?s.cashLog:[]).slice(0,6).map(e=>{
          const lbl = e.source==='profit_split' ? 'Bénéfice → Caisse'
            : e.source==='transfer_in'  ? 'Transfert Trading → Caisse'
            : e.source==='transfer_out' ? 'Transfert Caisse → Trading'
            : (e.source||'Mouvement');
          const pos = num(e.amount,0)>=0;
          return [lbl, e.time||'', (pos?'+':'−')+'$'+fmt(Math.abs(num(e.amount,0))), pos?'var(--up)':'var(--down)'];
        }),
        empty:(s.cashLog&&s.cashLog.length)?null:'Aucun mouvement de caisse pour l\'instant.'};

      case 'trading': {
        const ops = Array.isArray(s.openPositions) ? s.openPositions : [];
        const trading = num(s.tradingAccount,0);
        const positions = ops.map(p=>{
          const pair=p.pair||p.symbol||p.key||'?';
          const side=String(p.side||p.dir||'').toUpperCase();
          const stake=num(p.stakeUsdt!=null?p.stakeUsdt:(p.stake!=null?p.stake:p.totalExposure),0);
          const pnl=num(p.pnlUsdt!=null?p.pnlUsdt:p.pnl,0);
          const w=trading>0?Math.max(2,Math.min(100,Math.round(stake/trading*100))):0;
          return {pair,side,stake,pnl,w};
        });
        return {icn:'📈', title:'Trading', big:txt('tradVal'), color:'var(--t1)',
          desc:'Le capital opérationnel — <b>le seul</b> compte que le bot utilise pour trader.',
          kv:[['Part du portefeuille', txt('tradPct')], ['Positions ouvertes', String(ops.length)]],
          positions:positions,
          empty:positions.length?null:'Aucune position ouverte actuellement.'};
      }

      case 'levier': return {icn:'⚡', title:'Réserve Levier Max. Dispo.', big:txt('levReserveVal'), color:'var(--gold)',
        desc:'Capacité d\'emprunt maximale (Trading × 10 × index). À index ×0, le levier est désactivé : rien n\'est emprunté.',
        kv:[['Index levier','×'+num(s.leverage,0)], ['Emprunté','$'+fmt(s.leverageBorrowed)],
            ['Intérêts cumulés','$'+fmt(s.leverageTotalFees)], ['Formule','Trading × 10 × index']]};

      case 'fiscale': return {icn:'🏛️', title:'Réserve Fiscale', big:txt('fiscalResVal'), color:'var(--gold)',
        desc:'Reçoit automatiquement les taxes sur gains et les intérêts de levier. <b>Ne diminue jamais</b> (sauf retrait explicite).',
        kv:[['Dépôts', txt('fiscalResSub')], ['Région', reg.label||tax.region||'—']],
        hist:(Array.isArray(s.fiscalReserveLog)?s.fiscalReserveLog:[]).slice(0,6).map(e=>
          [e.desc||e.label||'Dépôt', e.time||'', (e.amount!=null?('+$'+fmt(e.amount)):''), 'var(--gold)']),
        empty:(s.fiscalReserveLog&&s.fiscalReserveLog.length)?null:'Aucun dépôt journalisé (cumul automatique).'};

      case 'fonds': return {icn:'💎', title:'Fonds Propres', big:txt('ownFundsVal'), color:'var(--up)',
        desc:'L\'argent réel que tu as injecté (en euros). <b style="color:var(--up)">Fiscalement exonéré</b> — affiché en € car c\'est ce que tu as vraiment mis.',
        kv:[['Injecté (équiv. USDT)','$'+fmt(s.ownFundsInjected)], ['Statut','Exonéré'], ['Région', reg.label||tax.region||'—']],
        hist:(Array.isArray(s.ownFundsLog)?s.ownFundsLog:[]).slice(0,6).map(e=>
          [(e.fiatType||'EUR')+' @ '+(e.rate!=null?e.rate:'—'), e.time||'', (e.fiatAmount!=null?('+'+fmt(e.fiatAmount)+' '+(e.fiatType||'€')):''), 'var(--up)']),
        empty:(s.ownFundsLog&&s.ownFundsLog.length)?null:'Capital initial — aucune injection ponctuelle journalisée.'};

      case 'regLevier': return {icn:'⚙️', title:'Réglage Levier', big:'×'+num(s.leverage,0), color:'var(--gold)',
        desc:'Curseur 0 → ×10. Plus l\'index monte, plus le bot peut emprunter (juste-à-temps) pour saisir une opportunité forte. À ×0, aucun emprunt.',
        kv:[['Index actuel','×'+num(s.leverage,0)], ['Capacité à ×1','Trading × 10'], ['Emprunt','juste-à-temps, jamais manuel']]};

      case 'antineg': return {icn:'🛡️', title:'Réserve Anti-Négatif', big:txt('antiNegReserveVal'), color:'var(--ice)',
        desc:'À l\'ouverture de chaque trade, les <b>frais + intérêts estimés</b> sont mis de côté ici pour que le compte ne devienne <b style="color:var(--ice)">jamais négatif</b> — même si le navigateur coupe en pleine perte. SL estimé via l\'ATR (pas un % fixe).',
        kv:[['Trades couverts', txt('antiNegReserveSub')], ['Estimation','frais + intérêts à l\'ouverture'], ['SL estimé via','ATR']]};

      case 'regime': {
        const norm = reg.rateNormal!=null ? Math.round(reg.rateNormal*100)+'%' : '—';
        const spec = reg.rateSpec!=null ? Math.round(reg.rateSpec*100)+'%' : '—';
        return {icn:'🏛️', title:'Régime Fiscal', big:txt('fiscalRegimeVal'), color:'var(--down)',
          desc: reg.note ? esc(reg.note) : 'Régime fiscal appliqué selon le comportement du bot (fréquence, levier, durée de détention).',
          kv:[['Régime appliqué', txt('fiscalRegimeSub')], ['Région', reg.label||tax.region||'—'],
              ['Taux normal', norm], ['Taux spéculatif', spec]]};
      }

      case 'repart': {
        const split=num(s.profitSplitCaissePct,50);
        return {icn:'⚖️', title:'Répartition des bénéfices', big:txt('splitDisp'), color:'var(--ice)',
          desc:'Après chaque trade <b>gagnant</b>, cette part du bénéfice net part en <b style="color:var(--ice)">Caisse</b> (sécurisé) ; le reste reste en Trading (effet de composition).',
          kv:[['Vers Caisse', split+'%'], ['Vers Trading', (100-split)+'%']]};
      }
    }
    return null;
  }

  function render(d){
    let h='<div class="wd-head"><span class="icn">'+d.icn+'</span><h3>'+esc(d.title)+'</h3>'
        + '<span class="big" style="color:'+d.color+'">'+esc(d.big)+'</span></div>';
    h+='<div class="wd-desc">'+d.desc+'</div>';
    if(d.kv&&d.kv.length){ h+='<div class="wd-sec">Détail</div>';
      d.kv.forEach(r=>{ h+='<div class="wd-kv"><span class="k">'+esc(r[0])+'</span><span class="v">'+esc(r[1])+'</span></div>'; }); }
    if(d.positions){ h+='<div class="wd-sec">Positions ouvertes</div>';
      d.positions.forEach(p=>{ const col=(p.side==='SELL'||p.side==='SHORT')?'var(--down)':'var(--up)';
        h+='<div class="wd-pos"><div class="wd-pos-top"><span>'+esc(p.pair)+' · '+esc(p.side||'')+'</span>'
          +'<span style="font-family:var(--font-mono);font-weight:700">$'+fmt(p.stake)+(p.pnl?(' · '+(p.pnl>=0?'+':'')+fmt(p.pnl)):'')+'</span></div>'
          +'<div class="wd-pos-bar"><div class="wd-pos-fill" style="width:'+p.w+'%;background:'+col+'"></div></div></div>'; });
    }
    if(d.hist&&d.hist.length){ h+='<div class="wd-sec">Historique récent</div>';
      d.hist.forEach(r=>{ h+='<div class="wd-hist"><div><div>'+esc(r[0])+'</div><div class="when">'+esc(r[1])+'</div></div>'
        +'<span class="amt" style="color:'+(r[3]||'var(--t1)')+'">'+esc(r[2])+'</span></div>'; }); }
    if(d.empty){ h+='<div class="wd-empty">'+esc(d.empty)+'</div>'; }
    return h;
  }

  function ensureSheet(){
    if(document.getElementById('wdSheet')) return;
    const bd=document.createElement('div'); bd.id='wdBackdrop';
    const sh=document.createElement('div'); sh.id='wdSheet';
    sh.innerHTML='<div class="wd-grab"></div><div id="wdContent"></div><button class="wd-close">Fermer</button>';
    document.body.appendChild(bd); document.body.appendChild(sh);
    bd.addEventListener('click', closeWalletDetail);
    sh.querySelector('.wd-close').addEventListener('click', closeWalletDetail);
  }

  function openWalletDetail(type){
    try{
      ensureSheet();
      const d=build(type); if(!d) return;
      document.getElementById('wdContent').innerHTML=render(d);
      document.getElementById('wdBackdrop').classList.add('open');
      document.getElementById('wdSheet').classList.add('open');
    }catch(e){ console.warn('[walletDetail]', e); }
  }
  function closeWalletDetail(){
    const bd=document.getElementById('wdBackdrop'), sh=document.getElementById('wdSheet');
    if(bd) bd.classList.remove('open');
    if(sh) sh.classList.remove('open');
  }
  window.openWalletDetail=openWalletDetail;
  window.closeWalletDetail=closeWalletDetail;

  /* Délégation : un tap sur une tuile de compte ouvre son détail.
     Les boutons ± (Levier / Répartition) sont exclus → ils gardent leur action. */
  ready(function(){
    ensureSheet();
    document.addEventListener('click', function(e){
      const tile=e.target.closest('.wc-account');
      if(!tile) return;
      if(e.target.closest('button')) return;
      const type=detectType(tile);
      if(type) openWalletDetail(type);
    });
  });
})();
