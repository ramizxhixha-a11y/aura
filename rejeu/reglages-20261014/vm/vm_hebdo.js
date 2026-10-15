const fs=require('fs'),vm=require('vm');const fnSrc=require('/home/claude/aura/rejeu/audit-20261013/fnsrc.js');
const s05=fs.readFileSync('/home/claude/aura/js/05-v37-19-indicateur-de-fatigue-bot.js','utf8');
const a=JSON.parse(fs.readFileSync('/home/claude/aura/rejeu/backups/pont/aura_guardian_full_20261014-184539.json','utf8')).aura;
const w=a.walletStore.paperReal;const ts=Object.values(w.pairStates).flatMap(p=>(p.trades||[]).filter(t=>t.type==='position').map(t=>t.ts));
console.log('date système',new Date().toISOString(),'· trades EV du',new Date(Math.min(...ts)).toISOString(),'au',new Date(Math.max(...ts)).toISOString());
const S={pairStates:w.pairStates};const c={S,Math,Date,Object,Array,console};vm.createContext(c);
['_getWeekTrades','_analyzeWeek'].forEach(n=>vm.runInContext(fnSrc(s05,n),c));
for(let off=0;off<=6;off++){const r=vm.runInContext('(()=>{const x=_getWeekTrades('+off+');return _analyzeWeek(x.trades,x.monday,x.sunday);})()',c);
 if(r.n) {console.log('offset',off,'· trades',r.n,'· clés byPair :',Object.keys(r.byPair).join(','),'· frais',r.fees,'· insights :',r.insights.join(' / ')); break;}}
