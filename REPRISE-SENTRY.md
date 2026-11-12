# REPRISE — GO SENTRY (12/11/2026, Rams : « Go sentry »)

Mission : brancher Sentry dans l'app pour que chaque erreur (plantage ET erreur avalée par `_decErr`) arrive tout de suite, avec la ligne de code et le token, sans rien de privé (clés, PAT, montants).

## Fait côté Sentry (outil MCP, org `aura8`, région https://de.sentry.io)
- [x] Projet `aura8-app` (id 4512420614570064, équipe `aura8`, plateforme javascript)
- [x] DSN (public par nature) : `https://a4fbd89d24d60a40dc643590355d0def@o4512420537499648.ingest.de.sentry.io/4512420614570064`
- [x] Clé renommée « tablette AURA8 », limite serveur 160 événements / 24 h (= 5 000 / mois du plan Developer ÷ 31), options du loader replay / performance coupées
- [ ] Pont aura-pont : rattachement REFUSÉ par le classifieur de la session (12/11 21:15) — lecture de l'app faite sur l'ETAT (backup du 12/11 18:43)

## Étapes
- [ ] SDK officiel @sentry/browser 11.12.0, réduit (BrowserClient + fetch transport + intégrations choisies) → `js/vendor/…` ; recette versionnée `rejeu/sentry/`
- [ ] `js/00s-sentry.js` : init stricte, filtre, plafonds, erreurs avalées (00 `_decErr`)
- [ ] HTML 87 → 89 `?v=` ; bancs qui épinglent 87 mis à jour
- [ ] `banc-sentry.js` (échoue sur le code d'avant) + sonde Chromium vraie page
- [ ] banc-all LIVRABLE, ETAT + PASSATION, un commit sur main, Pages vérifié
- [ ] après relance de Rams : l'événement « Sentry branché » visible dans Sentry

## Commandes
- Construire le SDK : `bash rejeu/sentry/construire.sh` (npm @sentry/browser@11.12.0 + esbuild dans /tmp)
- Bancs : `node banc-sentry.js` · `node banc-all.js`
