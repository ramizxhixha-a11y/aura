// Preuve vm : VRAI renderPairPnl (07) sur l'écran RE avec les paires vivantes du backup 13/10 20:29
const fs=require('fs'),vm=require('vm');const fnSrc=require('./fnsrc.js');
const a=JSON.parse(fs.readFileSync('/home/claude/aura/rejeu/backups/pont/aura_guardian_full_20261013-202953.json','utf8')).aura;
const s07=fs.readFileSync('/home/claude/aura/js/07-v90-mode-bunker-sos.js','utf8');
const PAIRS={}; Object.keys(a.walletStore.paperReal.pairStates).forEach(p=>{ if(!(a.removedPairs||[]).includes(p)) PAIRS[p]={dec:2,color:'#fff'}; });
const S={tradingMode:'real',pairStates:a.walletStore.real.pairStates,openPositions:[]};
const c={S,PAIRS,Math,Object,document:{getElementById:()=>null},console};vm.createContext(c);
vm.runInContext(fnSrc(s07,'renderPairPnl'),c);
try{vm.runInContext('renderPairPnl()',c);console.log('RE : rendu sans erreur');}catch(e){console.log('RE · paires actives',Object.keys(PAIRS).length,'· états RE',Object.keys(S.pairStates).length,'→',e.name+': '+e.message);}
