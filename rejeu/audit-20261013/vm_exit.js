// Preuve vm : le VRAI _closeTradesOnExit (09b2) + le VRAI closePosition (02), monde du banc-portefeuille-juste
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT='/home/claude/aura', rd=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
function fnSrc(src,name){const re=new RegExp('(^|\\n)(async )?function '+name+'\\s*\\(');const m=re.exec(src);if(!m)throw new Error('absent '+name);const start=m.index+m[1].length,st=[];
 for(let i=src.indexOf('{',src.indexOf(')',start));i<src.length;i++){const c=src[i],n2=src[i+1],top=st[st.length-1];
  if(top==='t'){if(c==='\\'){i++;continue}if(c==='`'){st.pop();continue}if(c==='$'&&n2==='{'){st.push('x');i++}continue}
  if(c==='/'&&n2==='/'){i=src.indexOf('\n',i);continue}if(c==='/'&&n2==='*'){i=src.indexOf('*/',i)+1;continue}
  if(c==='"'||c==="'"){i++;while(i<src.length&&src[i]!==c){if(src[i]==='\\')i++;i++}continue}
  if(c==='`'){st.push('t');continue}if(c==='{'){st.push('b');continue}if(c==='}'){st.pop();if(!st.length)return src.slice(start,i+1)}}}
const s02=rd('js/02-state-init.js'), s09b2=rd('js/09b2-save-load.js');
for (const manu of [false,true]) {
const A={id:'pA',pair:'BTC/USDT',side:'long',entryPrice:100,stakeUsdt:30,totalExposure:30,auto:false,openedAt:1,entryTs:1};
const B={id:'pB',pair:'ETH/USDT',side:'short',entryPrice:10,stakeUsdt:50,totalExposure:50,auto:true,openedAt:1,entryTs:1,_thH:4};
const S={tradingMode:'paperReal',botAutoMode:!manu,cashAccount:100,tradingAccount:820,openPositions:[A,B],pnlHistory:[1000],chainLog:[],totalTrades:0,winTrades:0,leverage:0,leverageBorrowed:0,
 pairStates:{'BTC/USDT':{price:99,trades:[],totalPnlPct:0,totalPnlUsd:0,totalTrades:0,winTrades:0},'ETH/USDT':{price:10.1,trades:[],totalPnlPct:0,totalPnlUsd:0,totalTrades:0,winTrades:0}},
 paperRealStats:{},agents:[],profitSplitCaissePct:0,cashLog:[]};
const PAIRS={'BTC/USDT':{dec:0},'ETH/USDT':{dec:0}}; const fees=[];
const c={S,PAIRS,Math,Number,Object,Array,String,JSON,Date,isFinite,console:{log:()=>{},warn:()=>{},error:()=>{}},showToast:()=>{},rndHash:()=>'h',nowStr:()=>'x',repayLeverage:()=>{},syncLeverageReserve:()=>{},
 recordFees:(p)=>{fees.push(p.id);return{totalFee:0.13,taxAmount:0,pnlNet:0}},recordTradeForHeatmap:()=>{},learnFromOutcome:()=>{},emitVictoryParticles:()=>{},emitLossParticles:()=>{},showMilestone:()=>{},
 checkPnlAlerts:()=>{},checkBadges:()=>{},_updateCloseAllBadge:()=>{},updatePairBtnStates:()=>{},renderPositions:()=>{},renderChain:()=>{}};
c.window=c; c.window._stateReady=true; vm.createContext(c);
c.addEventListener=()=>{}; c.document={addEventListener:()=>{}};
vm.runInContext([fnSrc(s02,'_computePortfolio'),fnSrc(s02,'_computePortfolioSans'),fnSrc(s02,'_walletKey'),fnSrc(s02,'closePosition'),fnSrc(s09b2,'_closeTradesOnExit'),'var S=this.S;'].join('\n'),c);
vm.runInContext("_closeTradesOnExit('freeze')",c);
console.log((manu?'MANU':'AUTO')+' · freeze → restent ouvertes:',JSON.stringify(S.openPositions.map(p=>p.id+(p.auto?'(auto)':'(manu)'))),'· fermées passées par recordFees:',JSON.stringify(fees),'· trading',S.tradingAccount.toFixed(2));
}
