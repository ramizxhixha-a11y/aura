// ▓▓▓ VERSION 20260915b ▓▓▓
// 13-veille-ecran.js — Veille ∞ (design validé par Rams le 16/08/2026) — [1c-LITE · 15/09/2026] RÉÉCRITE EN CSS.
// L'ancienne version dessinait un canvas plein écran à 60 fps (resize du canvas à chaque frame, 260 traînées,
// 31 étoiles avec shadowBlur, eval par frame) : sonde LENT 1,0-1,8 s PAR FRAME (12/09, 14/09, 15/09), rythme de
// cycles divisé par 3 dès l'entrée en veille. L'« anti-throttling » étranglait le battement. Désormais : un voile
// noir, 60 étoiles en divs animées par CSS (opacité seule → compositeur, 0 travail JS), le mot AURA, heure + P&L
// mis à jour toutes les 30 s. Même déclenchement (10 min sans toucher, appui long sur ☾/☀), même sortie (un tap),
// même wake lock. Aucun rAF.
(function(){
var IDLE=600000, el=null, run=false, wl=null, last=Date.now(), tick=0;
var STAR=['#eaf6ff','#ffd9a0','#ff9d6f','#9fd8ff','#00e87a','#19e3ff'];
function build(){
 el=document.createElement('div');el.id='veilleAura';
 el.style.cssText='position:fixed;inset:0;z-index:99998;background:#02040a;overflow:hidden;display:none;';
 var h='<style>@keyframes vTw{0%,100%{opacity:.12}50%{opacity:1}}@keyframes vDrift{0%{transform:translate(0,0)}50%{transform:translate(6vw,4vh)}100%{transform:translate(0,0)}}'+
  '#veilleAura .s{position:absolute;border-radius:50%;animation:vTw var(--d) ease-in-out infinite;will-change:opacity}'+
  '#veilleAura .a{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:700 22vmin monospace;color:#9aa4b4;opacity:.14;letter-spacing:.05em;animation:vDrift 90s ease-in-out infinite}'+
  '#veilleAura .i{position:absolute;left:40px;top:40px;font:600 13px monospace;color:#8a94a6;opacity:.55;animation:vDrift 45s ease-in-out infinite}</style>';
 for(var i=0;i<60;i++){var sz=(2+Math.random()*3).toFixed(1);
  h+='<div class="s" style="left:'+(Math.random()*100).toFixed(2)+'%;top:'+(Math.random()*100).toFixed(2)+'%;width:'+sz+'px;height:'+sz+'px;background:'+STAR[i%STAR.length]+';--d:'+(2+Math.random()*4).toFixed(2)+'s;animation-delay:-'+(Math.random()*4).toFixed(2)+'s"></div>';}
 h+='<div class="a">AURA</div><div class="i" id="veilleInfo"></div>';
 el.innerHTML=h;
 el.addEventListener('touchstart',exit,{passive:true});el.addEventListener('click',exit);
 document.body.appendChild(el);}
function info(){try{var S0=window.S,t=document.getElementById('veilleInfo');if(!t)return;
 var pnl=(S0&&S0._startPortfolio)?(S0.portfolio-S0._startPortfolio):null;
 t.textContent=new Date().toLocaleTimeString().slice(0,5)+(pnl!=null?('  \u00b7  P&L '+(pnl>=0?'+':'')+pnl.toFixed(2)+'$'):'');}catch(e){}}
function enter(){if(run)return;run=true;
 if(!el)build();el.style.display='block';info();tick=setInterval(info,30000);
 try{navigator.wakeLock&&navigator.wakeLock.request('screen').then(function(l){wl=l;});}catch(e){}}
function exit(){run=false;if(tick){clearInterval(tick);tick=0;}
 if(el)el.style.display='none';try{wl&&wl.release();wl=null;}catch(e){}last=Date.now();}
['touchstart','click','scroll','keydown'].forEach(function(ev){
 document.addEventListener(ev,function(){last=Date.now();},{passive:true});});
setInterval(function(){if(!run&&Date.now()-last>IDLE&&!document.hidden)enter();},15000);
window._veilleNow=enter;
// [INTÉGRATION · 16/08, idée Rams] l'icône wake lock du header (☾/☀) : APPUI LONG (600 ms) = veille immédiate.
(function(){var t=0,iv=setInterval(function(){t++;
 var b=document.getElementById('wakeLockBtn');
 if(!b){if(t>240)clearInterval(iv);return;}
 clearInterval(iv);var press=0;
 b.addEventListener('touchstart',function(){press=Date.now();},{passive:true});
 b.addEventListener('touchend',function(e){
   if(press&&Date.now()-press>600){e.preventDefault();enter();}press=0;});
 b.title='Wake lock \u00b7 appui long = veille \u221e';
},500);})();
})();
