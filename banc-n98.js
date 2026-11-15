// banc-n98.js — [GO N° 98 · 15/11/2026] VERSION 20261115k · le pont ne se tait plus SANS signal (registre n° 98, trouvé par la relecture de go pont)
// Défaut (code, 17b d'avant) : (a) un contrôle du PAT « non concluant » (17b verifier → 'reseau' / 'limite', motifs absents de SIGNAUX) ou un
// etat.json refusé en boucle (409 / 422 / 5xx sur le PUT) laisse le pont muet sans fin, Sentry ne dit rien ; (b) un PAT disparu du stockage sans
// « Couper le pont » arrête le pont en silence (en route : « coupé depuis un autre onglet » ; au lancement : rien).
// Remède (17b) : (a) début de la panne gardé dans aura_pont_mem.muet quand GitHub RÉPOND (une coupure du réseau lève : ni début ni fin), effacé au
// premier etat.json écrit ; passé VERIF_MS (24 h, la période du contrôle quotidien qui existait) → motif « controle » ou « etat » ; 401 / accès ont
// déjà leur motif. (b) marque aura_pont_mem.actif posée au démarrage, retirée par « Couper » (et les coupures définitives) AVANT le PAT ; PAT absent
// + marque → motif « disparu » (en route : tout de suite ; au lancement : après BOOT_MS, ou au retour du réseau).
// Ce banc fait tourner le VRAI 17 + 17b dans la vm de banc-pont-direct (banc-fixtures/pont-monde.js : faux GitHub, horloge simulée), faux Sentry.
// Échoue sur le code d'avant : git show deb707a:js/17b-pont-direct.js > /tmp/avant-17b.js && node banc-n98.js /tmp/avant-17b.js
// Usage : node banc-n98.js [<17b à tester>]   (argument : mutations, rejeu/mutations_n98.py)
'use strict';
const assert = require('assert');
const M = require('./banc-fixtures/pont-monde.js')({ pont: process.argv[2] });
const { monde, codeStrict, MIN, H, PAT_OK, PAT_LARGE, PAT_MORT, SONDE, DEPOT } = M;
const J = 24 * H;
let pass = 0, fail = 0;
const TESTS = [];
function T(name, fn) { TESTS.push([name, fn]); }
const ligne = X => X.els.pontDirectEtat.textContent;
const P = 'AURA8 · Pont direct ';
const TCTRL = P + 'muet · contrôle du PAT non concluant depuis 24 h, GitHub répond pourtant';
const TETAT = P + 'muet · etat.json non écrit depuis 24 h, GitHub répond pourtant';
const TDISP = P + 'coupé · le PAT a disparu de l\'appareil sans « Couper le pont »';
const T401 = P + 'suspendu · PAT refusé par GitHub (401 : expiré ou révoqué)';
const TLARGE = P + 'coupé · PAT trop large (il peut écrire dans le code), effacé';
const TACC = P + 'suspendu · le PAT ne voit plus aura-pont ou n\'y écrit plus (403 / 404)';
const DISP_LIGNE = 'coupé · le PAT a disparu de cet appareil sans « Couper le pont » → colle un nouveau PAT et Activer';
const sentry = X => X.run('window._auraSentry = { signal: function (t) { window.__sig = (window.__sig || []).concat([t]); } };');
const sig = X => JSON.parse(X.run('JSON.stringify(window.__sig || [])'));
const avec = o => { const X = monde(o); sentry(X); return X; };
const memo = X => JSON.parse(X.ls.get('aura_pont_mem') || '{}');
const jour = t => new Date(t).toISOString().slice(0, 10);
const etats = X => X.gh.journal.filter(r => r.m === 'PUT' && /\/etat\.json$/.test(r.url)).length;
// pannes réglables : une règle retirée par .length = 0
const sondeRefus = msg => r => (r.m === 'PUT' && r.url === SONDE) ? { st: 403, j: { message: msg } } : null;   // GitHub change le texte de son refus
const etatRefuse = st => r => (r.m === 'PUT' && /\/etat\.json$/.test(r.url)) ? { st, j: { message: st === 409 ? 'etat.json does not match' : 'Server Error' } } : null;
const enLigneSur = (X, v) => { X.c.navigator.onLine = v; };
const online = X => X.winL.filter(x => x[0] === 'online');
const retenir = X => { const r = { lache: null }, f = X.c.fetch; X.c.fetch = (u, i) => new Promise(res => { r.lache = fn => { X.c.fetch = f; if (fn) fn(); res(f(u, i)); }; }); return r; };   // une requête retenue en vol (comme banc-pont-signal)

// ───────────── A · (a) GitHub répond, aucun etat.json ne part ─────────────
T('V1 · le cas n° 98 (a) : PAT gardé, le contrôle du code reste « non concluant » (GitHub a changé le texte de son 403) → suspendu ; rien pendant 24 h (aucun geste demandé), puis UN signal « controle » à texte fixe ; aucun etat.json ; relance le même jour : rien de plus ; le lendemain : un ; la panne finie → actif, état écrit, début de panne effacé', async () => {
  const ls = new Map([['aura_pont_pat', PAT_OK]]);
  let X = avec({ lsMap: ls }); X.gh.panne(sondeRefus('Forbidden'));
  await X.avancer(15000); const debut = X.clock.t;
  assert.strictEqual(X.st().etat, 'suspendu'); assert.ok(/contrôle du dépôt du code non concluant · GitHub 403 « Forbidden »/.test(ligne(X)) && !ligne(X).includes('Couper le pont'), ligne(X));
  assert.deepStrictEqual(sig(X), []); assert.ok(memo(X).muet > 0 && memo(X).muet <= debut, 'début de panne gardé : ' + JSON.stringify(memo(X)));
  await X.avancer(J - 2 * MIN); assert.deepStrictEqual(sig(X), [], 'pas avant 24 h'); assert.strictEqual(etats(X), 0);
  await X.avancer(10 * MIN); assert.deepStrictEqual(sig(X), [TCTRL], 'une fois passé 24 h'); assert.strictEqual(etats(X), 0); assert.strictEqual(X.st().etat, 'suspendu');
  await X.avancer(6 * H); assert.deepStrictEqual(sig(X), [TCTRL], 'une seule fois par chargement');
  const m1 = memo(X); assert.ok(m1.sig && m1.sig.controle === jour(X.clock.t));
  X = avec({ lsMap: ls, t0: X.clock.t + MIN }); X.gh.panne(sondeRefus('Forbidden')); await X.avancer(30 * MIN); assert.deepStrictEqual(sig(X), [], 'même jour UTC, relancée : rien');
  X = avec({ lsMap: ls, t0: X.clock.t + J }); X.gh.panne(sondeRefus('Forbidden')); await X.avancer(15000); assert.deepStrictEqual(sig(X), [TCTRL], 'le lendemain, toujours muet : un (le début de panne a survécu aux relances)');
  X.gh.pannes.length = 0; await X.avancer(6 * MIN); assert.strictEqual(X.st().etat, 'actif'); assert.ok(etats(X) >= 1); assert.strictEqual(memo(X).muet, undefined, 'début de panne effacé au 1er etat.json');
});
T('V2 · les autres « non concluant » qui durent : aura-pont qui répond 500, fichier-témoin du code non lu (404 + 404), limite DITE (429 retry-after) sans fin → « controle » passé 24 h, jamais avant', async () => {
  const cas = [
    ['aura-pont 500', r => (r.m === 'GET' && r.url === DEPOT) ? { st: 500, j: { message: 'Server Error' } } : null],
    ['témoin non lu', r => (r.url === SONDE) ? { st: 404, j: { message: 'Not Found' } } : null],
    ['limite dite', r => (r.url === DEPOT) ? { st: 429, j: { message: 'Too Many Requests' }, h: { 'retry-after': '120' } } : null]];
  for (const [nom, regle] of cas) {
    const X = avec({ ls: { aura_pont_pat: PAT_OK } }); X.gh.panne(regle);
    await X.avancer(J - 5 * MIN); assert.deepStrictEqual(sig(X), [], nom + ' : pas avant 24 h'); assert.strictEqual(etats(X), 0, nom);
    await X.avancer(70 * MIN); assert.deepStrictEqual(sig(X), [TCTRL], nom + ' : un, passé 24 h'); assert.ok(!ligne(X).includes('Couper le pont'), nom + ' · ' + ligne(X));
  }
});
T('V3 · etat.json refusé en boucle alors que le contrôle passe (409 même après relecture ; 500) : les demandes sont servies (409) ou tout attend (500), aucun état pendant 24 h → UN signal « etat » ; un etat.json écrit remet tout à zéro', async () => {
  for (const st of [409, 500]) {
    const X = avec(); await X.activer(PAT_OK); assert.strictEqual(X.st().etat, 'actif'); const e0 = etats(X);
    const r = etatRefuse(st); X.gh.panne(r);
    const id = X.demande(1, 'ping'); await X.avancer(2 * MIN);
    if (st === 409) assert.ok(X.rep(id) && X.rep(id).ok, 'les demandes restent servies');
    await X.avancer(J - 10 * MIN); assert.deepStrictEqual(sig(X), [], st + ' : pas avant 24 h');
    await X.avancer(20 * MIN); assert.deepStrictEqual(sig(X), [TETAT], st + ' : un, passé 24 h');
    assert.ok(X.gh.journal.filter(q => q.m === 'PUT' && /\/etat\.json$/.test(q.url)).length > e0, 'il a bien essayé');
    X.gh.pannes.length = 0; await X.avancer(6 * MIN); assert.strictEqual(memo(X).muet, undefined, st + ' : effacé');
  }
});
T('V4 · réseau coupé (aucune réponse de GitHub) 3 jours, au lancement comme en route, ou appareil hors ligne : ni signal, ni début de panne ; puis GitHub répond « non concluant » : la panne commence À CE MOMENT (24 h de plus avant le signal)', async () => {
  let X = avec({ ls: { aura_pont_pat: PAT_OK } }); X.gh.panne(() => 'reseau');
  await X.avancer(3 * J); assert.deepStrictEqual(sig(X), []); assert.strictEqual(memo(X).muet, undefined, 'réseau seul : aucun début');
  X.gh.pannes.length = 0; X.gh.panne(sondeRefus('Forbidden')); await X.avancer(10 * MIN); const debut = memo(X).muet; assert.ok(debut >= X.clock.t - 10 * MIN, 'début = première réponse de GitHub');
  await X.avancer(J - 20 * MIN); assert.deepStrictEqual(sig(X), []); await X.avancer(20 * MIN); assert.deepStrictEqual(sig(X), [TCTRL]);
  X = avec(); await X.activer(PAT_OK); X.gh.panne(() => 'reseau'); await X.avancer(3 * J); assert.deepStrictEqual(sig(X), []); assert.strictEqual(memo(X).muet, undefined, 'en route');
  X = avec({ ls: { aura_pont_pat: PAT_OK } }); enLigneSur(X, false); X.gh.panne(sondeRefus('Forbidden')); await X.avancer(3 * J); assert.deepStrictEqual(sig(X), []); assert.strictEqual(X.gh.journal.length, 0, 'hors ligne : rien ne part');
});
T('V5 · le début de panne survit au rechargement (panne à T, relance à T+12 h, signal à T+24 h, pas T+36 h) ; une panne de 20 h, un état écrit, puis 20 h : aucun signal (rien ne s\'additionne)', async () => {
  const ls = new Map([['aura_pont_pat', PAT_OK]]);
  let X = avec({ lsMap: ls }); X.gh.panne(sondeRefus('Forbidden')); await X.avancer(15000); const debut = memo(X).muet; await X.avancer(12 * H);
  X = avec({ lsMap: ls, t0: X.clock.t + MIN }); X.gh.panne(sondeRefus('Forbidden')); await X.avancer(15000); assert.strictEqual(memo(X).muet, debut, 'gardé');
  await X.jusqua(() => sig(X).length > 0, 5 * MIN, 400); assert.deepStrictEqual(sig(X), [TCTRL]); assert.ok(X.clock.t - debut >= J && X.clock.t - debut <= J + 15 * MIN, 'à 24 h du début (pas de 5 min du banc + 5 min entre deux essais) : ' + (X.clock.t - debut) / H + ' h');
  X = avec({ ls: { aura_pont_pat: PAT_OK } }); const r = sondeRefus('Forbidden'); X.gh.panne(r); await X.avancer(20 * H);
  X.gh.pannes.length = 0; await X.avancer(6 * MIN); assert.strictEqual(X.st().etat, 'actif'); assert.strictEqual(memo(X).muet, undefined);
  X.gh.panne(etatRefuse(500)); await X.avancer(20 * H); assert.deepStrictEqual(sig(X), []);
});
T('V6 · 401 / accès perdu qui durent : leur motif seul (comme go pont), jamais « controle » ni « etat » en plus ; ils comptent pourtant dans la panne (un « non concluant » qui suit après 20 h de 401 signale 4 h plus tard)', async () => {
  let X = avec({ ls: { aura_pont_pat: PAT_MORT } }); await X.avancer(2 * J); assert.deepStrictEqual(sig(X), [T401], 'au lancement');
  X = avec(); await X.activer(PAT_OK); const droits = X.gh.jetons[PAT_OK]; delete X.gh.jetons[PAT_OK]; await X.avancer(2 * J); assert.deepStrictEqual(sig(X), [T401], 'en route');
  X = avec({ ls: { aura_pont_pat: PAT_OK } }); X.gh.panne(r => (r.url === DEPOT) ? { st: 401, j: { message: 'Bad credentials' } } : null); await X.avancer(20 * H);
  X.gh.pannes.length = 0; X.gh.panne(sondeRefus('Forbidden')); await X.avancer(3 * H); assert.deepStrictEqual(sig(X), [T401]); await X.avancer(2 * H); assert.deepStrictEqual(sig(X), [T401, TCTRL]);
  void droits;
  // PAT passé en LECTURE SEULE sur aura-pont : le contrôle passe (il ne teste pas l'écriture du pont), etat.json refusé 403 à chaque fois → « accès » seul, deux jours
  X = avec(); await X.activer(PAT_OK); X.gh.jetons[PAT_OK] = { pont: 'r', code: null }; await X.avancer(2 * J); assert.deepStrictEqual(sig(X), [TACC], 'lecture seule : son motif, pas « etat »');
});

// ───────────── B · (b) le PAT disparu du stockage ─────────────
T('V7 · le cas n° 98 (b) EN ROUTE : le PAT disparaît du stockage sans « Couper » → au battement suivant : coupé, UN signal « disparu », la ligne dit le geste, plus aucune requête, la marque reste (pour le lancement suivant)', async () => {
  const X = avec(); await X.activer(PAT_OK); await X.avancer(MIN); assert.strictEqual(memo(X).actif, 1, 'marque posée');
  X.ls.delete('aura_pont_pat'); const n = X.gh.journal.length;
  await X.avancer(16000); assert.strictEqual(X.st().etat, 'coupe'); assert.deepStrictEqual(sig(X), [TDISP]); assert.strictEqual(ligne(X), DISP_LIGNE);
  assert.strictEqual(X.gh.journal.length, n, 'aucune requête de plus'); assert.strictEqual(X.timers.size, 0); assert.strictEqual(memo(X).actif, 1);
  await X.avancer(H); assert.deepStrictEqual(sig(X), [TDISP]);
});
T('V8 · (b) AU LANCEMENT : marque sans PAT → la ligne le dit tout de suite ; signal après 1 min (BOOT_MS), pas avant, aucune requête GitHub ; relance le même jour : rien ; le lendemain : un ; hors ligne : il attend le retour du réseau (écouteur « online », retiré ensuite) ; Rams réactive avant : rien, écouteur retiré', async () => {
  const A = avec(); await A.activer(PAT_OK); const ls = new Map(A.ls); ls.delete('aura_pont_pat');
  let X = avec({ lsMap: ls, t0: A.clock.t + H });
  assert.strictEqual(ligne(X), DISP_LIGNE); assert.strictEqual(X.st().etat, 'coupe'); assert.deepStrictEqual(X.winL, []);
  await X.avancer(59000); assert.deepStrictEqual(sig(X), [], 'pas avant 1 min');
  await X.avancer(2000); assert.deepStrictEqual(sig(X), [TDISP]); assert.strictEqual(X.gh.journal.length, 0, 'aucune requête GitHub'); assert.strictEqual(X.timers.size, 0); assert.deepStrictEqual(X.winL, []);
  X = avec({ lsMap: ls, t0: X.clock.t + MIN }); await X.avancer(H); assert.deepStrictEqual(sig(X), [], 'même jour : rien');
  X = avec({ lsMap: ls, t0: X.clock.t + J }); enLigneSur(X, false); await X.avancer(5 * MIN);
  assert.deepStrictEqual(sig(X), [], 'hors ligne : rien'); assert.strictEqual(online(X).length, 1, 'il attend le réseau');
  enLigneSur(X, true); online(X)[0][1](); assert.deepStrictEqual(sig(X), [TDISP]); assert.strictEqual(online(X).length, 0, 'écouteur retiré');
  X = avec({ lsMap: new Map(ls), t0: X.clock.t + J }); enLigneSur(X, false); await X.avancer(2 * MIN); assert.strictEqual(online(X).length, 1);
  enLigneSur(X, true); await X.activer(PAT_OK, 6000); assert.strictEqual(X.st().etat, 'actif'); assert.strictEqual(online(X).length, 0, 'activé : plus d\'attente');   // 6 s : faux GitHub neuf, le sha gardé est relu (une écriture de plus)
  X.run('window.__sig = []'); await X.avancer(H); assert.deepStrictEqual(sig(X), []);
  // Rams colle un PAT à 58 s : le contrôle est en vol quand la minute tombe (PAT en main, pas encore gardé) → aucun signal
  X = avec({ lsMap: new Map(ls), t0: X.clock.t + J }); await X.avancer(58000); const r = retenir(X); X.els.pontDirectPat.value = PAT_OK; X.c.pontDirectActiver(); await X.avancer(4000);
  assert.ok(r.lache, 'contrôle en vol'); assert.strictEqual(X.st().etat, 'verif'); assert.deepStrictEqual(sig(X), [], 'activation en cours : pas une disparition'); r.lache(); await X.avancer(8000); assert.strictEqual(X.st().etat, 'actif'); assert.deepStrictEqual(sig(X), []);
});
T('V9 · (b) PAT gardé devenu ILLISIBLE (abîmé) avec la marque : effacé comme avant, puis « disparu » après 1 min ; sans la marque (installation d\'avant go n° 98) : rien, comme avant (limite dite)', async () => {
  const A = avec(); await A.activer(PAT_OK); const ls = new Map(A.ls); ls.set('aura_pont_pat', PAT_OK.slice(0, 30) + '!' + PAT_OK.slice(31));
  let X = avec({ lsMap: ls, t0: A.clock.t + H }); assert.ok(!ls.has('aura_pont_pat'), 'effacé comme avant'); await X.avancer(2 * MIN); assert.deepStrictEqual(sig(X), [TDISP]);
  X = avec({ ls: { aura_pont_pat: 'abîmé', aura_pont_mem: JSON.stringify({ inst: 'abc1234', etatAt: M.T0 - H }) } }); await X.avancer(H);
  assert.deepStrictEqual(sig(X), []); assert.strictEqual(X.timers.size, 0); assert.deepStrictEqual(X.winL, []);
});
T('V10 · rien quand Rams coupe : « Couper le pont » retire la marque AVANT le PAT (ordre des écritures) → aucun signal, et au lancement suivant le pont est inerte (aucune minuterie) ; deux onglets : « Couper » dans A → B s\'arrête « depuis un autre onglet », sans signal ; coupure définitive (PAT trop large) : son motif seul, pas « disparu » au lancement suivant', async () => {
  let X = avec(); await X.activer(PAT_OK); const k = X.lsJ.length; X.c.pontDirectCouper();
  const w = X.lsJ.slice(k).filter(x => x[0] !== 'get'); assert.deepStrictEqual(w, [['set', 'aura_pont_mem'], ['del', 'aura_pont_pat']], 'marque retirée AVANT le PAT');
  assert.strictEqual(memo(X).actif, undefined); await X.avancer(H); assert.deepStrictEqual(sig(X), []);
  const Y = avec({ lsMap: new Map(X.ls), t0: X.clock.t + MIN }); await Y.avancer(H); assert.deepStrictEqual(sig(Y), []); assert.strictEqual(Y.timers.size, 0); assert.ok(/^coupé · colle le PAT/.test(ligne(Y)));
  const L = new Map(), A = avec({ lsMap: L }); await A.activer(PAT_OK); const B = avec({ lsMap: L, gh: A.gh, t0: A.clock.t }); await B.avancer(70000); assert.strictEqual(B.st().etat, 'actif');
  const mB = JSON.parse(L.get('aura_pont_mem')); assert.ok(mB.etatAt > memo(A).etatAt - 1 && mB.ecrits.length > 2, 'B a écrit un état depuis');
  A.clock.t = B.clock.t;   // même appareil, même horloge (A n'a pas battu depuis l'écriture de B : sa mémoire en main est périmée)
  A.c.pontDirectCouper(); const mC = JSON.parse(L.get('aura_pont_mem')); assert.strictEqual(mC.etatAt, mB.etatAt, 'Couper dans A ne réécrit pas une mémoire PÉRIMÉE par-dessus celle de B (relue d\'abord)'); assert.deepStrictEqual(mC.ecrits, mB.ecrits); assert.strictEqual(mC.actif, undefined); await B.avancer(16000); assert.strictEqual(B.st().etat, 'coupe'); assert.ok(/coupé depuis un autre onglet/.test(ligne(B)), ligne(B)); assert.deepStrictEqual(sig(B), []); assert.deepStrictEqual(sig(A), []);
  const Z = avec({ ls: { aura_pont_pat: PAT_LARGE } }); await Z.avancer(H); assert.deepStrictEqual(sig(Z), [TLARGE]); assert.strictEqual(memo(Z).actif, undefined, 'coupure définitive : marque retirée');
  const Z2 = avec({ lsMap: new Map(Z.ls), t0: Z.clock.t + J }); await Z2.avancer(H); assert.deepStrictEqual(sig(Z2), []);
});
T('V11 · pont sain 3 jours (et relancé) : aucun signal, aucun début de panne ; la marque est posée et reste ; chemin sain IDENTIQUE au code d\'avant (mêmes requêtes, mêmes etat.json, même ligne) — seule la mémoire gagne « actif »', async () => {
  const jouer = async src => {
    const W = require('./banc-fixtures/pont-monde.js')({ pont: src }); const X = W.monde(); sentry(X); await X.activer(PAT_OK);
    const id = X.demande(1, 'ping'); await X.avancer(3 * J);
    return { X, req: X.gh.journal.map(r => r.m + ' ' + r.url + ' ' + (r.brut || '')), ligne: ligne(X), etat: X.gh.texte('etat.json'), rep: X.rep(id) };
  };
  const n = await jouer(process.argv[2]), a = await jouer(require('path').join(__dirname, 'banc-fixtures', 'pont-avant-n98.js'));
  assert.deepStrictEqual(sig(n.X), []); assert.strictEqual(memo(n.X).muet, undefined); assert.strictEqual(memo(n.X).actif, 1);
  assert.strictEqual(n.req.length, a.req.length, 'nombre de requêtes'); assert.deepStrictEqual(n.req, a.req); assert.strictEqual(n.ligne, a.ligne); assert.strictEqual(n.etat, a.etat); assert.deepStrictEqual(n.rep, a.rep);
  const mn = memo(n.X), ma = memo(a.X); delete mn.actif; assert.deepStrictEqual(mn, ma, 'mémoire : seule la marque en plus');
});
T('V12 · textes et constantes : trois motifs FIXES de plus dans SIGNAUX (rien de GitHub, rien du PAT, pas 4 chiffres, ≤ 200) ; « 24 h » = VERIF_MS, la période du contrôle quotidien qui existait (aucun chiffre nouveau) ; la marque n\'est jamais lue que par 17b ; ≤ 500 lignes', () => {
  const p = codeStrict(M.PONT);
  for (const t of [TCTRL, TETAT, TDISP]) { assert.ok(!/\d{4}/.test(t) && !/github_pat_/.test(t) && t.startsWith(P) && t.length <= 200, t); assert.ok(p.includes("'" + t.slice(P.length).replace(/'/g, "\\'") + "'"), 'dans SIGNAUX : ' + t); }
  assert.ok(p.includes('VERIF_MS = 86400000'), 'VERIF_MS = 24 h, inchangé');
  assert.ok(/function muet\(code\) \{[^\n]*t - m\.muet >= VERIF_MS\) signaler\(code\)/.test(p), 'le seuil est VERIF_MS');
  assert.ok(p.includes('BOOT_MS = 60000') && p.includes('setTimeout(disparu, BOOT_MS)'));
  assert.ok(M.PONT.split('\n').length <= 501);
});

(async () => {
  console.log('▶ banc-n98' + (process.argv[2] ? ' · 17b = ' + process.argv[2] : ''));
  for (const [n, f] of TESTS) {
    try { await f(); pass++; console.log('  ✓ ' + n); }
    catch (e) { fail++; console.log('  ✗ ' + n + '\n     ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n     ')); }
  }
  console.log((fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
  process.exit(fail ? 1 : 0);
})();
