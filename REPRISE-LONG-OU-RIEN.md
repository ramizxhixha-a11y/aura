# REPRISE — go long-ou-rien (Rams, 21/11/2026 07:01 « D'abord go long ou rien comme tu le suggères puis go le reste des sessions continental »)

Mission 1 de `claude/STRATEGIE-AURA8-20261121.md` : l'argent de l'EV suit la voix tendance longue en « LONG ou rien » (SHORT → caisse) au lieu de LONG + SHORT, SI une porte pré-enregistrée le dit. Ensuite (même conversation, choix de Rams) : « go sessions » (mesure seule).

## Étapes
- [x] Démarrage : pont 21/11 06:58 (20261120b, EV 11 SHORT, poche net −13,52 %, 13 trades), Sentry (rien de neuf), banc-all LIVRABLE sur b440617
- [x] Porte `rejeu/porte_long_ou_rien.py` : en-tête figé 21/11 06:08:59 UTC, lignes 1–46, SHA-256 `0f3c780fde0f3932c2f3e37a59a7f2db83d8c5ba8e0b8b12dd18af2ef18da910`, commité AVANT les données
- [ ] Données : `sh rejeu/portage_get.sh /home/claude/donnees 2018-08 2026-09` (hors dépôt)
- [ ] Passage : `python3 -I rejeu/porte_long_ou_rien.py /home/claude/donnees`
- [ ] Si PASSE : `js/15b` suit la poche en LONG seulement (n inchangé = paires tenues), SHORT de la voix fermés ; banc, mutations, sonde
- [ ] Livraison : ETAT, PASSATION, banc-all, un commit sur main, DOC_V raw + Pages

## Commandes
- pont : `timeout 300 node rejeu/pont.js etat`
- banc : `node banc-all.js`
