# rejeu/mutations_n107.py — [GO N° 107 · 16/11/2026] chaque mutation refait le n° 107 (une faute de CODE prise pour le réseau), ou le rend faux
# autrement (le réseau pris pour une faute, rien à Sentry, le message d'origine qui part, pas de pause…) dans une copie de 17b ; banc-n107.js doit
# échouer sur chacune (« tuée »). Une ancre absente = le code a changé : mettre la mutation à jour.
# Usage : python3 -I rejeu/mutations_n107.py <racine du dépôt>
import os, subprocess, sys, tempfile
ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
B = 'js/17b-pont-direct.js'
CATCH = "    } catch (e) { if (e && e.reseau === 1) echec({ st: 0, j: { message: txt(e && e.message, 110) } }); else faute(e); }"
RES = "function reseau(e) { var x = new Error(txt(e && e.message !== undefined ? e.message : e, 200)); x.reseau = 1; return x; }"
FAUTE = "function faute(e) { if (!actif) return; muet('code'); avaler(e); st.echecs++; st.suite++; incident('faute de code : ' + txt(e && e.message !== undefined ? e.message : e, 110)); st.pauseUntil = now() + Math.min(PAUSE_MAX, POLL_MS * Math.pow(2, Math.min(st.suite, 5))); }"
NOM = "if (e && typeof e.name === 'string' && /^[A-Za-z]{1,40}$/.test(e.name)) x.name = e.name;"
PILE = "x.stack = [x.name + ': ' + x.message].concat(p.split('\\n').filter(function (l) { return /^\\s+at /.test(l); })).join('\\n');"
ENV = "if (s && typeof s.avalee === 'function') s.avalee(x);"
REJ = "      }, function (e) { throw reseau(e); }).then(function (o) { fin(); oui(o); }, function (e) { fin(); rate(e); });"
SIG = ", code: 'muet · faute de code dans son battement depuis 24 h (pas une coupure du réseau)' }"
M = [
 ('le n° 107 refait : toute exception = réseau', CATCH, "    } catch (e) { echec({ st: 0, j: { message: txt(e && e.message, 110) } }); }"),
 ('toute exception = faute (le réseau aussi)', CATCH, CATCH.replace('if (e && e.reseau === 1)', 'if (false)')),
 ('test du réseau inversé', CATCH, CATCH.replace('e.reseau === 1', 'e.reseau !== 1')),
 ('reseau() ne marque plus', RES, RES.replace(' x.reseau = 1;', '')),
 ('reseau() perd le message', RES, RES.replace('txt(e && e.message !== undefined ? e.message : e, 200)', "''")),
 ('délai dépassé non marqué', "rate(reseau('délai dépassé'));", "rate(new Error('délai dépassé'));"),
 ('requête rejetée non marquée', REJ, REJ.replace('}, function (e) { throw reseau(e); }).then(', '}).then(')),
 ('marque trop large : une faute dans le traitement de la réponse passe pour le réseau', REJ, REJ.replace('function (e) { fin(); rate(e); });', 'function (e) { fin(); rate(reseau(e)); });')),
 ('faute : pas de début de panne', FAUTE, FAUTE.replace("muet('code'); ", '')),
 ('faute : début de panne sans motif (jamais de signal)', FAUTE, FAUTE.replace("muet('code')", 'muet(null)')),
 ('faute : rien à Sentry', FAUTE, FAUTE.replace('avaler(e); ', '')),
 ('faute : agit même pont coupé', FAUTE, FAUTE.replace('if (!actif) return; ', '')),
 ('faute : pas de pause (un essai toutes les 15 s)', FAUTE, FAUTE.replace(' st.pauseUntil = now() + Math.min(PAUSE_MAX, POLL_MS * Math.pow(2, Math.min(st.suite, 5)));', '')),
 ('faute : suite non comptée (pause de 15 s)', FAUTE, FAUTE.replace('st.suite++; ', '')),
 ('faute : échecs non comptés', FAUTE, FAUTE.replace('st.echecs++; ', '')),
 ('faute : la ligne dit encore « réseau »', FAUTE, FAUTE.replace("'faute de code : '", "'réseau « '")),
 ('avalee : le message d\'origine part', "new Error('AURA8 · Pont direct · faute de code dans le battement')", "new Error(String(e && e.message))"),
 ('avalee : nom non contrôlé', NOM, "if (e && e.name) x.name = e.name;"),
 ('avalee : type perdu (toujours Error)', NOM, ''),
 ('avalee : toute la pile, message compris', PILE, PILE.replace('return /^\\s+at /.test(l);', 'return true;')),
 ('avalee : pile retirée', PILE, "x.stack = x.name + ': ' + x.message;"),
 ('avalee : l\'Error d\'origine envoyée', ENV, ENV.replace('s.avalee(x)', 's.avalee(e)')),
 ('avalee : par signal (texte, pas de pile)', ENV, ENV.replace("typeof s.avalee === 'function') s.avalee(x)", "typeof s.signal === 'function') s.signal(x.message)")),
 ('motif « code » absent de SIGNAUX', SIG, SIG.replace(', code:', ', kode:')),
]
tmp = tempfile.mkdtemp(prefix='mut-n107-')
src = open(os.path.join(ROOT, B), encoding='utf-8').read()
p = os.path.join(tmp, '17b.js')
tuees, vues = 0, 0
for nom, a, b in M:
    if src.count(a) != 1: print('  ⚠ ancre introuvable (%d) : %s' % (src.count(a), nom)); continue
    vues += 1
    open(p, 'w', encoding='utf-8').write(src.replace(a, b))
    r = subprocess.run(['node', os.path.join(ROOT, 'banc-n107.js'), p], capture_output=True, text=True, timeout=600, cwd=ROOT)
    ok = r.returncode != 0
    tuees += ok
    print(('  ✅ tuée     ' if ok else '  ❌ SURVIT   ') + nom)
print('%d/%d mutations tuées' % (tuees, len(M)))
sys.exit(0 if tuees == len(M) == vues else 1)
