// VRAIES fonctions (06 ADN, 05 hebdo, 06 calcul de position) sur les trades réels du portefeuille EV (backup 14/10 18:45)
const fs=require('fs'),vm=require('vm');const fnSrc=require('/home/claude/aura/rejeu/audit-20261013/fnsrc.js');
const s05=fs.readFileSync('/home/claude/aura/js/05-v37-19-indicateur-de-fatigue-bot.js','utf8');
const s06=fs.readFileSync('/home/claude/aura/js/06-v63-patterns-chartistes.js','utf8');
const a=JSON.parse(fs.readFileSync('/home/claude/aura/rejeu/backups/pont/aura_guardian_full_20261014-184539.json','utf8')).aura;
const w=a.walletStore.paperReal;
// 1) ADN : gènes produits sur les vrais trades
{ const S={pairStates:JSON.parse(JSON.stringify(w.pairStates))};const c={S,Math,Date,Object,console};vm.createContext(c);
  ['_buildAdnSignature','_adnAnnotateTrades','_adnBestPatterns'].forEach(n=>vm.runInContext(fnSrc(s06,n),c));
  const n=vm.runInContext('_adnAnnotateTrades()',c);
  const all=Object.values(S.pairStates).flatMap(p=>(p.trades||[]).filter(t=>t.adn));
  const dist=i=>{const d={};all.forEach(t=>{const k=t.adn.genes[i].t;d[k]=(d[k]||0)+1});return JSON.stringify(d);};
  console.log('ADN · trades annotés (écrits dans S.pairStates) :',n);
  console.log('  G3 taille :',dist(2)); console.log('  G4 régime :',dist(3)); console.log('  G7 durée  :',dist(6));
  console.log('  champ pair sur la ligne :',all.filter(t=>t.pair).length,'/',all.length);
  const before=JSON.stringify(w.pairStates).length, after=JSON.stringify(S.pairStates).length;
  console.log('  poids pairStates EV :',Math.round(before/1024),'Ko →',Math.round(after/1024),'Ko');
  const best=vm.runInContext('_adnBestPatterns(Object.values(S.pairStates).flatMap(p=>(p.trades||[]).filter(t=>t.adn)))',c);
  console.log('  « configurations les plus performantes » :',best.map(g=>g.label+' · '+g.total+' tr · P&L '+g.pnl.toFixed(2)).join(' | '));
}
// 2) Hebdo : regroupement par paire sur la semaine du dernier trade
{ const S={pairStates:w.pairStates};const c={S,Math,Date,Object,Array,console};vm.createContext(c);
  ['_getWeekTrades','_analyzeWeek'].forEach(n=>vm.runInContext(fnSrc(s05,n),c));
  const lastTs=Math.max(...Object.values(w.pairStates).flatMap(p=>(p.trades||[]).map(t=>t.ts||0)));
  const off=Math.round((Date.now()-lastTs)/(7*864e5));
  const r=vm.runInContext('(()=>{const x=_getWeekTrades('+off+');return _analyzeWeek(x.trades,x.monday,x.sunday);})()',c);
  console.log('Hebdo (offset',off,') · trades',r.n,'· clés byPair :',Object.keys(r.byPair).join(','),'· insights :',r.insights.filter(s=>/paire|surveiller/.test(s)).join(' / '));
}
// 3) Calculateur : 1er rendu (capital 1000 avant synchro) et levier
{ const S={tradingAccount:w.tradingAccount,pairStates:w.pairStates,totalTrades:w.totalTrades,winTrades:w.winTrades};const c={S,Math,console};vm.createContext(c);
  const i=s06.indexOf('const _CALC'), j=s06.indexOf('function calcUpdate');vm.runInContext(s06.slice(i,j).replace('const _CALC','var _CALC'),c);vm.runInContext(fnSrc(s06,'_runCalc'),c);
  let r=vm.runInContext('_runCalc()',c); console.log('Calc 1er rendu : capital utilisé',r.cap,'(compte trading',S.tradingAccount.toFixed(2)+') · risque $'+r.riskUsd.toFixed(2));
  for(const lev of [1,3]){ r=vm.runInContext('_CALC.capital=1000;_CALC.leverage='+lev+';_runCalc()',c);
    const vraiSL=r.exposure*r.slPct/100; console.log('Calc levier ×'+lev+' : « Montant risqué » $'+r.riskUsd.toFixed(2)+' · « Si SL » $'+r.netSL.toFixed(2)+' · perte réelle au SL (exposition×SL) $'+vraiSL.toFixed(2)+' · R/R affiché '+r.rr.toFixed(2)+' · frais $'+r.feesUsd.toFixed(2)+' pour '+r.fee+' % « A/R » sur $'+r.exposure.toFixed(0)); }
  r=vm.runInContext('_CALC.leverage=1;_CALC.tpPct=1;_CALC.slPct=1.5;_runCalc()',c); console.log('Calc TP 1 % / SL 1,5 % : Kelly',r.kelly.toFixed(1),'% → texte :',(r.riskPct>r.kelly&&r.kelly>0)?'⚠ trop':'✅ Ton risque est dans les clous Kelly');
}
// 4) Diff : un backup FULL (format Guardian / _buildFullBackupFile) chargé tel quel
{ const full=JSON.parse(fs.readFileSync('/home/claude/aura/rejeu/backups/pont/aura_guardian_full_20261014-184539.json','utf8'));
  let parsed=full; if(parsed.state && parsed.meta) parsed=parsed.state;   // = 06:2093
  console.log('Diff · backup FULL → portfolio',parsed.portfolio,'· totalTrades',parsed.totalTrades,'· agents',(parsed.agents||[]).length,'· (dans .aura : portfolio',full.aura.portfolio.toFixed(2)+', agents',full.aura.agents.length+')');
}
