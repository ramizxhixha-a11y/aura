# rejeu/mutations_n101.py — [GO N° 101 · 15/11/2026] chaque mutation casse EXPRÈS la livraison (10h : section « ⚡ Levier de la paire » de la fiche MAN,
# _manPairLevParts / _manPairLevHtml / _manPairLevSync / _manPairLev, synchro dans _manRefreshTick) ; banc-n101.js doit en voir chacune.
# Écartée car ÉQUIVALENTE : retirer « window._manPairLev = _manPairLev; » (10h est un script classique : une fonction de premier niveau est déjà sur window).
# usage : python3 -I rejeu/mutations_n101.py <racine du dépôt>      → « TUÉES : n / n » attendu
import os, sys, shutil, subprocess, tempfile
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
JH = 'js/10h-pont-fullpower-bricks.js'
J3 = 'js/03-per-pair-position-buttons-controls-buid.js'
J2 = 'js/02-state-init.js'
APP = "  body.appendChild(levSection);\n"
CONS = "  body.appendChild(consignesSection);\n"
CALL = "  if (typeof changePairLev === 'function') changePairLev(pair, d);\n"
IX0 = "const ix0 = (Number(S.leverage) || 0) === 0"
M = [
  (JH, 'section jamais ajoutée à la fiche', APP, ''),
  (JH, 'section seulement sans position (la voix ne la voit pas)', APP, "  if (!manualPos) body.appendChild(levSection);\n"),
  (JH, 'section après les consignes', None, None),
  (JH, '− monte, + descend', CALL, CALL.replace('(pair, d)', '(pair, -d)')),
  (JH, 'écrit le levier lui-même (sans les bornes de 03)', CALL, "  S.pairStates[pair].pairLeverage = Math.max(1, (S.pairStates[pair].pairLeverage || 1) + d);\n"),
  (JH, 'écran pas mis à jour après le clic', "  _manPairLevSync(pair);\n}\nwindow._manPairLev", "}\nwindow._manPairLev"),
  (JH, 'rafraîchissement sans la synchro', "    _manPairLevSync(pair);   // [GO N° 101]", "    // _manPairLevSync(pair);   // [GO N° 101]"),
  (JH, 'index ×0 lu à l\'envers', IX0, IX0.replace('=== 0', '!== 0')),
  (JH, '« inactif » même à ×1', "(L > 1 && ix0 ?", "(ix0 ?"),
  (JH, 'couleur : toujours or', "col: L === 1 ? 'var(--up)'", "col: L === 0 ? 'var(--up)'"),
  (JH, 'nom du mode figé sur l\'EV', "_modeLab() : ''", "_modeLab('paperReal') : ''"),
  (JH, 'bouton − appelle +', "onclick=\"_manPairLev('${pair}',-1)\"", "onclick=\"_manPairLev('${pair}',1)\""),
  (JH, 'change les 3 modes à la fois', CALL, CALL + "  if (S.walletStore) Object.values(S.walletStore).forEach(w => { if (w && w.pairStates && w.pairStates[pair]) w.pairStates[pair].pairLeverage = S.pairStates[pair].pairLeverage; });\n"),
  (JH, 'touche aussi la mise de la paire', CALL, CALL + "  S.pairStates[pair].stake = Math.round(S.pairStates[pair].stake * S.pairStates[pair].pairLeverage);\n"),
  (JH, 'valeur montrée = mise × levier', "id=\"manPairLev_${k}\" style=\"font-family:var(--font-mono);font-size:14px;font-weight:800;min-width:34px;text-align:center;color:${P.col};\">×${P.L}</span>", "id=\"manPairLev_${k}\" style=\"font-family:var(--font-mono);font-size:14px;font-weight:800;min-width:34px;text-align:center;color:${P.col};\">×${P.L * 2}</span>"),
  (J3, '03 : plafond ramené à 10', "ps.pairLeverage = Math.max(1, Math.min(20, (ps.pairLeverage||1) + delta));", "ps.pairLeverage = Math.max(1, Math.min(10, (ps.pairLeverage||1) + delta));"),
  (J2, '02 : « ✓ Appliquer » force ×1', "  const _origStake = ps.stake;\n  ps.stake = safeStake;", "  const _origStake = ps.stake;\n  ps.stake = safeStake; ps.pairLeverage = 1;"),
]
tues, vivants = 0, []
for fichier, nom, a, b in M:
    d = tempfile.mkdtemp(prefix='mut101-')
    try:
        for x in ('js', 'banc-fixtures'): shutil.copytree(os.path.join(R, x), os.path.join(d, x))
        for x in ('AURA8_v118.html', 'aura-guardian.html', 'guardian-core.js', 'guardian-embed.js'):
            if os.path.exists(os.path.join(R, x)): shutil.copy(os.path.join(R, x), os.path.join(d, x))
        p = os.path.join(d, fichier); s = open(p, encoding='utf-8').read()
        if a is None:   # section après les consignes
            assert s.count(APP) == 1 and s.count(CONS) == 1, ('ancre', nom)
            s = s.replace(APP, '').replace(CONS, CONS + APP)
        else:
            assert s.count(a) == 1, ('ancre', nom, s.count(a))
            s = s.replace(a, b)
        open(p, 'w', encoding='utf-8').write(s)
        env = dict(os.environ, BANC_ROOT=d)
        r = subprocess.run(['node', os.path.join(R, 'banc-n101.js')], env=env, capture_output=True, text=True, timeout=600)
        echecs = [l.strip()[:60] for l in r.stdout.splitlines() if l.startswith('  ❌ ')]
        if r.returncode != 0 and echecs: tues += 1; print('  tuée   · ' + nom + ' → ' + ', '.join(e.split(' · ')[0].replace('❌ ', '') for e in echecs))
        else: vivants.append(nom); print('  VIVANTE · ' + nom)
    finally:
        shutil.rmtree(d, ignore_errors=True)
print('TUÉES : %d / %d' % (tues, len(M)) + ('' if not vivants else ' — vivantes : ' + ' ; '.join(vivants)))
sys.exit(0 if not vivants else 1)
