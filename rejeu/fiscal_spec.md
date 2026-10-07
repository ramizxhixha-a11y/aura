# Registre fiscal belge d'AURA — spécification (07/10/2026)

Cette spécification décrit, sans code, ce que le registre fiscal doit calculer. Elle sert à écrire une
référence indépendante (`rejeu/fiscal_ref.py`) qui rejoue des scénarios et produit les résultats attendus.

## 1. La loi appliquée (Belgique, plus-values réalisées depuis le 01/01/2026)

- Année fiscale = année civile, en heure de Bruxelles (`Europe/Brussels`).
- Deux régimes, qui ne se compensent jamais entre eux :
  - **Normal** (gestion normale du patrimoine privé) : taux 10 %. Exonération de base B = 10 000 € par an.
    Exonération complémentaire : chaque année close ajoute `min(1 000, max(0, B − base utilisée))` à un report
    accumulé (sans limite de durée) ; ce qui a servi est retiré du report. La même année, au plus
    `5 000 €` du report sont utilisables (le reste continue d'être reporté). Moins-values de l'année déduites
    des plus-values de l'année ; aucun report de perte. Aucun frais déduit.
  - **Spéculatif** : taux 33 % × (1 + c/100), c = additionnels communaux en %. Aucune exonération.
    Net = plus-values − moins-values − frais de courtage. Les pertes nettes spéculatives des 5 années
    précédentes sont déduites d'un net positif (les plus anciennes d'abord). Une année close en perte nette
    reporte cette perte ; une perte de l'année A est utilisable par les années A+1 … A+5.
- Montants des années sans table publiée : ceux de 2026 (B = 10 000, complément 1 000/an, plafond 5 000).

## 2. Classification d'un trade (règle de Rams)

Normal si et seulement si : ouvert à la main (`auto` n'est pas `true`) ET sens `long` ET aucun emprunt
(`levBorrowed` ≤ 0 et `totalExposure` ≤ `stakeUsdt`). Sinon spéculatif.

## 3. Gain légal d'un trade, en euros

- N = `totalExposure` (ou `stakeUsdt` si absent/0). P = P&L du trade en $. s = glissement en $. f = frais de courtage en $.
- r_in = cours USD→EUR à l'ouverture (`_fxIn` s'il est > 0, sinon r_out). r_out = cours au moment de la fermeture.
- g = P − s.
- LONG : gain = (N + g) × r_out − N × r_in.
- SHORT : gain = N × r_in − (N − g) × r_out.
- Gain ≥ 0 → plus-value de son régime ; gain < 0 → moins-value (valeur absolue).
- Spéculatif seulement : frais déduits = f × r_out (en €) s'ajoutent aux frais de l'année.

## 4. Impôt dû d'une année (en €), à tout instant

Normal :
- N_y = plus-values − moins-values (normal) ; G = plus-values nettes hors AURA de l'année (réglage, en €,
  peut être négatif) — **seulement pour le mode `real`**, 0 pour les autres modes.
- comp = min(5 000, report accumulé au 1er janvier de l'année).
- E = B + comp.
- imposable_N = max(0, max(0, N_y + G − E) − max(0, G − E)). impôt_N = 10 % × imposable_N.
  (Une perte AURA qui baisse l'impôt des gains hors AURA ne rend pas la part d'AURA négative : elle vaut 0 ;
  l'économie = 10 % × max(0, max(0, G − E) − max(0, N_y + G − E)) est seulement affichée.)
- base utilisée = min(B, max(0, N_y + G)) ; complément utilisé = min(comp, max(0, N_y + G − B)).

Spéculatif :
- S_y = plus-values − moins-values − frais (spéculatif).
- pertes disponibles = somme des pertes reportées valables pour l'année (années y−5 … y−1).
- utilisé = min(pertes disponibles, S_y) si S_y > 0, sinon 0.
- imposable_S = max(0, S_y − utilisé). impôt_S = 0,33 × (1 + c/100) × imposable_S.

Dû = impôt_N + impôt_S.

## 5. Clôture d'une année (au premier événement d'une année ultérieure)

Dans l'ordre, pour chaque année k depuis la première année du registre jusqu'à l'année de l'événement − 1
(une année sans trade existe aussi, vide, et se clôt) :
- dû figé = Dû(k) avec les réglages au moment de la clôture.
- report complémentaire = max(0, report à l'ouverture de k − complément utilisé en k) + min(1 000, max(0, B − base utilisée en k)).
- pertes spéculatives : retirer « utilisé » des pertes reportées, des plus anciennes aux plus récentes ; si S_k < 0,
  ajouter une perte (année k, −S_k) ; ne garder que les pertes d'années ≥ k + 1 − 5.
- Une année ouverte reçoit le report (complément et pertes, filtrées aux années ≥ y − 5) tel qu'il est à son ouverture.
- Seule une fermeture de trade crée le registre ; avant elle, un réajustement, un réglage ou « payé » ne font rien
  (mouvement 0, aucune année). La première année du registre = l'année de cette première fermeture (report
  initial : 0, aucune perte).

## 6. Le dépôt fiscal (en $)

Comptes du mode : trading T et dépôt D. Chaque année a une provision P_y (en $) et un manque M_y.

**Rapprochement** (avant tout mouvement) : si la somme des P_y des années non payées dépasse D, réduire les P_y
de l'écart, de l'année la plus récente vers la plus ancienne ; chaque montant retiré d'une année s'ajoute à son
manque M_y (il sera recomplété : une année close avec un manque est remise au dû à la fermeture ou au réajustement suivant).

**Remise au dû** d'une année y, au cours r : cible = Dû_y / r ; δ = cible − P_y.
- δ > 1e-9 : prise = min(δ, max(0, T)) ; T −= prise ; D += prise ; P_y += prise ; mouvement = +prise.
- δ < −1e-9 : rendu = min(−δ, P_y, max(0, D)) ; D −= rendu ; T += rendu ; P_y −= rendu ; mouvement = −rendu.
- M_y = max(0, cible − P_y).

**Fermeture d'un trade** à l'instant t, au cours r :
1. y = année de t ; clore les années passées (§5).
2. Remettre au dû, au cours r, chaque année passée non payée qui vient d'être close ou qui a un manque > 1e-9
   (années croissantes).
3. Recalculer Dû_y (avant le trade) et remettre au dû l'année y au cours r (réévaluation au cours du moment : ce
   mouvement n'est PAS imputé au trade).
4. Ajouter le trade à l'année y (§3), recalculer Dû_y, remettre au dû l'année y au cours r.
   Le mouvement de cette étape 4 est « le mouvement du trade ».

**Réajustement** à l'instant t (passe du bot, changement de réglage), au cours r : étapes 1 et 2, puis recalculer
Dû_y et remettre au dû l'année y.

**Payé** (année close non payée) : sortie = min(P_y, max(0, D)) ; D −= sortie ; P_y = 0 ; M_y = 0 ; année marquée payée.

## 7. Format des scénarios (`banc-fixtures/fiscal-scenarios.json`)

```json
[{ "name": "...", "mode": "real" | "paperReal" | "sim",
   "start": { "trading": 1000, "fiscal": 0 }, "cfg": { "commune": 0, "ext": { "2026": 0 } },
   "events": [
     { "type": "close", "t": <ms>, "fx": 0.86, "pnlUsd": 12.3, "tradingFee": 0.2, "slipFee": 0.06,
       "pos": { "pair": "BTC/USDT", "side": "long", "auto": false, "stakeUsdt": 100, "levBorrowed": 0,
                "totalExposure": 100, "entryPrice": 60000, "_fxIn": 0.85 } },
     { "type": "adjust", "t": <ms>, "fx": 0.86 },
     { "type": "cfg", "t": <ms>, "fx": 0.86, "commune": 7, "ext": { "2026": 2500 } },   // puis réajustement
     { "type": "trading", "set": 0 },                                                    // T forcé (manque)
     { "type": "fiscal", "set": 0 },                                                     // D forcé (remise à zéro)
     { "type": "pay", "t": <ms>, "year": 2026 }
   ] }]
```

Sortie attendue par événement : `{ "moved": <mouvement du trade ou somme des mouvements du réajustement>,
"trading": T, "fiscal": D, "years": { "<y>": { "prov": P_y, "due": Dû_y, "short": M_y, "closed": bool,
"paid": bool } }, "carry": { "comp": …, "specLoss": [[année, €], …] } }`.
Pour `close`, `moved` = mouvement de l'étape 4 seulement. Pour `adjust` / `cfg`, `moved` = somme des étapes 2 et 3.
Pour `trading` / `fiscal` / `pay`, `moved` = 0 (pay : la sortie n'est pas un mouvement trading ↔ dépôt).
`due` d'une année ouverte = Dû calculé après l'événement ; d'une année close = dû figé.
