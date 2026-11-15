// banc-n107.js — [GO N° 107 · 16/11/2026] VERSION 20261116b · une faute de CODE dans le battement du pont n'est plus prise pour une coupure du réseau (registre n° 107, trouvé par go n° 98)
// Défaut (code, 17b d'avant) : cycle() rattrapait TOUTE exception par `catch (e) { echec({ st: 0, … }) }` — le traitement d'une coupure du réseau :
// pause, ligne « réseau « … » », ni début de panne (muet) ni signal. Une exception de CODE (17 qui rend une valeur inattendue, JSON.stringify qui lève,
// TextEncoder absent…) laissait donc le pont muet À VIE, sans rien dire à Sentry (les plantages rattrapés n'arrivent jamais aux écouteurs globaux).
// Remède (17b) : seul un rejet RÉSEAU de gh() (la requête elle-même rejetée, ou le délai dépassé) porte la marque `reseau` ; toute autre exception est
// une faute de code → tout de suite à Sentry par _auraSentry.avalee (warning, comme toute erreur avalée de l'app) avec une Error au message FIXE, son type
// et les seules lignes « at … » de sa pile (rien du message d'origine) ; début de panne (muet, motif « code ») → passé VERIF_MS (24 h, comme les autres
// motifs muets) un signal « AURA8 · Pont direct muet · faute de code … » (error) ; même pause qu'un échec ; la ligne d'Outils dit « faute de code ».
// Ce banc fait tourner le VRAI 17 + 17b dans la vm de banc-pont-direct (banc-fixtures/pont-monde.js : faux GitHub, horloge simulée), faux Sentry.
// Témoin : banc-fixtures/pont-avant-n107.js (17b de ccfd689) ; échoue sur lui : node banc-n107.js banc-fixtures/pont-avant-n107.js
// Usage : node banc-n107.js [<17b à tester>]   (argument : mutations, rejeu/mutations_n107.py)
'use strict';
const assert = require('assert'), path = require('path'), fs = require('fs');
const M = require('./banc-fixtures/pont-monde.js')({ pont: process.argv[2] });
const { monde, codeStrict, MIN, H, PAT_OK, DEPOT } = M;
const AVANT = path.join(__dirname, 'banc-fixtures', 'pont-avant-n107.js');
const J = 24 * H;
let pass = 0, fail = 0;
const TESTS = [];
function T(name, fn) { TESTS.push([name, fn]); }
const ligne = X => X.els.pontDirectEtat.textContent;
const P = 'AURA8 · Pont direct ';
const TCODE = P + 'muet · faute de code dans son battement depuis 24 h (pas une coupure du réseau)';
const MSG = 'AURA8 · Pont direct · faute de code dans le battement';
const sentry = X => X.run('window._auraSentry = { signal: function (t) { window.__sig = (window.__sig || []).concat([t]); }, avalee: function (e) { window.__av = (window.__av || []).concat([{ name: e && e.name, message: e && e.message, stack: e && e.stack, err: e instanceof Error, cles: e ? Object.keys(e) : null }]); } };');
const sig = X => JSON.parse(X.run('JSON.stringify(window.__sig || [])'));
const av = X => JSON.parse(X.run('JSON.stringify(window.__av || [])'));
const avec = o => { o = Object.assign({}, o); const src = o.src; delete o.src; const W = src ? require('./banc-fixtures/pont-monde.js')({ pont: src }) : M; const X = W.monde(o); sentry(X); return X; };   // src : le 17b à faire tourner (chemin)
const memo = X => JSON.parse(X.ls.get('aura_pont_mem') || '{}');
const etats = X => X.gh.journal.filter(r => r.m === 'PUT' && /\/etat\.json$/.test(r.url)).length;
// Les fautes : 17 (lecture de l'app) remplacé PAR UN AUTRE OBJET qui rend une valeur inattendue — le code de 17b, lui, est celui sous essai.
const avecLecture = (X, champs) => X.run('window.__L0 = window.__L0 || window._pontLecture; window._pontLecture = Object.assign({}, window.__L0, ' + champs + ');');
const fauteEtat = X => avecLecture(X, '{ etat: function () { return null; } }');   // entete(null) : TypeError dans envoyerEtat (etat.json ne part plus)
const fauteLire = X => avecLecture(X, '{ lire: function () { var o = { a: 1 }; o.moi = o; return Promise.resolve(o); } }');   // réponse circulaire : JSON.stringify lève dans traiter
const reparer = X => X.run('if (window.__L0) window._pontLecture = window.__L0;');
const cleSentry = a => a.message + '|' + String(a.stack || '').split('\n')[1];   // l'empreinte de 00s avalee : une seule par chargement si elle ne change pas

// ───────────── A · le cas n° 107 ─────────────
T('K1 · le cas n° 107 : 17 rend null à la lecture de l\'état → TypeError dans envoyerEtat à chaque battement ; aucun etat.json. Tout de suite : avalee (warning) d\'une Error au message FIXE, type TypeError, pile de 17b sans le message d\'origine ; début de panne ; la ligne dit « faute de code », pas « réseau ». Rien avant 24 h, puis UN signal « code » ; relance le même jour : rien ; le lendemain : un ; réparé → état écrit, panne effacée', async () => {
  const ls = new Map([['aura_pont_pat', PAT_OK]]);
  let X = avec({ lsMap: ls }); fauteEtat(X);
  await X.avancer(2 * MIN); const debut = memo(X).muet;
  const a = av(X); assert.ok(a.length >= 1, 'avalee appelée tout de suite');
  assert.ok(a.every(x => x.err && x.message === MSG && x.name === 'TypeError'), JSON.stringify(a[0]));
  const L = a[0].stack.split('\n'); assert.strictEqual(L[0], 'TypeError: ' + MSG); assert.ok(L.length >= 2 && L.slice(1).every(l => /^\s+at /.test(l)), a[0].stack);
  assert.ok(L.some(l => l.includes('js/17b-pont-direct.js:')), 'la pile montre la ligne de 17b'); assert.ok(!/Cannot|null|reading/.test(a[0].stack), 'rien du message d\'origine');
  assert.ok(!a[0].cles.includes('reseau'), 'aucune marque reseau'); assert.strictEqual(new Set(a.map(cleSentry)).size, 1, 'même empreinte à chaque battement : 00s n\'en envoie qu\'une par chargement');
  assert.ok(/faute de code : Cannot read properties of null/.test(X.st().err), X.st().err); assert.ok(ligne(X).includes('faute de code : ') && !/réseau/.test(ligne(X)), ligne(X));
  assert.ok(debut > 0, 'début de panne gardé'); assert.deepStrictEqual(sig(X), []); assert.strictEqual(etats(X), 0);
  await X.avancer(J - 5 * MIN); assert.deepStrictEqual(sig(X), [], 'pas avant 24 h'); assert.strictEqual(etats(X), 0);
  await X.avancer(15 * MIN); assert.deepStrictEqual(sig(X), [TCODE], 'une fois passé 24 h'); assert.ok(X.clock.t - debut >= J);
  await X.avancer(6 * H); assert.deepStrictEqual(sig(X), [TCODE], 'une seule fois par chargement');
  X = avec({ lsMap: ls, t0: X.clock.t + MIN }); fauteEtat(X); await X.avancer(30 * MIN); assert.deepStrictEqual(sig(X), [], 'même jour UTC, relancée : rien'); assert.ok(av(X).length >= 1, 'avalee à nouveau (un chargement neuf)');
  X = avec({ lsMap: ls, t0: X.clock.t + J }); fauteEtat(X); await X.avancer(2 * MIN); assert.deepStrictEqual(sig(X), [TCODE], 'le lendemain, toujours muet : un');
  reparer(X); await X.avancer(6 * MIN); assert.strictEqual(X.st().etat, 'actif'); assert.ok(etats(X) >= 1); assert.strictEqual(memo(X).muet, undefined, 'début de panne effacé au 1er etat.json');
  assert.strictEqual(JSON.parse(X.gh.texte('etat.json')).etatPont.err, X.st().err);
});
T('K2 · faute dans le service des demandes (réponse circulaire : JSON.stringify lève dans traiter) : avalee tout de suite ; etat.json continue de partir et DIT la faute (etatPont.err) → jamais « muet », aucun signal en 26 h de demandes qui lèvent ; la demande expire (refusée), le pont repart seul', async () => {
  const X = avec(); await X.activer(PAT_OK); assert.strictEqual(X.st().etat, 'actif'); fauteLire(X);
  let ids = [];
  for (let h = 0; h < 26 * 6; h++) { ids.push(X.demande(h, 'lire', { quoi: 'S', chemin: 'cycle' })); await X.avancer(10 * MIN); }
  const a = av(X); assert.ok(a.length >= 1 && a.every(x => x.message === MSG && x.name === 'TypeError'), JSON.stringify(a[0])); assert.ok(!/circular|Converting/i.test(a[0].stack), 'rien du message d\'origine');
  assert.ok(a[0].stack.split('\n').some(l => /js\/17b-pont-direct\.js:/.test(l)));
  const e = JSON.parse(X.gh.texte('etat.json')); assert.ok(/^faute de code : Converting circular structure/.test(e.etatPont.err), e.etatPont.err);
  assert.ok(etats(X) >= 26 * 10, 'etat.json toutes les 5 à 6 min : ' + etats(X)); assert.deepStrictEqual(sig(X), [], 'état écrit : pas muet, aucun signal');
  reparer(X); const id = X.demande(999, 'ping'); await X.avancer(30 * MIN);
  assert.ok(X.rep(id) && X.rep(id).ok, 'servie une fois réparé'); assert.strictEqual(X.st().etat, 'actif'); assert.strictEqual(X.st().suite, 0);
  const r0 = X.rep(ids[ids.length - 3]); assert.ok(r0 && r0.ok === false && /périmée/.test(r0.err), 'une demande qui levait (30 min avant la réparation) finit refusée, périmée : ' + JSON.stringify(r0));
});
T('K3 · réseau : requête rejetée (« Failed to fetch »), délai dépassé (requête pendue), corps illisible, puis retour — ni avalee, ni signal, ni début de panne par le réseau ; la ligne dit « réseau » ; IDENTIQUE au code d\'avant (requêtes, etat.json, ligne, mémoire, compteurs)', async () => {
  const jouer = async src => {
    const X = avec({ src }); await X.activer(PAT_OK); await X.avancer(10 * MIN);
    const L = [];
    X.gh.panne(() => 'reseau'); await X.avancer(2 * H); L.push(ligne(X)); X.gh.pannes.length = 0;
    const f = X.c.fetch; X.c.fetch = () => new Promise(() => {}); await X.avancer(H); L.push(ligne(X)); X.c.fetch = f;
    X.gh.panne(r => (r.m === 'GET' && /\/contents\/demandes$/.test(r.url)) ? { st: 200, corpsRate: true } : null); await X.avancer(30 * MIN); L.push(ligne(X)); X.gh.pannes.length = 0;
    await X.avancer(H); L.push(ligne(X));
    const s = X.st();
    return { X, L, req: X.gh.journal.map(r => r.m + ' ' + r.url + ' ' + (r.brut || '')), etat: X.gh.texte('etat.json'), mem: memo(X), cpt: [s.etat, s.echecs, s.suite, s.err, s.errAt, s.n, s.servis, s.refus] };
  };
  const n = await jouer(process.argv[2] || path.join(__dirname, 'js', '17b-pont-direct.js')), a = await jouer(AVANT);
  assert.deepStrictEqual(av(n.X), [], 'aucune avalee'); assert.deepStrictEqual(sig(n.X), []); assert.strictEqual(n.mem.muet, undefined);
  assert.ok(/réseau « Failed to fetch »/.test(n.L[0]) && /réseau « délai dépassé »/.test(n.L[1]), n.L.slice(0, 2).join(' | ')); assert.ok(!n.L.some(l => /faute de code/.test(l)));
  assert.strictEqual(n.req.length, a.req.length, 'nombre de requêtes'); assert.deepStrictEqual(n.req, a.req); assert.deepStrictEqual(n.L, a.L); assert.strictEqual(n.etat, a.etat); assert.deepStrictEqual(n.mem, a.mem); assert.deepStrictEqual(n.cpt, a.cpt);
});
T('K4 · toutes les formes de faute : TextEncoder absent (ReferenceError), une CHAÎNE levée qui porte un faux PAT, null levé, une Error au nom fantaisiste — chacune est une faute (jamais « réseau ») ; ce qui part à Sentry : le message FIXE, un type fait de lettres seulement, et rien d\'autre du texte levé', async () => {
  const FAUX = ['github', 'pat', ''].join('_') + 'Z'.repeat(30);
  const cas = [
    ['TextEncoder absent', X => X.run('delete window.TextEncoder;'), 'ReferenceError', true],
    ['chaîne levée', X => avecLecture(X, "{ etat: function () { return { t: Date.now(), get boum() { throw 'chaîne ' + " + JSON.stringify(FAUX) + "; } }; } }"), 'Error', false],
    ['null levé', X => avecLecture(X, '{ etat: function () { return { t: Date.now(), get boum() { throw null; } }; } }'), 'Error', false],
    ['nom fantaisiste', X => avecLecture(X, "{ etat: function () { return { t: Date.now(), get boum() { var e = new Error('x'); e.name = '<img src=x> ' + " + JSON.stringify(FAUX) + "; throw e; } }; } }"), 'Error', true]];
  for (const [nom, poser, type, pile] of cas) {
    const X = avec({ ls: { aura_pont_pat: PAT_OK } }); poser(X); await X.avancer(3 * MIN);
    const a = av(X); assert.ok(a.length >= 1, nom + ' : avalee'); assert.strictEqual(a[0].message, MSG, nom); assert.strictEqual(a[0].name, type, nom);
    const L = a[0].stack.split('\n'); assert.strictEqual(L[0], type + ': ' + MSG, nom); assert.ok(L.slice(1).every(l => /^\s+at /.test(l)), nom); assert.strictEqual(L.length > 1, pile, nom + ' : pile ' + a[0].stack);
    assert.ok(!JSON.stringify(a).includes('github_pat') && !JSON.stringify(a).includes('chaîne') && !JSON.stringify(a).includes('<img'), nom + ' : rien du texte levé');
    assert.ok(memo(X).muet > 0, nom + ' : début de panne'); assert.ok(/^faute de code : /.test(X.st().err) && !/réseau/.test(ligne(X)), nom + ' · ' + ligne(X)); assert.strictEqual(etats(X), 0, nom);
  }
});
T('K5 · « Couper le pont » au milieu d\'un battement qui lève ensuite : rien (ni avalee, ni début de panne, ni signal) — le pont est coupé, l\'état « coupé » reste', async () => {
  const X = avec({ ls: { aura_pont_pat: PAT_OK } }); avecLecture(X, '{ etat: function () { window.pontDirectCouper(); return null; } }');
  await X.avancer(3 * MIN);
  assert.deepStrictEqual(av(X), []); assert.deepStrictEqual(sig(X), []); assert.strictEqual(memo(X).muet, undefined); assert.strictEqual(X.st().etat, 'coupe'); assert.strictEqual(X.ls.get('aura_pont_pat'), undefined);
  assert.ok(/^coupé · le PAT est effacé/.test(ligne(X)), ligne(X));
});

// ───────────── B · témoins ─────────────
T('K6 · TÉMOIN, code d\'avant (ccfd689), la faute de K1 pendant 3 jours : ni avalee, ni signal, ni début de panne ; la ligne dit « réseau » — le silence du n° 107 (le banc voit la différence : sur le code sous essai, UN signal passé 24 h)', async () => {
  const X = avec({ src: AVANT, ls: { aura_pont_pat: PAT_OK } }); fauteEtat(X); await X.avancer(3 * J);
  assert.deepStrictEqual(av(X), []); assert.deepStrictEqual(sig(X), []); assert.strictEqual(memo(X).muet, undefined); assert.strictEqual(etats(X), 0);
  assert.ok(/réseau « Cannot read properties of null/.test(ligne(X)), ligne(X));
  const N = avec({ ls: { aura_pont_pat: PAT_OK } }); fauteEtat(N); await N.avancer(3 * J); assert.deepStrictEqual(sig(N), [TCODE]); assert.ok(av(N).length >= 1);
});
T('K7 · pont sain 3 jours (et une demande) : aucun avalee, aucun signal ; IDENTIQUE au code d\'avant (requêtes, etat.json, ligne, réponse, mémoire)', async () => {
  const jouer = async src => { const X = avec({ src }); await X.activer(PAT_OK); const id = X.demande(1, 'ping'); await X.avancer(3 * J);
    return { X, req: X.gh.journal.map(r => r.m + ' ' + r.url + ' ' + (r.brut || '')), ligne: ligne(X), etat: X.gh.texte('etat.json'), rep: X.rep(id), mem: memo(X) }; };
  const n = await jouer(process.argv[2] || path.join(__dirname, 'js', '17b-pont-direct.js')), a = await jouer(AVANT);
  assert.deepStrictEqual(av(n.X), []); assert.deepStrictEqual(sig(n.X), []);
  assert.strictEqual(n.req.length, a.req.length); assert.deepStrictEqual(n.req, a.req); assert.strictEqual(n.ligne, a.ligne); assert.strictEqual(n.etat, a.etat); assert.deepStrictEqual(n.rep, a.rep); assert.deepStrictEqual(n.mem, a.mem);
});
T('K8 · textes, constantes, garde : motif « code » FIXE (rien de GitHub, pas 4 chiffres, ≤ 200) ; message d\'avalee FIXE ; 24 h = VERIF_MS et la pause = celle d\'un échec (aucun chiffre nouveau) ; ≤ 500 lignes ; 17b ne change qu\'aux lignes du remède (et 3 lignes vides retirées)', () => {
  const p = codeStrict(M.PONT);
  assert.ok(!/\d{4}/.test(TCODE) && TCODE.length <= 200 && p.includes("code: '" + TCODE.slice(P.length) + "'"), 'dans SIGNAUX');
  assert.ok(!/\d{4}/.test(MSG) && p.includes("new Error('" + MSG + "')"));
  assert.ok(p.includes('VERIF_MS = 86400000') && /function muet\(code\) \{[^\n]*t - m\.muet >= VERIF_MS\) signaler\(code\)/.test(p));
  assert.ok(p.includes("st.pauseUntil = now() + Math.min(PAUSE_MAX, POLL_MS * Math.pow(2, Math.min(st.suite, 5))); }"), 'pause de faute = formule de echec');
  assert.ok(M.PONT.split('\n').length <= 501, '≤ 500 lignes');
  const A = fs.readFileSync(AVANT, 'utf8').split('\n'), N = M.PONT.split('\n');
  const seulA = A.filter(l => !N.includes(l)), seulN = N.filter(l => !A.includes(l));
  assert.deepStrictEqual(seulA.map(l => l.trim().slice(0, 40)), ["//     un backup — elle lit les accesseu", "controle: 'muet · contrôle du PAT non co", "var to = setTimeout(function () { to = n", "}).then(function (o) { fin(); oui(o); },", "} catch (e) { echec({ st: 0, j: { messag"], 'lignes d\'avant changées');
  assert.strictEqual(seulN.length, 8, 'lignes nouvelles : en-tête, SIGNAUX, commentaire, reseau + faute, avaler, délai, rejet de la requête, catch');
  assert.strictEqual(A.filter(l => l === '').length - N.filter(l => l === '').length, 3, '3 lignes vides retirées (≤ 500 lignes)');
});

(async () => {
  console.log('▶ banc-n107' + (process.argv[2] ? ' · 17b = ' + process.argv[2] : ''));
  for (const [n, f] of TESTS) {
    try { await f(); pass++; console.log('  ✓ ' + n); }
    catch (e) { fail++; console.log('  ✗ ' + n + '\n     ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n     ')); }
  }
  console.log((fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
  process.exit(fail ? 1 : 0);
})();
