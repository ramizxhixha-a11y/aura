// [GEL BOOT · 12/09/2026] VERSION 20260912b · probeGel : un bloqueur dans 00-backup-state.js appelé par un timer / rAF / then / onmessage est l'ENVELOPPE chrono _wrapFn (@6882), pas le code → jointure avec S.perfLog.lent (ligne ⏱ LENT ≤ 5 s = fichier:ligne du vrai appelant) ; frames ≤ 60 s après un boot étiquetées « au boot (+N s) » (chargement de l'état, coût attendu) — capture Rams 12/09 18:37 : deux « bloqueurs » (enveloppe 18:12, loadState 17:34), aucun script applicatif nommé
// [GEL BOOT · 12/09/2026] VERSION 20260912a · probeGel : frames LoAF séparées « depuis ce boot » / « antérieures » (S.perfLog.boots) ; bloqueur = script le PLUS LONG de la frame, nommé seulement s'il occupe ≥ 50 % de la frame, sinon « sans bloqueur JS » (rendu / GC / throttle Android) — corrige l'accusation à tort de 00-backup-state.js (11 ms de JS dans une frame de 1.3 s, 12/09) et l'affichage des frames d'avant le correctif c
// [GEL BOOT · 11/09/2026] VERSION 20260911b · probeGel affiche l'anneau S.perfLog.loaf (frames ≥ 1 s nommées par le navigateur, indépendantes des gels)
// [GEL BOOT · 11/09/2026] VERSION 20260911a · plus aucun travail de code au boot ni en scan silencieux (sonde Fichiers sans réseau via performance.getEntriesByType('resource')) · code = ouverture du bouclier / Relancer uniquement · probeGel lit S.perfLog.gels (durable, 30 gels, nom d'op complet, attribution LoAF) · sonde Mémoire (pente Mo/h)
// [GEL 09/09/2026] VERSION 20260909a · sondes de code une fois par session (plus 49 fetchs no-store toutes les 2 min), fichier par fichier avec respiration, _perfOp('guardianScan') · sondes Fonctions/Variables/Doublons ressuscitées (muettes depuis les tokens ?v=)
// [PONT CLAUDE v2] source du snapshot tracee dans le fichier (live/idb/ls-light + date interne) + garde anti-perime : alerte si l etat de CE navigateur est vieux/ancien/absent (evite d exporter un etat du mauvais navigateur) · 05/07/2026
// [PONT CLAUDE] dataDownload.forClaude() : meme backup complet, nom FIXE aura_live.json (upload racine repo -> lien stable lu par Claude) · 05/07/2026
/* ============================================================
   GUARDIAN CORE · moteur de sondes (l'intelligence)
   Indépendant de l'affichage. Détecte automatiquement s'il
   tourne DANS l'app (accès S/DOM live) ou en page séparée.
   API : GuardianCore.runAll() -> Promise<rapport>
   ============================================================ */
(function(){
'use strict';
let CFG = window.GUARDIAN_CONFIG;
// si une config a été importée et stockée, elle prime
try {
  const ov = localStorage.getItem('guardian_config_override');
  if(ov){ const parsed = JSON.parse(ov); if(parsed && parsed.storage){ CFG = parsed; window.GUARDIAN_CONFIG = parsed; } }
} catch(e){}
if(!CFG){ console.error('[Guardian] config manquante'); return; }

const Core = { results: [], lastRun: null, history: [] };

/* ---------- utilitaires ---------- */
function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function lsKeys(){ try { return Object.keys(localStorage); } catch(e){ return []; } }
function ssGet(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } }
function parse(s){ try { return JSON.parse(s); } catch(e){ return null; } }
function sizeOf(str){ return str ? str.length : 0; }

/* accès à l'état vivant S (si dans l'app) */
function getLiveS(){
  for(const g of (CFG.liveState.getters||[])){
    try { const v = g(); if(v && typeof v==='object') return v; } catch(e){}
  }
  return null;
}
/* contexte : DANS l'app (S live trouvé) ou page séparée */
function detectMode(){
  return getLiveS() ? 'embedded' : 'standalone';
}

/* lecture de l'état "source de vérité" : S live sinon snapshot storage */
async function loadStateSnapshot(){
  const live = getLiveS();
  if(live) return { S: live, source: 'live' };
  // sinon : storage (IDB prioritaire si cycle plus haut, sinon LS)
  const lsRaw = lsGet(CFG.storage.saveKey);
  const lsSnap = lsRaw ? parse(lsRaw) : null;
  let idbSnap = null;
  try { idbSnap = await idbGetState(); } catch(e){}
  const lc = lsSnap && typeof lsSnap.cycle==='number' ? lsSnap.cycle : -1;
  const ic = idbSnap && typeof idbSnap.cycle==='number' ? idbSnap.cycle : -1;
  if(ic>=lc && idbSnap) return { S: idbSnap, source:'idb', lsSnap, idbSnap };
  if(lsSnap) return { S: lsSnap, source:'ls', lsSnap, idbSnap };
  return { S:null, source:'none', lsSnap, idbSnap };
}

function idbOpen(name, version){
  return new Promise(resolve=>{
    let req; try { req = version?indexedDB.open(name,version):indexedDB.open(name); }
    catch(e){ return resolve(null); }
    if(!req || typeof req!=='object'){ return resolve(null); }
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>resolve(null);
    req.onblocked=()=>resolve(null);
    setTimeout(()=>resolve(null),4000);
  });
}
async function idbGetState(){
  const db = await idbOpen(CFG.storage.dbName, CFG.storage.dbVersion);
  if(!db) return null;
  return await new Promise(resolve=>{
    let tx; try { tx = db.transaction(CFG.storage.store,'readonly'); }
    catch(e){ try{db.close();}catch(x){} return resolve(null); }
    const r = tx.objectStore(CFG.storage.store).get(CFG.storage.saveKey);
    r.onsuccess=()=>{ try{db.close();}catch(x){} const v=r.result; resolve(typeof v==='string'?parse(v):v); };
    r.onerror=()=>{ try{db.close();}catch(x){} resolve(null); };
  });
}

/* fabrique un résultat de sonde */
function R(level, group, title, detail, fix){
  // level: ok | info | warn | crit
  return { level, group, title, detail: detail||'', fix: fix||'', ts: Date.now() };
}

/* ============================================================
   CAPTURE LIVE DES ERREURS JS (installée une fois)
   ============================================================ */
const _jsErrors = [];
if(!window.__guardianErrHook){
  window.__guardianErrHook = true;
  window.addEventListener('error', function(e){
    _jsErrors.push({ msg:e.message, src:(e.filename||'').split('/').pop(), line:e.lineno, col:e.colno, ts:Date.now() });
    if(_jsErrors.length>100) _jsErrors.shift();
  });
  window.addEventListener('unhandledrejection', function(e){
    const r = e.reason || {};
    _jsErrors.push({ msg:'(promise) '+(r.message||r), src:'', line:0, col:0, ts:Date.now() });
    if(_jsErrors.length>100) _jsErrors.shift();
  });
}

/* ============================================================
   LES SONDES
   ============================================================ */

/* SONDE 1 — Incohérences UI ↔ état (le coeur, ton exemple Plein Régime) */
// [GUARDIAN v2 · 16/08/2026] Sonde PERSISTANCE : toute clé produite par buildSnapshot()
// et absente du manifeste de relecture (_APPLYSNAP_MANIFEST, 09b2) sera PERDUE au
// prochain boot. C'est le bug qui a coûté 7 clés le 16/08 — désormais détecté avant.

// [GUARDIAN v2 · ÉTAPE 2 · 16/08/2026] Sondes DISCIPLES : cohérence de l'architecture
// maîtres/disciples (sièges→agents vivants, tâches élues, pépinière ≥7, plafond 1600
// versé et non contourné, mérites par angle sains).
function probeDisciples(){
  const out=[];
  try{
    const S0 = (0, eval)('S');
    if(!S0 || !S0.botDisciples){ out.push(R('info','Disciples','Architecture absente de ce contexte','','')); return out; }
    const agents = S0.agents || [];
    const ids = new Set(agents.map(a=>a.id));
    // 1. sièges → agents vivants
    let dead=[], seats=0;
    Object.entries(S0.botDisciples).forEach(([b,arr])=>(arr||[]).forEach(id=>{ if(id){ seats++; if(!ids.has(id)) dead.push(b+'→'+id); }}));
    if(dead.length) out.push(R('crit','Disciples','Siège(s) pointant vers agent(s) disparu(s) : '+dead.join(', '),'Le bot consulte le vide.','Livrer à Claude : _ensureDisciples doit nettoyer ces sièges.'));
    else out.push(R('ok','Disciples',seats+' siège(s), tous vivants','',''));
    // 2. tâches élues
    let untasked=0;
    Object.values(S0.botDisciples).forEach(arr=>(arr||[]).forEach(id=>{ if(id && !(S0.discipleTasks && S0.discipleTasks[id])) untasked++; }));
    if(untasked) out.push(R('warn','Disciples',untasked+' disciple(s) sans tâche élue','Le vote (10 min) devrait les couvrir ; persistant = anomalie.',''));
    // 3. pépinière ≥ 7
    const seated = new Set(); Object.values(S0.botDisciples).forEach(arr=>(arr||[]).forEach(id=>{if(id)seated.add(id);}));
    const pep = agents.filter(a=>!a.isBot && !a.isMeta && String(a.name||'').indexOf('Hybrid')===0 && !seated.has(a.id)).length;
    out.push(R(pep>=7?'ok':'warn','Disciples','Pépinière : '+pep+' hybride(s) libre(s)'+(pep<7?' (< 7, règle Rams)':''), pep<7?'La relève manque : les héritages puiseront dans un vivier trop mince.':'',''));
    // 4. plafond 1600 : aucun bot ne doit rester durablement au-dessus (versement actif)
    const over = agents.filter(a=>!a.isMeta && (a.fitness||0) > 1650).map(a=>(a.isBot?'':'Hybrid ')+a.name);   // [03/09] plafond unique : bots ET hybrides
    if(over.length) out.push(R('warn','Disciples','Agent(s) > 1650 T$ (plafond unique 1600) : '+over.slice(0,6).join(', ')+(over.length>6?' +'+(over.length-6):''),'Le versement du surplus au pot semble inactif (bots ou hybrides).','Vérifier redistributeFitness (02:705+).'));
    else out.push(R('ok','Disciples','Plafond 1600 respecté (surplus versé)','',''));
    // 5. mérites par angle
    let cells=0, weird=0;
    Object.values(S0.discipleTaskSkill||{}).forEach(angs=>Object.values(angs).forEach(t=>{ cells++; if((t.w||0)<0||(t.l||0)<0||(t.w+t.l)>100000) weird++; }));
    out.push(R(weird? 'warn':'ok','Disciples','Mérites par angle : '+cells+' cellule(s)'+(weird?', '+weird+' aberrante(s)':''),'',''));
  }catch(e){ out.push(R('warn','Disciples','Sonde en erreur',String(e&&e.message||e).slice(0,80),'')); }
  return out;
}


// [GUARDIAN · 23/08/2026] Sonde COMPTEURS : si aucun trade n'est enregistré, TOUS les
// compteurs cumulés doivent être à zéro — sinon carte rouge avec la liste exacte.
// Réponse structurelle au « des chiffres survivent aux resets » : plus jamais silencieux.
function probeCounters(){
  const out=[];
  try{
    const S0=(0,eval)('S');
    if(!S0){out.push(R('info','Compteurs','État inaccessible','',''));return out;}
    let nTrades=0;
    Object.values(S0.pairStates||{}).forEach(p=>{nTrades+=((p&&p.trades)||[]).length;});
    if(nTrades>0){out.push(R('ok','Compteurs',nTrades+' trade(s) en historique — cumuls légitimes','',''));return out;}
    const bad=[];
    function scan(o,path,depth){if(!o||typeof o!=='object'||depth>3)return;
      Object.keys(o).forEach(k=>{const v=o[k];
        if(typeof v==='number'&&Math.abs(v)>0.01&&/fee|pnl|gross|saved|tax|frais/i.test(k))bad.push(path+k+'='+v.toFixed(2));
        else if(v&&typeof v==='object'&&!Array.isArray(v))scan(v,path+k+'.',depth+1);});}
    scan(S0.fees||{},'fees.',0);
    Object.keys(S0.walletStore||{}).forEach(m=>scan((S0.walletStore[m]||{}).fees||{},m+'.fees.',0));
    if(bad.length)out.push(R('crit','Compteurs','ZÉRO trade mais compteur(s) non nuls : '+bad.slice(0,6).join(' · ')+(bad.length>6?' · +'+(bad.length-6):''),
      'Des cumuls survivent sans historique pour les justifier — même mécanique que les −107$ du 23/08.',
      'Livrer cette ligne à Claude : reset ciblé de ces clés.'));
    else out.push(R('ok','Compteurs','Zéro trade, zéro cumul — comptabilité vierge cohérente','',''));
  }catch(e){out.push(R('warn','Compteurs','Sonde en erreur',String(e&&e.message||e).slice(0,80),''));}
  return out;
}

function probePersistence(){
  const out=[];
  try{
    const bs = (typeof buildSnapshot==='function') ? buildSnapshot() : null;
    const man = (typeof window!=='undefined' && window._APPLYSNAP_MANIFEST) || null;
    if(!bs || !man){
      out.push(R('info','Persistance','Sonde indisponible','buildSnapshot ou manifeste absent de ce contexte.','Vérifier que 09b1/09b2 à jour sont chargés.'));
      return out;
    }
    const mir = (typeof window!=='undefined' && window._WALLET_MIRRORS) || [];
    const orphans = Object.keys(bs).filter(k => man.indexOf(k) === -1 && mir.indexOf(k) === -1);   // [16/08] miroirs walletStore exclus (restaurés au multiplexage)
    if(orphans.length){
      out.push(R('crit','Persistance','Clé(s) sauvegardée(s) mais JAMAIS relue(s) : '+orphans.join(', '),
        'Ces données seront PERDUES à la prochaine relance : buildSnapshot les écrit, applySnap ne les relit pas (même mécanique que le bug du 16/08).',
        'Ajouter chaque clé à applySnap ET au manifeste dans 09b2 (livrer à Claude avec cette ligne).'));
    } else {
      out.push(R('ok','Persistance','Toutes les clés du snapshot sont relues ('+Object.keys(bs).length+' clés)','Sauvegarde et relecture alignées.',''));
    }
  }catch(e){ out.push(R('warn','Persistance','Sonde en erreur',String(e&&e.message||e).slice(0,80),'')); }
  return out;
}

function probeCoherence(snap){
  const out = [];
  const S = snap.S;
  const mode = detectMode();
  if(mode!=='embedded'){
    out.push(R('info','Cohérence UI↔état','Comparaison UI↔état indisponible',
      'Guardian tourne en page séparée : il ne voit pas le DOM vivant d\'AURA. Ouvre Guardian comme onglet DANS AURA pour activer ces détections.',''));
    return out;
  }
  for(const c of (CFG.coherenceChecks||[])){
    let stateVal=null, uiVal=null;
    try { stateVal = c.stateRead(S); } catch(e){}
    try { uiVal = c.uiRead(); } catch(e){}
    if(stateVal===null && uiVal===null){ continue; } // élément absent, on saute
    if(uiVal===null){ continue; } // pas d'UI à comparer
    // comparaison avec tolérance éventuelle
    let agree;
    if(typeof stateVal==='number' && typeof uiVal==='number' && c.tolerance){
      agree = Math.abs(stateVal-uiVal) <= c.tolerance;
    } else {
      agree = String(stateVal)===String(uiVal);
    }
    if(agree){
      out.push(R('ok','Cohérence UI↔état', c.label+' : cohérent', 'UI = état = '+uiVal, ''));
    } else {
      out.push(R('crit','Cohérence UI↔état',
        '⚠ '+c.label+' : INCOHÉRENCE',
        'L\'UI affiche « '+uiVal+' » mais l\'état S dit « '+stateVal+' ». Les deux devraient être identiques → bug de désynchronisation.',
        'Fichier '+c.file+'. '+c.fix));
    }
  }
  return out;
}

/* SONDE 2 — Valeurs aberrantes (sanity) */
function probeSanity(snap){
  const out=[]; const S=snap.S;
  if(!S){ out.push(R('warn','Valeurs','Aucun état à analyser','Ni S live ni snapshot storage.','')); return out; }
  let anyBad=false;
  for(const sc of (CFG.sanityChecks||[])){
    let bad=false; try { bad = !!sc.test(S); } catch(e){}
    if(bad){ anyBad=true; out.push(R('crit','Valeurs','⚠ '+sc.label, sc.msg, 'Fichier '+sc.file)); }
  }
  if(!anyBad) out.push(R('ok','Valeurs','Valeurs cohérentes','portfolio/cash/trading sains, pas de NaN ni d\'aberration.',''));
  return out;
}

/* SONDE 3 — Cohérence stockage LS ↔ IDB */
async function probeStorageSync(snap){
  const out=[];
  const lsRaw = lsGet(CFG.storage.saveKey);
  const lsSnap = lsRaw ? parse(lsRaw) : null;
  let idbSnap=null; try { idbSnap=await idbGetState(); } catch(e){}
  const lc = lsSnap && typeof lsSnap.cycle==='number' ? lsSnap.cycle : null;
  const ic = idbSnap && typeof idbSnap.cycle==='number' ? idbSnap.cycle : null;
  if(lc==null && ic==null){ out.push(R('warn','Stockage','Aucun snapshot trouvé','Ni LS ni IDB ne contiennent '+CFG.storage.saveKey,'')); return out; }
  if(lc!=null && ic!=null){
    const d=Math.abs(lc-ic);
    if(d>CFG.thresholds.cycleDriftAlert) out.push(R('crit','Stockage','⚠ Écart LS/IDB important','LS=#'+lc+' vs IDB=#'+ic+' (écart '+d+') → possible régression au reload.','Vérifier loadState() : doit charger la source la plus récente (cycle le plus haut).'));
    else if(d>0) out.push(R('warn','Stockage','Léger écart LS/IDB','LS=#'+lc+' vs IDB=#'+ic+' (écart '+d+')','Normal si une sauvegarde est en cours.'));
    else out.push(R('ok','Stockage','LS = IDB','Les deux au cycle #'+lc+', parfaitement synchronisés.',''));
  } else {
    out.push(R('warn','Stockage','Une seule source','LS '+(lc!=null?('#'+lc):'absent')+' / IDB '+(ic!=null?('#'+ic):'absent'),'Copier la source présente vers l\'autre (onglet Restauration).'));
  }
  return out;
}

/* SONDE 4 — Sauvegarde figée (cycle avance mais savedAt stagne) */
function probeSaveFresh(snap){
  const out=[]; const S=snap.S;
  if(!S || !S.savedAt){ return out; }
  const age = (Date.now()-new Date(S.savedAt).getTime())/60000;
  if(age > CFG.thresholds.saveStaleMin && S.running){
    out.push(R('crit','Sauvegarde','⚠ Sauvegarde possiblement figée',
      'Dernière sauvegarde il y a '+age.toFixed(0)+' min alors que le bot tourne. Les écritures n\'aboutissent peut-être plus (ex. erreur dans saveState/openDB).',
      'Vérifier les Traces IDB pour des OPENDB_REJECT / SAVESTATE_REJECT.'));
  } else {
    out.push(R('ok','Sauvegarde','Sauvegarde récente','Dernière sauvegarde il y a '+age.toFixed(1)+' min.',''));
  }
  return out;
}

/* SONDE 5 — Erreurs JS capturées en direct */
function probeJsErrors(){
  const out=[];
  if(detectMode()!=='embedded'){
    out.push(R('info','Erreurs JS','Capture live indisponible','Disponible seulement intégré dans AURA.',''));
    return out;
  }
  if(!_jsErrors.length){ out.push(R('ok','Erreurs JS','Aucune erreur capturée','Aucune exception JS depuis le chargement.','')); return out; }
  // regrouper par message
  const byMsg={};
  _jsErrors.forEach(e=>{ const k=e.msg+' @'+e.src+':'+e.line; byMsg[k]=(byMsg[k]||0)+1; });
  Object.keys(byMsg).slice(0,20).forEach(k=>{
    out.push(R('crit','Erreurs JS','⚠ '+k.split(' @')[0], 'À '+(k.split(' @')[1]||'?')+' · '+byMsg[k]+'×',
      'Erreur réelle captée dans l\'app. Corriger à l\'emplacement indiqué.'));
  });
  return out;
}

/* SONDE 6 — Apprentissage figé */
function probeLearning(snap){
  const out=[]; const S=snap.S;
  if(!S || !Array.isArray(S.agents)){ return out; }
  const learn = S.agents.reduce((a,x)=>a+(x.learningEvents||0),0);
  out.push(R('ok','Apprentissage','Cycles d\'apprentissage : '+learn.toLocaleString('fr-FR'),
    (S.agents.length)+' agents · cycle #'+S.cycle+' · genCount '+(S._genCount!=null?S._genCount:'?'),''));
  return out;
}

/* SONDE 7 — Quota localStorage */
function probeQuota(){
  const out=[];
  let total=0; for(const k of lsKeys()){ const v=lsGet(k); total += (k.length+(v?v.length:0))*2; }
  const mo = total/1048576;
  if(mo > CFG.thresholds.storageWarnMo) out.push(R('warn','Quota','⚠ localStorage proche de la limite', mo.toFixed(2)+' Mo utilisés (~5-10 Mo max).','Migrer les grosses clés (snapshots) vers IndexedDB.'));
  else out.push(R('ok','Quota','localStorage OK', mo.toFixed(2)+' Mo utilisés.',''));
  return out;
}

/* ============================================================
   SONDES DE CODE — fichiers déclarés, fonctions critiques, constantes, doublons
   [GEL 09/09/2026] Ces sondes lisent le CODE, pas l'état : le code ne change pas
   pendant une session (nouveaux fichiers = relancement de l'app). Constats vérifiés :
   1) probeFiles était relancée TOUTES LES 2 MIN par l'embed (+ à chaque ouverture du
      panneau) : HTML + 49 fetchs no-store dont les corps n'étaient jamais lus (≈ 2,9 Mo
      de réseau et de tampons par scan, ≈ 85 Mo/h) pour un code immuable en session.
   2) probeFunctions / probeUndefinedVars / probeDuplicates étaient MUETTES en production
      depuis l'arrivée des tokens : le filtre endsWith('.js') portait sur l'URL brute
      (js/x.js?v=…) → aucune source analysée, aucun résultat affiché (aucun groupe
      Fonctions/Variables/Doublons dans le rapport). Leur logique d'analyse, reprise à
      l'identique, aurait coûté 200–350 ms de regex monolithiques sur desktop.
   3) Journal du 09/09 (20:08–20:09) : gel 13,4 s = boîte alert() du bouton Backup de
      l'embed ; longtask de 7,7 s sans nom, ni timer, ni then, ni saveState (aucun
      ⏱ LENT: saveState, snapshot 1,44 Mo) avec heap 468/954 Mo — cause restant à nommer.
   Maintenant : sondes de code UNE fois par session (mémorisées, refaites sur « Relancer »),
   un seul fetch par fichier (texte gardé pour les JS seulement), commentaires strippés une
   fois par fichier, analyse fichier par fichier avec respiration (setTimeout 0) entre
   chaque, opération annoncée via _perfOp('guardianScan'). Le texte des sources n'est pas
   conservé. Un scan réseau incomplet (statut 0 = pas de réponse) n'est pas mémorisé.
   ============================================================ */
function _guardianOp(name){ try { if(typeof window!=='undefined' && window._perfOp) window._perfOp(name); } catch(e){} }
function _breathe(){ return new Promise(resolve=>setTimeout(resolve,0)); }
let _codeReport = null;   // résultats des sondes de code de la session (null tant qu'aucun scan complet n'a abouti)

/* lit le VRAI HTML, teste chaque fichier déclaré UNE fois ; garde le texte des JS pour l'analyse */
async function fetchDeclared(){
  let html=null;
  try { const r = await fetch(CFG.appUrl,{cache:'no-store'}); if(r.ok) html = await r.text(); } catch(e){}
  if(!html) return null;
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
  const links   = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/gi)].map(m=>m[1]);
  const declared = scripts.concat(links).filter(u=>!/^https?:/.test(u));
  const tested=[], perFile={};
  for(const u of declared){
    const clean = u.split('?')[0];
    let ok=false, status=0;
    try {
      const r = await fetch(clean,{cache:'no-store'}); ok=r.ok; status=r.status;
      if(ok && clean.endsWith('.js')) perFile[clean] = await r.text();
    } catch(e){}
    tested.push({ url:clean, ok, status });
  }
  return { declared, tested, perFile };
}

/* SONDE 8 — Fichiers (SANS RÉSEAU) : ce que le WebView a RÉELLEMENT chargé pour ce document.
   [GEL BOOT 11/09/2026] Au boot et à chaque scan silencieux, cette sonde remplace l'ancien
   scan réseau (HTML + 49 fetchs no-store + 2,9 Mo de sources lus 4 s après le boot : les
   deux gels de démarrage de 6-8 s, 16/08, 09/09, 10/09, portaient tous « op fetch js/… »).
   document.scripts / link[rel=stylesheet] = la liste déclarée (même document que l'app),
   performance.getEntriesByType('resource') = le statut HTTP réel de chaque chargement
   (responseStatus, Chrome ≥ 109). Zéro requête, synchrone, ~1 ms. Un fichier apparu ou
   disparu APRÈS le chargement n'est vu qu'au prochain Relancer (sonde réseau ci-dessous). */
function probeFilesResources(){
  const out=[];
  if(typeof document==='undefined' || !document.scripts) return out;
  const declared=[];
  try {
    Array.prototype.forEach.call(document.scripts, s=>{ const raw=s.getAttribute('src'); if(raw && !/^https?:/i.test(raw)) declared.push({ raw, abs:s.src }); });
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), l=>{ const raw=l.getAttribute('href'); if(raw && !/^https?:/i.test(raw)) declared.push({ raw, abs:l.href }); });
  } catch(e){}
  if(!declared.length) return out;
  let entries=[];
  try { if(typeof performance!=='undefined' && typeof performance.getEntriesByType==='function') entries=performance.getEntriesByType('resource')||[]; } catch(e){}
  const byName={}; entries.forEach(e=>{ if(e && e.name) byName[e.name]=e; });
  const missing=[], unknown=[];
  declared.forEach(d=>{
    const e=byName[d.abs];
    const st=(e && typeof e.responseStatus==='number') ? e.responseStatus : null;
    if(st===null || st===0){ unknown.push(d); return; }
    if(st>=400) missing.push({ url:d.raw.split('?')[0], status:st });
  });
  if(missing.length===0){
    out.push(R('ok','Fichiers','Tous les fichiers déclarés sont chargés par le WebView',
      declared.length+' fichiers (script+css) déclarés dans ce document'+(unknown.length?' · '+unknown.length+' sans statut exposé (WebView < Chrome 109 ou hors tampon)':' · statut HTTP lu sans aucune requête')+'.',''));
  } else {
    missing.forEach(m=>{
      out.push(R('crit','Fichiers','⚠ Déclaré mais absent au chargement : '+m.url.split('/').pop(),
        'Le WebView a reçu HTTP '+m.status+' pour '+m.url+' au chargement de ce document : le fichier est introuvable et le système l\'appelle.',
        'Uploader le fichier (ou retirer sa balise du HTML s\'il est inutile), puis relancer l\'app.'));
    });
  }
  return out;
}

/* SONDE 8 bis — Fichiers (RÉSEAU) : déclaré dans le HTML mais absent (404) vs présent —
   vérité réseau du moment, uniquement après un vrai scan de code (Relancer / 1re ouverture). */
function probeFilesResults(tested){
  const out=[];
  const missing = tested.filter(t=>!t.ok);
  if(missing.length===0){
    out.push(R('ok','Fichiers (réseau)','Tous les fichiers déclarés répondent', tested.length+' fichiers (script+css) tous en HTTP 200.',''));
  } else {
    missing.forEach(m=>{
      out.push(R('crit','Fichiers (réseau)','⚠ Déclaré mais absent : '+m.url.split('/').pop(),
        'Le HTML charge '+m.url+' (HTTP '+(m.status||0)+') mais le fichier est introuvable. C\'est une vraie alerte car le système l\'appelle.',
        'Soit uploader le fichier, soit retirer sa balise du HTML s\'il est inutile.'));
    });
  }
  return out;
}

/* SONDES 9 + 10 + 11 — fonctions critiques (définie ? appelée ?), constantes surveillées
   (ex. le bug DB_NAME), doublons (définie dans 2 fichiers) : un passage par fichier,
   respiration entre chaque fichier, mêmes regex qu'avant. */
async function analyseCode(perFile){
  const files = Object.keys(perFile);
  if(!files.length) return [];
  const fns = CFG.criticalFunctions||[];
  const WATCH = (CFG.watchedConstants || ['DB_NAME','SAVE_KEY','STORE','DB_VERSION','STORE_STATE','STORE_TRADES','STORE_FEES']);
  const re = fns.map(fn=>({ fn,
    def:  new RegExp('(function\\s+'+fn+'\\b|\\b'+fn+'\\s*=\\s*function|\\b'+fn+'\\s*=\\s*async\\s+function|\\b'+fn+'\\s*:\\s*function|window\\.'+fn+'\\s*=)'),
    call: new RegExp('\\b'+fn+'\\s*\\(','g'),
    dup:  new RegExp('function\\s+'+fn+'\\s*\\(|\\b'+fn+'\\s*=\\s*function|\\b'+fn+'\\s*:\\s*function'),
    defined:false, calls:0, files:[] }));
  const gdef = {};   // constante exposée globalement (window./RT./globalThis.) quelque part dans le code
  WATCH.forEach(v=>{ gdef[v] = { re:new RegExp('(window|RT|globalThis)\\.'+v+'\\s*='), hit:false }; });
  const undef = [];
  for(const f of files){
    _guardianOp('guardianScan');
    const code = perFile[f];
    const bare = code.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');   // commentaires retirés UNE fois par fichier
    const short = f.split('/').pop();
    for(const r of re){
      if(!r.defined && r.def.test(code)) r.defined = true;
      const m = code.match(r.call); if(m) r.calls += m.length;
      if(r.dup.test(bare)) r.files.push(short);
    }
    for(const v of WATCH){
      if(!gdef[v].hit && gdef[v].re.test(code)) gdef[v].hit = true;
      // utilisée dans CE fichier comme variable (pas en chaîne/clé) : open(DB_NAME, X) etc.
      const usedRe = new RegExp('[^\\w\'"\\.]'+v+'\\s*(\\)|,|;|\\.|\\]|\\s*[=<>+])');
      if(!usedRe.test(code)) continue;
      // définie/importée dans CE fichier ? (const/let/var/RT.X/window.X/= X)
      const declHere = new RegExp('(const|let|var)\\s+'+v+'\\b|(RT|window)\\.'+v+'\\b|'+v+'\\s*=\\s*[\'"]').test(code);
      if(declHere) continue;
      undef.push({ v, short });
    }
    await _breathe();
  }
  const out=[];
  for(const r of re){
    if(r.defined && r.calls>1){ /* ok */ }
    else if(!r.defined && r.calls>0){
      out.push(R('crit','Fonctions','⚠ '+r.fn+'() appelée mais jamais définie',
        'Appelée '+r.calls+'× dans le code chargé mais aucune définition trouvée → ReferenceError au runtime.',
        'Définir '+r.fn+' ou corriger le nom. Cherche son fichier d\'origine.'));
    }
    else if(r.defined && r.calls<=1){
      out.push(R('warn','Fonctions',''+r.fn+'() définie mais peu/pas appelée',
        'Trouvée mais '+r.calls+' appel(s). Soit code mort, soit appelée dynamiquement.',
        'Vérifier si '+r.fn+' est encore utile.'));
    }
  }
  if(!out.length) out.push(R('ok','Fonctions','Fonctions critiques OK','Toutes définies et appelées.',''));
  // utilisée mais ni déclarée localement ni exposée globalement → vrai risque type DB_NAME
  undef.filter(u=>!gdef[u.v].hit).forEach(u=>{
    out.push(R('warn','Variables','Constante possiblement non définie : '+u.v,
      'Utilisée dans '+u.short+' mais ni déclarée localement, ni exposée globalement (window./RT.). Risque de ReferenceError (comme le bug DB_NAME du 01/06).',
      'Dans '+u.short+' : déclarer '+u.v+' localement, ou utiliser RT.'+u.v+' si elle vient de 09a-runtime-state.'));
  });
  let dups=0;
  for(const r of re){
    if(r.files.length>1){
      dups++;
      out.push(R('warn','Doublons','⚠ '+r.fn+'() définie dans '+r.files.length+' fichiers',
        r.files.join(', ')+' → risque de conflit (la dernière chargée gagne).',
        'Garder une seule définition de '+r.fn+'.'));
    }
  }
  if(!dups) out.push(R('ok','Doublons','Pas de doublon de fonction critique','',''));
  return out;
}

/* point d'entrée des sondes de code : mémorisées pour la session, refaites sur refresh */
async function probeCode(refresh){
  if(_codeReport && !refresh) return _codeReport;
  _guardianOp('guardianScan');
  const files = await fetchDeclared();
  if(!files){
    return [R('info','Fichiers (réseau)','Impossible de lire '+CFG.appUrl,'Lance Guardian depuis la même origine que l\'app (GitHub Pages).','')];
  }
  const out = probeFilesResults(files.tested).concat(await analyseCode(files.perFile));
  if(files.tested.every(t=>t.status>0)) _codeReport = out;   // scan complet uniquement
  return out;
}

/* SONDE 12 — IDB : keyPath cohérent + base présente */
async function probeIdbHealth(){
  const out=[];
  const db = await idbOpen(CFG.storage.dbName, CFG.storage.dbVersion);
  if(!db){ out.push(R('warn','IndexedDB','Base '+CFG.storage.dbName+' inaccessible','',''));return out; }
  const stores = Array.from(db.objectStoreNames);
  let kp=null;
  try { const tx=db.transaction(CFG.storage.store,'readonly'); kp=tx.objectStore(CFG.storage.store).keyPath; } catch(e){}
  out.push(R('ok','IndexedDB','Base '+CFG.storage.dbName+' v'+db.version,'Stores : '+stores.join(', '),''));
  try{db.close();}catch(e){}
  return out;
}

/* ============================================================
   RUN ALL
   ============================================================ */

/* SONDE GEL / LAG — [GEL BOOT 11/09/2026] lit d'abord S.perfLog.gels (mémoire durable écrite par
   le moniteur de simTick de 08 : 30 derniers gels, nom d'op COMPLET, attribution LoAF, persistée
   dans le snapshot donc dans chaque backup), sinon les traces 🐌 du chainLog (volatile : 100
   lignes, ~4 min en pleine activité — c'est ce qui faisait disparaître les gels avant lecture).
   Relevé = tous les gels connus ; verdicts = gels des 24 dernières heures. */
function _loafTop(f){   // [20260912a] script le plus long de la frame — pas le premier (le 1er faisait 11 ms dans une frame de 1.3 s)
  const sc = (f && Array.isArray(f.scripts)) ? f.scripts : [];
  let top = null;
  for(let i = 0; i < sc.length; i++){ if(sc[i] && (!top || (Number(sc[i].dur)||0) > (Number(top.dur)||0))) top = sc[i]; }
  return top;
}
function _loafLent(S, f){   // [20260912b] ligne ⏱ LENT (S.perfLog.lent, écrite par l'enveloppe chrono de 00-backup-state.js à la fin du rappel > 1 s) la plus proche de la frame (≤ 5 s) : c'est ELLE qui nomme le vrai appelant (fichier:ligne d'inscription du timer / rAF / then) quand le navigateur ne voit que l'enveloppe _wrapFn
  const lent = (S && S.perfLog && Array.isArray(S.perfLog.lent)) ? S.perfLog.lent : [];
  const ft = Number(f && f.t) || 0;
  if(!ft) return null;
  let best = null, bestD = 5000;
  for(let i = 0; i < lent.length; i++){ const e = lent[i]; if(!e || !e.name) continue; const d = Math.abs((Number(e.t)||0) - ft); if(d <= bestD){ best = e; bestD = d; } }
  return best;
}
function _loafBootAge(boots, f){   // [20260912b] secondes écoulées depuis le boot qui précède la frame (null si inconnu ou > 60 s) : une frame « au boot » = en général le chargement de l'état (loadState : IDB + JSON.parse + applySnap), coût attendu une fois par boot
  const ft = Number(f && f.t) || 0;
  let bt = 0;
  (Array.isArray(boots) ? boots : []).forEach(function(b){ const t = Number(b && b.t) || 0; if(t && t <= ft && t > bt) bt = t; });
  if(!ft || !bt || ft - bt > 60000) return null;
  return Math.round((ft - bt) / 1000);
}
function _gelFromRecord(r){
  return { gap:Number(r.gap)||0, tickMs:Number(r.tickMs)||0, visible:!r.hidden,
    heapU:(r.heapU!=null?Number(r.heapU):null), heapL:(r.heapL!=null?Number(r.heapL):null),
    dom:(r.dom!=null?Number(r.dom):null), page:(r.page!=null?String(r.page):null), ws:(r.ws!=null?Number(r.ws):null),
    jsSum:(r.jsSum!=null?Number(r.jsSum):null), op:(r.op?String(r.op):null), osIdle:!!r.osIdle,
    loaf:(r.loaf&&typeof r.loaf==='object')?r.loaf:null, t:(Number(r.t)||0), time:(r.time?String(r.time):'') };
}
function _gelFromChainLine(d){
  let m;
  if(!(m = d.match(/^Gel ([\d.]+)s .*?tick (\d+)ms .*?(ecran (?:visible|masque))(.*)$/))) return null;
  const r = m[4] || '';
  const heap = r.match(/heap (\d+)\/(\d+)Mo/);
  const dom  = r.match(/dom (\d+)/);
  const page = r.match(/page (\S+)/);
  const ws   = r.match(/ws \+(\d+)/);
  const js   = r.match(/JS ⏱ ([\d.]+)s\/(\d+)/);
  const op   = r.match(/· op (.+?)(?: · |$)/);   // [11/09] nom complet (l'ancien \S+ coupait « fetch js/… » au premier espace)
  return { gap:parseFloat(m[1]), tickMs:parseInt(m[2],10), visible:/visible/.test(m[3]),
    heapU:heap?parseInt(heap[1],10):null, heapL:heap?parseInt(heap[2],10):null,
    dom:dom?parseInt(dom[1],10):null, page:page?page[1]:null, ws:ws?parseInt(ws[1],10):null,
    jsSum:js?parseFloat(js[1]):null, op:op?op[1].trim():null, osIdle:/JS inactif/.test(r), loaf:null, t:0, time:'' };
}
function probeGel(snap){
  const out = [];
  const S = snap.S;
  const durable = (S && S.perfLog && Array.isArray(S.perfLog.gels)) ? S.perfLog.gels.filter(function(r){ return r && typeof r === 'object' && r.gap != null; }) : [];
  let gels = [], source = '';
  if(durable.length){
    gels = durable.map(_gelFromRecord); source = 'mémoire durable S.perfLog.gels';
  } else {
    const cl = (S && Array.isArray(S.chainLog)) ? S.chainLog : [];
    cl.forEach(function(e){ const g = _gelFromChainLine(String(e && e.desc || '')); if(g) gels.push(g); });
    source = 'journal (volatile)';
  }
  if(typeof window !== 'undefined' && window._auraLoafSupported === false){
    out.push(R('info','Gel / Lag','LoAF non supporté par ce WebView',
      'long-animation-frame absent (WebView < Chrome 123) : attribution limitée à longtask + _perfOp.',
      'Mettre à jour Android System WebView (Play Store) pour obtenir le nom du script bloquant.'));
  }
  // [20260911b] frames longues nommées par le navigateur (anneau durable, indépendant des gels)
  // [20260912a] séparées « depuis ce boot » / « antérieures » (S.perfLog.boots) ; bloqueur = _loafTop nommé seulement s'il occupe ≥ 50 % de la frame
  const loafRing = (S && S.perfLog && Array.isArray(S.perfLog.loaf)) ? S.perfLog.loaf.filter(function(f){ return f && typeof f.dur === 'number'; }) : [];
  if(loafRing.length){
    const boots = (S.perfLog && Array.isArray(S.perfLog.boots)) ? S.perfLog.boots : [];
    const lastBoot = boots.length ? boots[boots.length-1] : null;
    const bootT = lastBoot ? (Number(lastBoot.t)||0) : 0;
    const cur = bootT ? loafRing.filter(function(f){ return (Number(f.t)||0) >= bootT; }) : loafRing.slice();
    const old = bootT ? loafRing.filter(function(f){ return (Number(f.t)||0) <  bootT; }) : [];
    const isBlocker = function(f){ const sc = _loafTop(f); return !!(sc && (Number(sc.dur)||0) >= 0.5 * f.dur); };
    const line = function(f){
      const sc = _loafTop(f), scD = sc ? (Number(sc.dur)||0) : 0;
      const head = (f.time||'?')+' · '+(f.dur/1000).toFixed(1)+' s';
      if(isBlocker(f)){
        const inv = String(sc.inv||sc.type||'?');
        const wrap = /00-backup-state\.js/.test(String(sc.src||'')) && /FrameRequestCallback|TimerHandler|\.then$|onmessage|MessageEvent/i.test(inv);   // [20260912b] 00 = instrumentation seule : appelé par timer/rAF/then/ws = enveloppe _wrapFn, pas le code
        const le = wrap ? _loafLent(S, f) : null;
        const age = _loafBootAge(boots, f);
        return head+' · bloqueur '+(sc.src||'?')+':'+(sc.fn||'anonyme')+'@'+(sc.pos!=null?sc.pos:'?')+' ← '+inv+' '+(scD/1000).toFixed(1)+' s'
          +(wrap ? (' = enveloppe chrono _wrapFn → vrai appelant : '+(le ? ('⏱ LENT '+String(le.name)+' '+((Number(le.dur)||0)/1000).toFixed(1)+' s') : 'aucune ligne ⏱ LENT jointe (rappel < 1 s ?)')) : '')
          +(age != null ? (' · au boot (+'+age+' s)') : '');
      }
      return head+' · sans bloqueur JS (JS '+((Number(f.script)||0)/1000).toFixed(2)+' s · rendu '+((Number(f.render)||0)/1000).toFixed(2)+' s · blocage '+((Number(f.block)||0)/1000).toFixed(2)+' s'
        +(sc ? (' · 1er script '+(sc.src||'?')+'@'+(sc.pos!=null?sc.pos:'?')+' '+(scD/1000).toFixed(2)+' s') : '')+')';
    };
    const blockers = cur.filter(isBlocker);
    const worst = blockers.reduce(function(a,f){ return Math.max(a, f.dur); }, 0);
    const lvl = worst >= 3000 ? 'warn' : (blockers.length ? 'info' : 'ok');
    const bootTxt = (lastBoot && lastBoot.time) ? (' (boot '+lastBoot.time+')') : '';
    const detail = (cur.length ? cur.slice(-5).reverse().map(line).join(' ; ') : ('Aucune frame longue depuis le boot courant'+bootTxt+'.'))
      + (old.length ? (' · antérieures au boot courant ('+old.length+', hors verdict) : '+old.slice(-3).reverse().map(line).join(' ; ')) : '');
    out.push(R(lvl,'Gel / Lag','Frames longues (LoAF ≥ 1 s) : '+cur.length+' depuis le boot courant · '+blockers.length+' avec bloqueur JS · '+old.length+' antérieures', detail,
      blockers.length ? 'Seules les lignes « bloqueur » désignent un script à corriger (livrer la ligne à Claude telle quelle). Bloqueur dans 00-backup-state.js = enveloppe chrono : le vrai appelant est le « ⏱ LENT » joint (fichier:ligne d\'inscription du timer / rAF). « Au boot (+N s) » = chargement de l\'état, coût attendu une fois par boot. « Sans bloqueur JS » = frame étirée par le rendu, le GC ou le throttle Android, pas par le code.'
                      : (cur.length ? 'Frames étirées sans JS dominant (rendu / GC / throttle Android) : rien à corriger dans le code.' : '')));
  }
  if(!gels.length){
    out.push(R('ok','Gel / Lag','Aucun gel récent','Ni mémoire durable ni trace 🐌 récente dans le journal.',''));
    return out;
  }
  const vis  = gels.filter(function(g){return g.visible;});
  const mask = gels.filter(function(g){return !g.visible;});
  const maxVis = vis.reduce(function(a,g){return Math.max(a,g.gap);},0);
  const first = gels[0], lastG = gels[gels.length-1];
  const span = (first.time && lastG.time) ? (' · du '+first.time+' au '+lastG.time) : '';
  out.push(R('info','Gel / Lag','Relevé ('+source+')',
    gels.length+' gels ('+vis.length+' écran visible, '+mask.length+' écran masqué) · pire blocage visible '+maxVis.toFixed(1)+'s'+span,''));
  // verdicts sur les 24 dernières heures (les enregistrements datés) ou sur tout (journal non daté)
  const cut = Date.now() - 86400000;
  const recent = gels.filter(function(g){ return !g.t || g.t >= cut; });
  const rvis = recent.filter(function(g){return g.visible;});
  if(rvis.length === 0){
    if(vis.length === 0){
      out.push(R('warn','Gel / Lag','Gels uniquement écran masqué',
        'Android suspend les timers du WebView en arrière-plan. Ce n\'est pas un bug de code.',
        'Garder l\'écran allumé (Wake Lock déjà posé) + Réglages Samsung : retirer AURA de la mise en veille des applis et de l\'optimisation batterie.'));
    } else {
      out.push(R('ok','Gel / Lag','Aucun gel écran visible depuis 24 h','Les gels du relevé sont antérieurs à 24 h.',''));
    }
    return out;
  }
  const wsMax  = rvis.reduce(function(a,g){return Math.max(a,g.ws||0);},0);
  const domMax = rvis.reduce(function(a,g){return Math.max(a,g.dom||0);},0);
  const heapHi = rvis.some(function(g){return g.heapU && g.heapL && (g.heapU/g.heapL)>0.85;});
  if(wsMax >= 1000){
    out.push(R('crit','Gel / Lag','Flood WebSocket @trade ('+wsMax+' messages/gel)',
      'En EV, l\'app ouvre 8 WebSockets Binance @trade (chaque transaction) : les messages s\'accumulent puis sont traités en rafale.',
      'Throttler le traitement des trades WS (1 msg/paire par ~250 ms) ou couper les WS @trade en EV et se fier au prix CoinGecko.'));
    return out;
  }
  if(domMax > 15000){
    out.push(R('crit','Gel / Lag','Layout page CHAIN (DOM '+domMax+' nœuds)',
      'renderChain reconstruit tout l\'innerHTML toutes les 2 s ; le layout/paint qui suit bloque le thread.',
      'Alléger renderChain : mise à jour ciblée au lieu de reconstruire innerHTML, throttler à 1 rendu / 5 ticks.'));
    return out;
  }
  if(heapHi){
    out.push(R('crit','Gel / Lag','Pression mémoire / pauses GC',
      'Le heap est proche de la limite lors des gels.',
      'Réduire l\'empreinte mémoire : borner les tableaux vivants, limiter le churn d\'objets.'));
    return out;
  }
  // [08/08/2026] Verdicts basés sur la sonde longtask (verdict écrit dans la ligne de gel).
  // [11/09/2026] + attribution LoAF : le navigateur nomme le script (fichier:position, fonction, appelant).
  const jsGels = rvis.filter(function(g){ return g.jsSum != null; });
  const osGels = rvis.filter(function(g){ return g.osIdle; });
  if(jsGels.length){
    const named = jsGels.filter(function(g){ return g.op; });
    const opTxt = named.length ? (' · opération nommée : ' + named.map(function(g){ return g.op; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).join(', ')) : ' · aucune opération marquée (_perfOp) dans la fenêtre';
    const tops = {};
    jsGels.forEach(function(g){
      const sc = g.loaf ? _loafTop(g.loaf) : null;   // [20260912a] script le plus long de la frame
      if(!sc) return;
      const k = (sc.src||'?')+':'+(sc.fn||'anonyme')+'@'+(sc.pos!=null?sc.pos:'?')+' ← '+(sc.inv||sc.type||'?');
      tops[k] = Math.max(tops[k]||0, Number(sc.dur)||0);
    });
    const topKeys = Object.keys(tops).sort(function(a,b){ return tops[b]-tops[a]; }).slice(0,3);
    const loafTxt = topKeys.length ? (' · LoAF : ' + topKeys.map(function(k){ return k+' ('+(tops[k]/1000).toFixed(1)+' s)'; }).join(' ; ')) : '';
    const renderOnly = jsGels.filter(function(g){ return g.loaf && !(g.loaf.scripts && g.loaf.scripts.length) && g.loaf.render > 500; }).length;
    out.push(R('crit','Gel / Lag','Blocage JS confirmé par longtask ('+jsGels.length+' gel(s))',
      'La sonde longtask a mesuré du JS bloquant pendant le(s) trou(s)'+opTxt+loafTxt+(renderOnly?(' · '+renderOnly+' gel(s) sans script LoAF : temps passé en rendu (style/layout) ou GC'):'')+'.',
      topKeys.length ? 'Corriger le script nommé par LoAF (livrer cette ligne à Claude : fichier, position, appelant).' : (named.length ? 'Corriger l\'opération nommée (livrer le fix à Claude avec cette ligne de gel).' : 'Ajouter des marqueurs _perfOp sur les prochaines fonctions suspectes pour la nommer.')));
    return out;
  }
  if(osGels.length && osGels.length === rvis.length){
    out.push(R('warn','Gel / Lag','Suspension OS malgré écran allumé ('+osGels.length+' gel(s), 0 longtask)',
      'Aucun longtask pendant les trous : le code ne bloque pas, c\'est Android/Samsung qui fige les timers du WebView même au premier plan (gestion batterie).',
      'Réglages Samsung : retirer AURA de la mise en veille des applis + désactiver l\'optimisation batterie pour AURA (Wake Lock déjà posé côté code).'));
    return out;
  }
  // Gels antérieurs à la sonde (pas de champ JS dans la ligne) : ne pas conclure.
  out.push(R('info','Gel / Lag','Gels sans verdict longtask (antérieurs à la sonde du 08/08)',
    'Ces lignes de gel ne portent pas encore le champ « JS ⏱ / JS inactif ». Le prochain gel sera auto-diagnostiqué.',
    'Juger sur les 🐌 postérieurs à la mise à jour du 08/08.'));
  return out;
}

/* SONDE MÉMOIRE — [GEL BOOT 11/09/2026] pente du heap JS à partir des relevés 10 min de 08
   (S.perfLog.heap, persistant) + trace des boots (S.perfLog.boots : heure, heap au boot,
   dernière sauvegarde de la session précédente = heure de la mort ±25 s). Lecture seule. */
function probeMemory(snap){
  const out = [];
  const S = snap.S;
  const P = (S && S.perfLog && typeof S.perfLog === 'object') ? S.perfLog : null;
  if(!P) return out;
  const boots = Array.isArray(P.boots) ? P.boots : [];
  const heap  = Array.isArray(P.heap)  ? P.heap.filter(function(h){ return h && typeof h.heap === 'number' && h.t; }) : [];
  const lastBoot = boots.length ? boots[boots.length-1] : null;
  if(lastBoot){
    const up = Math.round((Date.now() - (Number(lastBoot.t)||Date.now()))/60000);
    out.push(R('info','Mémoire','Session : boot '+(lastBoot.time||'?')+' · en ligne depuis '+(up>=60?Math.floor(up/60)+' h '+(up%60)+' min':up+' min'),
      'heap au boot '+(lastBoot.heap!=null?lastBoot.heap+' Mo':'?')+' · cycle #'+(lastBoot.cycle!=null?lastBoot.cycle:'?')+(lastBoot.prevSavedAt?(' · dernière sauvegarde de la session précédente : '+lastBoot.prevSavedAt):'')+' · '+boots.length+' boot(s) mémorisé(s)',''));
  }
  if(heap.length){
    const sess = lastBoot ? heap.filter(function(h){ return Number(h.t) >= (Number(lastBoot.t)||0); }) : heap;
    const last = heap[heap.length-1];
    let slope = '';
    if(sess.length >= 2){
      const a = sess[0], b = sess[sess.length-1];
      const hrs = (Number(b.t)-Number(a.t))/3600000;
      if(hrs >= 0.5) slope = ' · pente '+((b.heap-a.heap)/hrs >= 0 ? '+' : '')+((b.heap-a.heap)/hrs).toFixed(1)+' Mo/h sur '+hrs.toFixed(1)+' h';
    }
    const ratio = (last.limit ? last.heap/last.limit : 0);
    out.push(R(ratio > 0.85 ? 'crit' : (ratio > 0.6 ? 'warn' : 'info'),'Mémoire','Heap JS '+last.heap+(last.limit?'/'+last.limit:'')+' Mo · DOM '+(last.dom!=null?last.dom+' nœuds':'?'),
      heap.length+' relevé(s) toutes les 10 min · dernier '+(last.time||new Date(Number(last.t)).toLocaleString())+slope,
      ratio > 0.6 ? 'Le heap monte vers la limite : livrer ce backup à Claude (la pente et les gels LoAF désignent la fuite).' : ''));
  }
  return out;
}


/* SONDE SAUVEGARDE — détecte l'environnement natif, les plugins fichier réellement
   présents dans l'APK, l'état de l'auto-backup, et dit pourquoi ça ne sauvegarde pas
   + quoi faire. Lecture seule (rien n'est écrit). */
function probeBackupCapability(snap){
  const out = [];
  const G = 'Sauvegarde';
  const W = (typeof window !== 'undefined') ? window : {};
  const cap  = W.Capacitor || null;
  const cord = W.cordova || null;
  const isNative = !!(cap || cord) || !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  const plugins = (cap && cap.Plugins) ? Object.keys(cap.Plugins) : [];
  const has = function(n){ return plugins.indexOf(n) !== -1; };

  const fileMethods = [];
  if(has('Filesystem')) fileMethods.push('Capacitor Filesystem');
  if(has('FileSharer') || has('CapacitorFileSharer')) fileMethods.push('capacitor-file-sharer');
  if(has('Share')) fileMethods.push('Capacitor Share');
  if(cord && cord.file) fileMethods.push('cordova-plugin-file');
  if(W.AndroidBackup || W.AndroidInterface) fileMethods.push('bridge Android natif');

  // méta de l'auto-backup FULL (guardian_datadl_meta)
  let meta = null;
  try { meta = JSON.parse(localStorage.getItem('guardian_datadl_meta')); } catch(e){}
  meta = meta || { enabled:true, everyMin:180, last:0 };
  const now = Date.now();
  const dueMin = meta.everyMin || 180;
  const overdueMin = meta.last ? Math.round((now - meta.last)/60000) : null;

  // 1) environnement + plugins
  out.push(R('info', G, 'Environnement de sauvegarde',
    (isNative ? 'app native · plugins Capacitor : ' + (plugins.length ? plugins.join(', ') : 'AUCUN')
              : 'navigateur (pas natif)'), ''));

  // 2) statut auto-backup
  if(meta.enabled === false){
    out.push(R('warn', G, 'Auto-backup DÉSACTIVÉ',
      'Le backup automatique est éteint dans les réglages Guardian.',
      'Réactiver le toggle « Backup auto » (section Sauvegarde des réglages).'));
  } else {
    const lastStr = meta.last ? new Date(meta.last).toLocaleString() : 'jamais';
    const overdue = (overdueMin != null && overdueMin > dueMin * 1.5) || meta.last === 0;
    out.push(R(overdue ? 'crit' : 'ok', G, overdue ? 'Auto-backup EN RETARD / jamais exécuté' : 'Auto-backup à jour',
      'Intervalle ' + dueMin + ' min · dernier backup : ' + lastStr + (overdueMin != null ? ' (il y a ' + overdueMin + ' min)' : ''),
      overdue ? 'Aucun fichier produit depuis longtemps → la méthode d\'écriture échoue (voir ci-dessous).' : ''));
  }

  // 3) méthode d'écriture réelle -> LE diagnostic clé
  if(!isNative){
    out.push(R('info', G, 'Méthode : download blob (navigateur)',
      'En navigateur, <a download>.click() écrit dans Téléchargements — fonctionne dans Chrome.', ''));
  } else if(fileMethods.length){
    out.push(R('ok', G, 'Méthode fichier native DISPONIBLE',
      'Plugin(s) détecté(s) : ' + fileMethods.join(', ') + '. On peut écrire un vrai fichier dans Download.',
      'Déjà câblé et opérationnel : le backup FULL écrit en natif via _fsWriteBackup (Download/AURA), DriveSync l\'envoie sur le Drive (validé bout-en-bout le 05/08).'));
  } else {
    out.push(R('crit', G, 'CAUSE : aucune méthode fichier native dans l\'APK',
      'App native SANS plugin fichier. Le backup retombe sur un download blob <a>.click() qui NE SE DÉCLENCHE PAS dans le WebView Capacitor → aucun fichier écrit → rien à synchroniser → « ça ne sauvegarde plus sur Drive ».',
      'Ajouter un plugin fichier à l\'APK (recommandé : @capgo/capacitor-file-sharer, saveDirectory:\'downloads\', sans permission sur Android 10+), puis je câble le backup dessus. Sans plugin, le JS seul ne peut pas écrire dans Download.'));
  }
  return out;
}

Core.runAll = async function(opts){
  opts = opts || {};   // { code:true } = sondes de code (cache de session, sinon 1er fetch) · { refreshCode:true } = code refait (Relancer) · sans option = scan silencieux, JAMAIS de réseau
  _guardianOp('guardianScan');
  const snap = await loadStateSnapshot();
  const mode = detectMode();
  let res = [];
  res = res.concat(probeCoherence(snap));
  res = res.concat(probeSanity(snap));
  res = res.concat(probeGel(snap));
  res = res.concat(probeBackupCapability(snap));
  res = res.concat(probePersistence());   // [Guardian v2 · 16/08] clés sauvegardées vs relues
  res = res.concat(probeDisciples());      // [Guardian v2 · étape 2] cohérence maîtres/disciples
  res = res.concat(probeCounters());       // [23/08] zéro trade = zéro cumul, vérifié en permanence
  res = res.concat(await probeStorageSync(snap));
  res = res.concat(probeSaveFresh(snap));
  res = res.concat(probeJsErrors());
  res = res.concat(probeLearning(snap));
  res = res.concat(probeQuota());
  res = res.concat(await probeIdbHealth());
  res = res.concat(probeMemory(snap));                 // [GEL BOOT 11/09] pente du heap (S.perfLog.heap), lecture seule
  res = res.concat(probeFilesResources());             // [GEL BOOT 11/09] sans réseau, à chaque scan
  if(opts.refreshCode === true)      res = res.concat(await probeCode(true));    // Relancer : code refait (fetch réel)
  else if(opts.code === true)        res = res.concat(await probeCode(false));   // ouverture du bouclier : cache de session, sinon 1er fetch de la session
  else if(_codeReport)               res = res.concat(_codeReport);              // scan silencieux : uniquement ce qui est déjà en cache, jamais de fetch

  Core.results = res;
  Core.lastRun = Date.now();
  Core.mode = mode;
  // mémoire d'incidents : on garde un mini-historique des problèmes
  const problems = res.filter(r=>r.level==='crit'||r.level==='warn');
  Core.history.push({ ts:Date.now(), mode, crit:res.filter(r=>r.level==='crit').length, warn:res.filter(r=>r.level==='warn').length });
  if(Core.history.length>50) Core.history.shift();
  return { mode, results: res, ts: Core.lastRun };
};

/* ============================================================
   PERSISTANCE (storage) + EXPORT / IMPORT
   ============================================================ */
const GUARDIAN_VERSION = '1.0';
const HISTORY_KEY = 'guardian_history';
const CONFIG_OVERRIDE_KEY = 'guardian_config_override';

/* charger l'historique persistant au démarrage */
(function loadHistory(){
  try { const raw = lsGet(HISTORY_KEY); const h = raw?parse(raw):null; if(Array.isArray(h)) Core.history = h; } catch(e){}
})();
function saveHistory(){
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(Core.history.slice(-50))); } catch(e){}
}

/* auto-description : ce que Guardian sait faire */
function describeCapabilities(){
  return {
    version: GUARDIAN_VERSION,
    project: CFG.project,
    probes: [
      { id:'coherence',   nom:'Incohérences UI↔état', detecte:'L\'UI affiche une valeur différente de l\'état S (ex. Plein Régime actif à l\'écran mais inactif en mémoire)', niveau:'critique' },
      { id:'sanity',      nom:'Valeurs aberrantes', detecte:'portfolio=0 avec comptes pleins, cash négatif, NaN, _startPortfolio aberrant', niveau:'critique' },
      { id:'storageSync', nom:'Cohérence LS↔IDB', detecte:'écart de cycle entre localStorage et IndexedDB (régression possible)', niveau:'variable' },
      { id:'saveFresh',   nom:'Sauvegarde figée', detecte:'le cycle avance mais savedAt stagne → écritures qui n\'aboutissent plus', niveau:'critique' },
      { id:'jsErrors',    nom:'Erreurs JS live', detecte:'exceptions JS réelles capturées dans l\'app avec fichier:ligne', niveau:'critique' },
      { id:'learning',    nom:'Apprentissage', detecte:'cycles d\'apprentissage, agents, génération', niveau:'info' },
      { id:'quota',       nom:'Quota localStorage', detecte:'localStorage proche de la limite ~5-10 Mo', niveau:'avertissement' },
      { id:'idbHealth',   nom:'Santé IndexedDB', detecte:'base/stores présents, keyPath', niveau:'info' },
      { id:'files',       nom:'Fichiers (lit le vrai HTML)', detecte:'fichier déclaré dans le HTML mais absent (404) vs orphelin inutilisé', niveau:'critique' },
      { id:'functions',   nom:'Fonctions critiques', detecte:'fonction appelée mais jamais définie / définie mais jamais appelée', niveau:'variable' },
      { id:'undefinedVars',nom:'Variables non définies', detecte:'constante utilisée sans déclaration (ex. le bug DB_NAME)', niveau:'avertissement' },
      { id:'duplicates',  nom:'Doublons de fonctions', detecte:'même fonction définie dans 2 fichiers → conflit', niveau:'avertissement' }
    ]
  };
}

/* construire les exports */
function buildResultsText(){
  const lines = ['═══ GUARDIAN · RAPPORT ═══','Projet: '+CFG.project+' · v'+GUARDIAN_VERSION,'Mode: '+(Core.mode||'?')+' · '+new Date(Core.lastRun||Date.now()).toISOString(),''];
  const groups = {};
  (Core.results||[]).forEach(r=>{ (groups[r.group]=groups[r.group]||[]).push(r); });
  Object.keys(groups).forEach(g=>{
    lines.push('━━━ '+g+' ━━━');
    groups[g].forEach(r=>{
      lines.push('['+r.level.toUpperCase()+'] '+r.title);
      if(r.detail) lines.push('    '+r.detail);
      if(r.fix) lines.push('    → CORRECTION: '+r.fix);
    });
    lines.push('');
  });
  const crit=(Core.results||[]).filter(r=>r.level==='crit').length;
  const warn=(Core.results||[]).filter(r=>r.level==='warn').length;
  lines.push('═══ '+crit+' critique(s) · '+warn+' avertissement(s) ═══');
  return lines.join('\n');
}
function buildCapabilitiesText(){
  const c = describeCapabilities();
  const lines = ['═══ GUARDIAN · CAPACITÉS ═══','Version '+c.version+' · projet '+c.project,'',c.probes.length+' sondes :',''];
  c.probes.forEach(p=>{ lines.push('• '+p.nom+' ['+p.niveau+']'); lines.push('    '+p.detecte); });
  return lines.join('\n');
}
function buildHistoryText(){
  const lines=['═══ GUARDIAN · HISTORIQUE ═══',''];
  (Core.history||[]).forEach(h=>{ lines.push(new Date(h.ts).toISOString()+' · mode='+h.mode+' · '+h.crit+' crit · '+h.warn+' warn'); });
  return lines.join('\n');
}

Core.export = {
  resultsJSON: () => ({ version:GUARDIAN_VERSION, project:CFG.project, mode:Core.mode, ts:Core.lastRun, results:Core.results }),
  resultsText: buildResultsText,
  configJSON: () => CFG,
  capabilitiesJSON: describeCapabilities,
  capabilitiesText: buildCapabilitiesText,
  historyJSON: () => Core.history,
  historyText: buildHistoryText,
  // BACKUP GLOBAL tout-en-un
  fullBackup: () => ({
    _guardianBackup: true,
    version: GUARDIAN_VERSION,
    project: CFG.project,
    exportedAt: new Date().toISOString(),
    config: CFG,
    capabilities: describeCapabilities(),
    history: Core.history,
    lastResults: Core.results,
    lastRun: Core.lastRun,
    mode: Core.mode
  })
};

Core.import = {
  // importer un backup global ou une config seule
  fromObject: (obj) => {
    if(!obj || typeof obj!=='object') return { ok:false, msg:'objet invalide' };
    if(obj._guardianBackup){
      if(obj.history && Array.isArray(obj.history)){ Core.history = obj.history; saveHistory(); }
      if(obj.config){ try { localStorage.setItem(CONFIG_OVERRIDE_KEY, JSON.stringify(obj.config)); } catch(e){} }
      return { ok:true, msg:'Backup importé (config + historique). Recharge pour appliquer la config.' };
    }
    if(obj.project || obj.storage){ // ressemble à une config
      try { localStorage.setItem(CONFIG_OVERRIDE_KEY, JSON.stringify(obj)); } catch(e){}
      return { ok:true, msg:'Config importée. Recharge pour l\'appliquer.' };
    }
    return { ok:false, msg:'format non reconnu' };
  }
};

/* sauvegarde de l'historique à chaque run */
const _origRunAll = Core.runAll;
Core.runAll = async function(){ const r = await _origRunAll.apply(this, arguments); saveHistory(); return r; };

/* ============================================================
   BACKUP AUTO (v1.1) — sauvegarde l'état AURA dans une base IDB
   dédiée, toutes les N heures, avec rotation. Lit l'état, ne le
   modifie JAMAIS. Base séparée → aucun risque pour AURA.
   ============================================================ */
const AB = {
  DB: 'aura_auto_backups',
  STORE: 'backups',
  META_KEY: 'guardian_autobackup_meta',   // localStorage : {lastRun, intervalH, maxAgeH, enabled}
  defaults: { enabled: true, intervalH: 3, maxAgeH: 24 }
};
function abGetMeta(){
  try { const m = JSON.parse(localStorage.getItem(AB.META_KEY)); if(m && typeof m==='object') return Object.assign({}, AB.defaults, m); } catch(e){}
  return Object.assign({}, AB.defaults);
}
function abSetMeta(m){ try { localStorage.setItem(AB.META_KEY, JSON.stringify(m)); } catch(e){} }

function abOpen(){
  return new Promise(resolve=>{
    let req; try { req = indexedDB.open(AB.DB, 1); } catch(e){ return resolve(null); }
    if(!req) return resolve(null);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(AB.STORE)) db.createObjectStore(AB.STORE, { keyPath:'id', autoIncrement:true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    setTimeout(()=>resolve(null), 4000);
  });
}
// récupère un snapshot complet d'AURA (buildSnapshot si dispo, sinon copie de S)
function abGrabState(){
  try { if(typeof window.buildSnapshot === 'function'){ const s = window.buildSnapshot(); if(s) return s; } } catch(e){}
  const S = getLiveS();
  if(!S) return null;
  try { return JSON.parse(JSON.stringify(S)); } catch(e){ return null; }
}
// fait un backup maintenant (force=true ignore l'intervalle)
async function abRun(force){
  const meta = abGetMeta();
  if(!meta.enabled && !force) return { ok:false, reason:'désactivé' };
  const now = Date.now();
  const intervalMs = meta.intervalMin ? meta.intervalMin*60000 : (meta.intervalH||3)*3600000;
  if(!force && meta.lastRun && (now - meta.lastRun) < intervalMs){
    return { ok:false, reason:'intervalle non écoulé' };
  }
  // [CHRONO · 08/08/2026] annonce l'op (sonde longtask de 08) + mesure abGrabState
  try { if (typeof window !== 'undefined' && window._perfOp) window._perfOp('guardianAutoBackup'); } catch(e){}
  const _abT0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const snap = abGrabState();
  const _abMs = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - _abT0);
  try {
    if (_abMs > 800) {
      const S0 = getLiveS();
      if (S0 && S0.chainLog) {
        S0.chainLog.push({ icon:'⏱', desc:'LENT: backup auto Guardian (snapshot ' + (_abMs/1000).toFixed(1) + 's)', hash:Math.random().toString(36).slice(2,8), time:new Date().toLocaleTimeString() });
        if (S0.chainLog.length > 100) S0.chainLog.splice(0, S0.chainLog.length - 100);
      }
    }
  } catch(e){}
  if(!snap || typeof snap.cycle !== 'number'){ return { ok:false, reason:'état AURA indisponible' }; }
  const db = await abOpen();
  if(!db){ return { ok:false, reason:'IDB inaccessible' }; }
  const rec = { ts: now, date: new Date().toISOString(), cycle: snap.cycle,
                portfolio: snap.portfolio, snapshot: snap };
  // écrire + rotation
  return await new Promise(resolve=>{
    try {
      const tx = db.transaction(AB.STORE, 'readwrite');
      const store = tx.objectStore(AB.STORE);
      store.add(rec);
      // [FIX GEL 08/08/2026 · coupable prouvé par la sonde longtask] L'ancienne rotation
      // faisait store.getAll() : TOUS les backups (chacun = un état complet ~1,4 Mo) étaient
      // désérialisés en UNE SEULE tâche → longtask 7-13 s à chaque backup auto (gels « op
      // guardianAutoBackup »). Remplacée par un CURSEUR : un enregistrement par tâche, le
      // thread respire entre chaque. Les ids étant auto-incrémentés (= chronologiques), on
      // s'arrête au premier enregistrement à conserver. Plafond de sécurité : 16 backups max
      // (nominal 24h/3h = 8), les plus vieux partent d'abord.
      const maxAgeMs = (meta.maxAgeH || 24) * 3600000;
      const cutoff = now - maxAgeMs;
      const KEEP_MAX = 16;
      const cntReq = store.count();
      cntReq.onsuccess = () => {
        let toDrop = Math.max(0, (cntReq.result || 0) - KEEP_MAX);
        const cur = store.openCursor();   // ids croissants = du plus vieux au plus récent
        cur.onsuccess = () => {
          const c = cur.result;
          if (!c) return;
          const v = c.value;
          if (toDrop > 0 || (v && v.ts && v.ts < cutoff)) {
            if (toDrop > 0) toDrop--;
            try { c.delete(); } catch(e){}
            try { c.continue(); } catch(e){}
          }
          // sinon : premier enregistrement à garder → tous les suivants sont plus récents, stop.
        };
      };
      tx.oncomplete = () => {
        meta.lastRun = now; abSetMeta(meta);
        try{db.close();}catch(e){}
        resolve({ ok:true, cycle: snap.cycle });
      };
      tx.onerror = () => { try{db.close();}catch(e){} resolve({ ok:false, reason:'écriture échouée' }); };
    } catch(e){ try{db.close();}catch(x){} resolve({ ok:false, reason:e.message }); }
  });
}
// liste les backups (métadonnées, sans le gros snapshot)
async function abList(){
  const db = await abOpen(); if(!db) return [];
  return await new Promise(resolve=>{
    try {
      // [FIX GEL 08/08/2026] même bombe que la rotation : getAll() désérialisait tous les
      // états complets d'un coup pour n'en garder que les métadonnées. Curseur : un
      // enregistrement par tâche, mêmes métadonnées, aucun bloc monolithique.
      const tx = db.transaction(AB.STORE, 'readonly');
      const cur = tx.objectStore(AB.STORE).openCursor();
      const list = [];
      cur.onsuccess = () => {
        const c = cur.result;
        if (c) {
          const x = c.value || {};
          list.push({ id:x.id, ts:x.ts, date:x.date, cycle:x.cycle, portfolio:x.portfolio });
          try { c.continue(); } catch(e){ resolve(list); }
          return;
        }
        list.sort((a,b)=>b.ts-a.ts);
        try{db.close();}catch(e){}
        resolve(list);
      };
      cur.onerror = () => { try{db.close();}catch(e){} resolve([]); };
    } catch(e){ resolve([]); }
  });
}
// récupère le snapshot complet d'un backup par id
async function abGet(id){
  const db = await abOpen(); if(!db) return null;
  return await new Promise(resolve=>{
    try {
      const r = db.transaction(AB.STORE,'readonly').objectStore(AB.STORE).get(id);
      r.onsuccess = () => { try{db.close();}catch(e){} resolve(r.result || null); };
      r.onerror = () => { try{db.close();}catch(e){} resolve(null); };
    } catch(e){ resolve(null); }
  });
}
// vide TOUS les backups locaux (le Drive garde l'historique)
async function abClear(){
  const db = await abOpen(); if(!db) return { ok:false, reason:'IDB inaccessible' };
  return await new Promise(resolve=>{
    try {
      const tx = db.transaction(AB.STORE,'readwrite');
      tx.objectStore(AB.STORE).clear();
      tx.oncomplete = () => { try{db.close();}catch(e){} resolve({ ok:true }); };
      tx.onerror = () => { try{db.close();}catch(e){} resolve({ ok:false, reason:'échec' }); };
    } catch(e){ try{db.close();}catch(x){} resolve({ ok:false, reason:e.message }); }
  });
}

Core.autoBackup = {
  run: abRun,
  list: abList,
  get: abGet,
  clear: abClear,
  getMeta: abGetMeta,
  setMeta: abSetMeta,
  // à appeler périodiquement (depuis l'embed/la page) : fait un backup si l'intervalle est écoulé
  tick: () => abRun(false)
};


Core.version = GUARDIAN_VERSION;
Core.getLiveS = getLiveS;
Core.codeCached = function(){ return !!_codeReport; };   // [GEL BOOT 11/09] l'embed rend l'état d'abord si le code n'est pas encore en cache
Core.detectMode = detectMode;
Core.describeCapabilities = describeCapabilities;

/* ════════════════════════════════════════════════════════════════════
   TÉLÉCHARGEMENT AUTO DES DONNÉES PROPRES DE GUARDIAN
   Guardian télécharge UN SEUL fichier complet : état d'AURA (snapshot live ou
   dernier backup IDB) + données propres de Guardian (santé, contrôles, config).
   Fichier aura_guardian_full_AAAAMMJJ-HHMMSS.json (nom unique) dans Téléchargements.
   Survit au vidage du cache. La synchro Android (DriveSync) l'envoie vers le Drive.
   AURA et Guardian doivent tourner dans le même navigateur (Chrome).
   ════════════════════════════════════════════════════════════════════ */
(function(){
  const GDL_KEY = 'guardian_datadl_meta';
  // défaut : ACTIVÉ, toutes les 3h
  function getMeta(){ try { const m = JSON.parse(localStorage.getItem(GDL_KEY)); if(m) return m; } catch(e){} return { enabled:true, everyMin:180, last:0 }; }
  function setMeta(m){ try { localStorage.setItem(GDL_KEY, JSON.stringify(m)); } catch(e){} }
  // données propres de Guardian
  function grabGuardianData(){
    const g = {};
    try { g.history = Core.history || []; } catch(e){ g.history = []; }
    try { g.lastResults = Core.results || []; } catch(e){ g.lastResults = []; }
    try { g.lastRun = Core.lastRun || null; } catch(e){}
    try { const cfg = localStorage.getItem('guardian_config_override'); if(cfg) g.configOverride = JSON.parse(cfg); } catch(e){}
    return g;
  }
  // assemble le backup complet : AURA + Guardian
  // Lecture autonome de l'état complet d'AURA depuis IndexedDB (NEXUS_DB / store state).
  // L'état complet (~1.7 Mo, agents inclus) y vit ; le localStorage n'a qu'une version
  // allégée (sans agents). On lit donc IDB en priorité pour un backup full digne de ce nom.
  function _readAuraFromIDB(){
    return new Promise(resolve=>{
      let req; try { req = indexedDB.open('NEXUS_DB'); } catch(e){ return resolve(null); }
      if(!req){ return resolve(null); }
      req.onerror = ()=>resolve(null);
      req.onsuccess = ()=>{
        const db = req.result;
        try {
          if(!db.objectStoreNames.contains('state')){ resolve(null); return; }
          const tx = db.transaction('state','readonly');
          const g = tx.objectStore('state').get('nexus_state_v2');
          g.onsuccess = ()=>{
            let v = g.result;
            // le store peut renvoyer l'objet directement ou enveloppé { key, value }
            if(v && v.value && typeof v.value === 'object') v = v.value;
            resolve(v && typeof v === 'object' ? v : null);
          };
          g.onerror = ()=>resolve(null);
        } catch(e){ resolve(null); }
      };
      setTimeout(()=>resolve(null), 4000);
    });
  }

  async function grabFull(){
    let auraSnap = null;
    let _srcTag = 'aucune';
    // 1. État live (si Guardian est embarqué dans la page AURA)
    try { if(typeof abGrabState === 'function') auraSnap = abGrabState(); if(auraSnap) _srcTag = 'live'; } catch(e){}
    // 2. IndexedDB : l'état COMPLET (agents inclus). Priorité pour un vrai backup.
    if(!auraSnap || typeof auraSnap.cycle !== 'number' || !(auraSnap.agents && auraSnap.agents.length)){
      try { const idb = await _readAuraFromIDB(); if(idb && typeof idb.cycle === 'number'){ auraSnap = idb; _srcTag = 'idb'; } } catch(e){}
    }
    // 3. Dernier recours : localStorage allégé (clé nexus_state_v2), partagé entre
    //    onglets du même navigateur. Mieux que rien si IDB est inaccessible.
    if(!auraSnap || typeof auraSnap.cycle !== 'number'){
      try {
        const key = (CFG && CFG.storage && CFG.storage.saveKey) || 'nexus_state_v2';
        const raw = localStorage.getItem(key);
        if(raw){ const parsed = JSON.parse(raw); if(parsed && typeof parsed === 'object'){ auraSnap = parsed; _srcTag = 'ls-light'; } }
      } catch(e){}
    }
    const cyc = auraSnap && typeof auraSnap.cycle === 'number' ? auraSnap.cycle
              : (auraSnap && auraSnap.state && auraSnap.state.cycle) || null;
    return {
      _type: 'aura_guardian_full',
      version: GUARDIAN_VERSION,
      savedAt: new Date().toISOString(),
      auraCycle: cyc,
      // ★ PONT CLAUDE · tracabilite : d'ou vient ce snapshot + sa date interne.
      auraSource: _srcTag,
      auraSavedAt: (auraSnap && auraSnap.savedAt) || null,
      aura: auraSnap,            // état complet d'AURA (null si AURA jamais ouverte dans ce navigateur)
      guardian: grabGuardianData()
    };
  }
  async function download(fixedName, preData){
    try {
      const data = preData || await grabFull();
      // ⛔ GARDE ANTI-PÉRIMÉ DURE [04/08/2026] — source unique, couvre TOUS les exports
      // (backup auto, bouton ⬇ Backup, Export pour Claude). Un Guardian ouvert dans le
      // MAUVAIS navigateur (ex. Chrome avec l'instance figée du 28/07, cycle 65153) a
      // produit 4 fois des dumps piégés horodatés du jour mais au contenu mort.
      // Règle : l'app native sauve son état toutes les ~25 s ; si l'état lisible ici a
      // plus de 30 min (ou pas de walletStore), ce navigateur n'héberge PAS l'app
      // vivante → export REFUSÉ net (pas de confirm contournable), rien n'est écrit.
      {
        const _a = data && data.aura;
        let _stale = null;
        if(!_a) _stale = "AURA n'a jamais tourné dans ce navigateur.";
        else {
          const _ts = Date.parse(_a.savedAt || '') || 0;
          const _age = _ts ? Math.round((Date.now() - _ts)/60000) : null;
          if(!_a.walletStore) _stale = 'état ancien sans walletStore (' + String(_a.savedAt||'?').slice(0,10) + ')';
          else if(_age === null || _age > 30) _stale = 'état sauvé il y a ' + (_age===null?'?':_age+' min') + ' · cycle ' + (data.auraCycle||'?');
        }
        if(_stale){
          try { alert('⛔ Export REFUSÉ — ' + _stale + '\n\nCeci n\'est PAS l\'app vivante (elle sauve toutes les ~25 s).\nFais l\'export depuis le bouclier Guardian DANS l\'app native.'); } catch(e){}
          return false;
        }
      }
      const dt = new Date(); const pad = n => (n<10?'0':'')+n;
      const stamp = dt.getFullYear()+pad(dt.getMonth()+1)+pad(dt.getDate())+'-'+pad(dt.getHours())+pad(dt.getMinutes())+pad(dt.getSeconds());
      const fname = fixedName || ('aura_guardian_full_' + stamp + '.json');
      // [CHRONO · 08/08/2026] annonce l'op + mesure la sérialisation ; taille tracée
      try { if (typeof window !== 'undefined' && window._perfOp) window._perfOp('guardianDownload'); } catch(e){}
      const _gdT0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const json = JSON.stringify(data);
      try {
        const _gdMs = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - _gdT0);
        if (_gdMs > 800) {
          const S1 = getLiveS();
          if (S1 && S1.chainLog) {
            S1.chainLog.push({ icon:'⏱', desc:'LENT: export Guardian (stringify ' + (_gdMs/1000).toFixed(1) + 's · ' + Math.round(json.length/1024) + 'Ko)', hash:Math.random().toString(36).slice(2,8), time:new Date().toLocaleTimeString() });
            if (S1.chainLog.length > 100) S1.chainLog.splice(0, S1.chainLog.length - 100);
          }
        }
      } catch(e){}
      // 1) ECRITURE NATIVE d'abord (reutilise _fsWriteBackup de 09b3, deja prouvee sur cet
      //    appareil : les nexus_save_* atterrissent bien dans Download/AURA). Le nom
      //    aura_guardian_full_* correspond au filtre DriveSync -> part sur le Drive.
      //    L'ancien blob <a>.click() ne se declenche pas dans le WebView natif : il
      //    retournait true sans rien ecrire, et l'auto-backup se croyait a jour.
      if (typeof window._fsWriteBackup === 'function') {
        try {
          const fsRes = await window._fsWriteBackup(json, fname);
          if (fsRes) {
            try { const S0 = getLiveS(); if (S0 && S0.chainLog) { S0.chainLog.push({ icon:'\ud83d\udee1', desc:'Backup Guardian ecrit (natif) : '+fname, hash:Math.random().toString(36).slice(2,8), time:new Date().toLocaleTimeString() }); if (S0.chainLog.length>100) S0.chainLog.splice(0,S0.chainLog.length-100); } } catch(e){}
            return true;
          }
        } catch(e){}
      }
      // 2) Repli navigateur : blob (fonctionne dans Chrome, pas dans le WebView natif)
      const blob = new Blob([json], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click();
      setTimeout(()=>{ try{document.body.removeChild(a);}catch(e){} try{URL.revokeObjectURL(url);}catch(e){} }, 100);
      // en natif sans _fsWriteBackup, le blob est silencieusement ignore : ne pas
      // pretendre au succes (sinon meta.last avance sans fichier).
      const isNative = !!(window.Capacitor || window.cordova);
      return !isNative;
    } catch(e){ return false; }
  }
  function tick(){
    try {
      const m = getMeta();
      if(!m.enabled) return;
      const now = Date.now();
      // premier passage (last=0) : on amorce le compteur sans télécharger,
      // pour ne PAS déclencher un téléchargement dès l'ouverture de Guardian.
      if(!m.last){ m.last = now; setMeta(m); return; }
      if((now - m.last) < m.everyMin*60000) return;
      download().then(ok=>{ if(ok){ m.last = now; setMeta(m); } });
    } catch(e){}
  }
  if(window._gdlTimer) clearInterval(window._gdlTimer);
  window._gdlTimer = setInterval(tick, 60000);
  Core.dataDownload = {
    getMeta, setMeta, tick,
    enable: (everyMin)=>{ const m=getMeta(); m.enabled=true; m.everyMin=everyMin||180; setMeta(m); },
    disable: ()=>{ const m=getMeta(); m.enabled=false; setMeta(m); },
    now: ()=>{ return download(); },
    // Export pour Claude : identique au backup complet, nom FIXE 'aura_live.json'.
    // [04/08/2026] la garde anti-périmé vit désormais DANS download() (dure, non
    // contournable, couvre aussi le backup auto et le bouton ⬇ Backup) — l'ancien
    // confirm() « exporter quand même ? » laissait passer le piège en un tap.
    forClaude: async ()=>{ return download('aura_live.json'); }
  };
})();

window.GuardianCore = Core;
})();
