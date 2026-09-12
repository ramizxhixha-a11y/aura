// banc-gel-guardian.js — [GEL BOOT · 12/09/2026] VERSION 20260912b (token lu dans le HTML ; core 20260912b : affichage LoAF corrigé + jointure ⏱ LENT / « au boot » (_loafLent / _loafBootAge) ; embed inchangé ; contrat mis à jour : code = ouverture / Relancer uniquement, jamais au boot ni en scan silencieux ; sonde réseau = groupe « Fichiers (réseau) »)
// (édition 20260909a : oracle des sondes de code, un fetch par fichier, respiration, toasts)
// Banc AUTONOME (node banc-gel-guardian.js depuis la racine du dépôt). Vérifie que les sondes de
// code du Guardian (fichiers / fonctions / variables / doublons) donnent EXACTEMENT les mêmes
// résultats que l'ancienne logique d'analyse (oracle inliné ci-dessous) appliquée aux sources —
// l'ancien code ne les atteignait JAMAIS en production : son filtre endsWith('.js') portait sur
// l'URL brute (js/x.js?v=token) → liste vide, sondes muettes depuis les tokens. Et que tout cela
// tourne une fois par session, un fetch par fichier, une respiration entre fichiers, op nommée.
// Vérifie aussi l'embed : ouverture = état frais (code en cache), Relancer = code refait,
// backup/JSON = toast (jamais de boîte modale alert), scan silencieux sans argument.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname;
const TOK = (function(){ const m = require('fs').readFileSync(require('path').join(__dirname, 'AURA8_v118.html'), 'utf8').match(/DOC_V = '(\d{8}[a-z])'/); if (!m) { console.error('DOC_V introuvable dans AURA8_v118.html'); process.exit(2); } return m[1]; })();   // [12/09/2026] token lu dans le HTML (source unique) : plus jamais figé dans un banc
let pass = 0, fail = 0;
async function T(name, fn){ try { await fn(); pass++; console.log('  ✅', name); } catch(e){ fail++; console.log('  ❌', name, '\n     ', (e && e.stack || e).toString().split('\n').slice(0,3).join('\n      ')); } }
process.on('unhandledRejection', e => { fail++; console.log('  ❌ rejet non géré :', e && e.message); });

/* ───── stubs communs ───── */
function mkStorage(){ const o = {}; for (const [k,f] of Object.entries({
  getItem(k){ return Object.prototype.hasOwnProperty.call(o,k) ? o[k] : null; },
  setItem(k,v){ o[k] = String(v); }, removeItem(k){ delete o[k]; } })) Object.defineProperty(o, k, { value:f, enumerable:false }); return o; }
function mkFetch(opts){   // sert les fichiers du dépôt ; opts.fail = url→ 'throw' | statut ; journalise
  const log = [];
  return { log, fetch: async function(url){
    const clean = String(url).split('?')[0];
    log.push(clean);
    if (opts && opts.fail && opts.fail[clean] !== undefined) {
      if (opts.fail[clean] === 'throw') throw new TypeError('Failed to fetch');
      return { ok:false, status:opts.fail[clean], text: async () => '' };
    }
    const p = path.join(ROOT, clean);
    if (!fs.existsSync(p)) return { ok:false, status:404, text: async () => '' };
    return { ok:true, status:200, text: async () => fs.readFileSync(p, 'utf8') };
  } };
}
function loadCore(fetchImpl){
  const ctx = { console, performance, URL, TextDecoder,
    localStorage: mkStorage(), sessionStorage: mkStorage(), fetch: fetchImpl,
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
    addEventListener(){}, removeEventListener(){}, _ops: [] };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx._perfOp = (n) => ctx._ops.push(n);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'guardian-config.js'),'utf8'), ctx, { filename:'guardian-config.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT,'guardian-core.js'),'utf8'), ctx, { filename:'guardian-core.js' });
  return ctx;
}
const norm = (r) => ({ level:r.level, group:r.group, title:r.title, detail:String(r.detail||'').replace(/\?v=\w+/g,''), fix:String(r.fix||'').replace(/\?v=\w+/g,'') });
const CODE_GROUPS = ['Fichiers (réseau)','Fonctions','Variables','Doublons'];
const J = (x) => JSON.parse(JSON.stringify(x));   // objets cross-vm : aller-retour JSON avant deepStrictEqual
const codePart = (res) => J(res).filter(r => CODE_GROUPS.includes(r.group)).map(norm);

/* ───── ORACLE : ancienne implémentation (guardian-core.js ≤ 20260908b), copiée telle quelle ───── */
function oracle(CFG, html, perFileDeclared, exists){
  exists = exists || (clean => fs.existsSync(path.join(ROOT, clean)));
  const R = (level, group, title, detail, fix) => ({ level, group, title, detail:detail||'', fix:fix||'' });
  const out = [];
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
  const links   = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/gi)].map(m=>m[1]);
  const declared = scripts.concat(links).filter(u=>!/^https?:/.test(u));
  const tested = declared.map(u => { const clean=u.split('?')[0]; const ok = exists(clean); return { url:clean, ok, status: ok?200:404 }; });
  const missing = tested.filter(t=>!t.ok);
  if(missing.length===0) out.push(R('ok','Fichiers (réseau)','Tous les fichiers déclarés répondent', tested.length+' fichiers (script+css) tous en HTTP 200.',''));
  else missing.forEach(m=>{ out.push(R('crit','Fichiers (réseau)','⚠ Déclaré mais absent : '+m.url.split('/').pop(), 'Le HTML charge '+m.url+' (HTTP '+(m.status||0)+') mais le fichier est introuvable. C\'est une vraie alerte car le système l\'appelle.', 'Soit uploader le fichier, soit retirer sa balise du HTML s\'il est inutile.')); });
  // probeFunctions
  // filtre .js sur l'URL NETTOYÉE : l'ancien code filtrait l'URL brute (js/x.js?v=…) → jamais aucune source analysée
  const jsFiles = declared.filter(u=>u.split('?')[0].endsWith('.js'));
  let allCode=''; const perFile={};
  for(const u of jsFiles){ const t = perFileDeclared[u.split('?')[0]]; if (t !== undefined) { perFile[u]=t; allCode+='\n'+t; } }
  const fnOut=[];
  for(const fn of (CFG.criticalFunctions||[])){
    const defRe = new RegExp('(function\\s+'+fn+'\\b|\\b'+fn+'\\s*=\\s*function|\\b'+fn+'\\s*=\\s*async\\s+function|\\b'+fn+'\\s*:\\s*function|window\\.'+fn+'\\s*=)');
    const defined = defRe.test(allCode);
    const callRe = new RegExp('\\b'+fn+'\\s*\\(','g');
    const calls = (allCode.match(callRe)||[]).length;
    if(defined && calls>1){ }
    else if(!defined && calls>0){ fnOut.push(R('crit','Fonctions','⚠ '+fn+'() appelée mais jamais définie', 'Appelée '+calls+'× dans le code chargé mais aucune définition trouvée → ReferenceError au runtime.', 'Définir '+fn+' ou corriger le nom. Cherche son fichier d\'origine.')); }
    else if(defined && calls<=1){ fnOut.push(R('warn','Fonctions',''+fn+'() définie mais peu/pas appelée', 'Trouvée mais '+calls+' appel(s). Soit code mort, soit appelée dynamiquement.', 'Vérifier si '+fn+' est encore utile.')); }
  }
  if(!fnOut.length) fnOut.push(R('ok','Fonctions','Fonctions critiques OK','Toutes définies et appelées.',''));
  // probeUndefinedVars
  const WATCH = (CFG.watchedConstants || ['DB_NAME','SAVE_KEY','STORE','DB_VERSION','STORE_STATE','STORE_TRADES','STORE_FEES']);
  const varOut=[];
  { let all=''; for(const f of Object.keys(perFile)){ all+='\n'+perFile[f]; }
    for(const f of Object.keys(perFile)){ const code = perFile[f];
      for(const v of WATCH){
        const usedRe = new RegExp('[^\\w\'"\\.]'+v+'\\s*(\\)|,|;|\\.|\\]|\\s*[=<>+])');
        if(!usedRe.test(code)) continue;
        const declHere = new RegExp('(const|let|var)\\s+'+v+'\\b|(RT|window)\\.'+v+'\\b|'+v+'\\s*=\\s*[\'"]').test(code);
        if(declHere) continue;
        const globalElsewhere = new RegExp('(window|RT|globalThis)\\.'+v+'\\s*=').test(all);
        if(globalElsewhere) continue;
        varOut.push(R('warn','Variables','Constante possiblement non définie : '+v, 'Utilisée dans '+f.split('/').pop()+' mais ni déclarée localement, ni exposée globalement (window./RT.). Risque de ReferenceError (comme le bug DB_NAME du 01/06).', 'Dans '+f.split('/').pop()+' : déclarer '+v+' localement, ou utiliser RT.'+v+' si elle vient de 09a-runtime-state.'));
      } } }
  // probeDuplicates
  const dupOut=[];
  function strip(src){ return src.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' '); }
  for(const fn of (CFG.criticalFunctions||[])){
    const files=[];
    for(const f of Object.keys(perFile)){ const code = strip(perFile[f]);
      if(new RegExp('function\\s+'+fn+'\\s*\\(|\\b'+fn+'\\s*=\\s*function|\\b'+fn+'\\s*:\\s*function').test(code)) files.push(f.split('/').pop()); }
    if(files.length>1) dupOut.push(R('warn','Doublons','⚠ '+fn+'() définie dans '+files.length+' fichiers', files.join(', ')+' → risque de conflit (la dernière chargée gagne).', 'Garder une seule définition de '+fn+'.'));
  }
  if(!dupOut.length) dupOut.push(R('ok','Doublons','Pas de doublon de fonction critique','',''));
  return J(out.concat(fnOut, varOut, dupOut)).map(norm);
}

(async () => {
  console.log('▶ banc-gel-guardian · token', TOK);

  /* ───── statique ───── */
  await T('syntaxe : guardian-core.js, guardian-embed.js compilent', () => {
    for (const f of ['guardian-core.js','guardian-embed.js']) new vm.Script(fs.readFileSync(path.join(ROOT,f),'utf8'), { filename:f });
  });
  await T('core : anciennes sondes retirées, nouvelles présentes, aucun allCode monolithique', () => {
    const s = fs.readFileSync(path.join(ROOT,'guardian-core.js'),'utf8');
    for (const dead of ['probeFiles(','probeFunctions(','probeUndefinedVars(','probeDuplicates(','allCode']) assert.ok(!s.includes(dead), 'résidu '+dead);
    for (const live of ['async function probeCode(','async function analyseCode(','async function fetchDeclared(','function _breathe(','opts.refreshCode === true','let _codeReport = null']) assert.strictEqual(s.split(live).length, 2, live);
    assert.strictEqual(s.split("_guardianOp('guardianScan')").length, 4, 'guardianScan annoncé 3 fois (runAll, probeCode, par fichier)');
    assert.ok(s.startsWith('// [GEL BOOT · 12/09/2026] VERSION 20260912b'));   // core : affichage LoAF (bloqueur = script le plus long, ≥ 50 % de la frame ; frames antérieures au boot séparées) + [20260912b] jointure ⏱ LENT / « au boot »
    assert.strictEqual(s.split('function _loafLent(').length, 2); assert.strictEqual(s.split('_loafLent(').length, 3, '_loafLent : 1 déclaration + 1 usage'); assert.strictEqual(s.split('_loafBootAge(').length, 3, '_loafBootAge : 1 déclaration + 1 usage');
    assert.strictEqual(s.split('function _loafTop(').length, 2); assert.strictEqual(s.split('_loafTop(').length, 5, '_loafTop : 1 déclaration + 3 usages'); assert.ok(!s.includes('scripts[0]'), 'scripts[0] résiduel');
  });
  await T('embed : plus aucune boîte modale alert, Relancer refait le code, ouverture = code demandé (cache ou 1er fetch), rien au boot', () => {
    const s = fs.readFileSync(path.join(ROOT,'guardian-embed.js'),'utf8');
    assert.strictEqual(s.split('alert(').length, 1, 'alert( résiduel');
    assert.strictEqual(s.split("onclick=()=>run(true);").length, 2);
    assert.strictEqual(s.split("if(a==='reload') return run(true);").length, 2);
    assert.strictEqual(s.split("fab.onclick=()=>{ ov.classList.add('open'); run(); };").length, 2);
    assert.strictEqual(s.split("G.runAll({ code:true, refreshCode: refreshCode === true })").length, 2);
    assert.strictEqual(s.split("window.GuardianCore.runAll().then(rep=>{").length, 2, 'scan silencieux sans argument');
    assert.ok(!s.includes('setTimeout(_gdnSilentScan') && !s.includes('setTimeout(tick'), 'travail Guardian au boot');
    assert.ok(s.startsWith('// [GEL BOOT · 11/09/2026] VERSION 20260911a'));   // embed inchangé depuis la livraison a
  });
  await T('HTML : DOC_V = ' + TOK + ' et tous les ?v= au même token (79)', () => {
    const h = fs.readFileSync(path.join(ROOT,'AURA8_v118.html'),'utf8');
    assert.ok(h.includes("DOC_V = '" + TOK + "'"));
    assert.strictEqual((h.match(/\?v=[0-9a-z]+/g)||[]).length, 78);
    assert.deepStrictEqual((h.match(/\?v=[0-9a-z]+/g)||[]).filter(t => t !== '?v=' + TOK), []);
    assert.ok(!h.includes('20260908b') && !h.includes('20260909a') && !h.includes('20260911a') && !h.includes('?v=20260911b') && !h.includes("DOC_V = '20260911b'"));
  });

  /* ───── dynamique : core ───── */
  const html = fs.readFileSync(path.join(ROOT,'AURA8_v118.html'),'utf8');
  const CFG = (() => { const c = { window:{} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT,'guardian-config.js'),'utf8'), c); return c.window.GUARDIAN_CONFIG; })();
  const perFileDisk = {};
  [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1].split('?')[0]).filter(u=>!/^https?:/.test(u)&&u.endsWith('.js')).forEach(u=>{ const p=path.join(ROOT,u); if (fs.existsSync(p)) perFileDisk[u]=fs.readFileSync(p,'utf8'); });
  const expected = oracle(CFG, html, perFileDisk);
  const nDeclared = ([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].length + [...html.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/gi)].length);

  const F = mkFetch(); const ctx = loadCore(F.fetch);
  let rep1, rep2, rep3;
  await T('run 1 ({ code:true }, ouverture du bouclier) : sondes de code = ORACLE (mêmes niveaux/titres/détails/corrections, même ordre)', async () => {
    rep1 = await ctx.GuardianCore.runAll({ code:true });
    assert.deepStrictEqual(codePart(rep1.results), expected);
    assert.ok(expected.length >= 3, 'oracle vide ?');   // Fichiers + Fonctions + Doublons (Variables vide si rien à signaler)
  });
  await T('run 1 : un seul fetch par fichier (HTML + ' + nDeclared + ' déclarés), texte lu pour les JS seulement', () => {
    assert.strictEqual(F.log.length, 1 + nDeclared);
    assert.strictEqual(new Set(F.log).size, F.log.length, 'un fichier fetché deux fois');
  });
  await T('run 1 : opération annoncée _perfOp(\'guardianScan\') (≥ 1 + nombre de JS analysés)', () => {
    const nJs = Object.keys(perFileDisk).length;
    assert.ok(ctx._ops.filter(o => o === 'guardianScan').length >= 1 + nJs, JSON.stringify(ctx._ops.length));
  });
  await T('run 2 (silencieux, sans option) : aucun fetch, sondes de code identiques, sondes d\'état refaites', async () => {
    const n0 = F.log.length; const t0 = ctx.GuardianCore.lastRun;
    await new Promise(r => setTimeout(r, 5));
    rep2 = await ctx.GuardianCore.runAll();
    assert.strictEqual(F.log.length, n0, 'fetch pendant un scan silencieux');
    assert.deepStrictEqual(codePart(rep2.results), expected);
    assert.ok(rep2.ts > t0);
    assert.ok(rep2.results.some(r => r.group === 'Quota') && rep2.results.some(r => r.group === 'Gel / Lag'));
  });
  await T('run 3 ({ refreshCode:true }) : code refait (fetchs à nouveau), résultats identiques', async () => {
    const n0 = F.log.length;
    rep3 = await ctx.GuardianCore.runAll({ refreshCode:true });
    assert.strictEqual(F.log.length, n0 + 1 + nDeclared);
    assert.deepStrictEqual(codePart(rep3.results), expected);
  });
  await T('respiration : au moins une pause (setTimeout 0) par fichier JS, aucun segment synchrone monolithique', async () => {
    // contexte neuf, setTimeout instrumenté : mesure le plus long segment synchrone entre deux pauses
    const F2 = mkFetch(); const stamps = [];
    const ctx2 = loadCore(F2.fetch);
    let yields = 0, lastRun = null, maxSync = 0;
    ctx2.setTimeout = (fn, ms, ...a) => { if (ms === 0) { yields++; const now = performance.now(); if (lastRun !== null) maxSync = Math.max(maxSync, now - lastRun); return setTimeout(() => { lastRun = performance.now(); fn(...a); }, 0); } return setTimeout(fn, ms, ...a); };
    await ctx2.GuardianCore.runAll({ code:true });
    const nJs = Object.keys(perFileDisk).length;
    assert.ok(yields >= nJs, 'pauses ' + yields + ' < fichiers JS ' + nJs);
    console.log('       pauses :', yields, '· plus long segment synchrone entre deux pauses :', maxSync.toFixed(0), 'ms');
    assert.ok(maxSync < 150, 'segment synchrone ' + maxSync.toFixed(0) + ' ms');
  });
  await T('scan réseau incomplet (un fichier sans réponse, statut 0) : signalé, PAS mémorisé, refait au scan suivant', async () => {
    const victim = Object.keys(perFileDisk)[3];
    const fail = {}; fail[victim] = 'throw';
    const F3 = mkFetch({ fail }); const ctx3 = loadCore(F3.fetch);
    const r = await ctx3.GuardianCore.runAll({ code:true });
    assert.ok(r.results.some(x => x.group === 'Fichiers (réseau)' && x.level === 'crit' && x.title.includes(victim.split('/').pop()) && x.detail.includes('HTTP 0')));
    const n0 = F3.log.length;
    await ctx3.GuardianCore.runAll({ code:true });
    assert.strictEqual(F3.log.length, n0 + 1 + nDeclared, 'aurait dû refaire le scan');
  });
  await T('vrai 404 : signalé ET mémorisé (le fichier manque vraiment, inutile de retélécharger toutes les 2 min)', async () => {
    const victim = Object.keys(perFileDisk)[5];
    const fail = {}; fail[victim] = 404;
    const F4 = mkFetch({ fail }); const ctx4 = loadCore(F4.fetch);
    const r = await ctx4.GuardianCore.runAll({ code:true });
    assert.ok(r.results.some(x => x.group === 'Fichiers (réseau)' && x.level === 'crit' && x.detail.includes('HTTP 404')));
    const n0 = F4.log.length;
    await ctx4.GuardianCore.runAll({ code:true });
    assert.strictEqual(F4.log.length, n0);
  });
  await T('HTML illisible : info « Impossible de lire », rien mémorisé, retenté au scan suivant', async () => {
    const fail = {}; fail[CFG.appUrl] = 'throw';
    const F5 = mkFetch({ fail }); const ctx5 = loadCore(F5.fetch);
    const r = await ctx5.GuardianCore.runAll({ code:true });
    assert.ok(r.results.some(x => x.group === 'Fichiers (réseau)' && x.level === 'info' && x.title.startsWith('Impossible de lire')));
    assert.ok(!r.results.some(x => x.group === 'Fonctions'));
    const n0 = F5.log.length;
    await ctx5.GuardianCore.runAll({ code:true });
    assert.strictEqual(F5.log.length, n0 + 1);
  });
  await T('dépôt SYNTHÉTIQUE (404, appelée jamais définie, définie sans appel, constante non exposée, doublon) : nouveau = ORACLE', async () => {
    const files = {
      'AURA8_v118.html': '<script src="js/a.js?v=1"></script><script src="js/b.js?v=1"></script><script src="js/absent.js?v=1"></script><link rel="stylesheet" href="css/x.css">',
      'js/a.js': 'function loadState(){ return openDB(); } /* function saveState() { faux dans un commentaire } */\nconst x = DB_NAME; buildSnapshot(); buildSnapshot();\nfunction renderAll(){}\nfunction simTick(){}\n',
      'js/b.js': 'window.saveState = function(){ loadState(); loadState(); };\nfunction renderAll(){ simTick(); simTick(); renderAll(); }\nwindow.STORE = "state"; var y = STORE;\nopen(SAVE_KEY, 3); simTick();\n',
      'css/x.css': 'body{}'
    };
    const log = [];
    const fetchMem = async (u) => { const c = String(u).split('?')[0]; log.push(c); if (files[c] === undefined) return { ok:false, status:404, text: async () => '' }; return { ok:true, status:200, text: async () => files[c] }; };
    const ctxS = loadCore(fetchMem);
    const r = await ctxS.GuardianCore.runAll({ code:true });
    const perFile = {}; Object.keys(files).filter(k => k.endsWith('.js')).forEach(k => perFile[k] = files[k]);
    const exp = oracle(CFG, files['AURA8_v118.html'], perFile, c => files[c] !== undefined);
    const got = codePart(r.results);
    assert.deepStrictEqual(got, exp);
    // chaque branche est bien exercée
    const has = (lvl, grp, t) => got.some(x => x.level === lvl && x.group === grp && x.title.includes(t));
    assert.ok(has('crit','Fichiers (réseau)','absent.js'), '404');
    assert.ok(has('crit','Fonctions','buildSnapshot() appelée mais jamais définie'), 'jamais définie');
    assert.ok(has('warn','Fonctions','openDB() définie mais peu/pas appelée') === false && has('crit','Fonctions','openDB() appelée mais jamais définie'), 'openDB');
    assert.ok(has('warn','Variables','DB_NAME') && has('warn','Variables','SAVE_KEY') && !has('warn','Variables',': STORE'), 'variables');
    assert.ok(has('warn','Doublons','renderAll() définie dans 2 fichiers') && !got.some(x => x.group === 'Doublons' && x.title.includes('saveState')), 'doublons (commentaire ignoré)');
    assert.strictEqual(log.length, 1 + 4, 'HTML + 3 scripts + 1 css (testé ici car sans ?v= ; dans le vrai HTML les CSS portent ?v= et échappent à la regex <link …\\.css> : limite préexistante)');
    console.log('       ' + got.length + ' résultats identiques à l\'oracle · ' + got.filter(x => x.level !== 'ok').length + ' non-OK');
  });
  await T('export : resultsJSON/resultsText reprennent les sondes de code mémorisées', () => {
    const j = ctx.GuardianCore.export.resultsJSON();
    assert.deepStrictEqual(codePart(j.results), expected);
    assert.ok(ctx.GuardianCore.export.resultsText().includes('━━━ Fichiers (réseau) ━━━'));
  });

  /* ───── dynamique : embed ───── */
  await T('embed : ouverture (sans cache) → runAll() puis runAll({code:true,refreshCode:false}) · Relancer (2 boutons) → {code:true,refreshCode:true} · scan silencieux (intervalle 2 min, rien au boot) → sans argument · backup → toast vert, jamais alert', async () => {
    const calls = []; const body = []; const timers = [];
    const mkEl = (tag) => { const el = { tagName:tag, style:{}, innerHTML:'', textContent:'', children:[], attrs:{}, classList:{ add(){}, remove(){}, contains(){ return false; } },
      appendChild(c){ this.children.push(c); c.parentNode = this; return c; }, remove(){ if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this); },
      setAttribute(k,v){ this.attrs[k]=v; }, getAttribute(k){ return this.attrs[k]; }, querySelectorAll(){ return buttons; }, addEventListener(){} }; return el; };
    const buttons = ['json','text','backup','reload','full'].map(a => { const b = mkEl('button'); b.attrs['data-a'] = a; return b; });
    const ids = {};
    const document = { readyState:'complete', visibilityState:'visible', hidden:false, head: mkEl('head'), body: { appendChild(c){ body.push(c); c.parentNode = { children: body }; return c; }, get children(){ return body; } },
      createElement: mkEl, getElementById(id){ return ids[id] || (ids[id] = mkEl('div')); }, addEventListener(){}, querySelector(){ return null; } };
    const ctxE = { console, document, performance, URL,
      setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, setInterval: (fn, ms) => { timers.push({ fn, ms, interval:true }); return 0; }, clearInterval(){},
      alert: () => { throw new Error('alert() appelé : boîte modale bloquante'); },
      GuardianCore: { runAll: async function(){ calls.push(arguments.length ? arguments[0] : undefined); return { mode:'embedded', results:[], ts:Date.now() }; },
        dataDownload: { now: async () => true }, autoBackup: { tick: async () => ({ ok:false }) }, detectMode: () => 'embedded', export: { resultsJSON: () => ({}), resultsText: () => '' } } };
    ctxE.window = ctxE; vm.createContext(ctxE);
    vm.runInContext(fs.readFileSync(path.join(ROOT,'guardian-embed.js'),'utf8'), ctxE, { filename:'guardian-embed.js' });
    const fab = body.find(e => e.id === 'gdnFab') || body[0];
    assert.ok(fab && typeof fab.onclick === 'function', 'bouclier absent');
    // clic JSON AVANT toute analyse : toast rouge « Lance d'abord l'analyse. » (plus de boîte modale)
    buttons.find(b => b.attrs['data-a'] === 'json').onclick();
    const t2 = body[body.length-1];
    assert.ok(t2.textContent === "Lance d'abord l'analyse." && String(t2.style.cssText).includes('#ff4d6e'), 'toast JSON sans analyse');
    assert.strictEqual(calls.length, 0, 'runAll au chargement de l\'embed');
    await fab.onclick(); await new Promise(r => setImmediate(r));
    assert.deepStrictEqual(J(calls.slice(-2)), [null, { code:true, refreshCode:false }], 'ouverture : état d\'abord (sans option) puis code');
    await ids.gdnRun.onclick(); await new Promise(r => setImmediate(r));
    assert.deepStrictEqual(J(calls[calls.length-1]), { code:true, refreshCode:true }, 'gdnRun');
    buttons.find(b => b.attrs['data-a'] === 'reload').onclick(); await new Promise(r => setImmediate(r));
    assert.deepStrictEqual(J(calls[calls.length-1]), { code:true, refreshCode:true }, 'reload');
    assert.ok(!timers.some(t => !t.interval && (t.ms === 4000 || t.ms === 8000)), 'timer de boot 4 s / 8 s résiduel');
    const silent = timers.find(t => t.ms === 120000 && t.interval); assert.ok(silent, 'rescan 2 min absent');
    silent.fn(); await new Promise(r => setImmediate(r));
    assert.strictEqual(calls[calls.length-1], undefined, 'scan silencieux avec argument');
    const before = body.length;
    buttons.find(b => b.attrs['data-a'] === 'backup').onclick(); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
    const toast = body[body.length-1];
    assert.ok(body.length === before + 1 && toast.textContent === 'Backup FULL ecrit (voir journal 🛡)', 'toast backup absent');
    assert.ok(String(toast.style.cssText).includes('#00e87a'), 'toast succès pas vert');
  });

  console.log('\n' + (fail ? '❌' : '✅') + ' banc-gel-guardian : ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
