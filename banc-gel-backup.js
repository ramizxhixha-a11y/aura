// banc-gel-backup.js — [GEL BOOT · 11/09/2026] VERSION 20260911c · mission « nommer et corriger » : le double gel de boot
// Banc AUTONOME (node banc-gel-backup.js depuis la racine du dépôt).
//
// LA DONNÉE (captures Rams 11/09 20:54, DOC_V 20260911b — le navigateur a nommé le bloqueur, sonde LoAF de b) :
//   🐌 Gel 6.6s · … · op json open.er-api.com/v6/latest/USD · … · LoAF 6.0s 03-per-pair-position-buttons-controls-buid.js:anonyme@261123 ← IDBRequest.onsuccess 6.0s · rendu 0.0s   (20:54:49)
//   🐌 Gel 7.2s · … · op json api.binance.com/api/v3/ticker/24hr · … · LoAF 6.3s 03-per-pair-position-buttons-controls-buid.js:anonyme@262456 ← IDBRequest.onsuccess 6.1s · rendu 0.1s   (20:54:57)
// Positions 261123 / 262456 = unités UTF-16 du fichier 03 (version b) : les deux `req.onsuccess = () => resolve(req.result || [])`
// qui suivaient `store.getAll()` dans _saveBackupToDB (rotation, l.5712) et _loadAllBackups (liste, l.5752). `req.result` désérialise
// TOUT le store aura_backups (N × ≈ 1,5 Mo) dans la tâche de l'événement : 6 s, deux fois, à chaque boot, déclenchés par le
// setTimeout(…, 3000) multi-lignes de 04 (invisible au grep sur une ligne — le 3e timer de boot, c'était lui).
// Cause du store obèse : 09b3 déclarait `function _buildFullBackup()` (global, sans meta) APRÈS 03 → écrasait
// `_buildFullBackup(label, type)` de 03 → backup auto sans meta → rotation plantée (b.meta.type) → date jamais mémorisée →
// un enregistrement de 1,5 Mo de plus À CHAQUE DÉMARRAGE depuis le 28/06, jamais supprimé.
//
// CE QUE CE BANC PROUVE :
//  1) 09b3 ne déclare plus _buildFullBackup (renommé _buildFullBackupFile, 2 appelants), 03 garde le sien ;
//  2) 03 : plus AUCUN getAll() sur le store des enregistrements complets ; liste + rotation sur l'index backups_meta (IDB v2) ;
//     _getBackup(id) lit UN enregistrement ; _ensureBackupIndex reconstruit l'index un enregistrement par tâche (respiration),
//     supprime les enregistrements sans meta, journalise, une seule fois par session, rien si l'index est complet ;
//  3) _saveBackupToDB refuse un backup sans meta ; _checkAutoBackup mémorise la date ; exportBackup ne plante plus ;
//  4) 04 : restoreBackup lit un seul enregistrement ; timers de boot = liste/index à +3 s, backup auto à +90 s ;
//  5) fausse IDB : ouvertures = fermetures, désérialisations comptées (0 au boot hors reconstruction) ;
//  6) token 20260911c partout (HTML 78 ?v= + DOC_V, en-têtes 03/04/09b3, bancs).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname;
const TOK = (function(){ const m = require('fs').readFileSync(require('path').join(__dirname, 'AURA8_v118.html'), 'utf8').match(/DOC_V = '(\d{8}[a-z])'/); if (!m) { console.error('DOC_V introuvable dans AURA8_v118.html'); process.exit(2); } return m[1]; })();   // [12/09/2026] token lu dans le HTML (source unique) : plus jamais figé dans un banc
const VER03 = '20260911c';   // [12/09] version de la livraison qui a touché 03/04/09b3 en dernier — indépendante du token courant du HTML
const HEAD = '// [GEL BOOT · 11/09/2026] VERSION ' + VER03;
const HEAD03 = '// [ABSTENTION · 26/09/2026] VERSION 20260926n';   // [1b-b · 15/09] 03 relivré (heatmap EV/RE seulement) ; en-tête PHASE 1 20260912c en 2e ligne ; 04/09b3 restent au GEL BOOT 20260911c
const F03 = 'js/03-per-pair-position-buttons-controls-buid.js', F04 = 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', F9B3 = 'js/09b3-import-export.js';
let pass = 0, fail = 0;
async function T(name, fn){ try { await fn(); pass++; console.log('  ✅', name); } catch(e){ fail++; console.log('  ❌', name, '\n     ', (e && e.stack || e).toString().split('\n').slice(0,3).join('\n      ')); } }
process.on('unhandledRejection', e => { fail++; console.log('  ❌ rejet non géré :', e && e.message); });
const J = (x) => JSON.parse(JSON.stringify(x));
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const between = (s, a, b, label) => { const i = s.indexOf(a); assert.ok(i >= 0, 'début introuvable : ' + label); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'fin introuvable : ' + label); return s.slice(i, j); };
const tick = (n) => new Promise(r => { let k = n || 30; const step = () => (--k <= 0) ? r() : setImmediate(step); step(); });

/* ───── stubs ───── */
function mkStorage(){ const o = {}; for (const [k,f] of Object.entries({
  getItem(k){ return Object.prototype.hasOwnProperty.call(o,k) ? o[k] : null; },
  setItem(k,v){ o[k] = String(v); }, removeItem(k){ delete o[k]; } })) Object.defineProperty(o, k, { value:f, enumerable:false }); return o; }

// Fausse IndexedDB : versions/upgrade, stores keyPath/autoIncrement, transactions (oncomplete après la dernière requête),
// requêtes asynchrones (setImmediate), et surtout COMPTAGE des désérialisations : chaque enregistrement rendu par
// `req.result` (get / getAll) compte 1 dans stats.reads[store]. openCursor() est interdit (il désérialise chaque valeur).
function mkIdb(stats){
  const dbs = {};
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const sortedKeys = (st) => Array.from(st.rows.keys()).sort((a, b) => (typeof a === typeof b) ? (a < b ? -1 : a > b ? 1 : 0) : (typeof a === 'number' ? -1 : 1));
  function settle(req, tx, exec){
    tx._pending++;
    setImmediate(() => {
      let r;
      try { r = exec(); } catch(e){ req.error = e; tx._pending--; if (req.onerror) req.onerror({ target: req }); schedule(tx); return; }
      req._res = r.value; req._n = r.n || 0;
      if (req.onsuccess) req.onsuccess({ target: req });
      tx._pending--;
      schedule(tx);
    });
  }
  function schedule(tx){ setImmediate(() => { if (!tx._done && tx._pending === 0) { tx._done = true; stats.txDone++; if (tx.oncomplete) tx.oncomplete({ target: tx }); } }); }
  function mkReq(storeName){
    const req = { onsuccess: null, onerror: null, error: null, _res: undefined, _n: 0 };
    Object.defineProperty(req, 'result', { get(){ if (storeName && req._n) stats.reads[storeName] = (stats.reads[storeName] || 0) + req._n; return req._res; } });
    return req;
  }
  function mkStore(db, name, tx){
    const st = db.stores[name];
    if (!st) throw new Error('store inexistant : ' + name);
    const api = {
      name,
      createIndex(){ return {}; },
      add(v){ const req = mkReq(name); settle(req, tx, () => {
        let key = st.keyPath ? v[st.keyPath] : undefined;
        if (key === undefined) { if (!st.autoIncrement) throw new Error('clé absente'); key = ++st.seq; }
        if (st.rows.has(key)) throw new Error('ConstraintError'); const c = clone(v); if (st.keyPath) c[st.keyPath] = key; st.rows.set(key, c); return { value: key }; }); return req; },
      put(v){ const req = mkReq(name); settle(req, tx, () => {
        let key = st.keyPath ? v[st.keyPath] : undefined;
        if (key === undefined) { if (!st.autoIncrement) throw new Error('clé absente'); key = ++st.seq; }
        const c = clone(v); if (st.keyPath) c[st.keyPath] = key; st.rows.set(key, c); return { value: key }; }); return req; },
      get(k){ const req = mkReq(name); settle(req, tx, () => { const v = st.rows.get(k); return { value: v === undefined ? undefined : clone(v), n: v === undefined ? 0 : 1 }; }); return req; },
      getAll(){ const req = mkReq(name); settle(req, tx, () => { const all = sortedKeys(st).map(k => clone(st.rows.get(k))); return { value: all, n: all.length }; }); return req; },
      delete(k){ const req = mkReq(name); settle(req, tx, () => { st.rows.delete(k); return { value: undefined }; }); return req; },
      count(){ const req = mkReq(name); settle(req, tx, () => ({ value: st.rows.size })); return req; },
      openKeyCursor(){
        const req = mkReq(name); const keys = sortedKeys(st); let i = -1;
        const step = () => settle(req, tx, () => { i++; if (i >= keys.length) return { value: null }; return { value: { key: keys[i], primaryKey: keys[i], continue: step } }; });
        step(); return req;
      },
      openCursor(){ throw new Error('openCursor() interdit sur ' + name + ' : il désérialise chaque valeur'); }
    };
    return api;
  }
  function mkTx(db, names, mode){
    const tx = { mode, oncomplete: null, onerror: null, onabort: null, error: null, _pending: 0, _done: false,
      objectStore(n){ if (!names.includes(n)) throw new Error('store hors transaction : ' + n); return mkStore(db, n, tx); } };
    return tx;
  }
  function mkConn(db){
    const conn = {
      name: db.name,
      objectStoreNames: { contains: (n) => !!db.stores[n] },
      createObjectStore(n, opts){ opts = opts || {}; db.stores[n] = { keyPath: opts.keyPath || null, autoIncrement: !!opts.autoIncrement, seq: 0, rows: new Map() }; stats.created.push(n); return { createIndex(){ return {}; } }; },
      transaction(names, mode){ names = [].concat(names); return mkTx(db, names, mode || 'readonly'); },
      close(){ stats.closed++; }
    };
    return conn;
  }
  return {
    _dbs: dbs,
    open(name, version){
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null, error: null };
      setImmediate(() => {
        let db = dbs[name]; if (!db) db = dbs[name] = { name, version: 0, stores: {} };
        const conn = mkConn(db);
        if (version && version < db.version) { req.error = new Error('VersionError'); if (req.onerror) req.onerror({ target: req }); return; }
        if (version && version > db.version) {
          const old = db.version; db.version = version;
          stats.upgrades.push({ from: old, to: version });
          const tx = mkTx(db, Object.keys(db.stores), 'versionchange');
          if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: conn, transaction: tx }, oldVersion: old, newVersion: version });
        }
        stats.opened++;
        req.result = conn;
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
    // état initial (v1) : enregistrements bruts dans le store des backups
    seedV1(name, rows){ const db = dbs[name] = { name, version: 1, stores: {} }; db.stores.backups = { keyPath: 'id', autoIncrement: true, seq: 0, rows: new Map() };
      rows.forEach(r => { const key = ++db.stores.backups.seq; const c = clone(r); c.id = key; db.stores.backups.rows.set(key, c); }); return db; },
    rows(name, store){ const db = dbs[name]; return db && db.stores[store] ? Array.from(db.stores[store].rows.values()) : null; }
  };
}
function mkStats(){ return { reads: {}, opened: 0, closed: 0, txDone: 0, upgrades: [], created: [] }; }

// contexte : tranche « backup » de 03 + tranche « restauration / cache / timers » de 04
function mkCtx(opts){
  opts = opts || {};
  const stats = mkStats();
  const idb = mkIdb(stats);
  if (opts.seed) idb.seedV1('aura_backups', opts.seed);
  const timers = [], toasts = [], breaths = [];
  const S = opts.S || { cycle: 551043, portfolio: 100, agents: [{ id: 'a1', fitness: 120 }], pairStates: { 'BTC/USDT': { price: 1 } }, chainLog: [], tradingMode: 'paperReal' };
  const ctx = { console: { log(){}, warn(){}, error(){} }, Date, Math, JSON, Array, Object, String, Number, Promise, Error, TypeError,
    localStorage: mkStorage(), sessionStorage: mkStorage(),
    setTimeout: (fn, ms) => { timers.push(ms); if (ms >= 500) return 0; if (ms === 150) breaths.push(Date.now()); return setTimeout(fn, ms === 150 ? 2 : ms); },
    clearTimeout, setInterval: () => 0, clearInterval(){},
    setImmediate,
    indexedDB: idb,
    S, rndHash: () => '0xdeadbeef00...', nowStr: () => '20:54:49',
    showToast: (m) => toasts.push(m), alert: (m) => toasts.push('ALERT:' + m), confirm: () => (opts.confirm !== undefined ? opts.confirm : true),
    location: { reload(){ ctx._reloaded = (ctx._reloaded || 0) + 1; } },
    saveState: () => { ctx._saved = (ctx._saved || 0) + 1; return true; }, buildSnapshot: () => J(S),
    renderSettingsPanel: () => { ctx._rendered = (ctx._rendered || 0) + 1; },
    Blob: function(parts, o){ this.size = parts.join('').length; this.type = o && o.type; },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL(){} },
    document: { body: { appendChild(){}, removeChild(){} }, createElement: () => ({ click(){} }), getElementById: () => null, addEventListener(){}, querySelector: () => null },
    navigator: {}, addEventListener(){}, removeEventListener(){} };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  const s03 = between(src(F03), '// v8.0 LIVRAISON 32 · SYSTÈME DE BACKUP / IMPORT / RESTORE', '// [MÉRITE DES BOTS · 26/09/2026] MÉRITE MESURÉ DES BOTS', 'tranche 03')   /* [26/09] l'audit des vetos du 15/08 remplacé par le mérite des bots : même position */;
  vm.runInContext(s03, ctx, { filename: '03-backup' });
  const s04 = between(src(F04), '// Restaurer un backup historique (depuis IndexedDB)', 'function renderSettingsPanel() {', 'tranche 04');
  vm.runInContext(s04, ctx, { filename: '04-restore' });
  return { ctx, stats, idb, timers, toasts, breaths, S, run: (code) => vm.runInContext(code, ctx) };
}
const V1_VALID = (type, date, cycle) => ({ meta: { version: 'v8.0', date, label: type + ' · test', type, app: 'AURA', hash: 'h', _modifications_log: [], sizeChars: 1500000 }, state: { cycle, portfolio: 50 } });
const V1_NOMETA = (cycle) => ({ _type: 'aura_guardian_full', savedAt: '2026-08-01T00:00:00.000Z', auraCycle: cycle, aura: { cycle, portfolio: 1 }, guardian: null });

(async () => {
  console.log('▶ banc-gel-backup · token', TOK);

  /* ───── statique ───── */
  await T('syntaxe : 03, 04, 09b3 compilent + en-têtes VERSION ' + VER03 + ' (03 : ABSTENTION 20260926n)', () => {
    for (const f of [F03, F04, F9B3]) { new vm.Script(src(f), { filename: f }); assert.ok(src(f).startsWith(f === F03 ? HEAD03 : HEAD), f + ' : en-tête'); }
  });
  await T('oracle : les deux lignes 🐌 réelles nomment 03 @261123 / @262456 ← IDBRequest.onsuccess (format LoAF de 08)', () => {
    const lines = [
      'Gel 6.6s · tick 8ms · ecran visible · JS ⏱ 6.0s/2 · op json open.er-api.com/v6/latest/USD · heap 10/954Mo · dom 4168 · page 4 · ws +4 · LoAF 6.0s 03-per-pair-position-buttons-controls-buid.js:anonyme@261123 ← IDBRequest.onsuccess 6.0s · rendu 0.0s',
      'Gel 7.2s · tick 3ms · ecran visible · JS ⏱ 6.1s/1 · op json api.binance.com/api/v3/ticker/24hr · heap 10/954Mo · dom 4882 · page 4 · ws +16 · LoAF 6.3s 03-per-pair-position-buttons-controls-buid.js:anonyme@262456 ← IDBRequest.onsuccess 6.1s · rendu 0.1s'
    ];
    const re = /LoAF ([\d.]+)s (\S+?):(\S+?)@(\d+) ← (\S+) ([\d.]+)s · rendu ([\d.]+)s/;
    const got = lines.map(l => { const m = l.match(re); assert.ok(m, 'ligne non parsée'); return { file: m[2], fn: m[3], pos: +m[4], invoker: m[5], script: +m[6] }; });
    assert.deepStrictEqual(got, [
      { file: '03-per-pair-position-buttons-controls-buid.js', fn: 'anonyme', pos: 261123, invoker: 'IDBRequest.onsuccess', script: 6.0 },
      { file: '03-per-pair-position-buttons-controls-buid.js', fn: 'anonyme', pos: 262456, invoker: 'IDBRequest.onsuccess', script: 6.1 }
    ]);
  });
  await T('09b3 : _buildFullBackup global SUPPRIMÉ (renommé _buildFullBackupFile, exporté, 2 appelants) · 03 garde _buildFullBackup(label, type) · aucune autre déclaration dans le dépôt', () => {
    const s = src(F9B3); const code = s.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    assert.ok(!/function _buildFullBackup\s*\(/.test(code), '09b3 déclare encore _buildFullBackup');
    assert.ok(!/window\._buildFullBackup\s*=/.test(code), '09b3 exporte encore _buildFullBackup');
    assert.strictEqual(code.split('function _buildFullBackupFile()').length, 2);
    assert.strictEqual(code.split('window._buildFullBackupFile = _buildFullBackupFile;').length, 2);
    assert.strictEqual(code.split('const full = _buildFullBackupFile();').length, 3, '2 appelants');
    const s03 = src(F03); assert.strictEqual(s03.split('function _buildFullBackup(label, type) {').length, 2);
    const files = fs.readdirSync(path.join(ROOT, 'js')).map(f => 'js/' + f).concat(fs.readdirSync(ROOT).filter(f => /\.js$/.test(f) && !/^banc-/.test(f) && f !== '03.js'));
    const decl = files.filter(f => /(^|\n)\s*(async\s+)?function _buildFullBackup\s*\(/.test(src(f)));
    assert.deepStrictEqual(decl, [F03], 'déclarations de _buildFullBackup : ' + decl.join(','));
  });
  await T('03 : plus AUCUN getAll() sur le store des enregistrements complets (seul backups_meta est lu en bloc), aucun openCursor, IDB v2, _getBackup, _ensureBackupIndex', () => {
    const s = src(F03);
    const sl = between(s, '// v8.0 LIVRAISON 32 · SYSTÈME DE BACKUP', '// [MÉRITE DES BOTS · 26/09/2026] MÉRITE MESURÉ DES BOTS', 'tranche 03')   /* [26/09] l'audit des vetos du 15/08 remplacé par le mérite des bots : même position */;
    const code = sl.split('\n').filter(l => !l.trim().startsWith('//'));
    const getAlls = code.filter(l => l.includes('getAll('));
    assert.strictEqual(getAlls.length, 2, 'getAll() : ' + getAlls.length);
    getAlls.forEach(l => assert.ok(/metaStore\.getAll\(|AURA_BACKUP_META_STORE\)\.getAll\(/.test(l), 'getAll hors index : ' + l.trim()));
    assert.ok(!code.some(l => /\.openCursor\(/.test(l)), 'openCursor présent');
    assert.strictEqual(code.filter(l => l.includes('.openKeyCursor()')).length, 1);
    assert.ok(sl.includes("const AURA_BACKUP_META_STORE = 'backups_meta';") && sl.includes('const AURA_BACKUP_DB_VERSION = 2;'));
    assert.ok(sl.includes('indexedDB.open(AURA_BACKUP_DB, AURA_BACKUP_DB_VERSION)'));
    for (const f of ['async function _ensureBackupIndex()', 'async function _getBackup(id)', 'window._getBackup = _getBackup;', 'function _isValidBackupMeta(m)', 'function _idbReq(req)', 'function _idbTxDone(tx)']) assert.strictEqual(sl.split(f).length, 2, f);
    // le store des enregistrements n'est lu que par store.get(key) (index) et .get(id) (_getBackup)
    const gets = code.filter(l => /\.get\(/.test(l) && !/getItem|getAll|getElementById|getAttribute/.test(l));
    assert.deepStrictEqual(gets.map(l => l.trim()), ['const rec = await _idbReq(store.get(key));   // UNE désérialisation (≈ 1,5 Mo) dans cette tâche, pas plus', 'const rec = await _idbReq(tx.objectStore(AURA_BACKUP_STORE).get(id));']);
    // la reconstruction respire entre deux enregistrements
    assert.ok(between(sl, 'async function _ensureBackupIndex()', 'function _buildFullBackup(label', 'index').includes('await new Promise(r => setTimeout(r, 150));'));
  });
  await T('04 : restoreBackup lit UN enregistrement (_getBackup) · timers de boot : liste + index à +3 s, backup auto à +90 s, rien d\'autre n\'appelle _checkAutoBackup', () => {
    const s = src(F04);
    const rb = between(s, 'async function restoreBackup(id) {', 'window.restoreBackup = restoreBackup;', 'restoreBackup').split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    assert.ok(rb.includes('const backup = await _getBackup(id);') && !rb.includes('_loadAllBackups'), 'restoreBackup lit encore la liste');
    assert.ok(/setTimeout\(\(\) => \{\s*_refreshBackupsCache\(\);\s*if \(typeof _ensureBackupIndex === 'function'\) _ensureBackupIndex\(\);\s*\}, 3000\);/.test(s), 'timer +3 s');
    assert.ok(/setTimeout\(\(\) => \{\s*_checkAutoBackup\(\);\s*\}, 90000\);/.test(s), 'timer +90 s');
    // aucun timer < 60 s ne mène à _checkAutoBackup, nulle part (grep MULTI-LIGNES : `setTimeout(` … `}, N)`)
    const files = fs.readdirSync(path.join(ROOT, 'js')).map(f => 'js/' + f).concat(['guardian-core.js', 'guardian-embed.js']);
    const hits = [];
    for (const f of files) {
      const t = src(f); const re = /setTimeout\(\s*(?:function[^{]*|\([^)]*\)\s*=>|[\w$]+\s*=>)\s*\{([\s\S]*?)\}\s*,\s*(\d+)\s*\)/g; let m;
      while ((m = re.exec(t))) if (/_checkAutoBackup\(/.test(m[1])) hits.push(f + ':' + m[2]);
    }
    assert.deepStrictEqual(hits, [F04 + ':90000'], 'timers vers _checkAutoBackup : ' + hits.join(', '));
    const calls = files.filter(f => src(f).split('\n').some(l => !l.trim().startsWith('//') && /_checkAutoBackup\(\)/.test(l) && !/async function _checkAutoBackup/.test(l)));
    assert.deepStrictEqual(calls, [F04]);
  });
  await T('HTML : DOC_V = ' + TOK + ', 80 ?v= au même token, aucun 20260911a / 20260911b · bancs p0b / gel-guardian / gel-boot lisent le token dans le HTML', () => {
    const h = src('AURA8_v118.html');
    assert.ok(h.includes("DOC_V = '" + TOK + "'"));
    const toks = h.match(/\?v=[0-9a-z]+/g) || [];
    assert.strictEqual(toks.length, 80);   // [ÉCRAN APPRIS 23/09] +1 : js/11b-ecran-appris.js
    assert.deepStrictEqual(toks.filter(t => t !== '?v=' + TOK), []);
    assert.ok(!h.includes('20260911a') && !h.includes('20260911b'));
    for (const b of ['banc-p0b-newskey.js', 'banc-gel-guardian.js', 'banc-gel-boot.js']) assert.ok(src(b).includes("match(/DOC_V = '(\\d{8}[a-z])'/)") && !/const TOK = '\d{8}[a-z]'/.test(src(b)), b + ' : token figé au lieu d\'être lu dans le HTML');   // [12/09] plus aucun banc ne fige le token
  });

  /* ───── dynamique : fausse IDB ───── */
  await T('_buildFullBackup (03) : { meta: { type, date, label, hash, sizeChars, _modifications_log }, state = clone de S } · journal du dernier backup repris depuis l\'index', () => {
    const { ctx, run } = mkCtx();
    run("_cachedBackupsList = [{ id: 9, meta: { type: 'auto', date: 1, _modifications_log: [{ a: 1 }] } }]");
    const b = J(ctx._buildFullBackup('Auto · x', 'auto'));
    assert.strictEqual(b.meta.type, 'auto'); assert.strictEqual(b.meta.label, 'Auto · x'); assert.strictEqual(typeof b.meta.date, 'number');
    assert.ok(b.meta.hash && b.meta.sizeChars > 10); assert.deepStrictEqual(b.meta._modifications_log, [{ a: 1 }]);
    assert.deepStrictEqual(b.state, J(ctx.S));
    assert.strictEqual(ctx._isValidBackupMeta(b.meta), true);
    assert.strictEqual(ctx._isValidBackupMeta({ savedAt: 'x' }), false); assert.strictEqual(ctx._isValidBackupMeta(undefined), false);
  });
  await T('index v1 → v2 : 3 valides + 5 sans meta (forme 09b3) → 3 indexés, 5 supprimés, 8 désérialisations UNE par tâche (8 respirations), journal 🗂, cache rafraîchi, 2e appel = rien', async () => {
    const seed = [V1_VALID('auto', 1000, 1), V1_NOMETA(2), V1_VALID('manual', 3000, 3), V1_NOMETA(4), V1_NOMETA(5), V1_VALID('auto', 2000, 6), V1_NOMETA(7), V1_NOMETA(8)];
    const { ctx, stats, idb, breaths, S, run } = mkCtx({ seed });
    let refreshed = 0; ctx._refreshBackupsCache = () => { refreshed++; };
    const r = J(await ctx._ensureBackupIndex());
    assert.deepStrictEqual(r, { kept: 3, dropped: 5, rebuilt: true });
    assert.deepStrictEqual(stats.upgrades, [{ from: 1, to: 2 }]); assert.deepStrictEqual(stats.created, ['backups_meta']);
    assert.strictEqual(stats.reads.backups, 8, 'désérialisations'); assert.strictEqual(breaths.length, 8, 'respirations');
    const rows = idb.rows('aura_backups', 'backups'); assert.deepStrictEqual(rows.map(x => x.id), [1, 3, 6]); assert.ok(rows.every(x => x.meta && x.state));
    const metas = idb.rows('aura_backups', 'backups_meta'); assert.deepStrictEqual(metas.map(x => x.id), [1, 3, 6]); assert.ok(metas.every(x => x.meta && !x.state && !x.aura));
    assert.strictEqual(refreshed, 1);
    assert.strictEqual(S.chainLog.length, 1); assert.strictEqual(S.chainLog[0].icon, '🗂');
    assert.ok(S.chainLog[0].desc.includes('3 backups indexés') && S.chainLog[0].desc.includes('5 enregistrements sans meta supprimés'), S.chainLog[0].desc);
    assert.strictEqual(stats.opened, stats.closed, 'ouvertures ' + stats.opened + ' ≠ fermetures ' + stats.closed);
    assert.strictEqual(await ctx._ensureBackupIndex(), null, '2e appel de la session');
    run('_backupIndexChecked = false');
    const r2 = J(await ctx._ensureBackupIndex());
    assert.deepStrictEqual(r2, { kept: 3, dropped: 0, rebuilt: false }); assert.strictEqual(stats.reads.backups, 8, 'index complet : aucune désérialisation');
    assert.strictEqual(stats.opened, stats.closed);
  });
  await T('index : base vide (nouvelle installation) → rien à faire, aucune désérialisation', async () => {
    const { ctx, stats } = mkCtx();
    assert.deepStrictEqual(J(await ctx._ensureBackupIndex()), { kept: 0, dropped: 0, rebuilt: false });
    assert.strictEqual(stats.reads.backups, undefined); assert.strictEqual(stats.opened, stats.closed);
  });
  await T('_saveBackupToDB : 9 autos + 6 manuels + 4 pré-imports → rotation 7 / 5 / 3 sur l\'INDEX (0 désérialisation), enregistrement + ligne d\'index toujours ensemble', async () => {
    const { ctx, stats, idb } = mkCtx();
    let d = 10;
    for (let i = 0; i < 9; i++) assert.strictEqual(await ctx._saveBackupToDB(V1_VALID('auto', d++, i)), true);
    for (let i = 0; i < 6; i++) assert.strictEqual(await ctx._saveBackupToDB(V1_VALID('manual', d++, i)), true);
    for (let i = 0; i < 4; i++) assert.strictEqual(await ctx._saveBackupToDB(V1_VALID('pre-import', d++, i)), true);
    const rows = idb.rows('aura_backups', 'backups'), metas = idb.rows('aura_backups', 'backups_meta');
    const cnt = (list, t) => list.filter(x => x.meta.type === t).length;
    assert.deepStrictEqual([cnt(rows, 'auto'), cnt(rows, 'manual'), cnt(rows, 'pre-import')], [7, 5, 3]);
    assert.deepStrictEqual(rows.map(x => x.id).sort((a, b) => a - b), metas.map(x => x.id).sort((a, b) => a - b), 'index ≠ enregistrements');
    assert.deepStrictEqual(rows.filter(x => x.meta.type === 'auto').map(x => x.meta.date), [12, 13, 14, 15, 16, 17, 18], 'les 7 autos les plus récents');
    assert.strictEqual(stats.reads.backups, undefined, 'désérialisation du store des enregistrements pendant une sauvegarde');
    assert.strictEqual(stats.opened, stats.closed);
  });
  await T('_saveBackupToDB refuse un backup sans meta (forme 09b3) : false, rien d\'écrit', async () => {
    const { ctx, idb } = mkCtx();
    assert.strictEqual(await ctx._saveBackupToDB(V1_NOMETA(1)), false);
    assert.strictEqual(await ctx._saveBackupToDB(null), false);
    assert.ok(idb.rows('aura_backups', 'backups') === null, 'refus AVANT toute ouverture de la base');
  });
  await T('_loadAllBackups : liste { id, meta } triée date desc, SANS état, 0 désérialisation · _getBackup(id) : un enregistrement complet, 1 désérialisation · inconnu → null', async () => {
    const { ctx, stats } = mkCtx();
    await ctx._saveBackupToDB(V1_VALID('auto', 100, 1)); await ctx._saveBackupToDB(V1_VALID('manual', 300, 3)); await ctx._saveBackupToDB(V1_VALID('auto', 200, 2));
    const list = J(await ctx._loadAllBackups());
    assert.deepStrictEqual(list.map(x => [x.id, x.meta.date, x.meta.type]), [[2, 300, 'manual'], [3, 200, 'auto'], [1, 100, 'auto']]);
    assert.ok(list.every(x => x.state === undefined));
    assert.strictEqual(stats.reads.backups, undefined);
    const one = J(await ctx._getBackup(3));
    assert.deepStrictEqual(one.state, { cycle: 2, portfolio: 50 }); assert.strictEqual(one.meta.date, 200);
    assert.strictEqual(stats.reads.backups, 1);
    assert.strictEqual(await ctx._getBackup(999), null);
    assert.strictEqual(stats.opened, stats.closed);
  });
  await T('_deleteBackup : enregistrement ET ligne d\'index supprimés', async () => {
    const { ctx, idb } = mkCtx();
    await ctx._saveBackupToDB(V1_VALID('auto', 100, 1)); await ctx._saveBackupToDB(V1_VALID('auto', 200, 2));
    assert.strictEqual(await ctx._deleteBackup(1), true);
    assert.deepStrictEqual(idb.rows('aura_backups', 'backups').map(x => x.id), [2]);
    assert.deepStrictEqual(idb.rows('aura_backups', 'backups_meta').map(x => x.id), [2]);
  });
  await T('_checkAutoBackup : 1er appel → backup auto (meta type auto, state = S) + aura_last_auto_backup_date = aujourd\'hui + toast · 2e appel → rien', async () => {
    const { ctx, idb, toasts } = mkCtx();
    await ctx._checkAutoBackup();
    const rows = idb.rows('aura_backups', 'backups');
    assert.strictEqual(rows.length, 1); assert.strictEqual(rows[0].meta.type, 'auto'); assert.deepStrictEqual(rows[0].state, J(ctx.S));
    assert.strictEqual(ctx.localStorage.getItem('aura_last_auto_backup_date'), new Date().toISOString().slice(0, 10));
    assert.deepStrictEqual(toasts, ['💾 Backup auto créé']);
    await ctx._checkAutoBackup();
    assert.strictEqual(idb.rows('aura_backups', 'backups').length, 1);
  });
  await T('_checkAutoBackup avec un _buildFullBackup écrasé (simulation de la collision 09b3) → refus journalisé ⚠️, rien d\'écrit, date non mémorisée', async () => {
    const { ctx, idb, S } = mkCtx();
    ctx._buildFullBackup = () => V1_NOMETA(1);
    await ctx._checkAutoBackup();
    assert.ok(idb.rows('aura_backups', 'backups') === null, 'refus AVANT toute ouverture de la base');
    assert.strictEqual(ctx.localStorage.getItem('aura_last_auto_backup_date'), null);
    assert.strictEqual(S.chainLog.length, 1); assert.strictEqual(S.chainLog[0].icon, '⚠️');
  });
  await T('exportBackup (bouton 📦 .json) : backup manuel avec meta, ligne d\'index, toast « Ko » (plus de TypeError meta.sizeChars)', async () => {
    const { ctx, idb, toasts } = mkCtx();
    ctx.exportBackup('json');
    await tick(60);
    const rows = idb.rows('aura_backups', 'backups');
    assert.strictEqual(rows.length, 1); assert.strictEqual(rows[0].meta.type, 'manual');
    assert.strictEqual(idb.rows('aura_backups', 'backups_meta').length, 1);
    assert.ok(toasts.some(t => /Backup exporté · \d+ Ko/.test(t)), toasts.join(' | '));
    assert.ok(!toasts.some(t => /Erreur/.test(t)));
  });
  await T('04 · restoreBackup(id) : 1 seule désérialisation (l\'enregistrement choisi), backup de sécurité pré-import, S remplacé par backup.state, saveState + reload', async () => {
    const { ctx, stats, idb, S } = mkCtx({ confirm: true });
    await ctx._saveBackupToDB(V1_VALID('auto', 100, 4242)); await ctx._saveBackupToDB(V1_VALID('auto', 200, 1));
    stats.reads.backups = 0;
    await ctx.restoreBackup(1);
    assert.strictEqual(stats.reads.backups, 1, 'désérialisations pendant restoreBackup');
    assert.strictEqual(S.cycle, 4242); assert.strictEqual(S.portfolio, 50);
    assert.strictEqual(ctx._saved, 1);
    const rows = idb.rows('aura_backups', 'backups'); assert.strictEqual(rows.filter(x => x.meta.type === 'pre-import').length, 1);
    assert.strictEqual(stats.opened, stats.closed);
  });
  await T('04 · restoreBackup(id) refusé (confirm = false) : rien ne change · id inconnu : « Backup introuvable »', async () => {
    const { ctx, stats, S, toasts } = mkCtx({ confirm: false });
    await ctx._saveBackupToDB(V1_VALID('auto', 100, 4242));
    await ctx.restoreBackup(1);
    assert.strictEqual(S.cycle, 551043); assert.strictEqual(ctx._saved, undefined);
    await ctx.restoreBackup(77);
    assert.ok(toasts.some(t => t === 'ALERT:Backup introuvable'));
  });
  await T('04 · deleteBackup(id) : suppression + cache rechargé depuis l\'index + panneau re-rendu · _refreshBackupsCache remplit _cachedBackupsList sans état', async () => {
    const { ctx, stats, run } = mkCtx({ confirm: true });
    await ctx._saveBackupToDB(V1_VALID('auto', 100, 1)); await ctx._saveBackupToDB(V1_VALID('auto', 200, 2));
    await ctx.deleteBackup(1);
    assert.deepStrictEqual(J(run('_cachedBackupsList')).map(x => x.id), [2]);
    assert.strictEqual(ctx._rendered, 1);
    await ctx._saveBackupToDB(V1_VALID('manual', 300, 3));
    ctx._refreshBackupsCache(); await tick(60);
    const cache = J(run('_cachedBackupsList'));
    assert.deepStrictEqual(cache.map(x => x.id), [3, 2]); assert.ok(cache.every(x => x.meta && x.state === undefined));
    assert.strictEqual(stats.reads.backups, undefined, 'la liste ne désérialise jamais un enregistrement');
    assert.strictEqual(stats.opened, stats.closed);
  });
  await T('04 · chargement du module : timers de boot enregistrés = [3000, 90000] (aucun travail immédiat, rien d\'autre au boot)', () => {
    const { timers } = mkCtx();
    assert.deepStrictEqual(timers.filter(ms => ms >= 500), [3000, 90000]);
  });

  console.log('\n' + pass + ' ok / ' + fail + ' KO');
  process.exit(fail ? 1 : 0);
})();
