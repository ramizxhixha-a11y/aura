const fs=require('fs'),vm=require('vm');const s=fs.readFileSync('/home/claude/aura/js/09g-modals.js','utf8');
const i=s.indexOf('function openSnapshotsModal'); const j=s.indexOf('window.openSnapshotsModal', i);
const c={document:{getElementById:()=>null,createElement:()=>({style:{}}),body:{appendChild:()=>{}}},window:{}};vm.createContext(c);
vm.runInContext(s.slice(i,j),c); try{vm.runInContext('openSnapshotsModal()',c);console.log('ouvert sans erreur');}catch(e){console.log('openSnapshotsModal →',e.name+': '+e.message);}
