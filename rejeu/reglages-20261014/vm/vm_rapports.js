// VRAIS _buildReportHTML + renderPdfReportSection (05), buildExcelData (05), computeAdvancedMetrics (03) sur le portefeuille EV du backup réel 14/10 18:45
const fs=require('fs'),vm=require('vm');const fnSrc=require('/home/claude/aura/rejeu/audit-20261013/fnsrc.js');
const s05=fs.readFileSync('/home/claude/aura/js/05-v37-19-indicateur-de-fatigue-bot.js','utf8');
const s03=fs.readFileSync('/home/claude/aura/js/03-per-pair-position-buttons-controls-buid.js','utf8');
const a=JSON.parse(fs.readFileSync('/home/claude/aura/rejeu/backups/pont/aura_guardian_full_20261014-184539.json','utf8')).aura;
const w=a.walletStore.paperReal;
const S={tradingMode:'real',pairStates:w.pairStates,fees:w.fees,portfolio:w.portfolio,tradingAccount:w.tradingAccount,cashAccount:w.cashAccount,agents:a.agents.slice(),dreamJournal:w.dreamJournal||[],totalTrades:w.totalTrades};
const el={innerHTML:''};
const c={S,Math,Object,Date,console,Number,String,isFinite,parseFloat,document:{getElementById:id=>id==='pdfReportSection'?el:null},detectMarketRegime:()=>'calm'};vm.createContext(c);
vm.runInContext(fnSrc(s03,'computeAdvancedMetrics'),c);['_buildReportHTML','renderPdfReportSection','_xlCell','buildExcelData'].forEach(n=>vm.runInContext(fnSrc(s05,n),c));
{const i=s05.indexOf('function _csvSheet(');const j=s05.indexOf('\n}\n',i)+2;vm.runInContext(s05.slice(i,j),c);}  // fnsrc.js se perd sur la regex /"/g de _csvSheet : extraction jusqu'à la 1re accolade en colonne 0
const h=vm.runInContext('_buildReportHTML()',c);const txt=h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const grab=(re)=>{const m=txt.match(re);return m?m[0]:'(absent)';};
console.log('PDF · S.tradingMode = real →',grab(/Mode : [^·]+/));
console.log('PDF ·',grab(/Période : \S+ \S+/),'· données : historique entier tronqué');
console.log('PDF · « P&L Net Total » =',grab(/[+-]?\$-?[\d.]+ P&L Net Total/),'· S.fees.totalPnlNet =',w.fees.totalPnlNet.toFixed(2),'· totalPnlGross =',w.fees.totalPnlGross.toFixed(2));
console.log('PDF ·',grab(/Win Rate \(\d+ trades\)/),'· ps.totalTrades cumulés =',Object.values(w.pairStates).reduce((s,p)=>s+(p.totalTrades||0),0));
const top=h.match(/Top 5 Agents[\s\S]*?<\/table>/)[0].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');console.log('PDF · Top 5 Agents :',top.slice(0,260));
const order0=a.agents.map(x=>x.id).join(',');vm.runInContext('renderPdfReportSection()',c);const order1=S.agents.map(x=>x.id).join(',');
console.log('Aperçu PDF · ordre de S.agents modifié par le rendu :',order0!==order1,'· 1er avant',a.agents[0].id,'→ après',S.agents[0].id);
const x=vm.runInContext('buildExcelData()',c);const tr=x.sheetTrades.split('\n');console.log('Excel · Trades : '+(tr.length-1)+' lignes · colonne Paire des 3 premières :',tr.slice(1,4).map(l=>l.split(',')[2]).join(' | '));
const ag=x.sheetAgents.split('\n');console.log('Excel · Agents (Trades,WR%) des 3 premiers :',ag.slice(1,4).map(l=>{const f=l.split(',');return f[2]+':'+f[7]+'/'+f[8];}).join(' | '));
const fr=x.sheetFrais.split('\n');console.log('Excel · Frais : funding par paire non nul :',fr.slice(1).filter(l=>+l.split(',')[3]>0).length,'/',fr.length-1,'· S.fees.totalFunding =',(w.fees.totalFunding||0).toFixed(2));
console.log('Excel · Résumé : lignes =',x.sheetResume.split('\n').length-1,'(écran : « 26 lignes »)');
