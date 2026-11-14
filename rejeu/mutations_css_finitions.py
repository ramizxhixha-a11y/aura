# [GO CSS FINITIONS · 14/11/2026] mutations de banc-css-finitions.js — python3 -I rejeu/mutations_css_finitions.py <racine du dépôt> (22, toutes doivent être tuées)
import subprocess, shutil, os, sys
SRC=sys.argv[1] if len(sys.argv) > 1 else '.'
M=[('js/02-state-init.js',"let hi = a > 0 ? 4 - Math.floor","let hi = a > 0 ? 3 - Math.floor"),
   ('js/02-state-init.js',"if (lo > 8) lo = 8;\n  const a = Math.abs(v); let hi","if (lo > 9) lo = 9;\n  const a = Math.abs(v); let hi"),
   ('js/09f1-bricks-action.js',"return pxTxt(pair, px);","return px.toFixed(4);"),
   ('js/08-learning-history-render.js',"${pos._voix === 'tendance' ? '<span class=\"op-who op-voix\">📈 Tendance</span>'","${false ? '<span class=\"op-who op-voix\">📈 Tendance</span>'"),
   ('js/08-learning-history-render.js',"const _u = v => (v >= 0 ? '+' : '−') + fmt$2(Math.abs(v)), _q","const _u = v => (v >= 0 ? '+' : '') + '$' + v.toFixed(2), _q"),
   ('js/09f1-bricks-action.js',"isVoix = pos._voix === 'tendance';","isVoix = false;"),
   ('js/07-v90-mode-bunker-sos.js',"(pos._voix === 'tendance' ? '\\uD83D\\uDCC8' :","(false ? '\\uD83D\\uDCC8' :"),
   ('css/34-finitions.css',"#nav { padding-right: 56px; }","#nav { padding-right: 24px; }"),
   ('css/34-finitions.css',"html body #gdnFab {","#gdnFab {"),
   ('js/03-per-pair-position-buttons-controls-buid.js',"✓ ${agent.memory.filter(e=>e.won).length} votes justes","${agent.memory.filter(e=>e.won).length} GAGNANTS"),
   ('js/03-per-pair-position-buttons-controls-buid.js',"<span style=\"color:${ep.pnl>=0?'var(--up)':'var(--down)'}\">trade","<span style=\"color:${ep.won?'var(--up)':'var(--down)'}\">trade"),
   ('js/03-per-pair-position-buttons-controls-buid.js',".replace(/\\+-/g, '−')",""),
   ('css/34-finitions.css',"#memoryOverlay .memory-episode-foot { font-size: 11px;","#memoryOverlay .memory-episode-foot { font-size: 9px;"),
   ('js/08-learning-history-render.js',"{icon:'📡', key:'lmsr',      w:14},","{icon:'📡', key:'lmsr',      w:12},"),
   ('js/08-learning-history-render.js',"    {icon:'🌊', key:'vola',      w:-3},\n",""),
   ('js/08-learning-history-render.js',"    lmsrScore   * 0.14 +   // LMSR consensus interne","    lmsrScore   * 0.15 +   // LMSR consensus interne"),
   ('js/08-learning-history-render.js',"    vola:    { score:vola.score,","    vola:    { score:-vola.score,"),
   ('js/08-learning-history-render.js',"const tpHint = pxTxt(pos.pair, tpV)","const tpHint = tpV.toFixed(0)"),
   ('js/02-state-init.js',"const modeLabel = pos._voix === 'tendance' ? '📈 TENDANCE' : pos.auto ? '🤖 BOT' : '🔒 MAN';","const modeLabel = pos.auto ? '🤖 BOT' : '🔒 MAN';"),
   ('js/10h-pont-fullpower-bricks.js',"return pxTxt(pair, px);   // [GO CSS FINITIONS","return '$' + Math.round(px).toLocaleString();   // [GO CSS FINITIONS"),
   ('js/08-learning-history-render.js',"const sc   = (w && w < 0) ? -d.score : d.score;","const sc   = d.score;"),
   ('js/07-v90-mode-bunker-sos.js',"elMemPnl.style.color = last.pnl >= 0 ? 'var(--up)' : 'var(--down)';","elMemPnl.style.color = last.won ? 'var(--up)' : 'var(--down)';"),
]
alive=0
for i,(f,a,b) in enumerate(M):
    d=os.path.join(os.environ.get('TMPDIR', '/tmp'), 'mut_css_finitions'); shutil.rmtree(d, ignore_errors=True)
    subprocess.run(['bash','-c',f'mkdir -p {d} && cd {os.path.abspath(SRC)} && tar --exclude=.git --exclude=rejeu -cf - . | tar -xf - -C {d}'],check=True)
    p=os.path.join(d,f); s=open(p,encoding='utf-8').read(); assert s.count(a)>=1,(i,f,s.count(a),a[:60]); open(p,'w',encoding='utf-8').write(s.replace(a,b,1))
    r=subprocess.run(['node',os.path.join(os.path.abspath(SRC),'banc-css-finitions.js')],env=dict(os.environ,BANC_ROOT=d),capture_output=True,text=True)
    k='tuée' if r.returncode else 'SURVIT'; alive+= (r.returncode==0)
    print(i, k, f, a[:50].replace('\n',' '))
print('survivantes', alive, '/', len(M))
