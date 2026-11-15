// banc-pont-signal.js — [GO PONT · 14/11/2026] VERSION 20261114i · n° 97 : le pont ne se tait plus en silence
// Panne (prouvée le 14/11) : le PAT « aura-pont tablette » a expiré le 10/11 (mail GitHub du 10/11 20:12 UTC) ; le pont, suspendu
// (401, un essai par heure), ne le disait que sur une ligne d'Outils → 6 jours sans etat.json, et aucune session ne le savait.
// Remède : 17b signale à Sentry (00s signal, niveau error) le motif d'une suspension ou d'une coupure qui attend un geste de Rams — une
// fois par motif et par jour UTC (aura_pont_mem.sig), texte FIXE — et la ligne d'Outils dit le geste dès la panne. Une limite SECONDAIRE de
// GitHub (403 / 429 « rate limit » sans en-tête) est une attente, jamais un « accès perdu ». Le reste du pont ne change pas (banc-pont-direct).
// Relecture adverse du 14/11 : S2b, S3 (404 et 403 en route, signal avant le contrôle suivant), S5 (lignes sans geste, 429 nu), S5b (Couper
// pendant une requête), S8 (limite secondaire) ajoutés sur ses mutations survivantes.
// Ce banc fait tourner le VRAI 17 + 17b dans la vm de banc-pont-direct (banc-fixtures/pont-monde.js : faux GitHub, horloge simulée),
// avec un faux _auraSentry qui enregistre les signaux. Le vrai 00s signal est tenu par banc-sentry.js (G1–G2).
// Échoue sur le code d'avant : node banc-pont-signal.js /tmp/avant/js/17b-pont-direct.js
// Usage : node banc-pont-signal.js [<17b à tester>]   (argument : mutations, rejeu/mutations_pont_signal.py)
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const M = require('./banc-fixtures/pont-monde.js')({ pont: process.argv[2] });
const { monde, codeStrict, MIN, H, PAT_OK, PAT_LARGE, PAT_AUTRE, PAT_MORT } = M;
let pass = 0, fail = 0;
const TESTS = [];
function T(name, fn) { TESTS.push([name, fn]); }
const ligne = X => X.els.pontDirectEtat.textContent;
const T401 = 'AURA8 · Pont direct suspendu · PAT refusé par GitHub (401 : expiré ou révoqué)';
const TACC = 'AURA8 · Pont direct suspendu · le PAT ne voit plus aura-pont ou n\'y écrit plus (403 / 404)';
const TLARGE = 'AURA8 · Pont direct coupé · PAT trop large (il peut écrire dans le code), effacé';
const TPUB = 'AURA8 · Pont direct coupé · aura-pont public ou servi par Pages, PAT effacé';
const TCTRL = 'AURA8 · Pont direct muet · contrôle du PAT non concluant depuis 24 h, GitHub répond pourtant', TETAT = 'AURA8 · Pont direct muet · etat.json non écrit depuis 24 h, GitHub répond pourtant', TDISP = 'AURA8 · Pont direct coupé · le PAT a disparu de l\'appareil sans « Couper le pont »';   // go n° 98 (banc-n98.js)
const GESTE = '→ « Couper le pont », puis colle un nouveau PAT et Activer';
const JOUR = new Date(M.T0).toISOString().slice(0, 10);
// un faux Sentry : enregistre chaque appel de signal (le vrai 00s filtre et ne garde qu'un envoi par texte et par chargement)
const sentry = (X, mode) => X.run(mode === 'casse'
  ? 'window._auraSentry = { signal: function (t) { window.__sig = (window.__sig || []).concat([t]); throw new Error("Sentry cassé"); } };'
  : 'window._auraSentry = { signal: function (t) { window.__sig = (window.__sig || []).concat([t]); } };');
const sig = X => JSON.parse(X.run('JSON.stringify(window.__sig || [])'));
const avecSentry = (o) => { const X = monde(o); sentry(X); return X; };
const memo = X => JSON.parse(X.ls.get('aura_pont_mem') || '{}');
const SECONDAIRE = { message: 'You have exceeded a secondary rate limit. Please wait a few minutes before you try again.', documentation_url: 'https://docs.github.com/rest' };
// une requête retenue en vol (comme P32) : lache(fn) la laisse partir après fn()
const retenir = X => { const r = { lache: null }, f = X.c.fetch; X.c.fetch = (u, i) => new Promise(res => { r.lache = fn => { X.c.fetch = f; if (fn) fn(); res(f(u, i)); }; }); return r; };

// ───────────── A · le cas du 10/11 : PAT gardé, expiré ─────────────
T('S1 · PAT gardé EXPIRÉ au lancement (le 10/11) : 15 s → suspendu, UN signal 401 à texte fixe ; 3 h (un essai par heure) → toujours un ; la ligne d\'Outils dit le geste ; le PAT reste gardé ; relance le même jour UTC → rien de plus (mémoire du pont) ; le lendemain → un de plus', async () => {
  const ls = new Map([['aura_pont_pat', PAT_MORT]]);
  let X = avecSentry({ lsMap: ls });
  assert.deepStrictEqual(sig(X), []);
  await X.avancer(15000);
  assert.strictEqual(X.st().etat, 'suspendu'); assert.deepStrictEqual(sig(X), [T401]); assert.deepStrictEqual(memo(X).sig, { '401': JOUR });
  assert.ok(/^⏸ suspendu · PAT refusé par GitHub .*401.* → « Couper le pont », puis colle un nouveau PAT et Activer · nouvel essai \d\d:\d\d:\d\d$/.test(ligne(X)), ligne(X));
  const n0 = X.gh.journal.length; await X.avancer(3 * H);
  assert.strictEqual(X.gh.journal.length - n0, 3, 'un essai par heure (inchangé)'); assert.deepStrictEqual(sig(X), [T401], 'une fois');
  assert.strictEqual(ls.get('aura_pont_pat'), PAT_MORT, 'le PAT reste : Rams le remplace');
  X = avecSentry({ lsMap: ls, t0: M.T0 + 4 * H }); await X.avancer(15000); assert.strictEqual(X.st().etat, 'suspendu'); assert.deepStrictEqual(sig(X), [], 'même jour UTC, page relancée : rien');
  assert.ok(ligne(X).includes(GESTE), 'la ligne, elle, le dit toujours');
  X = avecSentry({ lsMap: ls, t0: M.T0 + 24 * H }); await X.avancer(15000); assert.deepStrictEqual(sig(X), [T401], 'le lendemain : un');
  assert.deepStrictEqual(memo(X).sig, { '401': new Date(M.T0 + 24 * H).toISOString().slice(0, 10) });
});
T('S2 · PAT révoqué EN ROUTE (actif, puis 401 au battement) : signal ET geste à la ligne tout de suite (pas une heure plus tard) ; il revient → actif, ligne sans geste ; il repart le même jour → rien de plus', async () => {
  const X = avecSentry(); await X.activer(PAT_OK); assert.strictEqual(X.st().etat, 'actif'); assert.deepStrictEqual(sig(X), []);
  const droits = X.gh.jetons[PAT_OK]; delete X.gh.jetons[PAT_OK];
  await X.avancer(15000); assert.strictEqual(X.st().etat, 'suspendu'); assert.deepStrictEqual(sig(X), [T401]); assert.ok(ligne(X).includes('GitHub 401') && ligne(X).includes(GESTE), ligne(X));
  await X.avancer(2 * H); assert.deepStrictEqual(sig(X), [T401]);
  X.gh.jetons[PAT_OK] = droits; await X.avancer(H + MIN); assert.strictEqual(X.st().etat, 'actif'); assert.ok(!ligne(X).includes(GESTE), ligne(X));
  delete X.gh.jetons[PAT_OK]; await X.avancer(2 * H); assert.strictEqual(X.st().etat, 'suspendu'); assert.deepStrictEqual(sig(X), [T401]);
});
T('S2b · deux motifs dans le même chargement : PAT passé en lecture seule (403 à l\'écriture) → « accès », puis révoqué (401) → « 401 » aussi', async () => {
  const X = avecSentry(); await X.activer(PAT_OK); X.gh.jetons[PAT_OK] = { pont: 'r', code: null };
  await X.jusqua(() => X.st().etat === 'suspendu', 5000, 200); assert.deepStrictEqual(sig(X), [TACC]);
  delete X.gh.jetons[PAT_OK]; await X.avancer(2 * H); assert.deepStrictEqual(sig(X), [TACC, T401]);
});
T('S3 · le PAT ne voit plus aura-pont, ou n\'y écrit plus : au lancement (404 partout) → un signal ; en route, 403 ou 404 à l\'écriture → signal ET geste DÈS l\'échec, avant le contrôle suivant', async () => {
  let X = avecSentry({ ls: { aura_pont_pat: PAT_AUTRE } }); await X.avancer(2 * H + MIN);
  assert.strictEqual(X.st().etat, 'suspendu'); assert.deepStrictEqual(sig(X), [TACC]); assert.ok(/ne voit pas aura-pont.* → « Couper le pont »/.test(ligne(X)), ligne(X));
  for (const droits of [{ pont: 'r', code: null }, { pont: null, code: null }]) {
    X = avecSentry(); await X.activer(PAT_OK); X.gh.jetons[PAT_OK] = droits;
    await X.jusqua(() => X.st().etat === 'suspendu', 2000, 400);
    const sondes0 = X.gh.journal.filter(r => r.url === M.DEPOT && r.m === 'GET').length;
    assert.deepStrictEqual(sig(X), [TACC], JSON.stringify(droits) + ' : signal dès l\'échec'); assert.ok(ligne(X).includes(GESTE) && /GitHub 40[34]/.test(ligne(X)), ligne(X));
    await X.avancer(H); assert.deepStrictEqual(sig(X), [TACC]); assert.ok(X.gh.journal.filter(r => r.url === M.DEPOT && r.m === 'GET').length > sondes0, 'le contrôle a bien été refait ensuite');
  }
});
T('S4 · coupé au lancement (PAT gardé devenu trop large ; aura-pont devenu public ou servi par Pages) : un signal « coupé » et le PAT effacé, comme avant', async () => {
  for (const [pat, opt, txt, pages] of [[PAT_LARGE, {}, TLARGE], [PAT_OK, { prive: false }, TPUB], [PAT_OK, {}, TPUB, true]]) {
    const X = avecSentry(Object.assign({ ls: { aura_pont_pat: pat } }, opt)); if (pages) X.gh.pages = true;
    await X.avancer(H); assert.strictEqual(X.st().etat, 'coupe'); assert.ok(!X.ls.has('aura_pont_pat')); assert.deepStrictEqual(sig(X), [txt]);
  }
});

// ───────────── B · rien quand il n'y a rien à faire ─────────────
T('S5 · AUCUN signal, AUCUN geste : pont sain 2 h ; réseau coupé ; GitHub en panne (500) ; limites dites (429, 403 + retry-after, au lancement et en route) ; 429 nu ; Rams qui colle lui-même un PAT refusé (il voit l\'écran) ; Couper', async () => {
  let X = avecSentry(); await X.activer(PAT_OK); await X.avancer(2 * H); assert.strictEqual(X.st().etat, 'actif'); assert.deepStrictEqual(sig(X), []); assert.ok(X.ls.get('aura_pont_mem') && !X.ls.get('aura_pont_mem').includes('"sig"'), 'sans signal, la mémoire du pont reste celle d\'avant (pas de champ sig)');
  X = avecSentry({ ls: { aura_pont_pat: PAT_OK } }); X.gh.panne(() => 'reseau'); await X.avancer(H); assert.deepStrictEqual(sig(X), []); assert.ok(X.gh.journal.length >= 3, 'le témoin a bien tenté');
  assert.ok(/^contrôle du PAT… · réseau/.test(ligne(X)) && !ligne(X).includes('Couper le pont'), 'réseau : aucun geste demandé · ' + ligne(X));
  const sansSig = X => assert.ok(X.ls.get('aura_pont_mem') && !X.ls.get('aura_pont_mem').includes('"sig"'), 'pas de champ sig sans signal · ' + X.ls.get('aura_pont_mem'));
  sansSig(X);
  X = avecSentry(); await X.activer(PAT_OK); X.gh.panne(() => 'reseau'); await X.avancer(20 * MIN);
  assert.strictEqual(X.st().etat, 'actif'); assert.ok(!ligne(X).includes('Couper le pont'), ligne(X)); assert.deepStrictEqual(sig(X), []);
  X = avecSentry({ ls: { aura_pont_pat: PAT_OK } }); X.gh.panne(() => ({ st: 500, j: { message: 'x' } })); await X.avancer(10 * MIN);
  assert.strictEqual(X.st().etat, 'suspendu'); assert.ok(/contrôle du dépôt du code non concluant|aura-pont ne répond pas/.test(ligne(X)) && !ligne(X).includes('Couper le pont'), ligne(X)); assert.deepStrictEqual(sig(X), []);
  for (const st of [429, 403]) {
    X = avecSentry({ ls: { aura_pont_pat: PAT_OK } }); X.gh.panne(() => ({ st, j: { message: 'rate limit' }, h: { 'retry-after': '120' } }));
    await X.avancer(30 * MIN); assert.deepStrictEqual(sig(X), [], 'limite ' + st); sansSig(X); assert.ok(!ligne(X).includes('Couper le pont'), 'limite ' + st + ' · ' + ligne(X));
    X = avecSentry(); await X.activer(PAT_OK); X.gh.panne(() => ({ st, j: { message: 'rate' }, h: { 'retry-after': '90' } }));
    await X.avancer(20 * MIN); assert.deepStrictEqual(sig(X), [], 'en route : ' + st + ' avec attente = limite'); assert.ok(!ligne(X).includes('Couper le pont'), ligne(X));
  }
  X = avecSentry({ ls: { aura_pont_pat: PAT_OK } }); X.gh.panne(() => ({ st: 429, j: { message: 'Too Many Requests' } })); await X.avancer(30 * MIN); assert.deepStrictEqual(sig(X), [], '429 nu');
  X = avecSentry(); await X.activer(PAT_OK); X.gh.panne(() => ({ st: 429, j: null })); await X.avancer(20 * MIN); assert.deepStrictEqual(sig(X), [], '429 nu en route'); assert.ok(!ligne(X).includes('Couper le pont'));
  for (const pat of [PAT_MORT, PAT_AUTRE, PAT_LARGE]) { X = avecSentry(); await X.activer(pat); await X.avancer(H); assert.strictEqual(X.st().etat, 'coupe'); assert.deepStrictEqual(sig(X), [], 'collé à la main'); }
  X = avecSentry(); await X.activer(PAT_OK); X.c.pontDirectCouper(); await X.avancer(H); assert.deepStrictEqual(sig(X), []);
});
T('S5b · « Couper » pendant une requête en vol qui revient en 401 : au contrôle du lancement (verdict) comme au relevé (echec) → aucun signal, état « coupé »', async () => {
  let X = avecSentry({ ls: { aura_pont_pat: PAT_OK } }); let r = retenir(X);
  await X.avancer(15000); assert.ok(r.lache, 'contrôle en vol'); X.c.pontDirectCouper(); r.lache(() => { delete X.gh.jetons[PAT_OK]; }); await X.avancer(H);
  assert.strictEqual(X.st().etat, 'coupe'); assert.deepStrictEqual(sig(X), []);
  X = avecSentry(); await X.activer(PAT_OK); r = retenir(X);
  await X.avancer(15000); assert.ok(r.lache, 'relevé en vol'); X.c.pontDirectCouper(); r.lache(() => { delete X.gh.jetons[PAT_OK]; }); await X.avancer(H);
  assert.strictEqual(X.st().etat, 'coupe'); assert.deepStrictEqual(sig(X), []);
  X = avecSentry(); await X.activer(PAT_OK); r = retenir(X);   // témoin : sans « Couper », le même 401 en vol signale
  await X.avancer(15000); r.lache(() => { delete X.gh.jetons[PAT_OK]; }); await X.avancer(MIN); assert.deepStrictEqual(sig(X), [T401]);
});
T('S6 · sans Sentry (00s absent ou inactif) ou Sentry qui lève : le pont fait EXACTEMENT la même chose (mêmes requêtes, même état, même ligne), aucune erreur ne sort', async () => {
  const jouer = async mode => {
    const X = monde({ ls: { aura_pont_pat: PAT_MORT } }); if (mode) sentry(X, mode);
    await X.avancer(3 * H);
    return { req: X.gh.journal.map(r => r.m + ' ' + r.url), etat: X.st().etat, ligne: ligne(X).replace(/\d\d:\d\d:\d\d/g, '•'), nErr: X.st().nErr, sig: sig(X) };
  };
  const a = await jouer(null), b = await jouer('ok'), c = await jouer('casse');
  assert.deepStrictEqual(a.req, b.req); assert.deepStrictEqual(a.req, c.req); assert.strictEqual(a.etat, 'suspendu'); assert.strictEqual(c.etat, 'suspendu');
  assert.strictEqual(a.ligne, b.ligne); assert.strictEqual(a.ligne, c.ligne); assert.strictEqual(c.nErr, 0);
  assert.deepStrictEqual(a.sig, []); assert.deepStrictEqual(b.sig, [T401]); assert.deepStrictEqual(c.sig, [T401], 'un seul essai même s\'il lève');
});
T('S7 · texte FIXE : un message GitHub hostile (balise, faux jeton, montant) n\'entre jamais dans le signal ; ni le PAT, ni un nombre de 4 chiffres ; 17b ne lit de Sentry que window._auraSentry et n\'en appelle que signal() — et, depuis go n° 107, avalee() pour une faute de CODE du battement (Error au message FIXE)', async () => {
  const X = avecSentry({ ls: { aura_pont_pat: PAT_OK } });
  X.gh.panne(() => ({ st: 401, j: { message: '<img src=x onerror=alert(1)> github_pat_' + 'Z'.repeat(40) + ' 1062.49 $' } }));
  await X.avancer(15000); assert.deepStrictEqual(sig(X), [T401]); assert.ok(ligne(X).includes('<img'), 'la ligne d\'Outils reste du texte (textContent)');
  for (const t of [T401, TACC, TLARGE, TPUB, TCTRL, TETAT, TDISP]) { assert.ok(!/\d{4}/.test(t) && !/github_pat_/.test(t) && t.startsWith('AURA8 · Pont direct ')); assert.ok(t.length <= 200); }
  const p = codeStrict(M.PONT);
  // [GO N° 107 · 16/11/2026] deux lectures de window._auraSentry : signaler (signal, un texte de SIGNAUX) et avaler (avalee, une faute de CODE : Error au message FIXE, type et lignes « at » de la pile seuls — banc-n107.js)
  assert.strictEqual((p.match(/window\._auraSentry/g) || []).length, 2, 'deux lectures de window._auraSentry (signaler, avaler)');
  assert.deepStrictEqual(p.match(/\bs\.(\w+)\(/g), ['s.signal(', 's.avalee('], 'méthodes appelées : signal, puis avalee (go n° 107)');
  assert.ok(p.includes("function avaler(e) { try { var s = window._auraSentry, x = new Error('AURA8 · Pont direct · faute de code dans le battement'),"), 'avalee ne reçoit qu\'une Error au message FIXE');
  assert.ok(!/captureMessage|captureException|showToast|_decErr/.test(p));
  assert.strictEqual((p.match(/signaler\(/g) || []).length, 6, 'définie une fois, appelée dans echec et verdict ; depuis go n° 98 aussi dans muet, disparu et le battement (PAT disparu en route) — banc-n98.js');
});
T('S8 · limite SECONDAIRE de GitHub (403 ou 429 « secondary rate limit », SANS en-tête d\'attente) : au lancement et en route, ni signal ni geste, le PAT gardé, le pont attend (1 min, puis le double) et repart SEUL', async () => {
  for (const st of [403, 429]) {
    let X = avecSentry({ ls: { aura_pont_pat: PAT_OK } }); const f = () => ({ st, j: SECONDAIRE }); X.gh.panne(f);
    await X.avancer(15000); assert.notStrictEqual(X.st().etat, 'actif'); assert.deepStrictEqual(sig(X), []); assert.ok(!ligne(X).includes('Couper le pont') && !/ne voit pas aura-pont/.test(ligne(X)), ligne(X));
    assert.ok(X.st().pauseUntil - X.clock.t >= 55000 && X.st().pauseUntil - X.clock.t <= 60000, 'une minute : ' + (X.st().pauseUntil - X.clock.t));
    const n = X.gh.journal.length; await X.avancer(50000); assert.strictEqual(X.gh.journal.length, n, 'rien avant la minute');
    await X.avancer(15000); assert.ok(X.st().pauseUntil - X.clock.t > 60000, 'puis le double');
    X.gh.pannes.length = 0; await X.avancer(10 * MIN); assert.strictEqual(X.st().etat, 'actif', 'repart seul'); assert.ok(X.ls.has('aura_pont_pat'));
    X = avecSentry(); await X.activer(PAT_OK); X.gh.panne(f); await X.avancer(10 * MIN);
    assert.deepStrictEqual(sig(X), [], 'en route ' + st); assert.ok(!ligne(X).includes('Couper le pont'), ligne(X)); assert.ok(X.ls.has('aura_pont_pat'));
    X.gh.pannes.length = 0; await X.avancer(40 * MIN); assert.strictEqual(X.st().etat, 'actif');
  }
  const X = monde(); X.gh.panne(() => ({ st: 403, j: SECONDAIRE })); await X.activer(PAT_OK);
  assert.ok(/GitHub demande d'attendre/.test(ligne(X)) && !ligne(X).includes('ne voit pas'), 'collé à la main : « attendre », pas « ne voit pas » · ' + ligne(X));
});

(async () => {
  console.log('▶ banc-pont-signal' + (process.argv[2] ? ' · 17b = ' + process.argv[2] : ''));
  for (const [n, f] of TESTS) {
    try { await f(); pass++; console.log('  ✓ ' + n); }
    catch (e) { fail++; console.log('  ✗ ' + n + '\n     ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n     ')); }
  }
  console.log((fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
  process.exit(fail ? 1 : 0);
})();
