// ▓▓▓ VERSION 20260816o ▓▓▓
// 13-veille-ecran.js — Veille ∞ (design validé par Rams le 16/08/2026, démo v5)
// Après 10 min sans toucher : voile noir animé DANS la même WebView (le renderer reste
// en rendu actif → anti-throttling), wake lock écran, AURA tourne à pleine vitesse
// dessous. Un tap = retour instantané. Heure + P&L du jour dérivent dans un coin.
(function(){
var IDLE=600000, cv=null, ctx=null, run=false, raf=0, wl=null, last=Date.now();
var STAR=['#eaf6ff','#ffd9a0','#ff9d6f','#9fd8ff','#00e87a','#19e3ff'];
var N=31,pts=[],pulses=[],dt=0;
var BG=260,bg=[];for(var b0=0;b0<BG;b0++)bg.push({x:Math.random()*2-1,y:Math.random()*2-1,z:.05+Math.random()*.95});
for(var i=0;i<N;i++)pts.push({t:i/N*6.283,s:.002+.002*Math.random(),col:STAR[(Math.random()*STAR.length)|0],ph:Math.random()*6.283,r:14+26*Math.random(),w:Math.random()*6.283,ws:.003+.004*Math.random(),sz:3.5+3*Math.random()});
function lem3(t,a){var s=Math.sin(t),co=Math.cos(t),d=1+s*s;return[a*co/d,a*s*co/d,a*.22*Math.sin(2*t)];}
function rot3(v,ax,ay,az){var X=v[0],Y=v[1],Z=v[2],t;
 t=Y;Y=t*Math.cos(ax)-Z*Math.sin(ax);Z=t*Math.sin(ax)+Z*Math.cos(ax);
 t=X;X=t*Math.cos(ay)+Z*Math.sin(ay);Z=-t*Math.sin(ay)+Z*Math.cos(ay);
 t=X;X=t*Math.cos(az)-Y*Math.sin(az);Y=t*Math.sin(az)+Y*Math.cos(az);return[X,Y,Z];}
function star(px,py,R,col,tw){ctx.save();ctx.translate(px,py);ctx.globalAlpha=tw;
 ctx.strokeStyle=col;ctx.shadowColor=col;ctx.shadowBlur=18;ctx.lineWidth=1.6;
 ctx.beginPath();ctx.moveTo(-R*2.2,0);ctx.lineTo(R*2.2,0);ctx.moveTo(0,-R*2.2);ctx.lineTo(0,R*2.2);ctx.stroke();
 ctx.lineWidth=1;ctx.globalAlpha=tw*.5;
 ctx.beginPath();ctx.moveTo(-R*1.1,-R*1.1);ctx.lineTo(R*1.1,R*1.1);ctx.moveTo(R*1.1,-R*1.1);ctx.lineTo(-R*1.1,R*1.1);ctx.stroke();
 ctx.globalAlpha=tw;ctx.fillStyle='#fff';ctx.shadowBlur=22;ctx.beginPath();ctx.arc(0,0,R*.55,0,6.283);ctx.fill();
 ctx.fillStyle=col;ctx.globalAlpha=tw*.85;ctx.beginPath();ctx.arc(0,0,R*.95,0,6.283);ctx.fill();
 ctx.restore();ctx.shadowBlur=0;ctx.globalAlpha=1;}
function draw(){if(!run)return;
 var W=cv.width=innerWidth,H=cv.height=innerHeight;dt+=.0016;
 var A=Math.min(W,H)*.22,F=A*2.6,Mx=A*.5,My=A*.5;
 var wx=(Math.sin(dt*.19)+Math.sin(dt*.083+1.7))*.25+.5,
     wy=(Math.sin(dt*.23+.6)+Math.sin(dt*.101+3.1))*.25+.5;
 var cx=Mx+(W-2*Mx)*wx, cy=My+(H-2*My)*wy;
 function P(v){var r=rot3(v,dt*.9,dt*.6,dt*.35),k=F/(F+r[2]);return[cx+r[0]*k,cy+r[1]*k,k];}
 ctx.fillStyle='#02040a';ctx.fillRect(0,0,W,H);
 bg.forEach(function(st){var zp=st.z;st.z-=.0035;
  if(st.z<=.03){st.x=Math.random()*2-1;st.y=Math.random()*2-1;st.z=1;return;}
  var k=W*.5,px=W/2+st.x/st.z*k,py=H/2+st.y/st.z*k,qx=W/2+st.x/zp*k,qy=H/2+st.y/zp*k,br=1-st.z;
  if(px<0||px>W||py<0||py>H)return;
  ctx.strokeStyle='rgba(228,240,255,'+Math.min(1,br*1.15)+')';ctx.lineWidth=Math.max(.6,br*2.8);
  ctx.beginPath();ctx.moveTo(qx,qy);ctx.lineTo(px,py);ctx.stroke();});
 ctx.save();ctx.translate(cx,cy);ctx.textAlign='center';
 ctx.globalAlpha=.15+.04*Math.sin(dt*3);ctx.fillStyle='#9aa4b4';
 ctx.font='700 '+(A*.30)+'px monospace';ctx.fillText('AURA',0,A*.05);ctx.restore();
 pts.forEach(function(p){p.t+=p.s;p.w+=p.ws;var q=P(lem3(p.t,A));
  p.x=q[0]+Math.cos(p.w)*p.r;p.y=q[1]+Math.sin(p.w*1.4)*p.r;p.k=q[2];});
 var links=[];ctx.lineWidth=1;
 for(var i2=0;i2<N;i2++)for(var j=i2+1;j<N;j++){var a2=pts[i2],b=pts[j];
  if(Math.hypot(a2.x-b.x,a2.y-b.y)<A*.24){links.push([a2,b]);
   ctx.strokeStyle='rgba(150,200,230,.08)';ctx.beginPath();ctx.moveTo(a2.x,a2.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
 if(Math.random()<.25&&links.length){var L=links[(Math.random()*links.length)|0];
  pulses.push({a:L[0],b:L[1],p:0,v:.02+.03*Math.random()});}
 pulses=pulses.filter(function(u){return u.p<=1;});
 pulses.forEach(function(u){u.p+=u.v;var px=u.a.x+(u.b.x-u.a.x)*u.p,py=u.a.y+(u.b.y-u.a.y)*u.p;
  ctx.beginPath();ctx.arc(px,py,2.4,0,6.283);ctx.fillStyle='#eaffff';
  ctx.shadowColor='#bfefff';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;});
 pts.forEach(function(p){var tw=.6+.4*Math.sin(dt*26+p.ph);star(p.x,p.y,p.sz*p.k,p.col,tw*Math.min(1,p.k));});
 // heure + P&L du jour, dérivants
 try{var S0=(0,eval)('S');var pnl=S0&&S0._startPortfolio?((S0.portfolio-S0._startPortfolio)):null;
  ctx.globalAlpha=.4;ctx.fillStyle='#8a94a6';ctx.font='600 13px monospace';ctx.textAlign='left';
  var hx=40+Math.sin(dt*.4)*30,hy=40+Math.cos(dt*.3)*20;
  ctx.fillText(new Date().toLocaleTimeString().slice(0,5)+(pnl!=null?('  \u00b7  P&L '+(pnl>=0?'+':'')+pnl.toFixed(2)+'$'):''),hx,hy);
  ctx.globalAlpha=1;}catch(e){}
 raf=requestAnimationFrame(draw);}
function enter(){if(run)return;run=true;
 if(!cv){cv=document.createElement('canvas');cv.id='veilleAura';
  cv.style.cssText='position:fixed;inset:0;z-index:99998;background:#02040a;';
  cv.addEventListener('touchstart',exit,{passive:true});cv.addEventListener('click',exit);
  document.body.appendChild(cv);ctx=cv.getContext('2d');}
 cv.style.display='block';
 try{navigator.wakeLock&&navigator.wakeLock.request('screen').then(function(l){wl=l;});}catch(e){}
 draw();}
function exit(){run=false;cancelAnimationFrame(raf);
 if(cv)cv.style.display='none';try{wl&&wl.release();wl=null;}catch(e){}last=Date.now();}
['touchstart','click','scroll','keydown'].forEach(function(ev){
 document.addEventListener(ev,function(){last=Date.now();},{passive:true});});
setInterval(function(){if(!run&&Date.now()-last>IDLE&&!document.hidden)enter();},15000);
window._veilleNow=enter;
// [INTÉGRATION · 16/08, idée Rams] l'icône wake lock du header (☾/☀) devient le bouton
// de la veille : APPUI LONG (600 ms) = veille immédiate. Le tap court garde son rôle
// d'origine (toggle wake lock) — aucun comportement existant modifié.
(function(){var t=0,iv=setInterval(function(){t++;
 var b=document.getElementById('wakeLockBtn');
 if(!b){if(t>240)clearInterval(iv);return;}
 clearInterval(iv);var press=0;
 b.addEventListener('touchstart',function(){press=Date.now();},{passive:true});
 b.addEventListener('touchend',function(e){
   if(press&&Date.now()-press>600){e.preventDefault();enter();}press=0;});
 b.title='Wake lock · appui long = veille \u221E';
},500);})();
})();
