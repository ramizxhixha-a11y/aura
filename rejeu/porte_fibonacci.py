# [PORTE FIBONACCI · 21/11/2026] « Go Fibonacci » (Rams, 21/11 08:01) : « un bot qui lit les bougies avec l'indicateur de Fibonacci sur 5, 15,
# 30 min, 1 h, 4 h, 1 jour ». Il ne vote dans la décision de l'EV que s'il passe CETTE porte (ETAT § 2). Règles écrites AVANT tout téléchargement
# ou calcul (empreinte SHA-256 des lignes 1 à la ligne « fin des règles » incluse, heure UTC dans la passation ; fichier commité sur la branche
# travail/fibonacci avant les données). Rien ne sera retouché pour « faire passer ».
#  DÉJÀ VU (dit pour qu'on sache) : Fibonacci est déjà l'indicateur n° 7 de 08 getTechSignals (50 bougies du mode, « niveau le plus proche à
#    moins de 1 % »), mêlé à 9 autres dans atScore, sans talent sur 24 mois (porte figures 2, z ≤ 1,5). Fibonacci SEUL, par unité, jamais mesuré.
#    Toutes les voix testées de 5 min à 4 h perdent après frais (TALENT, TENDANCE, SESSIONS) ; seule la tendance 28 j (semaines) est entrée.
#  DONNÉES : bougies spot 5 min Binance (archives publiques, rejeu/sessions_get.sh), 11 cryptos de l'app (BTC ETH XRP SOL DOGE DOT ADA AVAX
#    LINK BNB PEPE), 07/2018 → 09/2026 ; une paire vit dès son premier mois complet d'archive ; horodatages µs (2025+) ramenés en ms.
#  UNITÉS : 5 min, 15 min, 30 min, 1 h, 4 h, 1 j, bâties des 5 min, alignées sur l'heure UTC (4 h : 00, 04, 08 … ; 1 j : 00:00 UTC). Une bougie
#    d'unité existe dès qu'une de ses bougies 5 min existe : ouverture = 1re présente, plus haut / plus bas = extrêmes, clôture = dernière présente.
#  SIGNAL (unité U, recul N ∈ {21, 55, 144} bougies de U), à la clôture de la bougie i, si les N bougies [i−N+1, i] existent toutes :
#    H, L = plus haut et plus bas de la fenêtre ; tH, tL = leurs positions (égalité : la plus récente) ; R = H − L > 0.
#    Impulsion HAUSSIÈRE si tL < tH, BAISSIÈRE si tH < tL.
#    LONG si haussière, tH < i et H − 0,618 R ≤ C_i ≤ H − 0,382 R ; stop = H − 0,786 R ; objectif = H.
#    SHORT si baissière, tL < i et L + 0,382 R ≤ C_i ≤ L + 0,618 R ; stop = L + 0,786 R ; objectif = L.
#    Une seule entrée par vague (clé (tH, tL)) par paire et par variante ; une position à la fois par paire et par variante (signal ignoré si
#    occupée, la vague n'est alors pas consommée).
#  ENTRÉE : lecture 1 = clôture de la bougie i. Lecture 2 = clôture de la bougie présente suivante, mêmes niveaux, seulement si cette clôture est
#    strictement entre stop et objectif (sinon pas de trade, vague consommée).
#  SORTIE (bougies présentes j après l'entrée, dans l'ordre) : ouverture déjà au-delà du stop → sortie à l'ouverture ; ouverture déjà au-delà de
#    l'objectif → à l'ouverture ; plus bas (LONG) / plus haut (SHORT) touche le stop → au stop (stop d'abord si les deux dans la même bougie) ;
#    l'autre extrême touche l'objectif → à l'objectif ; sinon, si j − i_entrée ≥ N (en positions de bougies de U, absentes comptées) → à la
#    clôture de j. Fin des données : clôture de la dernière bougie présente.
#  COÛT : 0,13 % par côté (barème de l'EV : taker 0,10 % + glissement 0,03 %) ; net d'un trade = s × (sortie / entrée − 1) − 0,26 % (s = +1 LONG,
#    −1 SHORT) ; mise = une part de paire, ni levier ni financement.
#  VARIANTES (33) : SIMPLE = 6 unités × 3 reculs (18). CONFLUENCE = unités d'entrée 5 min, 15 min, 30 min, 1 h, 4 h × 3 reculs (15) : le signal
#    simple de U n'est pris que si CHAQUE unité plus longue de la liste, lue sur sa dernière bougie CLOSE à la clôture de i (même recul N, fenêtre
#    complète), a une impulsion du même sens (haussière pour LONG, baissière pour SHORT) ; une unité plus longue illisible → pas de trade.
#    « Close à la clôture de i » = sa fin ≤ la fin de la bougie i (une bougie 1 h qui finit avec la bougie 5 min i compte).
#  SÉRIE (par variante et lecture) : r_d = Σ (net des trades ENTRÉS le jour UTC d, toutes paires) / nombre de paires vivantes ce jour-là ; un jour
#    sans entrée vaut 0 (capital réparti à parts égales entre paires, non composé). Instant d'une entrée = dernière milliseconde de la bougie
#    d'entrée (son jour UTC et sa période en découlent).
#  PÉRIODES : JUGEMENT = entrées du 01/10/2018 au 30/09/2024 (6 années 10→09) ; CONTRÔLE = entrées du 01/10/2024 au 30/09/2026 (jamais vu pour
#    Fibonacci) : condition nécessaire.
#  TEST A — gagne-t-il, la chance comptée ? z = Σ blocs / (√nb × écart-type (n − 1) des blocs), blocs NON chevauchants de 20 jours du
#    jugement (le reste en fin écarté). Seuil S = max(1,645 ; quantile 95 % du z maximal des 33 variantes sous l'hypothèse nulle) : 2 000 tirages
#    (graine 21112026) avec remise des blocs des séries CENTRÉES (moyenne de chaque variante retirée), mêmes blocs pour toutes les variantes ;
#    S calculé dans chaque lecture. Passe si z ≥ S.
#  TEST B — le moment choisi sait-il quelque chose (pas la seule dérive) ? Pour chaque variante qui passe A dans les deux lectures : les MÊMES
#    trades (sens, distances stop et objectif en % de l'entrée, durée max N bougies de U) rejoués avec l'entrée décalée de k jours,
#    k = 60 + 10 m (m = 1 … 100), même bougie de l'unité, décalage circulaire dans la partie vivante du jugement de la paire (bougie absente :
#    la suivante présente), entrée à sa clôture, sorties par les mêmes règles sur les données qui suivent ; brut moyen par trade réel contre les
#    100 décalés : z_B = (réel − moyenne) / écart-type (n − 1). Passe si z_B ≥ 1,645.
#  TEST C — années : net > 0 sur au moins 4 des 6 années du jugement.
#  VERDICT : ENTRE si au moins une variante passe A, B, C ET contrôle net > 0, dans les DEUX lectures. Plusieurs : celle au plus grand z A
#    (lecture 1) — le bot joue exactement sa règle, deux sens (l'EV est LONG + SHORT ; LONG seul rapporté pour le comptant). Sinon N'ENTRE PAS :
#    le bot n'a pas de vote ; ses niveaux par unité restent une LECTURE affichée (fiche de la paire), sans effet sur aucune décision.
#  TÉMOINS (avant tout verdict ; un témoin raté = porte fausse, aucun verdict) :
#    T1 sensibilité : variante 1 h / 55 simple, lecture 1, gardant seulement ses trades à brut > 0 (le futur lu exprès) → doit passer A et B.
#    T2 spécificité : les trades de 1 h / 55 simple, lecture 1 (sens, distances, durée), placés à des bougies 1 h tirées au hasard (graine
#       21112026) dans la partie vivante du jugement de chaque paire → doit RATER B (z_B < 1,645).
#  INFORMATIF (hors verdict) : par variante, trades, % gagnants, gain et perte moyens, brut et net par trade, LONG seul, SHORT seul, net par année.
#  usage : sh rejeu/sessions_get.sh <d5m> 2018-07 2026-09 ; python3 -I rejeu/porte_fibonacci.py <d5m> [--tirages 2000]
#          (écrit <d5m>/porte_fibonacci.json)
# ---- fin des règles ----
