# rejeu/mutations_alertes_2.py — [GO ALERTES 2 · 14/11/2026] chaque mutation remet UN défaut du registre (n° 66, 67, 68, 69, 34b, 76, 77, 78, 81, 96) dans une
# copie du dépôt ; banc-alertes-2.js doit échouer sur chacune (« tuée »). Usage : python3 -I rejeu/mutations_alertes_2.py <racine du dépôt>
import os, shutil, subprocess, sys, tempfile
ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
M = [
 ('66 bg sans alertes', 'js/08-learning-history-render.js', "  g(() => { if (typeof checkPnlAlerts === 'function') checkPnlAlerts(); });\n", ''),
 ('66 battement sans alertes', 'js/08-learning-history-render.js', "  try { if (typeof checkPnlAlerts === 'function') checkPnlAlerts(); } catch(e) {}\n  // ── Render active page", "  // ── Render active page"),
 ('66 bandeau derrière l\'écran', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', "    if (behind) { try { showToast(", "    if (false) { try { showToast("),
 ('66 AA derrière parle', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', "  if (behind && m === 'sim') return;\n", ''),
 ('67 jour = pnl24h', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', "  const pnlDay = (pp && pp.today && pp.today.hasData && isFinite(Number(pp.today.usd))) ? Number(pp.today.usd) : null;", "  const pnlDay = Number(S.pnl24h) || 0;"),
 ('67 injection = gain', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', "  const pnlSession = (basis - stA.sess[m].v) - (inj - stA.sess[m].inj);", "  const pnlSession = (basis - stA.sess[m].v);"),
 ('67 pas de plus haut', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', "  if (basis > pk.v) pk.v = basis;\n", ''),
 ('67 jour non réarmé', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', "    if (stA.day[m]) ['dailyGain', 'dailyLoss', 'drawdown'].forEach(k => _alertRearm(a[k]));\n", ''),
 ('67 série sans la voix', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', "    if (t && (t.type === 'position' || t.type === 'urgence' || t.type === 'tendance') && isFinite(Number(t.pnlUsdt))", "    if (t && t.type === 'position' && isFinite(Number(t.pnlUsdt))"),
 ('67 base du jour recalée au chargement', 'js/09b2-save-load.js', "typeof _w.pnlPeriod === 'object' && !_garde)", "typeof _w.pnlPeriod === 'object' && true)"),
 ('67 fonds propres remis à 0 = gain', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', "  if (inj < stA.sess[m].inj) stA.sess[m].inj = inj;\n", ''),
 ('67 session prise mode par mode', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', "  if (!stA.init && S.walletStore && typeof S.walletStore === 'object') {", "  if (false && S.walletStore && typeof S.walletStore === 'object') {"),
 ('67 remise à zéro de 24 h', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', "  // [GO ALERTES 2 · 14/11/2026] (relecture adverse du 14/11) plus de remise à zéro", "  if(S._lastAlertReset && (Date.now() - S._lastAlertReset) > 86400000) { ['dailyGain','dailyLoss','drawdown'].forEach(k => { if(a[k]) a[k].triggered = false; }); S._lastAlertReset = Date.now(); }\n  // (mutation)"),
 ('68 export blob', 'js/05-v37-19-indicateur-de-fatigue-bot.js', "  if (_outilsIsNative()) return { ok: false, how: 'fs', diag: String(window._fsLastDiag || 'écriture native refusée') };", "  if (false) return { ok: false };"),
 ('68 toast menteur', 'js/05-v37-19-indicateur-de-fatigue-bot.js', "      else showToast('❌ ' + lab + ' non écrit : '", "      else showToast('📥 ' + lab + ' exporté : '"),
 ('69 R/R avant frais', 'js/06-v63-patterns-chartistes.js', "${r.rrNet.toFixed(2)} ${r.rrNet>=2?'✅':r.rrNet>=1?'⚠️':'❌'}", "${r.rr.toFixed(2)} ${r.rr>=2?'✅':r.rr>=1?'⚠️':'❌'}"),
 ('34b Twin commun', 'js/07-v90-mode-bunker-sos.js', "  const m = (typeof _walletKey === 'function') ? _walletKey(S.tradingMode) : (S.tradingMode || 'sim');\n  const t0 = S.twinByMode[m];", "  const m = 'sim';\n  const t0 = S.twinByMode[m];"),
 ('34b sans hystérésis', 'js/07-v90-mode-bunker-sos.js', "    else if (v.etat === 'bot' || v.etat === 'attente' || v.etat === 'inactif') S.twin._devant = false;", "    else if (v.etat !== 'twin') S.twin._devant = false;"),
 ('34b non relu', 'js/09b2-save-load.js', "if (typeof f === 'function') S.twinByMode = f(snap.twinByMode); }", "if (false) S.twinByMode = f(snap.twinByMode); }"),
 ('34b bot depuis _startPortfolio', 'js/07-v90-mode-bunker-sos.js', "  const mainPnl = _twinBotPnl(twin);   // [GO ALERTES 2 · 14/11/2026] depuis l'activation du Twin — avant", "  const mainPnl = (S.portfolio && S._startPortfolio ? (S.portfolio - S._startPortfolio) : 0);   // (mutation)"),
 ('34b activation sans observation neuve', 'js/07-v90-mode-bunker-sos.js', "    delete S.twin._devant; delete S.twin.botBase; _twinBotPnl(S.twin);", "    void 0;"),
 ('34b Twin derrière toutes les 12 s', 'js/08-learning-history-render.js', "  g(() => { if (typeof tickTwinLive === 'function') tickTwinLive(); });", "  if (tk % 12 === 0) g(() => { if (typeof tickTwinLive === 'function') tickTwinLive(); });"),
 ('34b Twin mal formé non relu', 'js/07-v90-mode-bunker-sos.js', "S.twinByMode[m] = _twinSane({ [m]: t0 })[m] || _twinFresh();", "void 0;"),
 ('96 CSV sans « Hors paires »', 'js/10g-resolveur-ev-csv.js', "    ['Hors paires (intérêts du levier, impôt de l\\'année)', '', '', '', '',", "    ['Autre', '', '', '', '',"),
 ('34b peint derrière', 'js/07-v90-mode-bunker-sos.js', "  if(S.currentPage === 0 && !_behindTw) {", "  if(S.currentPage === 0) {"),
 ('76 USD sans décalage', 'js/02-state-init.js', "    _injShiftPeriods(netUSDT);", "    void 0;"),
 ('76 mois oublié', 'js/02-state-init.js', "  ['todayStartPortfolio', 'weekStartPortfolio', 'monthStartPortfolio'].forEach", "  ['todayStartPortfolio', 'weekStartPortfolio'].forEach"),
 ('77 réserve frais comptée', 'js/02-state-init.js', "(S.fiscalReserveAccount || 0) + (S.antiNegTaxPart || 0);   // [23/08 · Rams] + provisions taxes", "(S.fiscalReserveAccount || 0) + (S.antiNegTaxPart || 0) + ((S.fees&&S.fees.feeReserveAccount)||0);"),
 ('78 base ≤ 0 sans donnée', 'js/09d1-paper-real-core.js', "    const pct = startVal > 0 ? (usd / startVal) * 100 : null;", "    if (startVal <= 0) return { usd: 0, pct: 0, hasData: false };\n    const pct = (usd / startVal) * 100;"),
 ('81 métriques sans la voix', 'js/02-state-init.js', "function _isCloseRow(t) { return !!t && (t.type === 'position' || t.type === 'urgence' || t.type === 'tendance'); }", "function _isCloseRow(t) { return !!t && t.type === 'position'; }"),
 ('96 net sans funding', 'js/02-state-init.js', "  return n(f.totalPnlGross) - n(f.totalGross) - tax;", "  return n(f.totalPnlNet);"),
 ('96 paire sans funding', 'js/02-state-init.js', "  return n(bp.pnlGross) - n(bp.gross) - n(bp.tax);", "  return n(bp.pnlNet);"),
]
tmp = tempfile.mkdtemp(prefix='mut-a2-')
src = os.path.join(tmp, 'src'); shutil.copytree(ROOT, src, ignore=shutil.ignore_patterns('.git', 'backups', 'node_modules', 'out'))
tuees = 0
for nom, f, a, b in M:
    p = os.path.join(src, f); t = open(p, encoding='utf-8').read()
    if t.count(a) != 1: print('  ⚠ ancre introuvable (%d) : %s' % (t.count(a), nom)); continue
    open(p, 'w', encoding='utf-8').write(t.replace(a, b))
    r = subprocess.run(['node', os.path.join(ROOT, 'banc-alertes-2.js')], env=dict(os.environ, BANC_ROOT=src), capture_output=True, text=True, timeout=300)
    open(p, 'w', encoding='utf-8').write(t)
    ok = r.returncode != 0
    tuees += ok
    print(('  ✅ tuée     ' if ok else '  ❌ SURVIT   ') + nom)
shutil.rmtree(tmp, ignore_errors=True)
print('%d/%d mutations tuées' % (tuees, len(M)))
sys.exit(0 if tuees == len(M) else 1)
