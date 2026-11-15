# rejeu/mutations_n63.py — [GO N° 63 · 15/11/2026] chaque mutation casse EXPRÈS la livraison (09b2 _auraRotatePurge : le journal anti-négatif garde sa tête) ;
# banc-n63.js doit en voir chacune.
# usage : python3 -I rejeu/mutations_n63.py <racine du dépôt>      → « TUÉES : n / n » attendu
import os, sys, shutil, subprocess, tempfile
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
J9 = 'js/09b2-save-load.js'
J2 = 'js/02-state-init.js'
L = "      if (Array.isArray(w.antiNegReserveLog) && w.antiNegReserveLog.length > 50) w.antiNegReserveLog = w.antiNegReserveLog.slice(0, 50);"
M = [
  (J9, 'la queue au lieu de la tête (le défaut revient)', L, L.replace('.slice(0, 50)', '.slice(-50)')),
  (J9, 'cutEnd remis', L, "      w.antiNegReserveLog = cutEnd(w.antiNegReserveLog, 50);"),
  (J9, 'plus de purge du journal', L, ""),
  (J9, '49 lignes gardées', L, L.replace('.slice(0, 50)', '.slice(0, 49)')),
  (J9, '51 lignes gardées', L, L.replace('length > 50', 'length > 51').replace('.slice(0, 50)', '.slice(0, 51)')),
  (J9, 'la tête sans la plus récente', L, L.replace('.slice(0, 50)', '.slice(1, 51)')),
  (J9, 'tête, mais à l\'envers', L, L.replace('.slice(0, 50)', '.slice(0, 50).reverse()')),
  (J9, 'purge d\'un seul mode (le mode de la boucle ignoré : toujours paperReal)', L, L.replace('if (Array.isArray(w.antiNegReserveLog)', 'w = wsx.paperReal || w; if (Array.isArray(w.antiNegReserveLog)')),
  (J9, 'journal vidé', L, L.replace('w.antiNegReserveLog.slice(0, 50)', '[]')),
  (J9, 'la purge touche aussi l\'historique des trades', "pst[pp].trades = cutEnd(pst[pp].trades, _TRADES_GARDES_PAR_PAIRE);", "pst[pp].trades = cut(pst[pp].trades, _TRADES_GARDES_PAR_PAIRE);"),
  (J9, 'la purge touche aussi pnlHistory', "w.pnlHistory        = cutEnd(w.pnlHistory, 100);", "w.pnlHistory        = cutEnd(w.pnlHistory, 99);"),
  (J2, 'un écrivain du journal en QUEUE (push)', "  S.antiNegReserveLog.unshift({ amount: held, source: 'hold'", "  S.antiNegReserveLog.push({ amount: held, source: 'hold'"),
  (J2, 'un lecteur du journal ajouté', "  if (S.antiNegReserveLog.length > 200) S.antiNegReserveLog.pop();\n  return held;", "  if (S.antiNegReserveLog.length > 200) S.antiNegReserveLog.pop();\n  var _x = S.antiNegReserveLog[S.antiNegReserveLog.length - 1];\n  return held;"),
]
tues, vivants = 0, []
for fichier, nom, a, b in M:
    d = tempfile.mkdtemp(prefix='mut63-')
    try:
        for x in ('js', 'banc-fixtures'): shutil.copytree(os.path.join(R, x), os.path.join(d, x))
        for x in ('AURA8_v118.html', 'aura-guardian.html', 'guardian-core.js', 'guardian-embed.js'):
            if os.path.exists(os.path.join(R, x)): shutil.copy(os.path.join(R, x), os.path.join(d, x))
        p = os.path.join(d, fichier); s = open(p, encoding='utf-8').read()
        assert s.count(a) == 1, ('ancre', nom, s.count(a))
        open(p, 'w', encoding='utf-8').write(s.replace(a, b))
        env = dict(os.environ, BANC_ROOT=d)
        r = subprocess.run(['node', os.path.join(R, 'banc-n63.js')], env=env, capture_output=True, text=True, timeout=600)
        echecs = [l.strip()[:60] for l in r.stdout.splitlines() if l.startswith('  ❌ ')]
        if r.returncode != 0 and echecs: tues += 1; print('  tuée   · ' + nom + ' → ' + ', '.join(e.split(' · ')[0].replace('❌ ', '') for e in echecs))
        else: vivants.append(nom); print('  VIVANTE · ' + nom)
    finally:
        shutil.rmtree(d, ignore_errors=True)
print('TUÉES : %d / %d' % (tues, len(M)) + ('' if not vivants else ' — vivantes : ' + ' ; '.join(vivants)))
sys.exit(0 if not vivants else 1)
