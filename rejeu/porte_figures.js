// [GO FIGURES · 26/10/2026] rejeu/porte_figures.js — la porte des figures corrigées (Rams 26/10 20:25 : « Corrige les figures »).
// RÈGLES ÉCRITES AVANT TOUTE DONNÉE (lignes 1 à 30, empreinte sha-256 vérifiée plus bas ; on ne les retouche pas pour faire passer quoi que ce soit).
// Question : les figures lues sur les vraies bougies (06 _detectCandlePatterns : ouverture, haut, bas, clôture des bougies CLOSES) doivent-elles
//   remplacer, dans la décision (08 getTechSignals : signals.pattern → atScore → scouts, conseils, portes), les figures d'avant (06 _detectPatterns sur
//   les seules clôtures) ? L'écran, lui, passe aux vraies bougies sans porte : il ne décide rien.
// Données : celles de la porte TALENT (passation, point 9), inchangées — 12 paires, bougies 15 min Binance du 11/10/2024 au 30/09/2026 (talent_get.sh
//   2024-10 → 2026-09), frais 0,26 %, horizons 15 min / 1 h / 4 h / 24 h, génomes de départ, deux lectures : bougies closes, et --encours 1 (la bougie
//   qui s'ouvre, comme l'app vivante). Aucune autre donnée, aucune choisie après coup.
// Rejeux (rejeu/talent.js, code de l'app tel qu'il est dans le commit livré, extrait par ancres, en vm), chacun dans les deux lectures :
//   R1 (option --figures 1, même passage que R2) : deux voix seules, à chaque bougie et chaque paire — « figures_avant » = la meilleure figure d'avant
//      telle que getTechSignals la lit (_detectPatterns(_closes(candles)) : +conf haussière, −conf baissière, 0 si neutre ou rien) ; « figures_ohlc » =
//      la même chose avec _detectCandlePatterns(candles).
//   R2 (sans option de décision) : les voix de l'app avec les figures d'avant (le code livré).
//   R3 (--figures-decision 1) : les mêmes voix, getTechSignals lisant _detectCandlePatterns(candles) à la place de _detectPatterns(closes) — une seule
//      ancre, sinon arrêt.
//   Chaque rejeu analysé par rejeu/talent_ana.py (règles du 03/10, non retouchées).
// Témoin (CLAUDE.md, règle 10) : la porte doit VOIR une différence avant de conclure — T1 = part des bougies × paires où figures_ohlc ≠ figures_avant
//   (R1) ; T2 = part des votes changés de R2 à R3, voix par voix. Si T1 = 0 ou si aucune voix ne change de R2 à R3 : porte AVEUGLE, aucun verdict,
//   rien n'entre dans la décision.
// Verdict :
//   ENTRE (getTechSignals lit les figures corrigées) si, dans les DEUX lectures : (a) figures_ohlc est TALENT (z ≥ 3,2 et brut > 0 les deux années) ET
//   rentable (net > 0 sur l'année 2 au test 2, ≥ 30 trades) au MÊME horizon, à au moins un horizon ; ET (b) aucune voix TALENT ou rentable dans R2 ne
//   l'est plus dans R3 (même horizon, même lecture).
//   N'ENTRE PAS sinon : la décision garde les figures d'avant (rien n'est retiré, point 9) ; les mesures sont dites à Rams telles quelles.
//   Dit, ne décide rien : le talent de figures_avant. La retirer de la décision serait un autre changement, avec sa propre porte.
// Un rejeu absent, incomplet ou d'un autre code (token) : dit, pas remplacé ; la porte ne conclut pas.
//
//
//
// (fin des règles)
'use strict';
const REGLES_SHA = '10d5d0a893816026b224367a7910db7f7abb88545d71b8d541c221ac3db159ff';   // lignes 1–30, écrites le 26/10/2026 19:34:01 UTC, avant toute donnée
