# rejeu/mutations_n108.py — [GO N° 108 · 15/11/2026] chaque mutation casse EXPRÈS la livraison (15b : la liquidation propre de l'EV relue sur les
# bougies 1 h des heures de sommeil, fermée au prix de la liquidation) ; banc-n108.js doit en voir chacune.
# usage : python3 -I rejeu/mutations_n108.py <racine du dépôt>      → « TUÉES : n / n » attendu (tuée = au moins un essai de comportement échoue, L13 non compté)
import os, sys, shutil, subprocess, tempfile
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
J = 'js/15b-tendance-reelle.js'
IF = "          if (q && q.e === num(pos.entryPrice)) {"
FX = "            pos._forcedExitPx = q.px;"
HI = "        if (isFinite(hi) && hi >= 2 * q.e) { pend[q.id] = { e: q.e, px: 2 * q.e, o: o }; return true; }"
AT = "            if (done) { changed = true; delete pend[pos.id]; r.attente[pos.pair] = { w: mondayOf(q.o), t0: pp ? num(pp.t0) : 0 }; }"
FN = "            finally { if (!done) delete pos._forcedExitPx; }"
GD = "      if (g !== hGen || R() !== r || r.suivi[q.pair] !== s || s.id !== q.id || !Array.isArray(a)) return false;"
CK = "      s.chk = Math.max(from, Math.min(Math.floor(now() / HOUR) * HOUR, lastO));"
DU = "          if (s0 > 0 && !((liqAt[pos.id] || 0) > tNow - HOUR)) due.push({ id: pos.id, pair: pos.pair, e: num(pos.entryPrice), start: s0 });"
M = [
  (J, 'le code d\'avant (la mèche trouvée n\'est jamais fermée)', IF, "          if (false) {"),
  (J, 'prix imposé jamais posé (fermée au prix du moment)', FX, ""),
  (J, 'prix imposé = ps.price de l\'EV', FX, "            pos._forcedExitPx = Number(S.pairStates[pos.pair].price);"),
  (J, 'prix imposé 1 % au-dessus', FX, "            pos._forcedExitPx = q.px * 1.01;"),
  (J, 'seuil 1,9 × l\'entrée', HI, HI.replace('hi >= 2 * q.e', 'hi >= 1.9 * q.e')),
  (J, 'seuil strict (> 2 ×)', HI, HI.replace('hi >= 2 * q.e', 'hi > 2 * q.e')),
  (J, 'clôture de la bougie lue au lieu du plus haut', "        var o = Number(a[i][0]), hi = parseFloat(a[i][2]);", "        var o = Number(a[i][0]), hi = parseFloat(a[i][4]);"),
  (J, 'l\'heure d\'entrée relue', "        if (o < q.start) continue;\n        if (isFinite(hi) && hi >= 2", "        if (isFinite(hi) && hi >= 2"),
  (J, 'départ à l\'heure d\'entrée (floor)', "return t > 0 ? Math.ceil(t / HOUR) * HOUR : 0;", "return t > 0 ? Math.floor(t / HOUR) * HOUR : 0;"),
  (J, 'progression jamais sauvée (chk)', CK, ""),
  (J, 'bougie en cours sautée au contrôle suivant', CK, CK.replace('Math.min(Math.floor(now() / HOUR) * HOUR, lastO)', 'lastO + HOUR')),
  (J, 'pas de page suivante (1 000 heures au plus)', "      if (a.length >= 1000) {", "      if (false) {"),
  (J, 'contrôle à chaque battement (plus 1 fois / heure)', DU, DU.replace("!((liqAt[pos.id] || 0) > tNow - HOUR)", "true")),
  (J, 'dernier contrôle jamais noté', "        liqAt[q.id] = now(); hst.n++;", "        hst.n++;"),
  (J, 'les LONG contrôlés aussi', "        mine().forEach(function (pos) {\n          if (pos.side !== 'short') return;\n          var q = pend[pos.id];", "        mine().forEach(function (pos) {\n          var q = pend[pos.id];"),
  (J, 'pas rouverte : la semaine du contrôle au lieu de celle de la mèche', AT, AT.replace('mondayOf(q.o)', 'w')),
  (J, 'liquidée : rouvrable aussitôt', AT, "            if (done) { changed = true; delete pend[pos.id]; }"),
  (J, 'prix imposé laissé si la fermeture n\'aboutit pas', FN, "            finally { }"),
  (J, 'réponse tardive acceptée', GD, "      if (!Array.isArray(a)) return false;"),
  (J, 'contrôle sans réponse jamais abandonné', "    if (hRun && now() - hRun > STALE) { hRun = 0; hGen++; }", ""),
  (J, 'mèche trouvée : attend le battement suivant', "hRun = 0; if (hit) { try { sync(); } catch (e) {} } });", "hRun = 0; });"),
  (J, 'erreur réseau dite nulle part', "      }).catch(function (e) { hst.err = q.pair + ' : ' + ((e && e.message) || e); hst.errAt = now(); });", "      }).catch(function (e) { });"),
]
tues, vivants = 0, []
for fichier, nom, a, b in M:
    d = tempfile.mkdtemp(prefix='mut108-')
    try:
        for x in ('js', 'banc-fixtures'): shutil.copytree(os.path.join(R, x), os.path.join(d, x))
        for x in ('AURA8_v118.html',):
            if os.path.exists(os.path.join(R, x)): shutil.copy(os.path.join(R, x), os.path.join(d, x))
        p = os.path.join(d, fichier); s = open(p, encoding='utf-8').read()
        assert s.count(a) == 1, ('ancre', nom, s.count(a))
        open(p, 'w', encoding='utf-8').write(s.replace(a, b))
        env = dict(os.environ, BANC_ROOT=d)
        r = subprocess.run(['node', os.path.join(R, 'banc-n108.js')], env=env, capture_output=True, text=True, timeout=600)
        echecs = [l.strip()[:60] for l in r.stdout.splitlines() if l.startswith('  ❌ ')]
        echecs = [e for e in echecs if not e.startswith('❌ L13')]   # la garde de texte (L13) voit toute retouche : il faut un essai de COMPORTEMENT
        if r.returncode != 0 and echecs: tues += 1; print('  tuée   · ' + nom + ' → ' + ', '.join(e.split(' · ')[0].replace('❌ ', '') for e in echecs))
        else: vivants.append(nom); print('  VIVANTE · ' + nom)
    finally:
        shutil.rmtree(d, ignore_errors=True)
print('TUÉES : %d / %d' % (tues, len(M)) + ('' if not vivants else ' — vivantes : ' + ' ; '.join(vivants)))
sys.exit(0 if not vivants else 1)
