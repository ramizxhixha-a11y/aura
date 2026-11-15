# REPRISE — go n° 107 (16/11/2026, Rams 00:23 « Go 107 »)

Défaut (ETAT § 3, G2) : 17b `cycle` — une exception de CODE dans le battement tombe dans `catch (e) → echec({ st: 0 })`, traitée comme une coupure du réseau → pont muet SANS signal.

## Étapes
- [x] Démarrage : pont (`node rejeu/pont.js etat` 16/11 00:25 : doc 20261116a, 60 scripts, pont actif), Sentry (seul AURA8-APP-5 « Sentry branché »), banc-all LIVRABLE sur ccfd689
- [ ] Lecture 17b cycle / gh / echec / muet
- [ ] Remède 17b (≤ 500 lignes)
- [ ] banc-n107.js (témoin `banc-fixtures/pont-avant-n107.js` = 17b de ccfd689)
- [ ] mutations `rejeu/mutations_n107.py`
- [ ] sonde vraie page `rejeu/sonde_n107.js`
- [ ] suites du pont rejouées : banc-pont-direct, banc-pont-signal, banc-n98, banc-sentry, rejeu/pont_mutations.js, rejeu/mutations_pont_signal.py, rejeu/mutations_n98.py
- [ ] ETAT, PASSATION, token, banc-all, commit squash sur main, push, DOC_V

## Commandes
- `node banc-n107.js`
- base : commit ccfd689 (token 20261116a)
