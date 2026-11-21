# [PORTE SESSIONS · 21/11/2026] « … puis go le reste des sessions continental » (Rams, 21/11 07:01) = « go sessions », proposé le 21/11
# (conversation « Stratégie de rentabilité ») : l'ouverture des séances de Tokyo, Londres et New York porte-t-elle un gain NET à prendre ?
# Règles écrites AVANT tout téléchargement ou calcul de cette porte (empreinte SHA-256 des lignes 1 à 61 et heure UTC dans la passation ;
# fichier commité sur la branche travail/sessions avant les données). Rien ne sera retouché pour « faire passer ».
#  DÉJÀ VU (dit pour qu'on sache) : le 06/10 (passation, GO TENDANCE), sur ~2 ans de bougies 1 h / 15 min (≈ 10/2024 → 09/2026) : agitation
#    à l'ouverture de New York ×1,9, à la fin de l'Europe ×1,3 ; le SENS ne se prévoyait pas (≤ 0,1 % brut par trade, signe changeant d'une
#    année à l'autre). JAMAIS vu : 10/2018 → 09/2024 à ces heures ; aucune des 4 familles ci-dessous n'a jamais été calculée.
#  DONNÉES : bougies spot 5 min Binance (archives publiques, rejeu/sessions_get.sh), 11 cryptos de l'app (BTC ETH XRP SOL DOGE DOT ADA AVAX
#    LINK BNB PEPE), 07/2018 → 09/2026 ; une paire vit dès son premier mois complet d'archive ; horodatages µs (2025+) ramenés en ms ; une
#    bougie absente = pas de trade ce jour pour cette paire. Bougie 15 min = 3 bougies 5 min (ouverture, plus haut, plus bas, clôture).
#  SÉANCES (jours ouvrés lundi–vendredi en heure UTC de t_o ; jours fériés non retirés) : Tokyo 09:00 Asia/Tokyo (= 00:00 UTC), Londres
#    08:00 Europe/London, New York 09:30 America/New_York, heures d'été par zoneinfo ; t_o = cet instant en UTC.
#  COÛT : 0,13 % par côté sur la mise (barème de l'EV : taker 0,10 % + glissement 0,03 %), 0,26 % l'aller-retour ; ni levier ni financement.
#  FAMILLE 1 — CASSURE DE L'OUVERTURE : zone = plus haut / plus bas des bougies 5 min de [t_o, t_o + R[ ; finesse f (5 ou 15 min, bougies
#    f alignées sur t_o) : la première bougie f après la zone dont la CLÔTURE sort de la zone → LONG au-dessus, SHORT en dessous, entrée à
#    cette clôture ; une seule par séance et par paire, cherchée jusqu'à la sortie (entrée à la sortie même = pas de trade). Sortie à la
#    clôture de la bougie 5 min qui finit à t_o + S ; variante « stop » : sortie au bord opposé de la zone dès qu'une bougie 5 min APRÈS
#    l'entrée le touche (au bord, ou à l'ouverture de cette bougie si elle s'ouvre déjà au-delà). Variantes : 3 séances × (f 5 min : R ∈
#    {5, 15, 30, 60} min ; f 15 min : R ∈ {15, 30, 60}) × S ∈ {2, 4, 8} h × {sans stop, stop} = 126.
#  FAMILLE 2 — RETOUR APRÈS L'EXCÈS D'OUVERTURE : m = clôture(t_o + R) / ouverture(t_o) − 1 ; EXCÈS si |m| > quantile q des |m| des 60
#    jours ouvrés précédents de la même séance et paire (appris sur le passé seul ; moins de 60 valeurs : pas de trade) ; trade CONTRE m,
#    entrée à la clôture de t_o + R, sortie à la clôture D plus tard. Variantes : 3 séances × R ∈ {5, 15, 30, 60} min × q ∈ {80 %, 95 %}
#    × D ∈ {1, 4} h = 48.
#  FAMILLE 3 — HEURE FIXE (fiche de recherche citée le 21/11 : BTC acheté à 22:00 UTC, gardé 2 h) : LONG à l'ouverture de la bougie 5 min
#    de 22:00 UTC, sortie à l'ouverture de celle de 00:00 UTC. Variantes : {BTC seul, 11 paires} × {tous les jours, jours ouvrés} = 4.
#  FAMILLE 4 — L'HEURE D'EXÉCUTION DE LA VOIX TENDANCE : décision du lundi 00:00 UTC (moteur de rejeu/porte_poids.py, E « égal », appelé)
#    exécutée — entrées ET sorties — à l'ouverture de Londres ou de New York de ce lundi (ouverture de la bougie 5 min) au lieu de 00:00
#    (= Tokyo) ; valeur du portefeuille relevée à cette heure ; liquidation SHORT vérifiée dès l'heure qui suit l'entrée réelle. Variantes :
#    2. Série : r_t (log, hebdomadaire) de la variante − r_t de la base 00:00, mêmes lundis.
#  SÉRIES (familles 1–3) : r_j = net du jour j (jour UTC de t_o ; famille 3 : de 22:00) = moyenne, sur les paires vivantes ce jour (BTC
#    seul : BTC), du net de chaque trade (0 sans trade) — un capital réparti à parts égales, non composé. Familles 1–2 : jours ouvrés ;
#    famille 3 : tous les jours (0 les jours où la variante ne trade pas).
#  STATISTIQUE : z = Σ blocs / (√nb × écart-type des blocs), blocs NON chevauchants de 20 valeurs consécutives de la série (familles 1–3)
#    ou de 4 semaines (famille 4) ; le reste en fin de série est écarté.
#  LA CHANCE COMPTE (plusieurs variantes) : par famille, z_max = plus grand z des variantes sur le jugement (lecture 1). Seuil = quantile
#    (1 − 0,05 / 4) = 98,75 % de z_max sous l'hypothèse nulle : 2 000 tirages (graine 20261121) avec remise des blocs des séries CENTRÉES
#    (moyenne de chaque variante retirée), mêmes blocs tirés pour toutes les variantes d'une famille (leur corrélation est gardée) ; jamais
#    sous 2,24 (1,25 % unilatéral). Le « / 4 » : quatre familles regardées en même temps.
#  PÉRIODES : JUGEMENT = t_o (famille 4 : lundis) du 01/10/2018 au 30/09/2024 (6 années 10→09) ; CONTRÔLE = 01/10/2024 → 30/09/2026 (déjà
#    vu en partie) : condition nécessaire, pas verdict.
#  LECTURES : 1 = comme écrit. 2 = entrée ET sortie une bougie de finesse plus tard (familles 2–3 : 5 min ; famille 1 : f ; le stop est
#    cherché après l'entrée retardée) ; famille 4 : une heure plus tard.
#  VERDICT PAR FAMILLE — OUI si la variante v* au z_max (jugement, lecture 1) a : (a) z_max ≥ seuil ; (b) net > 0 dans au moins 4 des 6
#    années du jugement ; (c) en lecture 2 : z ≥ 1,645 et net total > 0 ; (d) net total > 0 sur le contrôle (lecture 1). Sinon NON. Un
#    OUI = candidate à une voix (mission à part, « go »), jamais une ouverture de l'app ; un NON ne veut pas dire « faux » : non prouvé.
#  TÉMOINS (avant tout verdict) : (T1) données — l'ouverture de chaque bougie 5 min de HH:00 égale celle de la bougie 1 h Binance (archives
#    spot 1 h de la porte TENDANCE LONGUE) sur tous les points communs (écart relatif ≤ 1e-9) ; heures d'été : Londres 07:00 et New York
#    13:30 UTC le 01/07/2024, 08:00 et 14:30 le 02/01/2024 ; sinon « PORTE FAUSSE », pas de verdict. (T2) la porte VOIT un gain de la
#    taille des frais : pour chaque famille, la même procédure (seuil retiré) avec v* augmentée de +0,26 % par trade (famille 4 : +0,26 %
#    par semaine) doit dire OUI à (a) et (b) ; sinon « PORTE AVEUGLE » pour cette famille, pas de verdict.
#  RAPPORTÉ (informatif, hors verdict) : pour v* — brut et net par trade, par année, contrôle, trades, part gagnante, gain moyen / perte
#    moyenne ; le z des 5 meilleures variantes ; v* au barème futures (0,08 % par côté, sans financement) ; l'agitation de chaque séance
#    (amplitude de la 1re heure après t_o / amplitude moyenne d'une heure, même paire, même période).
#  PUISSANCE (dite avant) : ~1 560 jours ouvrés au jugement ; un net de 0,05 % par jour du capital pour un écart-type de 1 % donne z ≈ 2 :
#    seul un effet net et régulier passe. Le mur : 0,26 % de frais par trade. Prévision (supposée) : NON partout.
#  NON MODÉLISÉ : la tablette endormie ou sans réseau aux heures des séances (01:00, 08:00–09:00, 14:30–15:30 à Bruxelles l'hiver), montants
#    minimaux d'ordre, exécution partielle, impôt, frais sur la mise et non sur la valeur de sortie.
#  AUCUN CODE DE L'APP N'EST TOUCHÉ (mesure seule).
# usage : sh rejeu/portage_get.sh <d1h> 2018-08 2026-09 ; sh rejeu/sessions_get.sh <d5m> 2018-07 2026-09 ;
#         python3 -I rejeu/porte_sessions.py <d1h> <d5m> [--tirages 2000]   (écrit <d5m>/porte_sessions.json)
# ---------------------------------------------------------------------------------------------------------------------------------------------
