# [PORTE LONG OU RIEN · 21/11/2026] « D'abord go long ou rien comme tu le suggères » (Rams, 21/11 07:01), plan de
# claude/STRATEGIE-AURA8-20261121.md, étape 1. UNE question pré-enregistrée : l'argent de l'EV doit-il suivre la voix tendance longue
# (js/15, js/15b) en « LONG ou rien » — signal SHORT = l'argent de la paire reste en caisse — au lieu de LONG + SHORT ?
# Règles écrites AVANT d'avoir téléchargé ou calculé quoi que ce soit pour cette porte (empreinte SHA-256 des lignes 1 à 46 et heure UTC dans
# la passation ; fichier commité sur la branche travail/long-ou-rien avant le passage). Rien ne sera retouché pour « faire passer ».
#  DÉJÀ VU (dit pour qu'on sache) : porte TENDANCE LONGUE (06/10), forme NON composée à mise 1/11, jugement seul : LONG + SHORT +421 %, pire
#    baisse −61 % ; « LONG ou rien » +484 %, pire baisse −48 %, z 2,73 / 2,75 ; SHORT −0,43 %/semaine en moyenne. Porte POIDS (12/11) : E
#    composé LONG + SHORT, jugement ×68,66 (pire baisse −53 %), contrôle +102 %. En direct depuis le 07/10 : la poche compte les deux formes
#    (S.tendance.tot.net / netL). JAMAIS calculé : « LONG ou rien » en portefeuille composé, ni « LONG ou rien » sur le contrôle 10/2024 → 09/2026.
#  SIGNAL, PRIX, PAIRES, LIQUIDATION, PORTEFEUILLE, COÛTS, LECTURES, PÉRIODES, MESURES : exactement ceux de rejeu/porte_poids.py, répartition
#    E « égal » (celle de l'EV depuis le 12/11) — capital 1 au premier lundi ; chaque lundi : liquidations de la semaine, fermetures au
#    retournement, E = caisse + positions au prix du lundi, w_j = 1 / n (n = paires à signal NON NUL ce lundi, LONG et SHORT), ouverture à
#    min(caisse, w_j × E) ; une position tenue n'est jamais retaillée ; coût 0,13 % par côté sur la mise ; un SHORT est liquidé (−100 % de sa
#    mise) à la première heure close dont le plus haut double l'entrée. Lecture 1 au prix du lundi, lecture 2 un jour plus tard.
#  LES DEUX FORMES (les seules testées) :
#    E « LONG + SHORT » : ce que fait l'EV aujourd'hui (js/15b).
#    X « LONG ou rien » : mêmes décisions, même n, même w_j = 1 / n ; une paire à signal SHORT n'ouvre RIEN : sa part reste en caisse (ce que le
#      comptant réel peut faire sans emprunt). Une paire tenue LONG dont le signal passe SHORT est fermée et sa part reste en caisse.
#    Pas d'autre variante (ni « tout l'argent sur les seules paires LONG », ni levier) : ce serait une autre idée, une autre porte.
#  POURQUOI LA CHARGE DE LA PREUVE EST SUR LE SHORT : la jambe SHORT ne se joue pas au comptant réel (RE), elle seule porte la liquidation
#    (4 en 8 ans, porte du 07/10) et le risque « sous zéro » (règle de Rams du 18/10) ; « perdre peu, gagner gros » (règle de Rams). Elle ne
#    reste que si elle PROUVE qu'elle ajoute de la croissance. Mais X doit aussi faire au moins aussi bien sur le risque : « pas prouvé
#    utile » ne suffit pas seul.
#  VERDICT — X REMPLACE E (l'argent de l'EV suit la voix en LONG ou rien) si, dans LES DEUX lectures, sur le JUGEMENT (10/2018 → 09/2024) :
#    (a) le SHORT n'est pas prouvé utile : z(E − X) < 1,645 (d_t = r_t(E) − r_t(X), mêmes semaines ; erreur type par blocs de 4 semaines non
#        chevauchants, calcul identique à zdiff de porte_poids.py ; unilatéral 5 %) ;
#    (b) pire baisse de X ≤ pire baisse de E ;
#    (c) croissance / pire baisse de X ≥ celle de E (calcul de porte_poids.py : croissance / max(pire baisse, 1e-9)) ;
#    ET (d) sur le CONTRÔLE (10/2024 → 09/2026, lecture 1, jamais vu pour X) : croissance / pire baisse de X ≥ celle de E.
#    Sinon E reste (LONG + SHORT), et c'est dit à Rams avec les chiffres.
#  TÉMOINS (CLAUDE.md 10, avant tout verdict) : (T1) fidélité — E de cette porte refait la série hebdomadaire de E de porte_poids.py
#    (même code, appelé) à 1e-12 près, dans les deux lectures et sur le contrôle ; sinon « PORTE FAUSSE », pas de verdict. (T2) la porte VOIT
#    la différence — au moins une semaine où r(X) ≠ r(E) et au moins un trade SHORT dans E ; sinon « PORTE AVEUGLE », pas de verdict.
#  RAPPORTÉ (informatif, hors verdict) : par année (jugement et contrôle) ; multiple final ; trades ; SHORT liquidés dans E ; part moyenne
#    de l'argent de X en caisse ; z de X − E (le sens inverse) ; les 30 meilleures semaines de X.
#  PUISSANCE (dite avant) : ~310 lundis ; la différence E − X est la jambe SHORT, déjà vue négative en moyenne en forme non composée :
#    (a) devrait tenir ; les vrais tests sont (b), (c) dans les deux lectures et (d) sur un contrôle jamais calculé pour X.
#  À LA LIVRAISON SI X PASSE (mission go long-ou-rien, dit à Rams le 21/11 avant son « go ») : js/15b n'ouvre plus que les LONG de la poche,
#    à la même mise 1 / n (n = paires tenues par la poche) ; les SHORT de la voix dans l'EV sont fermés au prix du moment par closePosition
#    { voix } (l'argent revient en caisse). La poche (js/15) n'est pas touchée : elle continue de mesurer les deux formes.
#  NON MODÉLISÉ : montant minimal d'ordre, glissement au-delà du barème, frais sur la mise et non sur la valeur de sortie, impôt (33 %
#    spéculatif en AUTO : même facteur pour X et E sur les gains, il ne change pas l'ordre des croissances).
#  Aucun code de l'app n'est touché par ce fichier (mesure seule).
# usage : sh rejeu/portage_get.sh <données> 2018-08 2026-09 ; python3 -I rejeu/porte_long_ou_rien.py <données>
#         (écrit <données>/porte_long_ou_rien.json)
# ---------------------------------------------------------------------------------------------------------------------------------------------
import sys, os, json, math, hashlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
D = sys.argv[1]
_hdr = ''.join(open(os.path.abspath(__file__), encoding='utf-8').readlines()[:46])
print('empreinte des règles (lignes 1–46) :', hashlib.sha256(_hdr.encode('utf-8')).hexdigest())

# moteur de la porte POIDS, appelé tel quel (chargeur de tendance_longue.py, first_liq, run, growth, maxdd, zdiff) — sans son passage
_pp = open(os.path.join(HERE, 'porte_poids.py'), encoding='utf-8').read()
_head, _rest = _pp.split('import sys, os, json, math, hashlib, datetime', 1)
G = {'__name__': 'porte_poids_moteur', '__file__': os.path.join(HERE, 'porte_poids.py')}
sys.argv = ['porte_poids.py', D]
exec('import sys, os, json, math, hashlib, datetime' + _rest.split("pct = lambda")[0], G)
P, NP, MON, DAY0, DAY, NDAYS, H = G['P'], G['NP'], G['MON'], G['DAY0'], G['DAY'], G['NDAYS'], G['H']
J0, J1, C0, C1, ANS, ANS_C, SIDE = G['J0'], G['J1'], G['C0'], G['C1'], G['ANS'], G['ANS_C'], G['SIDE']
first_liq, growth, maxdd, zdiff, run_E = G['first_liq'], G['growth'], G['maxdd'], G['zdiff'], G['run']

def run(t0, t1, lect=1, longonly=False):
    """copie de porte_poids.run (kind 'E', sans rééquilibrage) + la seule différence de X : un signal SHORT n'ouvre rien"""
    mons = [d for d in MON if t0 <= DAY0 + d * DAY < t1 and d >= 28]
    cash, pos = 1.0, {}
    weekly, ntr, nshort, nliq, cashw = [], 0, 0, 0, []
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
    for d in mons:
        w = DAY0 + d * DAY; wx = w + (0 if lect == 1 else DAY)
        for j in list(pos):
            if pos[j][0] < 0:
                tl = first_liq(j, pos[j][3] // H * H + H, wx, pos[j][2])
                if tl is not None:
                    pos.pop(j); ntr += 1; nliq += 1
        E0 = equity(d)
        if prevE is not None and prevE > 0 and E0 > 0: weekly.append((w, math.log(E0 / prevE)))
        sig = {}
        for j in range(NP):
            pw, pl = P[d, j], P[d - 28, j]
            if np.isfinite(pw) and np.isfinite(pl) and np.isfinite(px(d, j)): sig[j] = float(np.sign(pw / pl - 1))
        for j in list(pos):
            if j in sig and sig[j] != pos[j][0]:
                x = px(d, j); v = val(j, x); cash += v - SIDE * pos[j][1]; pos.pop(j); ntr += 1
        act = [j for j in sig if sig[j] != 0]
        if act:
            E = equity(d)
            W = {j: 1.0 / len(act) for j in act}
            for j in sorted([j for j in act if j not in pos], key=lambda k: -W[k]):
                if longonly and sig[j] < 0: continue          # X : la part d'une paire SHORT reste en caisse
                m = min(cash, W[j] * E)
                if m > 1e-12:
                    cash -= m + SIDE * m
                    if cash < 0: m += cash / (1 + SIDE); cash = 0.0
                    pos[j] = [sig[j], m, px(d, j), wx]
                    if sig[j] < 0: nshort += 1
        prevE = equity(d)
        if prevE > 0: cashw.append(cash / prevE)
    dend = next((d for d in range(NDAYS) if DAY0 + d * DAY >= t1), NDAYS - 1)
    for j in list(pos):
        x = px(dend, j)
        if not np.isfinite(x): x = pos[j][2]
        cash += val(j, x) - SIDE * pos[j][1]; pos.pop(j); ntr += 1
    if prevE and cash > 0: weekly.append((DAY0 + dend * DAY, math.log(cash / prevE)))
    return dict(weekly=weekly, final=cash, trades=ntr, short=nshort, liq=nliq, caisse=float(np.mean(cashw)) if cashw else 0.0)

pct = lambda x: f"{(math.exp(x) - 1) * 100:+.0f} %"
ratio = lambda g, dd: g / max(dd, 1e-9)
out = {}
for lect in (1, 2):
    out[('E', lect, 'J')] = run(J0, J1, lect)
    out[('X', lect, 'J')] = run(J0, J1, lect, longonly=True)
out[('E', 1, 'C')] = run(C0, C1, 1)
out[('X', 1, 'C')] = run(C0, C1, 1, longonly=True)

# ── témoins ──
fid = []
for key, (t0, t1, lect) in {('E', 1, 'J'): (J0, J1, 1), ('E', 2, 'J'): (J0, J1, 2), ('E', 1, 'C'): (C0, C1, 1)}.items():
    ref = run_E('E', t0, t1, lect)['weekly']; mine = out[key]['weekly']
    ok = len(ref) == len(mine) and all(a[0] == b[0] and abs(a[1] - b[1]) < 1e-12 for a, b in zip(ref, mine))
    fid.append(ok)
    print(f"  T1 fidélité {key} : E de cette porte = E de porte_poids.py, {len(mine)} semaines → {'✓' if ok else '✗'}")
T1 = all(fid)
ndiff = sum(1 for (a, ra), (b, rb) in zip(out[('E', 1, 'J')]['weekly'], out[('X', 1, 'J')]['weekly']) if abs(ra - rb) > 1e-12)
T2 = ndiff > 0 and out[('E', 1, 'J')]['short'] > 0
print(f"  T2 la porte voit la différence : {ndiff} semaines où X ≠ E, {out[('E', 1, 'J')]['short']} SHORT ouverts par E → {'✓' if T2 else '✗'}")

print('\nPORTE LONG OU RIEN — portefeuille composé, tout l\'argent de l\'EV, répartition « égal »')
res = {}
for k in ('E', 'X'):
    for lect in (1, 2):
        R = out[(k, lect, 'J')]; wk = R['weekly']
        res[(k, lect)] = dict(g=growth(wk), dd=maxdd(wk), yrs=[growth(wk, a, b) for a, b in ANS], final=R['final'], trades=R['trades'],
                              short=R['short'], liq=R['liq'], caisse=R['caisse'])
        r = res[(k, lect)]
        print(f"  {k} lecture {lect} · jugement : ×{r['final']:.2f} ({pct(r['g'])}) · pire baisse {pct(-r['dd'])} · gain/baisse {ratio(r['g'], r['dd']):.2f} · "
              f"{r['trades']} trades ({r['short']} SHORT, {r['liq']} liquidés) · caisse moyenne {r['caisse'] * 100:.0f} % · par année " + ' / '.join(pct(y) for y in r['yrs']))
    C = out[(k, 1, 'C')]; wk = C['weekly']
    res[(k, 'C')] = dict(g=growth(wk), dd=maxdd(wk), yrs=[growth(wk, a, b) for a, b in ANS_C], final=C['final'], liq=C['liq'])
    r = res[(k, 'C')]
    print(f"  {k} contrôle 10/2024 → 09/2026 : ×{r['final']:.2f} ({pct(r['g'])}) · pire baisse {pct(-r['dd'])} · gain/baisse {ratio(r['g'], r['dd']):.2f} · "
          f"{C['liq']} liquidés · par année " + ' / '.join(pct(y) for y in r['yrs']))

det = []
for lect in (1, 2):
    z, s = zdiff(out[('E', lect, 'J')]['weekly'], out[('X', lect, 'J')]['weekly'])
    a = not (z >= 1.645)
    b = res[('X', lect)]['dd'] <= res[('E', lect)]['dd']
    c = ratio(res[('X', lect)]['g'], res[('X', lect)]['dd']) >= ratio(res[('E', lect)]['g'], res[('E', lect)]['dd'])
    det.append(dict(lect=lect, z=z, a=a, b=b, c=c))
dC = ratio(res[('X', 'C')]['g'], res[('X', 'C')]['dd']) >= ratio(res[('E', 'C')]['g'], res[('E', 'C')]['dd'])
passe = all(x['a'] and x['b'] and x['c'] for x in det) and dC
print('\n  X contre E : ' + ' · '.join(f"lecture {x['lect']} : z(E − X) {x['z']:+.2f} ({'✓' if x['a'] else '✗'} SHORT pas prouvé utile), "
      f"pire baisse {'✓' if x['b'] else '✗'}, gain/baisse {'✓' if x['c'] else '✗'}" for x in det) + f" · contrôle gain/baisse {'✓' if dC else '✗'}")
zi, _ = zdiff(out[('X', 1, 'J')]['weekly'], out[('E', 1, 'J')]['weekly'])
wX = sorted((r for _, r in out[('X', 1, 'J')]['weekly']), reverse=True)
print(f"  (informatif) z(X − E) lecture 1 : {zi:+.2f} · X : les 30 meilleures semaines portent {sum(wX[:30]):+.2f} de log-croissance sur {sum(wX):+.2f}")
if not T1: verdict = 'PORTE FAUSSE (témoin de fidélité) : pas de verdict'
elif not T2: verdict = 'PORTE AVEUGLE (ne voit aucune différence) : pas de verdict'
else: verdict = 'X PASSE : l\'argent de l\'EV suit la voix en LONG ou rien' if passe else 'X NE PASSE PAS : E reste (LONG + SHORT)'
print(f"\nVERDICT : {verdict}")
json.dump(dict(verdict=verdict, passe=bool(T1 and T2 and passe), T1=T1, T2=T2, ndiff=ndiff, det=det, controle=dC,
               res={f"{k[0]}_{k[1]}": v for k, v in res.items()}), open(os.path.join(D, 'porte_long_ou_rien.json'), 'w'), default=float, indent=1)
