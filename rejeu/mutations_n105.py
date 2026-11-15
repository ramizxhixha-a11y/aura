# rejeu/mutations_n105.py — [GO N° 105 · 15/11/2026] chaque mutation casse EXPRÈS la livraison (08 _schoolBoundsFromReal : les bornes de l'école reposées au
# chargement depuis le dernier prix réel gardé ; son appel dans 09b2 loadState) ; banc-n105.js doit en voir chacune.
# usage : python3 -I rejeu/mutations_n105.py <racine du dépôt>      → « TUÉES : n / n » attendu
import os, sys, shutil, subprocess, tempfile
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
J8 = 'js/08-learning-history-render.js'
J9 = 'js/09b2-save-load.js'
J2 = 'js/02-state-init.js'
GARDE = "  if (_pricesFetched || typeof PAIRS === 'undefined' || !S || !S.realCandles || typeof S.realCandles !== 'object') return 0;"
CHOIX = "      if (x && isFinite(x.c) && x.c > 0 && isFinite(x.ts) && (!k || x.ts > k.ts)) k = x; });"
POSE = "    cfg.minP = k.c * 0.65; cfg.maxP = k.c * 1.55; n++;"
APPEL = "  // [GO N° 105 · 15/11/2026] (ETAT n° 105) les bornes du prix de l'école repartent du dernier prix réel gardé (08 _schoolBoundsFromReal), après les paires du code et des candidats (plus haut)\n  try { if (typeof _schoolBoundsFromReal === 'function') _schoolBoundsFromReal(); } catch(e) { dbg.push('bornes:err'); }\n"
DYN = "  } catch(e) { dbg.push('dynPairs:err'); }\n"
CANDLES = "  } catch(e) { dbg.push('candles:err'); }\n"
M = [
  (J8, '08 : plus de garde « prix réel déjà arrivé »', GARDE, GARDE.replace('_pricesFetched || ', '')),
  (J8, '08 : borne basse × 0,5 (pas la règle de 02)', POSE, POSE.replace('k.c * 0.65', 'k.c * 0.5')),
  (J8, '08 : borne haute × 2', POSE, POSE.replace('k.c * 1.55', 'k.c * 2')),
  (J8, '08 : la bougie la plus ANCIENNE', CHOIX, CHOIX.replace('x.ts > k.ts', 'x.ts < k.ts')),
  (J8, '08 : le seul intervalle 5 min', "    Object.keys(rc).forEach(iv => {", "    ['5m'].forEach(iv => {"),
  (J8, '08 : clôture nulle ou négative acceptée', CHOIX, CHOIX.replace(' && x.c > 0', '')),
  (J8, '08 : date illisible acceptée', CHOIX, CHOIX.replace(' && isFinite(x.ts)', '')),
  (J8, '08 : compte des paires faux', POSE, POSE.replace(' n++;', '')),
  (J8, '08 : touche aussi l\'amplitude (cfg.vol)', POSE, POSE + ' cfg.vol = k.c * 0.01;'),
  (J8, '08 : la borne de _simCandleStep retirée', "    ps.price = _pricesFetched ? c : Math.max(cfg.minP, Math.min(cfg.maxP, c));", "    ps.price = c;"),
  (J9, '09b2 : appel retiré', APPEL, ''),
  (J9, '09b2 : appel AVANT les paires candidates (DOT, BNB gardent les constantes)', DYN + APPEL, DYN),
  (J2, '02 : la règle de Binance change (0,6) — 08 ne la suit plus', "      cfg.minP = realPrice * 0.65;\n      cfg.maxP = realPrice * 1.55;\n      const dailyRange = realPrice", "      cfg.minP = realPrice * 0.6;\n      cfg.maxP = realPrice * 1.55;\n      const dailyRange = realPrice"),
  ('js/09c-auto-open.js', '09c (décision) appelle la pose des bornes', "  const amount    = (stakeUsdt", "  _schoolBoundsFromReal(); const amount    = (stakeUsdt"),
]
tues, vivants = 0, []
for fichier, nom, a, b in M:
    d = tempfile.mkdtemp(prefix='mut105-')
    try:
        for x in ('js', 'banc-fixtures'): shutil.copytree(os.path.join(R, x), os.path.join(d, x))
        for x in ('AURA8_v118.html', 'aura-guardian.html', 'guardian-core.js', 'guardian-embed.js'):
            if os.path.exists(os.path.join(R, x)): shutil.copy(os.path.join(R, x), os.path.join(d, x))
        p = os.path.join(d, fichier); s = open(p, encoding='utf-8').read()
        if nom.startswith('09b2 : appel AVANT'):
            assert s.count(a) == 1 and s.count(CANDLES) == 1, ('ancre', nom)
            s = s.replace(a, b).replace(CANDLES, CANDLES + APPEL)
        else:
            assert s.count(a) == 1, ('ancre', nom, s.count(a))
            s = s.replace(a, b)
        open(p, 'w', encoding='utf-8').write(s)
        env = dict(os.environ, BANC_ROOT=d)
        r = subprocess.run(['node', os.path.join(R, 'banc-n105.js')], env=env, capture_output=True, text=True, timeout=600)
        echecs = [l.strip()[:60] for l in r.stdout.splitlines() if l.startswith('  ❌ ')]
        if r.returncode != 0 and echecs: tues += 1; print('  tuée   · ' + nom + ' → ' + ', '.join(e.split(' · ')[0].replace('❌ ', '') for e in echecs))
        else: vivants.append(nom); print('  VIVANTE · ' + nom)
    finally:
        shutil.rmtree(d, ignore_errors=True)
print('TUÉES : %d / %d' % (tues, len(M)) + ('' if not vivants else ' — vivantes : ' + ' ; '.join(vivants)))
sys.exit(0 if not vivants else 1)
