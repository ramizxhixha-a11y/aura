// PORTE des parties MANUELLES de n° 61 et n° 87 — GO N° 61, 15/11/2026 — RÈGLES FIGÉES AVANT TOUTE MESURE (lignes 1 à 45)
// Question : corriger le contrôle de capital des ouvertures MANUELLES (n° 61) et le « libre » des suggestions manuelles (n° 87) change-t-il ce
// que le BOT décide (ouvrir, sens, mise, levier, fermer) sur les vraies données de Rams ? Et la correction agit-elle vraiment sur ses états réels ?
// La correction : 09j validateManualExposure (NOUVELLE) = validateTotalExposure, sauf la phase 5 sans levier, dont le plafond devient le trading
// (déjà débité des mises engagées par 02 openPosition) ; lue par 02 openPosition, 03 _openProposedPosition et 07 manuInvert à la place de
// validateTotalExposure ; 09j getCapitalSummary().free = caisse + trading (sans retrancher une 2e fois les mises). Le bot garde ses chemins.
// Code avant = commit 918ae59 (token 20261114i, main au 15/11 00:15), extrait dans rejeu/out/n61/code_avant ; code après = le dossier de travail.
// Données (fixées ici, aucune choisie après coup) :
//  D1 l'état vivant du pont : le backup demandé par `node rejeu/pont.js backup` pendant la mission (le 1er qui répond) — les 3 modes.
//  D2 les backups du Drive (aura_guardian_full_AAAAMMJJ-HHMMSS.json) : le PREMIER et le DERNIER de chacun des jours 04/10, 05/10, 17/10, 20/10,
//     14/11 (heure du nom ; d'une paire écrite à une seconde d'écart, le nom le plus ancien), plus 20261020-035156 (AA au levier ×10, mesure M6
//     de go talent) : 11 fichiers. Un fichier absent ou illisible est dit, pas remplacé.
//  D3 pour M4 : le dernier backup de D2 dont botAutoMode est true (sinon le dernier de D2, dit).
// Mesures :
//  M0 TÉMOIN — la porte VOIT-elle une différence ? Sur D1 + D2, chaque mode, chaque paire : ce que le BOT lit (09j validateInvestmentCapProvisioned
//     pour la mise ps.stake et pour 30 % du trading (plafond d'02 estimateStakes) ; 09j validateTotalExposure(mise, ps._leverageBonus, conviction
//     0,5 puis 0,8) comme 09c) avec le code avant ET avec la « correction entière » (le plafond sans levier = trading dans la fonction PARTAGÉE,
//     ce que go talent a refusé). Une réponse différente (ok, cap, available, phase5) = une différence vue.
//  M1 — mêmes lectures du bot, code avant contre code après. « Décision différente » = une réponse différente (à 1e-9 $ près).
//  M2 — la correction AGIT-elle ? Sur D1 + D2, chaque mode : pour chaque paire, le contrôle de l'ouverture manuelle (02 openPosition : refus si
//     !ok ET available < la moitié de la mise) pour les mises 10 $, ps.stake (si > 0), 25 %, 50 %, 100 % du trading, levier de la paire ; avant
//     (validateTotalExposure) contre après (validateManualExposure). Compte « refus → accord » et « accord → refus » ; et getCapitalSummary().free,
//     la mise de 02 applyBotSuggestion (min(⌊libre × 0,3⌋, mise proposée)), avant / après.
//  M3 — textes et appels (vrai code des deux dossiers) : (a) au caractère près, avant = après pour 02 estimateStakes, 09j
//     validateInvestmentCapProvisioned et validateTotalExposure, et les fichiers entiers 09c, 10f, 15, 15b ; (b) validateManualExposure n'est
//     appelée QUE par 02 openPosition, 03 _openProposedPosition, 07 manuInvert ; (c) 02 openPosition n'est appelée que par des chemins manuels
//     (quickOpen, applyBotSuggestion, 10e _openManTrade, 03 _openProposedPosition, 07 manuInvert) et par 15b avec { voix: true } (contrôle
//     sauté, inchangé) ; (d) `.free` de getCapitalSummary n'est lu que par 02 applyBotSuggestion et 03 (panneau de la paire), applyBotSuggestion
//     seulement depuis un bouton (onclick). Recherche sur tous les scripts chargés par le HTML, le HTML et js/native-bridge.js.
//  M4 — vraie page (rejeu/sonde_modes.js, D3, AA à l'écran, 2 h simulées, graine 1, code après) avec une mesure injectée qui compte les appels de
//     validateManualExposure, les lectures de getCapitalSummary().free et les contrôles du bot (validateTotalExposure depuis 09c) ; témoin : au
//     moins 1 contrôle du bot. M4b : la liste des ouvertures et fermetures du bot, code avant contre code après, même graine — seulement si le code
//     avant, joué deux fois, donne deux fois la même liste (sinon M4b est dit « non déterministe » et ne compte pas).
// Verdict :
//  ENTRE si M0 voit au moins une différence, M1 n'en montre aucune, M3 (a)–(d) tiennent, M4 compte 0 appel manuel pendant le jeu du bot avec au
//  moins 1 contrôle du bot, M4b est identique (ou dit non déterministe), et M2 montre au moins un « refus → accord » réel et 0 « accord → refus ».
//  N'ENTRE PAS si une décision du bot diffère (M1, M4b), si un chemin du bot lit la correction (M3, M4) ou si M2 montre un « accord → refus ».
//  NON PROUVÉ si M0 ne voit rien ou si M4 n'a aucun contrôle du bot : la porte serait aveugle, rien n'est livré comme prouvé.
//  On ne retouche ni ces règles, ni les données, ni la correction pour la faire passer ; une mesure ajoutée après coup est dite « hors règles ».
// Ce que la porte NE dit PAS : si l'app gagne de l'argent ; si Rams doit ouvrir à la main ; les parties « bot » de n° 61 et n° 87 (02 estimateStakes,
// 09c, 09j partagée) restent au registre telles que go talent les a refusées.
// Empreinte de ces 45 lignes : sha-256 dans PASSATION-AURA8.md (section GO N° 61), avec l'heure UTC d'écriture.
'use strict';
