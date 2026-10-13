// Preuve vm : VRAI closePosition (02) — position à levier ×10 (mise 30, exposition 300), prix −15 %
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync('/home/claude/aura/js/02-state-init.js','utf8');
const fnSrc=require('./fnsrc.js');
const A={id:'pA',pair:'BTC/USDT',side:'long',entryPrice:100,stakeUsdt:30,totalExposure:300,levBorrowed:270,auto:false,openedAt:1,entryTs:1};
const S={tradingMode:'paperReal',cashAccount:0,tradingAccount:970,openPositions:[A],pnlHistory:[1000],chainLog:[],totalTrades:0,winTrades:0,leverage:0,leverageBorrowed:270,
 pairStates:{'BTC/USDT':{price:85,trades:[],totalPnlPct:0,totalPnlUsd:0,totalTrades:0,winTrades:0}},paperRealStats:{},agents:[],profitSplitCaissePct:0,cashLog:[]};
const c={S,PAIRS:{'BTC/USDT':{dec:2}},Math,Number,Object,Array,String,JSON,Date,isFinite,console:{log:()=>{},warn:()=>{},error:()=>{}},showToast:()=>{},rndHash:()=>'h',nowStr:()=>'x',
 repayLeverage:(x)=>{S.leverageBorrowed-=x},syncLeverageReserve:()=>{},recordFees:()=>({totalFee:0,taxAmount:0,pnlNet:0}),recordTradeForHeatmap:()=>{},learnFromOutcome:()=>{},
 emitVictoryParticles:()=>{},emitLossParticles:()=>{},showMilestone:()=>{},checkPnlAlerts:()=>{},checkBadges:()=>{},_updateCloseAllBadge:()=>{},updatePairBtnStates:()=>{},renderPositions:()=>{},renderChain:()=>{}};
c.window=c; vm.createContext(c);
vm.runInContext([fnSrc(src,'_computePortfolio'),fnSrc(src,'_computePortfolioSans'),fnSrc(src,'_walletKey'),fnSrc(src,'closePosition'),'var S=this.S;'].join('\n'),c);
const t0=S.tradingAccount; vm.runInContext("closePosition('pA')",c);
const tr=S.pairStates['BTC/USDT'].trades[S.pairStates['BTC/USDT'].trades.length-1]||{};
console.log('levier ×10, −15 % : compte trading',t0,'→',S.tradingAccount,'· perte nette réelle',(t0+30-S.tradingAccount).toFixed(2),'$ pour une mise de 30 $ · ligne d\'historique pnlUsdt',tr.pnlUsdt);
