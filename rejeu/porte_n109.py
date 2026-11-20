# PORTE du registre n° 109 — GO N° 109, 20/11/2026 — RÈGLES FIGÉES AVANT TOUTE MESURE (lignes 1 à 48)
# Défaut (registre, G2) : la note T$ ne prédit pas. La règle de fenêtre (10i _fitWindowEval) s'arme sur la MOINS MAUVAISE précision du conseil pondéré par
# la fitness — au 20/11 toutes sous 50 % — et la fenêtre armée (20 jugements, < 1 h de marché) fait sauter les notes (Indices·Marché 1 169 → 50 en un jour).
# Remède du registre, figé ici :
#  R1 — la fenêtre n'est armée que si, EN PLUS des conditions d'aujourd'hui, la précision de la meilleure fenêtre est PROUVÉE au-dessus du hasard : borne
#       basse de Wilson à 95 % (z = 1,96, la convention de 03 _botStakeMult) sur ses N événements rejoués > 50 %. Sinon : 60, le défaut.
#  R2 — une note au-dessus de 350 seulement si l'avantage est prouvé (comme la mise des bots, 03 _botStakeMult) : E = Σ s·w / Σ w, p = (E + 1) / 2,
#       n = (Σ w)² / Σ w² (effectif de Kish), lo = borne basse de Wilson ; E ≤ 0 → E inchangé ; lo > 0,5 → 2·lo − 1 ; sinon 0 (350). Sur la fenêtre de
#       jugements (03 _fitOf : s = ±1, w = poids) et, au bilan aux horizons (03 _vjE), à chaque horizon (s·w = v·D, w = |v·D|) avant la moyenne des 5.
#       R2 ne touche PAS le poids de la voix dans la décision commune (03 _dcMeritHz = max(0, E) reste) : il touche la note (évolution, sortie « signal
#       inversé », mémoire, conseil du roster, écran). R1 touche les deux (la fenêtre W).
# Pourquoi ce critère d'entrée (et pas « talent prouvé ») : le remède n'ajoute aucune décision ; il retire une pesée que rien ne prouve. Il entre donc s'il
# ne retire AUCUNE information prouvée (porte TALENT 03/10 : aucune voix n'a de talent, aucune pesée linéaire n'en crée). S'il en retire, il n'entre pas.
# Données (fixées ici, aucune choisie après coup) :
#  D1 l'état réel du 20/11/2026 21:28 (backup du pont, rejeu/backups/pont/aura_guardian_full_20261120-212812.json), lu en lecture seule.
#  D2 les 24 mois de la porte TALENT (10/2024 → 09/2026, 12 paires, bougies 15 min) : votes des 20 voix du roster par rejeu/talent.js sur le code livré,
#     lecture « en cours » (--encours 1, comme l'app vivante), deux moitiés 961 → 35520 → 70080. Jugements recalculés comme l'app, approximations dites :
#     bougie (03 learnFromOutcome 'cycle', _dcForwardJudge) : un événement par bougie et par paire, k croissant ; voix jugée si |vote| > 0,05,
#       s = +1 si le sens du vote = celui du mouvement à la clôture suivante, w = max(0,01, |vote| × |mouvement %| × 3 × 0,7) ;
#     horizons (03 _vjNote / _vjJudge) : voix jugée si |vote| ≥ 0,03, h = 1, 2, 4, 8, 16 bougies, D = (long − short) / 2 avec perte max 1,5 % de chaque
#       côté (l'app : 1,5 à 3 %), 240 gardés par horizon ; un jugement ne sert qu'une fois mûr (clôture de i + h ≤ l'instant de la lecture).
#     Les génomes sont ceux du départ ; les bots ne se rejouent pas sur archives (leurs actes) : leur effet n'est mesuré que sur D1.
# Formules recopiées du code (03 _fitScale, _fitOf, _vjE ; 10i _fitWindowEval), vérifiées par le témoin M0.
# Mesures :
#  M0 TÉMOIN (D1) — a) la porte redonne-t-elle le vrai calcul ? T$ vivant de chaque siège au record complet (≥ 80 % d'accord exigé), et la règle de
#     fenêtre rejouée sur les jugements gardés redonne S.fitWindowRule (armée, fenêtre, les 6 précisions à 0,1 point près). Sinon : AVEUGLE, aucun verdict.
#     b) le remède agit-il sur l'état réel ? R1 : la fenêtre change-t-elle ; R1 + R2 : nombre d'agents dont le T$ change (liste). Rien ne change : rien à livrer.
#  M1 (D1) — borne basse de Wilson de la précision de chaque fenêtre : l'armement vivant est-il prouvé (borne > 50 %) ?
#  M2 (D2) — la règle de fenêtre, hors échantillon : chaque jour à 00:00 UTC, la règle (d'aujourd'hui et R1) est rejouée sur les 240 derniers jugements à la
#     bougie de chaque voix ; le lendemain (événements du jour), on compare la fenêtre choisie à 60 sur a) la mesure de la règle elle-même (précision du
#     conseil pondéré par la fitness, Σ f·s·w > 0) et b) le mouvement signé de la décision commune pesée par max(0, E_W) aux horizons (03 _dcConsensus :
#     voix sans record complet = poids 0) à 15 min, 1 h et 4 h. Écart apparié par jour (choisie − 60), z = moyenne / (écart-type / √jours).
#  M3 (D2) — la note prédit-elle ? Chaque jour à 00:00 UTC, note de chaque voix (W = 20 et W = 60 ; d'aujourd'hui et R2) contre sa qualité FUTURE : le bilan
#     (moyenne des 5 E_h) des seuls jugements notés ce jour-là. Corrélation de rang (Spearman) entre voix, par jour ; jours sans 5 voix notées ou sans
#     variation de rang : écartés (comptés). z comme M2. « La note prédit » si moyenne > 0 et z ≥ 3,2 (seuil de la porte TALENT). Écart apparié
#     (d'aujourd'hui − R2) par jour, même z.
#  M4 (D1, dit, ne décide pas) — bots : T$ sous R2 et rang du 1er bot (question du n° 90) ; siège que l'évolution retirerait (le plus faible) avant / après.
# Verdict :
#  AVEUGLE si M0 a) échoue.
#  R1 ENTRE si M0 voit, si R1 change la fenêtre vivante (M0 b), si l'armement vivant n'est pas prouvé (M1) et si, en M2, la fenêtre choisie par la règle
#     d'aujourd'hui ne bat 60 avec z ≥ 3,2 sur AUCUNE des 4 mesures (aucune information prouvée retirée). M2 « vide » (la règle ne s'arme jamais sur D2) : dit,
#     ne bloque pas. N'ENTRE PAS sinon.
#  R2 ENTRE si M0 voit, si R2 change au moins un T$ vivant (M0 b) et si, en M3, l'écart apparié (d'aujourd'hui − R2) n'atteint z ≥ 3,2 ni à W = 20 ni à
#     W = 60 (R2 ne retire aucune information prouvée). N'ENTRE PAS sinon.
#  Un remède entre entier ou n'entre pas ; on ne retouche ni ces règles, ni les données, ni le remède pour le faire passer.
# Ce que la porte NE dit PAS : si l'app gagne de l'argent (non, ETAT § 1) ; si une meilleure note existe (aucune voix n'a de talent à mesurer).
# Usage : python3 -I rejeu/porte_n109.py --d1 <backup> --data <dossier talent_prep> --votes <v_a> <v_b> [--out <f.json>]
# Empreinte de ces 48 lignes : sha-256 dans REPRISE-N109.md puis PASSATION-AURA8.md (section GO N° 109), avec l'heure UTC d'écriture.
# ── mesure (écrite après l'en-tête) ──
import sys, os, json, math, re
import numpy as np

A = {}
_av = sys.argv[1:]; _i = 0
while _i < len(_av):
    k = _av[_i].lstrip('-')
    if k == 'votes': A['votes'] = [_av[_i + 1], _av[_i + 2]]; _i += 3
    else: A[k] = _av[_i + 1]; _i += 2
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
Z95, ZMIN = 1.96, 3.2
TH_HZ = [1, 2, 4, 8, 16]; FIT_MIN_N = 5; FIT_KEEP = 240
FITW_GRID = [20, 40, 60, 100, 160, 240]; FITW_DEFAULT = 60; FITW_MIN_EVENTS = 40; FITW_MIN_MARGIN = 0.05; FITW_MIN_AGENTS = 8
OUT = {'regles_sha256': 'f17df08298014eb0c406cb6dfec07284cbee77c998ed49d33b28b3ac46de8de0'}

def jround(x): return math.floor(x + 0.5)                       # Math.round de JS
def fit_scale(E): return max(50, min(2000, jround(350 + 1000 * E)))   # 03 _fitScale
def wilson_lo(p, n, z=Z95):                                       # 03 _botStakeMult (Wilson)
    if not (n > 0): return 0.0
    return (p + z * z / (2 * n) - z * math.sqrt(max(0.0, p * (1 - p) / n + z * z / (4 * n * n)))) / (1 + z * z / n)
def proven(sw, se, sw2, nfall):                                   # R2 : E prouvé (Kish, Wilson), E ≤ 0 inchangé
    E = se / sw if sw > 0 else 0.0
    if E <= 0: return E
    n = (sw * sw) / sw2 if sw2 > 0 else nfall
    lo = wilson_lo((E + 1) / 2, n)
    return 2 * lo - 1 if lo > 0.5 else 0.0
def fit_of(js, W, r2=False):                                      # 03 _fitOf (+ R2)
    n = len(js); st = max(0, n - W)
    if n - st < FIT_MIN_N: return None
    sw = se = sw2 = 0.0
    for e in js[st:]: sw += e['w']; se += e['s'] * e['w']; sw2 += e['w'] * e['w']
    E = proven(sw, se, sw2, n - st) if r2 else (se / sw if sw > 0 else 0.0)
    return fit_scale(E)
def vj_E(Jv, W, r2=False):                                        # 03 _vjE (+ R2 par horizon)
    if not isinstance(Jv, list) or len(Jv) != len(TH_HZ): return None
    s = 0.0
    for L in Jv:
        L = L if isinstance(L, list) else []
        n = min(len(L) >> 1, W)
        if n < FIT_MIN_N: return None
        a = b = b2 = 0.0; j = max(0, len(L) - 2 * W)
        while j + 1 < len(L):
            x = float(L[j]) * float(L[j + 1])
            if math.isfinite(x): a += x; b += abs(x); b2 += x * x
            j += 2
        s += proven(b, a, b2, n) if r2 else (a / b if b > 0 else 0.0)
    return s / len(Jv)
def fit_window_eval(lists, r1=False):                             # 10i _fitWindowEval (+ R1) ; lists = jugements {s, w, k} par agent
    byK = {}
    L2 = []
    for ai, js in enumerate(lists):
        js = [e for e in js if isinstance(e.get('k'), (int, float)) and e['k'] > 0 and isinstance(e.get('s'), (int, float)) and isinstance(e.get('w'), (int, float))]
        L2.append(js)
        for e in js: byK.setdefault(e['k'], []).append((ai, e['s'], e['w']))
    keys = sorted(k for k in byK if len(byK[k]) >= FITW_MIN_AGENTS)
    out = {'window': FITW_DEFAULT, 'armed': False, 'n': len(keys), 'acc': {}, 'best': FITW_DEFAULT}
    if len(keys) < FITW_MIN_EVENTS: out['why'] = 'peu'; return out
    hits = {}
    for W in FITW_GRID:
        ptr = [0] * len(L2); h = []
        for k in keys:
            tot = 0.0
            for (ai, s, w) in byK[k]:
                js = L2[ai]; p = ptr[ai]
                while p < len(js) and js[p]['k'] < k: p += 1
                ptr[ai] = p
                st = max(0, p - W); f = 350
                if p - st >= FIT_MIN_N:
                    sw = se = 0.0
                    for i in range(st, p): sw += js[i]['w']; se += js[i]['s'] * js[i]['w']
                    f = max(50, min(2000, jround(350 + 1000 * se / sw))) if sw > 0 else 350
                tot += f * s * w
            h.append(1 if tot > 0 else 0)
        hits[W] = h
    acc = lambda h, a, b: (sum(h[a:b]) / (b - a)) if b > a else 0.0
    N = len(keys); half = N // 2; base = acc(hits[FITW_DEFAULT], 0, N); best = FITW_DEFAULT; bestAcc = base
    for W in FITW_GRID:
        a = acc(hits[W], 0, N); out['acc'][W] = jround(a * 1000) / 10
        if W != FITW_DEFAULT and a > bestAcc + 1e-9: bestAcc = a; best = W
    out['best'] = best; out['bestAcc'] = bestAcc; out['lo'] = wilson_lo(bestAcc, N)
    ok = best != FITW_DEFAULT and bestAcc - base >= FITW_MIN_MARGIN - 1e-9 and acc(hits[best], 0, half) >= acc(hits[FITW_DEFAULT], 0, half) and acc(hits[best], half, N) >= acc(hits[FITW_DEFAULT], half, N)
    if ok and r1 and not (out['lo'] > 0.5): ok = False
    if ok: out['window'] = best; out['armed'] = True
    out['hits'] = hits
    return out
def win_of(rule): w = jround(float(rule['window'])) if rule and rule.get('armed') else 0; return w if 10 <= w <= FIT_KEEP else FITW_DEFAULT

# ═════ D1 ═════
S = json.load(open(A['d1']))['aura']
src02 = open(os.path.join(ROOT, 'js', '02-state-init.js'), encoding='utf8').read()
def def_ids(flag):
    out = []
    for b in re.split(r"\n\s*\{\s*id:'", src02)[1:]:
        i = b.index("'"); fin = b.index('}')
        if re.search(r'\b' + flag + r':true', b[:fin]): out.append(b[:i])
    return out
BOTS, METAS = def_ids('isBot'), def_ids('isMeta')
assert len(BOTS) == 9 and len(METAS) == 1, ('définition des agents de 02', BOTS, METAS)
T = S['dcThreshold']; VHZ = T.get('vHz') or {}
fmodes = T.get('fModes') or {}; HZMODE = not any(v == 'bougie' for v in fmodes.values())
R = S.get('fitWindowRule') or {}; W0 = win_of(R)
agents = [a for a in S['agents'] if a]
seats = [a for a in agents if a['id'] not in BOTS and a['id'] not in METAS]
def note(a, W, r2=False):                                         # 03 _fitCurrent
    if HZMODE and a['id'] not in BOTS and a['id'] not in METAS and a['id'] != 'composite':
        e = vj_E(VHZ.get(a['id']), W, r2)
        if e is not None: return fit_scale(e)
    return fit_of(a.get('_judgments') or [], W, r2)
print('══ D1 · ' + os.path.basename(A['d1']) + ' · cycle ' + str(S.get('cycle')) + ' · fenêtre vivante ' + str(W0) + ' · fitness des sièges : ' + ('horizons' if HZMODE else 'bougie'))
vus = acc_ = 0; diffs = []
for a in agents:
    f = note(a, W0)
    if f is None: continue
    vus += 1
    if f == jround(float(a.get('fitness') or 0)): acc_ += 1
    else: diffs.append((a['id'], f, a.get('fitness')))
rr = fit_window_eval([a.get('_judgments') or [] for a in seats])
regle_ok = (rr['armed'] == bool(R.get('armed')) and rr['window'] == R.get('window', 60) and all(abs(rr['acc'][W] - float(R['acc'][str(W)])) <= 0.1 + 1e-9 for W in FITW_GRID))
voit = vus > 0 and acc_ / vus >= 0.8 and regle_ok
print('M0 a) T$ : %d agents sur %d redonnent leur T$ vivant%s' % (acc_, vus, (' · écarts : ' + ', '.join('%s %s≠%s' % d for d in diffs)) if diffs else ''))
print('   règle de fenêtre rejouée : %s à %d · %d événements · %s · vivante : %s à %s · %s' % ('armée' if rr['armed'] else 'non armée', rr['window'], rr['n'], ', '.join('%d → %.1f %%' % (W, rr['acc'][W]) for W in FITW_GRID), 'armée' if R.get('armed') else 'non armée', R.get('window'), ', '.join('%s → %s %%' % (k, v) for k, v in (R.get('acc') or {}).items())))
print('   → ' + ('la porte VOIT' if voit else 'porte AVEUGLE'))
OUT['M0a'] = {'agents': vus, 'accord': acc_, 'ecarts': diffs, 'regle_rejouee': {k: v for k, v in rr.items() if k != 'hits'}, 'regle_vivante': R, 'voit': voit}
# M0 b) le remède sur l'état réel
r1 = fit_window_eval([a.get('_judgments') or [] for a in seats], r1=True); W1 = win_of(r1)
chg1 = [(a['id'], a.get('name') or a.get('type'), jround(float(a.get('fitness') or 0)), note(a, W1)) for a in agents if note(a, W0) is not None]
chg1 = [c for c in chg1 if c[3] is not None and c[3] != c[2]]
chg2 = [(a['id'], jround(float(a.get('fitness') or 0)), note(a, W1, True)) for a in agents if note(a, W0) is not None]
chg2 = [c for c in chg2 if c[2] is not None and c[2] != c[1]]
print('M0 b) R1 : fenêtre %d → %d (%s ; borne de Wilson de la meilleure : %.1f %%) · %d T$ changent avec R1 seul · R1 + R2 : %d T$ changent' % (W0, W1, 'armée' if r1['armed'] else 'non armée', 100 * rr['lo'], len(chg1), len(chg2)))
for c in sorted(chg2, key=lambda c: -c[1]): print('     %-16s %5d → %5d' % c)
OUT['M0b'] = {'W_vivante': W0, 'W_R1': W1, 'R1_seul': chg1, 'R1_R2': chg2}
# M0 b′ — AJOUTÉ APRÈS le premier verdict (R1 n'entre pas, R2 entre) : ce que fait R2 SEUL, fenêtre vivante gardée. Dit, ne décide pas.
chgR2 = [(a['id'], jround(float(a.get('fitness') or 0)), note(a, W0, True)) for a in agents if note(a, W0) is not None]
chgR2 = [c for c in chgR2 if c[2] is not None and c[2] != c[1]]
print('M0 b′ (ajouté après le verdict, dit) R2 seul, fenêtre vivante %d : %d T$ changent' % (W0, len(chgR2)))
for c in sorted(chgR2, key=lambda c: -c[1]): print('     %-16s %5d → %5d' % c)
afterR2 = [(a['id'], a['id'] in BOTS, (lambda f: f if f is not None else jround(float(a.get('fitness') or 0)))(note(a, W0, True))) for a in agents]
OUT['M0b_R2_seul'] = chgR2
# M1
print('M1 précision du conseil pondéré par la fitness, borne basse de Wilson 95 %% (%d événements) :' % rr['n'])
m1 = {}
for W in FITW_GRID:
    p = sum(rr['hits'][W]) / rr['n']; lo = wilson_lo(p, rr['n']); m1[W] = (round(100 * p, 1), round(100 * lo, 1))
    print('   %3d → %.1f %% · borne %.1f %%%s' % (W, 100 * p, 100 * lo, ' (armée)' if W == W0 and R.get('armed') else ''))
arm_prouve = bool(R.get('armed')) and m1[W0][1] > 50
print('   armement vivant ' + ('PROUVÉ' if arm_prouve else 'NON prouvé'))
OUT['M1'] = {'par_fenetre': m1, 'armement_prouve': arm_prouve}
# M4 (dit)
def rank_bot(vals):
    s = sorted(vals, key=lambda x: -x[2]); i = next((j for j, x in enumerate(s) if x[1]), -1)
    return (i + 1, sum(1 for x in s[:max(0, i)] if not x[1]), s[i][0] if i >= 0 else '—')
live = [(a['id'], a['id'] in BOTS, jround(float(a.get('fitness') or 0))) for a in agents]
after = [(a['id'], a['id'] in BOTS, (lambda f: f if f is not None else jround(float(a.get('fitness') or 0)))(note(a, W1, True))) for a in agents]
print('M4 (dit) 1er bot : vivant %s au rang %d (%d analystes devant) · R1 + R2 : %s au rang %d (%d analystes devant)' % (rank_bot(live)[2], rank_bot(live)[0], rank_bot(live)[1], rank_bot(after)[2], rank_bot(after)[0], rank_bot(after)[1]))
for a in agents:
    if a['id'] in BOTS: print('     BOT %-16s %5d → %5d · actes gardés %d' % (a['id'], jround(float(a.get('fitness') or 0)), dict((x[0], x[2]) for x in after)[a['id']], len(a.get('_judgments') or [])))
weak = lambda vals: sorted([x for x in vals if x[0] not in BOTS and x[0] not in METAS], key=lambda x: x[2])[0][0]   # tri stable, comme 03:1555
print('   siège le plus faible (évolution) : vivant %s · R1 + R2 : %s' % (weak(live), weak(after)))
OUT['M4'] = {'bot_vivant': rank_bot(live), 'bot_apres': rank_bot(after), 'faible_vivant': weak(live), 'faible_apres': weak(after)}
print('   R2 seul (ajouté après le verdict) : 1er bot %s au rang %d (%d analystes devant, à égalité comprise) · siège le plus faible %s' % (rank_bot(afterR2)[2], rank_bot(afterR2)[0], rank_bot(afterR2)[1], weak(afterR2)))
OUT['M4']['R2_seul'] = {'bot': rank_bot(afterR2), 'faible': weak(afterR2)}
if not voit:
    print('VERDICT n° 109 : AVEUGLE'); OUT['verdict'] = 'AVEUGLE'
    if A.get('out'): json.dump(OUT, open(A['out'], 'w'), ensure_ascii=False, indent=1, default=str)
    sys.exit(0)
if A.get('d1seul'):
    if A.get('out'): json.dump(OUT, open(A['out'], 'w'), ensure_ascii=False, indent=1, default=str)
    sys.exit(0)

# ═════ D2 ═════
DAY, M15 = 86400000, 900000
metas = [json.load(open(f + '.json')) for f in A['votes']]
PAIRS, VOICES = metas[0]['pairs'], metas[0]['voices']; nP, nV = len(PAIRS), len(VOICES)
assert metas[0]['to'] == metas[1]['from'] and all(m['encours'] for m in metas), 'tranches'
V = np.concatenate([np.fromfile(f, dtype=np.float32).reshape(-1, nP, nV) for f in A['votes']]).astype(np.float64)
FROM = metas[0]['from']; TT = V.shape[0]
K = [np.array(json.load(open(os.path.join(A['data'], p.split('/')[0] + '.json')))['k'], dtype=np.float64) for p in PAIRS]
TS = K[0][:, 0]; NK = len(TS)
Cc = np.stack([k[:, 4] for k in K], 1); Hh = np.stack([k[:, 2] for k in K], 1); Ll = np.stack([k[:, 3] for k in K], 1)
ii = np.arange(FROM, FROM + TT)                     # bougie absolue de chaque ligne
CL = TS[ii] + M15                                   # instant de la décision (clôture)
print('\n══ D2 · %d bougies × %d paires × %d voix · %s → %s · jeton %s' % (TT, nP, nV, str(np.datetime64(int(CL[0]), 'ms'))[:10], str(np.datetime64(int(CL[-1]), 'ms'))[:10], metas[0]['token']))
EV = np.arange(TT * nP).reshape(TT, nP)            # n° d'événement (bougie, paire)
# jugements à la bougie
nx = np.minimum(ii + 1, NK - 1)
mv = np.where((ii + 1 < NK)[:, None], (Cc[nx] - Cc[ii]) / Cc[ii] * 100, np.nan)
CJ = []
for v in range(nV):
    vo = V[:, :, v]; m = (np.abs(vo) > 0.05) & np.isfinite(mv) & (mv != 0)
    won = mv > 0; s = np.where((won & (vo > 0)) | (~won & (vo < 0)), 1.0, -1.0)
    w = np.maximum(0.01, np.abs(vo) * np.abs(mv) * 3 * 0.7)
    CJ.append((EV[m], s[m], w[m]))                  # ordre des événements (ligne, puis paire)
# jugements aux horizons
CAP = 1.5
HR = {}                                             # (voix, h) → (bougie relative, x = v·D)
from numpy.lib.stride_tricks import sliding_window_view as swv
MVH = {}
for h in TH_HZ:
    ok = ii + h < NK
    mvh = np.where(ok[:, None], (Cc[np.minimum(ii + h, NK - 1)] - Cc[ii]) / Cc[ii] * 100, np.nan)
    lo = np.full((TT, nP), np.nan); hi = np.full((TT, nP), np.nan)
    Lmin = swv(Ll, h, axis=0).min(axis=2); Hmax = swv(Hh, h, axis=0).max(axis=2)   # [j] = min des bougies j .. j+h−1
    jj = ii + 1; okk = jj + h - 1 < NK
    lo[okk] = Lmin[jj[okk]]; hi[okk] = Hmax[jj[okk]]
    a = np.where(lo <= Cc[ii] * (1 - CAP / 100), -CAP, mvh)
    b = np.where(hi >= Cc[ii] * (1 + CAP / 100), -CAP, -mvh)
    D = (a - b) / 2
    MVH[h] = mvh
    for v in range(nV):
        vr = np.round(V[:, :, v] * 1000)
        m = (np.abs(vr) >= 30) & np.isfinite(D) & okk[:, None]
        HR[(v, h)] = (np.nonzero(m)[0], (vr * D)[m])
# bilan aux horizons de chaque voix, lu à chaque bougie (jugements mûrs : bougie + h ≤ lecture)
def E_all(W, r2=False):
    out = np.full((nV, TT), np.nan)
    tr = np.arange(TT)
    for v in range(nV):
        acc = np.zeros(TT); okv = np.ones(TT, bool)
        for h in TH_HZ:
            rt, x = HR[(v, h)]
            PA = np.concatenate([[0], np.cumsum(x)]); PB = np.concatenate([[0], np.cumsum(np.abs(x))]); PB2 = np.concatenate([[0], np.cumsum(x * x)])
            mm = np.searchsorted(rt, tr - h, side='right'); n = np.minimum(mm, W)
            okv &= n >= FIT_MIN_N
            a_ = PA[mm] - PA[mm - n]; b_ = PB[mm] - PB[mm - n]; b2 = PB2[mm] - PB2[mm - n]
            with np.errstate(invalid='ignore', divide='ignore'):
                E = np.where(b_ > 0, a_ / b_, 0.0)
                if r2:
                    nk = np.where(b2 > 0, b_ * b_ / b2, n); p = (E + 1) / 2; z = Z95
                    lo_ = (p + z * z / (2 * nk) - z * np.sqrt(np.maximum(0, p * (1 - p) / nk + z * z / (4 * nk * nk)))) / (1 + z * z / nk)
                    E = np.where(E <= 0, E, np.where(lo_ > 0.5, 2 * lo_ - 1, 0.0))
            acc += E
        out[v] = np.where(okv, acc / len(TH_HZ), np.nan)
    return out
EW = {W: E_all(W) for W in FITW_GRID}
ER2 = {W: E_all(W, True) for W in (20, 60)}
scale_arr = lambda E: np.clip(np.floor(350 + 1000 * E + 0.5), 50, 2000)
# fitness d'avant chaque jugement à la bougie (règle de fenêtre, mesure hors échantillon)
def fit_before(s, w, W):
    PW = np.concatenate([[0], np.cumsum(w)]); PS = np.concatenate([[0], np.cumsum(s * w)])
    j = np.arange(len(s)); st = np.maximum(0, j - W); cnt = j - st; sw = PW[j] - PW[st]
    with np.errstate(invalid='ignore', divide='ignore'):
        f = np.where((cnt >= FIT_MIN_N) & (sw > 0), np.clip(np.floor(350 + 1000 * (PS[j] - PS[st]) / sw + 0.5), 50, 2000), 350.0)
    return f
NE = TT * nP
NAG = np.zeros(NE)
for (ev, s, w) in CJ: NAG += np.bincount(ev, minlength=NE)
TOT = {W: np.zeros(NE) for W in FITW_GRID}
for (ev, s, w) in CJ:
    for W in FITW_GRID: TOT[W] += np.bincount(ev, weights=fit_before(s, w, W) * s * w, minlength=NE)
HIT = {W: (TOT[W] > 0).astype(float) for W in FITW_GRID}
VALID = NAG >= FITW_MIN_AGENTS
# la règle de fenêtre en version rapide (mêmes calculs : un agent a au plus un jugement par k) — vérifiée contre la version exacte sur D1
def fw_fast(lists, r1=False):
    keys_all = np.concatenate([l[0] for l in lists]) if lists else np.array([])
    if not len(keys_all): return {'window': 60, 'armed': False, 'n': 0}
    uk, cnt = np.unique(keys_all, return_counts=True); keys = uk[cnt >= FITW_MIN_AGENTS]
    out = {'window': FITW_DEFAULT, 'armed': False, 'n': len(keys), 'acc': {}, 'best': FITW_DEFAULT}
    if len(keys) < FITW_MIN_EVENTS: return out
    hits = {}
    for W in FITW_GRID:
        tot = np.zeros(len(keys))
        for (k, s, w) in lists:
            f = fit_before(s, w, W); pos = np.searchsorted(keys, k); m = (pos < len(keys)) & (keys[np.minimum(pos, len(keys) - 1)] == k)
            np.add.at(tot, pos[m], (f * s * w)[m])
        hits[W] = (tot > 0).astype(float)
    acc = lambda h, a, b: h[a:b].mean() if b > a else 0.0
    N = len(keys); half = N // 2; base = acc(hits[60], 0, N); best = 60; bestAcc = base
    for W in FITW_GRID:
        a = acc(hits[W], 0, N); out['acc'][W] = jround(a * 1000) / 10
        if W != 60 and a > bestAcc + 1e-9: bestAcc = a; best = W
    out['best'] = best; out['lo'] = wilson_lo(bestAcc, N)
    ok = best != 60 and bestAcc - base >= FITW_MIN_MARGIN - 1e-9 and acc(hits[best], 0, half) >= acc(hits[60], 0, half) and acc(hits[best], half, N) >= acc(hits[60], half, N)
    if ok and r1 and not (out['lo'] > 0.5): ok = False
    if ok: out['window'] = best; out['armed'] = True
    return out
lists_d1 = []
for a in seats:
    js = [e for e in (a.get('_judgments') or []) if isinstance(e.get('k'), (int, float)) and e['k'] > 0]
    lists_d1.append((np.array([e['k'] for e in js], float), np.array([e['s'] for e in js], float), np.array([e['w'] for e in js], float)))
ff = fw_fast(lists_d1)
assert ff['armed'] == rr['armed'] and ff['window'] == rr['window'] and all(ff['acc'][W] == rr['acc'][W] for W in FITW_GRID), ('règle rapide ≠ exacte', ff, rr)
print('   règle rapide = règle exacte sur D1 (armée %s à %d, %s)' % (ff['armed'], ff['window'], ff['acc']))
# jours
dayOf = (CL // DAY).astype(np.int64); days = np.unique(dayOf)[2:-1]   # deux jours d'historique avant le premier point ; dernier jour incomplet écarté
def zstat(x):
    x = np.asarray([y for y in x if np.isfinite(y)], float)
    if len(x) < 2 or x.std(ddof=1) == 0: return (len(x), float(x.mean()) if len(x) else float('nan'), float('nan'))
    return (len(x), float(x.mean()), float(x.mean() / (x.std(ddof=1) / math.sqrt(len(x)))))
# M2
evDay = np.repeat(dayOf, nP)
SM = {}
for W in FITW_GRID:
    Wt = np.nan_to_num(np.maximum(0, EW[W]), nan=0.0)                 # [voix, bougie]
    Vv = np.where(np.abs(V) >= 0.03, V, 0.0)
    num = np.einsum('vt,tpv->tp', Wt, Vv); den = Wt.sum(0)[:, None]
    with np.errstate(invalid='ignore', divide='ignore'): Cw = np.where(den > 0, num / den, 0.0)
    for h in (1, 4, 16): SM[(W, h)] = np.where(Cw != 0, np.sign(Cw) * MVH[h], np.nan)
CJT = [CL[ev // nP] + M15 for (ev, s, w) in CJ]                     # instant où chaque jugement à la bougie est mûr (croissant)
rows = []; armed_cur = armed_r1 = differ = 0
for d in days:
    tcut = d * DAY                                                   # jugements mûrs à 00:00 UTC : décision + 15 min ≤ 00:00
    lists = []
    for (ev, s, w), mt in zip(CJ, CJT):
        e1 = np.searchsorted(mt, tcut, side='right'); e0 = max(0, e1 - FIT_KEEP)
        lists.append((ev[e0:e1].astype(float), s[e0:e1], w[e0:e1]))
    rc = fw_fast(lists); r1d = fw_fast(lists, True)
    Wc, W1d = win_of(rc), win_of(r1d)
    armed_cur += rc['armed']; armed_r1 += r1d['armed']; differ += (Wc != W1d)
    em = (evDay == d) & VALID; tm = dayOf == d
    row = {'d': int(d), 'Wc': Wc, 'W1': W1d}
    for lab, Wx in (('c', Wc), ('r1', W1d), ('60', 60)):
        row['prec_' + lab] = float(HIT[Wx][em].mean()) if em.any() else float('nan')
        for h in (1, 4, 16):
            x = SM[(Wx, h)][tm]; row['sm%d_%s' % (h, lab)] = float(np.nanmean(x)) if np.isfinite(x).any() else float('nan')
    rows.append(row)
print('M2 règle de fenêtre hors échantillon · %d jours · armée %d jours (d\'aujourd\'hui), %d jours (R1), fenêtres différentes %d jours' % (len(days), armed_cur, armed_r1, differ))
M2 = {'jours': len(days), 'armee_cur': armed_cur, 'armee_r1': armed_r1, 'differ': differ, 'mesures': {}}
bat = False
for lab, key in (('précision de la règle', 'prec'), ('mouvement signé 15 min', 'sm1'), ('mouvement signé 1 h', 'sm4'), ('mouvement signé 4 h', 'sm16')):
    dd = [r[key + '_c'] - r[key + '_60'] for r in rows if r['Wc'] != 60]
    n, m, z = zstat(dd)
    M2['mesures'][key] = {'jours_armee': n, 'ecart_moyen': m, 'z': z}
    print('   %-24s choisie − 60 : %s' % (lab, ('vide (jamais armée)' if n == 0 else '%+.4f sur %d jours armés, z = %s' % (m, n, ('%.2f' % z) if math.isfinite(z) else '—'))))
    if n and math.isfinite(z) and z >= ZMIN: bat = True
M2['bat_60'] = bat
# M3
def rankavg(x):
    from scipy.stats import rankdata
    return rankdata(x)
def spear(a, b):
    m = np.isfinite(a) & np.isfinite(b)
    if m.sum() < 5: return float('nan')
    ra, rb = rankavg(a[m]), rankavg(b[m])
    if ra.std() == 0 or rb.std() == 0: return float('nan')
    return float(np.corrcoef(ra, rb)[0, 1])
tIdx = {int(CL[t]): t for t in range(TT)}
M3 = {}; SP = {k: [] for k in ('c20', 'r20', 'c60', 'r60')}
for d in days:
    tau = tIdx.get(int(d * DAY))
    if tau is None: [SP[k].append(float('nan')) for k in SP]; continue
    F = np.full(nV, np.nan)
    for v in range(nV):
        s_ = 0.0; ok = True
        for h in TH_HZ:
            rt, x = HR[(v, h)]; a0, a1 = np.searchsorted(rt, tau, side='right'), np.searchsorted(rt, tau + 96, side='right')
            if a1 - a0 < FIT_MIN_N: ok = False; break
            xs = x[a0:a1]; s_ += xs.sum() / np.abs(xs).sum() if np.abs(xs).sum() > 0 else 0.0
        if ok: F[v] = s_ / len(TH_HZ)
    SP['c20'].append(spear(scale_arr(EW[20][:, tau]), F)); SP['r20'].append(spear(scale_arr(ER2[20][:, tau]), F))
    SP['c60'].append(spear(scale_arr(EW[60][:, tau]), F)); SP['r60'].append(spear(scale_arr(ER2[60][:, tau]), F))
print('M3 la note prédit-elle la qualité du lendemain ? (Spearman entre voix, par jour)')
perd = False
for W in (20, 60):
    for lab in ('c', 'r'):
        n, m, z = zstat(SP['%s%d' % (lab, W)]); M3['%s%d' % (lab, W)] = {'jours': n, 'moyenne': m, 'z': z}
        print('   W = %3d %-16s : %+.4f sur %d jours, z = %.2f%s' % (W, 'd\'aujourd\'hui' if lab == 'c' else 'R2', m, n, z, ' → PRÉDIT' if (m > 0 and z >= ZMIN) else ''))
    dd = [a - b for a, b in zip(SP['c%d' % W], SP['r%d' % W]) if math.isfinite(a) and math.isfinite(b)]
    n, m, z = zstat(dd); M3['ecart%d' % W] = {'jours': n, 'moyenne': m, 'z': z}
    chg = int(np.sum(scale_arr(EW[W]) != scale_arr(ER2[W])))
    print('   W = %3d écart d\'aujourd\'hui − R2 : %+.4f sur %d jours, z = %.2f · notes changées par R2 : %d voix-bougies sur %d' % (W, m, n, z, chg, int(np.isfinite(EW[W]).sum())))
    if math.isfinite(z) and z >= ZMIN: perd = True
M3['R2_perd'] = perd
OUT['M2'] = M2; OUT['M3'] = M3
# verdicts
v1 = 'ENTRE' if (voit and W1 != W0 and not arm_prouve and not bat) else 'N\'ENTRE PAS'
v2 = 'ENTRE' if (voit and len(chg2) > 0 and not perd) else 'N\'ENTRE PAS'
OUT['verdict'] = {'R1': v1, 'R2': v2}
print('\nVERDICT n° 109 · R1 (fenêtre armée seulement si prouvée) : %s · R2 (note au-dessus de 350 seulement si prouvée) : %s' % (v1, v2))
if A.get('out'): json.dump(OUT, open(A['out'], 'w'), ensure_ascii=False, indent=1, default=str)
