# rejeu/mutations_n61.py — [GO N° 61 · 15/11/2026] chaque mutation casse EXPRÈS la livraison ; banc-n61.js doit en voir chacune.
# usage : python3 -I rejeu/mutations_n61.py <racine du dépôt>      → « TUÉES : n / n » attendu
import os, sys, shutil, subprocess, tempfile
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
J9, J2, J3, J7 = 'js/09j-helpers.js', 'js/02-state-init.js', 'js/03-per-pair-position-buttons-controls-buid.js', 'js/07-v90-mode-bunker-sos.js'
J9C = 'js/09c-auto-open.js'
M = [
  ('plafond manuel = trading − engagés (le défaut revient)', J9, "  const cap = Math.max(0, S.tradingAccount || 0);\n  if ((proposedStake || 0) <= cap)", "  const cap = Math.max(0, (S.tradingAccount || 0) - (r.alreadyStaked || 0));\n  if ((proposedStake || 0) <= cap)"),
  ('plafond manuel = trading + 1 $', J9, "  const cap = Math.max(0, S.tradingAccount || 0);\n  if ((proposedStake || 0) <= cap)", "  const cap = Math.max(0, S.tradingAccount || 0) + 1;\n  if ((proposedStake || 0) <= cap)"),
  ('la correction agit aussi avec un emprunt du levier', J9, "if (r.ok || !r.phase5 || r.phase5Mode !== 'no_leverage') return r;", "if (r.ok || !r.phase5) return r;"),
  ('la correction agit aussi sur les refus des étapes 1–2', J9, "if (r.ok || !r.phase5 || r.phase5Mode !== 'no_leverage') return r;", "if (r.ok || (r.phase5 && r.phase5Mode !== 'no_leverage')) return r;"),
  ('accord : disponible = plafond', J9, "return { ok: true, available: r.maxAllowed - r.alreadyStaked };", "return { ok: true, available: cap };"),
  ('refus : disponible d\'avant gardé', J9, "return Object.assign({}, r, { available: cap, phase5Cap: cap });", "return Object.assign({}, r, { phase5Cap: cap });"),
  ('02 openPosition revient à validateTotalExposure', J2, ": validateManualExposure(stakeUsdt, levBorrowed);", ": validateTotalExposure(stakeUsdt, levBorrowed);"),
  ('03 panneau revient à validateTotalExposure', J3, "const capCheck = validateManualExposure(stake, leverageBonus);", "const capCheck = validateTotalExposure(stake, leverageBonus);"),
  ('03 message d\'avant (« trading − engagés »)', J3, "showToast(`⚠ Règle sizing · max investissable ${fmt$(free)} (${_src})`", "showToast(`⚠ Règle sizing · max investissable ${fmt$(free)} (${_src} − engagés)`"),
  ('07 manuInvert cherche la mise sur validateTotalExposure', J7, "const r = validateManualExposure(x, x * (lev - 1));", "const r = validateTotalExposure(x, x * (lev - 1));"),
  ('libre = caisse + trading − engagés (n° 87 revient)', J9, "    free: Math.max(0, (S.cashAccount||0) + (S.tradingAccount||0))\n", "    free: Math.max(0, (S.cashAccount||0) + (S.tradingAccount||0) - staked)\n"),
  ('« ✓ Appliquer » sans la borne de ce qu\'openPosition peut ouvrir', J2, "  const safeStake = Math.min(Math.floor(cap.free * 0.3), stake, Math.floor(_ouvrable));", "  const safeStake = Math.min(Math.floor(cap.free * 0.3), stake);"),
  ('« ✓ Appliquer » : borne sans l\'emprunt juste à temps', J2, "  const _ouvrable = Math.max(0, Number(S.tradingAccount) || 0) + (_ix >= 1 ?", "  const _ouvrable = Math.max(0, Number(S.tradingAccount) || 0) + (_ix >= 99 ?"),
  ('libre sans la caisse', J9, "    free: Math.max(0, (S.cashAccount||0) + (S.tradingAccount||0))\n", "    free: Math.max(0, (S.tradingAccount||0))\n"),
  ('engagé du résumé sans l\'exposition', J9, "  const staked     = S.openPositions.reduce((s, p) => s + (p.totalExposure || p.stakeUsdt || 0), 0);", "  const staked     = S.openPositions.reduce((s, p) => s + (p.stakeUsdt || 0), 0);"),
  ('le BOT (02 estimateStakes) lit la correction', J2, "const _p5 = validateInvestmentCapProvisioned(kelly);", "const _p5 = validateManualExposure(kelly);"),
  ('le BOT (09c) lit la correction', J9C, "let capCheck = validateTotalExposure(baseStake, levBorrowed, _convForValidate);", "let capCheck = validateManualExposure(baseStake, levBorrowed, _convForValidate);"),
  ('la fonction PARTAGÉE corrigée (ce que go talent a refusé)', J9, "  const cap = Math.max(0, (S.tradingAccount || 0) - engaged);", "  const cap = Math.max(0, S.tradingAccount || 0);"),
  ('validateTotalExposure retouchée (étape 1 sans les mises engagées)', J9, "  const totalAfter      = alreadyStaked + newExposure;", "  const totalAfter      = newExposure;"),
]
tues, vivants = 0, []
for nom, f, a, b in M:
    d = tempfile.mkdtemp(prefix='mut61-')
    try:
        for x in ('js', 'banc-fixtures'): shutil.copytree(os.path.join(R, x), os.path.join(d, x))
        for x in ('AURA8_v118.html', 'aura-guardian.html', 'guardian-core.js', 'guardian-embed.js'):
            if os.path.exists(os.path.join(R, x)): shutil.copy(os.path.join(R, x), os.path.join(d, x))
        p = os.path.join(d, f); s = open(p, encoding='utf-8').read()
        assert s.count(a) == 1, ('ancre', nom, s.count(a))
        open(p, 'w', encoding='utf-8').write(s.replace(a, b))
        env = dict(os.environ, BANC_ROOT=d)
        r = subprocess.run(['node', os.path.join(R, 'banc-n61.js')], env=env, capture_output=True, text=True, timeout=300)
        echecs = [l.strip()[:60] for l in r.stdout.splitlines() if l.startswith('  ❌ ')]
        if r.returncode != 0 and echecs: tues += 1; print('  tuée   · ' + nom + ' → ' + ', '.join(e.split(' · ')[0].replace('❌ ', '') for e in echecs))
        else: vivants.append(nom); print('  VIVANTE · ' + nom)
    finally:
        shutil.rmtree(d, ignore_errors=True)
print('TUÉES : %d / %d' % (tues, len(M)) + ('' if not vivants else ' — vivantes : ' + ' ; '.join(vivants)))
sys.exit(0 if not vivants else 1)
