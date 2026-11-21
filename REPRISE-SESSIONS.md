# REPRISE — go sessions (Rams, 21/11/2026 07:01 « … puis go le reste des sessions continental »)

Mesure seule (aucun code de l'app) : les ouvertures de Tokyo / Londres / New York portent-elles un gain net ? 4 familles, règles en tête de `rejeu/porte_sessions.py`.

## Étapes
- [x] go long-ou-rien livré avant (466c023, N'ENTRE PAS)
- [x] Règles figées 21/11 06:23:18 UTC, lignes 1–61, SHA-256 `a19bc0eab38291abc2164e064609a3bb60d5ade2cd7afcd496aa63f698fd5bc9`, commitées AVANT les données
- [x] Code sous l'en-tête, essayé sur données SYNTHÉTIQUES seulement (`/home/claude/scratch/synth.py` → /home/claude/synth) : T2 mal posé (rembourse les frais) → corrigé AVANT les données : règles v2 lignes 1–65, SHA-256 `6620526491c0a7e1696525a13aa63e690d6c7efbf57c9d0a4d8a52ac5bf93edd`, 21/11 06:28:37 UTC
- [ ] Données : `sh rejeu/sessions_get.sh /home/claude/d5m 2018-07 2026-09` ; 1 h : /home/claude/donnees (déjà là)
- [ ] Passage : `python3 -I rejeu/porte_sessions.py /home/claude/donnees /home/claude/d5m`
- [ ] Livraison : ETAT, PASSATION, banc-all, un commit sur main (sans cette note)
