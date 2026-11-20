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
