// Preuve vm : VRAIS pyramidPosition (05) + closePosition (02) + urgenceCloseAll (06)
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT='/home/claude/aura', rd=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
function fnSrc(src,name){const re=new RegExp('(^|\\n)(async )?function '+name+'\\s*\\(');const m=re.exec(src);if(!m)throw new Error('absent '+name);const start=m.index+m[1].length,st=[];
 for(let i=src.indexOf('{',src.indexOf(')',start));i<src.length;i++){const c=src[i],n2=src[i+1],top=st[st.length-1];
  if(top==='t'){if(c==='\\'){i++;continue}if(c==='`'){st.pop();continue}if(c==='$'&&n2==='{'){st.push('x');i++}continue}
  if(c==='/'&&n2==='/'){i=src.indexOf('\n',i);continue}if(c==='/'&&n2==='*'){i=src.indexOf('*/',i)+1;continue}
  if(c==='"'||c==="'"){i++;while(i<src.length&&src[i]!==c){if(src[i]==='\\')i++;i++}continue}
  if(c==='`'){st.push('t');continue}if(c==='{'){st.push('b');continue}if(c==='}'){st.pop();if(!st.length)return src.slice(start,i+1)}}}
const s02=rd('js/02-state-init.js'), s05=rd('js/05-v37-19-indicateur-de-fatigue-bot.js'), s06=rd('js/06-v63-patterns-chartistes.js');
const pyCfg=(s05.match(/const _PY_CFG = \{[\s\S]*?\};/)||[])[0];
function world(){
 const A={id:'pA',pair:'BTC/USDT',side:'long',entryPrice:100,stakeUsdt:30,totalExposure:30,auto:false,openedAt:1,entryTs:1};
 const S={tradingMode:'paperReal',cashAccount:0,tradingAccount:970,openPositions:[A],pnlHistory:[1000],chainLog:[],totalTrades:0,winTrades:0,leverage:0,leverageBorrowed:0,
  pairStates:{'BTC/USDT':{price:100,trades:[],totalPnlPct:0,totalPnlUsd:0,totalTrades:0,winTrades:0}},paperRealStats:{},agents:[],profitSplitCaissePct:0,cashLog:[]};
 const fees=[];
 const c={S,PAIRS:{'BTC/USDT':{dec:2}},Math,Number,Object,Array,String,JSON,Date,isFinite,console:{log:()=>{},warn:()=>{},error:()=>{}},showToast:()=>{},rndHash:()=>'h',nowStr:()=>'x',repayLeverage:()=>{},syncLeverageReserve:()=>{},
  recordFees:(p)=>{fees.push(p.id);return{totalFee:0,taxAmount:0,pnlNet:0}},recordTradeForHeatmap:()=>{},learnFromOutcome:()=>{},emitVictoryParticles:()=>{},emitLossParticles:()=>{},showMilestone:()=>{},
  checkPnlAlerts:()=>{},checkBadges:()=>{},_updateCloseAllBadge:()=>{},updatePairBtnStates:()=>{},renderPositions:()=>{},renderChain:()=>{},renderPyramideSection:()=>{},renderHome:()=>{},_urgAppendLog:()=>{}};
 c.window=c; vm.createContext(c);
 vm.runInContext([pyCfg,fnSrc(s02,'_computePortfolio'),fnSrc(s02,'_computePortfolioSans'),fnSrc(s02,'_walletKey'),fnSrc(s02,'closePosition'),fnSrc(s05,'pyramidPosition'),fnSrc(s06,'urgenceCloseAll'),'var S=this.S;'].join('\n'),c);
 return {c,S,fees};
}
console.log('_PY_CFG =', pyCfg.replace(/\s+/g,' ').slice(0,160));
// 1) pyramide : LONG 30 $ @100 ; prix 97 → ajout ; fermeture @99
let w=world(); w.S.pairStates['BTC/USDT'].price=97; vm.runInContext("pyramidPosition('pA')",w.c);
const p=w.S.openPositions[0]; console.log('après pyramide : stakeUsdt',p.stakeUsdt,'entryPrice',p.entryPrice,'_avgEntryPrice',+(p._avgEntryPrice||0).toFixed(4),'trading',w.S.tradingAccount);
const vrai = p._pyramidEntries? (30*(99-100)/100 + p._pyramidEntries.reduce((s,e)=>s+e.stake*(99-e.price)/e.price,0)) : NaN;
const tr0=w.S.tradingAccount; w.S.pairStates['BTC/USDT'].price=99; vm.runInContext("closePosition('pA')",w.c);
console.log('fermeture @99 : P&L crédité par l\'app', +(w.S.tradingAccount-tr0-p.stakeUsdt).toFixed(4),'$ · P&L vrai des entrées', +vrai.toFixed(4),'$');
// 2) urgence : position à levier (mise 30, exposition 300) à +2 %
w=world(); const B=w.S.openPositions[0]; B.totalExposure=300; B.levBorrowed=270; w.S.leverageBorrowed=270; w.S.pairStates['BTC/USDT'].price=102;
const t1=w.S.tradingAccount; vm.runInContext("urgenceCloseAll()",w.c);
console.log('urgenceCloseAll : crédit',+(w.S.tradingAccount-t1).toFixed(2),'$ (closePosition donnerait mise + 2 % × 300 = 36 $) · recordFees appelé',w.fees.length,'fois · leverageBorrowed après',w.S.leverageBorrowed,'· historique paire',w.S.pairStates['BTC/USDT'].trades.length,'ligne(s)');
