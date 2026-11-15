# rejeu/mutations_n80.py — [GO N° 80 · 15/11/2026] chaque mutation casse EXPRÈS la livraison (15b sync (b) : une liquidation de la poche ferme la
# position EV au prix de la liquidation) ; banc-n80.js doit en voir chacune.
# usage : python3 -I rejeu/mutations_n80.py <racine du dépôt>      → « TUÉES : n / n » attendu
import os, sys, shutil, subprocess, tempfile
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
J = 'js/15b-tendance-reelle.js'
LQ = "liq = why.indexOf('liquidation') >= 0; if (liq) liqPx = num(h.x1); break; }"
GA = "          if (!(liqPx > 0) && !fresh(pos.pair)) return;"
FX = "          if (liqPx > 0) pos._forcedExitPx = liqPx;"
FN = "          try { done = closeVoix(r, t, pos, why); } finally { if (!done) delete pos._forcedExitPx; }"
AT = "          if (liq) r.attente[pos.pair] = { w: w, t0: pp ? num(pp.t0) : 0 };"
M = [
  (J, 'le code d\'avant (le défaut revient)', GA + "      // pas de prix réel frais : on attend (jamais au prix sauvegardé)\n" + FX, "          if (!liq && !fresh(pos.pair)) return;"),
  (J, 'prix de la liquidation jamais lu', LQ, LQ.replace(' if (liq) liqPx = num(h.x1);', '')),
  (J, 'prix imposé jamais posé', FX, ''),
  (J, 'prix imposé = l\'entrée de la poche (x0)', FX, FX.replace('= liqPx', '= num(h.x0)')),
  (J, 'prix imposé arrondi au centième près', FX, FX.replace('= liqPx', '= liqPx * 0.999')),
  (J, 'prix imposé à TOUTE fermeture suivie (retournement compris)', LQ, LQ.replace('if (liq) liqPx', 'liqPx')),
  (J, 'liquidation : attend un prix frais même avec son prix', GA, "          if (!fresh(pos.pair)) return;"),
  (J, 'prix imposé seulement quand le prix est périmé', FX, FX.replace('if (liqPx > 0)', 'if (liqPx > 0 && !fresh(pos.pair))')),
  (J, 'prix imposé laissé si la fermeture n\'aboutit pas', FN, "          done = closeVoix(r, t, pos, why);"),
  (J, 'liquidée : rouvrable cette semaine', AT, ''),
  (J, 'ligne sans prix : fermée au prix sauvegardé (sans attendre)', GA, "          if (!liq && !(liqPx > 0) && !fresh(pos.pair)) return;"),
  (J, 'la (c) du ×2 de l\'EV ferme aussi au prix imposé de la poche', "          if (pos.side !== 'short' || !fresh(pos.pair)) return;", "          if (pos.side !== 'short' || !fresh(pos.pair)) return; pos._forcedExitPx = 2 * num(pos.entryPrice) * 1.01;"),
]
tues, vivants = 0, []
for fichier, nom, a, b in M:
    d = tempfile.mkdtemp(prefix='mut80-')
    try:
        for x in ('js', 'banc-fixtures'): shutil.copytree(os.path.join(R, x), os.path.join(d, x))
        for x in ('AURA8_v118.html',):
            if os.path.exists(os.path.join(R, x)): shutil.copy(os.path.join(R, x), os.path.join(d, x))
        p = os.path.join(d, fichier); s = open(p, encoding='utf-8').read()
        assert s.count(a) == 1, ('ancre', nom, s.count(a))
        open(p, 'w', encoding='utf-8').write(s.replace(a, b))
        env = dict(os.environ, BANC_ROOT=d)
        r = subprocess.run(['node', os.path.join(R, 'banc-n80.js')], env=env, capture_output=True, text=True, timeout=600)
        echecs = [l.strip()[:60] for l in r.stdout.splitlines() if l.startswith('  ❌ ')]
        if r.returncode != 0 and echecs: tues += 1; print('  tuée   · ' + nom + ' → ' + ', '.join(e.split(' · ')[0].replace('❌ ', '') for e in echecs))
        else: vivants.append(nom); print('  VIVANTE · ' + nom)
    finally:
        shutil.rmtree(d, ignore_errors=True)
print('TUÉES : %d / %d' % (tues, len(M)) + ('' if not vivants else ' — vivantes : ' + ' ; '.join(vivants)))
sys.exit(0 if not vivants else 1)
