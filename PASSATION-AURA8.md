# PASSATION-AURA8 — 12/09/2026 — token `20260912b` (inchangé) — push direct ACTIF · passation versionnée dans le dépôt

## Démarrage de session — Rams colle le PAT, rien d'autre (ce fichier est lu depuis le dépôt)
1. Cloner : `git clone https://x-access-token:PAT@github.com/ramizxhixha-a11y/aura.git` puis aussitôt `git remote set-url origin https://github.com/ramizxhixha-a11y/aura.git` — le PAT ne reste ni dans `.git/config`, ni dans un fichier, ni en mémoire.
2. Lire CE fichier, puis `node banc-all.js` sur l'état brut du dépôt → « VERDICT : LIVRABLE » attendu AVANT toute modification ; sinon la mission devient « comprendre pourquoi ».
3. Une seule mission par session, nommée avant la première modification. Aucun fichier « en plus ». Pas d'hypothèse corrigée sans sonde qui la nomme.
4. Fin : `node banc-all.js` LIVRABLE → **un seul commit** = fichiers modifiés + cette passation mise à jour (1re ligne au token courant ; banc-all BLOQUE si elle manque ou si le token diverge) → `git push https://x-access-token:PAT@github.com/ramizxhixha-a11y/aura.git main` → `curl` raw : `DOC_V = '<token>'` → Pages rebâtit (< 1 min) → Rams relance l'app. Plus aucun upload manuel, plus de fichier oublié, plus de gros bloc au chat.
5. Auteur des commits : `Rams (via Claude) <226786946+ramizxhixha-a11y@users.noreply.github.com>`. Message : `<token> · <mission> · banc-all LIVRABLE`.
6. PAT fine-grained, dépôt `aura` seul, Contents Read/Write, 30 j — celui du 12/09 expire le **12/10/2026** (Rams en régénère un à l'expiration). Ancien PAT classique : à révoquer (Rams).
7. Au chat : court. Lectures, diffs, bancs → bac à sable.

## Ce commit (12/09 soir) — 3 fichiers racine, aucun `js/`, HTML NON touché, token inchangé
- `PASSATION-AURA8.md` : ce fichier, désormais versionné et réécrit dans chaque commit de livraison.
- `banc-all.js` : nouveau contrôle « ▶ Passation » (fichier présent + 1re ligne portant le token `DOC_V`) → oublier la passation = ⛔ VERDICT : BLOQUÉ. Vérifié : LIVRABLE avec, BLOQUÉ sans, BLOQUÉ avec un token divergent.
- `.nojekyll` : GitHub Pages ne passe plus par Jekyll (qui transformait les `.md` et peut refuser un build sur `{{`/`{%`) ; html/js/css servis à l'identique, build plus court (avant : ~30–37 s).

## État vérifié le 12/09 ~21:00 (clone frais)
- HEAD `62a6dfa` 19:06 = livraison 20260912b entière : guardian-core `VERSION 20260912b`, HTML 78 `?v=` + `DOC_V`, banc-gel-boot 26/26, banc-gel-guardian 16/16. Raw ET Pages servent `DOC_V = '20260912b'`.
- `node banc-all.js` : LIVRABLE · 0 échec · 2 avertissements connus (`window.X` posé dans 2 fichiers ×6, heuristique sans acorn).
- Rien reçu de Rams après relance (aucune ligne « bloqueur » applicative) → aucun code applicatif touché ce soir.

## Verdict capture 12/09 18:37 (Guardian 20260912a, boot ~17:33) — inchangé
- **L'app va bien** : mode/positions/portfolio/valeurs cohérents, gels = écran masqué seuls (Android, pas le code), auto-backup à jour, fichier natif dispo.
- 2 lignes « bloqueur », aucune n'accuse du code applicatif (vérifié à la position UTF-16 dans les sources) :
  - 18:12:18 · 1.4 s · `00-backup-state.js:anonyme@6882 ← FrameRequestCallback 1.2 s` → @6882 = l'enveloppe chrono `_wrapFn` elle-même (l.146 de 00). Le navigateur nomme l'enveloppe, jamais le rappel enveloppé. Le vrai appelant est déjà journalisé par cette enveloppe (`d > 1000` → `_report`) : ligne `⏱ LENT: timer rAF@fichier:ligne 1.2s` dans le chainLog + `S.perfLog.lent`. Corrigé en 20260912b : le Guardian joint désormais cette ligne.
  - 17:34:05 · 1.5 s · `09b2-save-load.js:anonyme@16808 ← IDBRequest.onsuccess 1.2 s` → `req.onsuccess = e => res(…)` de `loadState` (l.298) : `res()` enchaîne la continuation `await` (JSON.parse LS 1,4 Mo + `applySnap`) dans la même tâche. Chargement de l'état au boot (+1 s), coût attendu une fois par boot, pas un bug.
- Leçon : une ligne « bloqueur » nomme un point d'entrée de tâche, pas forcément le code fautif. Fichier 00 (instrumentation seule) ou frame ≤ 60 s après le boot = la sonde ou le boot, pas l'app.

## Contenu de la livraison 20260912b (HEAD) — pour mémoire
- `guardian-core.js` : `_loafLent(S,f)` = entrée `S.perfLog.lent` la plus proche de la frame (≤ 5 s) ; `_loafBootAge(boots,f)` = secondes depuis le boot précédent (null si > 60 s). Ligne bloqueur : si src = 00-backup-state.js ET invoker timer/rAF/then/onmessage → suffixe ` = enveloppe chrono _wrapFn → vrai appelant : ⏱ LENT <name> <dur> s` (ou `aucune ligne ⏱ LENT jointe (rappel < 1 s ?)`) ; si frame ≤ 60 s après un boot → ` · au boot (+N s)`. `_loafTop` : 1 déclaration + 3 usages, `scripts[0]` absent.
- `AURA8_v118.html` : 78 `?v=` + `DOC_V` → `20260912b`.
- `banc-gel-boot.js` : capture 18:37 reproduite → 26/26. `banc-gel-guardian.js` : `_loafLent`/`_loafBootAge` (1 déclaration + 1 usage chacun) → 16/16.

## Protocole — à vie
1. `node banc-all.js` → « VERDICT : LIVRABLE » avant tout commit. Un ❌ nouveau = on corrige ou on ne pousse pas.
2. Aucune correction de code sans cause NOMMÉE par une sonde. Hypothèse = sonde, pas correctif. Retirer le suspect ET poser la sonde ; vérifier qu'un « bloqueur » n'est pas la sonde elle-même.
3. Le moins de fichiers possible ; toujours dire quel dossier et si le HTML est dans le lot. Tout changement de `js/` ou `css/` = nouveau token (`DOC_V` + 78 `?v=`), même jour → lettre suivante.
4. Un commit par session, passation comprise. Jamais de push sans banc-all vert, jamais de fichier livré au chat.
5. Après push : vérifier raw + Pages (`DOC_V`), puis Rams relance l'app et lit le journal `Document v<token> chargé`.

## Observation attendue (après relance de l'app par Rams)
1. Journal : `Document v20260912b chargé`.
2. Bouclier → Gel / Lag : les lignes « bloqueur » de 00 portent « enveloppe chrono → vrai appelant : ⏱ LENT timer rAF@fichier:ligne » ; la frame de boot porte « au boot (+N s) ».
3. **Seule donnée à envoyer** : une ligne « bloqueur » dont le vrai appelant est un fichier applicatif (`timer rAF@03-…:1234` etc.), telle quelle. Une ligne « au boot » ou « aucune ligne ⏱ LENT jointe » ne demande rien.

## Prochaine mission (inchangée)
- **Écran blanc / heap 468 Mo** : au prochain trou inexpliqué, backup ↓ puis l'envoyer : `perfLog.boots[].prevSavedAt` + `perfLog.heap`. Lire ce qui tourne à +20/+30 min après le boot (timers longs, backup FULL core +60 s, Dream cycle, `memRecordSession`) — regex multi-lignes dans `banc-gel-backup.js`.
- Si le vrai appelant rAF des frames de 1.2 s est nommé (probable : rendu d'un panneau/graphique), on le regarde ; sinon rien.
- Puis : churn non décisionnel (`probePersistence` → `buildSnapshot()` 1,5 Mo / 2 min ; `probeStorageSync` relit l'IDB / 2 min) → fenêtre de boot restante → Phase 1 du PLAN-DIRECTEUR (« go phase 1 »).

## Reports (non traités, inchangés)
- `window.X` posé dans 2 fichiers (banc-all ⚠️) : `stopSim` {09i, 01}, `applyTheme` {05, 07}, `_bgResolve` {02, 08}, `_auraLastOp` {00, 08}, `requestAnimationFrame` {00, 03} (00 = chrono, 03 = ? à relire : si 03 ré-enveloppe rAF après 00, l'enveloppe de 03 peut masquer celle de 00), `GUARDIAN_CONFIG` {guardian-config, guardian-core}.
- `banc-skill-borne.js` (token 20260906i en dur) et `banc-p7-news.js` (payload absent) figés → à réécrire « token lu dans le HTML » ; `net-expectancy` 18/19 et `p6` 28/29 tolérés par `CONNUS`.
- `_APPLYSNAP_MANIFEST` liste `_errStats`, `_riskVetoes`, `_botSurplusCarry`, `_fpByBot` que 09b1 ne sauvegarde pas ; `sw.js` jamais enregistré ; `alert('⛔ Export REFUSÉ…')` → modal ; `probeFiles` réseau ne teste pas les CSS `?v=` ; `boots[].doc` toujours `null` (`DOC_V` = `var` dans l'IIFE inline l.1368, invisible de 09k → exposer `window.DOC_V`) ; `S.cycle` par paire ; Évolueur 3 générations en 3 min ; `09b2` l.144 JSON.parse complet du LS toutes les 25 s pour lire `.cycle`.
- Hors code — Rams : vieux backups `Download/AURA` (28/06), DriveSync sans dépôt Drive depuis août, révoquer ancienne clé CoinStats + ancien PAT classique, GitHub 2FA, tablette branchée en permanence + Samsung : retirer AURA de la mise en veille des applis et de l'optimisation batterie (gels écran masqué).

## Rappels techniques (inchangés)
- Position LoAF = unités UTF-16 (`src.encode('utf-16-le')[:pos*2]`), pas `src[:pos]`.
- `grep` mono-ligne rate les timers multi-lignes → regex dans `banc-gel-backup.js`.
- IDB : jamais `getAll()` / `openCursor()` sur un store de payloads.
- `performance.memory` quantifié (paliers ~6 %, plancher 10 Mo, retard ≤ 20 s) : tendances, pas des Mo exacts.
- `S` est un `const` de script (`02-state-init.js`) : pas de `window.S` ; modes `sim`/`paperReal`/`real` et clés de stockage (`nexus_state_v2`, `nexusSnap_A/B/C`, `NEXUS_DB`) jamais renommés.
