// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00-backup-state.js · VERSION 121 · 21/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// NEUTRALISÉ DÉFINITIVEMENT.
//
// Ce fichier contenait auparavant le seed _BACKUP_STATE figé du 06/05/2026
// (cycle=12383, mode=real, savedAt=undefined, 1.09 MB) qui écrasait
// silencieusement le storage à chaque démarrage de l'app, faisant
// régresser le cycle.
//
// Le fichier reste présent (la balise <script src="js/00-backup-state.js">
// est toujours dans le HTML) mais ne fait plus rien. Le storage est
// désormais protégé par :
//   - 00b-persistance-override.js v120.5 (garde-fou anti-régression)
//   - loadState dual-storage (lit IndexedDB + localStorage, garde le plus
//     haut cycle)
//
// Si l'utilisateur a besoin d'un état de départ pour repartir d'un état
// connu (perte totale du storage), passer par l'outil restore-tool.html
// avec un export JSON manuel.
//
// ════════════════════════════════════════════════════════════════════════

// (vide — pas de seed automatique)
