# rejeu/retours_gen.py — [GO AFFICHAGE 3 · 15/11/2026] écrit un fichier « retours » (banc-fixtures/<nom>-retours.json) : pour chaque fichier js/ changé depuis
# le commit d'avant, la liste des blocs [nouveau, ancien] (avec assez de contexte pour être UNIQUES dans le fichier livré), appliqués dans l'ordre par
# banc-fixtures/sans-<nom>.js. Vérifie qu'appliqués au fichier livré ils redonnent le fichier d'avant AU CARACTÈRE PRÈS (sinon : arrêt).
#   python3 -I rejeu/retours_gen.py <commit d'avant> <sortie.json> <fichier> [<fichier>…]      (à la racine du dépôt)
import sys, json, difflib, subprocess
base, out, files = sys.argv[1], sys.argv[2], sys.argv[3:]
R = {}
for f in files:
    old = subprocess.check_output(['git', 'show', base + ':' + f]).decode('utf-8')
    new = open(f, encoding='utf-8').read()
    if old == new: continue
    a, b = old.split('\n'), new.split('\n')
    ops = [o for o in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if o[0] != 'equal']
    pairs, cur = [], new
    for tag, i1, i2, j1, j2 in ops:
        k = 1
        while True:
            lo_a, hi_a, lo_b, hi_b = max(0, i1 - k), min(len(a), i2 + k), max(0, j1 - k), min(len(b), j2 + k)
            nb, ob = '\n'.join(b[lo_b:hi_b]), '\n'.join(a[lo_a:hi_a])
            if (lo_b > 0 or hi_b < len(b)) and cur.count(nb) == 1: break
            k += 1
            assert k < 60, (f, i1, j1)
        pairs.append([nb, ob])
    # vérification : appliqués dans l'ordre (chacun UNE fois), ils redonnent l'ancien fichier
    s = new
    for nb, ob in pairs:
        assert s.count(nb) == 1, (f, nb[:80])
        s = s.replace(nb, ob, 1)
    assert s == old, f + ' : les retours ne redonnent pas le fichier d\'avant'
    R[f] = pairs
json.dump(R, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(out, {k: len(v) for k, v in R.items()})
