// PORTE du registre n° 75 — GO N° 75, 15/11/2026 — RÈGLES FIGÉES AVANT TOUTE MESURE (lignes 1 à 36)
// Question : corriger l'argent propre de 02 _tradingCapitalBase (base du levier ×N : réserve, plafond d'emprunt, emprunt de l'index, emprunt « juste à
// temps ») change-t-il ce que le BOT décide sur les vraies données de Rams ? Et la correction agit-elle vraiment sur ses états réels ?
// Le défaut : base = caisse + trading + mises engagées − S.leverageBorrowed. La dette totale compte la part « exposition » des positions ouvertes
// (pos.levBorrowed − 02 _posLevCash(pos)), qui n'est jamais entrée dans l'argent : l'argent propre est sous-estimé de cette part tant qu'elle existe.
// La correction (une ligne) : base = caisse + trading + mises engagées − 02 _levCashDebt(S) (la dette versée en argent, que lisent déjà la solvabilité,
// le Bunker, le « net en poche » et la base du P&L). Rien d'autre ne change dans le code ; les commentaires suivent.
// Code avant = commit 40742a4 (token 20261115a), extrait dans rejeu/out/n75/code_avant ; code après = le dossier de travail.
// Règle de décision (celle de GO TALENT, rejeu/porte_registre.js) : une correction lue par la décision, qui ne lit pas le marché, n'entre que si elle laisse
// la décision du bot telle quelle sur les vraies données — sinon ce serait un changement de décision sans talent prouvé.
// Données (fixées ici, aucune choisie après coup) :
//  D1 l'état vivant du pont : le backup demandé par `node rejeu/pont.js backup` pendant la mission (le 1er qui répond) — les 3 modes.
//  D2 les backups du Drive : pour chaque jour du 17/10 au 15/11 qui en a, le DERNIER nom aura_guardian_full_AAAAMMJJ-HHMMSS.json du jour (date du nom),
//     plus 20261020-035156 (AA au levier ×10, déjà pris par go talent et go n° 61). Un fichier absent ou illisible est dit, pas remplacé.
// Mesures M0, M1 : vrai texte des fonctions de 02, 09j, 09c, extrait par nom des deux dossiers, exécuté en vm sur une COPIE de chaque état, chaque mode.
//  M0 TÉMOIN — la porte VOIT-elle la correction ? Par état et par mode : E = Σ part « exposition » des positions ouvertes ; _tradingCapitalBase avant /
//     après. « Correction active » = base après ≠ base avant (à 1e-9 $). Dit aussi (informatif) : trades fermés à part « exposition » dans l'historique.
//  M1 — ce que le BOT lit et fait, avant / après :
//     (a) 02 syncLeverageReserve puis 02 estimateStakes → ps.stake et ps._leverageBonus de chaque paire ;
//     (b) par paire, comme 09c : 02 borrowLeverage(ps._leverageBonus) → montant ; 09j validateTotalExposure(ps.stake, montant, 0,5 puis 0,8) → ok ;
//         02 ensureLeverageCoverForTrade(ps.stake) → action et montant ; repli 09c « trading < 2 planchers » → min(50, 10 % de la réserve) ;
//     (c) l'anticipation du bot (09c : 02 setLeverageByBot de l'index + 1 jusqu'au plafond, arrêt au 1er cran où validateTotalExposure(ps.stake, 0) passe)
//         → le cran retenu et l'emprunt fait (applyAutoLeverageBorrow), ou le refus P6.
//     « Décision différente » = un ok, une action, une mise, un bonus, un cran ou un montant emprunté différent (à 1e-9 $). La réserve seule n'en est pas une.
//  M2 — vraie page : rejeu/sonde_modes.js, backup 20261020-035156, AA à l'écran, AUTO / MANU tels que le backup, 2 h simulées, graine 1, avec la mesure
//     injectée rejeu/sondes/n75-m2.js : ouvertures et fermetures du bot (mode, paire, sens, mise, emprunt, part en argent) et, chaque seconde, E de chaque
//     mode. Code avant contre code après, même graine ; comparé seulement si le code avant, joué deux fois, donne deux fois la même liste (sinon « non
//     déterministe », ne compte pas). Témoin de M2 : secondes où E > 0 dans le code après.
// Verdict :
//  ENTRE si la porte voit (M0 : au moins un état réel où la correction est active, ou M2 : au moins une seconde E > 0) ET si aucune décision du bot ne
//  diffère (M1 : 0 ; M2 : identique ou non déterministe).
//  N'ENTRE PAS si une décision du bot diffère (M1 ou M2) : n° 75 reste au registre avec la différence mesurée ; rien n'est livré dans le code de l'app.
//  NON PROUVÉ si la porte ne voit rien (ni M0 ni M2) : elle serait aveugle ; rien n'est livré dans le code de l'app.
//  On ne retouche ni ces règles, ni les données, ni la correction pour la faire passer ; une mesure ajoutée après coup est dite « hors règles ».
// Ce que la porte NE dit PAS : si l'app gagne de l'argent ; ce que Rams décide lui-même (levier, ouvertures à la main : AUTO / MANU, Rams seul).
// Empreinte de ces 36 lignes : sha-256 dans PASSATION-AURA8.md (section GO N° 75), avec l'heure UTC d'écriture.
'use strict';
