# rejeu/mutations_n62.py — [GO N° 62 · 15/11/2026] chaque mutation casse EXPRÈS la livraison (07 « ↓ Inverser ») ; banc-n62.js doit en voir chacune.
# usage : python3 -I rejeu/mutations_n62.py <racine du dépôt>      → « TUÉES : n / n » attendu
import os, sys, shutil, subprocess, tempfile
R = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
J7 = 'js/07-v90-mode-bunker-sos.js'
M = [
  ('plus de question (fermé sans rien demander : le défaut revient)', "  if (typeof confirm === 'function' && !confirm(_invQuestion(pair, pos.side, newSide, plan))) {", "  if (false) {"),
  ('fermé AVANT le plan et la question', "  // [GO N° 62 · 15/11/2026] le plan AVANT de fermer, la question, puis la fermeture\n  let plan = null;", "  closePosition(pos.id);\n  let plan = null;"),
  ('levier arrondi (×1,4 → ×1, ×1,5 → ×2)', "Math.max(1, Math.round((Number(pos.totalExposure) || stake) / stake * 1e6) / 1e6)", "Math.max(1, Math.round((Number(pos.totalExposure) || stake) / stake))"),
  ('contrôle de capital cherché SANS l\'emprunt de la part à levier', "return _invAvec({ leverageBorrowed: (Number(S.leverageBorrowed) || 0) + b,", "return _invAvec({ leverageBorrowed: (Number(S.leverageBorrowed) || 0) + 0,"),
  ('pas de repli ×1 quand le levier bloque', "c = U.x > A.x + 0.005 ? U : A;", "c = A;"),
  ('rien de rouvrable : fermé quand même', "  if (!(plan.ch.x >= 0.01)) {\n", "  if (false) {\n"),
  ('pas de revérification après la fermeture', "    if (!(r.ok && Math.abs(r.b - ch.b) < 0.005)) {", "    if (false) {"),
  ('2e question acceptée d\'office', "      if (typeof confirm === 'function' && !confirm(q2)) {", "      if (false) {"),
  ('état d\'après : frais oubliés', "T += pris - couvert; A -= pris; T = Math.max(0, T - (F - couvert));", "T += pris - couvert; A -= pris; T = Math.max(0, T);"),
  ('état d\'après : réserve anti-négatif oubliée', "pris = Math.min(res, A), couvert = Math.min(pris, F);", "pris = 0, couvert = Math.min(pris, F);"),
  ('état d\'après : frais restés dus oubliés', "  T -= Math.min(Math.max(0, Number(w && w._feesDue) || 0), Math.max(0, T));\n", "\n"),
  ('état d\'après : impôt oublié', "    try { impot = Number(_invAvec({ openPositions: [pos] }, () => _fiscLatentTaxUsd(_walletKey()))) || 0; }", "    try { impot = 0; }"),
  ('état d\'après : emprunt en argent non rendu', "  if (cash > 0) { const pay = Math.min(cash,", "  if (false) { const pay = Math.min(cash,"),
  ('état d\'après : part caisse du gain oubliée', "  if (usd > 0) {\n    const split", "  if (false) {\n    const split"),
  ('état d\'après : dette orpheline (P2) oubliée', "  if (p2 > 0) {\n    const libre", "  if (false) {\n    const libre"),
  ('état d\'après : part « exposition » non rendue', "  B -= Math.min(B, expo);\n", "\n"),
  ('état d\'après : réserve du levier sans la position qui ferme', "const eng = (S.openPositions || []).reduce((s, p) => s + (Number(p && p.stakeUsdt) || 0), 0);", "const eng = (S.openPositions || []).reduce((s, p) => s + (p === pos ? 0 : (Number(p && p.stakeUsdt) || 0)), 0);"),
  ('ouverture prévue : emprunt « juste à temps » oublié', "if (x > T) jit = Math.min(x - T, maxB);", "if (false) jit = Math.min(x - T, maxB);"),
  ('ouverture prévue : P10 (index ×0) oublié', "  if (a <= 0 || (Number(S.leverage) || 0) === 0) return 0;", "  if (a <= 0) return 0;"),
  ('ouverture prévue : plafond 10× oublié', "  if ((Number(S.leverageBorrowed) || 0) + a > cap10) return 0;\n", "\n"),
  ('ouverture prévue : minimum de 10 $ oublié', "  return v < 10 ? 0 : v;", "  return v < 0 ? 0 : v;"),
  ('ouverture prévue : refus « disponible ≥ moitié » oublié', "    if (!c.ok && c.available < x * 0.5) return { ok: false, b, why: 'cap', c };", "    if (!c.ok) return { ok: false, b, why: 'cap', c };"),
  ('état remis : finally vide', "  finally { Object.keys(keep).forEach(k => { S[k] = keep[k]; }); }", "  finally { }"),
  ('mise et levier de la paire non rendus', "  finally { ps.stake = prevStake; ps.pairLeverage = prevLev; }", "  finally { }"),
  ('raison fausse (branche « levier » dite « mise ≤ trading »)', "(r.c && r.c.phase5 && r.c.phase5Mode === 'leverage' ?", "(r.c && r.c.phase5 && r.c.phase5Mode === 'xx' ?"),
  ('question sans la réouverture réduite', "    + (c.why ? '\\n\\n⚠ Mise ' + fmt$2(c.x) + ' au lieu de ' + fmt$2(p.stake) + ' : ' + c.why : '')", "    + ''"),
  ('question : ancien levier tu', "    + (c.levWhy ? '\\n⚠ ×' + _levTxt(c.eff", "    + (false ? '\\n⚠ ×' + _levTxt(c.eff"),
  ('consignes perdues', "  try { np = openPosition(pair, newSide, keep); }", "  try { np = openPosition(pair, newSide, {}); }"),
]
tues, vivants = 0, []
for nom, a, b in M:
    d = tempfile.mkdtemp(prefix='mut62-')
    try:
        for x in ('js', 'banc-fixtures'): shutil.copytree(os.path.join(R, x), os.path.join(d, x))
        for x in ('AURA8_v118.html', 'aura-guardian.html', 'guardian-core.js', 'guardian-embed.js'):
            if os.path.exists(os.path.join(R, x)): shutil.copy(os.path.join(R, x), os.path.join(d, x))
        p = os.path.join(d, J7); s = open(p, encoding='utf-8').read()
        assert s.count(a) == 1, ('ancre', nom, s.count(a))
        open(p, 'w', encoding='utf-8').write(s.replace(a, b))
        env = dict(os.environ, BANC_ROOT=d)
        r = subprocess.run(['node', os.path.join(R, 'banc-n62.js')], env=env, capture_output=True, text=True, timeout=600)
        echecs = [l.strip()[:60] for l in r.stdout.splitlines() if l.startswith('  ❌ ')]
        if r.returncode != 0 and echecs: tues += 1; print('  tuée   · ' + nom + ' → ' + ', '.join(e.split(' · ')[0].replace('❌ ', '') for e in echecs))
        else: vivants.append(nom); print('  VIVANTE · ' + nom)
    finally:
        shutil.rmtree(d, ignore_errors=True)
print('TUÉES : %d / %d' % (tues, len(M)) + ('' if not vivants else ' — vivantes : ' + ' ; '.join(vivants)))
sys.exit(0 if not vivants else 1)
