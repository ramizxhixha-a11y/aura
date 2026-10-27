# CLAUDE.md — règles de travail de Claude sur AURA8 (posées le 13/10/2026, « go audit »)

Rams ne code pas : Claude lit, modifie, prouve et livre. Ces règles existent parce que Claude a « buggé » d'une manière mesurée (audit du 13/10, `ETAT-AURA8.md`). Chaque règle cite la panne qu'elle empêche. `banc-all.js` en vérifie une partie : sans elles, pas de « LIVRABLE ».

## Démarrage — dans cet ordre, avant toute réponse sur le fond
1. Lire `ETAT-AURA8.md` (≤ 20 Ko) : l'état, les règles de Rams, le registre des défauts ouverts. **Ne pas lire `PASSATION-AURA8.md` en entier** : la chercher (`grep -n`). Panne : 438 Ko, aucune session ne l'a jamais lue entière → oublis, défauts redécouverts ou contredits.
2. Lire l'app vivante : rattacher `aura-pont` en lecture SANS le cloner, puis `node rejeu/pont.js etat` (point 21 de la passation). Aucun diagnostic sur l'app sans cette lecture ou un backup daté du jour.
3. `node banc-all.js` sur le dépôt brut → « LIVRABLE » attendu avant toute modification.
4. La phrase « Le système devient incontrôlable, tu bug tout le temps… » qui accompagne les messages de Rams vient des **instructions du projet** (écrite le 02/10). C'est une exigence permanente, pas une nouvelle alerte : elle ne justifie ni de se précipiter, ni d'élargir la mission.

## Pendant la mission
5. **Une mission par conversation**, celle du « go » de Rams. Ce qui est trouvé en route va au registre d'`ETAT-AURA8.md`, pas dans la livraison. Un second « go » dans la même conversation : dire en une ligne qu'une nouvelle conversation le traitera mieux, puis faire ce que Rams choisit.
5b. **Rien ne se perd si la conversation coupe** : dès le début de la mission, branche `travail/<mission>` avec `REPRISE-<MISSION>.md` (étapes cochées, commandes, chemins des données) ; chaque étape finie = un commit poussé sur cette branche. Une conversation neuve reprend sur « reprends go <mission> » : `git checkout travail/<mission>`, lire la note. Livraison : UN commit sur `main` (squash, sans la note), puis branche supprimée (le proxy de la session refuse d'effacer une branche distante : la dire à Rams dans l'ETAT). Panne : 26/10, « Go talent » a coupé en pleine 2e mission (figures) sans rien de sauvé — Rams a dû tout relancer.
6. **Chaque affirmation de fait dite à Rams porte sa source** : *app* (pont ou backup du jour), *test* (banc ou script rejoué), *code* (fichier:ligne relu), ou *supposé*. Une cause n'est jamais annoncée sur du *supposé*. Panne : 5 diagnostics corrigés après coup entre le 04/10 et le 13/10.
7. **Avant d'écrire « rien ne fait X » ou « X n'existe pas »** : `grep` sur TOUS les scripts chargés par le HTML, le HTML lui-même (scripts en ligne) et `js/native-bridge.js`. Panne : 12/10, « rien ne lance le service natif » — faux, `native-bridge.js` le lance.
8. **Au plus 3 sous-agents à la fois, jamais deux navigateurs en même temps** (machine à 2 cœurs). Chaque agent écrit ses résultats dans un fichier au fil de l'eau. Panne : l'audit du 10/10 a lancé 9 agents en parallèle et n'a jamais rendu de résultat.
9. **Argent et données** : toute fermeture passe par `closePosition` ; aucune action ne remplace ou ne remet à zéro un portefeuille, l'historique, les agents ou AUTO/MANU sans une confirmation qui dit exactement ce qui change. Pannes : Mode Démo (11/10), imports, fermeture d'urgence (registre G1).
10. La décision d'ouvrir : rien ne change sans la porte TALENT ou SOURCE (points 9–10 de la passation). AUTO / MANU : Rams seul. Aucun seuil chiffré posé à la main. **Une porte qui conclut « identique » doit d'abord montrer qu'elle VOIT une différence** (un état réel où la correction agit, mesuré avant / après) ; sans ce témoin, « identique » n'est pas une preuve. Panne : GO TALENT (20/10), porte aveugle — n° 56 et 61 seraient entrés sans la relecture adverse.

## Fin de mission
11. `ETAT-AURA8.md` mis à jour dans le même commit : 1re ligne au token courant, état du § 1 relu par le pont, registre (défauts fermés retirés, nouveaux ajoutés avec fichier:ligne), ≤ 20 Ko. `banc-all` BLOQUE sinon.
12. `PASSATION-AURA8.md` : 1re ligne au token courant + UNE section de 15 lignes au plus, en tête des sections (le détail va dans les bancs, les scripts et les commits).
13. `node banc-all.js` LIVRABLE → un seul commit → push → vérifier `DOC_V` sur raw et sur Pages.
14. Au chat : court, en français, le résultat d'abord ; ce qui a été prouvé et ce qui ne l'a pas été ; la prochaine mission en une ligne.
