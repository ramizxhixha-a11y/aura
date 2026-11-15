# rejeu/mutations_affichage_3.py — [GO AFFICHAGE 3 · 15/11/2026] chaque retouche de go affichage 3 cassée exprès, une à la fois : banc-affichage-3.js doit échouer à CHAQUE fois.
# Usage : python3 -I rejeu/mutations_affichage_3.py .          (--liste : vérifie seulement que chaque ancre existe une seule fois)
# Copie js/, le HTML et les fichiers de Guardian dans un dossier temporaire, applique la mutation, lance `BANC_ROOT=<copie> node banc-affichage-3.js`.
import os, shutil, subprocess, sys, tempfile

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else '.')
F02, F04, F05, F06, F07 = 'js/02-state-init.js', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', 'js/05-v37-19-indicateur-de-fatigue-bot.js', 'js/06-v63-patterns-chartistes.js', 'js/07-v90-mode-bunker-sos.js'
F08, F9B3, F10F, F16, F16B = 'js/08-learning-history-render.js', 'js/09b3-import-export.js', 'js/10f-resolveur-cycle.js', 'js/16-fiscal.js', 'js/16b-fiscal-ecran.js'
M = [
  # 86b
  (F02, "  const priceTag= pxTxt(pair, ps.price);", "  const priceTag= '$'+Math.floor(ps.price).toLocaleString();", '02 priceTag : entier tronqué'),
  (F10F, "const pt=pxTxt(pair,ps.price), tt=pxTxt(pair,tpE), st=pxTxt(pair,slE);", "const pt=pxTxt(pair,ps.price), tt=pxTxt(pair,tpE), st=pxTxt(pair,tpE);", '10f : SL écrit au prix du TP'),
  (F10F, "const pt=pxTxt(pair,ps.price), tt=pxTxt(pair,tpE)", "const pt=Math.floor(ps.price).toLocaleString(), tt=pxTxt(pair,tpE)", '10f : @ entier tronqué'),
  # 86c
  (F06, "return a.pair + ' ≥ ' + pxTxt(a.pair, v);", "return a.pair + ' ≥ ' + v.toFixed(2);", '06 alerte ≥ à 2 décimales'),
  (F07, "  const curr = pos.tp ? pxIn(pair, pos.tp) : '';", "  const curr = pos.tp ? pos.tp.toFixed(2) : '';", '07 TP proposé arrondi'),
  (F07, "showToast('🛑 SL '+pair+' → '+pxTxt(pair, n), 1800, 'win');", "showToast('🛑 SL '+pair+' → '+n.toFixed(2), 1800, 'win');", '07 toast SL à 2 décimales'),
  (F07, "Prix actuel : '+pxTxt(pair, ps.price)+'\\nEntrez le prix cible :'", "Prix actuel : '+ps.price.toFixed(2)+'\\nEntrez le prix cible :'", '07 prix actuel du TP à 2 décimales'),
  (F05, "${pxTxt(pos.pair, e.price)}", "${e.price.toFixed(dec)}", '05 pyramide : entrée par toFixed(dec)'),
  (F06, "${pxTxt(_CALC.pair, r.sl)}", "$${r.sl.toFixed(dec)}", '06 calculateur : SL par toFixed(dec)'),
  # 88b
  (F16, "  if (pos._voix === 'tendance') h.v = 1;", "  if (pos._voix === 'tendancE') h.v = 1;", '16 : voix jamais marquée'),
  (F16, "  if (pos._voix === 'tendance') h.v = 1;", "  h.v = pos._voix === 'tendance' ? 1 : 0;", '16 : champ v sur chaque ligne (registre alourdi)'),
  (F16B, "(e.v ? '📈 Tendance' : e.a ? '🤖 AUTO' : '👤 MAN')", "(e.a ? '🤖 AUTO' : '👤 MAN')", '16b : puce « MAN » pour la voix'),
  (F16B, "e.v ? 'TENDANCE' : e.a ? 'AUTO' : 'MANU',", "e.a ? 'AUTO' : 'MANU',", '16b : CSV « MANU » pour la voix'),
  (F16B, "  if (e.v) w.push('voix tendance longue (décision automatique)');", "  if (false) w.push('voix tendance longue (décision automatique)');", '16b : raison de la voix retirée'),
  # 67b
  (F05, "if (Number(t.pnlUsdt) > 0) { n++; if (n > best) best = n; } else n = 0;", "if (Number(t.pnlUsdt) > 0) { n++; } else n = 0; best = n;", '67b : série du moment au lieu de la plus longue'),
  (F05, "if (_isCloseRow(t) && isFinite(Number(t.pnlUsdt))", "if (t && t.type === 'position' && isFinite(Number(t.pnlUsdt))", '67b : voix oubliée'),
  (F05, "check:()=>_badgeWinRun()>=3,", "check:()=>_badgeWinRun()>3,", '67b : « En Feu ! » à 4'),
  # 68b
  (F9B3, "    if (window.Capacitor || window.cordova) {\n      window._autoDlLastFail", "    if (false) {\n      window._autoDlLastFail", '68b : repli blob dans l\'app Android'),
  (F9B3, "    if (m.fail && (now - m.fail) < m.everyMin * 60000) return;", "", '68b : nouvel essai à chaque minute'),
  (F9B3, "      m.fail = now; m.failWhy =", "      m.last = now; m.failWhy =", '68b : échec noté comme sauvegarde'),
  (F9B3, "try { if (typeof showToast === 'function') showToast('❌ Sauvegarde auto non écrite : ' + m.failWhy, 6000, 'warn'); } catch (e) {}", "", '68b : échec muet'),
  (F9B3, "if (ok) { m.last = now; delete m.fail; delete m.failWhy; autoDlSetMeta(m); return; }", "if (ok) { m.last = now; autoDlSetMeta(m); return; }", '68b : échec jamais effacé'),
  # 77b
  (F07, "  const fundCum = (S.fees&&S.fees.totalFunding)||0;", "  const fundCum = ((S.fees&&S.fees.totalFunding)||0) + (S.leverageTotalFees||0);", '77b : fundCum compte deux fois'),
  (F07, "'Funding payé (info)',fmt$2((S.fees&&S.fees.totalFunding)||0),", "'Funding payé (info)',fmt$2(((S.fees&&S.fees.totalFunding)||0)+(S.leverageTotalFees||0)),", '77b : tuile compte deux fois'),
  # 93
  (F08, "  ctx.translate(labW, 0);   // la grille commence après la colonne des noms", "", '93 : grille par-dessus les noms, noms hors du canvas'),
  (F08, "  const H = cellSize * n + 16;", "  const H = cellSize * n;", '93 : titre dans la grille (canvas sans place pour lui)'),
  (F08, "ctx.fillText('ACCORD INTER-AGENTS', (W - labW)/2, H-3);", "ctx.fillText('ACCORD INTER-AGENTS', (W - labW)/2, H+12);", '93 : titre sous le canvas'),
  (F08, "ctx.fillText(String(i+1), j*cellSize+cellSize/2, i*cellSize+cellSize/2);", "ctx.fillText(ai.emoji||'·', j*cellSize+cellSize/2, i*cellSize+cellSize/2);", '93 : 🧬 sur la diagonale'),
  (F08, "(i + 1) + ' ' + String(a.type || String(a.name || '').split('·')[0].trim() || a.id || '·')", "(i + 1) + ' ' + String(String(a.name || '').split('·')[0].trim() || a.id || '·')", '93 : nom « Hybrid Gen-… » au lieu de la spécialité'),
  # 64
  (F02, "    usd += isFinite(g) ? g : (isFinite(net) ? net : 0);", "    usd += isFinite(net) ? net : 0;", '64 : brut des paliers ignoré'),
  (F02, "    stake += Number(p.stake) || 0;", "", '64 : mise des paliers oubliée'),
  (F05, "if (Array.isArray(t.paliers) && t.paliers.length) { const r = _closeRowUsd(t);", "if (false) { const r = _closeRowUsd(t);", '64 : rapports sans paliers'),
  (F06, "const _r = _closeRowUsd(t); n++; pnl += _r.usd; if (_r.usd > 0) gagnants++;", "const _r = { usd: Number(t.pnlUsdt) || 0 }; n++; pnl += _r.usd; if (_r.usd > 0) gagnants++;", '64 : hebdo sans paliers'),
  (F05, "g: isFinite(grossPnl) ? grossPnl : undefined,", "", '64 : closePartial sans le brut'),
]
COPIE = ['js', 'AURA8_v118.html', 'guardian-core.js', 'guardian-embed.js', 'aura-guardian.html']

def lire(f): return open(os.path.join(ROOT, f), encoding='utf-8').read()

if '--liste' in sys.argv:
    bad = [(f, d, lire(f).count(o)) for f, o, n, d in M if lire(f).count(o) != 1]
    print('ancres :', 'toutes uniques' if not bad else bad); sys.exit(1 if bad else 0)

tuees, survivantes = 0, []
for i, (f, o, n, d) in enumerate(M, 1):
    s = lire(f); assert s.count(o) == 1, (f, d, s.count(o))
    tmp = tempfile.mkdtemp(prefix='mutaff3_')
    for c in COPIE:
        src = os.path.join(ROOT, c)
        if os.path.isdir(src): shutil.copytree(src, os.path.join(tmp, c))
        elif os.path.exists(src): shutil.copy(src, os.path.join(tmp, c))
    open(os.path.join(tmp, f), 'w', encoding='utf-8').write(s.replace(o, n))
    r = subprocess.run(['node', os.path.join(ROOT, 'banc-affichage-3.js')], env=dict(os.environ, BANC_ROOT=tmp), capture_output=True, text=True, timeout=900)
    shutil.rmtree(tmp, ignore_errors=True)
    ok = r.returncode != 0
    tuees += ok
    if not ok: survivantes.append(d)
    print(('  tuée     ' if ok else '  SURVIT   ') + f'{i:2d}. {d}' + ('' if ok else '  ← ' + r.stdout.strip().splitlines()[-1]))
print(f'\n{"✅" if not survivantes else "❌"} {tuees}/{len(M)} mutations tuées' + (' — survivantes : ' + ', '.join(survivantes) if survivantes else ''))
sys.exit(0 if not survivantes else 1)
