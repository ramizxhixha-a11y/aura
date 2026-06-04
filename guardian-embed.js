/* ============================================================
   GUARDIAN EMBED · bouton flottant + panneau DANS AURA
   Charge après guardian-config.js + guardian-core.js.
   Donne au moteur l'accès live à S, au DOM et aux erreurs JS
   → active la comparaison UI↔état et la capture d'erreurs.
   ============================================================ */
(function(){
'use strict';
if(window.__guardianEmbed) return; window.__guardianEmbed = true;

function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

ready(function(){
  if(!window.GuardianCore){ console.warn('[Guardian] core absent, embed annulé'); return; }

  /* ---- styles ---- */
  const css = `
  #gdnFab{position:fixed;right:14px;bottom:14px;z-index:99998;width:48px;height:48px;border-radius:50%;
    background:rgba(10,15,21,.92);border:1px solid rgba(56,212,245,.5);color:#38d4f5;font-size:22px;
    display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.5);
    transition:transform .15s, border-color .3s; user-select:none;-webkit-user-select:none}
  #gdnFab:active{transform:scale(.92)}
  #gdnFab.crit{border-color:#ff3d6b;color:#ff3d6b;animation:gdnPulse 1.4s infinite}
  #gdnFab.warn{border-color:#ffb830;color:#ffb830}
  #gdnFab .gdnDot{position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;border-radius:9px;
    background:#ff3d6b;color:#fff;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;padding:0 4px;font-family:monospace}
  @keyframes gdnPulse{0%,100%{box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 0 0 rgba(255,61,107,.5)}50%{box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 0 6px rgba(255,61,107,0)}}
  #gdnOverlay{position:fixed;inset:0;z-index:99999;background:rgba(2,4,6,.78);display:none}
  #gdnOverlay.open{display:block}
  #gdnPanel{position:fixed;right:0;top:0;bottom:0;width:min(440px,94vw);background:#070b10;border-left:1px solid rgba(56,212,245,.25);
    box-shadow:-8px 0 30px rgba(0,0,0,.6);display:flex;flex-direction:column;font-family:-apple-system,system-ui,sans-serif;color:#e8ecf1}
  #gdnPanel .gdnHead{padding:12px 14px;background:#0a0f15;border-bottom:1px solid rgba(56,212,245,.2);display:flex;align-items:center;justify-content:space-between}
  #gdnPanel .gdnHead b{color:#38d4f5;font-size:15px}
  #gdnClose{background:rgba(255,61,107,.12);border:1px solid rgba(255,61,107,.5);color:#ff3d6b;border-radius:8px;padding:6px 12px;font-weight:700;cursor:pointer;font-size:12px}
  #gdnBody{flex:1;overflow-y:auto;padding:12px 14px;font-size:13px}
  #gdnRun{width:100%;background:rgba(0,232,122,.1);border:1px solid #00e87a;color:#00e87a;padding:11px;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
  #gdnRun:active{transform:scale(.98)}
  .gdnSum{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
  .gdnChip{padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700;font-family:monospace}
  .gdnChip.crit{background:rgba(255,61,107,.12);color:#ff3d6b}
  .gdnChip.warn{background:rgba(255,184,48,.12);color:#ffb830}
  .gdnChip.ok{background:rgba(0,232,122,.12);color:#00e87a}
  .gdnGrp{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a96a8;margin:14px 0 4px}
  .gdnItem{padding:7px 9px;border-radius:8px;margin:5px 0;background:rgba(74,86,104,.08);border-left:3px solid #4a5668;font-size:11px}
  .gdnItem.ok{border-left-color:#00e87a}.gdnItem.info{border-left-color:#38d4f5}
  .gdnItem.warn{border-left-color:#ffb830;background:rgba(255,184,48,.06)}
  .gdnItem.crit{border-left-color:#ff3d6b;background:rgba(255,61,107,.08)}
  .gdnItem .t{font-weight:700}
  .gdnItem.crit .t{color:#ff3d6b}.gdnItem.warn .t{color:#ffb830}.gdnItem.ok .t{color:#00e87a}.gdnItem.info .t{color:#38d4f5}
  .gdnItem .d{color:#8a96a8;font-size:10px;margin-top:3px;line-height:1.5}
  .gdnItem .f{color:#38d4f5;font-size:10px;margin-top:4px;padding:5px 7px;background:rgba(56,212,245,.06);border-radius:5px;line-height:1.5}
  .gdnItem .f b{color:#ffb830}
  .gdnActions{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid rgba(56,212,245,.2);background:#0a0f15}
  .gdnActions button{flex:1;min-width:84px;background:rgba(56,212,245,.1);border:1px solid #38d4f5;color:#38d4f5;border-radius:8px;padding:9px 6px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  /* ---- DOM ---- */
  const fab=document.createElement('div'); fab.id='gdnFab'; fab.innerHTML='🛡️<span class="gdnDot" id="gdnDot">0</span>';
  document.body.appendChild(fab);
  const ov=document.createElement('div'); ov.id='gdnOverlay';
  ov.innerHTML='<div id="gdnPanel">'
    +'<div class="gdnHead"><b>🛡️ Guardian</b><button id="gdnClose">Fermer ✕</button></div>'
    +'<div id="gdnBody"><button id="gdnRun">▶ Lancer l\'analyse</button><div id="gdnOut" style="margin-top:10px"></div></div>'
    +'<div class="gdnActions">'
    +'<button data-a="json">⬇ JSON</button><button data-a="text">⬇ Texte</button>'
    +'<button data-a="backup">⬇ Backup</button><button data-a="reload">↻ Relancer</button>'
    +'</div></div>';
  document.body.appendChild(ov);

  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function dl(c,n,t){const b=new Blob([typeof c==='string'?c:JSON.stringify(c,null,2)],{type:t||'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=n;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);document.body.removeChild(a);},200);}

  let last=null;
  function render(rep){
    const out=document.getElementById('gdnOut'); if(!out) return;
    const crit=rep.results.filter(r=>r.level==='crit').length, warn=rep.results.filter(r=>r.level==='warn').length, ok=rep.results.filter(r=>r.level==='ok').length;
    let h='<div class="gdnSum"><span class="gdnChip crit">'+crit+' crit</span><span class="gdnChip warn">'+warn+' avert.</span><span class="gdnChip ok">'+ok+' OK</span></div>';
    h+='<div class="d" style="color:#00e87a;font-size:10px;margin-bottom:6px">✅ Mode intégré : comparaison UI↔état et erreurs JS actives.</div>';
    const g={}; rep.results.forEach(r=>{(g[r.group]=g[r.group]||[]).push(r);});
    Object.keys(g).forEach(grp=>{
      h+='<div class="gdnGrp">'+grp+'</div>';
      g[grp].sort((a,b)=>({crit:0,warn:1,info:2,ok:3}[a.level]-{crit:0,warn:1,info:2,ok:3}[b.level]));
      g[grp].forEach(r=>{
        const ic=r.level==='ok'?'✅':r.level==='warn'?'🟡':r.level==='crit'?'🔴':'ℹ️';
        h+='<div class="gdnItem '+r.level+'"><div class="t">'+ic+' '+esc(r.title)+'</div>';
        if(r.detail)h+='<div class="d">'+esc(r.detail)+'</div>';
        if(r.fix)h+='<div class="f"><b>→ Correction :</b> '+esc(r.fix)+'</div>';
        h+='</div>';
      });
    });
    out.innerHTML=h;
  }
  function updateFab(rep){
    const crit=rep?rep.results.filter(r=>r.level==='crit').length:0;
    const warn=rep?rep.results.filter(r=>r.level==='warn').length:0;
    fab.classList.remove('crit','warn');
    const dot=document.getElementById('gdnDot');
    if(crit>0){ fab.classList.add('crit'); dot.style.display='flex'; dot.textContent=crit; }
    else if(warn>0){ fab.classList.add('warn'); dot.style.display='flex'; dot.style.background='#ffb830'; dot.style.color='#000'; dot.textContent=warn; }
    else { dot.style.display='none'; }
  }
  async function run(){
    const btn=document.getElementById('gdnRun'); btn.textContent='⏳ analyse…'; btn.disabled=true;
    try{ last=await window.GuardianCore.runAll(); render(last); updateFab(last); }
    catch(e){ document.getElementById('gdnOut').innerHTML='<div class="gdnItem crit"><div class="t">Erreur: '+esc(e&&e.message)+'</div></div>'; }
    btn.textContent='▶ Relancer l\'analyse'; btn.disabled=false;
  }

  fab.onclick=()=>{ ov.classList.add('open'); if(!last) run(); };
  document.getElementById('gdnClose').onclick=()=>ov.classList.remove('open');
  ov.onclick=e=>{ if(e.target===ov) ov.classList.remove('open'); };
  document.getElementById('gdnRun').onclick=run;
  ov.querySelectorAll('.gdnActions button').forEach(b=>{
    b.onclick=()=>{
      const a=b.getAttribute('data-a'); const E=window.GuardianCore.export;
      if(a==='reload') return run();
      if(!last){ alert('Lance d\'abord l\'analyse.'); return; }
      const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
      if(a==='json') dl(E.resultsJSON(),'guardian-'+stamp+'.json','application/json');
      if(a==='text') dl(E.resultsText(),'guardian-'+stamp+'.txt');
      if(a==='backup') dl(E.fullBackup(),'guardian-backup-'+stamp+'.json','application/json');
    };
  });

  /* analyse silencieuse au démarrage (après 4s) pour colorer le bouton si souci */
  setTimeout(()=>{ window.GuardianCore.runAll().then(rep=>{ last=rep; updateFab(rep); }).catch(()=>{}); }, 4000);

  /* BACKUP AUTO : au démarrage (après 8s) puis toutes les 30 min, on vérifie si un
     backup est dû (selon l'intervalle réglé, 6h par défaut). abRun ne sauvegarde que
     si l'intervalle est écoulé → sûr de tourner souvent. */
  if(window.GuardianCore.autoBackup){
    const tick = () => { try { window.GuardianCore.autoBackup.tick().then(r=>{
      if(r&&r.ok){
        console.log('[Guardian] backup auto · cycle #'+r.cycle);
        if(window.GuardianCore.drive){ window.GuardianCore.drive.autoPush().then(d=>{ if(d&&d.ok) console.log('[Guardian] backup Drive · '+d.name); else if(d) console.log('[Guardian] Drive non envoyé: '+d.reason); }).catch(()=>{}); }
      }
    }).catch(()=>{}); } catch(e){} };
    setTimeout(tick, 8000);
    setInterval(tick, 30*60*1000);
    // pré-charger le token Drive au boot (silencieux) pour que les push suivants réussissent
    if(window.GuardianCore.drive){
      setTimeout(()=>{ try { const m=window.GuardianCore.drive.getMeta(); if(m&&m.enabled){ window.GuardianCore.drive.warmup&&window.GuardianCore.drive.warmup(); } } catch(e){} }, 5000);
    }
  }

  console.log('[Guardian] embed prêt · mode', window.GuardianCore.detectMode());
});
})();
