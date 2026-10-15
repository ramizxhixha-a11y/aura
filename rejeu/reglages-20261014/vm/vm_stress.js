// VRAI _runStressTest (06) sur le portefeuille EV du backup réel 14/10 18:45 + une position longue fictive de 100 $ (levier ×3) pour voir le calcul
const fs=require('fs'),vm=require('vm');const fnSrc=require('/home/claude/aura/rejeu/audit-20261013/fnsrc.js');
const s06=fs.readFileSync('/home/claude/aura/js/06-v63-patterns-chartistes.js','utf8');
const a=JSON.parse(fs.readFileSync('/home/claude/aura/rejeu/backups/pont/aura_guardian_full_20261014-184539.json','utf8')).aura;
const w=a.walletStore.paperReal;
const i=s06.indexOf('let _stScenarioKey'), j=s06.indexOf('function selectStScenario');
for (const pos of [[],[{side:'long',stakeUsdt:100,totalExposure:300}]]) {
  const S={tradingAccount:w.tradingAccount-(pos.length?100:0),openPositions:pos,totalTrades:w.totalTrades,winTrades:w.winTrades,agents:a.agents};
  const c={S,Math,console};vm.createContext(c);vm.runInContext(s06.slice(i,j).replace(/^let /gm,'var ').replace(/^const _ST/m,'var _ST'),c);vm.runInContext(fnSrc(s06,'_runStressTest'),c);
  for (const k of ['crash2022','flash_crash']) { c.__k=k; const r=vm.runInContext('_stScenarioKey=__k; _runStressTest()',c);
    console.log((pos.length?'1 long 100$ ×3':'0 position')+' · '+k+' : capital '+r.capital.toFixed(2)+' → après '+r.capitalAfter.toFixed(2)+' · perte '+r.totalLoss.toFixed(2)+' (longs '+r.longPosLoss.toFixed(2)+', libre '+r.freeLoss.toFixed(2)+') · agents résistants '+r.agentsSurviving+'/'+r.agentsTotal+' · WR bots '+r.botWrBefore+'→'+r.botWrAfter); }
}
