// Exécute le VRAI _vaultEncrypt / _vaultGetSalt / _vaultDeriveKey (06) sur l'état du backup réel du 14/10 18:45
const fs=require('fs'),vm=require('vm');const fnSrc=require('/home/claude/aura/rejeu/audit-20261013/fnsrc.js');
const s06=fs.readFileSync('/home/claude/aura/js/06-v63-patterns-chartistes.js','utf8');
const a=JSON.parse(fs.readFileSync('/home/claude/aura/rejeu/backups/pont/aura_guardian_full_20261014-184539.json','utf8')).aura;
const store={};const localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}};
const c={crypto:globalThis.crypto,TextEncoder,TextDecoder,btoa,atob,Uint8Array,localStorage,console,_VAULT_SALT_KEY:'aura_vault_salt_v89'};
vm.createContext(c);
['_vaultDeriveKey','_vaultGetSalt','_vaultEncrypt','_vaultDecrypt'].forEach(n=>vm.runInContext(fnSrc(s06,n),c));
(async()=>{
  for (const [lbl,json] of [['petit (1 Ko)',JSON.stringify({cycle:1,x:'a'.repeat(1000)})],['snapshot réel 14/10 (buildSnapshot, '+Math.round(JSON.stringify(a).length/1024)+' Ko)',JSON.stringify(a)]]) {
    c.__j=json;
    try { const r=await vm.runInContext('_vaultEncrypt(__j,"motdepasse")',c); console.log(lbl,'→ chiffré OK,',Math.round(r.length/1024),'Ko base64'); }
    catch(e){ console.log(lbl,'→',e.name+': '+e.message); }
  }
})();
