// Sonde vm : _closeTradesOnExit (09b2) + closePosition (02) réels, accesseurs réels de walletStore (02)
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT='/home/claude/aura', rd=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
function fnSrc(src,name){const re=new RegExp('(^|\\n)(async )?function '+name+'\\s*\\(');const m=re.exec(src);if(!m)throw new Error('absent '+name);const start=m.index+m[1].length,st=[];
 for(let i=src.indexOf('{',src.indexOf(')',start));i<src.length;i++){const c=src[i],n2=src[i+1],top=st[st.length-1];
  if(top==='t'){if(c==='\\'){i++;continue;}if(c==='`'){st.pop();continue;}if(c==='$'&&n2==='{'){st.push('x');i++;}continue;}
  if(c==='/'&&n2==='/'){i=src.indexOf('\n',i);continue;} if(c==='/'&&n2==='*'){i=src.indexOf('*/',i)+1;continue;}
  if(c==='"'||c==="'"){i++;while(i<src.length&&src[i]!==c){if(src[i]==='\\')i++;i++;}continue;}
  if(c==='`'){st.push('t');continue;} if(c==='{'){st.push('b');continue;} if(c==='}'){st.pop();if(!st.length)return src.slice(start,i+1);} }
 throw new Error('fin '+name);}
const s02=rd('js/02-state-init.js'), s09=rd('js/09b2-save-load.js');
function run(screenMode, botAuto){
  const seen={learn:[],dc:[],bot:[],fees:[],antiRev:[],attrib:[],fleet:[],disc:[]};
  const c={Math,Number,Object,Array,String,JSON,Date,isFinite,console:{log:()=>{},warn:()=>{},error:()=>{}},
    showToast:()=>{},rndHash:()=>'h',nowStr:()=>'t',repayLeverage:()=>{},syncLeverageReserve:()=>{},
    recordFees:(pair,stake,usd)=>{seen.fees.push([pair,usd]);return {totalFee:0.05,taxAmount:0};},
    recordTradeForHeatmap:()=>{}, learnFromOutcome:(src,pct,pair)=>seen.learn.push([pair,+pct.toFixed(2)]),
    _dcJudgeComposite:(comp,pct)=>seen.dc.push(pct), _botJudgeMeasured:(b,pct)=>seen.bot.push([b,pct]),
    checkAntiRevenge:(usd)=>seen.antiRev.push(usd), _attributionRecord:(p)=>seen.attrib.push(p.pair),
    runBotFleet:(k)=>seen.fleet.push(k), _computePortfolioSans:()=>0, _updateCloseAllBadge:()=>{}, closeDecisionCascade:()=>{},
    makePairState:()=>({trades:[],totalPnlPct:0,totalPnlUsd:0,totalTrades:0,winTrades:0}), PAIRS:{'BTC/USDT':{dec:0},'ETH/USDT':{dec:0},'SOL/USDT':{dec:0}} };
  c.window=c; c.window._judgeDisciples=(p)=>seen.disc.push(p.pair); c.window._stateReady=true;
  vm.createContext(c);
  // l'état S est un const de portée script comme dans l'app, avec les VRAIS accesseurs walletStore
  const code=[ 'const S={tradingMode:'+JSON.stringify(screenMode)+',botAutoMode:'+botAuto+',chainLog:[],paperRealStats:{},walletStore:null};',
    fnSrc(s02,'_freshWallet'),fnSrc(s02,'_freshWalletStore'),fnSrc(s02,'_walletKey'),fnSrc(s02,'_walletFor'),fnSrc(s02,'_activeWallet'),
    s02.match(/var _WALLET_ACCESSOR_FIELDS = \[[\s\S]*?\];/)[0], fnSrc(s02,'_installWalletAccessors'),
    '_installWalletAccessors();', fnSrc(s02,'closePosition'), fnSrc(s09,'_closeTradesOnExit') ].join('\n');
  vm.runInContext(code,c);
  vm.runInContext(`
    const mk=(id,pair,auto,px)=>({id,pair,side:'long',entryPrice:100,stakeUsdt:20,totalExposure:20,auto,openedAt:1,entryTs:1,_bot:auto?'scalper':undefined,_votes:{a:1},_comp:{}});
    ['sim','paperReal','real'].forEach(m=>{ const w=_walletFor(m); w.tradingAccount=500; w.cashAccount=0;
      w.pairStates={'BTC/USDT':{price:97,trades:[],totalPnlPct:0,totalPnlUsd:0,totalTrades:0,winTrades:0},'ETH/USDT':{price:99,trades:[],totalPnlPct:0,totalPnlUsd:0,totalTrades:0,winTrades:0},'SOL/USDT':{price:101,trades:[],totalPnlPct:0,totalPnlUsd:0,totalTrades:0,winTrades:0}};
      w.openPositions=[mk(m+'-bot1','BTC/USDT',true),mk(m+'-bot2','SOL/USDT',true),mk(m+'-man','ETH/USDT',false)]; });
  `,c);
  vm.runInContext("_closeTradesOnExit('freeze')",c);
  const out=vm.runInContext("({ open:{sim:_walletFor('sim').openPositions.map(p=>p.id),paperReal:_walletFor('paperReal').openPositions.map(p=>p.id),real:_walletFor('real').openPositions.map(p=>p.id)}, trades:{sim:_walletFor('sim').pairStates['BTC/USDT'].trades.length,paperReal:_walletFor('paperReal').pairStates['BTC/USDT'].trades.length}, prStats:JSON.stringify(S.paperRealStats), consec:S.paperRealConsecLosses })",c);
  return {screenMode,botAuto,out,seen};
}
for (const [m,a] of [['paperReal',true],['paperReal',false],['sim',true],['real',false]]) console.log(JSON.stringify(run(m,a)));
