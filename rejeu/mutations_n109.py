# rejeu/mutations_n109.py — [GO N° 109 · 20/11/2026] chaque mutation casse EXPRÈS la livraison (03 : la note T$ prouvée, _fitProven / _fitOf / _vjE / _fitHz) ;
# banc-n109.js doit en voir chacune par un essai de COMPORTEMENT (N1 à N5 ; N6 et N7, gardes de texte, ne comptent pas).
# usage : python3 -I rejeu/mutations_n109.py <racine du dépôt>      → « TUÉES : n / n » attendu
import os, sys, subprocess, tempfile
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
J = os.path.join(R, 'js', '03-per-pair-position-buttons-controls-buid.js')
VJ = "    s += prouve ? _fitProven(b, a, b2, n) : (b > 0 ? a / b : 0);"
M = [
  ('les notes négatives remises à 350', "  if (!(E > 0)) return E;", "  if (!(E > 0)) return 0;"),
  ('Wilson à 90 % (z = 1,645)', "var k = sw2 > 0 ? (sw * sw) / sw2 : n, z = 1.96,", "var k = sw2 > 0 ? (sw * sw) / sw2 : n, z = 1.645,"),
  ('non prouvé : la note brute', "  return lo > 0.5 ? 2 * lo - 1 : 0;\n}", "  return lo > 0.5 ? 2 * lo - 1 : E;\n}"),
  ('prouvé : la note brute', "  return lo > 0.5 ? 2 * lo - 1 : 0;\n}", "  return lo > 0.5 ? E : 0;\n}"),
  ('effectif = nombre de jugements (pas Kish)', "var k = sw2 > 0 ? (sw * sw) / sw2 : n,", "var k = n,"),
  ('borne haute au lieu de basse', "  var lo = (p + z * z / (2 * k) - z * Math.sqrt(", "  var lo = (p + z * z / (2 * k) + z * Math.sqrt("),
  ('aucun effectif : la note brute', "  if (!(k > 0)) return 0;", "  if (!(k > 0)) return E;"),
  ('aucun poids : NaN', "  var E = sw > 0 ? se / sw : 0;\n  if (!(E > 0))", "  var E = se / sw;\n  if (!(E > 0))"),
  ('_fitOf : la note brute (code d\'avant)', "  return _fitScale(_fitProven(sw, se, sw2, n - start));", "  return _fitScale(sw > 0 ? se / sw : 0);"),
  ('_fitOf : Σ w² jamais compté', "sw2 += js[i].w * js[i].w; }", "}"),
  ('_vjE : le poids de la voix prouvé aussi', VJ, "    s += _fitProven(b, a, b2, n);"),
  ('_vjE : jamais prouvé', VJ, "    s += (b > 0 ? a / b : 0);"),
  ('_vjE : Σ x² faux (|x|)', "b += Math.abs(x); b2 += x * x; }", "b += Math.abs(x); b2 += Math.abs(x); }"),
  ('_fitHz : note brute', "_fitWindow() : 60, true);   // [NOTE PROUVÉE · 20/11/2026] note prouvée", "_fitWindow() : 60);   // [NOTE PROUVÉE · 20/11/2026] note prouvée"),
]
src = open(J, encoding='utf-8').read()
tues, vivants = 0, []
for nom, a, b in M:
    assert src.count(a) == 1, ('ancre', nom, src.count(a))
    fd, tmp = tempfile.mkstemp(suffix='.js', prefix='mut109-'); os.close(fd)
    try:
        open(tmp, 'w', encoding='utf-8').write(src.replace(a, b))
        r = subprocess.run(['node', os.path.join(R, 'banc-n109.js'), tmp], capture_output=True, text=True, timeout=600, cwd=R)
        ech = [l.strip()[:60] for l in r.stdout.splitlines() if l.startswith('  ❌ ')]
        comp = [e for e in ech if not (e.startswith('❌ N6') or e.startswith('❌ N7'))]
        if r.returncode != 0 and comp: tues += 1; print('  tuée   · ' + nom + ' → ' + ', '.join(e.split(' · ')[0].replace('❌ ', '') for e in comp))
        else: vivants.append(nom); print('  VIVANTE · ' + nom + ' (' + ', '.join(e.split(' · ')[0] for e in ech) + ')')
    finally:
        os.unlink(tmp)
print('TUÉES : %d / %d' % (tues, len(M)) + ('' if not vivants else ' — vivantes : ' + ' ; '.join(vivants)))
sys.exit(0 if not vivants else 1)
