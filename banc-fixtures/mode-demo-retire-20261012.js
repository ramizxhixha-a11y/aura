// banc-fixtures/mode-demo-retire-20261012.js — TÉMOIN, jamais chargé par l'app.
// Le texte EXACT du Mode Démo (v51) tel qu'il était dans js/05-v37-19-indicateur-de-fatigue-bot.js au token 20261011a (lignes 2786 à 2911 :
// _DEMO_PRESETS, enterDemoMode, exitDemoMode), retiré de l'app le 12/10/2026 (« go démo », Rams : « on l'enlève complètement »).
// Gardé ici pour une seule raison : banc-demo-retire.js s'en sert pour REFAIRE l'accident du 11/10 (le compte fictif écrit dans le vrai état)
// sur un état d'essai, puis vérifie que js/18-reparation-demo.js rend le compte d'avant au cent près. Ne rien y retoucher.
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
    regime: 'calm',
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
    regime: 'bull',
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
    regime: 'bear',
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
    tradingMode: S.tradingMode, _regimeOverride: S._regimeOverride,
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
  S._regimeOverride = preset.regime; // [P0] la démo force le régime via l'override de la source unique

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
  if(!_demoBackup) { _demoActive=false; S._regimeOverride = undefined; document.getElementById('demoBanner')?.classList.remove('show'); return; }

  // Restaurer le vrai state
  S.portfolio       = _demoBackup.portfolio;
  S.tradingAccount  = _demoBackup.tradingAccount;
  S.cashAccount     = _demoBackup.cashAccount;
  S.totalTrades     = _demoBackup.totalTrades;
  S.winTrades       = _demoBackup.winTrades;
  S.pnl24h          = _demoBackup.pnl24h;
  S.tradingMode     = _demoBackup.tradingMode;
  S._regimeOverride = _demoBackup._regimeOverride;
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
