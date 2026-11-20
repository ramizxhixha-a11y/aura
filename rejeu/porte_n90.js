// PORTE du registre n° 90 — GO N° 90, 20/11/2026 — règles en tête (lignes 1 à 30)
// Question de Rams (19/11) : « pourquoi le conseil dépasse les bots, normalement ce devrait être le contraire » (règle « disciples sous les maîtres »).
// Remède proposé le 19/11 : noter Scalper, Arbitrage et DCA (les 3 bots qui votent, 03 _DC_BOTS) au MÊME examen que les analystes — le bilan aux
// horizons (03 _vjE : moyenne des 5 E_h sur la fenêtre apprise, 350 + 1 000 × E, 03 _fitScale) — au lieu de leurs seuls actes vérifiés (03 _botJudge).
// Rams : « lancer, mais je ne suis pas convaincu ». Cette porte dit si le remède sert son but, sur ses vraies données, avant tout changement de code.
// Honnêteté : une première mesure exploratoire a été faite sur le même backup (20/11 21:10) avant d'écrire ces règles ; aucune donnée choisie après
// coup — le seul backup de la mission, celui que le pont a rendu.
// Données : chaque --backup donné (backup Guardian complet, lu en lecture seule ; rien n'est écrit).
// Mesures (formules recopiées de 03, vérifiées par le témoin M0) :
//  M0 TÉMOIN — la porte voit-elle le vrai calcul ? Pour chaque siège non bot dont le record aux horizons est complet (≥ 5 jugements à chaque horizon
//     dans la fenêtre) et quand la définition vivante est « horizons » (T.fModes sans « bougie ») : la formule redonne-t-elle son T$ vivant ?
//     Moins de 80 % d'accord → porte AVEUGLE, aucun verdict.
//  M1 — par agent : T$ vivant, T$ au même examen (horizons) ou « — » (pas de voix, record incomplet), nombre d'actes / jugements gardés.
//  M2 — classement : rang du 1er bot et analystes devant lui, vivant contre « les 3 bots au même examen » (les 6 autres bots gardent leur note).
//  M3 — la note mesure-t-elle un talent ? La règle de fenêtre apprise (10i _fitWindowEval, S.fitWindowRule) : précision du conseil pondéré par la
//     fitness pour chaque fenêtre (50 % = pile ou face) ; et l'étendue de la fenêtre en événements réels (k, S._realJudgments) chez les analystes.
// Verdict :
//  ENTRE si M0 voit ET si, au même examen, au moins un des 3 bots monte (T$ au même examen > T$ vivant) et que les analystes devant le 1er bot diminuent.
//  N'ENTRE PAS sinon (le remède ne sert pas la règle de Rams : il rendrait le classement plus juste mais mettrait les maîtres plus bas).
//  M3 est dit à côté : si toutes les fenêtres sont sous 50 %, la note ne prédit pas mieux que pile ou face — tout remède sur le classement est prématuré.
// Usage : node rejeu/porte_n90.js --backup rejeu/backups/pont/aura_guardian_full_AAAAMMJJ-HHMMSS.json [--backup …]
'use strict';
const fs = require('fs');
const argv = process.argv.slice(2), backups = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === '--backup') backups.push(argv[++i]);
if (!backups.length) { console.error('usage : node rejeu/porte_n90.js --backup <fichier> [--backup <fichier> …]'); process.exit(2); }
const TH_HZ = [1, 2, 4, 8, 16], FIT_MIN_N = 5, DC_BOTS = ['scalper_bot_v1', 'arb_bot_v1', 'dca_bot_v1'];
const fitScale = E => Math.max(50, Math.min(2000, Math.round(350 + 1000 * E)));   // 03 _fitScale
function fitWindow(S) { const r = S.fitWindowRule, w = (r && r.armed) ? Math.round(Number(r.window)) : 0; return (w >= 10 && w <= 240) ? w : 60; }   // 03 _fitWindow
function vjE(S, id, W) {   // 03 _vjE
  const T = S.dcThreshold, Jv = T && T.vHz && T.vHz[id];
  if (!Array.isArray(Jv) || Jv.length !== TH_HZ.length) return null;
  let s = 0;
  for (let i = 0; i < Jv.length; i++) {
    const L = Array.isArray(Jv[i]) ? Jv[i] : [], n = Math.min(L.length >> 1, W);
    if (n < FIT_MIN_N) return null;
    let a = 0, b = 0;
    for (let j = Math.max(0, L.length - 2 * W); j + 1 < L.length; j += 2) { const x = Number(L[j]) * Number(L[j + 1]); if (isFinite(x)) { a += x; b += Math.abs(x); } }
    s += b > 0 ? a / b : 0;
  }
  return s / Jv.length;
}
// Bots et méta : le backup ne garde ni isBot ni isMeta (posés au lancement depuis la définition par défaut de 02) → lus dans le VRAI code, 02-state-init.js.
const SRC02 = fs.readFileSync(require('path').join(__dirname, '..', 'js', '02-state-init.js'), 'utf8');
const defIds = flag => { const out = []; const blocks = SRC02.split(/\n\s*\{\s*id:'/).slice(1); blocks.forEach(b => { const id = b.slice(0, b.indexOf("'")); const fin = b.indexOf('}'); if (new RegExp('\\b' + flag + ':true').test(b.slice(0, fin))) out.push(id); }); return out; };
const BOTS = defIds('isBot'), METAS = defIds('isMeta');
if (BOTS.length !== 9 || METAS.length !== 1) { console.error('✖ définition des agents de 02 non reconnue : ' + BOTS.length + ' bots, ' + METAS.length + ' méta (attendu 9 et 1)'); process.exit(2); }
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const isBot = a => BOTS.includes(a.id), isMeta = a => METAS.includes(a.id);
let verdicts = [];
for (const f of backups) {
  let S;
  try { S = JSON.parse(fs.readFileSync(f, 'utf8')).aura; } catch (e) { console.log('✖ ' + f + ' illisible : ' + e.message); continue; }
  if (!S || !Array.isArray(S.agents) || !S.dcThreshold) { console.log('✖ ' + f + ' : ni agents ni dcThreshold'); continue; }
  const W = fitWindow(S), T = S.dcThreshold, hzMode = !(T.fModes && Object.keys(T.fModes).some(k => T.fModes[k] === 'bougie'));
  console.log('\n══ ' + f + ' · cycle ' + S.cycle + ' · fenêtre W = ' + W + ' · fitness des sièges : ' + (hzMode ? 'horizons' : 'bougie'));
  // M0
  let vus = 0, accord = 0;
  S.agents.forEach(a => { if (!a || isBot(a) || isMeta(a) || !hzMode) return; const e = vjE(S, a.id, W); if (e === null) return; vus++; if (fitScale(e) === Math.round(Number(a.fitness))) accord++; });
  const voit = vus > 0 && accord / vus >= 0.8;
  console.log('M0 témoin : ' + accord + ' sièges sur ' + vus + ' redonnent leur T$ vivant → ' + (voit ? 'la porte VOIT' : 'porte AVEUGLE'));
  // M1
  const rows = S.agents.map(a => { const e = vjE(S, a.id, W); return { a, bot: isBot(a), live: Math.round(Number(a.fitness) || 0), hz: e === null ? null : fitScale(e), n: (a._judgments || []).length }; });
  rows.slice().sort((x, y) => y.live - x.live).forEach((r, i) => console.log(String(i + 1).padStart(2) + ' ' + (r.bot ? 'BOT' : '   ') + ' ' + r.a.id.padEnd(17) + ' ' + String(r.a.type || '').padEnd(18) + ' T$ ' + String(r.live).padStart(4) + ' · même examen ' + (r.hz === null ? '   —' : String(r.hz).padStart(4)) + ' · gardés ' + r.n));
  // M2
  const rank = list => { const s = list.slice().sort((x, y) => y.v - x.v); const i = s.findIndex(x => x.bot); return { r: i + 1, devant: s.slice(0, Math.max(0, i)).filter(x => !x.bot).length, nom: i >= 0 ? s[i].id : '—' }; };
  const live = rank(rows.map(r => ({ id: r.a.id, bot: r.bot, v: r.live })));
  const apres = rank(rows.map(r => ({ id: r.a.id, bot: r.bot, v: (r.bot && DC_BOTS.includes(r.a.id) && r.hz !== null) ? r.hz : r.live })));
  console.log('M2 vivant : 1er bot ' + live.nom + ' au rang ' + live.r + ', ' + live.devant + ' analyste(s) devant · 3 bots au même examen : 1er bot ' + apres.nom + ' au rang ' + apres.r + ', ' + apres.devant + ' analyste(s) devant');
  const montent = rows.filter(r => DC_BOTS.includes(r.a.id) && r.hz !== null && r.hz > r.live).map(r => r.a.id);
  DC_BOTS.forEach(id => { const r = rows.find(x => x.a.id === id); if (r) console.log('   ' + id + ' : ' + r.live + ' → ' + (r.hz === null ? '—' : r.hz)); });
  // M3
  const R = S.fitWindowRule || {};
  const acc = R.acc || {}, sous50 = Object.keys(acc).length && Object.keys(acc).every(k => Number(acc[k]) < 50);
  console.log('M3 règle de fenêtre : ' + (R.armed ? 'armée' : 'non armée') + ' à ' + (R.window || 60) + ' · ' + (R.n || 0) + ' événements rejoués · précision du conseil pondéré par la fitness : ' + Object.keys(acc).map(k => k + ' → ' + acc[k] + ' %').join(', ') + (sous50 ? ' · TOUTES sous 50 % (pile ou face)' : ''));
  const spans = S.agents.filter(a => a && !isBot(a) && !isMeta(a) && Array.isArray(a._judgments) && a._judgments.length >= W).map(a => { const js = a._judgments; return js[js.length - 1].k - js[js.length - W].k; });
  console.log('   la fenêtre de ' + W + ' jugements couvre ' + med(spans) + ' événements réels (médiane, ' + spans.length + ' analystes) sur ' + (S._realJudgments || 0) + ' depuis le 17/09');
  const v = !voit ? 'AVEUGLE' : (montent.length && apres.devant < live.devant) ? 'ENTRE' : 'N\'ENTRE PAS';
  console.log('VERDICT n° 90 « même examen » : ' + v + (sous50 ? ' · et la note elle-même ne prédit pas (M3)' : ''));
  verdicts.push(v);
}
process.exitCode = verdicts.length ? 0 : 1;
