# rejeu/mutations_n94.py — [GO N° 94 · 20/11/2026] chaque mutation refait le n° 94 (la paire retirée reste à l'écran) ou le rend faux autrement (mauvaise
# remplaçante, journal menteur, paire à l'écran déplacée sans raison…) dans une copie de 08 / 11 ; banc-n94.js doit échouer sur un essai de COMPORTEMENT (R1 à R7),
# pas sur la seule garde de texte G (« tuée »). Une ancre absente = le code a changé : mettre la mutation à jour.
# Usage : python3 -I rejeu/mutations_n94.py <racine du dépôt>
import os, re, shutil, subprocess, sys, tempfile
ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
F08, F11 = 'js/08-learning-history-render.js', 'js/11-gestion-paires.js'
APPEL = "    var _ap = _activePairKeepLive();   // [GO N° 94 · 20/11/2026] la paire retirée était à l'écran : la 1re paire vivante prend sa place"
REJEU = "  try { _activePairKeepLive(); } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }   // [GO N° 94] S.activePair repart de 'BTC/USDT' (02), qui peut être retirée"
GARDE = "  if (!PAIRS[pair]) return;   // [GO N° 94 · 20/11/2026] (ETAT n° 94) une paire retirée ne revient pas à l'écran (sa carte du marché reste jusqu'à la relance : 03 drawMiniCharts)\n"
VIVE = "  if (PAIRS[S.activePair]) return null;"
BOUCLE = "  for (var i = 0; i < keys.length; i++) { if (ps[keys[i]]) { next = keys[i]; break; } }"
REPLI = "  if (!next) next = keys[0] || null;"
RET = "  return { from: was, to: next };"
LOG = "(_ap ? ' · à l’écran : ' + _ap.to : '')"
DEL = "    delete PAIRS[pair];\n" + APPEL
M = [
 ('le n° 94 refait : removePair ne déplace plus la paire à l\'écran', F11, APPEL, "    var _ap = null;"),
 ('appel AVANT le retrait de PAIRS (rien ne change)', F11, DEL, APPEL + "\n    delete PAIRS[pair];"),
 ('lancement : le rejeu ne déplace plus la paire à l\'écran', F11, REJEU, ''),
 ('lancement : appel avant les retraits du rejeu', F11, REJEU, '', 'rejeu-tot'),
 ('selectPair accepte une paire retirée', F08, GARDE, ''),
 ('selectPair lit S.pairStates (la mémoire d\'une paire retirée reste)', F08, GARDE, GARDE.replace('!PAIRS[pair]', '!S.pairStates[pair]')),
 ('remplaçante : ignore l\'état du portefeuille (1re de PAIRS)', F11, BOUCLE, "  next = keys[0];"),
 ('remplaçante : la DERNIÈRE paire vivante', F11, BOUCLE, "  for (var i = keys.length - 1; i >= 0; i--) { if (ps[keys[i]]) { next = keys[i]; break; } }"),
 ('remplaçante : sans repli (aucun état → rien)', F11, REPLI, ''),
 ('ne fait jamais rien', F11, VIVE, "  return null;"),
 ('déplace même une paire vivante', F11, VIVE, ''),
 ('rend undefined (journal muet, R7)', F11, RET, "  return;"),
 ('journal : « à l\'écran » oublié', F11, LOG, "''"),
 ('journal : « à l\'écran » même sans changement', F11, LOG, "(' · à l’écran : ' + (_ap && _ap.to))"),
]
src = {f: open(os.path.join(ROOT, f), encoding='utf-8').read() for f in (F08, F11)}
tmp = tempfile.mkdtemp(prefix='mut-n94-')
shutil.copytree(os.path.join(ROOT, 'js'), os.path.join(tmp, 'js'))
shutil.copy(os.path.join(ROOT, 'AURA8_v118.html'), tmp)
tuees, vues = 0, 0
for m in M:
    nom, f, a, b = m[:4]
    s = src[f]
    if s.count(a) != 1: print('  ⚠ ancre introuvable (%d) : %s' % (s.count(a), nom)); continue
    vues += 1
    s2 = s.replace(a, b)
    if len(m) > 4 and m[4] == 'rejeu-tot':   # l'appel déplacé en tête de _replayPairChanges (avant les retraits)
        s2 = s2.replace("  if (!S.removedPairs) S.removedPairs = [];\n", "  if (!S.removedPairs) S.removedPairs = [];\n  try { _activePairKeepLive(); } catch (e) {}\n", 1)
    for g in (F08, F11): open(os.path.join(tmp, g), 'w', encoding='utf-8').write(s2 if g == f else src[g])
    r = subprocess.run(['node', os.path.join(ROOT, 'banc-n94.js')], capture_output=True, text=True, timeout=600, cwd=ROOT, env=dict(os.environ, BANC_ROOT=tmp))
    rs = re.findall(r'^  ❌ (R\d)', r.stdout, re.M)
    ok = r.returncode != 0 and len(rs) > 0
    tuees += ok
    print(('  ✅ tuée     ' if ok else '  ❌ SURVIT   ') + nom + ('  (' + ' '.join(rs) + ')' if rs else ''))
shutil.rmtree(tmp, ignore_errors=True)
print('%d/%d mutations tuées' % (tuees, len(M)))
sys.exit(0 if tuees == len(M) == vues else 1)
