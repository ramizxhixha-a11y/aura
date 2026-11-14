# rejeu/mutations_pont_signal.py — [GO PONT · 14/11/2026] chaque mutation remet le pont en silence (ou le rend bavard, ou fait fuir du texte
# de GitHub) dans une copie de 17b ou de 00s ; banc-pont-signal.js (17b) ou banc-sentry.js (00s) doit échouer sur chacune (« tuée »).
# Usage : python3 -I rejeu/mutations_pont_signal.py <racine du dépôt>
import os, shutil, subprocess, sys, tempfile
ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
B, S = 'js/17b-pont-direct.js', 'js/00s-sentry.js'
ECHEC = "    if (r && (r.st === 401 || ((r.st === 403 || r.st === 404) && !r.attente))) { signaler(r.st === 401 ? '401' : 'acces'); st.msg = ghMsg(r) + GESTE; }\n"
GESTE = "    if (v.code === '401' || v.code === 'acces') st.msg += GESTE;\n"
APPEL = "if (s && typeof s.signal === 'function') s.signal('AURA8 · Pont direct ' + SIGNAUX[code]);"
GARDE = "if (!Object.prototype.hasOwnProperty.call(SIGNAUX, code) || signales[code] || (m.sig && m.sig[code] === j)) return; signales[code] = 1; (m.sig = m.sig || {})[code] = j; memSauve();"
LENTE = "if (!o.attente && (o.st === 403 || o.st === 429) && o.j && /rate limit/i.test(String(o.j.message || ''))) o.attente = 60000 * Math.pow(2, Math.min(st.suite, 5)); return o; }"
VERDICT = "    if (!actif) return;\n    incident(v.msg);\n    signaler(v.code);\n"
DEBUT_ECHEC = "    if (!actif) return;   // coupé entre-temps : l'état « coupé » reste\n    st.echecs++; st.suite++; incident(ghMsg(r));\n"
LIGNE_S = "    try { SDK.withScope(function (scope) { etiquettes(scope, false); scope.setLevel('error'); SDK.captureMessage(texte.slice(0, 200)); }); } catch (x) {}\n"
M = [
 ('verdict ne signale plus (le 10/11 refait)', B, "    incident(v.msg);\n    signaler(v.code);\n", "    incident(v.msg);\n"),
 ('echec ne signale plus (révoqué en route)', B, ECHEC, ECHEC.replace("signaler(r.st === 401 ? '401' : 'acces'); ", '')),
 ('echec : plus de geste à la ligne (une heure sans le dire)', B, ECHEC, ECHEC.replace(' st.msg = ghMsg(r) + GESTE;', '')),
 ('echec : un 404 en route ne signale plus', B, ECHEC, ECHEC.replace('(r.st === 403 || r.st === 404)', 'r.st === 403')),
 ('une limite dite (403 + attente) vaut accès perdu', B, ECHEC, ECHEC.replace(' && !r.attente', '')),
 ('echec signale avant « coupé entre-temps »', B, DEBUT_ECHEC + "    var p;\n", "    if (r && r.st === 401) signaler('401');\n" + DEBUT_ECHEC + "    var p;\n"),
 ('verdict signale avant « coupé entre-temps »', B, VERDICT, "    signaler(v.code);\n    if (!actif) return;\n    incident(v.msg);\n"),
 ('un signal à chaque essai', B, GARDE, "if (!Object.prototype.hasOwnProperty.call(SIGNAUX, code)) return; (m.sig = m.sig || {})[code] = j; memSauve();"),
 ('mémoire « sig » écrite pour un motif sans signal (réseau, limite)', B, "m = memoire(); if (!Object.prototype.hasOwnProperty.call(SIGNAUX, code)", "m = memoire(); m.sig = m.sig || {}; memSauve(); if (!Object.prototype.hasOwnProperty.call(SIGNAUX, code)"),
 ('un seul signal par chargement, tous motifs confondus', B, GARDE, GARDE.replace('signales[code] ||', "signales.tout ||").replace('signales[code] = 1;', 'signales.tout = 1;').replace('(m.sig && m.sig[code] === j)', '(m.sig && m.sig.tout === j)').replace('(m.sig = m.sig || {})[code] = j', '(m.sig = m.sig || {}).tout = j')),
 ('un signal par chargement (pas de mémoire du jour)', B, GARDE, GARDE.replace(' || (m.sig && m.sig[code] === j)', '')),
 ('la mémoire du jour ne survit pas au rechargement', B, "(n.sig = n.sig || {})[k] = v; });", "(n.sig = n.sig || {})[k] = v; }); delete n.sig;"),
 ('la mémoire du jour écrite même sans signal', B, "(n.sig = n.sig || {})[k] = v; });", "(n.sig = n.sig || {})[k] = v; }); n.sig = n.sig || {};"),
 ('le message de GitHub part dans le signal', B, APPEL, APPEL.replace("SIGNAUX[code]);", "SIGNAUX[code] + ' · ' + st.err);")),
 ('PAT trop large coupé sans signal', B, "    large: 'coupé · PAT trop large", "    trop: 'coupé · PAT trop large"),
 ('dépôt public coupé sans signal', B, ", public: 'coupé · aura-pont public", ", publik: 'coupé · aura-pont public"),
 ('accès perdu sans signal', B, ", acces: 'suspendu · le PAT ne voit plus", ", acc: 'suspendu · le PAT ne voit plus"),
 ('la ligne ne dit plus le geste (verdict)', B, GESTE, ''),
 ('le geste dit même pour le réseau', B, GESTE, GESTE.replace("if (v.code === '401' || v.code === 'acces') ", '')),
 ('le geste dit aussi pour une limite', B, GESTE, GESTE.replace("if (v.code === '401' || v.code === 'acces') ", "if (v.code !== 'reseau') ")),
 ('Sentry qui lève casse le battement', B, "s.signal('AURA8 · Pont direct ' + SIGNAUX[code]); } catch (e) {} }", "s.signal('AURA8 · Pont direct ' + SIGNAUX[code]); } finally {} }"),
 ('signal quand Rams colle lui-même', B, "      if (!v.ok) { st.msg = '⛔ ' + v.msg;", "      if (!v.ok) { signaler(v.code); st.msg = '⛔ ' + v.msg;"),
 ('signal sur toute panne', B, "    st.pauseUntil = now() + p;\n" + ECHEC, "    st.pauseUntil = now() + p;\n    signaler('401');\n"),
 ('limite secondaire prise pour un accès perdu (relecture C4)', B, "return lente(out); }", "return out; }"),
 ('un 429 nu vaut accès perdu', B, ECHEC, ECHEC.replace('(r.st === 403 || r.st === 404)', '(r.st === 403 || r.st === 404 || r.st === 429)')),
 ('limite secondaire : pas de doublement', B, LENTE, LENTE.replace(' * Math.pow(2, Math.min(st.suite, 5))', '')),
 ('limite secondaire : tout 403 est une limite', B, LENTE, LENTE.replace(" && o.j && /rate limit/i.test(String(o.j.message || ''))", '')),
 ('00s : signal au niveau warning (personne n\'est prévenu)', S, LIGNE_S, LIGNE_S.replace("'error'", "'warning'")),
 ('00s : signal marqué avalee=oui', S, LIGNE_S, LIGNE_S.replace('etiquettes(scope, false)', 'etiquettes(scope, true)')),
 ('00s : texte non coupé', S, LIGNE_S, LIGNE_S.replace('texte.slice(0, 200)', 'texte')),
 ('00s : signal sans portée propre (pollue les envois suivants)', S, LIGNE_S, "    try { var scope = SDK.getCurrentScope(); etiquettes(scope, false); scope.setLevel('error'); SDK.captureMessage(texte.slice(0, 200)); } catch (x) {}\n"),
 ('00s : n\'importe quel texte accepté', S, "typeof texte !== 'string' || texte.indexOf('AURA8 · ') !== 0) return;", "typeof texte !== 'string' || !texte) return;"),
 ('00s : signal absent de l\'API', S, "    signal: signal,\n", ''),
]
tmp = tempfile.mkdtemp(prefix='mut-pont-')
src = os.path.join(tmp, 'src'); shutil.copytree(ROOT, src, ignore=shutil.ignore_patterns('.git', 'backups', 'node_modules', 'out'))
tuees, vues = 0, 0
for nom, f, a, b in M:
    p = os.path.join(src, f); t = open(p, encoding='utf-8').read()
    if t.count(a) != 1: print('  ⚠ ancre introuvable (%d) : %s' % (t.count(a), nom)); continue
    vues += 1
    open(p, 'w', encoding='utf-8').write(t.replace(a, b))
    if f == B: cmd, env = ['node', os.path.join(ROOT, 'banc-pont-signal.js'), p], dict(os.environ)
    else: cmd, env = ['node', os.path.join(ROOT, 'banc-sentry.js')], dict(os.environ, BANC_ROOT=src)
    r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=600, cwd=ROOT)
    open(p, 'w', encoding='utf-8').write(t)
    ok = r.returncode != 0
    tuees += ok
    print(('  ✅ tuée     ' if ok else '  ❌ SURVIT   ') + nom)
shutil.rmtree(tmp, ignore_errors=True)
print('%d/%d mutations tuées' % (tuees, len(M)))
sys.exit(0 if tuees == len(M) == vues else 1)
