# REPRISE — go sessions (Rams, 21/11/2026 07:01 « … puis go le reste des sessions continental »)

Mesure seule (aucun code de l'app) : les ouvertures de Tokyo / Londres / New York portent-elles un gain net ? 4 familles, règles en tête de `rejeu/porte_sessions.py`.

## Étapes
- [x] go long-ou-rien livré avant (466c023, N'ENTRE PAS)
- [x] Règles figées 21/11 06:23:18 UTC, lignes 1–61, SHA-256 `a19bc0eab38291abc2164e064609a3bb60d5ade2cd7afcd496aa63f698fd5bc9`, commitées AVANT les données
- [x] Code sous l'en-tête, essayé sur données SYNTHÉTIQUES seulement (`/home/claude/scratch/synth.py` → /home/claude/synth) : T2 mal posé (rembourse les frais) → corrigé AVANT les données : règles v2 lignes 1–65, SHA-256 `6620526491c0a7e1696525a13aa63e690d6c7efbf57c9d0a4d8a52ac5bf93edd`, 21/11 06:28:37 UTC
- [x] Données 06:29:43 → 06:30:36 UTC : 937 archives 5 min (152 absentes avant cotation) ; 1 h : /home/claude/donnees
- [x] Passage 06:30:40 UTC (un seul) : T1 ✗ (1 283 / 675 802 ouvertures 1 h ≠ 5 min, DOGE 2019-20, LINK 2019, SOL/AVAX 2020) → PORTE FAUSSE partout ; T2 ✗ familles 2 et 4. Relecture : boucle à la main = porte (BTC / DOGE NY f5 R30 S8h, BTC 22:00)
- [ ] Livraison : ETAT, PASSATION, banc-all, un commit sur main (sans cette note)
