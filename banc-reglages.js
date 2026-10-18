// banc-reglages.js — [GO RÉGLAGES · 14/10/2026] VERSION 20261014a
// « Ce que l'écran promet, le code le fait (ou le bouton disparaît) » — registre ETAT-AURA8.md, G2 n° 10 à 19 (audit du 13/10).
// Chaque essai fait tourner le VRAI texte des fonctions de l'app en vm (ou lit le code chargé par le HTML) et ÉCHOUE sur le code d'avant :
//   BANC_ROOT=<copie du commit 61aeac6> node banc-reglages.js
//   A  n° 10  paire ajoutée : les 3 portefeuilles reçoivent son état ; l'écran RE ne plante plus sur une paire sans état
//   B  n° 11  « RESTAURER » (historique) et 09b2 _writeChosenState : IDB d'abord, LS allégé, repère de cycle (relu) ; aucune sauvegarde par-dessus ;
//             backup de sécurité vérifié ; état d'avant juillet refusé ; bannière de régression par le même chemin
//   C  n° 12  « Importer backup » / « Récupérer » : la confirmation nomme les 3 portefeuilles (play / pause), AUTO / MANU, le cycle, Bunker, Anti-Revenge,
//             Mode Vacances ; écrit par _writeChosenState, puis RECHARGE (plus de loadState en place)
//   D  n° 13  réglages de l'écran sauvegardés et relus (champ par champ, même type) ; Telegram hors snapshot ET hors JSON.stringify(S) (aura_tg_cfg,
//             non énumérable) ; Mode Vacances : retour sans jamais remettre AUTO tout seul, perte du jour en $ ; imports ne les touchent pas
//   E  n° 14  « Réduire les mises » (Bunker, Vacances, Urgence) : plus aucune promesse, et l'ouvreur 09c n'est pas touché
//   F  n° 15  Hedge automatique : l'écran dit « non branché » et ne fait plus avancer le compteur BEAR à chaque affichage
//   G  n° 16  « 🧪 Simuler un blocage » (anti-revenge) et « 🧪 Simuler un déclenchement » (Bunker) : retirés — ils agissaient pour de vrai
//   H  n° 17  onglet « 🛠 Outils » : laissé sans bouton (14 outils sur 14 à corriger, rejeu/reglages-20261014/outils-audit.md) — rouvert le 18/10 par go outils, avec banc-outils.js
//   I  n° 18  « 📸 Snapshots internes » : bouton et fenêtre retirés (système supprimé en v125)
//   J  n° 19  « 🚨 Ouvrir Mode Urgence » (#urgenceOverlay absent) : plus aucun bouton ne l'appelle ; la carte dit où agir
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
async function T(name, fn) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n     ')); } }
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
const has = (src, name) => new RegExp('(^|\\n)(async )?function ' + name + '\\s*\\(').test(src);
const code = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n').replace(/<!--[\s\S]*?-->/g, '');
const J = o => JSON.parse(JSON.stringify(o));
const html = rd('AURA8_v118.html');
const LOADED = (html.match(/src="(js\/[^"?]+\.js)/g) || []).map(x => x.slice(5));
const s02 = rd('js/02-state-init.js'), s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'), s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js'),
      s06 = rd('js/06-v63-patterns-chartistes.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'),
      s9b3 = rd('js/09b3-import-export.js'), s11 = rd('js/11-gestion-paires.js');
function storage() { const o = {}, st = { _o: o, throwOn: null, getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { if (st.throwOn && st.throwOn(k)) throw new Error('QuotaExceededError'); o[k] = String(v); }, removeItem: k => { delete o[k]; } }; return st; }
function fakeOpenDB(ok, rec) {
  return async () => ({ close() {}, transaction() {
    const tx = { objectStore: () => ({ keyPath: null, put: (v, k) => { const req = {}; setTimeout(() => { if (ok) { rec.put = { k, v: J(v) }; tx.oncomplete && tx.oncomplete(); } else { req.onerror && req.onerror(); tx.onerror && tx.onerror(); } }, 0); return req; } }) };
    return tx; } });
}

(async () => {
  console.log('▶ banc-reglages · code ' + ROOT);

  console.log('▶ A. paire ajoutée, écran RE — n° 10');
  await T('A1 · rejeu des paires ajoutées (11) : EUR/USDT et BNB/USDT arrivent dans les 3 portefeuilles ; les états déjà là ne sont pas touchés', () => {
    const ctx = { console, Object, JSON, Array, PAIRS: { 'BTC/USDT': { sym: 'BTC' }, 'ETH/USDT': { sym: 'ETH' } }, window: {} };
    const ws = { sim: { pairStates: {} }, paperReal: { pairStates: {} }, real: { pairStates: {} } };
    ['sim', 'paperReal', 'real'].forEach(m => ['BTC/USDT', 'ETH/USDT'].forEach(p => { ws[m].pairStates[p] = { mark: m + p }; }));
    ['sim', 'paperReal'].forEach(m => { ws[m].pairStates['EUR/USDT'] = { mark: m + 'EUR' }; ws[m].pairStates['BNB/USDT'] = { mark: m + 'BNB' }; });   // backup 14/10 18:45 : RE 10 paires, EV 13
    ctx.S = { tradingMode: 'paperReal', walletStore: ws, customPairs: { 'EUR/USDT': { sym: 'EUR' }, 'BNB/USDT': { sym: 'BNB' }, 'GBP/USDT': { sym: 'GBP' } }, removedPairs: ['GBP/USDT'] };
    Object.defineProperty(ctx.S, 'pairStates', { get() { return ws[this.tradingMode].pairStates; } });
    vm.createContext(ctx);
    vm.runInContext(fnSrc(s02, '_freshWallet') + '\n' + fnSrc(s02, '_freshWalletStore') + '\n' + fnSrc(s02, '_ensureWalletStore') + '\nfunction makePairState(cfg){ return { neuf: cfg.sym }; }\n' + fnSrc(s11, '_replayPairChanges'), ctx);
    const avant = ws.sim.pairStates['EUR/USDT'];
    ctx._replayPairChanges();
    ['sim', 'paperReal', 'real'].forEach(m => ['EUR/USDT', 'BNB/USDT'].forEach(p => assert.ok(ws[m].pairStates[p], m + ' ' + p)));
    assert.strictEqual(ws.real.pairStates['EUR/USDT'].neuf, 'EUR'); assert.strictEqual(ws.sim.pairStates['EUR/USDT'], avant, 'état AA remplacé');
    assert.strictEqual(ws.real.pairStates['BTC/USDT'].mark, 'realBTC/USDT'); assert.ok(!ws.real.pairStates['GBP/USDT'], 'paire retirée créée');
  });
  await T('A2 · renderPairPnl (07) sur l\'écran RE avec une paire sans état : aucune exception (avant : TypeError → la fin du battement sautait)', () => {
    const ctx = { Math, Object, PAIRS: { 'BTC/USDT': { dec: 2 }, 'EUR/USDT': { dec: 4 } }, S: { pairStates: { 'BTC/USDT': { totalPnlUsd: 2, totalPnlPct: 1, totalTrades: 4, winTrades: 2 } } }, document: { getElementById: () => null } };
    vm.createContext(ctx); vm.runInContext(fnSrc(s07, 'renderPairPnl'), ctx);
    ctx.renderPairPnl();
  });
  await T('A3 · addPair (11), proposition de paire (07), paires dynamiques de loadState (09b2) : _ensureWalletStore appelé après la paire ajoutée', () => {
    assert.ok(/_ensureWalletStore\(\)/.test(code(fnSrc(s11, 'addPair'))), '11 addPair');
    assert.ok(/S\.pairStates\[pairKey\] = makePairState\(PAIRS\[pairKey\]\);\s*\n\s*try \{ if \(typeof _ensureWalletStore === 'function'\) _ensureWalletStore\(\); \}/.test(s07), '07 proposition');
    assert.ok(/if \(snap\.pairCandidates\) S\.pairCandidates = snap\.pairCandidates;\s*\n\s*try \{ if \(typeof _ensureWalletStore === 'function'\) _ensureWalletStore\(\); \}/.test(s9b2), '09b2 paires dynamiques');
  });

  console.log('▶ B. état choisi par Rams — n° 11');
  const W = (opts) => {
    const rec = {}, ls = storage();
    ls.setItem('nexus_state_v2', JSON.stringify({ cycle: 900, _lightened: true })); ls.setItem('aura_highwater_cycle', '900');
    if (opts.lsThrow) ls.throwOn = k => k === 'nexus_state_v2';
    const ctx = { console, JSON, Object, Array, Date, Promise, setTimeout, RT: { SAVE_KEY: 'nexus_state_v2', STORE_STATE: 'state' }, localStorage: ls, openDB: fakeOpenDB(opts.idb !== false, rec) };
    ctx.window = ctx; vm.createContext(ctx);
    const lk = /const _LIGHT_KEYS = \[[\s\S]*?\];/.exec(s9b2); assert.ok(lk, '_LIGHT_KEYS');
    vm.runInContext(lk[0].replace('const ', 'var ') + '\n' + fnSrc(s9b2, '_lightSnapshot') + '\n' + fnSrc(s9b2, '_ecranMode') + '\n' + fnSrc(s9b2, '_writeChosenState'), ctx);
    ctx.S = opts.S; if (opts.ecran) ctx.AuraChrono = { getCurrentMode: () => opts.ecran };
    return { ctx, rec, ls };
  };
  const SNAP = { cycle: 500, tradingAccount: 10, walletStore: { sim: { x: 1 } }, agents: [{ id: 'a' }] };
  await T('B1 · _writeChosenState (09b2) : snapshot COMPLET en IDB, version ALLÉGÉE en LS, repère aura_highwater_cycle = cycle choisi ; sauvegardes suspendues', async () => {
    const { ctx, rec, ls } = W({}); const r = await ctx._writeChosenState(J(SNAP));
    assert.deepStrictEqual([r.idb, r.ls, r.cycle], [true, true, 500]);
    assert.strictEqual(rec.put.k, 'nexus_state_v2'); assert.deepStrictEqual(rec.put.v.walletStore, SNAP.walletStore);
    const L = JSON.parse(ls._o.nexus_state_v2); assert.strictEqual(L.cycle, 500); assert.strictEqual(L._lightened, true); assert.ok(!('walletStore' in L) && !('agents' in L), 'LS non allégé');
    assert.strictEqual(ls._o.aura_highwater_cycle, '500'); assert.strictEqual(ctx._auraChosenStateWriting, true);
    const w2 = W({}); w2.ls.throwOn = k => k === 'aura_highwater_cycle'; await w2.ctx._writeChosenState(J(SNAP));
    assert.ok(!('aura_highwater_cycle' in w2.ls._o), 'repère d\'avant (900) laissé : l\'état choisi serait pris pour une régression');
  });
  await T('B2 · IDB refusée : rien d\'autre n\'est touché (LS et repère d\'avant), sauvegardes rendues ; LS refusé : retiré (l\'IDB, l\'état choisi, est seul candidat au chargement)', async () => {
    let w = W({ idb: false }), r = await w.ctx._writeChosenState(J(SNAP));
    assert.strictEqual(r.idb, false); assert.strictEqual(JSON.parse(w.ls._o.nexus_state_v2).cycle, 900); assert.strictEqual(w.ls._o.aura_highwater_cycle, '900'); assert.strictEqual(w.ctx._auraChosenStateWriting, false);
    w = W({ lsThrow: true }); r = await w.ctx._writeChosenState(J(SNAP));
    assert.deepStrictEqual([r.idb, r.ls], [true, false]); assert.ok(!('nexus_state_v2' in w.ls._o), 'ancien LS (cycle 900) laissé : il gagnerait au chargement'); assert.strictEqual(w.ls._o.aura_highwater_cycle, '500');
    r = await W({}).ctx._writeChosenState({ cycle: 'x' }); assert.strictEqual(r.idb, false, 'état sans cycle écrit');
  });
  await T('B2b · ce que la confirmation dit « inchangé » l\'est : un réglage absent (ou nul) du fichier garde la valeur vivante ; le mode à l\'écran ne change pas (écran mémorisé de 01)', async () => {
    const live = { tradingMode: 'paperReal', bunkerCfg: { enabled: false, triggerDropPct: 20 }, vacancesCfg: { active: true, endDate: 123 }, toastVerbose: true, antiRevengeCfg: { enabled: false } };
    const { ctx, rec } = W({ S: live, ecran: 'paperReal' });
    await ctx._writeChosenState({ cycle: 500, tradingMode: 'real', walletStore: {}, antiRevengeCfg: { enabled: true, cooldownMin: 30 }, bunkerCfg: null });
    const v = rec.put.v; assert.deepStrictEqual([v.tradingMode, v.bunkerCfg, v.vacancesCfg, v.toastVerbose, v.antiRevengeCfg.cooldownMin], ['paperReal', live.bunkerCfg, live.vacancesCfg, true, 30]);
    assert.notStrictEqual(v.bunkerCfg, live.bunkerCfg, 'copie, pas la même référence');
  });
  await T('B3 · saveState et la sauvegarde de sortie (09b2) ne réécrivent rien pendant l\'écriture d\'un état choisi', () => {
    assert.ok(/if \(typeof window !== 'undefined' && window\._auraChosenStateWriting === true\) return false;/.test(code(fnSrc(s9b2, 'saveState'))), 'saveState');
    assert.ok(/window\._auraChosenStateWriting === true\) return;/.test(code(fnSrc(s9b2, '_flushSyncOnExit'))), 'sortie');
  });
  await T('B4 · restoreBackup (04) : plus de saveState (refusé par l\'anti-régression) ; _writeChosenState ; champs « argent » du mode à l\'écran sautés quand le backup porte walletStore ; telegramCfg jamais copié', () => {
    const rb = code(fnSrc(s04, 'restoreBackup'));
    assert.ok(!/saveState\(/.test(rb) && /await _writeChosenState\(snap\)/.test(rb) && /if \(parWallet && acc\.includes\(key\)\) return;/.test(rb) && /Restauration NON écrite/.test(rb));
    assert.ok(/if \(key === 'telegramCfg'( \|\| key === 'newsApiKey')?\) return;/.test(rb) && /if \(key === 'tradingMode'\) return;/.test(rb), 'telegramCfg / tradingMode');   // [GO ALERTES · 15/10/2026] + newsApiKey
  });
  const RB = (o) => {
    const seen = { alerts: [], written: null, saved: [], conf: [] }, S = { cycle: 900, botAutoMode: false, walletStore: { sim: {}, paperReal: {}, real: {} } };
    const ctx = { console, JSON, Object, Array, Date, Promise, String, Number, isFinite, S, confirm: m => { seen.conf.push(m); return true; }, alert: m => seen.alerts.push(m), showToast() {},
      setTimeout: () => 0, location: { reload() {} }, _getBackup: async () => ({ meta: { date: 1, type: 'auto', label: 'x' }, state: o.state }),
      _buildFullBackup: (l, t) => ({ meta: { label: l, type: t } }), _saveBackupToDB: async b => { seen.saved.push(b.meta.type); return o.safe !== false; }, _backupJournal() {},
      buildSnapshot: () => J(S), _writeChosenState: async sn => { seen.written = sn; return { idb: true, cycle: sn.cycle }; } };
    ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fnSrc(s9b2, '_chosenStateRefus') + '\n' + fnSrc(s04, 'restoreBackup'), ctx); return { ctx, seen, S };
  };
  const WS3 = () => ({ sim: { tradingAccount: 1 }, paperReal: { tradingAccount: 2 }, real: { tradingAccount: 3 } });
  await T('B5 · restoreBackup : backup de sécurité refusé → rien n\'est remplacé ; backup d\'avant juillet (sans les 3 portefeuilles) → refusé ; telegramCfg d\'un vieux backup ignoré', async () => {
    let r = RB({ state: { cycle: 500, walletStore: WS3() }, safe: false }); await r.ctx.restoreBackup(1);
    assert.ok(r.seen.alerts.some(a => /backup de sécurité/.test(a)) && r.S.cycle === 900 && !r.seen.written, 'sécurité');
    r = RB({ state: { cycle: 500, tradingAccount: 77 } }); await r.ctx.restoreBackup(1);
    assert.ok(r.seen.alerts.some(a => /avant la séparation des 3 modes/.test(a)) && r.S.cycle === 900 && r.seen.saved.length === 0, 'ancien format');
    r = RB({ state: { cycle: 500, walletStore: WS3(), telegramCfg: { botToken: 'VIEUX' } } }); await r.ctx.restoreBackup(1);
    assert.ok(r.S.cycle === 500 && !('telegramCfg' in r.S) && r.seen.written && r.seen.saved[0] === 'pre-import', 'restauration');
  });
  await T('B6 · bannière de régression « 📂 Restaurer un backup » (09b2) : _chosenStateRefus + _chosenStateText + _writeChosenState, puis rechargement (avant : LS complet seul)', () => {
    const b = code(fnSrc(s9b2, '_showRecoveryBanner'));
    assert.ok(/_chosenStateRefus\(snapObj\)/.test(b) && /_chosenStateText\(snapObj\)/.test(b) && /_writeChosenState\(snapObj\)/.test(b) && !/localStorage\.setItem\(saveKey/.test(b));
  });

  console.log('▶ C. importer / récupérer — n° 12');
  const IMP = () => {
    const seen = { conf: [], toasts: [], wrote: null, loaded: 0 }, S = { cycle: 900, botAutoMode: false, walletStore: { sim: { cashAccount: 0, tradingAccount: 100, totalTrades: 7, openPositions: [] }, paperReal: { tradingAccount: 50, totalTrades: 3, openPositions: [{ stakeUsdt: 5 }] }, real: { tradingAccount: 0, totalTrades: 0, openPositions: [] } } };
    const ctx = { console, JSON, Math, Object, Array, Date, Promise, String, Number, isFinite, S, RT: { SAVE_KEY: 'nexus_state_v2', STORE_STATE: 'state', _simRunning: false },
      document: { createElement: () => (seen.inp = { click() {} }) }, confirm: m => { seen.conf.push(m); return true; }, showToast: m => seen.toasts.push(m),
      setTimeout: (f, ms) => { seen.timer = ms; seen.timerFn = f; return 0; }, location: { reload() { seen.reload = (seen.reload || 0) + 1; } },
      _writeChosenState: async s => { seen.wrote = J(s); seen.flagAtWrite = true; ctx._auraChosenStateWriting = true; return { idb: true, ls: true, cycle: s.cycle }; },
      loadState: async () => { seen.loaded++; seen.flagAtLoad = ctx._auraChosenStateWriting; return true; }, renderAll() {}, rndHash: () => 'h', nowStr: () => 't', _computePortfolio: w => (w.cashAccount || 0) + (w.tradingAccount || 0) + (w.openPositions || []).reduce((a, p) => a + p.stakeUsdt, 0) };
    ctx.window = ctx; vm.createContext(ctx);
    vm.runInContext(fnSrc(s9b2, '_ecranMode') + '\n' + fnSrc(s9b2, '_chosenStateText') + '\n' + fnSrc(s9b2, '_chosenStateRefus') + '\n' + fnSrc(s9b3, 'importState') + '\n' + fnSrc(s9b3, 'recoverFromFiles'), ctx);
    ctx.AuraChrono = { getCurrentMode: () => 'paperReal' };
    return { ctx, seen };
  };
  const FILE = { _type: 'aura_guardian_full', aura: { cycle: 500, botAutoMode: true, walletStore: { sim: { tradingAccount: 80, totalTrades: 5, openPositions: [] }, paperReal: { tradingAccount: 40, totalTrades: 2, openPositions: [] }, real: { tradingAccount: 1, totalTrades: 0, openPositions: [], running: true } },
    bunkerCfg: { enabled: true, triggerDropPct: 3, actions: { closePositions: true } }, vacancesCfg: { active: true, endDate: Date.UTC(2026, 9, 20, 12), allowAuto: false } } };
  await T('C1 · « Importer backup » : la confirmation nomme les 3 portefeuilles et leur play / pause, AUTO / MANU, le cycle, le Bunker et le Mode Vacances du fichier ; écrit par _writeChosenState, puis RECHARGE (aucun loadState en place) ; sauvegardes bloquées jusque-là', async () => {
    const { ctx, seen } = IMP(); ctx.importState(); await seen.inp.onchange({ target: { files: [{ text: async () => JSON.stringify(FILE) }] } });
    const m = seen.conf[0] || ''; assert.ok(/• AA : 100,00 \$ · 7 trades · 0 position\(s\) · ⏸ en pause  →  80,00 \$ · 5 trades/.test(m) && /• EV : 55,00 \$ · 3 trades · 1 position\(s\) · ⏸ en pause  →  40,00 \$/.test(m) && /• RE : .*→  1,00 \$ · 0 trades · 0 position\(s\) · ▶ en marche/.test(m), m);
    assert.ok(/AUTO \/ MANU : MANU  →  AUTO/.test(m) && /Cycle : #900  →  #500/.test(m) && /• Mode à l'écran : inchangé \(EV\)/.test(m), m);
    assert.ok(/• Bunker : réglage d'usine  →  ON · seuil 3 % · « fermer les positions » ON/.test(m) && /• Mode Vacances : non  →  en cours jusqu'au /.test(m) && /• Anti-Revenge : réglage d'usine  →  inchangé \(absent du fichier\)/.test(m), m);
    assert.strictEqual(seen.wrote && seen.wrote.cycle, 500); assert.strictEqual(seen.loaded, 0, 'loadState en place'); assert.strictEqual(ctx._auraChosenStateWriting, true);
    assert.strictEqual(seen.timer, 600); seen.timerFn(); assert.strictEqual(seen.reload, 1);
    assert.ok(/Session importée depuis fichier · cycle #500/.test(JSON.stringify(seen.wrote.chainLog)), 'journal');
  });
  await T('C2 · « 📂 Récupérer un backup » : même confirmation, même écriture, même rechargement ; le meilleur cycle des fichiers choisis', async () => {
    const { ctx, seen } = IMP(); ctx.recoverFromFiles(); await seen.inp.onchange({ target: { files: [{ name: 'a.json', text: async () => JSON.stringify({ cycle: 10, walletStore: WS3() }) }, { name: 'b.json', text: async () => JSON.stringify(FILE) }] } });
    assert.ok(/b\.json/.test(seen.conf[0]) && /Cycle : #900  →  #500/.test(seen.conf[0]), seen.conf[0]); assert.strictEqual(seen.wrote.cycle, 500); assert.strictEqual(seen.loaded, 0); assert.strictEqual(seen.timer, 600);
  });
  await T('C3 · un fichier d\'avant juillet (sans les 3 portefeuilles) : refusé avant toute confirmation, rien d\'écrit (import et récupération)', async () => {
    let r = IMP(); r.ctx.importState(); await r.seen.inp.onchange({ target: { files: [{ text: async () => JSON.stringify({ cycle: 500, tradingAccount: 9 }) }] } });
    assert.ok(r.seen.conf.length === 0 && !r.seen.wrote && /avant la séparation des 3 modes/.test(r.seen.toasts.join(' ')), r.seen.toasts.join(' | '));
    r = IMP(); r.ctx.recoverFromFiles(); await r.seen.inp.onchange({ target: { files: [{ name: 'x.json', text: async () => JSON.stringify({ cycle: 500 }) }] } });
    assert.ok(r.seen.conf.length === 0 && !r.seen.wrote, 'récupération');
  });

  console.log('▶ D. réglages sauvegardés — n° 13');
  const KEYS = ['antiRevengeCfg', 'bunkerCfg', 'vacancesCfg', 'soundCfg', 'notifConfig', 'toastVerbose'];
  await T('D1 · buildSnapshot (09b1) écrit les 6 réglages ; le manifeste (09b2) les nomme ; telegramCfg n\'est PAS dans le snapshot', () => {
    const ctx = { RT: { SAVE_KEY: 'k' }, Object, Array, Date, JSON, console, PAIRS: {}, window: {} };
    ctx.S = { agents: [], pairStates: {}, antiRevengeCfg: { enabled: false }, bunkerCfg: { enabled: false }, vacancesCfg: { active: true }, soundCfg: { volume: 0.2 }, notifConfig: { enabled: true }, toastVerbose: true, telegramCfg: { botToken: 'SECRET' } };
    vm.createContext(ctx); vm.runInContext(fnSrc(s9b1, 'buildSnapshot'), ctx); const snap = ctx.buildSnapshot();
    KEYS.forEach(k => assert.deepStrictEqual(J(snap[k]), J(ctx.S[k]), k)); assert.ok(!JSON.stringify(snap).includes('SECRET'), 'jeton Telegram dans le snapshot');
    const man = (/window\._APPLYSNAP_MANIFEST = \[([^\]]*)\]/.exec(s9b2) || [])[1] || ''; KEYS.forEach(k => assert.ok(man.includes("'" + k + "'"), 'manifeste ' + k));
  });
  const REL = () => {
    const ctx = { Object, Array, JSON, Number, isFinite, Date, console, setTimeout: () => 0, S: {} }; ctx.window = ctx; vm.createContext(ctx);
    vm.runInContext([fnSrc(s06, '_rvGet'), fnSrc(s07, '_bkGet'), fnSrc(s06, '_vacGet'), fnSrc(s06, '_sndGet'), fnSrc(s07, '_initNotifConfig'), fnSrc(s9b2, '_reglageMerge'), fnSrc(s9b2, '_reglagesRelus')].join('\n'), ctx);
    return ctx;
  };
  await T('D2 · loadState (_reglagesRelus) relit chaque réglage sur ses valeurs d\'usine : champs connus du même type seulement ; Bunker « 1 / 0 » → booléen ; champs retirés ignorés', () => {
    const ctx = REL();
    ctx._reglagesRelus({ antiRevengeCfg: { enabled: false, cooldownMin: 5, blockCount: 3, triggerPct: 'x', inconnu: 1 }, bunkerCfg: { enabled: 0, triggerDropPct: 20, actions: { closePositions: true, reduceMises: true }, minStakePct: 5 },
      vacancesCfg: { active: false, maxDailyLoss: 30, prevBotMode: true, endDate: 123, stakePct: 10 }, soundCfg: { enabled: false, preset: 'casino', volume: 0.3 }, notifConfig: { enabled: true, twinAlert: true }, toastVerbose: true });
    const S = ctx.S;
    assert.deepStrictEqual([S.antiRevengeCfg.enabled, S.antiRevengeCfg.cooldownMin, S.antiRevengeCfg.blockCount, S.antiRevengeCfg.triggerPct, 'inconnu' in S.antiRevengeCfg], [false, 5, 3, 1.0, false]);
    assert.deepStrictEqual([S.bunkerCfg.enabled, S.bunkerCfg.triggerDropPct, S.bunkerCfg.actions.closePositions, 'reduceMises' in S.bunkerCfg.actions, 'minStakePct' in S.bunkerCfg], [false, 20, true, false, false]);
    assert.deepStrictEqual([S.vacancesCfg.maxDailyLoss, S.vacancesCfg.prevBotMode, S.vacancesCfg.endDate, 'stakePct' in S.vacancesCfg], [30, true, 123, false]);
    assert.deepStrictEqual([S.soundCfg.enabled, S.soundCfg.preset, S.soundCfg.volume, S.notifConfig.enabled, S.notifConfig.twinAlert, S.toastVerbose], [false, 'casino', 0.3, true, true, true]);
    assert.ok(/try \{ _reglagesRelus\(snap\); \}/.test(code(fnSrc(s9b2, 'loadState'))), 'loadState n\'appelle pas _reglagesRelus');
  });
  const VAC = (o) => {
    const seen = { toasts: [], conf: [], setBot: [] }, ctx = { Object, Array, JSON, Number, isFinite, Date, Math, console, S: o.S || {}, document: { getElementById: () => null },
      confirm: m => { seen.conf.push(m); return o.confirm !== false; }, showToast: m => seen.toasts.push(m), setInterval: () => 1, clearInterval() {}, saveState() {}, renderVacancesSection() {},
      updateModeButton() {}, setBotMode: v => { seen.setBot.push(v); ctx.S.botAutoMode = v; }, _walletKey: m => (m === 'paperReal' || m === 'real') ? m : 'sim',
      _walletFor: m => ctx.S.walletStore[m] };
    ctx.window = ctx; vm.createContext(ctx);
    vm.runInContext('var _vacTimer = null;\n' + ['_vacGet', '_vacDayKey', '_vacPf', 'exitVacancesMode', '_vacResume', '_vacUpdateBanner', '_vacDailyCheck'].map(n => fnSrc(s06, n)).join('\n'), ctx);
    return { ctx, seen };
  };
  const WSV = () => ({ sim: { tradingAccount: 500 }, paperReal: { tradingAccount: 1000 }, real: { tradingAccount: 2000 } });
  await T('D3 · Mode Vacances : date de retour passée (au chargement ou en marche) → fin des vacances SANS toucher AUTO / MANU ; « Rentrer de vacances » propose AUTO par une confirmation', () => {
    let v = VAC({ S: { botAutoMode: false, tradingMode: 'paperReal', walletStore: WSV(), vacancesCfg: { active: true, endDate: Date.now() - 1000, prevBotMode: true, mode: 'paperReal', startPortfolio: 990 } } });
    v.ctx._vacResume(); assert.deepStrictEqual([v.ctx.S.vacancesCfg.active, v.ctx.S.botAutoMode, v.seen.conf.length], [false, false, 0]); assert.ok(/resté en MAN — touche AUTO/.test(v.seen.toasts[0]) && /P&L: \+\$10\.00/.test(v.seen.toasts[0]), v.seen.toasts[0]);
    v = VAC({ S: { botAutoMode: false, tradingMode: 'sim', walletStore: WSV(), vacancesCfg: { active: true, endDate: Date.now() + 86400000, prevBotMode: true, mode: 'paperReal', startPortfolio: 1000 } } });
    v.ctx._vacResume(); assert.strictEqual(v.ctx.S.vacancesCfg.active, true, 'vacances en cours arrêtées');
    v.ctx.exitVacancesMode(); assert.deepStrictEqual([v.seen.conf.length, v.seen.setBot, v.ctx.S.botAutoMode], [1, [true], true]);
    v = VAC({ confirm: false, S: { botAutoMode: false, walletStore: WSV(), vacancesCfg: { active: true, endDate: Date.now() + 86400000, prevBotMode: true, mode: 'paperReal' } } });
    v.ctx.exitVacancesMode(); assert.deepStrictEqual([v.seen.setBot, v.ctx.S.botAutoMode], [[], false]);
    let called = 0; const r = REL(); r.setTimeout = f => f(); r.window._vacResume = () => called++; r._reglagesRelus({ vacancesCfg: { active: true, endDate: Date.now() + 1000 } }); assert.strictEqual(called, 1, '_reglagesRelus ne relance pas les vacances');
  });
  await T('D3b · Mode Vacances « Perte max/jour ($) » : la perte du JOUR en $ du portefeuille de départ (avant : S.pnl24h, un % depuis le chargement) → bot en pause au-delà ; repère du jour gardé dans le réglage', () => {
    const S = { botAutoMode: true, tradingMode: 'sim', walletStore: WSV(), pnl24h: -5.5, vacancesCfg: { active: true, endDate: Date.now() + 86400000, maxDailyLoss: 50, mode: 'paperReal', dayKey: 0, dayStartPf: 0 } };
    const v = VAC({ S }); v.ctx._vacDailyCheck(); assert.strictEqual(S.vacancesCfg.dayStartPf, 1000); assert.strictEqual(S.botAutoMode, true);
    S.walletStore.paperReal.tradingAccount = 960; v.ctx._vacDailyCheck(); assert.strictEqual(S.botAutoMode, true, '−40 $ < 50 $');
    S.walletStore.sim.tradingAccount = 100; v.ctx._vacDailyCheck(); assert.strictEqual(S.botAutoMode, true, 'un autre mode ne compte pas');
    S.walletStore.paperReal.tradingAccount = 940; v.ctx._vacDailyCheck(); assert.strictEqual(S.botAutoMode, false, '−60 $ > 50 $'); assert.ok(/perte du jour -\$60\.00 > ta limite \$50/.test(v.seen.toasts.pop()));
    S.botAutoMode = true; S.vacancesCfg.dayKey = 20000101; v.ctx._vacDailyCheck(); assert.deepStrictEqual([S.botAutoMode, S.vacancesCfg.dayStartPf], [true, 940], 'nouveau jour : nouveau repère');
    S.walletStore.paperReal.tradingAccount = 880; S.walletStore.paperReal.openPositions = [{ stakeUsdt: 50, currentVal: 0.5 }]; v.ctx._vacDailyCheck(); assert.strictEqual(S.botAutoMode, false, 'perte latente (mise 50 $ qui vaut 0,5 $) non comptée : −10 $ au lieu de −59,5 $');
    const S2 = { botAutoMode: true, tradingMode: 'sim', walletStore: WSV(), vacancesCfg: { active: true, endDate: Date.now() + 86400000, maxDailyLoss: 50, dayKey: 99999999, dayStartPf: 1000 } };
    const v2 = VAC({ S: S2 }); v2.ctx._vacDailyCheck(); assert.deepStrictEqual([S2.botAutoMode, S2.vacancesCfg.mode, S2.vacancesCfg.dayStartPf], [true, 'sim', 500], 'vacances sans mode (état plus ancien) : fausse perte de 500 $');
  });
  await T('D4 · Telegram : jeton et options gardés dans localStorage « aura_tg_cfg » (hors snapshot) et relus ; S.telegramCfg non énumérable → absent de tout JSON.stringify(S)', () => {
    const ls = storage(), mk = () => { const c = { S: {}, localStorage: ls, JSON, Object, Array, String, showToast() {}, renderTelegramSection() {} }; vm.createContext(c); vm.runInContext([fnSrc(s06, '_tgGet'), fnSrc(s06, '_tgSave'), fnSrc(s06, 'updateTgField'), fnSrc(s06, 'toggleTgOption'), fnSrc(s06, 'toggleTgEnabled')].join('\n').replace(/^/, "const _TG_LS = 'aura_tg_cfg';\n"), c); return c; };
    let c = mk(); c.updateTgField('botToken', ' 123:ABC '); c.updateTgField('chatId', '42'); c.toggleTgEnabled(); c.toggleTgOption('onHebdo');
    c = mk(); const g = c._tgGet(); assert.deepStrictEqual([g.botToken, g.chatId, g.enabled, g.onHebdo, g.onTrade], ['123:ABC', '42', true, true, true]);
    assert.ok(!JSON.stringify(c.S).includes('123:ABC') && Object.keys(c.S).indexOf('telegramCfg') === -1, 'jeton visible par JSON.stringify(S) (backups de l\'historique, exports)');
    c.S.telegramCfg.chatId = '7'; assert.strictEqual(c._tgGet().chatId, '7');
    const c2 = mk(); c2.S.telegramCfg = { botToken: 'X' }; c2._tgGet(); assert.ok(!JSON.stringify(c2.S).includes('"X"'), 'réglage posé ailleurs : rendu non énumérable');
  });
  await T('D5 · imports (04) : vacancesCfg (garde AUTO / MANU d\'avant) et telegramCfg (secret) jamais écrits ; la confirmation le dit', () => {
    const nf = /const AURA_IMPORT_NEVER_FIELDS = \[([\s\S]*?)\];/.exec(s04)[1]; assert.ok(/'vacancesCfg'/.test(nf) && /'telegramCfg'/.test(nf));
    assert.ok(/le Bunker, le Mode Vacances, Telegram\.';/.test(s04));
  });

  console.log('▶ E. « Réduire les mises » — n° 14');
  await T('E1 · Bunker, Vacances, Urgence : plus aucune écriture de mise ni promesse « mises réduites » à l\'écran', () => {
    const ab = code(fnSrc(s07, 'activateBunker')), ev = code(fnSrc(s06, 'enterVacancesMode')), xv = code(fnSrc(s06, 'exitVacancesMode')), rb = code(fnSrc(s07, 'renderBunkerSection')), rv = code(fnSrc(s06, 'renderVacancesSection')), ru = code(fnSrc(s06, 'renderUrgenceSection'));
    [ab, ev, xv].forEach((f, i) => assert.ok(!/S\.stakeUsdt\s*=|stakeConfig\.defaultStake\s*=|a\.stake\s*=/.test(f), 'écriture de mise #' + i));
    assert.ok(!/Mises réduites/.test(ab) && !/Mises réduites|reduceMises|minStakePct/.test(rb) && !/vacPct|Mises à X|réduit les mises/.test(rv) && !/urgenceReduceStake|Mises à 10/.test(ru));
    assert.ok(!/reduceMises|minStakePct/.test(code(fnSrc(s07, '_bkGet'))) && !/stakePct|prevStake/.test(code(fnSrc(s06, '_vacGet'))));
  });
  await T('E2 · l\'ouvreur (09c) et la fermeture (02 closePosition / openPosition) : texte identique au commit 61aeac6 — la taille des mises n\'est pas touchée', () => {
    const h = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
    assert.strictEqual(h(rd('js/09c-auto-open.js')), '246bff0cee30b335', '09c modifié');
    // [GO ALERTES · 15/10/2026] closePosition a reçu la raison « objectif / stop » et l'appel Telegram du trade (notifications seulement) : ces lignes,
    // et elles seules, sont ramenées à leur texte d'avant — le reste doit rester identique au commit 61aeac6 (banc-alertes.js vérifie ce qu'elles font).
    const AL = [
      [/\n  \/\/ \[GO ALERTES · 15\/10\/2026\] 3e argument \{ sortie[^\n]*\n(  \/\/[^\n]*\n){2}  const _sortie = [^\n]*\n    \? [^\n]*\n/, '\n'],
      [/      \/\/ v19 · #38 Notification trade fermé — \[GO ALERTES · 15\/10\/2026\][^\n]*\n      try \{ if\(typeof notifTradeClose === 'function'\) notifTradeClose\(pos\.pair, pos\.side, realisedUsd, realisedPct, _sortie, S\.tradingMode\); \} catch\(e\) \{\}\n      \/\/ \[GO ALERTES · 15\/10\/2026\] Telegram[^\n]*\n      try \{ if\(typeof tgOnTrade === 'function'\)[^\n]*\n/,
       "      // v19 · #38 Notification trade fermé\n      try { if(typeof notifTradeClose === 'function') notifTradeClose(pos.pair, pos.side, realisedUsd, realisedPct); } catch(e) {}\n"],
    ];
    let cp = fnSrc(s02, 'closePosition');
    if (/GO ALERTES/.test(cp)) AL.forEach(([re, by]) => { assert.ok(re.test(cp), 'GO ALERTES : ligne attendue absente de closePosition'); cp = cp.replace(re, by); });
    assert.strictEqual(h(fnSrc(s02, 'openPosition') + cp), '774d37994384441d', '02 open/close modifiés');
  });

  console.log('▶ F. Hedge automatique — n° 15');
  await T('F1 · l\'écran dit « non branché » (05 et Réglages 04) et l\'affichage n\'appelle plus _detectSystemicBearStress (il faisait avancer le compteur BEAR)', () => {
    const el = { innerHTML: '' }, ctx = { S: { paperRealConfig: { hedgingEnabled: true, hedgingTriggerBearStreak: 2, hedgingMaxAllocPct: 3 }, adaptiveState: { bearStreak: 0 }, chainLog: [] }, document: { getElementById: () => el }, _detectSystemicBearStress: () => { ctx.S.adaptiveState.bearStreak++; return { streak: 9, regime: 'bear' }; } };
    vm.createContext(ctx); vm.runInContext(fnSrc(s05, 'renderHedgeAutoSection'), ctx); ctx.renderHedgeAutoSection(); ctx.renderHedgeAutoSection();
    assert.strictEqual(ctx.S.adaptiveState.bearStreak, 0, 'compteur avancé par l\'affichage'); assert.ok(/non branché/.test(el.innerHTML) && /ON · seuil 2 · allocation 3/.test(el.innerHTML) && !/Système actif|toggleHedging/.test(el.innerHTML), el.innerHTML.slice(0, 300));
    assert.ok(/Non branché' \+ \(hedgingEnabled \? ' \(réglé ON, sans effet\)'/.test(s04) && !/>Activé<\/span>/.test(s04));
  });

  console.log('▶ G. boutons « test » qui agissaient pour de vrai — n° 16');
  await T('G1 · Anti-Revenge : plus de « 🧪 Simuler un blocage » (triggerAntiRevenge posait un vrai blocage du bot) · Bunker : plus de « 🧪 Simuler un déclenchement » (vrai bunker)', () => {
    const ra = code(fnSrc(s06, 'renderAntiRevengeSection')), rb = code(fnSrc(s07, 'renderBunkerSection'));
    assert.ok(!/triggerAntiRevenge\(/.test(ra) && !/Simuler/.test(ra), 'anti-revenge'); assert.ok(!/activateBunker\(/.test(rb) && !/Simuler/.test(rb), 'bunker');
    assert.ok(/onclick="toggleBkEnabled\(\);"/.test(rb) && !/updateBkParam\('enabled'/.test(rb), 'interrupteur du Bunker');
  });

  await T('G2 · Bunker : l\'action « 💾 Sauvegarder un backup » crée un VRAI backup dans l\'historique (avant : saveState seul) ; désactivé, la section dit « Protection désactivée » ; capital affiché = celui du déclencheur (compte + positions)', () => {
    const seen = { saved: [] }, el = { innerHTML: '' }, ctx = { Object, JSON, Math, Date, console, document: { getElementById: id => id === 'bunkerSection' ? el : null },
      navigator: {}, showToast() {}, S: { bunker: { active: false }, tradingAccount: 100, openPositions: [{ stakeUsdt: 50, currentVal: 40 }], chainLog: [] },
      _buildFullBackup: (l, t) => ({ meta: { label: l, type: t } }), _saveBackupToDB: b => { seen.saved.push(b.meta); return Promise.resolve(true); }, _abExecute: () => { seen.ab = 1; } };
    ctx.window = ctx; vm.createContext(ctx);
    vm.runInContext(['_bkState', '_bkGet', '_bkCapital', '_bkGetCapRef', '_bkUpdateBanner', 'activateBunker', 'renderBunkerSection'].map(n => fnSrc(s07, n)).join('\n'), ctx);
    ctx.activateBunker(12.5); assert.ok(seen.saved.length === 1 && /^Bunker · capital -12\.5%/.test(seen.saved[0].label) && !seen.ab, JSON.stringify(seen));
    ctx.S.bunker.active = false; ctx.S.bunkerCfg.enabled = false; ctx.S.bunker.capRef = 200; ctx.renderBunkerSection();
    assert.ok(/Protection désactivée/.test(el.innerHTML) && !/Protection active/.test(el.innerHTML), 'texte'); assert.ok(/Actuel : \$140/.test(el.innerHTML) && /Chute actuelle : 30\.0%/.test(el.innerHTML), el.innerHTML.match(/Actuel[^<]*/)[0]);
  });

  console.log('▶ H, I, J. Outils, Snapshots, Urgence — n° 17, 18, 19');
  const all = LOADED.map(f => code(rd(f))).join('\n') + '\n' + code(html);
  // [GO OUTILS · 18/10/2026] l'onglet est rouvert par « go outils » (ETAT n° 33) : il ne l'est que si son banc existe (banc-outils.js, 18 essais
  // sur le vrai code, 0/18 sur le code d'avant) ; l'audit du 14/10 reste versionné
  await T('H1 · onglet « 🛠 Outils » : rouvert seulement avec banc-outils.js (go outils, 18/10) ; l\'audit est versionné', () => {
    const ouvert = /switchOutilsTab\('outils'|openOutils\('outils'/.test(all);
    assert.ok(!ouvert || fs.existsSync(path.join(ROOT, 'banc-outils.js')), 'onglet ouvert sans son banc'); assert.ok(fs.existsSync(path.join(ROOT, 'rejeu/reglages-20261014/outils-audit.md')), 'audit absent');
  });
  await T('I1 · « 📸 Snapshots internes » : ni bouton, ni fenêtre, ni appel à listInternalSnapshots / _snapshotActionCreate dans le code chargé', () => {
    assert.ok(!/openSnapshotsModal|listInternalSnapshots\(|_snapshotActionCreate\(|SNAPSHOTS INTERNES/.test(all));
  });
  await T('J1 · « 🚨 Ouvrir Mode Urgence » : aucun bouton n\'appelle openUrgence (#urgenceOverlay absent) ; la carte Score de Risque dit où agir (⊗, AUTO → MAN)', () => {
    assert.ok(!/onclick="openUrgence\(\)"/.test(all) && !/urgenceOverlay"/.test(html) && !/SOS<\/strong> \(bouton flottant/.test(all));
    assert.ok(/ferme tes positions \(avec confirmation\)/.test(code(fnSrc(s06, 'renderRiskScoreSection'))));
  });

  console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
  process.exit(fail ? 1 : 0);
})();
