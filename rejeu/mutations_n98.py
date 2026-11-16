# rejeu/mutations_n98.py — [GO N° 98 · 15/11/2026] chaque mutation remet le pont MUET SANS signal (ou le rend bavard, ou casse la marque) dans une
# copie de 17b ; banc-n98.js doit échouer sur chacune (« tuée »). Une ancre absente = le code a changé : mettre la mutation à jour.
# Usage : python3 -I rejeu/mutations_n98.py <racine du dépôt>
import os, subprocess, sys, tempfile
ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
B = 'js/17b-pont-direct.js'
MUET = "function muet(code) { var m = memoire(), t = now(); if (!m.muet) { m.muet = t; memSauve(); } else if (code && t - m.muet >= VERIF_MS) signaler(code); }"
VERD = "    if (v.code === 'reseau' || v.code === 'limite') muet('controle'); else if (v.code === '401' || v.code === 'acces') muet(null);"
ETAT = "          muet((r.st === 401 || ((r.st === 403 || r.st === 404) && !r.attente)) ? null : 'etat');"
ROUTE = "if (s === null && memoire(true).actif) { signaler('disparu'); couper(DISPARU, true); return; } "
DISP = "function disparu() { guetter(false); if (actif || pat || lsLit(LS_PAT) !== null || !memoire(true).actif) return; if (enLigne()) signaler('disparu'); else guetter(true); }"
GUET = "function guetter(on) { try { if (guet) window.removeEventListener('online', guet); guet = on ? disparu : null; if (guet) window.addEventListener('online', guet); } catch (e) {} }"
NORM = "    if (m.actif === 1) n.actif = 1; if (passe(m.muet)) n.muet = passe(m.muet); if (mem) { if (!n.actif) delete mem.actif; if (!n.muet) delete mem.muet; }"
DEM = "function demarrer() { actif = true; ecouter(); guetter(false); if (!memoire().inst || !mem.actif) { if (!mem.inst) mem.inst = now().toString(36); mem.actif = 1; memSauve(); }"
COUP = "function couper(msg, sansEffacer) { if (!sansEffacer) { var m = memoire(true); if (m.actif) { delete m.actif; memSauve(); } }"
BOOT = "  if (!pat && memoire().actif) { st.msg = DISPARU; setTimeout(disparu, BOOT_MS); }"
M = [
 ('muet ne signale jamais (le n° 98 refait)', MUET, MUET.replace(' else if (code && t - m.muet >= VERIF_MS) signaler(code);', '')),
 ('muet signale dès la 1re réponse ratée', MUET, MUET.replace('t - m.muet >= VERIF_MS', 't - m.muet >= 0')),
 ('muet : seuil d\'une heure', MUET, MUET.replace('>= VERIF_MS', '>= 3600000')),
 ('muet : 401 / accès signalent aussi « controle »', MUET, MUET.replace('if (code && t', 'if (t').replace('signaler(code)', "signaler(code || 'controle')")),
 ('début de panne non sauvé (perdu au rechargement)', MUET, MUET.replace('m.muet = t; memSauve();', 'm.muet = t;')),
 ('début de panne repoussé à chaque échec', MUET, MUET.replace('if (!m.muet) { m.muet = t; memSauve(); } else ', 'm.muet = m.muet || t; if (m.muet !== t) m.muet = t; ')),
 ('début de panne oublié au chargement', NORM, NORM.replace(' if (passe(m.muet)) n.muet = passe(m.muet);', '')),
 ('début de panne non effacé au 1er etat.json', "st.ticMax = 0; delete m.muet; etatDu", "st.ticMax = 0; etatDu"),
 ('verdict : « non concluant » (reseau) ne compte pas', VERD, VERD.replace("v.code === 'reseau' || ", '')),
 ('verdict : limite dite ne compte pas', VERD, VERD.replace(" || v.code === 'limite'", '')),
 ('verdict : 401 / accès hors de la panne', VERD, VERD.replace(" else if (v.code === '401' || v.code === 'acces') muet(null);", '')),
 ('verdict : 401 signale aussi « controle »', VERD, VERD.replace('muet(null)', "muet('controle')")),
 ('etat.json refusé : pas compté', ETAT, ''),
 ('etat.json : 401 compté comme « etat »', ETAT, ETAT.replace("? null : 'etat'", "? 'etat' : 'etat'")),
 ('réseau coupé compté comme panne', "    } catch (e) { if (e && e.reseau === 1) echec({ st: 0,", "    } catch (e) { if (e && e.reseau === 1) muet('etat'), echec({ st: 0,"),   # [GO N° 107 · 16/11/2026] ancre au texte du jour (branche réseau du battement)
 ('PAT disparu en route : arrêt muet (le n° 98 refait)', ROUTE, ''),
 ('PAT disparu en route : sans signal', ROUTE, ROUTE.replace("signaler('disparu'); ", '')),
 ('PAT disparu en route : la marque effacée', ROUTE, ROUTE.replace('couper(DISPARU, true)', 'couper(DISPARU)')),
 ('PAT disparu en route : mémoire non relue (Couper d\'un autre onglet pris pour une disparition)', ROUTE, ROUTE.replace('memoire(true).actif', 'memoire().actif')),
 ('lancement : marque sans PAT ignorée', BOOT, ''),
 ('lancement : signal sans attendre 1 min', BOOT, BOOT.replace('setTimeout(disparu, BOOT_MS)', 'disparu()')),
 ('lancement : la ligne ne dit pas la disparition', BOOT, BOOT.replace('st.msg = DISPARU; ', '')),
 ('disparu : hors ligne, signal perdu (pas d\'attente du réseau)', DISP, DISP.replace('if (enLigne()) signaler(\'disparu\'); else guetter(true);', "signaler('disparu');")),
 ('disparu : hors ligne, plus jamais rien', DISP, DISP.replace(' else guetter(true);', '')),
 ('disparu : signale même si Rams a réactivé', DISP, DISP.replace('if (actif || pat || ', 'if (')),
 ('écouteur « online » jamais retiré', GUET, GUET.replace("if (guet) window.removeEventListener('online', guet); ", '')),
 ('demarrer ne pose pas la marque', DEM, DEM.replace(' mem.actif = 1;', '')),
 ('demarrer laisse l\'attente du réseau', DEM, DEM.replace(' guetter(false);', '')),
 ('Couper ne retire pas la marque', COUP, COUP.replace(' if (m.actif) { delete m.actif; memSauve(); }', '')),
 ('Couper réécrit une mémoire périmée', COUP, COUP.replace('memoire(true)', 'memoire()')),
 ('Couper retire la marque APRÈS le PAT', COUP + "   // go n° 98", "function couper(msg, sansEffacer) { if (!sansEffacer) lsDel(LS_PAT); if (!sansEffacer) { var m = memoire(true); if (m.actif) { delete m.actif; memSauve(); } }   // go n° 98"),
 ('marque perdue au chargement', NORM, NORM.replace('if (m.actif === 1) n.actif = 1; ', '')),
 ('marque retirée ailleurs mais gardée en main', NORM, NORM.replace('if (!n.actif) delete mem.actif; ', '')),
 ('motif « disparu » absent', ", disparu: 'coupé · le PAT a disparu", ", partie: 'coupé · le PAT a disparu"),
 ('motif « controle » absent', "    controle: 'muet · contrôle", "    ctrl: 'muet · contrôle"),
 ('motif « etat » absent', ", etat: 'muet · etat.json", ", etats: 'muet · etat.json"),
]
tmp = tempfile.mkdtemp(prefix='mut-n98-')
src = open(os.path.join(ROOT, B), encoding='utf-8').read()
p = os.path.join(tmp, '17b.js')
tuees, vues = 0, 0
for nom, a, b in M:
    if src.count(a) != 1: print('  ⚠ ancre introuvable (%d) : %s' % (src.count(a), nom)); continue
    vues += 1
    open(p, 'w', encoding='utf-8').write(src.replace(a, b))
    r = subprocess.run(['node', os.path.join(ROOT, 'banc-n98.js'), p], capture_output=True, text=True, timeout=600, cwd=ROOT)
    ok = r.returncode != 0
    tuees += ok
    print(('  ✅ tuée     ' if ok else '  ❌ SURVIT   ') + nom)
print('%d/%d mutations tuées' % (tuees, len(M)))
sys.exit(0 if tuees == len(M) == vues else 1)
