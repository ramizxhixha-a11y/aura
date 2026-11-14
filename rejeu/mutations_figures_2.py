# rejeu/mutations_figures_2.py — [GO FIGURES 2 · 14/11/2026] chaque mutation remet une figure dans la décision (ou un mensonge à l'écran) dans une copie
# du dépôt ; banc-figures-2.js doit échouer sur chacune (« tuée »). Usage : python3 -I rejeu/mutations_figures_2.py <racine du dépôt>
import os, shutil, subprocess, sys, tempfile
ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
F08, F06, F10F = 'js/08-learning-history-render.js', 'js/06-v63-patterns-chartistes.js', 'js/10f-resolveur-cycle.js'
ANC = "  // signals.pattern n'est plus jamais posé : atScore, les signaux comptés par 10f / 10h (techBonus) et les listes de signaux à l'écran n'en ont plus.\n"
VIEUX = ANC + """  try {
    if (typeof _detectPatterns === 'function') {
      const _pats = _detectPatterns(closes);
      if (_pats && _pats.length && _pats[0].signal !== 'neu') {
        const _bp = _pats[0];
        signals.pattern = { signal: _bp.signal === 'bull' ? 'bull' : 'bear', label: `${_bp.icon} ${_bp.name}`, detail: 'Pattern', weight: _bp.conf };
      }
    }
  } catch(e) {}
"""
M = [
 ('figures d\'avant remises', F08, ANC, VIEUX),
 ('figures corrigées à la place', F08, ANC, VIEUX.replace('_detectPatterns(closes)', '_detectCandlePatterns(candles)').replace("typeof _detectPatterns", "typeof _detectCandlePatterns")),
 ('figure appelée par un autre nom', F08, ANC, ANC + "  try { const _pp = window['_detect' + 'Patterns'] ? window['_detect' + 'Patterns'](closes) : null; if (_pp && _pp.length && _pp[0].signal !== 'neu') signals.pattern = { signal: _pp[0].signal, weight: _pp[0].conf }; } catch(e) {}\n"),
 ('figure neutre gardée (pèse dans le total)', F08, ANC, ANC + "  signals.pattern = { signal: 'neut', label: 'figure', detail: '', weight: 0.77 };\n"),
 ('poids fantôme d\'une figure', F08, "  const atScore = weightSum>0 ? scoreSum/weightSum : 0;", "  weightSum += 0.77;\n  const atScore = weightSum>0 ? scoreSum/weightSum : 0;"),
 ('10f compte encore la figure', F10F, "    Object.values(tech.signals||{}).forEach(s => { if(s?.signal === dir) techBonus += 0.04; });",
  "    Object.values(tech.signals||{}).forEach(s => { if(s?.signal === dir) techBonus += 0.04; }); if (tech.signals && tech.signals.pattern) techBonus += 0.04;"),
 ('écran : note d\'avant', F06, "const _PT_DECISION_NOTE = 'La décision du bot ne lit aucune de ces figures : ni celles-ci (refusées par la porte du 26/10), ni celles d\\'avant (retirées le 14/11).';",
  "const _PT_DECISION_NOTE = 'La décision du bot lit encore les figures d\\'avant (clôtures seules) : la porte des figures (26/10) ne les a pas laissées entrer.';"),
 ('figures d\'avant retouchées (les rejeux ne mesurent plus la même chose)', F06, "  if(Math.abs(maxPeak-prevMax)/maxPeak<0.02 && peakIdx<peaks.length-2) {", "  if(Math.abs(maxPeak-prevMax)/maxPeak<0.01 && peakIdx<peaks.length-2) {"),
 # relecture adverse du 14/11 (trous 2 à 4 de C5) : trois retours qui passaient le premier banc
 ('figure sous une autre clé (signals.chart)', F08, ANC, ANC + "  try { const _f = globalThis['_detect' + 'Patterns'](closes); if (_f && _f.length && _f[0].signal !== 'neu') signals.chart = { signal: _f[0].signal, label: 'x', detail: '', weight: _f[0].conf }; } catch(e) {}\n"),
 ('un éclaireur lit les figures corrigées', 'js/03-per-pair-position-buttons-controls-buid.js', "    case 'breakout_v1': {\n",
  "    case 'breakout_v1': {\n      try { const _cp = _detectCandlePatterns(candles); if (_cp && _cp.length && _cp[0].signal !== 'neu') return { score: _cp[0].signal === 'bull' ? 0.5 : -0.5, conf: _cp[0].conf, reasoning: _cp[0].name }; } catch(e) {}\n"),
 ('écran : note retirée de l\'affichage', F06, "        ${_PT_DECISION_NOTE}<br>", "        <!-- _PT_DECISION_NOTE retirée --><br>"),
]
tmp = tempfile.mkdtemp(prefix='mut-f2-')
src = os.path.join(tmp, 'src'); shutil.copytree(ROOT, src, ignore=shutil.ignore_patterns('.git', 'backups', 'node_modules', 'out'))
tuees, vues = 0, 0
for nom, f, a, b in M:
    p = os.path.join(src, f); t = open(p, encoding='utf-8').read()
    if t.count(a) != 1: print('  ⚠ ancre introuvable (%d) : %s' % (t.count(a), nom)); continue
    vues += 1
    open(p, 'w', encoding='utf-8').write(t.replace(a, b))
    r = subprocess.run(['node', os.path.join(ROOT, 'banc-figures-2.js')], env=dict(os.environ, BANC_ROOT=src), capture_output=True, text=True, timeout=300)
    open(p, 'w', encoding='utf-8').write(t)
    ok = r.returncode != 0
    tuees += ok
    print(('  ✅ tuée     ' if ok else '  ❌ SURVIT   ') + nom)
shutil.rmtree(tmp, ignore_errors=True)
print('%d/%d mutations tuées' % (tuees, len(M)))
sys.exit(0 if tuees == len(M) == vues else 1)
