// Sonde vm : importBackupMaxPermissive (04) réel, AURA_PROTECTED_FIELDS réel, accesseurs walletStore réels (02)
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
const s02=rd('js/02-state-init.js'), s04=rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js');
const seen={confirm:'',saved:0};
const c={Math,Number,Object,Array,String,JSON,Date,isFinite,console:{log:()=>{},warn:()=>{},error:()=>{}},
  confirm:(m)=>{seen.confirm=m;return true;}, alert:()=>{}, showToast:()=>{}, renderSettingsPanel:()=>{},
  saveState:()=>{seen.saved++;}, _buildFullBackup:()=>({}), _saveBackupToDB:async()=>{}, makePairState:()=>({trades:[]}), PAIRS:{} };
c.window=c; vm.createContext(c);
vm.runInContext(['const S={tradingMode:"paperReal",botAutoMode:false,cycle:1365892,agents:[{id:"a1",fitness:812}],walletStore:null,chainLog:[]};',
  fnSrc(s02,'_freshWallet'),fnSrc(s02,'_freshWalletStore'),fnSrc(s02,'_walletKey'),fnSrc(s02,'_walletFor'),fnSrc(s02,'_activeWallet'),
  s02.match(/var _WALLET_ACCESSOR_FIELDS = \[[\s\S]*?\];/)[0], fnSrc(s02,'_installWalletAccessors'), '_installWalletAccessors();',
  s04.match(/const AURA_PROTECTED_FIELDS = \[[\s\S]*?\];/)[0], fnSrc(s04,'_validateBackupCoherence'), fnSrc(s04,'_countBackupChanges'), fnSrc(s04,'importBackupMaxPermissive'),
  'globalThis.__S=S;'].join('\n'),c);
// état vivant : vrai compte EV du backup 20:29 (chiffres réels), 354 trades
vm.runInContext(`_walletFor('paperReal').tradingAccount=1075.70; _walletFor('paperReal').cashAccount=6.58; _walletFor('paperReal').totalTrades=354;
  _walletFor('paperReal').pairStates={'BTC/USDT':{trades:new Array(40).fill({p:1}),totalTrades:40}};`,c);
// fichier : un export ancien (exportBackup 03 → {meta:{app:'AURA'},state:JSON(S)}) avec un EV à 500 $ / 3 trades, bot en AUTO
const old={walletStore:{sim:{tradingAccount:1},paperReal:{tradingAccount:500,cashAccount:0,totalTrades:3,pairStates:{'BTC/USDT':{trades:[{p:9}],totalTrades:1}},openPositions:[]},real:{tradingAccount:2}},
  tradingMode:'paperReal',botAutoMode:true,agents:[{id:'a1',fitness:100}],cycle:900000,tradingAccount:500,portfolio:500};
const file={text:async()=>JSON.stringify({meta:{app:'AURA',date:Date.now(),label:'vieux'},state:old})};
(async()=>{
  await vm.runInContext('importBackupMaxPermissive',c)(file);
  const r=vm.runInContext(`({ EV_trading:S.tradingAccount, EV_trades:S.totalTrades, BTC_trades:_walletFor('paperReal').pairStates['BTC/USDT'].trades.length, botAutoMode:S.botAutoMode, agentFitness:S.agents[0].fitness, cycle:S.cycle })`,c);
  console.log('APRÈS IMPORT MAX :',JSON.stringify(r),'| saveState appelé',seen.saved,'fois');
  console.log('CONFIRM dit :',JSON.stringify(seen.confirm.split('\n').filter(l=>/protég|HISTORIQUE|Champs/.test(l))));
})();
