# Mission « promesses » — constats (audit lecture seule, code 20261012a)

Méthode : inventaire acorn (scripts/inventaire.js) des gestionnaires onclick/onchange/oninput du HTML ET des chaînes HTML fabriquées par les 57 scripts chargés + addEventListener : 464 gestionnaires ; 331 analysés par acorn, 110 coupés par concaténation repris par regex (78 noms), 23 addEventListener. Croisement avec toutes les définitions globales du code CHARGÉ (js/10-fin-bloc-restauration-v93.js non chargé, ignoré). Résultat : UN SEUL nom appelé jamais défini atteignable (listInternalSnapshots/_refreshSnapshotsList via openSnapshotsModal) + _snapshotActionCreate (non atteignable). Les autres « inconnus » sont des fonctions locales (addEventListener sur fonctions internes) — faux positifs vérifiés. Réglages : scripts/ecrit-lu.js (écrit → lu par qui), scripts/vm-*.js (vrai texte exécuté en vm), backup 20:29.

### [G1] « 🛑 Fermer toutes les positions » du Mode Urgence / action Bunker « Fermer les positions » : ferme SANS historique, SANS frais, SANS rembourser le levier ni libérer la réserve (js/06-v63-patterns-chartistes.js:698-729)
- Prouvé : oui (code) — atteignabilité limitée (voir ci-dessous)
- Ce qui arrive : urgenceCloseAll retire les positions de la liste et recrédite `mise + gain` au compte trading à la main. Contrairement à closePosition (02:6280-6640) : aucune ligne dans l'historique des trades (ps.trades), compteurs non mis à jour, pas de recordFees (frais/impôt/dépôt fiscal), levier emprunté (pos.levBorrowed) jamais remboursé (02:6533 repayLeverage absent), réserve anti-négatif posée à l'ouverture (09c:845, pos._reservedAmount) jamais libérée → argent bloqué dans S.antiNegReserve. Le module 18 le reconnaît (18-reparation-demo.js:113 « sans ligne d'historique, sans frais, sans compteur »).
- Atteint par : activateBunker (07:253-255) si l'action « 🛑 Fermer les positions (risqué) » a été mise sur ON dans la session (OFF par défaut, et oublié au rechargement — constat persistance) ; le bouton du Mode Urgence est dans l'onglet « 🛠 Outils » inaccessible ; le bouton « Fermer ⊗ » de l'en-tête utilise, lui, le bon chemin (confirmCloseAll 02:7344 → closePosition).
- Preuve : `06:714 S.openPositions = (S.openPositions||[]).filter(p=>p.id!==pos.id);` `06:715 S.tradingAccount = (S.tradingAccount||0) + (pos.stakeUsdt||0) + pnlUsd;` — aucune autre écriture d'argent dans la fonction.
- Remède : remplacer le corps de la boucle par `closePosition(pos.id, false)` comme confirmCloseAll (02:7355) · S · touche la décision d'ouvrir/fermer : oui (fermeture)

### [G2] Réglages Anti-Revenge, Bunker, Telegram, Vacances, Son, Notifications verbeuses : oubliés à chaque rechargement (js/09b1-build-snapshot.js:43-325 n'écrit aucune de ces clés)
- Prouvé : oui (code + backup)
- Ce qui arrive : Rams règle « Anti-Revenge » (désactiver, durée de blocage, perte min $/%, pertes consécutives — LUS par checkAntiRevenge 06:3903-3940, qui bloque les OUVERTURES via 09c:93), « Bunker » (Activer/désactiver, seuil, actions), Telegram (token + chat id), Mode Vacances, préférences son, « Notifications verbeuses » (04:678). Tout vit dans S.antiRevengeCfg / S.bunkerCfg / S.telegramCfg / S.vacancesCfg / S.soundCfg / S.notifConfig / S.toastVerbose, qu'aucune sauvegarde n'écrit : au prochain chargement de l'appli (fréquent sur tablette), retour aux valeurs d'usine (anti-revenge ON 15 min, bunker ON 10 %, Telegram vide). Un bunker désactivé se réactive seul ; un blocage anti-revenge réglé à 5 min revient à 15 min.
- Atteint par : Outils Avancés › 🔔 Alertes (antiRevengeSection 07:1191, bunkerSection 07:1190, telegramSection 07:1192) et › 🎨 UI (vacancesSection 07:1123, soundSection 07:1125) ; Réglages ⚙ › Préférences (04:678).
- Preuve : grep `antiRevengeCfg|bunkerCfg|telegramCfg|vacancesCfg|soundCfg|notifConfig|toastVerbose` dans 09b1 (buildSnapshot) : 0 occurrence (toastVerbose n'est que dans la liste _LIGHT_KEYS 09b2:96, jamais produit par 09b1). Backup réel 20:29 (enveloppe produite par buildSnapshot : clés key/savedAt/version) : aucune de ces clés (`'bunkerCfg' in aura` → False, idem antiRevengeCfg, telegramCfg, vacancesCfg, toastVerbose) alors que S.bunkerCfg est créé en RAM toutes les 2 min par checkBunker (07:152, 07:341) et S.antiRevengeCfg à chaque clôture (02:6332 → 06:3893).
- Remède : ajouter ces 7 clés à buildSnapshot (09b1) + leur relecture dans applySnap/loadState (09b2) + _APPLYSNAP_MANIFEST (09b2:1248) · S · touche la décision d'ouvrir/fermer : oui (anti-revenge bloque l'ouverture ; bunker peut fermer si « Fermer les positions » est ON)

### [G2] « Réduire les mises » du Bunker SOS (et du Mode Vacances / Mode Urgence) : n'agit sur AUCUNE mise réelle (js/07-v90-mode-bunker-sos.js:246-252 · 06:3270-3273 · 06:745-751)
- Prouvé : oui (code + vm sur le vrai texte + backup)
- Ce qui arrive : quand le capital du mode chute de 10 % (réglage par défaut, Bunker actif par défaut), le bunker se déclenche seul, affiche « 🚨 BUNKER activé — Capital -x % · Mises réduites » et la bannière… mais le bot continue d'ouvrir avec EXACTEMENT les mêmes montants. Idem pour « Mode Vacances · mises à X % » (onglet UI) et « 📉 Mises à 10 % » (Mode Urgence). Rams croit son capital protégé pendant une série de pertes : il ne l'est pas.
- Atteint par : minuteur 07:341 `setInterval(()=>{ try { checkBunker(); } catch(e){}; }, 120000);` → activateBunker (07:234) si chute ≥ triggerDropPct ; et à la main : Outils › 🎨 UI › Mode Vacances « 🏖️ Partir en vacances » (case « Laisser le bot tourner » cochée).
- Preuve : les trois écrivent `S.stakeConfig.defaultStake` (S.stakeConfig n'est jamais créé : aucun `S.stakeConfig =` dans le code chargé), `S.stakeUsdt` (lu UNIQUEMENT par ces trois mêmes fonctions + l'affichage 06:784 — grep) et `a.stake` des agents (les 31 agents de 02:576-647 n'ont pas de champ stake → `if(a.stake)` toujours faux). L'ouvreur lit `ps.stake` et `_stakeFloor()` = 5 % de S.tradingAccount (09c:20-21, 09c:361-363). vm (scripts/vm-bunker.js, pairStates/agents du backup 20:29) : toasts « BUNKER activé … Mises réduites » et « Mises réduites à $1/trade », valeurs lues par l'ouvreur avant/après : identiques (`INCHANGÉ : true`, plancher 53,78 $ avant et après, ps.stake = 0 sur les 13 paires).
- Remède : faire porter la réduction par un multiplicateur lu dans 09c (ex. `S.bunker.stakeMult` appliqué à baseStake avant le plafond) et le remettre à 1 dans exitBunker · M · touche la décision d'ouvrir/fermer : oui (taille des mises)

### [G2] « 🧪 Simuler un blocage (test) » pose un VRAI blocage : le bot n'ouvre plus rien pendant 15 min dans le mode affiché (js/06-v63-patterns-chartistes.js:4087 → 3936-3941)
- Prouvé : oui (code)
- Ce qui arrive : le bouton dit « test » mais triggerAntiRevenge arme l'état anti-revenge du mode à l'écran (`st.active = true; st.end = now + cooldownMin`), incrémente « Blocages effectués », grise les boutons de trade et affiche l'overlay ; 09c:93 `isRevengeBlocked()` lit cet état et refuse toute ouverture du bot jusqu'à la fin du compte à rebours (déblocage impossible avant : 06:4014 `if(Date.now() < st.end) return;`).
- Atteint par : Outils Avancés › 🔔 Alertes › Anti-Revenge, bouton 06:4087.
- Preuve : `06:3939 st.active = true;` `06:3940 st.end = Date.now() + cfg.cooldownMin*60000;` ; `09c:93 if (typeof isRevengeBlocked === 'function' && isRevengeBlocked()) { … return; }` ; `06:3925 return st.active;`.
- Remède : faire du test une simple démonstration visuelle (overlay sans toucher _rvOf()/blockCount) ou le libeller « Bloquer le bot 15 min » · S · touche la décision d'ouvrir/fermer : oui

### [G2] « 🛡️ Hedge Automatique » : interrupteur, seuil et allocation sans effet — le déclencheur n'est jamais appelé (js/10d-protections-indicateurs.js:9 · écran js/05-v37-19-indicateur-de-fatigue-bot.js:186-293)
- Prouvé : oui (code + backup)
- Ce qui arrive : l'écran affiche « Système actif · ON · ✅ En veille / ⚡ Seuil atteint » et laisse régler « Seuil BEAR streak » et « Allocation max hedge (% capital) ». Mais `_checkHedgingTrigger` (seul lecteur de hedgingEnabled / hedgingTriggerBearStreak / hedgingMaxAllocPct en logique) n'est appelée NULLE PART : aucun hedge ne sera jamais posé ni suggéré automatiquement. Dans le backup de ce soir Rams a réglé hedgingEnabled=true, streak=2, alloc=3 % : rien de tout ça n'agit.
- Atteint par : Outils Avancés › ⚡ Trading › hedgeAutoSection (07:1181) ; réglages écrits par toggleHedging (05:186) / updateHedgeParam (05:194).
- Preuve : grep `_checkHedgingTrigger` dans les 57 scripts chargés + guardian : uniquement 10d:9 (définition), 10d:62-63 (`window._checkHedgingTrigger = …`). Backup 20:29 `aura.paperRealConfig` = `{"hedgingEnabled": true, "hedgingTriggerBearStreak": 2, "hedgingMaxAllocPct": 3}`.
- Remède : soit appeler _checkHedgingTrigger depuis le battement (comme checkBunker), soit afficher « suggestion seulement · non branché » et retirer le ON · S · touche la décision d'ouvrir/fermer : non tant que non branché (le déclencheur ne fait que suggérer, 10d:33-55)

### [G2] Réglages › « 📸 Voir et restaurer (1 tap) » : bouton mort, lève une erreur et ne ferme même pas les Réglages (js/09g-modals.js:222 · bouton js/04-v8-0-livraison-35-mode-max-permissif-v.js:1582)
- Prouvé : oui (code + vm)
- Ce qui arrive : Rams touche « Voir et restaurer (1 tap) » sous « 📸 SNAPSHOTS INTERNES — Auto toutes les 30 min + après chaque trade · 5 conservés » : rien ne s'ouvre, la fenêtre Réglages reste ouverte. Le texte promet des snapshots auto/restaurables qui n'existent plus (système supprimé en v125, cf. js/10a-base-analyse.js:14-22). S'il compte dessus pour revenir en arrière après un incident, il n'a rien.
- Atteint par : ⚙ (settingsBtn, HTML:154) → openSettingsModal (03:5540) → renderSettingsPanel (04:464) → bouton 04:1582 `onclick="openSnapshotsModal();closeSettingsModal();"`.
- Preuve : `js/09g-modals.js:222  const snaps = listInternalSnapshots();` et `:248 _refreshSnapshotsList();` — aucune des deux n'est définie dans les 57 scripts chargés (grep : seules mentions = commentaires « Supprimé » 10a:20-21 et le fichier non chargé 10-fin-bloc…). vm sur le vrai texte de openSnapshotsModal + le gestionnaire exact : `EXCEPTION : ReferenceError - listInternalSnapshots is not defined · modal ajoutée au DOM : 0 · réglages fermés : false` (scripts/vm-snapshots.js).
- Remède : retirer le bloc « SNAPSHOTS INTERNES » de 04:1579-1582 (ou le rediriger vers l'historique des backups IDB juste en dessous) · taille S · touche la décision d'ouvrir/fermer : non

### [G2] « 🚨 Ouvrir Mode Urgence » (carte Score de Risque) et « OUVRIR MODE URGENCE PLEIN ÉCRAN » : rien ne s'ouvre (js/06-v63-patterns-chartistes.js:681-689)
- Prouvé : oui (code)
- Ce qui arrive : quand le score de risque ≥ 70, la carte « 🛡️ Score de Risque Global » (Outils › Analytics) affiche « 🚨 Ouvrir Mode Urgence » ; au toucher, openUrgence cherche `#urgenceOverlay`, qui n'existe nulle part (ni HTML, ni JS ; seulement une règle CSS css/22-features-v16-v69.css:1466). Rien ne s'affiche, aucun message — au moment précis où Rams voudrait agir vite. Le texte de 06:807 renvoie aussi à un bouton flottant « SOS » en bas à droite qui n'existe pas dans le HTML.
- Atteint par : HTML:633 « 🔧 Outils Avancés » → openOutils('analytics') → section riskScoreSection (07:1140) → renderRiskScoreSection (06:1650) → bouton 06:1693 si globalScore ≥ 70.
- Preuve : `06:683 const el = document.getElementById('urgenceOverlay'); 06:684 if(el) el.classList.add('show');` — grep « urgenceOverlay » dans AURA8_v118.html + js/*.js chargés : uniquement 06:683 et 06:693 (lectures). « SOS » absent du HTML.
- Remède : faire pointer le bouton vers les actions déjà codées (urgenceCloseAll / urgencePauseBot, 06:698-742) ou le retirer · S · non (ouvre seulement un écran)

### [G2] Onglet « 🛠 Outils » de _OUTILS_TABS sans bouton : 15 outils inaccessibles (js/07-v90-mode-bunker-sos.js:1196-1215)
- Prouvé : oui (code)
- Ce qui arrive : la barre d'onglets du panneau Outils Avancés n'a que Analytics / Agents / Trading / Alertes / UI (HTML:1376-1380) et seul openOutils('analytics') est appelé (HTML:633). L'onglet `outils` (Mode Urgence avec « Fermer toutes les positions / Pause bot / Mises à 10 % / Backup d'urgence », Stress test, ADN, Calculatrice, Paper Ultra, Diff, Coffre, Backup auto, Rapport PDF, Export Excel, Résumé hebdo, Backtest) n'est jamais affiché.
- Atteint par : non atteint (aucun `switchOutilsTab('outils'` ni `openOutils('outils'` dans le code chargé — grep).
- Preuve : `07:1196 outils: { label: '🛠 Outils', sections: [ …` ; script scripts/outils-tabs.js : « onglet outils : 15 sections · bouton d'accès : NON ».
- Remède : ajouter le 6e bouton d'onglet en HTML:1380 (ou supprimer l'onglet) · S · non

### [G3] « ✕ Fermer hedges » ne ferme jamais rien ; « 🛡️ Hedge manuel » annonce « Hedge ouvert » même quand rien n'est ouvert (js/05-v37-19-indicateur-de-fatigue-bot.js:203-227)
- Prouvé : oui (code)
- Ce qui arrive : (a) « Fermer hedges » filtre `p._isHedge`, drapeau posé par AUCUN code (grep : seule occurrence 05:224) → toujours « Aucun hedge à fermer », même avec le short ouvert par « Hedge manuel ». (b) « Hedge manuel » appelle autoOpenPosition, qui sort en silence en MANU (09c:70 `if (S.botAutoMode === false) return;`), en RE non lancé, réseau coupé, anti-revenge, etc., et ne renvoie rien ; le toast « 🛡️ Hedge ouvert : X SHORT $… » s'affiche quand même. En MANU, Rams croit être couvert alors qu'aucune position n'existe. (Le blocage en MANU est correct : c'est le message qui ment.)
- Atteint par : Outils Avancés › ⚡ Trading › Hedge Automatique, boutons 05:292-293.
- Preuve : `05:224 const hedgePos = (S.openPositions||[]).filter(p=>p._isHedge||false);` ; `05:210 autoOpenPosition(candidate, 'short', stake);` puis `05:211 showToast('🛡️ Hedge ouvert : '+candidate+…)` sans test du résultat ; autoOpenPosition (09c:53-998) n'a aucun `return` de valeur de succès.
- Remède : marquer `_isHedge:true` sur la position ouverte par manualHedge et ne toaster « ouvert » que si S.openPositions a grandi · S · non

### [G4] `window._snapshotActionCreate()` (09g:236) — confirmé non défini, mais jamais visible
- Prouvé : oui (code)
- Ce qui arrive : le bouton « 📸 CRÉER UN SNAPSHOT MAINTENANT » appellerait une fonction supprimée (10a:22) → TypeError. Mais Rams ne le voit JAMAIS : la modale qui le contient n'est jamais construite, car openSnapshotsModal plante à la ligne 222 avant `document.body.appendChild` (constat précédent). Donc pas d'effet propre ; il disparaît avec le remède ci-dessus.
- Atteint par : non atteint (modale jamais créée).
- Preuve : `js/09g-modals.js:236 <button onclick="window._snapshotActionCreate()" …` ; inventaire acorn : seul gestionnaire inline du code chargé appelant un nom non défini en dehors de ceux ci-dessus.
- Remède : supprimer openSnapshotsModal (09g:217-250) en même temps que le bouton 04:1582 · S · non

### [G4] Doublons dans _OUTILS_TABS : riskScoreSection (Analytics) et calcSection (Outils) listées deux fois (js/07-v90-mode-bunker-sos.js:1140+1147, 1205+1208)
- Prouvé : oui (code)
- Ce qui arrive : CONFIRMÉ. En Analytics, deux `<div id="riskScoreSection">` sont créés ; getElementById rend deux fois dans le PREMIER, le second reste vide (marge 0, invisible). Rams voit le Score de Risque une seule fois, calculé deux fois — aucun effet visible. calcSection est dans l'onglet inaccessible : aucun effet. (whatifSection et replaySection figurent aussi dans Analytics ET Outils, mais jamais à l'écran en même temps.)
- Atteint par : Outils Avancés › Analytics (HTML:633 / 1376).
- Preuve : `07:1140 { id:'riskScoreSection', render:'renderRiskScoreSection' …}` et `07:1147` identique ; `07:1205` et `07:1208` identiques pour calcSection. 07:1250-1252 : `const el = document.getElementById(s.id); … window[s.render]();`
- Remède : supprimer 07:1147 et 07:1208 · S · non

### [G4] Onglet inaccessible « 🛠 Outils » : « ⏸ Pause bot immédiate » pose `a._paused` (jamais lu) et le « Mode réaliste » de Paper Ultra n'est appliqué à aucun trade (js/06-v63-patterns-chartistes.js:737 · 06:2308-2350)
- Prouvé : oui (code)
- Ce qui arrive : sans effet pour Rams aujourd'hui (onglet sans bouton). `a._paused` : 0 lecture dans le code chargé (ecrit-lu.js) — la pause réelle vient de `S.botAutoMode = false` (06:734), qui marche. applyRealisticFrictions n'est appelée que par simulateRealisticTrade (06:2350), l'aperçu de la carte : le toast « 🎯 Mode réaliste activé — frictions simulées » (06:2288) ne change aucun trade. À corriger AVANT de rendre l'onglet accessible.
- Atteint par : non atteint.
- Preuve : `06:737 (S.agents||[]).forEach(a=>{ a._paused=true; });` ; grep `applyRealisticFrictions(` → 06:2350 seulement.
- Remède : retirer la ligne 737 ; étiqueter Paper Ultra « aperçu » ou brancher dans 09c · S · non

## Non couvert
- Les ~78 noms appelés par les gestionnaires coupés par concaténation ont été vérifiés comme DÉFINIS, mais pas leur comportement un par un (seulement ceux listés ci-dessus).
- Réglages vérifiés écrit→lu : levier, partage caisse, timeframe RE, paires EV/RE, frais, trailing par position, sorties partielles, hedge, bunker, vacances, urgence, anti-revenge, Paper Ultra. NON vérifiés : Pyramide (_PY_CFG, RAM seule, lu par pyramidPosition), Stratégie B / A-B testing (updateStratBParam), consignes MAN (_saveManConsigne), notifications (notifConfig), alertes prix, fiscal (16b), thème/avatar/fund manager/dash public (cosmétiques).
- Pages Agents / Marché / Veille / Fiscal : boutons inventoriés (tous définis) mais textes/infobulles non relus contre le code.
- Guardian (guardian-*.js) : seulement inclus dans la recherche de définitions, pas audité.
