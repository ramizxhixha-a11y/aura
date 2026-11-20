// banc-affichage-3.js — [GO AFFICHAGE 3 · 15/11/2026] les petits restes d'affichage (ETAT-AURA8.md, registre n° 86b, 86c, 88b, 67b, 68b, 77b, 93, 64).
// Chaque essai fait tourner le VRAI texte de l'app en vm et ÉCHOUE sur le code d'avant
//   BANC_ROOT=<copie du commit ba8be3a> node banc-affichage-3.js        (sauf les gardes G, C et F)
//   O1  (86b) 02 openPosition : la VRAIE ligne « const priceTag= … » évaluée — DOT 0,7612 → « $0,7612 » (avant : « $0 ») ; BTC → « $71 653 »
//   O2  (86b) 10f : les VRAIES lignes des prix de « BOT … @prix | … TP:… SL:… » évaluées — DOT → « $0,7612 », TP « $0,7841 » (avant : « 0 », « 0 »)
//   P1  (86c) 06 _prNote (alertes de prix, Telegram) : « DOT/USDT ≥ $0,7612 » (avant : « 0.76 ») ; 07 manuEditTp / manuEditSl : « Prix actuel : $0,7612 »,
//       valeur proposée « 0.7841 » (avant : « 0.78 » — accepter tel quel arrondissait le TP), toast « → $0,7841 »
//   P2  (86c) inventaire : plus aucun prix de paire écrit par toFixed(dec) / l'entier tronqué ; restent, classés : quantités (02, 09c), [champs de saisie (03, 08) :
//       fermés par go n° 86d], valeurs stockées (07 _calcBotTpSl), formats génériques (06 _diffVal, 11b, 16b)
//   F1  (88b) VRAI 16 _fiscOnClose sur une position de la voix → ligne d'historique marquée v:1 ; VRAI 16b : puce « 📈 Tendance » (avant : « 👤 MAN »), raison
//       « voix tendance longue », CSV « TENDANCE » ; une position à la main garde « 👤 MAN » et n'a PAS de champ v (registre léger)
//   B1  (67b) VRAIS badges de 05 : 3 fermetures gagnantes de suite (2 paires, voix comprise) → « En Feu ! » débloqué par checkBadges, « Inarrêtable » à 3/5
//       (avant : ps.streak, jamais écrit → jamais)
//   S1  (68b) VRAI 09b3 autoDlTick dans l'app Android, écriture native refusée : AUCUN lien blob, la sauvegarde n'est pas notée (last), l'échec l'est (fail,
//       raison), message + journal ; pas de nouvel essai avant la fréquence choisie ; écriture réussie ensuite → last posé, échec effacé ; navigateur : inchangé
//   T1  (77b) VRAI 02 applyLeverageBorrowFees (intérêts du levier) puis le VRAI fundCum de 07 et la tuile « Funding payé (info) » : les intérêts comptés UNE fois
//       (avant : deux — totalFunding les contient déjà)
//   M1  (93) VRAI 08 renderCorrMatrix sur un canvas témoin, 8 sièges « Hybrid Gen-… » 🧬 : tout le texte est DANS le canvas, chaque ligne nommée par sa
//       spécialité numérotée, la diagonale porte les numéros (plus de 🧬), le titre sous la grille (avant : noms à x ≥ largeur, titre sous le canvas)
//   R1  (64) VRAI 05 _outilsClosedTrades et VRAI 06 _tgHebdoText : une fermeture précédée de paliers compte les parts déjà fermées (brut g, sinon net), mise et %
//       suivent (avant : la ligne seule) ; 05 closePartial garde le brut g
//   G   garde : fichiers de la décision identiques au commit ba8be3a ; dans 02, 07 et 10f, seules les lignes de journal / de texte ont bougé
//   C   appels : _closeRowUsd ← 05 _outilsClosedTrades, 06 _tgHebdoText seulement ; _badgeWinRun ← 05 (badges) seulement ; pxTxt hors des fichiers de la décision
//   F   garde : banc-fixtures/affichage-3-retours.json redonne les 13 fichiers d'avant au caractère près (empreintes du commit ba8be3a)
// L'écran (alertes de prix, journal, matrice, historique fiscal, réglages de la sauvegarde) est éprouvé sur la vraie page :
//   node rejeu/sonde_affichage_3.js --root . --avant <copie d'avant> --backup <backup>
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const sansA3 = require('./banc-fixtures/sans-affichage-3.js'), pxVm = require('./banc-fixtures/px-vm.js');
let pass = 0, fail = 0;
async function T(name, fn) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n     ')); } }
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); if (!m) return null;
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
const need = (src, n) => { const t = fnSrc(src, n); assert.ok(t, 'fonction absente : ' + n); return t; };
const between = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'fin : ' + b.slice(0, 50)); return s.slice(i, j + b.length); };
const NB = ' ';   // séparateur des milliers de fr-FR
const F = { s02: 'js/02-state-init.js', s05: 'js/05-v37-19-indicateur-de-fatigue-bot.js', s06: 'js/06-v63-patterns-chartistes.js', s07: 'js/07-v90-mode-bunker-sos.js',
  s08: 'js/08-learning-history-render.js', s9b3: 'js/09b3-import-export.js', s10f: 'js/10f-resolveur-cycle.js', s16: 'js/16-fiscal.js', s16b: 'js/16b-fiscal-ecran.js' };
const C = {}; Object.keys(F).forEach(k => { C[k] = rd(F[k]); });
const PAIRS = { 'DOT/USDT': { dec: 2, color: '#e6007a' }, 'BTC/USDT': { dec: 0, color: '#f7931a' }, 'ETH/USDT': { dec: 0, color: '#627eea' }, 'XRP/USDT': { dec: 4 } };
const ctxOf = (o) => { const c = Object.assign({ console, Math, Object, JSON, Array, Number, String, Date, isFinite, isNaN, parseFloat, parseInt, Error, PAIRS }, o || {}); c.window = c; vm.createContext(c); pxVm(c, ROOT); return c; };

(async () => {
  console.log('▶ banc-affichage-3 · code ' + ROOT);

  await T('O1 (86b) · 02 openPosition : la VRAIE ligne du prix de « Position … @prix » — DOT « $0,7612 » (avant : « $0 »), BTC « $71 653 »', () => {
    const op = need(C.s02, 'openPosition'), line = op.split('\n').find(l => /^\s*const priceTag\s*=/.test(l));
    assert.ok(line, 'ligne priceTag');
    const run = (pair, px) => { const c = ctxOf({ pair, ps: { price: px }, cfg: PAIRS[pair] }); return vm.runInContext(line.replace(/^\s*const /, 'var ') + '\npriceTag', c); };
    assert.strictEqual(run('DOT/USDT', 0.7612), '$0,7612');
    assert.strictEqual(run('BTC/USDT', 71652.71), '$71' + NB + '653');
    assert.strictEqual(run('XRP/USDT', 0.575), '$0,5750');
  });

  await T('O2 (86b) · 10f : les VRAIES lignes des prix de « BOT … @prix | … TP:… SL:… » — DOT @ « $0,7612 », TP « $0,7841 », SL « $0,746 » (avant : « 0 »)', () => {
    const blk = between(C.s10f, '  if(_newsDecisive) _newsTrace(pair, _newsG, true);\n', '  S.chainLog.push({icon:side===').split('\n').slice(1, -1).join('\n');
    assert.ok(/\bpt\s*=/.test(blk) && /\btt\s*=/.test(blk) && /\bst\s*=/.test(blk), 'pt / tt / st : ' + blk.slice(0, 120));
    const c = ctxOf({ pair: 'DOT/USDT', ps: { price: 0.7612 }, cfg: PAIRS['DOT/USDT'], tpE: 0.7841, slE: 0.746 });
    const r = JSON.parse(vm.runInContext(blk.replace(/\bconst\b/g, 'var') + '\nJSON.stringify([pt, tt, st])', c));
    assert.deepStrictEqual(r, ['$0,7612', '$0,7841', '$0,746']);
  });

  await T('P1 (86c) · 06 _prNote (alertes, Telegram) « DOT/USDT ≥ $0,7612 » ; 07 manuEditTp / manuEditSl : « Prix actuel : $0,7612 », valeur proposée « 0.7841 », toast « → $0,7841 » (avant : « 0.76 », « 0.78 »)', () => {
    const c = ctxOf({ _PR_MODE_LAB: { sim: 'AA', paperReal: 'EV', real: 'RE' } });
    vm.runInContext((fnSrc(C.s06, '_prDec') || '') + '\n' + need(C.s06, '_prNote'), c);   // _prDec : le code d'avant (BANC_ROOT) le lit
    assert.strictEqual(c._prNote({ type: 'above', pair: 'DOT/USDT', value: 0.7612 }), 'DOT/USDT ≥ $0,7612');
    assert.strictEqual(c._prNote({ type: 'below', pair: 'BTC/USDT', value: 70000 }), 'BTC/USDT ≤ $70' + NB + '000');
    const seen = { prompts: [], toasts: [] };
    const pos = { pair: 'DOT/USDT', side: 'long', tp: 0.7841, sl: 0.7412, entryPrice: 0.76 };
    const d = ctxOf({ S: { openPositions: [pos], pairStates: { 'DOT/USDT': { price: 0.7612 } } }, prompt: (t, v) => { seen.prompts.push([t, v]); return v; },
      showToast: (t) => seen.toasts.push(String(t)), renderActionsGrid() {} });
    vm.runInContext(need(C.s07, 'manuEditTp') + '\n' + need(C.s07, 'manuEditSl'), d);
    d.manuEditTp('DOT/USDT'); d.manuEditSl('DOT/USDT');
    assert.ok(/Prix actuel : \$0,7612/.test(seen.prompts[0][0]), seen.prompts[0][0]);
    assert.deepStrictEqual(seen.prompts.map(p => p[1]), ['0.7841', '0.7412'], 'valeurs proposées');
    assert.strictEqual(pos.tp, 0.7841, 'TP accepté tel quel : inchangé'); assert.strictEqual(pos.sl, 0.7412, 'SL inchangé');
    assert.deepStrictEqual(seen.toasts, ['🎯 TP DOT/USDT → $0,7841', '🛑 SL DOT/USDT → $0,7412']);
  });

  await T('P2 (86c) · inventaire : plus aucun prix de paire écrit par toFixed(dec) ou l\'entier tronqué — restent, classés : quantités, valeurs stockées, formats génériques (champs de saisie : fermés par go n° 86d)', () => {
    const RE = /toFixed\([^)]*\bdec\b|_prDec\(|Math\.floor\(ps\.price\)|\.toFixed\(cfg\??\.dec|toFixed\(PAIRS\[[^\]]*\]\??\.dec/;
    const out = {};
    fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f) && !/\.min\.js$/.test(f)).forEach(f => {
      const s = rd('js/' + f), fns = [...s.matchAll(/\n(?:async )?function ([\w$]+)\s*\(/g)].map(m => [m.index, m[1]]);
      let pos = 0;
      s.split('\n').forEach(l => { if (RE.test(l) && !/^\s*\/\//.test(l)) { const b = fns.filter(x => x[0] < pos).pop(); const k = f.slice(0, 4) + ' ' + (b ? b[1] : '(haut)'); out[k] = (out[k] || 0) + 1; } pos += l.length + 1; });
    });
    assert.deepStrictEqual(out, {
      '02-s openPosition': 1, '02-s closePosition': 1, '02-s _addToPosition': 1, '09c- autoOpenPosition': 1,   // quantités (amount, qty)
      // [GO N° 86D · 15/11/2026] les champs de saisie (03 _adjPropPct, updatePairAnalysisPanels, 08 setTpSl) passent par 02 pxIn : sortis de l'inventaire (banc-n86d.js)
      '07-v _calcBotTpSl': 2,                                                                                     // valeurs stockées (tp / sl arrondis)
      '06-v _diffVal': 1, '11b- _lrnPct': 1, '16b- _fiscEur': 1 });                                              // formats génériques (pas un prix de paire)
  });

  await T('F1 (88b) · VRAI 16 _fiscOnClose + VRAI 16b : la voix → « 📈 Tendance », raison « voix tendance longue », CSV « TENDANCE » ; à la main : « 👤 MAN », pas de champ v', () => {
    const sb = { console, __clock: { t: Date.UTC(2026, 10, 15, 3) }, Intl };
    sb.window = sb; sb.setInterval = () => 0; sb.clearInterval = () => {}; sb.setTimeout = () => 0; sb.nowStr = () => '00:00'; sb.showToast = () => {}; sb.saveState = () => {};
    let csv = null; sb.downloadFile = (t) => { csv = t; return true; };
    vm.createContext(sb);
    vm.runInContext('const __RealDate = Date; Date = class extends __RealDate { constructor(...a) { if (a.length) super(...a); else super(__clock.t); } static now() { return __clock.t; } };' +
      'const S = { tradingMode: "paperReal", usdEurRate: 0.9, _usdEurLastFetch: 1, botAutoMode: false, taxConfig: { region: "BE" }, feeConfig: { makerRate: 0.001, takerRate: 0.001, fundingRate: 0, slippage: 0.0003 },' +
      ' chainLog: [], pairStates: {}, walletStore: { sim: { tradingAccount: 0, fiscalReserveAccount: 0, fiscalReserveLog: [], openPositions: [] }, paperReal: { tradingAccount: 1000, fiscalReserveAccount: 0, fiscalReserveLog: [], openPositions: [] },' +
      ' real: { tradingAccount: 0, fiscalReserveAccount: 0, fiscalReserveLog: [], openPositions: [] } } };' +
      'function _walletKey(m) { var k = m || S.tradingMode; return (k === "paperReal" || k === "real") ? k : "sim"; } function _walletFor(m) { return S.walletStore[_walletKey(m)]; }', sb);
    vm.runInContext(C.s16, sb, { filename: F.s16 }); vm.runInContext(C.s16b, sb, { filename: F.s16b });
    const P = (o) => JSON.stringify(Object.assign({ pair: 'BTC/USDT', side: 'short', auto: false, stakeUsdt: 96, totalExposure: 96, levBorrowed: 0, entryPrice: 70000, entryTs: Date.UTC(2026, 10, 12), _fxIn: 0.9 }, o));
    vm.runInContext('_fiscOnClose(' + P({ _voix: 'tendance' }) + ', 12, { tradingFee: 0.2, slipFee: 0.05 }, 61000)', sb);
    vm.runInContext('_fiscOnClose(' + P({ pair: 'ETH/USDT', side: 'long', _voix: undefined }) + ', -3, { tradingFee: 0.2, slipFee: 0.05 }, 3000)', sb);
    const H = JSON.parse(vm.runInContext('JSON.stringify(S.walletStore.paperReal.fiscal.hist)', sb));
    assert.strictEqual(H.length, 2); const voix = H.find(e => e.p === 'BTC/USDT'), man = H.find(e => e.p === 'ETH/USDT');
    assert.strictEqual(voix.v, 1, 'voix marquée'); assert.ok(!('v' in man), 'à la main : pas de champ v'); assert.strictEqual(voix.a, 0); assert.strictEqual(voix.r, 's', 'spéculatif');
    assert.ok(/voix tendance longue/.test(vm.runInContext('_fiscWhy(S.walletStore.paperReal.fiscal.hist.find(e => e.p === "BTC/USDT"))', sb)), 'raison');
    const el = { innerHTML: '' }; vm.runInContext('_fiscRenderPage', sb)(el);
    const rows = el.innerHTML.split('<div class="fz-tr">').slice(1);
    const rv = rows.find(r => /<b>BTC\/USDT<\/b>/.test(r)), rm = rows.find(r => /<b>ETH\/USDT<\/b>/.test(r));
    assert.ok(rv && /📈 Tendance/.test(rv) && !/👤 MAN/.test(rv), 'puce de la voix : ' + (rv || '').slice(0, 200));
    assert.ok(rm && /👤 MAN/.test(rm), 'puce à la main');
    vm.runInContext('_fiscExportCsv()', sb); assert.ok(csv, 'CSV');
    assert.ok(/;BTC\/USDT;SHORT;TENDANCE;/.test(csv) && /;ETH\/USDT;LONG;MANU;/.test(csv), csv.split('\n').slice(1).map(l => l.slice(0, 60)).join(' | '));
  });

  await T('B1 (67b) · VRAIS badges de 05 : 3 fermetures gagnantes de suite (2 paires, voix comprise) → « En Feu ! » débloqué ; « Inarrêtable » à 3/5 (avant : ps.streak, jamais écrit)', () => {
    const tr = (ts, usd, type) => ({ type: type || 'position', side: 'sell', pnl: usd, pnlUsdt: usd, stakeUsdt: 20, ts });
    const S = { totalTrades: 6, winTrades: 3, unlockedBadges: [], pairStates: {
      'BTC/USDT': { totalTrades: 3, totalPnlUsd: 0, trades: [tr(1, -1), tr(3, 2), { type: 'open', ts: 4 }, tr(5, 1, 'tendance')] },
      'ETH/USDT': { totalTrades: 3, totalPnlUsd: 0, trades: [tr(2, -1), tr(4, 3), tr(6, -2)] } } };   // dans l'ordre du temps : −, −, +, +, + (voix), − → 3 de suite
    const toasts = [];
    const c = ctxOf({ S, setTimeout: (f) => { f(); return 0; }, renderBadgesSection() {}, _showBadgeToast: (b) => toasts.push(b.id) });
    const s = C.s05, blk = between(s, 'const _BADGES = [', '\n];\n');
    vm.runInContext(blk.replace('const _BADGES', 'var _BADGES') + '\n' + ['_badgeWinRun', '_netPnl', '_wr', '_perfectDay', '_nightTrades', 'checkBadges'].map(n => fnSrc(s, n) || '').join('\n'), c);
    const b = n => vm.runInContext('_BADGES.find(x => x.id === "' + n + '")', c);
    assert.strictEqual(b('win_streak_3').check(), true, 'En Feu !'); assert.strictEqual(b('win_streak_5').check(), false);
    assert.ok(Math.abs(b('win_streak_5').prog() - 0.6) < 1e-12, 'progression 3/5');
    vm.runInContext('_showBadgeToast = window._showBadgeToast; checkBadges()', c);
    assert.ok(S.unlockedBadges.includes('win_streak_3') && !S.unlockedBadges.includes('win_streak_5'), JSON.stringify(S.unlockedBadges));
  });

  await T('S1 (68b) · VRAI 09b3 autoDlTick, app Android, écriture refusée : aucun lien blob, sauvegarde NON notée, échec noté et dit ; pas de nouvel essai avant la fréquence ; réussite ensuite → notée', async () => {
    let now = Date.UTC(2026, 10, 15, 3), blobs = 0, writes = 0, ok = false;
    const store = {}, toasts = [], St = { cycle: 5000, chainLog: [] };
    class D extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }
    const c = ctxOf({ Date: D, Promise, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
      Blob: function () { blobs++; }, URL: { createObjectURL: () => { blobs++; return 'blob:x'; }, revokeObjectURL() {} },
      document: { createElement: () => { blobs++; return { click() {}, style: {} }; }, body: { appendChild() {}, removeChild() {} } },
      setInterval: () => 0, setTimeout: () => 0, showToast: (t) => toasts.push(String(t)), rndHash: () => 'h', nowStr: () => '04:00',
      _buildFullBackupFile: () => ({ _type: 'aura_guardian_full', aura: { cycle: 5000 } }), _fullBackupName: () => 'aura_guardian_full_x.json',
      _fsWriteBackup: async () => { writes++; if (ok) return 'fs-written'; c._fsLastDiag = 'Ecriture refusee partout :\n- EXTERNAL_STORAGE (Download/AURA/x) : refuse'; return null; } });
    c.Capacitor = { Plugins: {} }; c._auraGetGlobalS = () => St;
    const s = C.s9b3, blk = between(s, "const AUTODL_KEY  = 'aura_autodl_meta';", '\n// Vérifie toutes les 60s si un téléchargement est dû.');
    vm.runInContext(blk.replace('const AUTODL_KEY', 'var AUTODL_KEY'), c);
    store.aura_autodl_meta = JSON.stringify({ enabled: true, everyMin: 180, last: 0 });
    const flush = () => new Promise(r => setImmediate(r));
    c.autoDlTick(); await flush(); await flush();
    let m = JSON.parse(store.aura_autodl_meta);
    assert.strictEqual(blobs, 0, 'lien blob'); assert.strictEqual(m.last, 0, 'sauvegarde notée sans fichier'); assert.strictEqual(m.fail, now, 'échec noté');
    assert.ok(/EXTERNAL_STORAGE/.test(m.failWhy) && !/\n/.test(m.failWhy), 'raison : ' + m.failWhy);
    assert.ok(toasts.length === 1 && /^❌ Sauvegarde auto non écrite : /.test(toasts[0]), toasts.join(' | '));
    assert.ok(St.chainLog.length === 1 && /Sauvegarde auto non écrite/.test(St.chainLog[0].desc), 'journal');
    now += 60 * 60000; c.autoDlTick(); await flush(); await flush();
    assert.strictEqual(writes, 1, 'nouvel essai avant la fréquence choisie');
    now += 121 * 60000; ok = true; c.autoDlTick(); await flush(); await flush();
    m = JSON.parse(store.aura_autodl_meta);
    assert.strictEqual(writes, 2); assert.strictEqual(m.last, now, 'réussite notée'); assert.ok(!('fail' in m) && !('failWhy' in m), 'échec effacé'); assert.strictEqual(toasts.length, 1);
    // navigateur (pas d'app Android) : le repli blob reste
    delete c.Capacitor; ok = false; store.aura_autodl_meta = JSON.stringify({ enabled: true, everyMin: 180, last: 0 });
    c.autoDlTick(); await flush(); await flush();
    m = JSON.parse(store.aura_autodl_meta); assert.ok(blobs > 0, 'navigateur : téléchargement'); assert.strictEqual(m.last, now);
    // réglages (04) : le prochain essai part de l'échec, l'échec est affiché
    const s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js');
    assert.ok(/const _adT = Math\.max\(ad\.last \|\| 0, ad\.fail \|\| 0\);/.test(fnSrc(s04, 'renderSettingsPanel')) && /❌ Dernier essai/.test(fnSrc(s04, 'renderSettingsPanel')), 'réglages');
  });

  await T('T1 (77b) · VRAI 02 applyLeverageBorrowFees puis VRAI fundCum (07) et tuile « Funding payé (info) » : les intérêts du levier comptés UNE fois (avant : deux)', () => {
    const S = { leverageBorrowed: 500, leverageBorrowRate: 0.0004, tradingAccount: 100, leverageTotalFees: 0, _autoLevBorrowed: 0, fiscalReserveAccount: 0, fiscalReserveLog: [],
      fees: { totalFunding: 1.5, totalGross: 0 } };
    const c = ctxOf({ S, nowStr: () => '00:00', rndHash: () => 'h', _computePortfolio: () => 0 });
    vm.runInContext(need(C.s02, 'applyLeverageBorrowFees'), c);
    for (let i = 0; i < 5; i++) c.applyLeverageBorrowFees();
    assert.ok(Math.abs(S.leverageTotalFees - 1) < 1e-12 && Math.abs(S.fees.totalFunding - 2.5) < 1e-12, 'l\'intérêt entre dans les DEUX compteurs (02) : ' + S.leverageTotalFees + ' / ' + S.fees.totalFunding);
    const p = need(C.s07, '_computeNetUsdParts'), line = p.split('\n').find(l => /^\s*const fundCum\s*=/.test(l));
    assert.ok(line, 'ligne fundCum'); const fc = vm.runInContext(line.replace(/^\s*const /, 'var ') + '\nfundCum', c); assert.ok(Math.abs(fc - 2.5) < 1e-12, 'fundCum ' + fc);
    const tile = C.s07.split('\n').find(l => /'Funding payé \(info\)',fmt\$2\(/.test(l)), arg = tile.slice(tile.indexOf("fmt$2(") + 6);
    let d = 0, k = 0; for (; k < arg.length; k++) { if (arg[k] === '(') d++; if (arg[k] === ')') { if (d === 0) break; d--; } }
    const tv = vm.runInContext(arg.slice(0, k), c); assert.ok(Math.abs(tv - 2.5) < 1e-12, 'tuile ' + tv);
  });

  await T('M1 (93) · VRAI 08 renderCorrMatrix (canvas témoin 480 px, 8 sièges 🧬 « Hybrid Gen-… ») : tout le texte DANS le canvas, lignes nommées « 1 Indices·Marché »…, diagonale « 1 »…« 8 », titre sous la grille', () => {
    const T8 = ['Indices·Marché', 'Futures·Levier', 'NLP·BERT-fin', 'NLP·BERT', 'Stat·OBV', 'Stat·GARCH', 'Stat·PCA', 'Multi·Horizon'];
    const agents = T8.map((t, i) => ({ id: 'a' + i, name: 'Hybrid Gen-9' + (5800 + i), type: t, emoji: '🧬', score: (i % 3 - 1) * 0.3, fitnessHistory: Array.from({ length: 20 }, (_, k) => Math.sin(k * (i + 1) / 3) * 100 + 300) }));
    agents.push({ id: 'b', isBot: true, name: 'Bot', type: 'x' });
    const texts = []; let tx = 0, W = 480;
    const ctx = { font: '', textAlign: '', textBaseline: '', fillStyle: '', scale() {}, translate(x) { tx += x; }, fillRect() {},
      measureText: (t) => ({ width: String(t).length * 6.6 }), fillText: (t, x, y) => texts.push({ t: String(t), x: x + tx, y }) };
    const canvas = { offsetWidth: W, width: 0, height: 0, style: {}, closest: () => null, getContext: () => ctx, parentElement: { offsetWidth: W } };
    const c = ctxOf({ S: { agents }, tick: 100, requestAnimationFrame() {}, document: { getElementById: (id) => (id === 'corrMatrixCanvas' ? canvas : null), createElement: () => canvas } });
    vm.runInContext('var _corrLastTick = -1;\n' + need(C.s08, 'renderCorrMatrix'), c);
    c.devicePixelRatio = 1; c.renderCorrMatrix();
    const H = parseFloat(canvas.style.height);
    const dehors = texts.filter(o => o.x < 0 || o.x > W || o.y < 0 || o.y > H);
    assert.deepStrictEqual(dehors.map(o => o.t + '@' + Math.round(o.x) + ',' + Math.round(o.y)), [], 'texte hors du canvas (' + W + ' × ' + H + ')');
    assert.ok(!texts.some(o => o.t === '🧬'), '🧬 sur la diagonale');
    T8.forEach((t, i) => assert.ok(texts.some(o => o.t.startsWith((i + 1) + ' ') && t.startsWith(o.t.replace(/^\d+ /, '').replace(/…$/, ''))), 'ligne ' + (i + 1) + ' ' + t));
    for (let i = 1; i <= 8; i++) assert.ok(texts.some(o => o.t === String(i)), 'diagonale ' + i);
    const ti = texts.find(o => o.t === 'ACCORD INTER-AGENTS'), y7 = texts.find(o => o.t === '7').y, y8 = texts.find(o => o.t === '8').y;
    assert.ok(ti && ti.y > y8 + (y8 - y7) / 2, 'titre sous la grille (bas de la grille ' + (y8 + (y8 - y7) / 2) + ', titre ' + (ti && ti.y) + ')');
  });

  await T('R1 (64) · VRAI 05 _outilsClosedTrades et VRAI 06 _tgHebdoText : une fermeture précédée de paliers compte les parts déjà fermées (brut g, sinon net) ; 05 closePartial garde le brut', () => {
    const t0 = Date.UTC(2026, 10, 14);
    const row = { type: 'position', side: 'buy', pnl: 10, pnlUsdt: 2, stakeUsdt: 20, ts: t0, paliers: [{ l: 'TP1', stake: 10, pnlUsdt: 0.9, g: 1.0, ts: t0 - 1 }, { l: 'TP2', stake: 5, pnlUsdt: 0.4, ts: t0 - 1 }] };
    const plain = { type: 'position', side: 'sell', pnl: -5, pnlUsdt: -1, stakeUsdt: 20, ts: t0 + 1 };
    const w = { running: true, portfolio: 1000, pairStates: { 'DOT/USDT': { trades: [row, plain] } } };
    const S = { pairStates: w.pairStates, walletStore: { paperReal: w } };
    const c = ctxOf({ S, _computePortfolio: (x) => x.portfolio, _TRADES_GARDES_PAR_PAIRE: 40 });
    vm.runInContext(need(C.s05, '_outilsClosedTrades') + '\nvar _TG_SEMAINE_MS = 7 * 86400000;\n' + need(C.s06, '_tgHebdoText'), c);
    const out = JSON.parse(JSON.stringify(c._outilsClosedTrades())), r = out.find(x => x.ts === t0), p = out.find(x => x.ts === t0 + 1);
    assert.ok(Math.abs(r.pnlUsdt - 3.4) < 1e-12, 'résultat : ligne 2 + TP1 brut 1,0 + TP2 net 0,4 → ' + r.pnlUsdt);
    assert.strictEqual(r.stakeUsdt, 35, 'mise : 20 + 10 + 5'); assert.ok(Math.abs(r.pnl - 3.4 / 35 * 100) < 1e-9, '%'); assert.strictEqual(r.paliersN, 2);
    assert.strictEqual(p.pnlUsdt, -1); assert.strictEqual(p.stakeUsdt, 20); assert.strictEqual(p.pnl, -5); assert.strictEqual(row.pnlUsdt, 2, 'historique jamais modifié');
    const txt = c._tgHebdoText(t0 + 3 * 86400000);
    assert.ok(/<b>EV<\/b>[^\n]*\n\s+2 trade\(s\) fermé\(s\) · 1 gagnant\(s\) · P&L brut <code>\+\$2\.40<\/code>/.test(txt), txt.split('\n').slice(0, 4).join(' | '));
    const cp = need(C.s05, 'closePartial');
    assert.ok(/grossPnl = _lt\.usd;/.test(cp) && /g: isFinite\(grossPnl\) \? grossPnl : undefined/.test(cp), '05 closePartial garde le brut');
  });

  await T('G · garde : fichiers de la décision identiques au commit ba8be3a ; dans 02, 07 et 10f seules les lignes de texte ont bougé', () => {
    const H = { 'js/09c-auto-open.js': 'cb981dcbb9806d73', 'js/09e-guards.js': '6d8ac3f2aafb9e39', 'js/09j-helpers.js': '469be1c86f4a9337', 'js/10a-base-analyse.js': '31a4ecb469243d0a',
      'js/10d-protections-indicateurs.js': '5df7acbcb09379ca', 'js/10e-helpers-adaptatifs.js': 'c79bbfdff68a816f', 'js/10e6-frais-slippage.js': '05c8eeac6085a3fc', 'js/12-bots-disciples.js': '22be243cac985f66',
      'js/15-voix-tendance.js': '9757929e4b295254', 'js/15b-tendance-reelle.js': '08582a20cd8f495a', 'js/10c-profil-ab-contexte.js': 'c6cbe6c8ff325aea', 'js/09d1-paper-real-core.js': '8053d970e74c8db6' };
    Object.keys(H).forEach(f => assert.strictEqual(h16(require('./banc-fixtures/sans-n80.js')(require('./banc-fixtures/sans-n108.js')(require('./banc-fixtures/sans-n109.js')(require('./banc-fixtures/sans-n94.js')(rd(f), f), f), f), f)), H[f], f + ' a changé'));   // [GO N° 80 · 15/11/2026] hors go n° 80 (15b : liquidation de la poche au prix de la liquidation, banc-n80.js) · [GO N° 108 · 15/11/2026] hors go n° 108 (15b : liquidation propre de l'EV relue sur les bougies 1 h, banc-fixtures/sans-n108.js)   // [GO N° 109 · 20/11/2026] hors go n° 109 (03 : note prouvée, banc-fixtures/sans-n109.js)
    const AV = { s02: sansA3(C.s02, F.s02), s07: sansA3(C.s07, F.s07), s10f: sansA3(C.s10f, F.s10f) };
    ['closePosition', 'estimateStakes', 'recordFees', 'applyFundingFees', 'applyLeverageBorrowFees', 'borrowLeverage', 'repayLeverage', '_computePortfolio', '_pnlBasis', 'syncLeverageReserve',
     '_tradingCapitalBase', '_isCloseRow'].forEach(n => assert.strictEqual(need(C.s02, n), need(AV.s02, n), '02 ' + n + ' a changé'));
    const hors = (s, re) => s.split('\n').filter(l => !re.test(l)).join('\n');
    assert.strictEqual(hors(need(C.s02, 'openPosition'), /const priceTag=/), hors(need(AV.s02, 'openPosition'), /const priceTag=/), '02 openPosition : autre chose que priceTag');
    assert.strictEqual(hors(need(C.s07, 'learnFromOpenPositions'), /S\.chainLog\.push\(\{ icon:'(🎯|💥|🛑)', desc:`(TP atteint|LIQUIDATION|SL déclenché)/),
      hors(need(AV.s07, 'learnFromOpenPositions'), /S\.chainLog\.push\(\{ icon:'(🎯|💥|🛑)', desc:`(TP atteint|LIQUIDATION|SL déclenché)/), '07 learnFromOpenPositions : autre chose que le journal');
    assert.strictEqual(hors(need(C.s10f, '_resolvePairCycleCore'), /^\s*const (pt|tt|st)=/), hors(need(AV.s10f, '_resolvePairCycleCore'), /^\s*const (pt|tt|st)=/), '10f : autre chose que la ligne de journal');
  });

  await T('C · appels : _closeRowUsd ← 05 _outilsClosedTrades, 06 _tgHebdoText ; _badgeWinRun ← badges de 05 ; pxTxt hors des fichiers de la décision', () => {
    const html = rd('AURA8_v118.html');
    const files = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(ROOT, f)));
    ['js/native-bridge.js', 'guardian-core.js', 'guardian-embed.js', 'aura-guardian.html'].forEach(f => { if (fs.existsSync(path.join(ROOT, f)) && !files.includes(f)) files.push(f); });
    const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
    const appelants = (re) => { const out = []; files.map(f => [f, rd(f)]).concat([['HTML (en ligne)', inline]]).forEach(([f, s]) => {
      const fns = [...s.matchAll(/\n(?:async )?function ([\w$]+)\s*\(/g)].map(m => [m.index, m[1]]);
      for (const m of s.matchAll(re)) { const line = s.slice(s.lastIndexOf('\n', m.index) + 1, s.indexOf('\n', m.index)); if (/^\s*\/\//.test(line)) continue;
        const before = fns.filter(x => x[0] < m.index).pop(); out.push(f + ':' + (before ? before[1] : '(haut du fichier)')); } }); return [...new Set(out)].sort(); };
    assert.deepStrictEqual(appelants(/_closeRowUsd\s*\(/g), ['js/02-state-init.js:_closeRowUsd', 'js/05-v37-19-indicateur-de-fatigue-bot.js:_outilsClosedTrades', 'js/06-v63-patterns-chartistes.js:_tgHebdoText'].sort());
    assert.deepStrictEqual(appelants(/_badgeWinRun\s*\(/g), ['js/05-v37-19-indicateur-de-fatigue-bot.js:_badgeWinRun', 'js/05-v37-19-indicateur-de-fatigue-bot.js:renderZenSection'].sort(),
      '_badgeWinRun : badges (la liste _BADGES suit renderZenSection dans le fichier) et elle-même');
    ['js/09c-auto-open.js', 'js/09e-guards.js', 'js/09j-helpers.js', 'js/15-voix-tendance.js', 'js/15b-tendance-reelle.js', 'js/10a-base-analyse.js', 'js/10d-protections-indicateurs.js', 'js/12-bots-disciples.js']
      .forEach(f => assert.ok(!/\bpx(Txt|In)\(/.test(rd(f)), f + ' lit pxTxt'));
  });

  await T('F · garde : banc-fixtures/affichage-3-retours.json redonne les 13 fichiers d\'avant au caractère près (empreintes du commit ba8be3a)', () => {
    if (process.env.BANC_ROOT) return;   // code d'avant : rien à retirer
    const A = { 'js/02-state-init.js': 'ca5e6a3064bdc63d', 'js/03-per-pair-position-buttons-controls-buid.js': '9c2ecc2cbdd73a08', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js': '61d3dedc2ac96e82',
      'js/05-v37-19-indicateur-de-fatigue-bot.js': '9d00d9013ca38fd1', 'js/06-v63-patterns-chartistes.js': '1736c53482f0c9b9', 'js/07-v90-mode-bunker-sos.js': '8c2e3319d78c3cad',
      'js/08-learning-history-render.js': '147126b2da90e4e1', 'js/09b3-import-export.js': '385a22f566231d6e', 'js/09g-modals.js': 'a8ed1afe73c57abe', 'js/10f-resolveur-cycle.js': '2c7f1bbbb66741a0',
      'js/11-gestion-paires.js': '337ff15799b77e72', 'js/16-fiscal.js': '45259077a3003f56', 'js/16b-fiscal-ecran.js': 'f560e7d8ba7c2670' };
    Object.keys(A).forEach(f => { const s = require('./banc-fixtures/sans-n109.js')(require('./banc-fixtures/sans-n94.js')(rd(f), f), f); assert.notStrictEqual(h16(s), A[f], f + ' : la retouche manque'); assert.strictEqual(h16(sansA3(require('./banc-fixtures/sans-n62.js')(require('./banc-fixtures/sans-n103.js')(require('./banc-fixtures/sans-n86d.js')(require('./banc-fixtures/sans-n105.js')(require('./banc-fixtures/sans-n106.js')(s, f), f), f), f), f), f)), A[f], f + ' : autre chose a bougé'); });   // [GO N° 105 · 15/11/2026] hors go n° 105 (08, 09b2 : bornes de l'école, banc-n105.js)   // [GO N° 86D · 15/11/2026] hors go n° 86d (03, 08 : champs de saisie TP / SL, banc-n86d.js)   // [GO N° 103 · 15/11/2026] hors go n° 103 (banc-n103.js)   // [GO N° 62 · 15/11/2026] hors la retouche de go n° 62 (07, banc-n62.js)   // [GO N° 106 · 15/11/2026] hors go n° 106 (08, 09b2 : amplitude de l'école, banc-n106.js)   // [GO N° 109 · 20/11/2026] hors go n° 109 (03 : note prouvée, banc-fixtures/sans-n109.js)
  });

  console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
  process.exitCode = fail ? 1 : 0;
})();
