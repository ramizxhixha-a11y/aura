// rejeu/pont_mutations.js — [PONT DIRECT · 11/10/2026] VERSION 20261011a · MUTATIONS du pont : chaque mutation (une erreur plausible, glissée
// dans une copie de js/17-pont-lecture.js, js/17b-pont-direct.js ou des rendus d'actualités de 04 / 05) doit faire ÉCHOUER banc-pont-direct.js.
// Une mutation qui survit = un comportement que le banc ne tient pas. Une ancre absente = le code a changé : mettre la mutation à jour.
//   node rejeu/pont_mutations.js            (≈ 4 s par mutation ; copies dans un dossier temporaire, le dépôt n'est jamais modifié)
//   node rejeu/pont_mutations.js --liste    (vérifie seulement que chaque ancre existe une fois)
// Les mutations de 04 / 05 passent par une copie du dépôt (le banc lit ces fichiers à leur place) : elles sont plus lentes.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const AURA = path.resolve(__dirname, '..'), F = { b: 'js/17b-pont-direct.js', l: 'js/17-pont-lecture.js', n4: 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', n5: 'js/05-v37-19-indicateur-de-fatigue-bot.js' };
const SRC = {}; for (const k in F) SRC[k] = fs.readFileSync(path.join(AURA, F[k]), 'utf8');
const MUT = [
  ["b","PAT classique accepté","var RE_PAT = /^github_pat_[A-Za-z0-9_]{20,243}$/;","var RE_PAT = /^gh[A-Za-z0-9_]{20,243}$/;"],
  ["b","sonde : 409 ne refuse plus","if (s.st === 409 || s.st === 422 || s.st === 200 || s.st === 201) return non('large'","if (s.st === 422 || s.st === 200 || s.st === 201) return non('large'"],
  ["b","sonde : 422 ne refuse plus","if (s.st === 409 || s.st === 422 || s.st === 200 || s.st === 201) return non('large'","if (s.st === 409 || s.st === 200 || s.st === 201) return non('large'"],
  ["b","sonde : 200 ne refuse plus","if (s.st === 409 || s.st === 422 || s.st === 200 || s.st === 201) return non('large'","if (s.st === 409 || s.st === 422 || s.st === 201) return non('large'"],
  ["b","sonde : tout 403 vaut accord","(s.st === 403 && !s.attente && /not accessible by personal access token/i.test((s.j && s.j.message) || ''))","(s.st === 403 && !s.attente)"],
  ["b","dépôt public accepté","if (r.j.private !== true) return non('public'","if (false) return non('public'"],
  ["b","nom du dépôt non vérifié","if (String(r.j.full_name || '').toLowerCase() !== NOM_DEPOT) return non('acces'","if (false) return non('acces'"],
  ["b","sonde vise un autre fichier","var SONDE = API + 'aura/contents/js/17b-pont-direct.js';","var SONDE = API + 'aura/contents/js/17-pont-lecture.js';"],
  ["b","sha de la sonde non nul","var SHA0 = '0000000000000000000000000000000000000000';","var SHA0 = 'c0de00000000000000000000000000000000c0de';"],
  ["b","PAT gardé avant les contrôles","    pat = brut;   // en mémoire seulement, le temps des contrôles\n","    pat = brut; lsSet(LS_PAT, brut);\n"],
  ["b","activation sans écriture réussie","      if (!bon(r)) { st.msg = '⛔ écriture refusée dans aura-pont (permission Contents : Read and write ?) · ' + ghMsg(r); laisse = !r.st; return; }\n",""],
  ["b","stockage refusé ignoré","      if (!lsSet(LS_PAT, brut)) { st.msg = '⛔ le stockage de l\\'appareil refuse l\\'écriture'; return; }\n","      lsSet(LS_PAT, brut);\n"],
  ["b","garde d'adresse retirée","    if (url !== DEPOT && url.indexOf(DEPOT + '/') !== 0 && url !== SONDE) return Promise.reject(new Error('adresse hors du pont'));\n",""],
  ["b","redirections suivies","redirect: 'error'","redirect: 'follow'"],
  ["b","cache du navigateur","cache: 'no-store', ",""],
  ["b","cookies envoyés","credentials: 'omit', ",""],
  ["b","le PAT dans un message de commit","var corps = { message: message, content: dejaB64 ? contenu : b64Texte(contenu) };","var corps = { message: message + pat, content: dejaB64 ? contenu : b64Texte(contenu) };"],
  ["b","le PAT dans l'état exposé","ok = true; st.verifAt = now(); st.suite = 0; st.pauseUntil = 0; st.etat = 'actif'; st.msg = '';","ok = true; st.verifAt = now(); st.suite = 0; st.pauseUntil = 0; st.etat = 'actif'; st.msg = ''; st.jeton = brut;"],
  ["b","contrôle quotidien retiré","var POLL_MS = 15000, ETAT_MS = 300000, BOOT_MS = 60000, VERIF_MS = 86400000;","var POLL_MS = 15000, ETAT_MS = 300000, BOOT_MS = 60000, VERIF_MS = 8640000000;"],
  ["b","PAT trop large gardé au lancement","if (v.code === 'large' || v.code === 'public' || v.code === 'format') { couper(","if (v.code === 'public' || v.code === 'format') { couper("],
  ["b","dépôt devenu public toléré","if (v.code === 'large' || v.code === 'public' || v.code === 'format') { couper(","if (v.code === 'large' || v.code === 'format') { couper("],
  ["b","PAT gardé difforme toléré","if (stocke) { if (RE_PAT.test(stocke)) {","if (stocke) { if (true) {"],
  ["b","couper laisse la minuterie","    if (iv) { clearInterval(iv); iv = null; }\n",""],
  ["b","couper laisse les écouteurs","    sourd(); etagDem = null; essais = {};","    etagDem = null; essais = {};"],
  ["b","requête après Couper","    if (!jeton) return Promise.reject(new Error('pont coupé'));\n","    if (!jeton) jeton = 'x';\n"],
  ["b","état « actif » après Couper","      if (!(await relever()) || !actif) return;","      if (!(await relever())) return;"],
  ["b","échec qui change l'état après Couper","    if (!actif) return;   // coupé entre-temps : l'état « coupé » reste\n",""],
  ["b","activation qui continue après Couper","      if (g !== gen) return;   // « Couper » pendant le contrôle : on s'arrête là\n",""],
  ["b","minuterie sans PAT","  try { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poser, { once: true }); else poser(); } catch (e) {}","  try { if (document.readyState === 'loading') setInterval(poser, 1500); else poser(); } catch (e) {}"],
  ["b","écouteurs sans PAT","  window._pontStatus = st;\n","  window._pontStatus = st; ecouter();\n"],
  ["b","commande hors liste non refusée","if (typeof d.cmd !== 'string' || CMDS.indexOf(d.cmd) < 0) return 'commande inconnue (liste fermée : ' + CMDS.join(', ') + ')';","if (typeof d.cmd !== 'string') return 'commande inconnue (liste fermée : ' + CMDS.join(', ') + ')';"],
  ["b","id non comparé au nom","    if (d.id !== id) return 'demande : id différent du nom du fichier';\n",""],
  ["b","péremption retirée","    if (age > ttl) return 'demande périmée","    if (false) return 'demande périmée"],
  ["b","futur accepté","    if (age < -FUTUR_MS) return 'demande datée du futur","    if (false) return 'demande datée du futur"],
  ["b","ttl sans plafond","var ttl = Math.min(TTL_MAX_S, Math.max(1, Number(d.ttl) || TTL_S)) * 1000","var ttl = Math.max(1, Number(d.ttl) || TTL_S) * 1000"],
  ["b","args non objet acceptés","    if (d.args !== undefined && (d.args === null || typeof d.args !== 'object' || Array.isArray(d.args))) return 'demande : args doit être un objet';\n",""],
  ["b","nom de fichier libre","var RE_NOM = /^(\\d{8}-\\d{6}-[a-z0-9]{4,12})\\.json$/;","var RE_NOM = /^(.+)\\.json$/;"],
  ["b","dossiers pris pour des demandes","var m = (e && e.type === 'file' && typeof e.name === 'string') ? RE_NOM.exec(e.name) : null;","var m = (e && typeof e.name === 'string') ? RE_NOM.exec(e.name) : null;"],
  ["b","demande resservie (mémoire non tenue)","function fini(id) { var m = memoire(); if (m.fait.indexOf(id) < 0) {","function fini(id) { var m = memoire(); if (false) {"],
  ["b","mémoire non sauvée","delete essais[id]; memSauve(); }","delete essais[id]; }"],
  ["b","essais sans fin","PAR_RELEVE = 3, ESSAIS = 3, FAIT_MAX = 100;","PAR_RELEVE = 3, ESSAIS = 300, FAIT_MAX = 100;"],
  ["b","plus de 3 demandes par relevé","PAR_RELEVE = 3, ESSAIS = 3, FAIT_MAX = 100;","PAR_RELEVE = 30, ESSAIS = 3, FAIT_MAX = 100;"],
  ["b","ETag jamais envoyé","var r = await gh(pat, 'GET', DEPOT + '/contents/demandes', undefined, etagDem, T_GET);","var r = await gh(pat, 'GET', DEPOT + '/contents/demandes', undefined, null, T_GET);"],
  ["b","backup d'un état non prêt","if (typeof bs !== 'function' || window._stateReady !== true) return { _err: 'état non prêt' };","if (typeof bs !== 'function') return { _err: 'état non prêt' };"],
  ["b","snapshot nul envoyé","var snap = bs(); if (!snap) return { _err: 'état non prêt' };","var snap = bs() || { cycle: 0 };"],
  ["b","enveloppe : type","_type: 'aura_guardian_full', version: 'aura-embed-1'","_type: 'aura_pont', version: 'aura-embed-1'"],
  ["b","enveloppe : guardian","aura: snap, guardian: null }));","aura: snap }));"],
  ["b","backup : nom sans date","nom = 'aura_guardian_full_' + horodate(t) +","nom = 'aura_guardian_full_' + t +"],
  ["b","état trop fréquent","ETAT_MS = 300000, BOOT_MS = 60000,","ETAT_MS = 30000, BOOT_MS = 60000,"],
  ["b","état à chaque relance","ETAT_MS = 300000, BOOT_MS = 60000,","ETAT_MS = 300000, BOOT_MS = 0,"],
  ["b","pause qui ne double pas","else p = Math.min(PAUSE_MAX, POLL_MS * Math.pow(2, Math.min(st.suite, 5)));\n    st.pauseUntil","else p = POLL_MS;\n    st.pauseUntil"],
  ["b","401 : contrôle non refait","if (r && r.st === 401) { st.etat = 'suspendu'; st.verifAt = 0; p = PAUSE_LONGUE; }","if (r && r.st === 401) { st.etat = 'suspendu'; p = PAUSE_LONGUE; }"],
  ["b","accès perdu : contrôle non refait","else if (r && (r.st === 403 || r.st === 404)) { st.etat = 'suspendu'; st.verifAt = 0; p = PAUSE_MAX; }","else if (r && (r.st === 403 || r.st === 404)) { st.etat = 'suspendu'; p = PAUSE_MAX; }"],
  ["b","retry-after ignoré","if (ra > 0) out.attente = ra * 1000; else if","if (false) out.attente = ra * 1000; else if"],
  ["b","quota à zéro ignoré","else if (rem === '0' && rst > 0) out.attente = Math.max(1000, rst * 1000 - now());",""],
  ["b","cycles qui se chevauchent","    if (busy || !actif || !pat) return;\n    var t = now();","    if (!actif || !pat) return;\n    var t = now();"],
  ["b","message de GitHub en HTML","      e.textContent = t;","      e.innerHTML = t;"],
  ["b","erreurs sans plafond","    if (errs.length > 30) errs.splice(0, errs.length - 30);\n",""],
  ["b","appel de showToast","      st.suite = 0; st.etat = 'actif'; st.msg = '';\n    } catch (e) {","      st.suite = 0; st.etat = 'actif'; st.msg = ''; if (typeof showToast === 'function') showToast('pont actif', 1000, 'info');\n    } catch (e) {"],
  ["b","hasard","function now() { return Date.now(); }","function now() { return Date.now() + Math.floor(Math.random() * 0); }"],
  ["l","accesseur appelé","    return ('value' in d) ? d.value : ACC;","    return ('value' in d) ? d.value : d.get.call(o);"],
  ["l","secret non masqué dans la copie","    if (nom && RE_SECRET.test(nom)) return v === '' ? '' : '[masqué]';\n",""],
  ["l","chemin vers un secret permis","      if (RE_SECRET.test(k)) return { err: 'chemin masqué : ' + txt(k, 40) };\n",""],
  ["l","objets interdits ouverts (copie)","    if (interdit(v)) return '[interdit]';\n",""],
  ["l","localStorage non interdit","      if (typeof localStorage !== 'undefined' && v === localStorage) return true;\n",""],
  ["l","window non interdit","      if (v === window || v === document) return true;\n","      if (v === document) return true;\n"],
  ["l","sources : chaîne de prototypes","(typeof q === 'string' && Object.prototype.hasOwnProperty.call(SOURCES, q)) ? SOURCES[q] : null","(typeof q === 'string' && q in SOURCES) ? SOURCES[q] : null"],
  ["l","chemin : chaîne de prototypes","      if (!Object.prototype.hasOwnProperty.call(cur, k)) {","      if (!(k in cur)) {"],
  ["l","tableau sans plafond","tab: Math.max(1, Math.min(500, (lim && lim.n) || 30))","tab: Math.max(1, Math.min(5000, (lim && lim.n) || 30))"],
  ["l","texte sans plafond","if (t === 'string') return v.length > 2000 ?","if (t === 'string') return v.length > 200000 ?"],
  ["l","clés sans plafond","var m = Math.min(cles.length, 400); out = {};","var m = cles.length; out = {};"],
  ["l","cycle non détecté","    if (ctx.vus.indexOf(v) >= 0) return '[cycle]';\n","    if (ctx.vus.length > 40) return '[cycle]';\n"],
  ["l","chemin trop long accepté","if (!Array.isArray(ch) || ch.length > 16) return","if (!Array.isArray(ch)) return"],
  ["l","lecture d'une autre clé de localStorage","localStorage.getItem('aura_throttle_log')","localStorage.getItem('aura_news_key')"],
  ["l","état : Math.random","    var t = Date.now(), S0 = liveS(), RT0 = SOURCES.RT();","    var t = Date.now() + 0 * Math.random(), S0 = liveS(), RT0 = SOURCES.RT();"],
  // ── 17b : contrôle du PAT (version relue) ──
  ['b', 'contrôle non concluant vaut accord', "    return non(s.attente ? 'limite' : 'reseau', 'contrôle du dépôt du code non concluant · ' + ghMsg(s) + (temoin ? '' : ' · fichier-témoin non lu (' + ghMsg(e) + ')'), s.attente);", "    return { ok: true };"],
  ['b', 'aura-pont sans champ « private » accepté', "if (r.j.private !== true) return", "if (r.j.private === false) return"],
  ['b', 'GitHub Pages accepté', "    if (r.j.has_pages === true) return non(", "    if (false) return non("],
  ['b', '404 accepté sans fichier-témoin lu', "    if (s.st === 404 && temoin) return { ok: true };", "    if (s.st === 404) return { ok: true };"],
  ['b', 'fichier-témoin tenu pour lu', "temoin = e.st === 200 && !!e.j && e.j.type === 'file';", "temoin = true;"],
  ['b', 'requêtes du contrôle après Couper (1)', "    if (pat !== jeton) return non('coupe', 'pont coupé');   // « Couper » pendant le contrôle : les requêtes suivantes ne partent pas\n", ""],
  ['b', 'requêtes du contrôle après Couper (2)', "    if (pat !== jeton) return non('coupe', 'pont coupé');\n    if (!place(1))", "    if (!place(1))"],
  ['b', 'écriture de contrôle non comptée', "    await ecart(); compter();   // une écriture, même refusée", "    await ecart();   // une écriture, même refusée"],
  ['b', 'pas de contrôle au lancement ni chaque jour', "if (!st.verifAt || t - st.verifAt >= VERIF_MS || t < st.verifAt) {", "if (false) {"],
  ['b', 'PAT gardé si Couper pendant l\'écriture de l\'activation', "      if (g !== gen) return;   // « Couper » pendant l'écriture : le PAT n'est pas gardé\n", ""],
  // ── 17b : dernier filet ──
  ['b', 'dernier filet : PAT', "    if (pat && t.indexOf(pat) >= 0) t = t.split(pat).join('[PAT masqué]');\n", ""],
  ['b', 'dernier filet : valeurs des secrets de S', "    for (var i = 0; i < L.length; i++) if (t.indexOf(L[i]) >= 0) t = t.split(L[i]).join('[masqué]');\n", ""],
  ['b', 'dernier filet : formes de jetons', "    return t.replace(RE_JETON, '$1[masqué]').replace(RE_TG, 'bot[masqué]');", "    return t;"],
  ['b', 'dernier filet : Telegram', ".replace(RE_TG, 'bot[masqué]');", ";"],
  ['b', 'etat.json hors du dernier filet', "var o = construireEtat(), texte = propre(JSON.stringify(o)),", "var o = construireEtat(), texte = JSON.stringify(o),"],
  // ── 17b : champ, coupure, onglets ──
  ['b', 'champ jamais vidé après succès', "else c.value = ''; }", "else if (!ok) c.value = ''; }"],
  ['b', 'champ : PAT gardé indéfiniment', "}, CHAMP_MS); else", "}, CHAMP_MS * 1e6); else"],
  ['b', 'Couper garde le PAT', "gen++; actif = false; pat = null; if (!sansEffacer) lsDel(LS_PAT);", "gen++; actif = false; pat = null;"],
  ['b', 'coupure d\'un autre onglet ignorée', "if (s !== undefined && s !== pat) {", "if (false) {"],
  ['b', 'autre onglet : le nouveau PAT effacé', "'coupé depuis un autre onglet', true);", "'coupé depuis un autre onglet');"],
  ['b', 'mémoire non relue (deux onglets)', "    memoire(true);\n", ""],
  ['b', 'mémoire relue même après une sauvegarde ratée', "if (mem && (!relire || !memOk)) return mem;", "if (mem && !relire) return mem;"],
  ['b', 'marqueur de 00 non remis', "if (op && op !== avant && op.name === marque) window._auraLastOp = avant;", ""],
  // ── 17b : file des demandes ──
  ['b', 'demandes hors fenêtre lues', "      else if (age <= FENETRE_MS) noms.push(e.name);", "      else noms.push(e.name);"],
  ['b', 'demandes du futur sans relecture de la liste', "      if (age < -FUTUR_MS) futur = true;", "      if (false) futur = true;"],
  ['b', 'taille de demande non bornée (liste)', "if (!m || !(Number(e.size) <= DEM_MAX) ||", "if (!m ||"],
  ['b', 'taille de demande non bornée (contenu)', "if (brut.length > DEM_MAX) pourquoi = 'demande trop longue'; else d = JSON.parse(brut);", "d = JSON.parse(brut);"],
  ['b', 'réponse existante non reconnue', "if (bon(w) || dejaLa(w)) {", "if (bon(w)) {"],
  ['b', 'tout 422 pris pour « existe déjà »', "function dejaLa(w) { return w.st === 422 && /sha/i.test((w.j && w.j.message) || ''); }", "function dejaLa(w) { return w.st === 422; }"],
  ['b', 'réponse sans plafond', "      if (texte.length > REP_MAX) { ok = false;", "      if (false) { ok = false;"],
  ['b', 'ordre : plus anciennes d\'abord', "    noms.sort().reverse();", "    noms.sort();"],
  ['b', 'ETag gardé alors qu\'il reste des demandes', "etagDem = (ok && reste === 0 && !futur) ? r.etag : null;", "etagDem = r.etag;"],
  ['b', 'ETag gardé avec une demande datée du futur', "etagDem = (ok && reste === 0 && !futur) ? r.etag : null;", "etagDem = (ok && reste === 0) ? r.etag : null;"],
  ['b', 'entrée empoisonnée jamais écartée', "{ ecartes[id] = 1; delete essais[id]; return true; }", "{ delete essais[id]; return false; }"],
  ['b', 'réponse rebâtie (commande réexécutée) à chaque essai', "    if (garde && garde.id === id) {", "    if (false) {"],
  ['b', 'quota : demande lue sans place', "    if (!place(1, RESERVE)) { incident(plein().j.message); return false; }   // plus de place pour les demandes", "    // plus de place pour les demandes"],
  ['b', 'backup sans ses deux places', "else if (cmd === 'backup' && !place(2, RESERVE)) {", "else if (cmd === 'backup' && false) {"],
  ['b', 'mémoire des demandes sans borne', "if (m.fait.length > FAIT_MAX) m.fait.splice(0, m.fait.length - FAIT_MAX);", ""],
  // ── 17b : débit, battement ──
  ['b', 'quota d\'écritures retiré', "var ECRITS_H = 60, RESERVE = 12,", "var ECRITS_H = 6000, RESERVE = 12,"],
  ['b', 'pas de réserve pour etat.json', "var ECRITS_H = 60, RESERVE = 12,", "var ECRITS_H = 60, RESERVE = 0,"],
  ['b', 'écart entre écritures retiré', "ECART_MS = 2000,", "ECART_MS = 0,"],
  ['b', 'backup sans intervalle', "BACKUP_MS = 120000,", "BACKUP_MS = 0,"],
  ['b', 'délai du backup compté avant l\'écriture', "    var snap = bs(); if (!snap) return { _err: 'état non prêt' };", "    m.backupAt = now(); memSauve(); var snap = bs(); if (!snap) return { _err: 'état non prêt' };"],
  ['b', 'heure du dernier état non gardée', "etatDu = st.etatAt + ETAT_MS; m.etatAt = st.etatAt; memSauve();", "etatDu = st.etatAt + ETAT_MS; memSauve();"],
  ['b', 'pause sans plafond', "PAUSE_MAX = 300000,", "PAUSE_MAX = 30000000,"],
  ['b', '401 : essais rapprochés', "PAUSE_LONGUE = 3600000,", "PAUSE_LONGUE = 60000,"],
  ['b', 'hors ligne ignoré', "if (t < st.pauseUntil || !enLigne()) { peindre(); return; }", "if (t < st.pauseUntil) { peindre(); return; }"],
  ['b', 'pause ignorée', "if (t < st.pauseUntil || !enLigne()) { peindre(); return; }", "if (!enLigne()) { peindre(); return; }"],
  ['b', 'délai d\'abandon retiré', "rate(new Error('délai dépassé')); }, delai || T_GET);", "rate(new Error('délai dépassé')); }, 1e9);"],
  ['b', 'compression sans délai', "var to = setTimeout(function () { ok(null); }, T_GZIP)", "var to = setTimeout(function () { ok(null); }, 1e9)"],
  ['b', 'sha de etat.json non relu', "    if (r.st === 409 || r.st === 422 || (r.st === 404 && m.sha)) {", "    if (false) {"],
  ['b', 'etat.json retiré du dépôt : non relu', "    if (r.st === 409 || r.st === 422 || (r.st === 404 && m.sha)) {", "    if (r.st === 409 || r.st === 422) {"],
  ['b', 'sha de etat.json non gardé', "sha: (typeof m.sha === 'string' && /^[0-9a-f]{40}$/.test(m.sha)) ? m.sha : null, backupAt", "sha: null, backupAt"],
  ['b', 'échec de etat.json : les demandes attendent', "if (!r.plein && r.st !== 409 && r.st !== 422) { echec(r); return; }", "{ echec(r); return; }"],
  ['b', 'état écrit dans S', "  function construireEtat() {   // une lecture", "  function construireEtat() { try { S._pontVu = Date.now(); } catch (e) {}   // une lecture"],
  // ── 17 : la lecture (version relue) ──
  ['l', 'secrets : token', "|secret|token|jeton|", "|secret|jeton|"],
  ['l', 'secrets : apiKey', "/(api_?key|secret|", "/(secret|"],
  ['l', 'secrets : jeton', "|token|jeton|passw|", "|token|passw|"],
  ['l', 'secrets : casse', "|webhook|cookie|jwt)/i;", "|webhook|cookie|jwt)/;"],
  ['l', 'secrets : pwd, credential, bearer', "|pwd|passphrase|mnemonic|credential|authorization|bearer|", "|passphrase|mnemonic|authorization|"],
  ['l', 'secrets : clés privées, d\'accès, webhook', "|private_?key|access_?key|webhook|", "|"],
  ['l', 'secrets : valeurs courtes données au filet', "if (v.length >= 12 && RE_SECRET.test(ks[i])", "if (v.length >= 1 && RE_SECRET.test(ks[i])"],
  ['l', 'secrets : valeurs non données au filet', "    if (S0) voir(S0, 1);\n", ""],
  ['l', 'objets qui ne s\'ouvrent pas traversés (chemin)', "interdit(cur) || !ouvrable(cur)) return", "interdit(cur)) return"],
  ['l', 'objets interdits traversés (chemin)', "typeof cur !== 'object' || interdit(cur) ||", "typeof cur !== 'object' ||"],
  ['l', 'profondeur sans plafond', "Math.max(0, Math.min(8, args.prof | 0))", "Math.max(0, Math.min(80, args.prof | 0))"],
  ['l', 'valeurs sans plafond', "NOEUDS_MAX = 40000;", "NOEUDS_MAX = 6e9;"],
  ['l', 'seuls les objets comptent', "    if (++ctx.n > ctx.max) return '[tronqué]';   // chaque valeur compte\n", "    if (typeof v === 'object' && ++ctx.n > ctx.max) return '[tronqué]';\n"],
  ['l', 'étiquette au lieu du prototype', "var p = Object.getPrototypeOf(v); return (p === Object.prototype || p === null) ? 2 : 0;", "return Object.prototype.toString.call(v) === '[object Object]' ? 2 : 0;"],
  ['l', 'clé « __proto__ » par affectation', "for (i = 0; i < m; i++) Object.defineProperty(out, cles[i], { value: cp(champ(v, cles[i]), prof - 1, ctx, cles[i]), enumerable: true, writable: true, configurable: true });", "for (i = 0; i < m; i++) out[cles[i]] = cp(champ(v, cles[i]), prof - 1, ctx, cles[i]);"],
  ['l', 'txt appelle toString', "function txt(x, n) { var t = typeof x; return (t === 'string' ? x : ((t === 'number' || t === 'boolean') ? String(x) : '')).slice(0, n || 200); }", "function txt(x, n) { return String(x === null || x === undefined ? '' : x).slice(0, n || 200); }"],
  ['l', 'num appelle valueOf', "function num(x, d) { if (typeof x !== 'number' || !isFinite(x)) return null;", "function num(x, d) { x = Number(x); if (!isFinite(x)) return null;"],
  ['l', 'accesseur appelé (lu)', "var v = val(o, k); return v === ACC ? undefined : v; }", "return o[k]; }"],
  ['l', 'rubrique en échec : tout l\'état tombe', "function sur(o, k, f) { try { var v = f(); if (v !== undefined) o[k] = v; } catch (e) { o[k] = { _err: txt(e && e.message, 120) }; } }", "function sur(o, k, f) { var v = f(); if (v !== undefined) o[k] = v; }"],
  ['l', 'estimation du stockage sans borne', "var q = await borne(navigator.storage.estimate(), 3000);", "var q = await navigator.storage.estimate();"],
  ['l', 'mode à l\'écran : bascule ignorée', "    if (lu(window, '_bgResolve') === true && MODES.indexOf(f) >= 0) return f;\n", ""],
  ['l', 'portefeuille créé s\'il manque', "    return (w && typeof w === 'object') ? w : null;", "    if (!w && ws) { ws[mode] = {}; w = ws[mode]; } return (w && typeof w === 'object') ? w : null;"],
  ['l', 'positions sans plafond', "for (var i = Math.max(0, pos.length - 40); i < pos.length; i++) {", "for (var i = 0; i < pos.length; i++) {"],
  ['l', 'source de plus (localStorage)', "    pont: function () { return lu(window, '_pontStatus') || null; }\n", "    pont: function () { return lu(window, '_pontStatus') || null; },\n    stock: function () { return { pat: localStorage.getItem('aura_pont_pat') }; }\n"],
  // ── 04 / 05 : actualités ──
  ['n4', 'titre d\'actualité non échappé (04)', "${_escN(String(a.title || '').slice(0,80))}", "${String(a.title || '').slice(0,80)}"],
  ['n4', 'source d\'actualité non échappée (04)', "<span>${_escN(a.source)}</span>", "<span>${a.source}</span>"],
  ['n5', 'titre d\'actualité non échappé (05)', "${String(a.title == null ? '' : a.title).replace(/[&<>\"']/g, c => '&#' + c.charCodeAt(0) + ';')}", "${String(a.title == null ? '' : a.title)}"],
];
const LISTE = process.argv.includes('--liste'), TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pont-mut-'));
let tues = 0; const vivants = [], absents = [];
let copie = null;   // copie du dépôt pour les mutations de 04 / 05
function depot() {
  if (copie) return copie;
  copie = path.join(TMP, 'depot'); fs.mkdirSync(copie);
  for (const f of fs.readdirSync(AURA)) if (!/^(\.git|node_modules|rejeu)$/.test(f)) cp.execFileSync('cp', ['-r', path.join(AURA, f), copie]);
  return copie;
}
const SEUL = process.env.MUT_SEUL ? new RegExp(process.env.MUT_SEUL) : null;   // MUT_SEUL='backup' : ces mutations seulement (mise au point)
MUT.forEach(([f, nom, de, a], i) => {
  if (SEUL && !SEUL.test(nom)) return;
  const src = SRC[f], n = src.split(de).length - 1; if (n !== 1) { absents.push(nom + ' (' + n + ' occurrence(s))'); return; }
  if (LISTE) return;
  let r;
  if (f === 'b' || f === 'l') {
    const tb = path.join(TMP, 'm17b.js'), tl = path.join(TMP, 'm17.js');
    fs.writeFileSync(tb, f === 'b' ? src.replace(de, () => a) : SRC.b); fs.writeFileSync(tl, f === 'l' ? src.replace(de, () => a) : SRC.l);
    r = cp.spawnSync(process.execPath, ['banc-pont-direct.js', tb, tl], { cwd: AURA, encoding: 'utf8', timeout: 240000 });
  } else {
    const d = depot(); fs.writeFileSync(path.join(d, F[f]), src.replace(de, () => a));
    r = cp.spawnSync(process.execPath, ['banc-pont-direct.js'], { cwd: d, encoding: 'utf8', timeout: 240000, env: Object.assign({}, process.env, { PONT_SEUL: '^P40 ' }) });
    fs.writeFileSync(path.join(d, F[f]), src);
  }
  const out = (r.stdout || '') + (r.stderr || ''), ko = out.split('\n').filter(l => /^  ✗/.test(l)).map(l => l.slice(4, 8).trim());
  if (r.status !== 0) { tues++; console.log('  ☠ ' + String(i + 1).padStart(3) + ' · ' + nom + '  ← ' + (ko.join(' ') || (r.status === null ? 'délai dépassé' : 'erreur de chargement'))); }
  else { vivants.push(nom); console.log('  ⚠ ' + String(i + 1).padStart(3) + ' · ' + nom + '  ← SURVIT'); }
});
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
if (LISTE) console.log((MUT.length - absents.length) + ' / ' + MUT.length + ' ancres trouvées' + (absents.length ? ' · ABSENTES : ' + absents.join(' ; ') : ''));
else console.log('\n' + tues + ' / ' + (MUT.length - absents.length) + ' mutations tuées' + (vivants.length ? ' · SURVIVANTES : ' + vivants.join(' ; ') : '') + (absents.length ? ' · ANCRES ABSENTES : ' + absents.join(' ; ') : ''));
process.exit(vivants.length || absents.length ? 1 : 0);
