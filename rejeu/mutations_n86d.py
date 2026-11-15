# rejeu/mutations_n86d.py — [GO N° 86D · 15/11/2026] chaque mutation casse EXPRÈS la livraison (les champs TP / SL de 03 et de 08 reçoivent 02 pxIn) ;
# banc-n86d.js doit en voir chacune.
# usage : python3 -I rejeu/mutations_n86d.py <racine du dépôt>      → « TUÉES : n / n » attendu
import os, sys, shutil, subprocess, tempfile
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
J3 = 'js/03-per-pair-position-buttons-controls-buid.js'
J8 = 'js/08-learning-history-render.js'
J2 = 'js/02-state-init.js'
A3T = "    if(inp) { inp.value = pxIn(pair, price); _recalcProposal(pair); }\n  } else if(field === 'sl') {"
A3S = "    const inp = document.getElementById('pinput_sl_'+k);\n    if(inp) { inp.value = pxIn(pair, price); _recalcProposal(pair); }"
A8T = "    const inp = document.getElementById('peTpInput');\n    if(inp) inp.value = pxIn(pos.pair, price);"
A8S = "    const inp = document.getElementById('peSlInput');\n    if(inp) inp.value = pxIn(pos.pair, price);"
M = [
  (J8, '08 TP : l\'ancien arrondi revient', A8T, A8T.replace('pxIn(pos.pair, price)', 'price.toFixed(_editModal.cfg.dec>=4?_editModal.cfg.dec:2)')),
  (J8, '08 SL : l\'ancien arrondi revient', A8S, A8S.replace('pxIn(pos.pair, price)', 'price.toFixed(_editModal.cfg.dec>=4?_editModal.cfg.dec:2)')),
  (J8, '08 TP : le texte de l\'écran (pxTxt, « $0,7413 ») dans le champ', A8T, A8T.replace('pxIn(', 'pxTxt(')),
  (J8, '08 TP : 4 décimales fixes', A8T, A8T.replace('pxIn(pos.pair, price)', 'price.toFixed(4)')),
  (J8, '08 SL : le prix de l\'autre côté', A8S, A8S.replace('pxIn(pos.pair, price)', 'pxIn(pos.pair, 2*cur - price)')),
  (J8, '08 TP : le champ du SL rempli', A8T, A8T.replace("'peTpInput'", "'peSlInput'")),
  (J3, '03 _adjPropPct TP : l\'ancien arrondi revient', A3T, A3T.replace('pxIn(pair, price)', 'price.toFixed(cfg.dec >= 4 ? cfg.dec : 2)')),
  (J3, '03 _adjPropPct SL : l\'ancien arrondi revient', A3S, A3S.replace('pxIn(pair, price)', 'price.toFixed(cfg.dec >= 4 ? cfg.dec : 2)')),
  (J3, '03 _adjPropPct TP : plus de recalcul', A3T, A3T.replace(' _recalcProposal(pair);', '')),
  (J3, '03 _adjPropPct SL : 3 chiffres significatifs', A3S, A3S.replace('pxIn(pair, price)', 'String(Number(price.toPrecision(3)))')),
  (J3, '03 proposition TP : l\'ancien arrondi revient', 'value="${pxIn(pair, tpVal)}"', 'value="${tpVal.toFixed(cfg.dec>=4?cfg.dec:2)}"'),
  (J3, '03 proposition SL : l\'ancien arrondi revient', 'value="${pxIn(pair, slVal)}"', 'value="${slVal.toFixed(cfg.dec>=4?cfg.dec:2)}"'),
  (J3, '03 proposition SL : la valeur du TP', 'value="${pxIn(pair, slVal)}"', 'value="${pxIn(pair, tpVal)}"'),
  (J2, '02 pxIn : 2 décimales au plus (l\'aide elle-même)', "  return String(parseFloat(v.toFixed(hi)));", "  return String(parseFloat(v.toFixed(Math.min(hi, 2))));"),
  (J2, '02 : une autre retouche de pxIn, sans effet ici (la garde G la voit)', "function pxIn(pair, v) {", "function pxIn(pair, v) {\n  if (typeof window !== 'undefined' && window.__x) return '';"),
  ('js/09c-auto-open.js', '09c (décision) lit pxIn', "  const amount    = (stakeUsdt", "  const _pxi = pxIn(pair, 1); const amount    = (stakeUsdt"),
]
tues, vivants = 0, []
for fichier, nom, a, b in M:
    d = tempfile.mkdtemp(prefix='mut86d-')
    try:
        for x in ('js', 'banc-fixtures'): shutil.copytree(os.path.join(R, x), os.path.join(d, x))
        for x in ('AURA8_v118.html', 'aura-guardian.html', 'guardian-core.js', 'guardian-embed.js'):
            if os.path.exists(os.path.join(R, x)): shutil.copy(os.path.join(R, x), os.path.join(d, x))
        p = os.path.join(d, fichier); s = open(p, encoding='utf-8').read()
        assert s.count(a) == 1, ('ancre', nom, s.count(a))
        open(p, 'w', encoding='utf-8').write(s.replace(a, b))
        env = dict(os.environ, BANC_ROOT=d)
        r = subprocess.run(['node', os.path.join(R, 'banc-n86d.js')], env=env, capture_output=True, text=True, timeout=600)
        echecs = [l.strip()[:60] for l in r.stdout.splitlines() if l.startswith('  ❌ ')]
        if r.returncode != 0 and echecs: tues += 1; print('  tuée   · ' + nom + ' → ' + ', '.join(e.split(' · ')[0].replace('❌ ', '') for e in echecs))
        else: vivants.append(nom); print('  VIVANTE · ' + nom)
    finally:
        shutil.rmtree(d, ignore_errors=True)
print('TUÉES : %d / %d' % (tues, len(M)) + ('' if not vivants else ' — vivantes : ' + ' ; '.join(vivants)))
sys.exit(0 if not vivants else 1)
