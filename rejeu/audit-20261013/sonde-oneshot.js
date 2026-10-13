// Sonde vm : les 3 migrations « une fois » DANS loadState (09b2:683-762), vrai texte, appliquées au vrai backup du 13/10 20:29
// comme le ferait recoverFromFiles / importState sur un stockage neuf (drapeaux localStorage absents).
'use strict';
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/home/claude/aura/js/09b2-save-load.js','utf8').split('\n');
const s02=fs.readFileSync('/home/claude/aura/js/02-state-init.js','utf8');
const a=src.findIndex(l=>l.includes('★ ASSAINISSEMENT ONE-SHOT')), b=src.findIndex((l,i)=>i>a&&l.includes("dbg.push('walletsep-reset:err')"));
const block=src.slice(a,b+1).join('\n');
const m=/function _computePortfolio\(w\)[\s\S]*?\n}\n/.exec(s02);
const aura=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).aura;
const ls={}; const c={JSON,Math,Number,Object,Array,String,Date,isFinite,console,
  localStorage:{getItem:k=>ls[k]??null,setItem:(k,v)=>{ls[k]=String(v);}}, window:{AuraChrono:{resetAll:()=>{c.chronoReset=true;}}}};
vm.createContext(c);
const before={}; ['sim','paperReal','real'].forEach(k=>{const w=aura.walletStore[k];before[k]={trading:+w.tradingAccount.toFixed(2),pf:+w.portfolio.toFixed(2),compounded:+w._totalCompounded.toFixed(2),pnlHistory:w.pnlHistory.length};});
c.S={walletStore:aura.walletStore,pnlHistory:aura.walletStore.paperReal.pnlHistory,pnl24h:0,pnlPeriod:aura.walletStore.paperReal.pnlPeriod};
vm.runInContext((m?m[0]:'')+'\nconst dbg=[];\n'+block+'\nglobalThis.__dbg=dbg;',c);
const after={}; ['sim','paperReal','real'].forEach(k=>{const w=aura.walletStore[k];after[k]={trading:+w.tradingAccount.toFixed(2),pf:+w.portfolio.toFixed(2),compounded:+(w._totalCompounded||0).toFixed(2),pnlHistory:w.pnlHistory.length};});
console.log('drapeaux posés :',Object.keys(ls).join(', '),'| chronos remis à 0 :',!!c.chronoReset,'| dbg',c.__dbg.join(' '));
console.log('AVANT',JSON.stringify(before)); console.log('APRÈS',JSON.stringify(after));
