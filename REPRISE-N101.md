# REPRISE go n° 101 — levier de paire sans commande visible (registre n° 101)

Rams 15/11 12:48 « Fo 101 » (= go 101). Branche `travail/n101`. Départ : main `733ed6a` (`20261115h`), banc-all LIVRABLE (3 min).

## Données
- Pont `etat` 15/11 12:4x : app en `20261115h`, MANU, EV 11 positions de la voix (AVAX SHORT `_voix`).
- Backup du jour : `rejeu/backups/pont/aura_guardian_full_20261115-125237.json` — AVAX/USDT `pairLeverage: 2` dans `walletStore.paperReal` seul (les autres paires et modes : 1).

## Constat (code)
- Seul écrivain durable de `ps.pairLeverage` : 03 `changePairLev`, appelé par le panneau 03 `#pairPosButtons` (display:none, HTML:364).
- Lecteurs : 02 openPosition (sauf voix), via « ✓ Appliquer » (02 applyBotSuggestion) et 02 quickOpen (sans appelant) ; carte 07 (« ×2 inactif · levier ×0 ») ; 07 manuInvert / 10e / 03 posent un levier temporaire puis le rendent.
- La fiche MAN (10h openManDetail, ouverte par les briques MAN) a un champ « Levier × » PAR TRADE (défaut 1), pas le réglage de la paire.

## Étapes
- [x] Démarrage : pont, Sentry (seule « Sentry branché »), banc-all LIVRABLE
- [x] Correction : 10h, section « ⚡ Levier de la paire » de la fiche MAN (− ×N +, par 03 changePairLev ; 03 inchangé), synchro dans _manRefreshTick
- [x] banc-n101 9/9 (7 échouent sur 733ed6a : `BANC_ROOT=/tmp/avant101`), `python3 -I rejeu/mutations_n101.py .` 17/17 ; banc-manu (helpers ajoutés), banc-n99 F (via sans-n101) ; fixture `banc-fixtures/sans-n101.js` + `n101-retours.json`
- [ ] sonde vraie page `rejeu/sonde_n101.js` (backup ci-dessus)
- [ ] ETAT, PASSATION, banc-all, un commit sur main, push, DOC_V raw + Pages
