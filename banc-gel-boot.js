// banc-gel-boot.js — [GEL BOOT · 11/09/2026] VERSION 20260911c (a : livraison initiale ; b : rattachement tardif LoAF + anneau S.perfLog.loaf ; c : token seul — le correctif des gels est dans banc-gel-backup.js)
// Banc AUTONOME (node banc-gel-boot.js depuis la racine du dépôt). Mission « gels de boot » :
//  1) le Guardian ne fait PLUS RIEN au boot (aucun setTimeout à +4 s / +8 s : scans silencieux et
//     tick backup uniquement par intervalle 2 min) et un scan silencieux ne touche JAMAIS au code
//     (zéro fetch) ; la sonde Fichiers lit performance.getEntriesByType('resource') ;
//  2) sonde LoAF (long-animation-frame) dans 08 : le navigateur nomme le script bloquant ;
//  3) S.perfLog (gels 30 / lent 30 / heap 144 / boots 20) écrit par 08, 00, 09k, persisté par
//     09b1, relu par loadState (09b2), listé dans le manifeste, lu par probeGel / probeMemory ;
//  4) db.close() sur chaque connexion openDB() de 09b2 (fausse IDB : ouvertures = fermetures) ;
//  5) regex d'op du Guardian : nom complet (« fetch js/… » n'est plus coupé au premier espace).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname;
const TOK = '20260911c';
const HEAD = '// [GEL BOOT · 11/09/2026] VERSION ';
const VER = { 'guardian-core.js':'20260911b', 'guardian-embed.js':'20260911a', 'js/00-backup-state.js':'20260911a', 'js/08-learning-history-render.js':'20260911b', 'js/09b1-build-snapshot.js':'20260911b', 'js/09b2-save-load.js':'20260911b', 'js/09k-init.js':'20260911a' };
let pass = 0, fail = 0;
async function T(name, fn){ try { await fn(); pass++; console.log('  ✅', name); } catch(e){ fail++; console.log('  ❌', name, '\n     ', (e && e.stack || e).toString().split('\n').slice(0,3).join('\n      ')); } }
process.on('unhandledRejection', e => { fail++; console.log('  ❌ rejet non géré :', e && e.message); });
const J = (x) => JSON.parse(JSON.stringify(x));   // objets nés dans une vm : aller-retour JSON avant deepStrictEqual
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const between = (s, a, b, label) => { const i = s.indexOf(a); assert.ok(i >= 0, 'début introuvable : ' + label); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'fin introuvable : ' + label); return s.slice(i, j); };

/* ───── stubs ───── */
function mkStorage(){ const o = {}; for (const [k,f] of Object.entries({
  getItem(k){ return Object.prototype.hasOwnProperty.call(o,k) ? o[k] : null; },
  setItem(k,v){ o[k] = String(v); }, removeItem(k){ delete o[k]; } })) Object.defineProperty(o, k, { value:f, enumerable:false }); return o; }
function mkFetch(){
  const log = [];
  return { log, fetch: async function(url){
    const clean = String(url).split('?')[0]; log.push(clean);
    const p = path.join(ROOT, clean);
    if (!fs.existsSync(p)) return { ok:false, status:404, text: async () => '' };
    return { ok:true, status:200, text: async () => fs.readFileSync(p, 'utf8') };
  } };
}
// document + performance.resource synthétiques : 3 scripts + 1 css déclarés, statuts pilotés
function mkDoc(statuses, opts){
  opts = opts || {};
  const base = 'https://x.test/aura/';
  const decl = [
    { tag:'script', attr:'src',  raw:'js/a.js?v=' + TOK },
    { tag:'script', attr:'src',  raw:'js/b.js?v=' + TOK },
    { tag:'script', attr:'src',  raw:'js/c.js?v=' + TOK },
    { tag:'link',   attr:'href', raw:'css/x.css?v=' + TOK },
    { tag:'script', attr:'src',  raw:'https://cdn.example/lib.js' }   // externe : ignoré
  ];
  const el = (d) => ({ getAttribute: (k) => k === d.attr ? d.raw : null, src: base + d.raw, href: base + d.raw });
  const document = {
    scripts: decl.filter(d => d.tag === 'script').map(el),
    querySelectorAll: (q) => q === 'link[rel="stylesheet"]' ? decl.filter(d => d.tag === 'link').map(el) : [],
    getElementById: () => null, addEventListener(){}, querySelector: () => null
  };
  const entries = decl.filter(d => !/^https?:/.test(d.raw)).map(d => {
    const e = { name: base + d.raw, entryType:'resource' };
    const st = statuses[d.raw.split('?')[0]];
    if (!opts.noStatus) e.responseStatus = (st === undefined ? 200 : st);
    return e;
  });
  const performance = { now: () => Date.now(), getEntriesByType: (t) => t === 'resource' ? entries : [] };
  return { document, performance };
}
function loadCore(fetchImpl, extra){
  const ctx = Object.assign({ console, performance, URL, TextDecoder,
    localStorage: mkStorage(), sessionStorage: mkStorage(), fetch: fetchImpl,
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
    addEventListener(){}, removeEventListener(){}, _ops: [] }, extra || {});
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx._perfOp = (n) => ctx._ops.push(n);
  vm.createContext(ctx);
  vm.runInContext(src('guardian-config.js'), ctx, { filename:'guardian-config.js' });
  vm.runInContext(src('guardian-core.js'), ctx, { filename:'guardian-core.js' });
  return ctx;
}
const grp = (res, g) => J(res).filter(r => r.group === g);

(async () => {
  console.log('▶ banc-gel-boot · token', TOK);
  const MODIFIED_JS = ['guardian-core.js','guardian-embed.js','js/00-backup-state.js','js/08-learning-history-render.js','js/09b1-build-snapshot.js','js/09b2-save-load.js','js/09k-init.js'];

  /* ───── statique ───── */
  await T('syntaxe : les 7 fichiers JS livrés compilent', () => {
    for (const f of MODIFIED_JS) new vm.Script(src(f), { filename:f });
  });
  await T('en-têtes : chaque fichier livré commence par « ' + HEAD + '<version> » (a ou b selon la livraison)', () => {
    for (const f of MODIFIED_JS) assert.ok(src(f).startsWith(HEAD + VER[f]), f + ' attendu ' + VER[f]);
    assert.ok(src('banc-gel-guardian.js').startsWith('// banc-gel-guardian.js — [GEL BOOT · 11/09/2026] VERSION ' + TOK));
  });
  await T('HTML : DOC_V = ' + TOK + ', 78 ?v= au même token, aucun 20260909a / 20260911a', () => {
    const h = src('AURA8_v118.html');
    assert.ok(h.includes("DOC_V = '" + TOK + "'"));
    const toks = h.match(/\?v=[0-9a-z]+/g) || [];
    assert.strictEqual(toks.length, 78);
    assert.deepStrictEqual(toks.filter(t => t !== '?v=' + TOK), []);
    assert.ok(!h.includes('20260909a') && !h.includes('20260911a'));
  });
  await T('embed : plus AUCUN setTimeout de scan ni de backup au boot ; intervalles 2 min seuls ; ouverture en deux temps', () => {
    const s = src('guardian-embed.js');
    assert.ok(!s.includes('setTimeout(_gdnSilentScan'), 'setTimeout(_gdnSilentScan) résiduel');
    assert.ok(!s.includes('setTimeout(tick'), 'setTimeout(tick) résiduel');
    assert.ok(!/setTimeout\([^)]*,\s*(4000|8000)\)/.test(s), 'timer 4 s / 8 s résiduel');
    assert.strictEqual(s.split('setInterval(_gdnSilentScan, 2*60*1000);').length, 2);
    assert.strictEqual(s.split('setInterval(tick, 2*60*1000);').length, 2);
    assert.strictEqual(s.split("window.GuardianCore.runAll().then(rep=>{").length, 2, 'scan silencieux sans argument');
    assert.strictEqual(s.split("G.runAll({ code:true, refreshCode: refreshCode === true })").length, 2, 'ouverture/Relancer : code demandé explicitement');
    assert.strictEqual(s.split("last=await G.runAll(); render(last); updateFab(last);").length, 2, 'ouverture : état rendu d\'abord');
    assert.strictEqual(s.split('alert(').length, 1, 'alert( résiduel');
  });
  await T('core : sonde Fichiers sans réseau présente, code uniquement sur option, regex d\'op complète, sonde Mémoire, codeCached', () => {
    const s = src('guardian-core.js');
    assert.ok(s.includes("entries=performance.getEntriesByType('resource')||[]") && s.includes('e.responseStatus'), 'lecture des entrées resource');
    for (const live of ['function probeFilesResources(', "if(opts.refreshCode === true)      res = res.concat(await probeCode(true));",
      "else if(opts.code === true)        res = res.concat(await probeCode(false));", "else if(_codeReport)               res = res.concat(_codeReport);",
      'function probeMemory(', 'Core.codeCached = function(){ return !!_codeReport; };', "/· op (.+?)(?: · |$)/"])
      assert.strictEqual(s.split(live).length, 2, live);
    assert.ok(!s.includes('/· op (\\S+)/'), 'ancienne regex \\S+ résiduelle');
  });
  await T('09b1 : perfLog dans le snapshot (bornes 30/30/144/20) · 09b2 : perfLog relu + manifeste + _restoredSavedAt + db.close()', () => {
    const b1 = src('js/09b1-build-snapshot.js'), b2 = src('js/09b2-save-load.js');
    assert.ok(b1.includes('perfLog: (function() {') && b1.includes('p.gels.slice(-30)') && b1.includes('p.lent.slice(-30)') && b1.includes('p.heap.slice(-144)') && b1.includes('p.boots.slice(-20)') && b1.includes('p.loaf.slice(-20)'));
    assert.ok(b2.includes('_pl.loaf.slice(-20)'), 'relecture loaf');
    assert.ok(b2.includes("'_fpByBot','perfLog'];"), 'manifeste');
    assert.ok(b2.includes('S._restoredSavedAt = snap.savedAt'), '_restoredSavedAt');
    assert.ok(b2.includes('_pl.gels.slice(-30)') && b2.includes('_pl.heap.slice(-144)'), 'relecture bornée');
    assert.ok((b2.match(/db\.close\(\)/g) || []).length >= 7, 'db.close() : ' + (b2.match(/db\.close\(\)/g) || []).length);
    // chaque openDB() de 09b2 a un close dans les 25 lignes qui suivent
    const lines = b2.split('\n');
    lines.forEach((l, i) => { if (/await openDB\(\)|openDB\(\)\.then/.test(l)) assert.ok(lines.slice(i, i + 25).some(x => x.includes('db.close()')), 'openDB sans close ligne ' + (i + 1)); });
  });
  await T('08 / 00 / 09k : sonde LoAF, échantillonneur heap, enregistrements perfLog présents', () => {
    const s8 = src('js/08-learning-history-render.js'), s0 = src('js/00-backup-state.js'), sk = src('js/09k-init.js');
    for (const live of ['(function _auraLoafProbe(){', "_obs.observe({ type: 'long-animation-frame', buffered: true });", '(function _auraHeapSampler(){', 'S.perfLog.gels.push({', 'window._auraLoafSupported = true;', 'window._auraLoafAttach = function(f){', 'window._auraLoafStr = function(f){', 'S0.perfLog.loaf.push({', 'pStart: Math.round(_pStart), pEnd: Math.round(_now), hash: _hash'])
      assert.strictEqual(s8.split(live).length, 2, live);
    assert.strictEqual(s0.split('S0.perfLog.lent.push({').length, 2);
    assert.strictEqual(sk.split('S.perfLog.boots.push({').length, 2);
    assert.ok(sk.includes('prevSavedAt: (restored && S._restoredSavedAt)'));
  });

  /* ───── dynamique : Guardian core ───── */
  await T('runAll() silencieux : ZÉRO fetch, aucune sonde de code ; runAll({code:true}) : un fetch par fichier, mémorisé ; codeCached bascule', async () => {
    const F = mkFetch(); const ctx = loadCore(F.fetch);
    assert.strictEqual(ctx.GuardianCore.codeCached(), false);
    const r0 = await ctx.GuardianCore.runAll();
    assert.strictEqual(F.log.length, 0, 'fetch au scan silencieux');
    assert.ok(!J(r0.results).some(r => ['Fonctions','Variables','Doublons','Fichiers (réseau)'].includes(r.group)), 'sonde de code sans option');
    assert.strictEqual(ctx.GuardianCore.codeCached(), false);
    const r1 = await ctx.GuardianCore.runAll({ code:true });
    const html = src('AURA8_v118.html');
    const nDeclared = ([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].length + [...html.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/gi)].length);
    assert.strictEqual(F.log.length, 1 + nDeclared);
    assert.ok(J(r1.results).some(r => r.group === 'Fonctions') && J(r1.results).some(r => r.group === 'Fichiers (réseau)'));
    assert.strictEqual(ctx.GuardianCore.codeCached(), true);
    const r2 = await ctx.GuardianCore.runAll();
    assert.strictEqual(F.log.length, 1 + nDeclared, 'fetch au scan silencieux après cache');
    assert.ok(J(r2.results).some(r => r.group === 'Fonctions'), 'code en cache non repris par le scan silencieux');
    const r3 = await ctx.GuardianCore.runAll({ code:true });
    assert.strictEqual(F.log.length, 1 + nDeclared, 'ouverture avec cache : aucun fetch');
    await ctx.GuardianCore.runAll({ refreshCode:true });
    assert.strictEqual(F.log.length, 2 * (1 + nDeclared), 'Relancer : code refait');
  });
  await T('sonde Fichiers (sans réseau) : tout 200 → ok · un 404 → crit nommant le fichier · statut non exposé → ok « sans statut exposé » · zéro fetch dans les 3 cas', async () => {
    const F = mkFetch();
    const ok = loadCore(F.fetch, mkDoc({}));
    const r = grp((await ok.GuardianCore.runAll()).results, 'Fichiers');
    assert.strictEqual(r.length, 1); assert.strictEqual(r[0].level, 'ok'); assert.ok(r[0].detail.startsWith('4 fichiers (script+css)') && r[0].detail.includes('sans aucune requête'), r[0].detail);
    const ko = loadCore(F.fetch, mkDoc({ 'js/b.js': 404 }));
    const r2 = grp((await ko.GuardianCore.runAll()).results, 'Fichiers');
    assert.strictEqual(r2.length, 1); assert.strictEqual(r2[0].level, 'crit'); assert.ok(r2[0].title.includes('b.js') && r2[0].detail.includes('HTTP 404') && r2[0].detail.includes('js/b.js'), r2[0].title);
    const ns = loadCore(F.fetch, mkDoc({}, { noStatus:true }));
    const r3 = grp((await ns.GuardianCore.runAll()).results, 'Fichiers');
    assert.strictEqual(r3.length, 1); assert.strictEqual(r3[0].level, 'ok'); assert.ok(r3[0].detail.includes('4 sans statut exposé'), r3[0].detail);
    assert.strictEqual(F.log.length, 0, 'fetch');
  });
  const gelRec = (over) => Object.assign({ t: Date.now() - 60000, time: '11/09/2026 10:00:00', gap: 7.5, tickMs: 76, hidden: false, jsSum: 7.2, jsN: 3, osIdle: false,
    op: 'fetch js/09f1-bricks-action.js', heapU: 228, heapL: 954, dom: 4186, page: 0, ws: 4,
    loaf: { dur: 5800, block: 5700, script: 5700, render: 100, scripts: [{ dur: 5700, inv: 'IDBRequest.onsuccess', type: 'event-listener', fn: '_x', src: '07-v90-mode-bunker-sos.js', pos: 123, layout: 0, pause: 0 }] } }, over || {});
  await T('probeGel : mémoire durable S.perfLog.gels → relevé + verdict avec nom d\'op COMPLET et attribution LoAF', async () => {
    const S = { agents: [], pairStates: {}, chainLog: [], perfLog: { gels: [gelRec(), gelRec({ gap: 8.0, op: 'fetch js/09l-window-bridge.js' })], lent: [], heap: [], boots: [] } };
    const ctx = loadCore(mkFetch().fetch, { S });
    const g = grp((await ctx.GuardianCore.runAll()).results, 'Gel / Lag');
    const rel = g.find(x => x.title.startsWith('Relevé'));
    assert.ok(rel && rel.title.includes('mémoire durable') && rel.detail.startsWith('2 gels (2 écran visible, 0 écran masqué) · pire blocage visible 8.0s'), JSON.stringify(rel));
    const v = g.find(x => x.level === 'crit');
    assert.ok(v && v.title.startsWith('Blocage JS confirmé par longtask (2 gel(s))'), JSON.stringify(g));
    assert.ok(v.detail.includes('opération nommée : fetch js/09f1-bricks-action.js, fetch js/09l-window-bridge.js'), v.detail);
    assert.ok(v.detail.includes('LoAF : 07-v90-mode-bunker-sos.js:_x@123 ← IDBRequest.onsuccess (5.7 s)'), v.detail);
    assert.ok(v.fix.startsWith('Corriger le script nommé par LoAF'));
  });
  await T('probeGel : repli journal (sans perfLog) → regex d\'op complète (« fetch js/09f1-bricks-action.js », plus coupé à « fetch »)', async () => {
    const line = 'Gel 7.5s · tick 76ms · ecran visible · JS ⏱ 7.2s/3 · op fetch js/09f1-bricks-action.js · heap 228/954Mo · dom 4186 · page 0 · ws +4';
    const S = { agents: [], pairStates: {}, chainLog: [{ icon:'🐌', desc: line, hash:'x', time:'18:55:43' }] };
    const ctx = loadCore(mkFetch().fetch, { S });
    const g = grp((await ctx.GuardianCore.runAll()).results, 'Gel / Lag');
    const v = g.find(x => x.level === 'crit');
    assert.ok(v && v.detail.includes('opération nommée : fetch js/09f1-bricks-action.js.') , JSON.stringify(g));
    assert.ok(g.find(x => x.title.startsWith('Relevé')).title.includes('journal (volatile)'));
  });
  await T('probeGel (b) : anneau S.perfLog.loaf → info « Frames longues nommées par le navigateur » avec le script en tête, même sans gel', async () => {
    const S = { agents: [], pairStates: {}, chainLog: [], perfLog: { gels: [], lent: [], heap: [], boots: [], loaf: [
      { t: 1, time: '11/09/2026 20:24:37', pStart: 1, dur: 5600, block: 5500, script: 5500, render: 100, scripts: [{ dur: 5500, inv: 'Window.fetch.then', type: 'resolve-promise', fn: 'fetchUsdEurRate', src: '02-state-init.js', pos: 210001, layout: 0, pause: 0 }] },
      { t: 2, time: '11/09/2026 20:24:45', pStart: 2, dur: 7100, block: 7000, script: 0, render: 6900, scripts: [] } ] } };
    const ctx = loadCore(mkFetch().fetch, { S });
    const g = grp((await ctx.GuardianCore.runAll()).results, 'Gel / Lag');
    const f = g.find(x => x.title.startsWith('Frames longues nommées par le navigateur (LoAF ≥ 1 s, 2)'));
    assert.ok(f && f.level === 'info', JSON.stringify(g));
    assert.strictEqual(f.detail, '11/09/2026 20:24:45 · 7.1 s · sans script (rendu 6.9 s) ; 11/09/2026 20:24:37 · 5.6 s · 02-state-init.js:fetchUsdEurRate@210001 ← Window.fetch.then 5.5 s');
    assert.ok(g.some(x => x.level === 'ok' && x.title === 'Aucun gel récent'));
  });
  await T('probeGel : gels datés de plus de 24 h → relevé conservé, aucun verdict crit · LoAF non supporté → info', async () => {
    const S = { agents: [], pairStates: {}, chainLog: [], perfLog: { gels: [gelRec({ t: Date.now() - 2 * 86400000 })], lent: [], heap: [], boots: [] } };
    const ctx = loadCore(mkFetch().fetch, { S, _auraLoafSupported: false });
    const g = grp((await ctx.GuardianCore.runAll()).results, 'Gel / Lag');
    assert.ok(!g.some(x => x.level === 'crit'), JSON.stringify(g));
    assert.ok(g.some(x => x.level === 'ok' && x.title.startsWith('Aucun gel écran visible depuis 24 h')));
    assert.ok(g.some(x => x.level === 'info' && x.title === 'LoAF non supporté par ce WebView'));
  });
  await T('probeMemory : boots + relevés 10 min → session, heap au boot, dernière sauvegarde précédente, pente Mo/h', async () => {
    const t0 = Date.now() - 3 * 3600000;
    const S = { agents: [], pairStates: {}, chainLog: [], perfLog: { gels: [], lent: [], boots: [{ t: t0, time: '11/09/2026 07:00:00', restored: true, cycle: 551043, heap: 228, limit: 954, doc: TOK, prevSavedAt: '2026-09-10T10:11:07.000Z' }],
      heap: [{ t: t0 + 60000, time: 'a', heap: 230, limit: 954, dom: 4100 }, { t: t0 + 2 * 3600000 + 60000, time: 'b', heap: 250, limit: 954, dom: 4300 }] } };
    const ctx = loadCore(mkFetch().fetch, { S });
    const m = grp((await ctx.GuardianCore.runAll()).results, 'Mémoire');
    assert.strictEqual(m.length, 2, JSON.stringify(m));
    assert.ok(m[0].title.startsWith('Session : boot 11/09/2026 07:00:00 · en ligne depuis 3 h') && m[0].detail.includes('heap au boot 228 Mo') && m[0].detail.includes('dernière sauvegarde de la session précédente : 2026-09-10T10:11:07.000Z'), JSON.stringify(m[0]));
    assert.ok(m[1].level === 'info' && m[1].title === 'Heap JS 250/954 Mo · DOM 4300 nœuds' && m[1].detail.includes('pente +10.0 Mo/h sur 2.0 h'), JSON.stringify(m[1]));
  });

  /* ───── dynamique : 08 (sonde LoAF, moniteur de gel, échantillonneur) ───── */
  const s8 = src('js/08-learning-history-render.js');
  function loafCtx(supported){
    let cb = null, observed = null;
    function PerformanceObserver(fn){ cb = fn; this.observe = (o) => { observed = o; }; }
    PerformanceObserver.supportedEntryTypes = supported ? ['longtask','long-animation-frame'] : ['longtask'];
    const ctx = { PerformanceObserver, Math, String, console }; ctx.window = ctx; vm.createContext(ctx);
    vm.runInContext(between(s8, '(function _auraLoafProbe(){', '\n// [GEL BOOT · 11/09/2026] RELEVÉ MÉMOIRE', 'sonde LoAF'), ctx);
    return { ctx, fire: (entries) => cb({ getEntries: () => entries }), observed: () => observed };
  }
  await T('08 sonde LoAF : non supporté → _auraLoafSupported=false, pas d\'observation · supporté → frames ≥ 500 ms, scripts triés, top 3, rendu, plafond 40', () => {
    const no = loafCtx(false);
    assert.strictEqual(no.ctx._auraLoafSupported, false); assert.strictEqual(no.observed(), null); assert.strictEqual(no.ctx._auraLoafs, undefined);
    const yes = loafCtx(true);
    assert.strictEqual(yes.ctx._auraLoafSupported, true);
    assert.deepStrictEqual(J(yes.observed()), { type: 'long-animation-frame', buffered: true });
    const mk = (start, dur, scripts, renderStart) => ({ startTime: start, duration: dur, blockingDuration: dur - 50, renderStart: renderStart || 0,
      scripts: scripts.map(([d, inv, type, fn, url, pos]) => ({ duration: d, invoker: inv, invokerType: type, sourceFunctionName: fn, sourceURL: url, sourceCharPosition: pos, forcedStyleAndLayoutDuration: 0, pauseDuration: 0 })) });
    yes.fire([ mk(1000, 300, [[280, 'TimerHandler:setInterval', 'user-callback', 'simTick', 'https://x/js/08.js?v=1', 5]]),   // < 500 : ignorée
               mk(5000, 5800, [[900, 'Window.fetch.then', 'resolve-promise', 'fetchDeclared', 'https://x/guardian-core.js?v=1', 7], [5700, 'IDBRequest.onsuccess', 'event-listener', '_x', 'https://x/js/07-v90-mode-bunker-sos.js?v=1', 123], [10, 'a', 'b', 'c', 'd', 1], [5, 'e', 'f', 'g', 'h', 2]], 10700) ]);
    assert.strictEqual(yes.ctx._auraLoafs.length, 1);
    const f = J(yes.ctx._auraLoafs[0]);
    assert.strictEqual(f.dur, 5800); assert.strictEqual(f.block, 5750); assert.strictEqual(f.render, 100); assert.strictEqual(f.script, 6615);
    assert.strictEqual(f.scripts.length, 3);
    assert.deepStrictEqual(f.scripts[0], { dur: 5700, inv: 'IDBRequest.onsuccess', type: 'event-listener', fn: '_x', src: '07-v90-mode-bunker-sos.js', pos: 123, layout: 0, pause: 0 });
    assert.strictEqual(f.scripts[1].fn, 'fetchDeclared');
    for (let i = 0; i < 45; i++) yes.fire([mk(20000 + i * 1000, 600, [])]);
    assert.strictEqual(yes.ctx._auraLoafs.length, 40);
    assert.strictEqual(typeof no.ctx._auraLoafStr, 'function', '_auraLoafStr absent quand non supporté');
    assert.strictEqual(typeof no.ctx._auraLoafAttach, 'function', '_auraLoafAttach absent quand non supporté');
  });
  await T('08 rattachement tardif (b) : la frame arrive APRÈS le gel → S.perfLog.gels[].loaf rempli, ligne 🐌 « LoAF aucun » réécrite (par hash), anneau S.perfLog.loaf (≥ 1 s, plafond 20)', () => {
    const yes = loafCtx(true);
    const S = { chainLog: [{ icon:'🐌', desc: 'Gel 7.7s · tick 3ms · ecran visible · JS ⏱ 7.1s/1 · op json api.binance.com/api/v3/ticker/24hr · heap 10/954Mo · dom 4882 · page 4 · ws +11 · LoAF aucun', hash: 'g6o98i', time: '20:24:45' }, { icon:'🧠', desc: 'autre', hash: 'zz', time: '' }],
      perfLog: { gels: [{ t: 1, gap: 6.3, pStart: 90000, pEnd: 96300, hash: 'old', loaf: null }, { t: 2, gap: 7.7, pStart: 100000, pEnd: 107700, hash: 'g6o98i', loaf: null }], lent: [], heap: [], boots: [] } };
    yes.ctx.S = S;
    const mk = (start, dur, scripts, renderStart) => ({ startTime: start, duration: dur, blockingDuration: dur - 50, renderStart: renderStart || 0,
      scripts: scripts.map(([d, inv, type, fn, url, pos]) => ({ duration: d, invoker: inv, invokerType: type, sourceFunctionName: fn, sourceURL: url, sourceCharPosition: pos, forcedStyleAndLayoutDuration: 0, pauseDuration: 0 })) });
    // frame courte (700 ms) : dans _auraLoafs mais pas dans l'anneau durable ; hors fenêtre du gel
    yes.fire([mk(50000, 700, [[600, 'TimerHandler:setTimeout', 'user-callback', 'x', 'https://x/js/a.js', 1]])]);
    assert.strictEqual(S.perfLog.loaf, undefined, 'anneau alimenté par une frame < 1 s');
    assert.strictEqual(S.perfLog.gels[1].loaf, null);
    // la vraie frame : commence dans le trou, finit après le tick (100600 → 107750)
    yes.fire([mk(100600, 7150, [[7100, 'Window.fetch.then', 'resolve-promise', 'fetchBinancePrices', 'https://x/aura/js/02-state-init.js?v=1', 39001]], 107700)]);
    const g = J(S.perfLog.gels[1]);
    assert.deepStrictEqual(g.loaf, { dur: 7150, block: 7100, script: 7100, render: 50, scripts: [{ dur: 7100, inv: 'Window.fetch.then', type: 'resolve-promise', fn: 'fetchBinancePrices', src: '02-state-init.js', pos: 39001, layout: 0, pause: 0 }] });
    assert.strictEqual(J(S.perfLog.gels[0]).loaf, null, 'rattachée au mauvais gel');
    assert.strictEqual(S.chainLog[0].desc, 'Gel 7.7s · tick 3ms · ecran visible · JS ⏱ 7.1s/1 · op json api.binance.com/api/v3/ticker/24hr · heap 10/954Mo · dom 4882 · page 4 · ws +11 · LoAF 7.2s 02-state-init.js:fetchBinancePrices@39001 ← Window.fetch.then 7.1s · rendu 0.1s');
    assert.strictEqual(S.chainLog[1].desc, 'autre');
    const ring = J(S.perfLog.loaf); assert.strictEqual(ring.length, 1);
    const { t, time, ...rest } = ring[0];
    assert.deepStrictEqual(rest, { pStart: 100600, dur: 7150, block: 7100, script: 7100, render: 50, scripts: g.loaf.scripts });
    // une frame plus courte qui chevauche le même gel ne remplace pas la plus longue
    yes.fire([mk(101000, 1200, [[1100, 'a', 'b', 'c', 'https://x/d.js', 2]])]);
    assert.strictEqual(J(S.perfLog.gels[1]).loaf.dur, 7150);
    assert.strictEqual(S.perfLog.loaf.length, 2);
    for (let i = 0; i < 30; i++) yes.fire([mk(200000 + i * 5000, 1500, [])]);
    assert.strictEqual(S.perfLog.loaf.length, 20);
  });
  function gelCtx(opts){
    opts = opts || {};
    const block = between(s8, '  // [MONITEUR DE GEL · 02/08/2026]', '  // ═══ MULTIPLEXEUR 3 MODES', 'moniteur de gel');
    const S = Object.assign({ chainLog: [], perf: { _lastTickAt: 100000, lastMs: 76, _wsLast: 0 }, currentPage: 0 }, opts.S || {});
    const ctx = { S, Math, String, Date, Number, Array, Object, JSON, console,
      performance: { memory: { usedJSHeapSize: 228 * 1048576, jsHeapSizeLimit: 954 * 1048576 } },
      document: { hidden: false, getElementsByTagName: () => ({ length: 4186 }) } };
    ctx.window = ctx;
    ctx._auraWsMsgCount = 4;
    ctx._auraLongTasks = opts.longTasks || [{ start: 100500, dur: 2400 }, { start: 103000, dur: 2400 }, { start: 105500, dur: 2400 }];
    ctx._auraLastOp = opts.lastOp === null ? undefined : (opts.lastOp || { name: 'fetch js/09f1-bricks-action.js', at: 107400 });
    if (opts.loafSupported !== undefined) ctx._auraLoafSupported = opts.loafSupported;
    if (opts.loafs) ctx._auraLoafs = opts.loafs;
    vm.createContext(ctx);
    vm.runInContext('function gel(_perfStart){\n' + block + '\n}', ctx);
    ctx.gel(107500);   // 7,5 s après le tick précédent
    return ctx;
  }
  await T('08 moniteur de gel : ligne 🐌 avec op COMPLET + attribution LoAF · enregistrement S.perfLog.gels (valeurs numériques, LoAF, plafond 30)', () => {
    const loaf = { start: 100400, dur: 5800, block: 5750, script: 5700, render: 100, scripts: [{ dur: 5700, inv: 'IDBRequest.onsuccess', type: 'event-listener', fn: '_x', src: '07-v90-mode-bunker-sos.js', pos: 123, layout: 0, pause: 0 }] };
    const ctx = gelCtx({ loafSupported: true, loafs: [loaf, { start: 1, dur: 600, block: 0, script: 0, render: 0, scripts: [] }] });
    assert.strictEqual(ctx.S.chainLog.length, 1);
    const d = ctx.S.chainLog[0].desc;
    assert.ok(d.startsWith('Gel 7.5s · tick 76ms · ecran visible · JS ⏱ 7.2s/3 · op fetch js/09f1-bricks-action.js · heap 228/954Mo · dom 4186 · page 0 · ws +4'), d);
    assert.ok(d.endsWith(' · LoAF 5.8s 07-v90-mode-bunker-sos.js:_x@123 ← IDBRequest.onsuccess 5.7s · rendu 0.1s'), d);
    const r = J(ctx.S.perfLog.gels);
    assert.strictEqual(r.length, 1);
    const { t, time, hash, ...rest } = r[0];
    assert.ok(t > 0 && typeof time === 'string' && hash === ctx.S.chainLog[0].hash, 'hash ligne ≠ hash enregistrement');
    assert.deepStrictEqual(rest, { gap: 7.5, tickMs: 76, hidden: false, jsSum: 7.2, jsN: 3, osIdle: false, op: 'fetch js/09f1-bricks-action.js', heapU: 228, heapL: 954, dom: 4186, page: 0, ws: 4,
      loaf: { dur: 5800, block: 5750, script: 5700, render: 100, scripts: loaf.scripts }, pStart: 100000, pEnd: 107500 });
    for (let i = 0; i < 35; i++) { ctx.S.perf._lastTickAt = 100000; ctx.gel(107500); }
    assert.strictEqual(ctx.S.perfLog.gels.length, 30);
    assert.strictEqual(ctx.S.chainLog.length, 36);
  });
  await T('08 moniteur de gel : LoAF supporté sans frame → « LoAF aucun » · non supporté → aucune mention · op absent → op:null · suspension OS → osIdle', () => {
    const a = gelCtx({ loafSupported: true });
    assert.ok(a.S.chainLog[0].desc.endsWith(' · ws +4 · LoAF aucun'), a.S.chainLog[0].desc);
    const b = gelCtx({ loafSupported: false });
    assert.ok(!b.S.chainLog[0].desc.includes('LoAF'), b.S.chainLog[0].desc);
    const c = gelCtx({ lastOp: null });
    assert.strictEqual(J(c.S.perfLog.gels)[0].op, null);
    assert.ok(c.S.chainLog[0].desc.includes('JS ⏱ 7.2s/3 · heap'), c.S.chainLog[0].desc);
    const d = gelCtx({ longTasks: [] });
    const rd = J(d.S.perfLog.gels)[0];
    assert.strictEqual(rd.osIdle, true); assert.strictEqual(rd.jsSum, null); assert.strictEqual(rd.jsN, 0);
    assert.ok(d.S.chainLog[0].desc.includes('JS inactif (suspension OS)'));
  });
  await T('08 échantillonneur heap : +1 min puis toutes les 10 min, enregistrement heap/limit/dom/cycle/page, plafond 144, sans état → rien', () => {
    const iife = between(s8, '(function _auraHeapSampler(){', '\n// Marqueur d\'operation lourde', 'échantillonneur');
    const timers = [];
    const S = { agents: [], cycle: 551043, currentPage: 4 };
    const ctx = { S, Math, Date, Array, JSON, String, console, setTimeout: (fn, ms) => timers.push({ fn, ms }), setInterval: (fn, ms) => timers.push({ fn, ms, interval: true }),
      performance: { memory: { usedJSHeapSize: 250 * 1048576, jsHeapSizeLimit: 954 * 1048576 } }, document: { getElementsByTagName: () => ({ length: 4300 }) } };
    ctx.window = ctx; vm.createContext(ctx);
    vm.runInContext(iife, ctx);
    assert.deepStrictEqual(timers.map(t => [t.ms, !!t.interval]), [[60000, false], [600000, true]]);
    timers[0].fn();
    const h = J(S.perfLog.heap);
    assert.strictEqual(h.length, 1);
    const { t, time, ...rest } = h[0];
    assert.deepStrictEqual(rest, { heap: 250, limit: 954, dom: 4300, cycle: 551043, page: 4 });
    for (let i = 0; i < 150; i++) timers[1].fn();
    assert.strictEqual(S.perfLog.heap.length, 144);
    S.agents = null; const n = S.perfLog.heap.length; timers[1].fn(); assert.strictEqual(S.perfLog.heap.length, n, 'échantillon sans état');
  });

  /* ───── dynamique : 00, 09k ───── */
  await T('00 _report : ligne ⏱ LENT inchangée + enregistrement S.perfLog.lent (nom, durée, phase), plafond 30', () => {
    const s0 = src('js/00-backup-state.js');
    const code = between(s0, '    function _report(name, dur) {', '    function _wrapFn(', '_report');
    const S = { chainLog: [], perf: { slowest: { name: 'rendus page 0', ms: 1600 } } };
    const ctx = { window: {}, S, Date, Math, String, Array, Number, JSON }; vm.createContext(ctx);
    vm.runInContext('var _now=function(){return 0};' + code + '; this._report=_report;', ctx);
    ctx._report('timer setInterval@01-chrono-network.js:350', 1640);
    assert.strictEqual(S.chainLog[0].desc, 'LENT: timer setInterval@01-chrono-network.js:350 1.6s \u00B7 phase rendus page 0 1.6s');
    const l = J(S.perfLog.lent); assert.strictEqual(l.length, 1);
    const { t, time, ...rest } = l[0];
    assert.deepStrictEqual(rest, { name: 'timer setInterval@01-chrono-network.js:350', dur: 1640, phase: { name: 'rendus page 0', ms: 1600 } });
    for (let i = 0; i < 40; i++) ctx._report('x', 1100);
    assert.strictEqual(S.perfLog.lent.length, 30);
  });
  await T('09k : trace de boot (heure, heap, cycle, DOC_V, prevSavedAt = savedAt du snapshot relu), plafond 20', () => {
    const sk = src('js/09k-init.js');
    const block = between(sk, '  // [GEL BOOT · 11/09/2026] trace de boot durable', '\n  try {\n    const _mBtn', 'trace de boot');
    const S = { cycle: 551043, _restoredSavedAt: '2026-09-10T10:11:07.000Z' };
    const ctx = { S, Math, Date, String, Array, JSON, DOC_V: TOK, performance: { memory: { usedJSHeapSize: 228 * 1048576, jsHeapSizeLimit: 954 * 1048576 } } };
    vm.createContext(ctx);
    vm.runInContext('function boot(restored){\n' + block + '\n}', ctx);
    ctx.boot(true);
    const b = J(S.perfLog.boots); assert.strictEqual(b.length, 1);
    const { t, time, ...rest } = b[0];
    assert.deepStrictEqual(rest, { restored: true, cycle: 551043, heap: 228, limit: 954, doc: TOK, prevSavedAt: '2026-09-10T10:11:07.000Z' });
    ctx.boot(false); assert.strictEqual(J(S.perfLog.boots)[1].prevSavedAt, null);
    for (let i = 0; i < 25; i++) ctx.boot(true);
    assert.strictEqual(S.perfLog.boots.length, 20);
  });

  /* ───── dynamique : 09b1 + 09b2 (aller-retour, bornes, fermeture des connexions IDB) ───── */
  function mkIdb(counter, stored){
    // fausse IndexedDB minimale : open → db ; transaction → put/get ; close compté
    return { open(){ const req = {}; counter.opened++;
      const db = { objectStoreNames: { contains: () => true }, close(){ counter.closed++; },
        transaction(){ const tx = {}; const store = { keyPath: null,
          put(v, k){ stored.value = J(v); const r = {}; setTimeout(() => { r.onsuccess && r.onsuccess(); tx.oncomplete && tx.oncomplete(); }, 0); return r; },
          get(){ const r = {}; setTimeout(() => { r.onsuccess && r.onsuccess({ target: { result: stored.value ? J(stored.value) : undefined } }); tx.oncomplete && tx.oncomplete(); }, 0); return r; } };
          tx.objectStore = () => store; return tx; } };
      setTimeout(() => { req.result = db; req.onsuccess && req.onsuccess(); }, 0); return req; } };
  }
  function ctx9b(){
    const counter = { opened: 0, closed: 0 }, stored = {};
    const ctx = { console: { log(){}, warn(){}, error(){} }, performance, Date, Math, JSON, Array, Object, String, Number,
      localStorage: mkStorage(), setTimeout, setInterval: () => 0, clearInterval(){}, clearTimeout(){},
      document: { getElementById: () => null, addEventListener(){}, querySelector: () => null }, navigator: {}, addEventListener(){}, removeEventListener(){},
      indexedDB: mkIdb(counter, stored), S: { agents: [], pairStates: {}, chainLog: [], cycle: 1000, portfolio: 100, walletStore: {} },
      RT: { SAVE_KEY: 'nexus_state_v2', STORE_STATE: 'state', DB_NAME: 'NEXUS_DB' }, PAIRS: {} };
    ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
    vm.runInContext(src('js/09a-runtime-state.js'), ctx, { filename: '09a' });
    vm.runInContext(src('js/09b1-build-snapshot.js'), ctx, { filename: '09b1' });
    vm.runInContext(src('js/09b2-save-load.js'), ctx, { filename: '09b2' });
    ctx._stateReady = true;   // 09a/09b2 bloquent saveState tant que le démarrage n'est pas fini
    return { ctx, counter, stored };
  }
  await T('09b1 → 09b2 : perfLog sauvegardé borné (40 gels → 30), relu par loadState, _restoredSavedAt = savedAt du snapshot, S.perf volatile jamais sauvegardé', async () => {
    const { ctx, stored } = ctx9b();
    ctx.S.perf = { _lastTickAt: 12345 };
    ctx.S.perfLog = { gels: Array.from({ length: 40 }, (_, i) => ({ gap: i, t: i })), lent: [{ name: 'a', dur: 1200 }], heap: Array.from({ length: 200 }, (_, i) => ({ heap: i })), boots: [{ t: 5 }], loaf: Array.from({ length: 25 }, (_, i) => ({ dur: 1000 + i })) };
    const ok = await ctx.saveState(true);
    assert.strictEqual(ok, true);
    const snap = stored.value;
    assert.ok(snap && snap.perfLog, 'perfLog absent du snapshot IDB');
    assert.strictEqual(snap.perfLog.gels.length, 30); assert.strictEqual(snap.perfLog.gels[0].gap, 10);
    assert.strictEqual(snap.perfLog.heap.length, 144); assert.strictEqual(snap.perfLog.lent.length, 1); assert.strictEqual(snap.perfLog.boots.length, 1); assert.strictEqual(snap.perfLog.loaf.length, 20); assert.strictEqual(snap.perfLog.loaf[0].dur, 1005);
    assert.strictEqual(snap.perf, undefined, 'S.perf sauvegardé');
    assert.ok(ctx._APPLYSNAP_MANIFEST.includes('perfLog'));
    ctx.S.perfLog = null; ctx.S.cycle = 0; ctx.S._restoredSavedAt = undefined;
    const r = await ctx.loadState();
    assert.strictEqual(r, true);
    assert.strictEqual(ctx.S.perfLog.gels.length, 30); assert.strictEqual(ctx.S.perfLog.heap.length, 144); assert.strictEqual(ctx.S.perfLog.lent[0].name, 'a'); assert.strictEqual(ctx.S.perfLog.loaf.length, 20);
    assert.strictEqual(ctx.S._restoredSavedAt, snap.savedAt);
  });
  await T('09b2 : chaque connexion IDB ouverte par saveState / loadState est refermée (fausse IDB : ouvertures = fermetures)', async () => {
    const { ctx, counter } = ctx9b();
    for (let i = 0; i < 5; i++) { ctx.S.cycle = 1000 + i; assert.strictEqual(await ctx.saveState(true), true); }
    await new Promise(r => setTimeout(r, 20));
    assert.ok(counter.opened >= 5, 'ouvertures ' + counter.opened);
    assert.strictEqual(counter.closed, counter.opened, 'ouvertes ' + counter.opened + ' ≠ fermées ' + counter.closed);
    await ctx.loadState();
    await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(counter.closed, counter.opened, 'loadState : ouvertes ' + counter.opened + ' ≠ fermées ' + counter.closed);
  });

  /* ───── dynamique : embed ───── */
  await T('embed : ouverture sans cache → runAll() puis runAll({code:true,refreshCode:false}) · avec cache → un seul appel · Relancer → refreshCode:true · aucun timer de boot', async () => {
    const calls = []; const body = []; const timers = []; let cached = false;
    const mkEl = (tag) => { const el = { tagName: tag, style: {}, innerHTML: '', textContent: '', children: [], attrs: {}, classList: { add(){}, remove(){}, contains(){ return false; } },
      appendChild(c){ this.children.push(c); c.parentNode = this; return c; }, remove(){}, setAttribute(k, v){ this.attrs[k] = v; }, getAttribute(k){ return this.attrs[k]; }, querySelectorAll(){ return buttons; }, addEventListener(){} }; return el; };
    const buttons = ['json','text','backup','reload','full'].map(a => { const b = mkEl('button'); b.attrs['data-a'] = a; return b; });
    const ids = {};
    const document = { readyState: 'complete', visibilityState: 'visible', hidden: false, head: mkEl('head'), body: { appendChild(c){ body.push(c); c.parentNode = { children: body }; return c; }, get children(){ return body; } },
      createElement: mkEl, getElementById(id){ return ids[id] || (ids[id] = mkEl('div')); }, addEventListener(){}, querySelector(){ return null; } };
    const ctxE = { console, document, performance, URL,
      setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, setInterval: (fn, ms) => { timers.push({ fn, ms, interval: true }); return 0; }, clearInterval(){},
      alert: () => { throw new Error('alert() appelé'); },
      GuardianCore: { runAll: async function(){ calls.push(arguments.length ? J(arguments[0]) : undefined); return { mode: 'embedded', results: [], ts: Date.now() }; }, codeCached: () => cached,
        dataDownload: { now: async () => true }, autoBackup: { tick: async () => ({ ok: false }) }, detectMode: () => 'embedded', export: { resultsJSON: () => ({}), resultsText: () => '' } } };
    ctxE.window = ctxE; vm.createContext(ctxE);
    vm.runInContext(src('guardian-embed.js'), ctxE, { filename: 'guardian-embed.js' });
    const fab = body.find(e => e.id === 'gdnFab') || body[0];
    assert.ok(fab && typeof fab.onclick === 'function', 'bouclier absent');
    assert.deepStrictEqual(timers.filter(t => !t.interval).map(t => t.ms), [], 'timer one-shot au boot : ' + JSON.stringify(timers.filter(t => !t.interval).map(t => t.ms)));
    assert.deepStrictEqual(timers.filter(t => t.interval).map(t => t.ms), [120000, 120000], 'intervalles');
    assert.strictEqual(calls.length, 0, 'runAll au chargement');
    await fab.onclick(); await new Promise(r => setImmediate(r));
    assert.deepStrictEqual(calls, [undefined, { code: true, refreshCode: false }], 'ouverture sans cache');
    cached = true; calls.length = 0;
    await fab.onclick(); await new Promise(r => setImmediate(r));
    assert.deepStrictEqual(calls, [{ code: true, refreshCode: false }], 'ouverture avec cache');
    calls.length = 0;
    await ids.gdnRun.onclick(); await new Promise(r => setImmediate(r));
    assert.deepStrictEqual(calls, [{ code: true, refreshCode: true }], 'Relancer');
    calls.length = 0;
    timers.filter(t => t.interval)[0].fn(); await new Promise(r => setImmediate(r));
    assert.deepStrictEqual(calls, [undefined], 'scan silencieux avec argument');
  });

  console.log('\n' + (fail ? '❌' : '✅') + ' banc-gel-boot : ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
