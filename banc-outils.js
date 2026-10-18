// banc-outils.js — [GO OUTILS · 18/10/2026] VERSION 20261018b
// « L'onglet 🛠 Outils fait ce qu'il dit » — registre ETAT-AURA8.md, G2 n° 33 (audit de l'onglet : rejeu/reglages-20261014/outils-audit.md).
// Chaque essai fait tourner le VRAI texte de l'app en vm (blocs entiers de 04, 05, 06, 07) ou relit le HTML, et ÉCHOUE sur le code d'avant :
//   BANC_ROOT=<copie du commit 0a68fd7> node banc-outils.js
//   A  accès : bouton de l'onglet, plus d'id en double, les 4 entrées retirées (Paper Ultra, Coffre, Auto-backup, 2e calculateur)
//   B  Urgence : « Fermer » confirme en listant chaque position du SEUL mode affiché ; « Passer en MANU » confirme puis setBotMode(false) ;
//      « Backup complet » = backup Guardian écrit par le chemin natif, toast selon le résultat réel
//   C  Stress test : USDT libre jamais « perdu », exposition, perte bornée à la mise (règle de closePosition), plus de tuiles inventées
//   D  ADN : rien écrit dans l'historique, paire jointe, taille et durée vraies, régime (jamais enregistré) retiré
//   E  Calculateur : le SL coûte exactement le risque choisi, R/R sans levier, frais « par côté », Kelly ≤ 0 dit « ne pas trader »
//   F  Comparaison : le backup complet (aura_guardian_full) est lu, mode contre mode
//   G  Replay : journal non daté exclu, signe moins affiché, « brut », vitesse appliquée en lecture
//   H  What-if / Backtest : mise réelle, brut contre net dit, PF sur le net, stratégie de démonstration dite
//   I  Rapport PDF / Excel / Hebdo : mode juste (RE), net vrai, paire jointe, colonnes d'agents inexistantes retirées, S.agents jamais retrié,
//      gabarit hebdo sans DOM de l'appli, écriture native et toast honnête (plus de « téléchargé » inconditionnel)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
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
const bloc = (src, a, b) => { const i = src.indexOf(a); assert.ok(i >= 0, 'ancre : ' + a.slice(0, 60)); const j = src.indexOf(b, i); assert.ok(j > i, 'fin : ' + b.slice(0, 60)); return src.slice(i, j + b.length); };
const blocSi = (src, a, b) => (src.indexOf(a) >= 0 ? bloc(src, a, b) : '');
const J = o => JSON.stringify(o);
const s02 = rd('js/02-state-init.js'), s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'), s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js'),
      s06 = rd('js/06-v63-patterns-chartistes.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), html = rd('AURA8_v118.html');
const AIDES = blocSi(s05, '// ═══ [GO OUTILS · 18/10/2026] ETAT n° 33 · aides communes', 'window._outilsPrintable = _outilsPrintable;');
const URG = bloc(s06, '// ═══ v68 · MODE URGENCE ═══', 'window.renderUrgenceSection = renderUrgenceSection;');
const STRESS = bloc(s06, "let _stScenarioKey = 'crash2022';", 'window.renderStressTestSection = renderStressTestSection;');
const CALC = bloc(s06, '// ═══ v74 · CALCULATEUR DE POSITION ═══', 'window.renderCalcSection = renderCalcSection;');
const DIFF = bloc(s06, '// ═══ v75 · COMPARAISON AVANT/APRÈS BACKUP ═══', 'window.renderDiffSection = renderDiffSection;');
const ADN = bloc(s06, '// ═══ v85 · SIGNATURE ADN DU TRADE ═══', 'window.renderAdnSection = renderAdnSection;');
const WHATIF = bloc(s04, '// ═══ v26 · #7 SIMULATION WHAT-IF INTERACTIVE ═══', 'window.updateWhatIf = updateWhatIf;');
const REPLAY = bloc(s04, '// ═══ v28 · #18 REPLAY DE SESSION ═══', 'window.replayReset = replayReset;') + '\n' + fnSrc(s07, '_showReplayEvent') + '\n' + fnSrc(s07, '_updateReplayUI');
const REPORT = bloc(s05, '// ═══ v43 · #13 EXPORT RAPPORT PDF MENSUEL ═══', 'window.renderPdfReportSection = renderPdfReportSection;');
const EXCEL = bloc(s05, '// ═══ v44 · #42 EXPORT EXCEL MULTI-ONGLETS ═══', 'window.renderXlExportSection = renderXlExportSection;');
const HEBDO = bloc(s05, '// ═══ v45 · #6 RÉSUMÉ HEBDOMADAIRE AUTO ═══', 'window.renderHebdoSection = renderHebdoSection;') + '\n' + fnSrc(s07, 'exportHebdoPdf');
const BASE = fnSrc(s02, '_walletKey') + '\n' + fnSrc(s02, '_modeLab') + '\n';

function el(id) { return { id, innerHTML: '', textContent: '', value: '', disabled: false, style: {}, children: [], className: '', classList: { add() {}, remove() {} },
  insertBefore(c) { this.children.unshift(c); }, removeChild(c) { this.children.splice(this.children.indexOf(c), 1); }, get firstChild() { return this.children[0]; }, get lastChild() { return this.children[this.children.length - 1]; },
  appendChild() {}, click() { if (typeof this.onchange === 'function') this.onchange({ target: { files: [{ name: 'f.json' }] } }); } }; }
function fakeDoc() { const els = {}; return { els, getElementById: id => (els[id] || (els[id] = el(id))), createElement: t => el(t), querySelector: () => null, querySelectorAll: () => [], body: el('body') }; }
const tr = (o) => Object.assign({ type: 'position', side: 'buy', amount: '1', price: 100, pnl: 1, stakeUsdt: 20, pnlUsdt: 0.2, entryPrice: 99, entryTs: 1760000000000, ts: 1760000600000, time: 't' }, o);
// contexte « app » : S à 3 portefeuilles (accesseurs vers le mode affiché, comme 02 _installWalletAccessors), stubs recensés
function app(o) {
  o = o || {};
  const rec = { toasts: [], confirms: [], closes: [], setBot: [], opened: [], fsWrites: [], blobs: [] };
  const W = () => ({ openPositions: [], pairStates: {}, fees: { totalGross: 0, totalPnlNet: 0, byPair: {} }, tradingAccount: 1000, portfolio: 1000, totalTrades: 0, winTrades: 0 });
  const ws = { sim: W(), paperReal: W(), real: W() };
  if (o.ws) Object.keys(o.ws).forEach(m => Object.assign(ws[m], o.ws[m]));
  const S = { tradingMode: o.mode || 'paperReal', walletStore: ws, chainLog: [], agents: o.agents || [], botAutoMode: o.auto !== false, dreamJournal: [] };
  ['openPositions', 'pairStates', 'fees', 'tradingAccount', 'portfolio', 'totalTrades', 'winTrades'].forEach(k =>
    Object.defineProperty(S, k, { configurable: true, enumerable: true, get() { return ws[_wk(this.tradingMode)][k]; }, set(v) { ws[_wk(this.tradingMode)][k] = v; } }));
  function _wk(m) { return (m === 'paperReal' || m === 'real') ? m : 'sim'; }
  const ctx = { console, Math, Object, JSON, Array, Number, String, Date, isFinite, parseFloat, parseInt, Promise, setTimeout: (f) => 0, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    S, PAIRS: { 'BTC/USDT': { dec: 2, color: '#f7931a' }, 'ETH/USDT': { dec: 2, color: '#627eea' } }, document: fakeDoc(),
    showToast: (t) => rec.toasts.push(String(t)), confirm: (t) => { rec.confirms.push(String(t)); return o.confirm !== undefined ? o.confirm : true; },
    setBotMode: (v) => { rec.setBot.push(v); S.botAutoMode = !!v; }, renderHome() {}, updateModeButton() {},
    closePosition: (id, bot, opts) => { const L = S.openPositions, i = L.findIndex(p => p.id === id); rec.closes.push({ id, bot, opts: J(opts || null) }); if (i >= 0) { const p = L.splice(i, 1)[0]; ((S.pairStates[p.pair] = S.pairStates[p.pair] || { trades: [] }).trades).push(tr({ type: 'urgence', pnlUsdt: 0 })); } },
    _buildFullBackupFile: () => ({ _type: 'aura_guardian_full', aura: { cycle: 1 } }), _fullBackupName: () => 'aura_guardian_full_X.json',
    _shareOrDownloadJSON: async (json, name) => { rec.fsWrites.push({ name, n: json.length }); return o.shareRes || 'fs-written'; },
    _fsWriteBackup: async (text, name) => { rec.fsWrites.push({ name, text }); return o.fsOk === false ? null : 'fs-written'; },
    window: null, Blob: function (parts, opt) { rec.blobs.push(opt && opt.type); }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    FileReader: function () { const r = this; this.readAsText = () => r.onload({ target: { result: o.fileText || '{}' } }); } };
  ctx.window = ctx; ctx.self = ctx;
  if (o.native) ctx.Capacitor = { Plugins: {} };
  ctx.window.open = (...a) => { rec.opened.push(a); return { document: { write() {}, close() {} }, focus() {}, print() {} }; };
  vm.createContext(ctx);
  vm.runInContext(BASE, ctx);
  return { ctx, S, ws, rec };
}
const pos = (o) => Object.assign({ id: 'p' + Math.random(), pair: 'BTC/USDT', side: 'long', stakeUsdt: 100, totalExposure: 100, entryPrice: 100, auto: true }, o);
const tick = () => new Promise(r => setImmediate(r));

(async () => {
  console.log('▶ banc-outils · code ' + ROOT);

  console.log('▶ A. accès à l\'onglet');
  await T('A1 · bouton « 🛠 Outils » dans la barre d\'onglets ; registre sans id en double ; Paper Ultra, Coffre, Auto-backup retirés ; chaque rendu nommé existe', () => {
    assert.ok(/switchOutilsTab\('outils', this\)/.test(html), 'pas de bouton d\'accès');
    const reg = bloc(s07, '  outils: {', '\n  },');
    const ids = [...reg.matchAll(/id:'([^']+)'/g)].map(m => m[1]);
    assert.strictEqual(new Set(ids).size, ids.length, 'id en double : ' + ids.join(','));
    ['paperUltraSection', 'vaultSection', 'autoBackupSection'].forEach(x => assert.ok(!ids.includes(x), 'toujours dans l\'onglet : ' + x));
    const all = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => rd('js/' + f)).join('\n');
    [...reg.matchAll(/(?:render|init):'([^']+)'/g)].forEach(m => assert.ok(new RegExp('function ' + m[1] + '\\s*\\(').test(all), 'rendu absent : ' + m[1]));
  });

  console.log('▶ B. Urgence');
  await T('B1 · « Fermer » : confirmation qui liste chaque position du mode affiché (paire, sens, bot / manuel, mise, latent) et les modes NON fermés ; annuler ne ferme rien ; OK → closePosition { urgence } pour chacune', () => {
    const a = app({ confirm: false });
    a.ws.paperReal.openPositions.push(pos({ id: 'x1', pair: 'BTC/USDT', side: 'long', stakeUsdt: 50, totalExposure: 50, entryPrice: 100, auto: true }), pos({ id: 'x2', pair: 'ETH/USDT', side: 'short', stakeUsdt: 30, totalExposure: 30, entryPrice: 200, auto: false }));
    a.ws.paperReal.pairStates = { 'BTC/USDT': { price: 110, trades: [] }, 'ETH/USDT': { price: 210, trades: [] } };
    a.ws.sim.openPositions.push(pos({ id: 's1' }), pos({ id: 's2' }));
    vm.runInContext(URG, a.ctx);
    vm.runInContext('renderUrgenceSection()', a.ctx);
    const h = a.ctx.document.els.urgenceSection.innerHTML;
    assert.ok(/onclick="urgenceCloseAllConfirm\(\)"/.test(h) && !/onclick="urgenceCloseAll\(\)"/.test(h), 'le bouton ferme sans confirmation');
    vm.runInContext('urgenceCloseAllConfirm()', a.ctx);
    assert.strictEqual(a.rec.confirms.length, 1); assert.strictEqual(a.rec.closes.length, 0, 'annulé mais fermé');
    const t = a.rec.confirms[0];
    ['EV', 'BTC/USDT LONG · bot · mise 50.00 $ · latent +5.00 $', 'ETH/USDT SHORT · manuel · mise 30.00 $ · latent −1.50 $', 'NON fermées (autres modes) : AA 2'].forEach(x => assert.ok(t.includes(x), 'texte sans « ' + x + ' » :\n' + t));
    const b = app({ confirm: true }); b.ws.paperReal.openPositions.push(pos({ id: 'y1' }), pos({ id: 'y2', pair: 'ETH/USDT' }));
    vm.runInContext(URG, b.ctx); vm.runInContext('urgenceCloseAllConfirm()', b.ctx);
    assert.deepStrictEqual(b.rec.closes.map(c => c.id + c.opts), ['y1{"urgence":true}', 'y2{"urgence":true}']);
  });
  await T('B2 · « Passer en MANU » : confirmation qui dit les 3 modes et ce qui continue / s\'arrête ; annuler ne change rien ; OK → setBotMode(false) (journal, puces) ; plus de a._paused ni S.mode', () => {
    const a = app({ confirm: false, agents: [{ id: 'g1' }] });
    a.ws.paperReal.openPositions.push(pos({ auto: true })); a.ws.real.openPositions.push(pos({ auto: true }), pos({ auto: false }));
    vm.runInContext(URG, a.ctx); vm.runInContext('urgencePauseBot()', a.ctx);
    assert.strictEqual(a.rec.confirms.length, 1, 'aucune confirmation'); assert.strictEqual(a.S.botAutoMode, true, 'annulé mais passé en MANU'); assert.strictEqual(a.rec.setBot.length, 0);
    const t = a.rec.confirms[0];
    ['3 modes', 'AA 0 · EV 1 · RE 1', 'ce geste n\'en ferme aucune', 'SL / TP ATR', 'perte max', 'sauvetage de session'].forEach(x => assert.ok(t.includes(x), 'texte sans « ' + x + ' »'));
    assert.ok(!/RESTENT ouvertes/.test(t), 'promet que les positions restent ouvertes (le Sauvetage 03 botRescue les ferme aussi en MANU)');
    const b = app({ confirm: true, agents: [{ id: 'g1' }] }); vm.runInContext(URG, b.ctx); vm.runInContext('urgencePauseBot()', b.ctx);
    assert.deepStrictEqual(b.rec.setBot, [false]); assert.ok(!('mode' in b.S) && b.S.agents.every(x => !('_paused' in x)), 'champs morts écrits');
  });
  await T('B3 · « Backup complet » (app Android) : le backup Guardian (_buildFullBackupFile) par le chemin natif ; écriture refusée → « non écrit », jamais « téléchargé » (pas de repli sur un lien blob)', async () => {
    for (const [ok, want] of [[true, '💾 Backup complet écrit : Download/AURA/aura_guardian_full_X.json'], [false, '❌ Backup non écrit']]) {
      const a = app({ native: true, fsOk: ok }); vm.runInContext(AIDES + '\n' + URG, a.ctx);
      await vm.runInContext('urgenceSaveBackup()', a.ctx); await tick();
      assert.strictEqual(a.rec.fsWrites.length, 1, 'chemin natif non pris'); assert.strictEqual(a.rec.blobs.length, 0, 'lien blob');
      assert.ok(a.rec.toasts.some(x => x.startsWith(want)) && !a.rec.toasts.some(x => /téléchargé/.test(x)), ok + ' → toasts ' + J(a.rec.toasts));
    }
  });

  console.log('▶ C. Stress test');
  await T('C1 · compte 100 % USDT (aucune position) : ni perte ni tuile inventée (WR bots, agents résistants), quel que soit le scénario', () => {
    const a = app(); vm.runInContext(STRESS, a.ctx);
    for (const k of ['crash2022', 'flash_crash', 'custom']) {
      vm.runInContext('_stScenarioKey=' + J(k), a.ctx);
      const r = vm.runInContext('_runStressTest()', a.ctx);
      assert.ok(Math.abs(r.totalLoss) < 1e-9, k + ' : perte ' + r.totalLoss);
    }
    vm.runInContext('renderStressTestSection()', a.ctx);
    const h = a.ctx.document.els.stressTestSection.innerHTML;
    assert.ok(!/WR bots|agents résistants|cassés/.test(h), 'tuiles inventées encore là');
  });
  await T('C2 · positions : exposition × chute, SHORT gagne, perte bornée à la mise (02 closePosition), mises jamais retirées deux fois', () => {
    const a = app({ ws: { paperReal: { tradingAccount: 500 } } });
    a.ws.paperReal.openPositions.push(pos({ side: 'long', stakeUsdt: 100, totalExposure: 300, entryPrice: 100 }), pos({ pair: 'ETH/USDT', side: 'short', stakeUsdt: 50, totalExposure: 50, entryPrice: 100 }));
    a.ws.paperReal.pairStates = { 'BTC/USDT': { price: 100 }, 'ETH/USDT': { price: 100 } };
    vm.runInContext(STRESS + "\n_stScenarioKey='flash_crash';", a.ctx);
    const r = vm.runInContext('_runStressTest()', a.ctx);
    // LONG ×3 à −40 % : −120 brut, borné à −100 (la mise) ; SHORT à −40 % : +20 ; compte 500 + 150 engagés = 650 → 500 + 0 + 70 = 570
    assert.ok(Math.abs(r.valNow - 650) < 1e-9 && Math.abs(r.valAfter - 570) < 1e-9, 'avant ' + r.valNow + ' après ' + r.valAfter);
    assert.ok(Math.abs(r.longPosLoss - 100) < 1e-9 && Math.abs(r.shortPosGain - 20) < 1e-9);
  });

  console.log('▶ D. ADN');
  await T('D1 · rien écrit dans l\'historique ; paire jointe ; taille, durée vraies ; régime (jamais enregistré) retiré ; classement par P&L', () => {
    const a = app();
    a.ws.paperReal.pairStates = { 'BTC/USDT': { trades: [tr({ stakeUsdt: 10, pnlUsdt: -1, entryTs: 1760000000000, ts: 1760000000000 + 2 * 60000 }), tr({ stakeUsdt: 40, pnlUsdt: 2, entryTs: 1760000000000, ts: 1760000000000 + 3 * 3600000 })] },
      'ETH/USDT': { trades: [tr({ stakeUsdt: 20, pnlUsdt: 1 })] } };
    const avant = J(a.ws.paperReal.pairStates);
    vm.runInContext(ADN, a.ctx); vm.runInContext('renderAdnSection()', a.ctx);
    assert.strictEqual(J(a.ws.paperReal.pairStates), avant, 'l\'historique a été modifié (t.adn)');
    const h = a.ctx.document.els.adnSection.innerHTML;
    assert.ok(/>BTC</.test(h) && />ETH</.test(h), 'paire absente');
    assert.ok(h.includes('Petite mise') && h.includes('Grosse mise'), 'taille constante');
    assert.ok(h.includes('Scalp &lt;5min') || h.includes('Scalp <5min'), 'durée inconnue'); assert.ok(h.includes('Moyen terme'));
    assert.ok(!/>Calm</.test(h), 'gène régime toujours là');
  });

  console.log('▶ E. Calculateur');
  await T('E1 · levier ×3 : le SL coûte EXACTEMENT le risque (20 $ + frais), R/R = TP ÷ SL = 2 (avant : 6), frais par côté ×2 sur l\'exposition, capital synchronisé AVANT le 1er calcul', () => {
    const a = app({ ws: { paperReal: { tradingAccount: 1000 } } });
    vm.runInContext(CALC + "\n_CALC.leverage=3;", a.ctx);
    const r = vm.runInContext('_runCalc()', a.ctx);
    assert.ok(Math.abs(r.exposure * r.slPct / 100 - 20) < 1e-9, 'perte au SL ' + r.exposure * r.slPct / 100);
    assert.ok(Math.abs(r.netSL - (-20 - r.exposure * 0.002)) < 1e-9, 'netSL ' + r.netSL);
    assert.ok(Math.abs(r.rr - 2) < 1e-9, 'R/R ' + r.rr); assert.ok(Math.abs(r.stakeUsd - r.exposure / 3) < 1e-9, 'mise');
    const b = app({ ws: { paperReal: { tradingAccount: 1076 } } }); vm.runInContext(CALC, b.ctx); vm.runInContext('renderCalcSection()', b.ctx);
    assert.ok(b.ctx.document.els.calcSection.innerHTML.includes('$21.52 (2%)'), '1er rendu calculé sur 1 000 $');
  });
  await T('E2 · Kelly ≤ 0 (espérance négative) : « ne PAS prendre ce trade » — plus jamais « ✅ dans les clous »', () => {
    const a = app({ ws: { paperReal: { totalTrades: 100, winTrades: 30 } } });
    vm.runInContext(CALC + "\n_CALC.tpPct=1;_CALC.slPct=1.5;", a.ctx); vm.runInContext('renderCalcSection()', a.ctx);
    const h = a.ctx.document.els.calcSection.innerHTML;
    assert.ok(/ne PAS prendre/.test(h) && !/dans les clous/.test(h), 'Kelly négatif mal dit');
    // WR avant frais positif mais le mode perd après frais (relecture adverse du 18/10 : EV 50 % avant frais, net −61,72 $) → pas de « ✅ »
    const b = app({ ws: { paperReal: { totalTrades: 100, winTrades: 50, fees: { totalPnlNet: -61.72, byPair: {} } } } });
    vm.runInContext(CALC, b.ctx); vm.runInContext('renderCalcSection()', b.ctx);
    const h2 = b.ctx.document.els.calcSection.innerHTML;
    assert.ok(/AVANT frais/.test(h2) && /surestimée/.test(h2) && !/✅ Ton risque/.test(h2), 'Kelly sur le WR brut présenté comme sûr');
  });

  console.log('▶ F. Comparaison');
  await T('F1 · backup complet (aura_guardian_full) lu ; comparaison mode contre mode (walletStore) — avant : « Avant : $0.00, 0 trades »', () => {
    const file = J({ _type: 'aura_guardian_full', savedAt: '2026-10-17T10:00:00Z', aura: { cycle: 5, tradingMode: 'sim', portfolio: 999, totalTrades: 1, savedAt: '2026-10-17T10:00:00Z',
      walletStore: { sim: { portfolio: 999, totalTrades: 1 }, paperReal: { portfolio: 1071.5, tradingAccount: 1070, totalTrades: 350, winTrades: 170, fees: { totalGross: 12 } }, real: {} }, agents: [{ fitness: 400 }] } });
    const a = app({ fileText: file, ws: { paperReal: { portfolio: 1080.64, totalTrades: 367 } } });
    vm.runInContext(DIFF, a.ctx); vm.runInContext('loadDiffBackup()', a.ctx);
    const h = a.ctx.document.els.diffSection.innerHTML;
    assert.ok(h.includes('$1071.50') && h.includes('>350<'), 'backup lu comme vide ou mauvais mode');
    assert.ok(!/Active le backup auto/.test(h));
  });

  console.log('▶ G. Replay');
  await T('G1 · journal 🔗 sans date exclu (avant : daté « maintenant », rejoué après tous les trades) ; P&L « brut », signe moins affiché', () => {
    const a = app(); a.S.chainLog.push({ icon: '🤖', desc: 'x', time: '1' });
    a.ws.paperReal.pairStates = { 'BTC/USDT': { trades: [tr({ ts: 1000, pnlUsdt: -3 }), tr({ ts: 2000, pnlUsdt: 1 })] } };
    vm.runInContext(REPLAY, a.ctx); vm.runInContext('initReplaySection()', a.ctx);
    const ev = vm.runInContext('_RP.events', a.ctx);
    assert.strictEqual(J(ev.map(e => e.type)), J(['trade-loss', 'trade-win']), 'événements');
    vm.runInContext('_RP.idx=1;_updateReplayUI()', a.ctx);
    const d = a.ctx.document.els;
    assert.ok(/brut/.test(d.rpPnlLbl.textContent) && d.rpPnlLbl.textContent.includes('−$3.00'), d.rpPnlLbl.textContent);
    assert.ok(d.rpStats.innerHTML.includes('−$3.00') && d.rpStats.innerHTML.includes('P&L brut'), 'mini-stats');
  });
  await T('G2 · la vitesse s\'applique pendant la lecture', () => {
    const a = app(); let iv = [];
    a.ctx.setInterval = (f, ms) => { iv.push(ms); return iv.length; };
    a.ws.paperReal.pairStates = { 'BTC/USDT': { trades: [tr({ ts: 1000 })] } };
    vm.runInContext(REPLAY, a.ctx); vm.runInContext('initReplaySection(); replayPlay();', a.ctx);
    assert.ok(/onchange="replaySetSpeed\(this\.value\)"/.test(a.ctx.document.els.replaySection.innerHTML), 'sélecteur sans effet');
    vm.runInContext('replaySetSpeed("5")', a.ctx);
    assert.deepStrictEqual(iv, [800, 160]);
  });

  console.log('▶ H. What-if / Backtest');
  await T('H1 · What-if : mise pré-remplie = mise RÉELLE des trades ; « brut » (réel) contre « net » (simulé) dit ; plus de « DD max »', () => {
    const a = app();
    a.ws.paperReal.pairStates = { 'BTC/USDT': { stake: 300, trades: [1, 2, 3, 4, 5].map(i => tr({ stakeUsdt: 20, pnlUsdt: i % 2 ? 1 : -1 })) } };
    vm.runInContext(WHATIF, a.ctx); vm.runInContext('initWhatIfSection()', a.ctx);
    assert.strictEqual(vm.runInContext('_WI_PARAMS.stake', a.ctx), 20, 'mise = réglage de paire');
    const h = a.ctx.document.els.wiResults.innerHTML + a.ctx.document.els.wiCompare.innerHTML;
    assert.ok(/BRUT/.test(h) && /NET/.test(h) && !/DD max/.test(h));
  });
  await T('H2 · Backtest : stratégie de démonstration dite à l\'écran, « Seuil signal » renommé, PF = gains nets ÷ pertes nettes', () => {
    const b = fnSrc(s04, 'initBacktestSection'), r = fnSrc(s04, 'runBacktest');
    assert.ok(/Ce n'est PAS la décision d'AURA/.test(b) && !/<label>Seuil signal/.test(b));
    assert.ok(/_sumW\/_sumL/.test(r) && /t\.netPnl/.test(r.slice(r.indexOf('_sumW'))), 'PF toujours sur les % bruts');
  });

  console.log('▶ I. Rapport PDF · Excel · Hebdo');
  const fullApp = (o) => {
    const a = app(Object.assign({ mode: 'real', agents: [{ name: 'macro', fitness: 100 }, { name: 'contra', fitness: 900, streak: 2 }] }, o || {}));
    // trades datés dans la semaine en cours quel que soit le jour où le banc tourne (lundi de 05 _getWeekTrades)
    const d = new Date(), lun = new Date(d); lun.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay())); lun.setHours(0, 0, 0, 0); const L0 = lun.getTime();
    a.ws.real.pairStates = { 'BTC/USDT': { totalTrades: 2, winTrades: 1, totalPnlUsd: -5, trades: [tr({ pnlUsdt: -2, ts: L0 + 3600e3 }), tr({ pnlUsdt: 1, ts: L0 + 7200e3 })] }, 'ETH/USDT': { totalTrades: 3, winTrades: 1, totalPnlUsd: 1, trades: [tr({ pnlUsdt: 0.5, ts: L0 + 10800e3 })] } };
    a.ws.real.fees = { totalGross: 9, totalPnlNet: -60.09, byPair: { 'BTC/USDT': { pnlNet: -8, tradingFees: 3, slippage: 1, funding: 0 } } };
    vm.runInContext(AIDES + '\n' + REPORT + '\n' + EXCEL + '\n' + HEBDO, a.ctx);
    return a;
  };
  await T('I1 · rapport : RE nommé RE, net vrai du mode (−60,09) à côté du brut, plus de colonnes Trades / WR d\'agents inexistantes ; l\'aperçu ne retrie pas S.agents', () => {
    const a = fullApp(); const h = vm.runInContext('_buildReportHTML()', a.ctx);
    assert.ok(h.includes('RE · Réel') && !h.includes('Mode Auto-apprentissage'), 'mode faux');
    assert.ok(h.includes('-60.09') && /brut/.test(h), 'net vrai absent');
    assert.ok(!/<th>Win Rate<\/th>/.test(h.slice(h.indexOf('Top 5 Agents'))), 'colonnes d\'agents inexistantes');
    const ordre = J(a.S.agents.map(x => x.name)); vm.runInContext('renderPdfReportSection()', a.ctx);
    assert.strictEqual(J(a.S.agents.map(x => x.name)), ordre, 'S.agents retrié en place');
  });
  await T('I2 · Excel : paire de chaque trade, net depuis le début au résumé, plus de WR% / funding par paire inventés', () => {
    const a = fullApp(); const x = vm.runInContext('buildExcelData()', a.ctx);
    assert.ok(/BTC\/USDT/.test(x.sheetTrades.split('\n')[1]) && /ETH\/USDT/.test(x.sheetTrades), 'paire vide');
    assert.ok(/P&L net depuis le début.*-60\.09/.test(x.sheetResume.replace(/"/g, '')), 'net absent');
    assert.ok(!/WR%/.test(x.sheetAgents.split('\n')[0]) && !/Funding/.test(x.sheetFrais.split('\n')[0]));
  });
  await T('I3 · Excel dans l\'app Android : écrit par le chemin natif ; si l\'écriture échoue, le toast le dit (avant : « téléchargé » toujours)', async () => {
    for (const ok of [true, false]) {
      const a = fullApp({ native: true, fsOk: ok }); await vm.runInContext('exportExcel()', a.ctx); await tick();
      assert.strictEqual(a.rec.blobs.length, 0, 'lien blob dans l\'app');
      assert.ok(a.rec.toasts.some(t => ok ? t.includes('écrit : Download/AURA/AURA_rapport_RE_') : t.startsWith('❌ Excel non écrit')), J(a.rec.toasts));
      assert.ok(!a.rec.toasts.some(t => /téléchargé/.test(t)), 'faux « téléchargé »');
    }
  });
  await T('I4 · hebdo : paire de chaque trade (avant : « undefined ») ; PDF sans DOM de l\'appli, écrit en .html dans l\'app Android sans window.open', async () => {
    const a = fullApp({ native: true });
    const w = vm.runInContext('_getWeekTrades(0)', a.ctx); const st = vm.runInContext('(w)=>_analyzeWeek(w.trades,w.monday,w.sunday)', a.ctx)(w);
    assert.deepStrictEqual(Object.keys(st.byPair).sort(), ['BTC/USDT', 'ETH/USDT']); assert.ok(!st.insights.some(i => /undefined/.test(i)), J(st.insights));
    // semaine coupée : ETH a 3 clôtures au compteur, 1 seule gardée (après le lundi) → l'écran le dit (relecture adverse : avant, jamais vu)
    vm.runInContext('renderHebdoSection()', a.ctx);
    assert.ok(/Semaine incomplète/.test(a.ctx.document.els.hebdoSection.innerHTML), 'coupure de l\'historique non dite');
    await vm.runInContext('exportHebdoPdf(0)', a.ctx); await tick();
    assert.strictEqual(a.rec.opened.length, 0, 'window.open dans l\'app');
    const f = a.rec.fsWrites[0]; assert.ok(f && /^AURA_hebdo_RE_.*\.html$/.test(f.name), J(a.rec.fsWrites.map(x => x.name)));
    assert.ok(!/compactWidgetTab|bunkerBanner|revengeBlock|cinemaOverlay/.test(f.text), 'DOM de l\'appli dans le gabarit');
    assert.ok(/P&L brut/.test(f.text) && /BTC\/USDT/.test(f.text));
  });

  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass}/${pass + fail} tests passés`);
  process.exit(fail ? 1 : 0);
})();
