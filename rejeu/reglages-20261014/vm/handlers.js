// Pour chaque fonction de rendu de l'onglet outils (et ses sous-fonctions qui fabriquent du HTML), liste les identifiants appelés
// dans les attributs on*="…" et vérifie qu'ils sont définis (function NOM / window.NOM = / const|let NOM) dans les js chargés + HTML.
const fs=require('fs');const fnSrc=require('/home/claude/aura/rejeu/audit-20261013/fnsrc.js');
const root='/home/claude/aura/';const html=fs.readFileSync(root+'AURA8_v118.html','utf8');
const files=[...html.matchAll(/src="(js\/[^"?]+)/g)].map(m=>m[1]);
const all=files.map(f=>[f,fs.readFileSync(root+f,'utf8')]);
const allSrc=all.map(x=>x[1]).join('\n')+'\n'+html;
const targets={'04':['initWhatIfSection','initBacktestSection','initReplaySection'],'06':['renderUrgenceSection','renderStressTestSection','renderAdnSection','renderCalcSection','renderPaperUltraSection','renderDiffSection','renderVaultSection','renderAutoBackupSection'],'05':['renderPdfReportSection','renderXlExportSection','renderHebdoSection']};
const fileOf={'04':'js/04-v8-0-livraison-35-mode-max-permissif-v.js','05':'js/05-v37-19-indicateur-de-fatigue-bot.js','06':'js/06-v63-patterns-chartistes.js'};
const kw=new Set(['if','this','document','parseInt','parseFloat','event','return','var','let','const','Math','true','false','null','typeof','new']);
for(const [k,names] of Object.entries(targets)){const src=fs.readFileSync(root+fileOf[k],'utf8');
 for(const n of names){const body=fnSrc(src,n);const ids=new Set();
  for(const m of body.matchAll(/on(?:click|change|input|keydown)="([^"]*)"/g)){ for(const c of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*(?:\?\.)?\(/g)) ids.add(c[1]); for(const c of m[1].matchAll(/(^|[;\s])([A-Za-z_$][\w$]*)\s*(?:\.|=(?!=))/g)) ids.add(c[2]); }
  const res=[...ids].filter(i=>!kw.has(i)).map(i=>{const def=new RegExp('(function\\s+'+i.replace('$','\\$')+'\\s*\\()|(window\\.'+i+'\\s*=)|((const|let|var)\\s+'+i+'\\b)').test(allSrc);return i+(def?'':' **NON DÉFINI**');});
  const gid=[...new Set([...body.matchAll(/getElementById\('([^'$]+)'\)/g)].map(m=>m[1]))];
  console.log(n+': handlers → '+res.join(', ')+(gid.length?' | getElementById → '+gid.join(', '):''));
 }}
