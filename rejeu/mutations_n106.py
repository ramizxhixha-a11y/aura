# rejeu/mutations_n106.py — [GO N° 106 · 15/11/2026] chaque mutation casse EXPRÈS la livraison (08 _schoolVolFromReal : l'amplitude de l'école reposée au
# chargement depuis les bougies réelles gardées, règle de 02 ; son appel dans 09b2 loadState) ; banc-n106.js doit en voir chacune.
# usage : python3 -I rejeu/mutations_n106.py <racine du dépôt>      → « TUÉES : n / n » attendu
import os, sys, shutil, subprocess, tempfile
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
J8 = 'js/08-learning-history-render.js'
J9 = 'js/09b2-save-load.js'
J2 = 'js/02-state-init.js'
F = "function _schoolVolFromReal() {\n  if (_pricesFetched || typeof PAIRS === 'undefined' || !S || !S.realCandles || typeof S.realCandles !== 'object') return 0;"
DER = "      if (!(x && isFinite(x.c) && x.c > 0 && isFinite(x.ts))) return;\n      if (!k || x.ts > k.ts) k = x;\n      const y = a.find(b => b && b.ts === x.ts - 86400000 && isFinite(b.o) && b.o > 0);\n      if (y && (!r || x.ts > r.x.ts)) r = { x: x, y: y }; });"
CHG = "    const change24h  = (k.c - r.y.o) / r.y.o * 100;"
DR = "    const dailyRange = k.c * Math.abs(change24h) / 100;   // la règle de 02 (fetchBinancePrices, CoinGecko)"
POSE = "    if (dailyRange > 0) { cfg.vol = dailyRange / 9.8; n++; }"
SANS = "    if (!k || !r) return;"
BORNES = "  try { if (typeof _schoolBoundsFromReal === 'function') _schoolBoundsFromReal(); } catch(e) { dbg.push('bornes:err'); }\n"
APPEL = "  // [GO N° 106 · 15/11/2026] (ETAT n° 106) l'amplitude de l'école (cfg.vol) aussi, règle de 02 sur les bougies réelles gardées (08 _schoolVolFromReal)\n  try { if (typeof _schoolVolFromReal === 'function') _schoolVolFromReal(); } catch(e) { dbg.push('amplitude:err'); }\n"
DYN = "  } catch(e) { dbg.push('dynPairs:err'); }\n"
CANDLES = "  } catch(e) { dbg.push('candles:err'); }\n"
M = [
  (J8, '08 : plus de garde « prix réel déjà arrivé »', F, F.replace('_pricesFetched || ', '')),
  (J8, '08 : diviseur 5 (pas la règle de 02)', POSE, POSE.replace('/ 9.8', '/ 5')),
  (J8, '08 : la règle de 02 avec le terme × 0,3 sur la constante', POSE, "    if (dailyRange > 0) { cfg.vol = Math.max(cfg.vol * 0.3, dailyRange / 9.8); n++; }"),
  (J8, '08 : variation sans valeur absolue', DR, DR.replace('Math.abs(change24h)', 'change24h')),
  (J8, '08 : référence = clôture (pas l\'ouverture) 24 h avant', CHG, CHG.replace('r.y.o) / r.y.o', 'r.y.c) / r.y.c')),
  (J8, '08 : référence à 23 h (pas 24)', DER, DER.replace('x.ts - 86400000', 'x.ts - 82800000')),
  (J8, '08 : référence la plus ANCIENNE série', DER, DER.replace('x.ts > r.x.ts', 'x.ts < r.x.ts')),
  (J8, '08 : prix = bougie la plus ANCIENNE', DER, DER.replace('if (!k || x.ts > k.ts) k = x;', 'if (!k || x.ts < k.ts) k = x;')),
  (J8, '08 : prix = la dernière bougie de la série de référence', CHG, "    k = r.x;\n" + CHG),
  (J8, '08 : référence illisible acceptée', DER, DER.replace(' && isFinite(b.o) && b.o > 0', '')),
  (J8, '08 : sans référence, l\'amplitude est mise à 0', SANS, "    if (!k || !r) { if (cfg) cfg.vol = 0; return; }"),
  (J8, '08 : variation nulle acceptée (amplitude 0)', POSE, POSE.replace('dailyRange > 0', 'dailyRange >= 0')),
  (J8, '08 : compte des paires faux', POSE, POSE.replace(' n++;', '')),
  (J8, '08 : touche aussi les bornes', POSE, "    if (dailyRange > 0) { cfg.vol = dailyRange / 9.8; cfg.minP = k.c * 0.5; n++; }"),
  (J8, '08 : écrit dans les bougies réelles (la référence)', POSE, POSE + "\n    r.y.o = k.c;"),
  (J9, '09b2 : appel retiré', APPEL, ''),
  (J9, '09b2 : appel AVANT les paires candidates (DOT, BNB gardent les constantes)', APPEL, ''),
  (J2, '02 : la règle de Binance change (9,8 → 8) — 08 ne la suit plus', "      if (dailyRange > 0) cfg.vol = Math.max(((cfg.vol > 0 && isFinite(cfg.vol)) ? cfg.vol : 0) * 0.3, dailyRange / 9.8);   // [MODES SÉPARÉS · 10/10/2026] même garde que pour CoinGecko",
       "      if (dailyRange > 0) cfg.vol = Math.max(((cfg.vol > 0 && isFinite(cfg.vol)) ? cfg.vol : 0) * 0.3, dailyRange / 8);   // [MODES SÉPARÉS · 10/10/2026] même garde que pour CoinGecko"),
  ('js/09c-auto-open.js', '09c (décision) appelle la pose de l\'amplitude', "  const amount    = (stakeUsdt", "  _schoolVolFromReal(); const amount    = (stakeUsdt"),
  ('js/07-v90-mode-bunker-sos.js', '07 : un nouveau lecteur de cfg.vol', "function runDreamScenario(dreamRun, idx, onDone) {", "function runDreamScenario(dreamRun, idx, onDone) { const _v = PAIRS['ETH/USDT'].vol;"),
]
tues, vivants = 0, []
for fichier, nom, a, b in M:
    d = tempfile.mkdtemp(prefix='mut106-')
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
        r = subprocess.run(['node', os.path.join(R, 'banc-n106.js')], env=env, capture_output=True, text=True, timeout=600)
        echecs = [l.strip()[:60] for l in r.stdout.splitlines() if l.startswith('  ❌ ')]
        if r.returncode != 0 and echecs: tues += 1; print('  tuée   · ' + nom + ' → ' + ', '.join(e.split(' · ')[0].replace('❌ ', '') for e in echecs))
        else: vivants.append(nom); print('  VIVANTE · ' + nom)
    finally:
        shutil.rmtree(d, ignore_errors=True)
print('TUÉES : %d / %d' % (tues, len(M)) + ('' if not vivants else ' — vivantes : ' + ' ; '.join(vivants)))
sys.exit(0 if not vivants else 1)
