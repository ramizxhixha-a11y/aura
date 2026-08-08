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

/* SONDE 8 — Fichiers : lit le VRAI HTML pour la liste réelle (Niveau 1 intelligent) */
async function probeFiles(){
  const out=[];
  let html=null;
  try { const r = await fetch(CFG.appUrl,{cache:'no-store'}); if(r.ok) html = await r.text(); } catch(e){}
  if(!html){
    out.push(R('info','Fichiers','Impossible de lire '+CFG.appUrl,'Lance Guardian depuis la même origine que l\'app (GitHub Pages).',''));
    return { results: out, declared: [] };
  }
  // extraire les <script src> et <link href>
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
  const links   = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/gi)].map(m=>m[1]);
  const declared = scripts.concat(links).filter(u=>!/^https?:/.test(u));
  // tester chacun
  const tested = await Promise.all(declared.map(async u=>{
    const clean = u.split('?')[0];
    let ok=false,status=0; try { const r=await fetch(clean,{cache:'no-store'}); ok=r.ok; status=r.status; } catch(e){}
    return { url:clean, ok, status };
  }));
  const missing = tested.filter(t=>!t.ok);
  if(missing.length===0){
    out.push(R('ok','Fichiers','Tous les fichiers déclarés répondent', tested.length+' fichiers (script+css) tous en HTTP 200.',''));
  } else {
    missing.forEach(m=>{
      out.push(R('crit','Fichiers','⚠ Déclaré mais absent : '+m.url.split('/').pop(),
        'Le HTML charge '+m.url+' (HTTP '+(m.status||0)+') mais le fichier est introuvable. C\'est une vraie alerte car le système l\'appelle.',
        'Soit uploader le fichier, soit retirer sa balise du HTML s\'il est inutile.'));
    });
  }
  return { results: out, declared, tested };
}

/* SONDE 9 — Fonctions critiques : définie ? appelée ? (Niveau 2)
   nécessite de scanner le code des fichiers déclarés */
async function probeFunctions(declared){
  const out=[];
  if(!declared || !declared.length){ return out; }
  const jsFiles = declared.filter(u=>u.endsWith('.js'));
  // télécharger tout le code JS (concaténé) une fois
  let allCode=''; const perFile={};
  for(const u of jsFiles){
    try { const r=await fetch(u.split('?')[0],{cache:'no-store'}); if(r.ok){ const t=await r.text(); perFile[u]=t; allCode+='\n'+t; } } catch(e){}
  }
  if(!allCode){ return out; }
  // Détection robuste : on cherche sur le code BRUT (le strip de chaînes sur du gros JS
  // est trop fragile et avalait des portions de code). Une vraie définition "function X("
  // dans un commentaire est rarissime et sans conséquence.
  for(const fn of (CFG.criticalFunctions||[])){
    const defRe = new RegExp('(function\\s+'+fn+'\\b|\\b'+fn+'\\s*=\\s*function|\\b'+fn+'\\s*=\\s*async\\s+function|\\b'+fn+'\\s*:\\s*function|window\\.'+fn+'\\s*=)');
    const defined = defRe.test(allCode);
    const callRe = new RegExp('\\b'+fn+'\\s*\\(','g');
    const calls = (allCode.match(callRe)||[]).length;
    if(defined && calls>1){ /* ok */ }
    else if(!defined && calls>0){
      out.push(R('crit','Fonctions','⚠ '+fn+'() appelée mais jamais définie',
        'Appelée '+calls+'× dans le code chargé mais aucune définition trouvée → ReferenceError au runtime.',
        'Définir '+fn+' ou corriger le nom. Cherche son fichier d\'origine.'));
    }
    else if(defined && calls<=1){
      out.push(R('warn','Fonctions',''+fn+'() définie mais peu/pas appelée',
        'Trouvée mais '+calls+' appel(s). Soit code mort, soit appelée dynamiquement.',
        'Vérifier si '+fn+' est encore utile.'));
    }
  }
  if(!out.length) out.push(R('ok','Fonctions','Fonctions critiques OK','Toutes définies et appelées.',''));
  return { results: out, perFile, allCode };
}

/* SONDE 10 — Variables non définies (Niveau 3, ex. le bug DB_NAME) */
function probeUndefinedVars(perFile){
  const out=[];
  if(!perFile){ return out; }
  // Approche CIBLÉE et fiable : on ne scanne pas tous les mots majuscules (trop de bruit
  // avec les chaînes), on vérifie une liste précise de constantes système critiques —
  // exactement le type de bug qu'on veut attraper (ex. DB_NAME is not defined).
  const WATCH = (CFG.watchedConstants || ['DB_NAME','SAVE_KEY','STORE','DB_VERSION','STORE_STATE','STORE_TRADES','STORE_FEES']);
  let allCode=''; for(const f of Object.keys(perFile)){ allCode+='\n'+perFile[f]; }
  for(const f of Object.keys(perFile)){
    const code = perFile[f];
    for(const v of WATCH){
      // utilisée dans CE fichier comme variable (pas en chaîne/clé) : open(DB_NAME, X) etc.
      const usedRe = new RegExp('[^\\w\'"\\.]'+v+'\\s*(\\)|,|;|\\.|\\]|\\s*[=<>+])');
      if(!usedRe.test(code)) continue;
      // définie/importée dans CE fichier ? (const/let/var/RT.X/window.X/= X)
      const declHere = new RegExp('(const|let|var)\\s+'+v+'\\b|(RT|window)\\.'+v+'\\b|'+v+'\\s*=\\s*[\'"]').test(code);
      if(declHere) continue;
      // définie ailleurs ET exposée globalement (window./RT.) ?
      const globalElsewhere = new RegExp('(window|RT|globalThis)\\.'+v+'\\s*=').test(allCode);
      if(globalElsewhere) continue;
      // sinon : utilisée mais pas définie localement ni exposée → vrai risque type DB_NAME
      out.push(R('warn','Variables','Constante possiblement non définie : '+v,
        'Utilisée dans '+f.split('/').pop()+' mais ni déclarée localement, ni exposée globalement (window./RT.). Risque de ReferenceError (comme le bug DB_NAME du 01/06).',
        'Dans '+f.split('/').pop()+' : déclarer '+v+' localement, ou utiliser RT.'+v+' si elle vient de 09a-runtime-state.'));
    }
  }
  return out;
}

/* SONDE 11 — Doublons de fonctions (définie dans 2 fichiers) */
function probeDuplicates(perFile){
  const out=[];
  if(!perFile) return out;
  function strip(src){
    return src.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
  }
  for(const fn of (CFG.criticalFunctions||[])){
    const files=[];
    for(const f of Object.keys(perFile)){
      const code = strip(perFile[f]);
      // vraie définition : function X(  ou  X = function  ou  X: function
      if(new RegExp('function\\s+'+fn+'\\s*\\(|\\b'+fn+'\\s*=\\s*function|\\b'+fn+'\\s*:\\s*function').test(code)) files.push(f.split('/').pop());
    }
    if(files.length>1){
      out.push(R('warn','Doublons','⚠ '+fn+'() définie dans '+files.length+' fichiers',
        files.join(', ')+' → risque de conflit (la dernière chargée gagne).',
        'Garder une seule définition de '+fn+'.'));
    }
  }
  if(!out.length) out.push(R('ok','Doublons','Pas de doublon de fonction critique','',''));
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

/* SONDE GEL / LAG — lit les traces 🐌 écrites par le moniteur de simTick dans le chainLog
   (live, dans l'app) et en déduit la cause du lag + la correction à appliquer. */
function probeGel(snap){
  const out = [];
  const S = snap.S;
  const cl = (S && Array.isArray(S.chainLog)) ? S.chainLog : [];
  const gels = [];
  cl.forEach(function(e){
    const d = String(e && e.desc || '');
    let m;
    if((m = d.match(/^Gel ([\d.]+)s .*?tick (\d+)ms .*?(ecran (?:visible|masque))(.*)$/))){
      const r = m[4] || '';
      const heap = r.match(/heap (\d+)\/(\d+)Mo/);
      const dom  = r.match(/dom (\d+)/);
      const page = r.match(/page (\S+)/);
      const ws   = r.match(/ws \+(\d+)/);
      const js  = r.match(/JS ⏱ ([\d.]+)s\/(\d+)/);
      const op  = r.match(/· op (\S+)/);
      gels.push({ gap:parseFloat(m[1]), tickMs:parseInt(m[2],10), visible:/visible/.test(m[3]),
        heapU:heap?parseInt(heap[1],10):null, heapL:heap?parseInt(heap[2],10):null,
        dom:dom?parseInt(dom[1],10):null, page:page?page[1]:null, ws:ws?parseInt(ws[1],10):null,
        jsSum:js?parseFloat(js[1]):null, op:op?op[1]:null, osIdle:/JS inactif/.test(r) });
    }
  });
  if(!gels.length){
    out.push(R('ok','Gel / Lag','Aucun gel récent','Le journal ne contient aucune trace 🐌 récente.',''));
    return out;
  }
  const vis  = gels.filter(function(g){return g.visible;});
  const mask = gels.filter(function(g){return !g.visible;});
  const maxVis = vis.reduce(function(a,g){return Math.max(a,g.gap);},0);
  out.push(R('info','Gel / Lag','Relevé',
    gels.length+' gels ('+vis.length+' écran visible, '+mask.length+' écran masqué) · pire blocage visible '+maxVis.toFixed(1)+'s',''));
  if(vis.length === 0){
    out.push(R('warn','Gel / Lag','Gels uniquement écran masqué',
      'Android suspend les timers du WebView en arrière-plan. Ce n\'est pas un bug de code.',
      'Garder l\'écran allumé (Wake Lock déjà posé) + Réglages Samsung : retirer AURA de la mise en veille des applis et de l\'optimisation batterie.'));
    return out;
  }
  const wsMax  = vis.reduce(function(a,g){return Math.max(a,g.ws||0);},0);
  const domMax = vis.reduce(function(a,g){return Math.max(a,g.dom||0);},0);
  const heapHi = vis.some(function(g){return g.heapU && g.heapL && (g.heapU/g.heapL)>0.85;});
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
  const jsGels = vis.filter(function(g){ return g.jsSum != null; });
  const osGels = vis.filter(function(g){ return g.osIdle; });
  if(jsGels.length){
    const named = jsGels.filter(function(g){ return g.op; });
    const opTxt = named.length ? (' · opération nommée : ' + named.map(function(g){ return g.op; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).join(', ')) : ' · aucune opération marquée (_perfOp) dans la fenêtre';
    out.push(R('crit','Gel / Lag','Blocage JS confirmé par longtask ('+jsGels.length+' gel(s))',
      'La sonde longtask a mesuré du JS bloquant pendant le(s) trou(s)'+opTxt+'.',
      named.length ? 'Corriger l\'opération nommée (livrer le fix à Claude avec cette ligne de gel).' : 'Ajouter des marqueurs _perfOp sur les prochaines fonctions suspectes pour la nommer.'));
    return out;
  }
  if(osGels.length && osGels.length === vis.length){
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
      'Câbler le backup FULL sur ' + fileMethods[0] + ' avec cible « Download » public : FolderSync le verra et l\'enverra sur Drive.'));
  } else {
    out.push(R('crit', G, 'CAUSE : aucune méthode fichier native dans l\'APK',
      'App native SANS plugin fichier. Le backup retombe sur un download blob <a>.click() qui NE SE DÉCLENCHE PAS dans le WebView Capacitor → aucun fichier écrit → rien à synchroniser → « ça ne sauvegarde plus sur Drive ».',
      'Ajouter un plugin fichier à l\'APK (recommandé : @capgo/capacitor-file-sharer, saveDirectory:\'downloads\', sans permission sur Android 10+), puis je câble le backup dessus. Sans plugin, le JS seul ne peut pas écrire dans Download.'));
  }
  return out;
}

Core.runAll = async function(){
  const snap = await loadStateSnapshot();
  const mode = detectMode();
  let res = [];
  res = res.concat(probeCoherence(snap));
  res = res.concat(probeSanity(snap));
  res = res.concat(probeGel(snap));
  res = res.concat(probeBackupCapability(snap));
  res = res.concat(await probeStorageSync(snap));
  res = res.concat(probeSaveFresh(snap));
  res = res.concat(probeJsErrors());
  res = res.concat(probeLearning(snap));
  res = res.concat(probeQuota());
  res = res.concat(await probeIdbHealth());
  const pf = await probeFiles();
  res = res.concat(pf.results);
  const fn = await probeFunctions(pf.declared);
  if(fn.results) res = res.concat(fn.results);
  res = res.concat(probeUndefinedVars(fn.perFile));
  res = res.concat(probeDuplicates(fn.perFile));

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
      // rotation par âge : supprimer tout backup plus vieux que maxAgeH (défaut 24h)
      const maxAgeMs = (meta.maxAgeH || 24) * 3600000;
      const cutoff = now - maxAgeMs;
      const allRec = store.getAll();
      allRec.onsuccess = () => {
        (allRec.result || []).forEach(r => {
          if(r && r.ts && r.ts < cutoff){ try { store.delete(r.id); } catch(e){} }
        });
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
      const tx = db.transaction(AB.STORE, 'readonly');
      const r = tx.objectStore(AB.STORE).getAll();
      r.onsuccess = () => {
        const list = (r.result||[]).map(x=>({ id:x.id, ts:x.ts, date:x.date, cycle:x.cycle, portfolio:x.portfolio }));
        list.sort((a,b)=>b.ts-a.ts);
        try{db.close();}catch(e){}
        resolve(list);
      };
      r.onerror = () => { try{db.close();}catch(e){} resolve([]); };
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
