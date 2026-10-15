// VRAI runBacktest (04) avec un fetch remplacé par les bougies réelles du backup 14/10 (realCandles), DOM factice : effet du « Seuil signal »
const fs=require('fs'),vm=require('vm');const fnSrc=require('/home/claude/aura/rejeu/audit-20261013/fnsrc.js');
const s04=fs.readFileSync('/home/claude/aura/js/04-v8-0-livraison-35-mode-max-permissif-v.js','utf8');
const a=JSON.parse(fs.readFileSync('/home/claude/aura/rejeu/backups/pont/aura_guardian_full_20261014-184539.json','utf8')).aura;
for (const [pair,tf] of [['BTC/USDT','15m'],['ETH/USDT','1h'],['SOL/USDT','15m']]) {
  const cs=(a.realCandles[pair]||{})[tf]||[]; if(cs.length<30){console.log(pair,tf,'pas assez de bougies',cs.length);continue;}
  const k=cs.slice(-500).map(c=>[c.t||c.ts||0,c.o,c.h,c.l,c.c,c.v||0]);
  const out=[];
  for (const th of [51,55,60,70,90]) {
    const els={btRunBtn:{disabled:false,textContent:''},btResults:{style:{},innerHTML:''},btPair:{value:pair},btTf:{value:tf},btThresh:{value:String(th)},btStake:{value:'50'}};
    const c={document:{getElementById:id=>els[id]||null},fetch:async()=>({ok:true,json:async()=>k}),AbortSignal:{timeout:()=>null},Math,console,parseFloat,parseInt};
    vm.createContext(c);vm.runInContext(fnSrc(s04,'runBacktest'),c);
    // eslint-disable-next-line no-await-in-loop
    out.push(vm.runInContext('runBacktest()',c).then(()=>{const h=els.btResults.innerHTML;const m=h.match(/<span class="bt-metric-val"[^>]*>(\d+)<\/span><span class="bt-metric-lbl">Trades/);return th+'% → '+(m?m[1]+' trades':(/Aucun signal/.test(h)?'aucun signal':h.slice(0,80)));}));
  }
  Promise.all(out).then(r=>console.log(pair,tf,'('+k.length+' bougies) :',r.join(' · ')));
}
