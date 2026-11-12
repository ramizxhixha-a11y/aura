# [PORTE POIDS · 12/11/2026] « Go tendances réelle tout » puis (Rams 12/11 19:56) : « diviser par 11 n'est pas stratège, prendre les plus favorables et
# les favoriser ». UNE question pré-enregistrée : comment répartir TOUT l'argent de l'EV entre les paires de la voix tendance longue (js/15).
# Règles écrites AVANT d'avoir calculé le moindre résultat pondéré (empreinte SHA-256 des lignes 1 à 45 et heure UTC dans la passation).
# Rien ne sera retouché pour « faire passer ».
#  DÉJÀ VU (dit pour qu'on sache) : la règle de signal (porte TENDANCE LONGUE 06/10, z 2,83) et sa forme tenue à mise 1/11 NON composée
#    (rejeu 8 ans du 07/10). JAMAIS calculé : un portefeuille composé (l'argent de l'EV qui grossit ou fond), ni aucune pondération.
#  SIGNAL, PRIX, PAIRES, LIQUIDATION : exactement ceux de rejeu/voix_tendance_ref.py (chargeur de rejeu/tendance_longue.py) — signe de
#    P_w / P_(w−28 j) au lundi 00:00 UTC, position tenue jusqu'au retournement, un SHORT liquidé (−100 % de sa mise) à la première heure close
#    dont le plus haut double l'entrée ; coût 0,13 % par côté sur la mise (barème de l'EV), pas de levier, pas de financement.
#  PORTEFEUILLE (ce que l'app peut faire avec openPosition / closePosition, sans renforcer ni réduire une position tenue) : capital 1 au
#    premier lundi de la période. Chaque lundi, dans cet ordre : (1) liquidations de la semaine écoulée ; (2) fermetures (retournement ou
#    signal nul) → l'argent revient en caisse, coût déduit ; (3) E = caisse + valeur des positions tenues au prix du lundi ; (4) poids w_j des
#    paires qui ont un signal non nul ce lundi (Σ w = 1) ; (5) chaque paire à ouvrir (signal non nul, pas de position) reçoit
#    min(caisse, w_j × E), les paires à ouvrir traitées par poids décroissant. Une position tenue n'est jamais retaillée. Valeur d'une
#    position de mise m entrée à x0 : LONG m·x/x0 ; SHORT m·max(0, 2 − x/x0).
#  TROIS RÉPARTITIONS (les seules testées) :
#    E « égal »        w_j = 1 / n (n = paires à signal non nul ce lundi) — la référence, la règle de la porte.
#    F « force »       w_j ∝ |ln(P_w / P_(w−28 j))| : plus d'argent sur les tendances 28 j les plus fortes (l'idée de Rams).
#    V « risque égal » w_j ∝ 1 / σ_j, σ_j = écart-type des 28 rendements journaliers ln(P_d / P_(d−1)) des 28 jours avant w (P du jour de
#                      l'en-tête de tendance_longue.py) : chaque paire pèse le même risque (paires nerveuses moins chargées).
#    Aucun chiffre posé à la main : les poids viennent des prix. Une paire sans σ calculable (jour manquant) reçoit le poids moyen des autres.
#  LECTURES : 1 = exécution au prix du lundi P_w ; 2 = mêmes décisions exécutées 1 jour plus tard (P_(w+1)), liquidation dès l'entrée réelle.
#  PÉRIODES : JUGEMENT = lundis du 01/10/2018 au 30/09/2024 (6 années 10→09), portefeuille parti de 1, positions fermées au prix du
#    01/10/2024 (coût compté). CONTRÔLE = 01/10/2024 → 30/09/2026, portefeuille reparti de 1.
#  MESURES : r_t = rendement logarithmique hebdomadaire du portefeuille (valeur au lundi suivant / valeur au lundi). Croissance = Σ r_t.
#    Pire baisse = plus grande chute log depuis un sommet. Écart d_t = r_t(X) − r_t(E), mêmes semaines.
#  VERDICT (pour X = F, puis X = V, chacune contre E) — X REMPLACE E si, dans LES DEUX lectures :
#    (a) z = moyenne(d) / erreur type ≥ 1,96 sur le jugement (deux alternatives testées : 0,05 / 2 unilatéral ≈ 1,96). Erreur type par
#        blocs de 4 semaines non chevauchants (sommes de d par bloc ; z = Σ blocs / (√nb × écart-type des blocs)) : les semaines tenues
#        se ressemblent ;
#    (b) croissance de X > celle de E dans au moins 4 des 6 années du jugement ;
#    (c) croissance / pire baisse de X ≥ celle de E sur le jugement (« perdre peu, gagner gros » : plus de gain par unité de chute) ;
#    (d) croissance de X ≥ celle de E sur le contrôle (lecture 1) : condition nécessaire, pas verdict.
#    Si F et V passent toutes les deux : celle au plus grand z (lecture 1). Si aucune ne passe : E reste — l'argent de l'EV est réparti
#    également, et c'est dit à Rams avec les chiffres.
#  RAPPORTÉ (informatif, hors verdict) : par année ; trades ; pire baisse ; multiple final ; F et V en version « rééquilibrée chaque lundi »
#    (positions retaillées à w_j × E, coût 0,13 % sur la mise déplacée) — ce que l'app ne sait pas faire aujourd'hui ; la part du gain
#    portée par les 30 meilleures semaines.
#  PUISSANCE (dite avant) : ~310 lundis ; les répartitions se ressemblent (mêmes signaux, mêmes sens) : seul un écart net et régulier peut
#    passer (a). Un « non prouvé » ne veut pas dire « faux » : il veut dire qu'on ne mise pas l'argent dessus.
#  NON MODÉLISÉ : montant minimal d'ordre, glissement au-delà du barème, frais calculés sur la mise et non sur la valeur de sortie,
#    l'impôt (33 % spéculatif sur les gains en AUTO : même facteur pour les trois répartitions, il ne change pas l'ordre).
#  Aucun code de l'app n'est touché par ce fichier (mesure seule).
# usage : sh rejeu/portage_get.sh <données> 2018-08 2026-09 ; python3 -I rejeu/porte_poids.py <données>   (écrit <données>/porte_poids.json)
# ---------------------------------------------------------------------------------------------------------------------------------------------
import sys, os, json, math, hashlib, datetime
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
D = sys.argv[1]
_hdr = ''.join(open(os.path.abspath(__file__), encoding='utf-8').readlines()[:45])
print('empreinte des règles (lignes 1–45) :', hashlib.sha256(_hdr.encode('utf-8')).hexdigest())
src = open(os.path.join(HERE, 'tendance_longue.py'), encoding='utf-8').read()
sys.argv = ['x', D]
exec(src.split('# ---- 1. ')[0])          # P, PAIRS, NP, DAY0, DAY, NDAYS, MON, J0, J1, C0, C1, T, iso, rows, SIDE_A, ANS, ANS_C
H = 3600000
HI = {}
for j, p in enumerate(PAIRS):
    hs = {}
    for f in sorted(x for x in os.listdir(os.path.join(D, 'spot1h')) if x.startswith(p + 'USDT-1h-')):
        for r in rows(os.path.join(D, 'spot1h', f)):
            t = int(r[0]); t = t // 1000 if t > 1e14 else t
            hs[t] = float(r[2])
    ts = np.array(sorted(hs)); HI[j] = (ts, np.array([hs[t] for t in ts]))
def first_liq(j, t_from, t_to, x0):
    ts, hi = HI[j]
    a, b = np.searchsorted(ts, t_from, 'left'), np.searchsorted(ts, t_to - H, 'right')
    k = np.nonzero(hi[a:b] >= 2 * x0)[0]
    return int(ts[a + k[0]]) if len(k) else None
SIDE = SIDE_A

def weights(kind, d, act):
    """act : indices des paires à signal non nul au lundi d ; rend {j: w}"""
    if kind == 'E': return {j: 1.0 / len(act) for j in act}
    if kind == 'F':
        raw = {j: abs(math.log(P[d, j] / P[d - 28, j])) for j in act}
    else:
        raw = {}
        for j in act:
            seg = P[d - 28:d + 1, j]
            if len(seg) == 29 and np.all(np.isfinite(seg)) and np.all(seg > 0):
                s = float(np.std(np.diff(np.log(seg))))
                raw[j] = 1.0 / s if s > 0 else None
            else: raw[j] = None
        ok = [v for v in raw.values() if v is not None]
        mean = (sum(ok) / len(ok)) if ok else 1.0
        raw = {j: (v if v is not None else mean) for j, v in raw.items()}
    tot = sum(raw.values())
    if not (tot > 0): return {j: 1.0 / len(act) for j in act}
    return {j: v / tot for j, v in raw.items()}

def run(kind, t0, t1, lect=1, rebal=False):
    mons = [d for d in MON if t0 <= DAY0 + d * DAY < t1 and d >= 28]
    cash, pos = 1.0, {}                  # pos[j] = [signe, mise, x0, t_entrée]
    weekly, ntr, hist = [], 0, []
    def px(d, j):
        dd = d + (0 if lect == 1 else 1)
        return P[dd, j] if 0 <= dd < NDAYS else np.nan
    def val(j, x):
        s, m, x0, _ = pos[j]
        return m * x / x0 if s > 0 else m * max(0.0, 2 - x / x0)
    def equity(d):
        e = cash
        for j in pos:
            x = px(d, j)
            e += val(j, x) if np.isfinite(x) else pos[j][1]
        return e
    prevE = None
    for i, d in enumerate(mons):
        w = DAY0 + d * DAY; wx = w + (0 if lect == 1 else DAY)
        for j in list(pos):                                   # (1) liquidations
            if pos[j][0] < 0:
                tl = first_liq(j, pos[j][3] // H * H + H, wx, pos[j][2])
                if tl is not None:
                    pos.pop(j); ntr += 1                       # la mise est perdue, pas de coût
        E0 = equity(d)
        if prevE is not None and prevE > 0 and E0 > 0: weekly.append((w, math.log(E0 / prevE)))
        sig = {}
        for j in range(NP):
            pw, pl = P[d, j], P[d - 28, j]
            if np.isfinite(pw) and np.isfinite(pl) and np.isfinite(px(d, j)): sig[j] = float(np.sign(pw / pl - 1))
        for j in list(pos):                                   # (2) fermetures
            if j in sig and sig[j] != pos[j][0]:
                x = px(d, j); v = val(j, x); cash += v - SIDE * pos[j][1]; pos.pop(j); ntr += 1
        act = [j for j in sig if sig[j] != 0]
        if act:
            E = equity(d)                                       # (3)
            W = weights(kind, d, act)                           # (4)
            if rebal:
                for j in list(pos):
                    if j in W:
                        x = px(d, j); v = val(j, x); tgt = W[j] * E
                        if abs(tgt - v) > 1e-12:
                            cash += v - tgt - SIDE * abs(tgt - v)
                            pos[j] = [pos[j][0], tgt, x, pos[j][3]] if tgt > 0 else None
                            if pos[j] is None: pos.pop(j)
            for j in sorted([j for j in act if j not in pos], key=lambda k: -W[k]):   # (5)
                m = min(cash, W[j] * E)
                if m > 1e-12:
                    cash -= m + SIDE * m
                    if cash < 0: m += cash / (1 + SIDE); cash = 0.0
                    pos[j] = [sig[j], m, px(d, j), wx]
        prevE = equity(d)
    dend = next((d for d in range(NDAYS) if DAY0 + d * DAY >= t1), NDAYS - 1)   # fin : tout fermé
    for j in list(pos):
        x = px(dend, j)
        if not np.isfinite(x): x = pos[j][2]
        cash += val(j, x) - SIDE * pos[j][1]; pos.pop(j); ntr += 1
    if prevE and cash > 0: weekly.append((DAY0 + dend * DAY, math.log(cash / prevE)))
    return dict(weekly=weekly, final=cash, trades=ntr)

def growth(wk, a=None, b=None):
    return sum(r for t, r in wk if (a is None or a <= t < b))
def maxdd(wk):
    c, peak, dd = 0.0, 0.0, 0.0
    for _, r in wk:
        c += r; peak = max(peak, c); dd = max(dd, peak - c)
    return dd
def zdiff(wx, we):
    de = dict(we); d = [r - de[t] for t, r in wx if t in de]
    blocks = [sum(d[i:i + 4]) for i in range(0, len(d) - len(d) % 4, 4)]
    if len(blocks) < 2: return float('nan'), 0.0
    sd = float(np.std(blocks, ddof=1))
    return (sum(blocks) / (math.sqrt(len(blocks)) * sd) if sd > 0 else float('nan')), sum(d)

pct = lambda x: f"{(math.exp(x) - 1) * 100:+.0f} %"
out = {}
for lect in (1, 2):
    for kind in ('E', 'F', 'V'):
        out[(kind, lect, 'J')] = run(kind, J0, J1, lect)
        if lect == 1:
            out[(kind, 1, 'C')] = run(kind, C0, C1, 1)
            if kind != 'E':
                out[(kind, 1, 'JR')] = run(kind, J0, J1, 1, rebal=True)
                out[(kind, 1, 'CR')] = run(kind, C0, C1, 1, rebal=True)
print('\nPORTE POIDS — portefeuille composé, tout l\'argent, forme tenue de la voix tendance longue')
res = {}
for kind in ('E', 'F', 'V'):
    for lect in (1, 2):
        R = out[(kind, lect, 'J')]; wk = R['weekly']
        g = growth(wk); dd = maxdd(wk); yrs = [growth(wk, a, b) for a, b in ANS]
        res[(kind, lect)] = dict(g=g, dd=dd, yrs=yrs, trades=R['trades'], final=R['final'])
        print(f"  {kind} lecture {lect} · jugement : ×{R['final']:.2f} ({pct(g)}) · pire baisse {pct(-dd)} · {R['trades']} trades · par année "
              + ' / '.join(pct(y) for y in yrs))
    C = out[(kind, 1, 'C')]
    res[(kind, 'C')] = growth(C['weekly'])
    print(f"  {kind} contrôle 10/2024 → 09/2026 : ×{C['final']:.2f} ({pct(res[(kind, 'C')])}) · pire baisse {pct(-maxdd(C['weekly']))}")
verdict = {}
for X in ('F', 'V'):
    ok, det = True, []
    for lect in (1, 2):
        z, s = zdiff(out[(X, lect, 'J')]['weekly'], out[('E', lect, 'J')]['weekly'])
        a = z >= 1.96
        b = sum(1 for x, e in zip(res[(X, lect)]['yrs'], res[('E', lect)]['yrs']) if x > e) >= 4
        c = (res[(X, lect)]['g'] / max(res[(X, lect)]['dd'], 1e-9)) >= (res[('E', lect)]['g'] / max(res[('E', lect)]['dd'], 1e-9))
        det.append(dict(lect=lect, z=z, a=a, ans=sum(1 for x, e in zip(res[(X, lect)]['yrs'], res[('E', lect)]['yrs']) if x > e), b=b, c=c))
        ok = ok and a and b and c
    dctl = res[(X, 'C')] >= res[('E', 'C')]
    ok = ok and dctl
    verdict[X] = dict(passe=ok, det=det, controle=dctl)
    print(f"\n  {X} contre E : " + ' · '.join(f"lecture {x['lect']} : z {x['z']:+.2f} ({'✓' if x['a'] else '✗'}), années gagnées {x['ans']}/6 ({'✓' if x['b'] else '✗'}), "
          f"gain/baisse {'✓' if x['c'] else '✗'}" for x in det) + f" · contrôle {'✓' if dctl else '✗'} → {'PASSE' if ok else 'NE PASSE PAS'}")
for X in ('F', 'V'):
    JR, CR = out[(X, 1, 'JR')], out[(X, 1, 'CR')]
    print(f"  (informatif) {X} rééquilibrée chaque lundi : jugement ×{JR['final']:.2f} ({pct(growth(JR['weekly']))}), pire baisse {pct(-maxdd(JR['weekly']))} · "
          f"contrôle ×{CR['final']:.2f}")
wE = sorted((r for _, r in out[('E', 1, 'J')]['weekly']), reverse=True)
print(f"  (informatif) E : les 30 meilleures semaines portent {sum(wE[:30]):+.2f} de log-croissance sur {sum(wE):+.2f}")
gagn = [X for X in ('F', 'V') if verdict[X]['passe']]
choix = max(gagn, key=lambda X: verdict[X]['det'][0]['z']) if gagn else 'E'
print(f"\nVERDICT : répartition retenue pour l'argent de l'EV = {choix}" + ('' if gagn else ' (aucune pondération ne bat l\'égalité : non prouvé)'))
json.dump(dict(choix=choix, verdict=verdict,
               res={f"{k[0]}_{k[1]}": v for k, v in res.items()}), open(os.path.join(D, 'porte_poids.json'), 'w'), default=float, indent=1)
