// banc-phase0-pont.js — PHASE 0 · sécurité du Pont Claude (10h) · 08/09/2026
// Usage : node banc-phase0-pont.js <chemin 10h livré> [<chemin 10h ancien pour contrôle>]
// Charge 10h dans une vm isolée (nouvelle sandbox à CHAQUE test) avec des doubles de
// document / localStorage / showToast / buildSnapshot / _shareOrDownloadJSON / fetch / timers.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const NEW = process.argv[2]; const OLD = process.argv[3] || null;
if (!NEW) { console.error('chemin 10h manquant'); process.exit(2); }
const srcNew = fs.readFileSync(NEW, 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { return Promise.resolve().then(fn).then(() => { pass++; console.log('  ✓ ' + name); }, e => { fail++; console.log('  ✗ ' + name + '\n      ' + (e && e.message)); }); }
const tick = () => new Promise(r => setTimeout(r, 0));

// ── fabrique de sandbox (isolation totale par test) ──────────────────────────
function makeSandbox(opts) {
  opts = opts || {};
  const els = {};                                   // id -> élément
  const calls = { toast: [], share: [], fetch: [], setInterval: [], clearInterval: [], setTimeout: [], lsRemove: [] };
  let tabs = opts.tabsPresent === false ? null : mkEl('div');
  function mkEl(tag) { return { tag, id: '', style: {}, innerHTML: '', insertAdjacentElement(pos, el) { this._inserted = { pos, el }; if (el.id) els[el.id] = el; } }; }
  const store = Object.assign({}, opts.ls || {});
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { calls.lsRemove.push(k); if (opts.lsThrows) throw new Error('SecurityError'); delete store[k]; },
    _store: store
  };
  const sb = {
    console, JSON, Date, String, Math, Object, Array, Promise, Error, Number, parseFloat,
    localStorage,
    document: {
      getElementById: id => els[id] || null,
      querySelector: sel => (sel === '#outilsPanel .outils-tabs' ? tabs : null),
      createElement: mkEl,
      body: { appendChild() {}, removeChild() {} }
    },
    navigator: {},
    fetch: function () { calls.fetch.push([].slice.call(arguments)); return Promise.resolve({}); },
    setInterval: fn => { calls.setInterval.push(fn); return 100 + calls.setInterval.length; },
    clearInterval: id => { calls.clearInterval.push(id); },
    setTimeout: (fn, ms) => { calls.setTimeout.push([fn, ms]); return 900; },
    showToast: function (m, d, l) { calls.toast.push({ m, d, l }); },
    buildSnapshot: opts.snap === undefined ? (() => ({ cycle: 486550, savedAt: '2026-09-08T10:00:00.000Z', agents: [{ id: 'a' }] })) : opts.snap,
    _shareOrDownloadJSON: opts.noShare ? undefined : function (json, fname) { calls.share.push({ json, fname }); return Promise.resolve(opts.shareRes || 'fs-written'); },
    _fsLastDiag: opts.diag || ''
  };
  if (opts.noShare) delete sb._shareOrDownloadJSON;
  sb.window = sb; sb.calls = calls; sb._els = els; sb._showTabs = () => { tabs = mkEl('div'); };
  return sb;
}
function load(src, opts) { const sb = makeSandbox(opts); vm.runInNewContext(src, sb, { filename: 'aura-10h.js' }); return sb; }

(async () => {
  console.log('PHASE 0 · banc Pont Claude · fichier : ' + NEW);

  await T('chargement : aucune erreur, _PONT_V = v5.0', () => { const sb = load(srcNew); assert.strictEqual(sb._PONT_V, 'v5.0'); });

  await T('A20 : le jeton aura_claude_gh_token est purgé du localStorage au chargement', () => {
    const sb = load(srcNew, { ls: { aura_claude_gh_token: 'github_pat_ABC', aura_highwater_cycle: '486550' } });
    assert.deepStrictEqual(sb.calls.lsRemove, ['aura_claude_gh_token']);
    assert.strictEqual(sb.localStorage.getItem('aura_claude_gh_token'), null);
    assert.strictEqual(sb.localStorage.getItem('aura_highwater_cycle'), '486550', 'les autres clés sont intactes');
  });
  await T('purge LS : un localStorage qui refuse (SecurityError) ne casse pas le chargement du module', () => {
    const sb = load(srcNew, { ls: { aura_claude_gh_token: 'x' }, lsThrows: true });
    assert.strictEqual(typeof sb.exportForClaude, 'function');
  });
  await T('voies retirées : ni _CLAUDE_BOX, ni _claudeDrop/_claudePush, ni claudeTokenConfig (global et window)', () => {
    const sb = load(srcNew);
    ['_CLAUDE_BOX', '_claudeDrop', '_claudePush', 'claudeTokenConfig', '_claudeTestToken', '_claudeWho', '_claudeB64', '_claudeShareOrDownload', '_claudeDownloadFallback']
      .forEach(k => { assert.strictEqual(sb[k], undefined, k + ' doit être absent'); });
  });
  await T('exports conservés : exportForClaude, enableFullPowerMode, loadAllTrades, openManDetail, openPairDetail, renderActionBricks', () => {
    const sb = load(srcNew);
    ['exportForClaude', 'enableFullPowerMode', 'loadAllTrades', 'openManDetail', 'openPairDetail', 'renderActionBricks']
      .forEach(k => { assert.strictEqual(typeof sb.window[k], 'function', k); });
  });
  await T('barre Outils : injectée immédiatement si les onglets existent, 1 seul bouton (export), aucun ⚙ / claudeTokenConfig, marqueur "Pont v5.0"', () => {
    const sb = load(srcNew);
    const bar = sb._els.claudeExportBar; assert.ok(bar, 'barre absente');
    assert.strictEqual((bar.innerHTML.match(/<button/g) || []).length, 1);
    assert.ok(bar.innerHTML.includes('onclick="exportForClaude()"'));
    assert.ok(!bar.innerHTML.includes('claudeTokenConfig') && !bar.innerHTML.includes('\u2699'));
    assert.ok(bar.innerHTML.includes('Pont v5.0'));
    assert.strictEqual(sb.calls.setInterval.length, 0, 'pas de sondage quand la cible existe');
  });
  await T('barre Outils : onglets absents au chargement → sondage 1.5 s, injection dès apparition, intervalle arrêté', () => {
    const sb = load(srcNew, { tabsPresent: false });
    assert.strictEqual(sb._els.claudeExportBar, undefined);
    assert.strictEqual(sb.calls.setInterval.length, 1); assert.strictEqual(sb.calls.setTimeout[0][1], 30000);
    sb.calls.setInterval[0]();                      // tic : toujours absent
    assert.strictEqual(sb._els.claudeExportBar, undefined);
    sb._showTabs(); sb.calls.setInterval[0]();      // les onglets apparaissent, tic suivant
    assert.ok(sb._els.claudeExportBar); assert.deepStrictEqual(sb.calls.clearInterval, [101]);
  });

  // ── exportForClaude : une seule voie, celle du backup 09b3 ─────────────────
  async function runExport(opts) { const sb = load(srcNew, opts); sb.exportForClaude(); await tick(); await tick(); return sb; }

  await T('export : appelle _shareOrDownloadJSON(json, "aura_live.json") — et JAMAIS fetch', async () => {
    const sb = await runExport({});
    assert.strictEqual(sb.calls.share.length, 1); assert.strictEqual(sb.calls.share[0].fname, 'aura_live.json');
    assert.strictEqual(sb.calls.fetch.length, 0, 'aucun appel réseau');
  });
  await T('export : enveloppe identique au Pont v4 (aura_guardian_full / aura-embed-1 / aura-live / cycle / guardian:null)', async () => {
    const sb = await runExport({});
    const p = JSON.parse(sb.calls.share[0].json);
    assert.strictEqual(p._type, 'aura_guardian_full'); assert.strictEqual(p.version, 'aura-embed-1');
    assert.strictEqual(p.auraSource, 'aura-live'); assert.strictEqual(p.auraCycle, 486550);
    assert.strictEqual(p.auraSavedAt, '2026-09-08T10:00:00.000Z'); assert.strictEqual(p.guardian, null);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(p.aura)), { cycle: 486550, savedAt: '2026-09-08T10:00:00.000Z', agents: [{ id: 'a' }] });
    assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(p.savedAt));
  });
  await T('export natif (fs-written) : toast win « [v5.0] … cycle 486550 — Download/AURA · joins-le à Claude »', async () => {
    const sb = await runExport({ shareRes: 'fs-written' });
    assert.strictEqual(sb.calls.toast.length, 1); const t = sb.calls.toast[0];
    assert.strictEqual(t.l, 'win'); assert.strictEqual(t.d, 6000);
    assert.ok(t.m.includes('[v5.0]') && t.m.includes('486550') && t.m.includes('Download/AURA') && t.m.includes('joins-le'), t.m);
  });
  await T('export partagé (shared) : toast win « Partagé … choisis Claude »', async () => {
    const sb = await runExport({ shareRes: 'shared' }); const t = sb.calls.toast[0];
    assert.strictEqual(t.l, 'win'); assert.ok(t.m.includes('Partag\u00e9') && t.m.includes('choisis Claude'), t.m);
  });
  await T('export téléchargé (downloaded) : toast win « dans Téléchargements »', async () => {
    const sb = await runExport({ shareRes: 'downloaded' }); const t = sb.calls.toast[0];
    assert.strictEqual(t.l, 'win'); assert.ok(t.m.includes('T\u00e9l\u00e9chargements'), t.m);
  });
  await T('export annulé (cancelled) : aucun toast', async () => {
    const sb = await runExport({ shareRes: 'cancelled' }); assert.strictEqual(sb.calls.toast.length, 0);
  });
  await T('export échoué (failed) : toast warn avec le diagnostic _fsLastDiag de 09b3', async () => {
    const sb = await runExport({ shareRes: 'failed', diag: 'Plugin Filesystem indisponible.\nwindow.Capacitor = ABSENT' });
    const t = sb.calls.toast[0]; assert.strictEqual(t.l, 'warn');
    assert.ok(t.m.includes('Export \u00e9chou\u00e9') && t.m.includes('Plugin Filesystem indisponible'), t.m);
  });
  await T('export échoué sans diagnostic : toast warn « aucune voie disponible »', async () => {
    const sb = await runExport({ shareRes: 'failed' }); assert.ok(sb.calls.toast[0].m.includes('aucune voie disponible'));
  });
  await T('état non prêt (buildSnapshot → null) : toast warn, pas d\'export, pas de réseau', async () => {
    const sb = await runExport({ snap: () => null });
    assert.strictEqual(sb.calls.share.length, 0); assert.strictEqual(sb.calls.fetch.length, 0);
    assert.strictEqual(sb.calls.toast[0].m, 'Export impossible : etat non pret'); assert.strictEqual(sb.calls.toast[0].l, 'warn');
  });
  await T('09b3 absent (_shareOrDownloadJSON non défini) : erreur attrapée, toast warn, jamais de réseau', async () => {
    const sb = await runExport({ noShare: true });
    assert.strictEqual(sb.calls.toast[0].m, 'Export Claude : erreur'); assert.strictEqual(sb.calls.fetch.length, 0);
  });
  await T('export sans buildSnapshot global mais window.buildSnapshot présent : fonctionne', async () => {
    const sb = load(srcNew, { snap: undefined }); const bs = sb.buildSnapshot; delete sb.buildSnapshot; sb.window.buildSnapshot = bs;
    sb.exportForClaude(); await tick(); await tick(); assert.strictEqual(sb.calls.share.length, 1);
  });

  // ── contrôle : l'ANCIEN 10h reproduit le défaut ────────────────────────────
  if (OLD) {
    const srcOld = fs.readFileSync(OLD, 'utf8');
    await T('[contrôle ancien 10h] sans token : exportForClaude POSTe l\'état complet vers une boîte publique tierce (fetch = 1, ' + (srcOld.match(/https:\/\/webhook\.site\//) ? 'webhook.site' : '?') + ')', async () => {
      const sb = makeSandbox({}); vm.runInNewContext(srcOld, sb, { filename: 'old-10h.js' }); sb.exportForClaude(); await tick();
      assert.strictEqual(sb.calls.fetch.length, 1); assert.ok(String(sb.calls.fetch[0][0]).startsWith('https://webhook.site/'));
      assert.strictEqual(sb.calls.fetch[0][1].mode, 'no-cors'); assert.ok(JSON.parse(sb.calls.fetch[0][1].body).aura.agents);
    });
    await T('[contrôle ancien 10h] avec token en LS : le jeton est lu et envoyé en Authorization Bearer à api.github.com', async () => {
      const sb = makeSandbox({ ls: { aura_claude_gh_token: 'github_pat_SECRET' } }); vm.runInNewContext(srcOld, sb, { filename: 'old-10h.js' }); sb.exportForClaude(); await tick();
      assert.ok(String(sb.calls.fetch[0][0]).startsWith('https://api.github.com/'));
      assert.strictEqual(sb.calls.fetch[0][1].headers.Authorization, 'Bearer github_pat_SECRET');
      assert.strictEqual(sb.localStorage.getItem('aura_claude_gh_token'), 'github_pat_SECRET', 'l\'ancien code laisse le jeton en LS');
    });
    await T('[contrôle ancien 10h] la barre avait 2 boutons dont ⚙ claudeTokenConfig', () => {
      const sb = makeSandbox({}); vm.runInNewContext(srcOld, sb); assert.strictEqual((sb._els.claudeExportBar.innerHTML.match(/<button/g) || []).length, 2);
      assert.ok(sb._els.claudeExportBar.innerHTML.includes('claudeTokenConfig'));
    });
  }

  console.log('\nRésultat : ' + pass + '/' + (pass + fail) + (fail ? '  ✗ ÉCHECS : ' + fail : '  ✓ TOUT PASSE'));
  process.exit(fail ? 1 : 0);
})();
