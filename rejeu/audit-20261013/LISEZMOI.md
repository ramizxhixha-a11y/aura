# Audit du 13/10/2026 (« go audit ») — preuves

Code audité : commit `d5b020d`, token `20261012a`. Lecture seule : aucun fichier de l'app n'a été modifié par cet audit.
Le registre consolidé (G1 / G2) est dans `ETAT-AURA8.md` § 3 ; ce dossier garde le détail et les scripts qui le prouvent.

- `registre.md` — les 90 points déjà écrits dans la passation et l'audit vérité du 14/09, avec leur statut d'aujourd'hui (50 ouverts, 27 corrigés, 6 périmés, 7 faux).
- `destructeurs.md` — chemins qui écrasent l'argent, l'historique, les agents ou AUTO/MANU (imports, restaurations, sortie de page).
- `promesses.md` — ce que l'écran promet et que le code ne fait pas (464 gestionnaires inventoriés).

Scripts (vrai texte des fonctions exécuté en `vm` ; à lancer depuis la racine du dépôt cloné dans `/home/claude/aura`) :
- `vm_levier.js` (G1 n° 5), `vm_pyramide.js` (n° 4 et 6), `vm_exit.js` + `sonde-exit.js` (n° 8), `vm_re.js` (n° 10), `vm_snap.js` (n° 18), `sonde-import-max.js` (n° 2), `sonde-oneshot.js <backup>` (n° 1), `promesses-scripts/` (inventaire des boutons, réglages écrits jamais lus, bunker, snapshots).
- Plusieurs scripts lisent le backup réel du 13/10 20:29 (`rejeu/backups/pont/aura_guardian_full_20261013-202953.json`, non versionné) : en prendre un neuf par `node rejeu/pont.js backup` et passer son chemin.

Ces scripts sont la base des bancs de la mission « go argent » : un défaut corrigé = son script devient un banc qui échoue sur l'ancien code et passe sur le nouveau.
