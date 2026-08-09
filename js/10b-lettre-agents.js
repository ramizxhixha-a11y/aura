// ▓▓▓ VERSION 20260809k ▓▓▓
// 10b-lettre-agents.js — Lettre des agents : voix, construction, export, rendu
// [DÉCOUPE 10 · 09/08/2026] Tranche BYTE-IDENTIQUE de 10-fin-bloc-restauration-v93.js
// (lignes 223-442 de l'original). Aucun code réécrit. Ordre de chargement OBLIGATOIRE :
// 10a → 10h, à la place exacte de l'ancien fichier 10 dans le HTML.


function _ltBuildAgentVoice(agent) {
  const fitness = Math.floor(agent.fitness||0);
  const wr      = (agent.trades||0)>0?Math.round((agent.wins||0)/(agent.trades||1)*100):50;
  const trades  = agent.trades||0;
  const name    = agent.name||'Agent Inconnu';
  const emoji   = agent.emoji||'🤖';

  let category, phrase;
  if(wr>=65&&fitness>=300)      { category='champion_win';   }
  else if(wr>=50&&fitness>=200) { category='champion_mixed'; }
  else if(fitness<100)          { category='survivor';       }
  else if(fitness>=200)         { category='rising';         }
  else                          { category='observer';       }

  phrase = _ltPickPhrase(_LT_PHRASES[category], {wr,trades,fitness});
  return {name:`${emoji} ${name}`, phrase, fitness, wr, trades};
}
if(typeof _ltBuildAgentVoice==='function') window._ltBuildAgentVoice = _ltBuildAgentVoice;

function _ltBuildLetter() {
  const agents  = [...(S.agents||[])].sort((a,b)=>(b.fitness||0)-(a.fitness||0));
  const top     = agents[0];
  if(!agents.length||!top) return null;

  const n       = S.totalTrades||0;
  const wr      = n>0?Math.round((S.winTrades||0)/n*100):null;
  const cap     = S.tradingAccount||0;
  const initCap = S.initialCapital||1000;
  const pnl     = cap-initCap;
  const pnlPct  = initCap>0?(pnl/initCap*100):0;
  const regime  = S._paperRealCurrentRegime||'calm';
  const pseudo  = S.avatar?.pseudo||'Trader';
  const allA    = agents.length;
  const topFit  = Math.floor(top.fitness||0);
  const topWr   = (top.trades||0)>0?Math.round((top.wins||0)/(top.trades||1)*100):50;
  const topName = (top.emoji||'🤖')+' '+(top.name||'Agent');

  const now  = new Date();
  const month= now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

  let opening, body1, body2, closing;

  if(pnlPct>=5&&wr&&wr>=60) {
    opening = `Ce mois a été marqué par une progression réelle. Avec ${n} trades à notre actif et un Win Rate collectif de ${wr}%, nous avons tenu notre rang.`;
    body1   = `Le portefeuille affiche ${pnl>=0?'+':''}$${pnl.toFixed(2)} depuis le début. Ce n'est pas le fruit du hasard — c'est le résultat de cycles d'apprentissage, d'adaptations constantes et d'une discipline que tu as su maintenir.`;
  } else if(pnlPct<-5||!wr||wr<45) {
    opening = `Ce mois a été difficile. Je dois te le dire honnêtement, sans détour.`;
    body1   = `Sur ${n} trades et un WR de ${wr||'—'}%, nous avons traversé une période de recalibration. Le capital a bougé de ${pnl>=0?'+':''}$${pnl.toFixed(2)}. Mais nous sommes toujours là, et c'est ce qui compte.`;
  } else {
    opening = `Un mois ordinaire n'est jamais vraiment ordinaire. ${n} trades. ${wr||'—'}% de réussite. Du travail accompli.`;
    body1   = `Le portefeuille se tient à $${cap.toFixed(2)}. Le régime de marché est resté ${regime.replace('_',' ').toUpperCase()} pendant une bonne partie du cycle. Nous avons appris à nous y adapter.`;
  }

  body2 = `Parmi nous ${allA} agents, c'est <em>${topName}</em> qui s'est le plus distingué ce mois, avec une fitness de <strong>${topFit}T$</strong> et un WR de <strong>${topWr}%</strong>. Il parle pour l'ensemble de la troupe.`;

  closing = pnlPct>=0
    ? `Nous ne tradinons pas pour le court terme, ${pseudo}. Nous construisons quelque chose. Continue à nous faire confiance.`
    : `Les marchés testent la patience avant de récompenser la discipline, ${pseudo}. Nous serons là au prochain cycle.`;

  const voices = agents.slice(1, Math.min(4, agents.length)).map(_ltBuildAgentVoice);

  return {top, topName, month, opening, body1, body2, closing, voices, wr, n, pnl, pnlPct, cap, pseudo};
}
if(typeof _ltBuildLetter==='function') window._ltBuildLetter = _ltBuildLetter;

function _ltPickPhrase(pool, vars) {
  const phrase = pool[Math.floor(Math.random()*pool.length)];
  return phrase.replace(/{(\w+)}/g, (_,k)=>vars[k]??'—');
}
if(typeof _ltPickPhrase==='function') window._ltPickPhrase = _ltPickPhrase;

function exportAgentLetter() {
  const data = _ltBuildLetter();
  if(!data) { showToast('⚠ Pas assez de données', 1500, 'warn'); return; }

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Lettre des Agents — AURA ∞ — ${data.month}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0a0a14;color:#c8c8d8;font-family:Georgia,serif;padding:30px;max-width:600px;margin:0 auto;font-size:11pt;line-height:1.8;}
.header{text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid rgba(167,139,250,.3);}
.from{font-size:16pt;font-weight:700;color:#a855f7;letter-spacing:.1em;}
.date{font-size:9pt;color:#555;margin-top:4px;letter-spacing:.1em;text-transform:uppercase;}
p{margin-bottom:14px;color:#b0b0c0;}
strong{color:#e0e0f0;}
em{color:#a855f7;font-style:normal;}
.voice{border-left:2px solid rgba(167,139,250,.4);padding:8px 14px;margin:8px 0;color:#888;font-style:italic;}
.voice-name{font-size:9pt;color:#a855f7;font-style:normal;font-weight:700;margin-bottom:2px;}
.sig{margin-top:24px;padding-top:16px;border-top:1px solid rgba(167,139,250,.2);}
.sig-name{font-size:13pt;font-weight:700;color:#a855f7;}
.sig-role{font-size:8pt;color:#555;letter-spacing:.1em;text-transform:uppercase;}
.footer{margin-top:30px;text-align:center;font-size:8pt;color:#333;border-top:1px solid #1a1a2e;padding-top:12px;}
</style>
<style>
/* AURA8 v95 · CSS modales et widgets restaurés (Phase B) */
.why-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.75); display: none; align-items: center; justify-content: center; padding: 20px 14px; backdrop-filter: blur(4px); }
.why-overlay.open { display: flex; }
.why-panel { width: 100%; max-width: 400px; background: var(--s1); border: 1px solid rgba(167,139,250,.35); border-radius: 16px; padding: 16px; box-shadow: 0 0 40px rgba(167,139,250,.15); max-height: 85vh; overflow-y: auto; }
.why-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.why-title { font-size: 14px; font-weight: 800; color: var(--pur); display: flex; align-items: center; gap: 6px; }
.why-close { font-size: 18px; color: var(--t3); cursor: pointer; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background .15s; }
.why-close:hover { background: rgba(255,255,255,.06); }
.diag-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75); display:none;align-items:flex-start;justify-content:center;padding:40px 12px; overflow-y:auto;backdrop-filter:blur(3px); transform:translateZ(0); -webkit-transform:translateZ(0); }
.diag-overlay.open { display:flex; }
.diag-panel { width:100%;max-width:420px;background:var(--s1);border:1px solid var(--border); border-radius:14px;padding:14px 14px 12px; }
.diag-head { display:flex;justify-content:space-between;align-items:center;margin-bottom:10px; }
.diag-title { font-size:14px;font-weight:800;color:var(--t1);display:flex;align-items:center;gap:6px; }
.diag-close { font-size:18px;color:var(--t3);cursor:pointer;width:26px;height:26px;display:flex;align-items:center;justify-content:center; }
.diag-section { margin:10px 0 4px;padding:8px 10px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:10px; }
.diag-label { color:var(--t2); }
.diag-val { font-family:var(--font-mono);font-weight:700; }
.diag-val.ok { color:var(--up); }
.diag-val.warn { color:var(--gold); }
.diag-val.crit { color:var(--down); }
.diag-val.neu { color:var(--ice); }
.pair-detail-overlay { position: fixed; inset: 0; z-index: 2050; background: rgba(6,8,12,0.7); backdrop-filter: blur(4px); display: none; justify-content: center; align-items: flex-start; padding: 16px 10px; overflow-y: auto; animation: fadeInOverlay .18s ease; }
.pair-detail-overlay.open { display: flex; }
.pair-detail-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
.pair-detail-close { font-size: 18px; color: var(--t3); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 8px; transition: background .15s, color .15s; }
.pair-detail-close:active { background: var(--s2); color: var(--t1); }
.close-confirm-overlay { position: fixed; inset: 0; z-index: 2200; background: rgba(0,0,0,0.65); backdrop-filter: blur(3px); display: none; justify-content: center; align-items: center; padding: 20px; }
.close-confirm-overlay.open { display: flex; }
.close-confirm-card { background: var(--s1); border: 1px solid var(--border); border-radius: 14px; padding: 16px; max-width: 320px; width: 100%; animation: slideUpPanel .22s ease; }
.close-confirm-title { font-size: 13px; font-weight: 800; color: var(--t1); margin-bottom: 6px; }
.close-confirm-body { font-size: 11px; color: var(--t2); margin-bottom: 12px; line-height: 1.4; }
.close-confirm-actions { display: flex; gap: 8px; }
.close-confirm-btn { flex: 1; padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; transition: background .15s; }
.close-confirm-btn.cancel { background: var(--s2); color: var(--t2); }
.close-confirm-btn.cancel:active { background: var(--s3); }
.close-confirm-btn.confirm { background: var(--down); color: white; }
.close-confirm-btn.confirm:active { background: #e02c58; }
#agentLetterSection { padding: 12px 0; }
#liveLabel { font-size: 9px; font-weight: 700; letter-spacing: .15em; color: var(--up); margin-left: 4px; vertical-align: middle; }
#pairDetailOverlay { display: none; position: fixed; inset: 0; z-index: 9998; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 20px; }
#pairDetailOverlay.open { display: flex; }
#pairDetailOverlay .pair-detail-card { background: var(--s2); border: 1px solid rgba(255,255,255,.06); border-radius: 14px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; padding: 16px; }
#pairDetailOverlay .pair-detail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
#pairDetailOverlay .pair-detail-close { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--s3); border-radius: 50%; cursor: pointer; color: var(--t2); font-size: 14px; }
#pairDetailBody { font-size: 12px; color: var(--t1); }
</style>
</head><body>
<div class="header">
  <div class="from">🤖 Tes Agents AURA ∞</div>
  <div class="date">Lettre de ${data.month}</div>
</div>
<p>${data.opening}</p>
<p>${data.body1}</p>
<p>${data.body2.replace(/<em>/g,'<em>').replace(/<strong>/g,'<strong>')}</p>
${data.voices.length>0?`<div style="margin:16px 0;">${data.voices.map(v=>`<div class="voice"><div class="voice-name">${v.name}</div>${v.phrase}</div>`).join('')}</div>`:''}
<p>${data.closing}</p>
<div class="sig">
  <div class="sig-name">${data.topName}</div>
  <div class="sig-role">Agent principal — AURA ∞</div>
</div>
<div class="footer">AURA ∞ — Adaptive Universal Risk Architect · ${data.month}</div>
</body></html>`;

  const win = window.open('','_blank','width=700,height=600');
  if(!win){ showToast('⚠ Autoriser les popups', 1500,'warn'); return; }
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(()=>win.print(), 500);
  showToast('📄 Lettre exportée', 2000, 'win');
}
window.exportAgentLetter = exportAgentLetter;
if(typeof exportAgentLetter==='function') window.exportAgentLetter = exportAgentLetter;

function renderAgentLetterSection() {
  const el  = document.getElementById('agentLetterSection');
  if(!el) return;

  const data = _ltBuildLetter();
  if(!data) {
    el.innerHTML=`<div class="lt-section"><div class="lt-title">📜 Lettre des Agents</div><div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Tes agents ont besoin de plus de données pour te écrire. Lance le bot !</div></div>`;
    return;
  }

  el.innerHTML = `
    <div class="lt-section">
      <div class="lt-title">📜 Lettre des Agents
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${data.month}</span>
      </div>

      <div class="lt-letter">
        <div class="lt-header">
          <div class="lt-from">🤖 Tes Agents AURA ∞</div>
          <div class="lt-date">Lettre de ${data.month}</div>
        </div>

        <p class="lt-p">${data.opening}</p>
        <p class="lt-p">${data.body1}</p>
        <p class="lt-p">${data.body2}</p>

        ${data.voices.length>0?`
        <div class="lt-agent-voices">
          ${data.voices.map(v=>`<div class="lt-voice">
            <div class="lt-voice-name">${v.name} · ${v.fitness}T$ · ${v.wr}% WR</div>
            "${v.phrase}"
          </div>`).join('')}
        </div>`:''}

        <p class="lt-p" style="margin-top:10px;">${data.closing}</p>

        <div class="lt-sig">
          <div class="lt-sig-name">${data.topName}</div>
          <div class="lt-sig-role">Agent principal — AURA ∞</div>
        </div>
      </div>

      <button class="lt-export-btn" onclick="exportAgentLetter()">
        📄 Exporter / Imprimer la lettre
      </button>

      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;line-height:1.4;">
        Générée depuis les vraies stats de tes agents · Unique à chaque session
      </div>
    </div>`;
}
window.renderAgentLetterSection = renderAgentLetterSection;
if(typeof renderAgentLetterSection==='function') window.renderAgentLetterSection = renderAgentLetterSection;