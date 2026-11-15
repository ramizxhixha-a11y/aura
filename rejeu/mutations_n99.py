# rejeu/mutations_n99.py — [GO N° 99 · 15/11/2026] chaque retouche de go n° 99 cassée exprès, une à la fois : banc-n99.js doit échouer à CHAQUE fois.
# Usage : python3 -I rejeu/mutations_n99.py .          (--liste : vérifie seulement que chaque ancre existe une seule fois)
# Copie js/, le HTML et les fichiers de Guardian dans un dossier temporaire, applique la mutation, lance `BANC_ROOT=<copie> node banc-n99.js`.
import os, shutil, subprocess, sys, tempfile

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else '.')
F02, F07, F10E, F10H = 'js/02-state-init.js', 'js/07-v90-mode-bunker-sos.js', 'js/10e-helpers-adaptatifs.js', 'js/10h-pont-fullpower-bricks.js'
M = [
  (F02, "if (!(a > 0) || g >= a - 0.005) return null;", "if (!(a > 0) || g >= a - 1000) return null;", 'réduction jamais vue'),
  (F02, "if ((Number(S.leverage) || 0) === 0) return 'levier général ×0 : aucun emprunt';", "if ((Number(S.leverage) || 0) === 1) return 'levier général ×0 : aucun emprunt';", 'raison index ×0 sur le mauvais index'),
  (F02, "if ((Number(S.leverage) || 0) === 0) return 'levier général ×0 : aucun emprunt';\n", "", 'raison index ×0 retirée'),
  (F02, "if ((Number(S.leverageBorrowed) || 0) + a > cap) return", "if (false) return", 'raison plafond retirée'),
  (F02, "if (a < 10) return 'part à emprunter", "if (a < 1) return 'part à emprunter", 'raison minimum 10 $ faussée'),
  (F02, "fmt$2(g) + ' empruntés sur ' + fmt$2(a)", "fmt$2(a) + ' empruntés sur ' + fmt$2(g)", 'emprunt partiel : montants inversés'),
  (F02, ": Math.round(n * 100) / 100;", ": Math.round(n);", '_levTxt arrondi à l\'unité'),
  (F02, "Math.min(Math.floor(n * 100 + 1e-6) / 100,", "Math.min(Math.round(n * 100) / 100,", '_levTxt réduit arrondi au lieu de tronqué'),
  (F02, "Math.round((s - 0.01) * 100) / 100)", "Math.round(s * 100) / 100)", '_levTxt réduit peut redire le demandé'),
  (F02, "if (a < 10) return 'part à emprunter", "if (a <= 10) return 'part à emprunter", 'frontière du minimum 10 $ (relecture)'),
  (F02, "if (!(a > 0) || g >= a - 0.005) return null;", "if (!(a > 0) || g >= a - 0.5) return null;", 'seuil 0,5 $ au lieu de 0,005 $ (relecture)'),
  (F02, "Math.min(Math.floor(n * 100 + 1e-6) / 100,", "Math.min(Math.floor(n * 100) / 100,", '_levTxt sans marge flottante'),
  (F02, "` (×${_levWhy ? _levEff : pairLev} lev → $${totalExposure})`", "` (×${pairLev} lev → $${totalExposure})`", 'journal « lev → » : le levier demandé'),
  (F02, "' au lieu de ×' + pairLev + ' · ' + _levWhy, 4500, 'warn');", "' au lieu de ×' + pairLev + ' · ' + _levWhy, 4500, 'info');", 'avertissement en niveau info (masqué)'),
  (F02, "      showToast('⚠ ' + pair + ' ' + side.toUpperCase() + ' ouvert en ×'", "      void('⚠ ' + pair + ' ' + side.toUpperCase() + ' ouvert en ×'", 'avertissement retiré'),
  (F02, "      S.chainLog.push({ icon: '⚠', desc: `Levier ${pair}", "      [].push({ icon: '⚠', desc: `Levier ${pair}", 'journal du levier retiré'),
  (F02, "_pairLevShortWhy(leverageBonus, levBorrowed) : null;", "_pairLevShortWhy(levBorrowed, leverageBonus) : null;", 'arguments inversés'),
  (F02, "_levTxt(totalExposure / Math.max(1e-9, stakeUsdt), pairLev)", "_levTxt(totalExposure / Math.max(1e-9, stakeUsdt) - 0.25, pairLev)", 'levier pris faux'),
  (F02, "_levTxt(totalExposure / Math.max(1e-9, stakeUsdt), pairLev)", "_levTxt(totalExposure / Math.max(1e-9, stakeUsdt))", '02 : levier réduit sans plafond sous le demandé'),
  (F10E, "${_red ? ' (×' + lev + ' demandé)' : ''}", "", 'fiche MAN : « demandé » retiré'),
  (F10E, "_levTxt(_ex / _st, _red ? lev : 0)", "_levTxt(_ex / _st, 0)", 'fiche MAN : levier réduit arrondi au demandé (relecture)'),
  (F10E, "_ex < _st * lev - 0.005;", "_ex < _st * lev - 0.5;", 'fiche MAN : seuil 0,5 $'),
  (F10E, "levier ×${_lx}${", "levier ×${lev}${", 'fiche MAN : journal au levier demandé'),
  (F07, "if(lev > 1 && (Number(S.leverage) || 0) === 0) {", "if(lev > 1 && (Number(S.leverage) || 0) === 1) {", 'carte : « inactif » sur le mauvais index'),
  (F07, "((Number(S.leverage) || 0) === 0 ? 1 : (ps.pairLeverage||1))", "((Number(S.leverage) || 0) === 0 ? (ps.pairLeverage||1) : (ps.pairLeverage||1))", 'carte : frais sur ×N à l\'index ×0'),
  (F10H, 'max="1" step="1" disabled style=', 'max="1" step="1" style=', 'fiche : champ levier non verrouillé'),
  (F10H, "${(Number(S.leverage) || 0) === 0\n", "${(Number(S.leverage) || 0) === 1\n", 'fiche : verrou sur le mauvais index'),
]
COPIE = ['js', 'AURA8_v118.html', 'guardian-core.js', 'guardian-embed.js', 'aura-guardian.html']

def lire(f): return open(os.path.join(ROOT, f), encoding='utf-8').read()

if '--liste' in sys.argv:
    bad = [(f, d, lire(f).count(o)) for f, o, n, d in M if lire(f).count(o) != 1]
    print('ancres :', 'toutes uniques' if not bad else bad); sys.exit(1 if bad else 0)

tuees, survivantes = 0, []
for i, (f, o, n, d) in enumerate(M, 1):
    s = lire(f); assert s.count(o) == 1, (f, d, s.count(o))
    tmp = tempfile.mkdtemp(prefix='mut99_')
    for c in COPIE:
        src = os.path.join(ROOT, c)
        if os.path.isdir(src): shutil.copytree(src, os.path.join(tmp, c))
        elif os.path.exists(src): shutil.copy(src, os.path.join(tmp, c))
    open(os.path.join(tmp, f), 'w', encoding='utf-8').write(s.replace(o, n))
    r = subprocess.run(['node', os.path.join(ROOT, 'banc-n99.js')], env=dict(os.environ, BANC_ROOT=tmp), capture_output=True, text=True, timeout=900)
    shutil.rmtree(tmp, ignore_errors=True)
    ok = r.returncode != 0
    tuees += ok
    if not ok: survivantes.append(d)
    print(('  tuée     ' if ok else '  SURVIT   ') + f'{i:2d}. {d}' + ('' if ok else '  ← ' + r.stdout.strip().splitlines()[-1]))
print(f'\n{"✅" if not survivantes else "❌"} {tuees}/{len(M)} mutations tuées' + (' — survivantes : ' + ', '.join(survivantes) if survivantes else ''))
sys.exit(0 if not survivantes else 1)
