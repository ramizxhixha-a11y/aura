// VRAI runBacktest (04) sur 500 bougies SYNTHÉTIQUES (marche aléatoire, vol 0,3 %/bougie ≈ BTC 15 min), 20 graines : effet du « Seuil signal »
const fs=require('fs'),vm=require('vm');const fnSrc=require('/home/claude/aura/rejeu/audit-20261013/fnsrc.js');
const s04=fs.readFileSync('/home/claude/aura/js/04-v8-0-livraison-35-mode-max-permissif-v.js','utf8');
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
(async()=>{const tot={};
for(let seed=1;seed<=20;seed++){const r=rng(seed);let p=60000;const k=[];for(let i=0;i<500;i++){const o=p;const z=(r()+r()+r()+r()-2)*1.7;p=o*(1+0.003*z);k.push([i*9e5,o,Math.max(o,p)*1.001,Math.min(o,p)*0.999,p,1]);}
 for(const th of [51,55,60,70]){const els={btRunBtn:{},btResults:{style:{},innerHTML:''},btPair:{value:'BTC/USDT'},btTf:{value:'15m'},btThresh:{value:String(th)},btStake:{value:'50'}};
  const c={document:{getElementById:id=>els[id]||null},fetch:async()=>({ok:true,json:async()=>k}),AbortSignal:{timeout:()=>null},Math,console,parseFloat,parseInt};vm.createContext(c);vm.runInContext(fnSrc(s04,'runBacktest'),c);
  await vm.runInContext('runBacktest()',c);const m=els.btResults.innerHTML.match(/>(\d+)<\/span><span class="bt-metric-lbl">Trades/);tot[th]=(tot[th]||0)+(m?+m[1]:0);}}
console.log('Trades cumulés sur 20 séries de 500 bougies :',Object.entries(tot).map(([t,n])=>t+' % → '+n).join(' · '));})();
