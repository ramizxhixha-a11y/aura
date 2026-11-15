# REPRISE — GO N° 98 (Rams 15/11 20:21 « Go 98 ») — partie de deb707a (token 20261115j)

Mission : n° 98 du registre (G2) — pont muet SANS signal : (a) contrôle « non concluant » qui dure, (b) PAT disparu du stockage.
Reprendre : `git checkout travail/n98`, lire cette note, continuer à la première case vide.

## Démarrage (fait)
- [x] ETAT lu ; pont `etat` 15/11 20:21 : app 20261115j, pont actif, 0 erreur (*app*)
- [x] Sentry : seule AURA8-APP-5 « Sentry branché » (*app*)
- [x] banc-all brut : LIVRABLE (*test*)

## Cause (code, 17b)
- (a) `verifier` → `non('reseau', 'contrôle du dépôt du code non concluant …')` (17b:231) ou aura-pont ≠ 200 (17b:213) → `verdict` : 'reseau' / 'limite' absents de SIGNAUX → aucun signal, réessai sans fin (pause ≤ 5 min), etat.json jamais écrit.
  Même trou : etat.json refusé en boucle (409 / 422 / 5xx sur le PUT, cycle 17b:391-395) → aucun signal.
- (b) PAT absent du stockage en route (17b:380 `couper('coupé depuis un autre onglet', true)`) ou au lancement (17b:496-497 : rien, ou valeur illisible effacée) → arrêt muet.

## Remède (plan)
- [ ] 17b : `muet(code)` — début de panne gardé dans aura_pont_mem.muet (GitHub a RÉPONDU, réseau coupé = neutre) ; effacé au 1er etat.json écrit ; passé VERIF_MS (24 h, période du contrôle quotidien existant) → motif 'controle' (vérif) ou 'etat' (écriture) à Sentry
- [ ] 17b : marqueur aura_pont_mem.actif (posé par demarrer, retiré par « Couper » AVANT d'effacer le PAT) ; PAT absent + marqueur → motif 'disparu' (en route : tout de suite ; au lancement : après BOOT_MS, ou au retour du réseau)
- [ ] banc-n98.js (vm, pont-monde) ; échoue sur deb707a
- [ ] bancs du pont mis à jour : banc-pont-direct P1 (lecture de aura_pont_mem sans PAT), banc-pont-signal S7 (nombre d'appels)
- [ ] mutations rejeu/mutations_n98.py ; rejouer rejeu/pont_mutations.js et rejeu/mutations_pont_signal.py
- [ ] sonde vraie page rejeu/sonde_n98.js (Chromium, faux GitHub)
- [ ] relecture adverse (agent séparé)
- [ ] ETAT, PASSATION, banc-all, un commit sur main, push, DOC_V raw + Pages

## Commandes
- `node banc-n98.js [<17b>]` · `node banc-pont-signal.js` · `node banc-pont-direct.js` · `node rejeu/pont_mutations.js` · `python3 -I rejeu/mutations_pont_signal.py .`
- copie d'avant : `git show deb707a:js/17b-pont-direct.js > /tmp/avant-17b.js`
