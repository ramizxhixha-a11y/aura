// banc-nettoyage-mort.js — [GO NETTOYAGE · 18/10/2026] groupe « mort » : le CODE MORT que Rams a accepté de retirer (ETAT-AURA8.md § 3 G3 / G4, PASSATION point 22).
// Chaque essai lit le dépôt ou fait tourner le VRAI texte de l'app en vm, et ÉCHOUE sur le code d'avant :
//   BANC_ROOT=<copie du commit 6ee5844> node banc-nettoyage-mort.js
//   M0  la CONDITION du point 22, rejouée : la vraie fonction trace() du module 18 (son texte au commit 6ee5844) sur les 3 portefeuilles du backup réel
//       du 18/10 21:37 → aucune empreinte du Mode Démo ; un faux trade de chaque carte, posé dans une copie, est vu (non rejoué si le backup ou git manque)
//   M1  module 18 retiré : fichier, ligne du HTML, partie D de banc-demo-retire, mutations, deux sondes, motif « Mode démo » d'EVENT_KINDS (02, vrai _eventKind)
//   M2  06 : Paper Ultra, Coffre, Auto-backup (avec le minuteur « v117 DIAG TEMPORAIRE » de 3 s), loadDiffFromAutoSlot, urgenceReduceStake — plus aucune
//       définition ni référence dans ce que la page charge, ni leurs styles (05) ni leurs ids ; les helpers partagés restent
//   M3  js/10-fin-bloc-restauration-v93.js supprimé, et plus rien ne le lit (bancs, rejeu, Guardian)
//   M4  10e : _p4AntiDetteWatchdog et _p5InvariantCheck retirés (et leurs window.X)
//   M5  07 _OUTILS_TABS : plus aucun id en double (VRAI _OUTILS_TABS + VRAI _renderOutilsTab en vm : chaque rendu une fois)
//   M6  la page se construit encore : tous les <script> du HTML (externes et en ligne, Guardian compris) chargés en vm dans l'ordre, sans erreur ;
//       chaque on…="f(" du HTML et des scripts nomme une fonction définie ; chaque onglet Outils se rend sans erreur ; plus aucun minuteur de 06 à 3 s
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), cp = require('child_process');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8'), existe = f => fs.existsSync(path.join(ROOT, f));
let pass = 0, fail = 0; const sautes = [];
function T(name, fn) { try { const r = fn(); if (r === 'saute') { sautes.push(name.split(' ·')[0]); console.log('  ⏭  ' + name + '  ← non rejoué ici'); return; } pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n     ')); } }
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); assert.ok(m, 'fonction absente : ' + name);
  const start = m.index + m[1].length, st = [];
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) {
    const c = src[i], n2 = src[i + 1], top = st[st.length - 1];
    if (top === 't') { if (c === '\\') { i++; continue; } if (c === '`') { st.pop(); continue; } if (c === '$' && n2 === '{') { st.push('x'); i++; } continue; }
    if (c === '/' && n2 === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && n2 === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'") { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '`') { st.push('t'); continue; }
    if (c === '{') { st.push('b'); continue; }
    if (c === '}') { st.pop(); if (!st.length) return src.slice(start, i + 1); }
  }
  throw new Error('fin introuvable : ' + name);
}
const between = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre : ' + a.slice(0, 60)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'fin : ' + b.slice(0, 60)); return s.slice(i, j + b.length); };
// le code sans ses commentaires (// en début de ligne ou après un blanc, /* … */, <!-- … -->) : les commentaires « [GO NETTOYAGE] … avant : … » citent les noms retirés
const code = s => s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
const mot = n => new RegExp('(^|[^A-Za-z0-9_$])' + n.replace(/[$.]/g, '\\$&') + '(?![A-Za-z0-9_$])');
const J = o => JSON.parse(JSON.stringify(o));

const HTML = 'AURA8_v118.html', html = rd(HTML), htmlSans = html.replace(/<!--[\s\S]*?-->/g, '');
const charges = [...htmlSans.matchAll(/<script[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]);
// tout ce que la page charge ou ouvre : les scripts du HTML (Guardian et native-bridge compris), le HTML lui-même (scripts en ligne, on…=), la page Guardian, sw.js
const PAGE = [...new Set(charges.concat([HTML, 'js/native-bridge.js', 'aura-guardian.html', 'sw.js']))].filter(existe);
const pageCode = PAGE.map(f => [f, code(rd(f))]);
const resteDans = noms => { const out = []; noms.forEach(n => { const re = mot(n); pageCode.forEach(([f, c]) => { c.split('\n').forEach((l, i) => { if (re.test(l)) out.push(n + ' → ' + f + ' : ' + l.trim().slice(0, 90)); }); }); }); return out; };

// ─────────────── la page en vm : document / navigateur universels (tout appel rend un objet neutre), minuteries notées, jamais lancées ───────────────
function univ() {
  const f = function () {};
  const p = new Proxy(f, { get(t, k) { if (k === Symbol.toPrimitive) return () => 0; if (k === Symbol.iterator) return function* () {}; if (k === 'length') return 0; if (k === 'then') return undefined; if (k === 'toString' || k === 'valueOf') return () => ''; return p; },
    set() { return true; }, apply() { return p; }, construct() { return p; }, has() { return true; } });
  return p;
}
function chargerPage() {
  const U = univ(), store = {}, ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, key: () => null, clear() {}, get length() { return 0; } };
  const minuteries = [], warns = []; let cur = null;
  const ctx = { console: { log() {}, warn: (...a) => warns.push(a.map(String).join(' ')), error() {}, info() {}, debug() {} }, document: U, navigator: U, location: U, history: U, screen: U,
    performance: { now: () => 0, getEntriesByType: () => [], mark() {}, measure() {} }, localStorage: ls, sessionStorage: ls, indexedDB: U, fetch: () => new Promise(() => {}),
    WebSocket: U, Notification: U, Image: U, Audio: U, AudioContext: U, BroadcastChannel: U, MutationObserver: U, PerformanceObserver: U, ResizeObserver: U, IntersectionObserver: U,
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, requestIdleCallback: () => 0,
    setTimeout: (fn, ms) => { minuteries.push({ f: cur, k: 't', ms: ms | 0 }); return minuteries.length; }, clearTimeout() {},
    setInterval: (fn, ms) => { minuteries.push({ f: cur, k: 'i', ms: ms | 0 }); return minuteries.length; }, clearInterval() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => U, getComputedStyle: () => U, alert() {}, confirm: () => false, prompt: () => null,
    Blob: U, URL: U, FileReader: U, TextEncoder, TextDecoder, crypto: U, atob: s => s, btoa: s => s, CustomEvent: U, Event: U };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; ctx.top = ctx; ctx.parent = ctx;
  vm.createContext(ctx);
  const parts = [...htmlSans.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map(m => { const s = /\bsrc="([^"?]+)/.exec(m[1]); return s ? { f: s[1] } : { f: HTML + ' (en ligne)', code: m[2] }; });
  const err = {};
  for (const p of parts) { cur = p.f; try { vm.runInContext(p.code !== undefined ? p.code : rd(p.f), ctx, { filename: p.f }); } catch (e) { err[p.f] = String(e && e.message || e).slice(0, 140); } }
  cur = null;
  const def = n => { try { return vm.runInContext('typeof ' + n, ctx) !== 'undefined'; } catch (e) { return false; } };
  return { ctx, parts, err, minuteries, warns, def, run: c => vm.runInContext(c, ctx) };
}
const P = chargerPage();

const RETIRES_06 = {
  'Paper Ultra': ['renderPaperUltraSection', '_PR_CFG_KEY', '_prGet', 'togglePaperRealistic', 'updatePrCfg', 'togglePrBool', 'applyRealisticFrictions', 'simulateRealisticTrade', 'paperUltraSection', 'paperRealisticConfig', 'aura_paper_realistic'],
  'Coffre': ['renderVaultSection', 'saveVault', 'loadVault', 'exportVault', 'importVault', 'vaultPwdUpdate', '_vaultDeriveKey', '_vaultGetSalt', '_vaultEncrypt', '_vaultDecrypt', '_vaultStrength', '_vaultStrengthLabel', '_VAULT_SALT_KEY', '_VAULT_SLOTS', 'vaultSection', 'vaultPwdInput', 'vaultSaveBtn', 'vaultLoadBtn', 'vaultStrengthBar', 'vaultStrengthLbl', 'aura_vault_salt_v89'],
  'Auto-backup': ['renderAutoBackupSection', 'restoreSlot', 'downloadSlot', 'runManualBackup', 'toggleAutoBackup', 'setAbHour', '_abInit', '_abCheck', '_abExecute', '_abTimer', '_AB_KEY_PREFIX', '_AB_SLOTS', 'autoBackupSection'],
  'DIAG v117': ['_abShowDiagOverlay', '_abDiagTimer', '_abDiagOverlay', '_auraLastBackupError', '_aura_lastBackupError'],
  'seuls': ['loadDiffFromAutoSlot', 'urgenceReduceStake'],
};
const STYLES = ['ab-section', 'ab-title', 'ab-slot', 'ab-slot-icon', 'ab-slot-body', 'ab-slot-name', 'ab-slot-meta', 'ab-btn', 'ab-toggle-row', 'ab-toggle', 'ab-progress', 'ab-progress-fill',
  'pr2-section', 'pr2-title', 'pr2-badge', 'pr2-row', 'pr2-slider-row', 'pr2-slider', 'pr2-scenario', 'pr2-toggle-row',
  'vault-section', 'vault-title', 'vault-door', 'vault-icon', 'vault-lock-row', 'vault-inp', 'vault-btn', 'vault-row', 'vault-slot', 'vault-strength', 'vault-strength-fill'];
const RETIRES_18 = ['_demoReparation', '_demoReparationStatus', 'demoReparationBandeau', 'reparationDemo'];
const RETIRES_10E = ['_p4AntiDetteWatchdog', '_p5InvariantCheck'];
const F18 = 'js/18-reparation-demo.js', F10 = 'js/10-fin-bloc-restauration-v93.js';
const BACKUP = process.env.BANC_BACKUP || [path.join(ROOT, 'rejeu/backups/pont/aura_guardian_full_20261018-213733.json'), path.join(__dirname, 'rejeu/backups/pont/aura_guardian_full_20261018-213733.json'),
  '/home/claude/aura/rejeu/backups/pont/aura_guardian_full_20261018-213733.json'].find(f => fs.existsSync(f));

console.log('▶ banc-nettoyage-mort · code ' + ROOT);
T('M0 · CONDITION du point 22 sur le backup réel du 18/10 21:37 : la VRAIE trace() du module 18 (texte du commit 6ee5844, en vm) ne trouve AUCUN faux trade du Mode Démo dans AA, EV, RE (atteints() vide) ; un faux trade de chaque carte posé dans une copie est vu', () => {
  let s18 = existe(F18) ? rd(F18) : null;
  if (!s18) { try { s18 = cp.execFileSync('git', ['show', '6ee5844:' + F18], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { s18 = null; } }
  if (!s18 || !BACKUP) return 'saute';
  const w = {}; vm.createContext(Object.assign(w, { window: w, setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, document: {}, console })); vm.runInContext(s18, w);
  const R = w._demoReparation, o = JSON.parse(fs.readFileSync(BACKUP, 'utf8')), S = (o && o._type === 'aura_guardian_full' && o.aura) ? o.aura : o;   // lu comme du JSON, jamais exécuté
  assert.ok(String(o.savedAt).startsWith('2026-10-18T19:37'), 'backup du 18/10 21:37 : ' + o.savedAt);
  const n = {}; ['sim', 'paperReal', 'real'].forEach(m => { assert.ok(S.walletStore[m] && Object.keys(S.walletStore[m].pairStates || {}).length > 0, m + ' : portefeuille vide'); n[m] = R.trace(S.walletStore[m]).n; });
  assert.deepStrictEqual(n, { sim: 0, paperReal: 0, real: 0 }, 'empreinte encore portée');
  w.S = S; assert.deepStrictEqual(J(R.atteints()), []);
  Object.keys(R.CARTES).forEach(k => { const c = JSON.parse(JSON.stringify(S.walletStore.paperReal)), t = R.CARTES[k].trades[0], p0 = Object.keys(c.pairStates)[0];
    c.pairStates[p0].trades.push({ type: 'position', pair: t[0], side: t[1], pnlUsdt: t[2], pnl: t[3], time: t[4], ts: 1760200000000 }); assert.strictEqual(R.trace(c).n, 1, 'témoin ' + k + ' non vu'); });
});
T('M1 · module 18 retiré : plus de ' + F18 + ' ni de sa ligne dans le HTML ; ni _demoReparation / bandeau dans ce que la page charge ; banc-demo-retire sans partie D ; mutations et deux sondes supprimées ; EVENT_KINDS (02, VRAI _eventKind) : « Mode démo » ne classe plus rien, Bunker / SOS / sauvegarde suspendue restent « bunker »', () => {
  assert.ok(!existe(F18), F18 + ' existe encore'); assert.ok(!charges.includes(F18) && !html.includes('src="' + F18), 'déclaré dans le HTML');
  assert.deepStrictEqual(resteDans(RETIRES_18), [], 'restes du module 18');
  ['rejeu/demo_mutations.js', 'rejeu/sonde_demo.js', 'rejeu/sonde_demo_vie.js'].forEach(f => assert.ok(!existe(f), f + ' existe encore'));
  const bd = code(rd('banc-demo-retire.js')); assert.ok(!/charger18|s18\b|F18\b|_demoReparation|T\('D\d/.test(bd), 'banc-demo-retire garde sa partie D'); assert.ok(/T\('R1 ·/.test(bd) && /T\('R4 ·/.test(bd), 'partie R gardée');
  const s02 = rd('js/02-state-init.js'), c = {}; vm.createContext(c); vm.runInContext(between(s02, 'const EVENT_KINDS = [', '\n];') + '\n' + fnSrc(s02, '_eventKind') + '\nthis._eventKind = _eventKind;', c);
  assert.strictEqual(c._eventKind({ desc: 'Compte EV rendu · faux chiffres du Mode démo effacés · 1 082,27 $ · 354 trades · historique de 13 paires' }), null, 'la ligne de la réparation est encore classée');
  assert.strictEqual(c._eventKind({ desc: 'Mode démo' }), null);
  ['Bunker activé · SOS', '🆘 SOS déclenché · capital −12 %', 'Mode Démo actif · sauvegarde suspendue (le vrai état reste intact sur disque)'].forEach(d => assert.strictEqual(c._eventKind({ desc: d }), 'bunker', d));
  assert.ok(code(s02).includes("['bunker',           /Bunker|SOS|sauvegarde suspendue/i]"), 'motif bunker');
});
T('M2 · 06 : Paper Ultra, Coffre, Auto-backup, minuteur « v117 DIAG TEMPORAIRE », loadDiffFromAutoSlot, urgenceReduceStake — aucune définition ni référence (code, on…=, ids, clés) dans ce que la page charge ; leurs styles (05) retirés ; les helpers partagés (_urgAppendLog, _diffSnapshot, renderDiffSection, urgenceCloseAll) restent', () => {
  const restes = []; Object.keys(RETIRES_06).forEach(k => resteDans(RETIRES_06[k]).forEach(r => restes.push(k + ' · ' + r)));
  assert.deepStrictEqual(restes, [], 'restes :\n' + restes.join('\n'));
  const css = pageCode.map(([f, c]) => c).join('\n') + '\n' + fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css')).map(f => code(rd('css/' + f))).join('\n');
  const st = STYLES.filter(c => new RegExp('\\.' + c + '(?![\\w-])[^{}]*\\{').test(css) || new RegExp('class="[^"]*\\b' + c + '(?![\\w-])').test(css)); assert.deepStrictEqual(st, [], 'styles restés : ' + st.join(', '));
  const s06 = code(rd('js/06-v63-patterns-chartistes.js'));
  ['function _urgAppendLog(msg) {', 'let _diffSnapshot = null;', 'function renderDiffSection() {', 'function urgenceCloseAll() {', 'function loadDiffBackup() {'].forEach(k => assert.ok(s06.includes(k), 'helper partagé disparu : ' + k));
});
T('M3 · ' + F10 + ' supprimé (jamais chargé) ; plus aucun banc, script de rejeu ou page Guardian ne le lit — seuls restent des filtres qui l\'excluaient et le contrôle « pas chargé » de banc-verite-donnees', () => {
  assert.ok(!existe(F10), F10 + ' existe encore'); assert.ok(!charges.includes(F10));
  const fichiers = []; (function marche(d) { fs.readdirSync(path.join(ROOT, d)).forEach(f => { const r = d ? d + '/' + f : f; if (/^(\.git|node_modules|archive|banc-fixtures)$/.test(f)) return; const st = fs.statSync(path.join(ROOT, r));
    if (st.isDirectory()) { if (!d || d.startsWith('rejeu')) marche(r); } else if (/\.(js|html|json|py|sh)$/.test(f) && f !== path.basename(__filename) && !/^rejeu\/(backups|out)\//.test(r)) fichiers.push(r); }); })('');
  const lit = [];
  fichiers.forEach(f => code(rd(f)).split('\n').forEach((l, i) => { if (!l.includes('10-fin-bloc-restauration-v93')) return;
    const exclu = /f\s*!==\s*'10-fin-bloc-restauration-v93\.js'/.test(l) || /count\(html, '10-fin-bloc-restauration-v93\.js'\), 0/.test(l);
    if (!exclu) lit.push(f + ':' + (i + 1) + ' ' + l.trim().slice(0, 100)); }));
  assert.deepStrictEqual(lit, [], 'le lisent encore :\n' + lit.join('\n'));
  const g = rd('aura-guardian.html'), ref = /\{fn:'_checkAndRotatePeriods',file:'([^']+)'\}/.exec(g);
  assert.ok(ref && existe('js/' + ref[1]) && /(^|\n)function _checkAndRotatePeriods\s*\(/.test(rd('js/' + ref[1])), 'Guardian : _checkAndRotatePeriods → un fichier chargé qui la définit');
});
T('M4 · 10e : _p4AntiDetteWatchdog et _p5InvariantCheck retirés, ni définis ni appelés ni posés sur window dans ce que la page charge ; après chargement de la page, ni l\'un ni l\'autre n\'existe', () => {
  assert.deepStrictEqual(resteDans(RETIRES_10E), []);
  RETIRES_10E.forEach(n => assert.ok(!P.def(n), n + ' défini après chargement'));
  assert.ok(P.def('_openManTrade') && P.def('_pearsonCorrelation'), '10e : ses voisines sont toujours là');
});
T('M5 · 07 _OUTILS_TABS RÉEL rendu par le VRAI _renderOutilsTab (vm) : aucun id en double dans aucun onglet, chaque rendu appelé une fois ; riskScoreSection une seule fois (Analytics), calcSection une seule fois (Outils)', () => {
  const s07 = rd('js/07-v90-mode-bunker-sos.js'), calls = {}, made = {}, win = {};
  const content = { set innerHTML(h) { Object.keys(made).forEach(x => delete made[x]); [...String(h).matchAll(/id="([^"]+)"/g)].forEach(m => { made[m[1]] = (made[m[1]] || 0) + 1; }); }, get innerHTML() { return ''; } };
  const c = { window: win, console: { warn() {} }, document: { getElementById: id => (id === 'outilsContent' ? content : (made[id] ? { id } : null)), querySelectorAll: () => [] } }; vm.createContext(c);
  vm.runInContext(between(s07, 'const _OUTILS_TABS = ', '\n};') + '\nvar _outilsTab = "analytics";\n' + fnSrc(s07, '_renderOutilsTab') + '\nthis._T = _OUTILS_TABS; this._R = _renderOutilsTab; this._set = t => { _outilsTab = t; };', c);
  const tabs = Object.keys(c._T); tabs.forEach(t => c._T[t].sections.forEach(s => [s.render, s.init].forEach(f => { if (f) win[f] = () => { calls[t + ':' + f] = (calls[t + ':' + f] || 0) + 1; }; })));
  const doubles = [];
  tabs.forEach(t => { c._set(t); c._R(); Object.keys(made).filter(x => made[x] > 1).forEach(x => doubles.push(t + ' · id ' + x + ' ×' + made[x])); Object.keys(calls).filter(x => x.startsWith(t + ':') && calls[x] > 1).forEach(x => doubles.push(t + ' · ' + x.slice(t.length + 1) + ' rendu ×' + calls[x])); });
  assert.deepStrictEqual(doubles, [], 'doublons : ' + doubles.join(' ; '));
  const ids = t => c._T[t].sections.map(s => s.id);
  assert.strictEqual(ids('analytics').filter(x => x === 'riskScoreSection').length, 1); assert.strictEqual(tabs.reduce((n, t) => n + ids(t).filter(x => x === 'calcSection').length, 0), 1);
});
T('M6 · la page se construit : tous les <script> du HTML (' + charges.length + ' externes + en ligne, Guardian compris) chargés en vm dans l\'ordre sans erreur ; chaque on…="f(" (HTML et scripts) nomme une fonction définie ; chaque rendu de _OUTILS_TABS existe et chaque onglet se rend sans erreur ; plus aucun minuteur de 06 à 3 s ni de 18', () => {
  assert.deepStrictEqual(P.err, {}, 'erreurs au chargement');
  const KW = new Set(['if', 'return', 'typeof', 'new', 'function', 'event', 'this', 'document', 'window', 'parseInt', 'parseFloat', 'Math', 'Number', 'String', 'JSON', 'Date', 'confirm', 'alert', 'setTimeout', 'clearTimeout', 'navigator', 'localStorage', 'encodeURIComponent', 'isNaN', 'Array', 'Object', 'while', 'for', 'switch', 'catch', 'try']);
  const absents = new Set();
  charges.filter(f => /\.js$/.test(f)).concat([HTML]).forEach(f => { for (const m of rd(f).replace(/<!--[\s\S]*?-->/g, '').matchAll(/\bon[a-z]+="([^"]*)"/g)) for (const x of m[1].matchAll(/(^|[^\w$.'])([A-Za-z_$][\w$]*)\s*\(/g)) { const n = x[2]; if (!KW.has(n) && !n.startsWith('$') && !P.def(n)) absents.add(n + ' (' + f + ')'); } });
  assert.deepStrictEqual([...absents], [], 'gestionnaires on…= qui appellent un nom non défini');
  const tabs = P.run('Object.keys(_OUTILS_TABS)'), manquants = [];
  tabs.forEach(t => P.run('_OUTILS_TABS[' + JSON.stringify(t) + '].sections').forEach(s => [s.render, s.init].forEach(f => { if (f && P.run('typeof window[' + JSON.stringify(f) + ']') !== 'function') manquants.push(t + ' · ' + f); })));
  assert.deepStrictEqual(manquants, [], 'rendus absents');
  tabs.forEach(t => { P.warns.length = 0; P.run('_outilsTab = ' + JSON.stringify(t) + '; _renderOutilsTab();'); assert.deepStrictEqual(P.warns.filter(w => /Outils render error/.test(w)), [], 'onglet ' + t); });
  const m06 = P.minuteries.filter(m => m.k === 'i' && m.f === 'js/06-v63-patterns-chartistes.js').map(m => m.ms), m18 = P.minuteries.filter(m => m.f === F18);
  assert.ok(!m06.includes(3000), '06 pose encore un minuteur de 3 s (DIAG v117) : ' + m06.join(', ')); assert.strictEqual(m18.length, 0, 'minuteur du module 18');
  const glob = [].concat(...Object.values(RETIRES_06), RETIRES_18).filter(n => /^[A-Za-z_$][\w$]*$/.test(n) && P.def(n)); assert.deepStrictEqual(glob, [], 'encore globaux après chargement');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : '') + (sautes.length ? ' · non rejoué : ' + sautes.join(', ') : ''));
process.exit(fail ? 1 : 0);
