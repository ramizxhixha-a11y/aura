// banc-manu.js — [MANU · 05/10/2026] VERSION 20261005a
// La fiche MAN et ses boutons, sur le CODE RÉEL (fonctions extraites des modules livrés, exécutées en vm) :
// ✕ / fond qui ferment, LONG et SHORT qui s'ouvrent dans n'importe quel sens avec des niveaux du BON côté, mise du bot intacte,
// avis contraires dits (plus de refus muet), garde-fou des consignes qui ferme vraiment, fermeture forcée vérifiée,
// fiche = décision commune + seuil appris + règle de sortie et de mise des bots (identité des formules avec 10f).
// Sonde de bout en bout (vraie app + backup du 04/10 21:04 dans Chromium) : voir PASSATION « GO MANU ».
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

// Extrait « function name(...) { ... } » (niveau 0) en sautant chaînes, gabarits ${…} et commentaires.
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); assert.ok(m, 'fonction absente : ' + name);
  const start = m.index + m[1].length;
  const st = [];   // 'b' accolade · 't' gabarit · 'x' expression ${ } d'un gabarit
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
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s09e = rd('js/09e-guards.js'),
  s09f2 = rd('js/09f2-bricks-man.js'), s10d = rd('js/10d-protections-indicateurs.js'), s10e = rd('js/10e-helpers-adaptatifs.js'),
  s10g = rd('js/10g-resolveur-ev-csv.js'), s10h = rd('js/10h-pont-fullpower-bricks.js'), s10f = rd('js/10f-resolveur-cycle.js');

// ── DOM minimal ──
function mkEl(id) {
  const cls = new Set();
  return { id: id || '', style: {}, dataset: {}, value: '', _h: '', className: '', children: [], textContent: '',
    get innerHTML() { return this._h; }, set innerHTML(v) { this._h = String(v); if (v === '') this.children = []; },
    classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) },
    appendChild(e) { this.children.push(e); if (e.id) DOM.els[e.id] = e; return e; } };
}
const DOM = { els: {} };
function mkDocument() {
  DOM.els = {};
  return { getElementById: id => DOM.els[id] || null, createElement: () => mkEl(), activeElement: null };
}
const PAIRS = { 'BTC/USDT': { sym: 'BTC', color: '#f7931a', dec: 0 }, 'ETH/USDT': { sym: 'ETH', color: '#627eea', dec: 0 }, 'SOL/USDT': { sym: 'SOL', color: '#9945ff', dec: 2 }, 'XRP/USDT': { sym: 'XRP', color: '#00aae4', dec: 4 } };
function baseS(over) {
  return Object.assign({
    tradingMode: 'paperReal', botAutoMode: false, tradingAccount: 1000, chainLog: [], agents: [], currentPage: 0, openPositions: [],
    pairStates: {
      'BTC/USDT': { price: 85368.87, stake: 0, pairLeverage: 1, trades: [], pnl24h: 0.66, _dc: { C: 0.0795, n: 10, ts: 0 } },
      'ETH/USDT': { price: 2702.19, stake: 0, pairLeverage: 1, trades: [], pnl24h: 0.1, _dc: { C: -0.2, n: 7, ts: 0 } },
      'SOL/USDT': { price: 121.63, stake: 0, pairLeverage: 1, trades: [], pnl24h: -0.2, _dc: { C: -0.09, n: 11, ts: 0 } },
      'XRP/USDT': { price: 1.5048, stake: 0, pairLeverage: 1, trades: [], pnl24h: 0, _dc: null, qYes: 60, qNo: 40 }
    }
  }, over || {});
}
// Contexte commun : vraies fonctions de 02 (openPosition, _manOpenWarnings), 03 (closePairDetail), 10e (_openManTrade), 10g (_saveManConsigne),
// 10h (fiche + aides), 09e (garde-fou), 10d (fermeture forcée). Le reste : doubles minimaux, comptés.
function mkCtx(opts) {
  opts = opts || {};
  const calls = { toast: [], close: [], intervals: [], cleared: [], openMan: 0 };
  const S = baseS(opts.S);
  const ctx = {
    S, PAIRS, Math, Number, Object, Array, String, JSON, Date, isFinite, parseFloat, parseInt, isNaN, Error, Set, console,
    document: mkDocument(),
    showToast: (m, d, l) => calls.toast.push({ m, l }),
    detectMarketRegime: () => opts.regime || 'bull',
    _checkContextAllowance: (p, s) => (opts.ctxRefuse && opts.ctxRefuse === s) ? { allow: false, signature: 'bull·night·mid' } : { allow: true },
    closePosition: opts.closePosition || function (id, botClose) { calls.close.push([id, botClose]); const pos = S.openPositions.find(p => p.id === id); if (!pos) return; if (botClose && pos.auto !== true) return; S.openPositions = S.openPositions.filter(p => p.id !== id); },
    borrowLeverage: () => 0, repayLeverage: () => {}, syncLeverageReserve: () => {}, _computePortfolio: () => S.tradingAccount,
    validateTotalExposure: () => (opts.capKO ? { ok: false, available: 0 } : { ok: true, available: 1e9 }), ensureLeverageCoverForTrade: () => ({ ok: true, borrowed: 0 }),
    fmt$: x => '$' + x, fmt$2: x => '$' + x, nowStr: () => '00:00', rndHash: () => 'h', lmsrP: ps => ps.qYes ? ps.qYes / (ps.qYes + ps.qNo) : 0.5,
    updatePairBtnStates: () => {}, renderPositions: () => {}, renderChain: () => {},
    getTechSignals: opts.tech === undefined ? (() => ({ raw: { stddev: { cv: 0.004 } }, signals: { a: { signal: 'bull' }, b: { signal: 'bull' }, c: { signal: 'bear' } } })) : opts.tech,
    _thLevel: () => (opts.th === undefined ? Infinity : opts.th), _thPick: () => null, _thHzLab: () => '1 h',
    _computeVolatilityScore: () => ({ score: 1, atrAbs: 85 }),
    setInterval: (fn, ms) => { calls.intervals.push(ms); return 7; }, clearInterval: id => calls.cleared.push(id),
    _drawSparkline: () => {}, _showForceCloseConfirm: () => {}
  };
  ctx.window = ctx; ctx.calls = calls;
  vm.createContext(ctx);
  vm.runInContext('let _currentDetailPair = null; let _pendingClosePair = null;', ctx);
  const src = [fnSrc(s02, '_livePairs'),   // [PAIRES VIVANTES · 10/10/2026] 10h _manPlan compte les emplacements sur les paires vivantes (02)
    fnSrc(s02, '_manOpenWarnings'), fnSrc(s02, '_manConsigneOf'), fnSrc(s02, 'openPosition'),   // [CONSIGNES · 06/10/2026] openPosition lit _manConsigneOf
    fnSrc(s03, 'closePairDetail'), fnSrc(s10e, '_openManTrade'),
    fnSrc(s10g, '_saveManConsigne'), fnSrc(s09e, '_manConsignesWatchdog'), fnSrc(s10d, '_confirmForceClose'),
    fnSrc(s10h, '_manFmtPx'), fnSrc(s10h, '_manPlan'), fnSrc(s10h, '_manSideLevels'), fnSrc(s10h, '_manSystemHtml'), fnSrc(s10h, '_manPreviewHtml'),
    fnSrc(s10h, '_manWarnHtml'), fnSrc(s10h, '_manPreview'), fnSrc(s10h, '_manRefreshTick'), fnSrc(s10h, 'openManDetail'), fnSrc(s09f2, 'updateManBricks')].join('\n');
  const reg = s10h.match(/\nconst _MAN_REG = [^\n]+\n/); assert.ok(reg, '_MAN_REG');
  vm.runInContext(reg[0] + 'let _manRefreshT = null;\n' + src + '\nfunction _cancelForceClose(){ _pendingClosePair = null; const o = document.getElementById("closeConfirmOverlay"); if (o) o.classList.remove("open"); }', ctx);
  // la fiche MAN de la page (AURA8_v118.html) : overlay + titre + corps ; le volet du bas (03)
  ['pairDetailOverlay', 'pairDetailTitle', 'pairDetailBody', 'pairDetailSheet', 'pairDetailBackdrop', 'closeConfirmOverlay'].forEach(id => { DOM.els[id] = mkEl(id); });
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);
const fieldsOf = (ctx, pair, v) => { const k = pair.replace('/', '_'); Object.entries(v).forEach(([f, val]) => { const el = mkEl('manIn_' + f + '_' + k); el.value = String(val); DOM.els[el.id] = el; }); };

console.log('▶ banc-manu');

T('F1 · ✕ et fond : closePairDetail ferme la fiche MAN (#pairDetailOverlay) ET le volet du bas', () => {
  const ctx = mkCtx(); run(ctx, 'openManDetail("BTC/USDT")');
  assert.ok(DOM.els.pairDetailOverlay.classList.contains('open'), 'fiche ouverte');
  run(ctx, 'closePairDetail()');
  assert.strictEqual(DOM.els.pairDetailOverlay.classList.contains('open'), false, 'fiche fermée');
  assert.strictEqual(DOM.els.pairDetailSheet.style.transform, 'translateY(105%)');
  const html = rd('AURA8_v118.html');
  assert.ok(html.includes('id="pairDetailOverlay" onclick="if(event.target===this){if(typeof closePairDetail===\'function\')closePairDetail();}"'), 'fond → closePairDetail');
  assert.ok(html.includes('<div class="pair-detail-close" onclick="if(typeof closePairDetail===\'function\')closePairDetail()">✕</div>'), '✕ → closePairDetail');
});

T('O1 · plus de refus muet : SHORT en régime haussier / LONG en baissier / contexte perdant s\'OUVRENT, l\'avis est dit (toast + journal)', () => {
  let ctx = mkCtx({ regime: 'bull' });
  const pos = run(ctx, 'openPosition("ETH/USDT","short")');
  assert.ok(pos && pos.side === 'short' && pos.auto === false, 'position ouverte et rendue');
  assert.ok(ctx.calls.toast.some(t => t.m === '⚠ ETH/USDT SHORT ouvert contre le régime haussier' && t.l === 'warn'), JSON.stringify(ctx.calls.toast));
  assert.ok(ctx.S.chainLog.some(c => c.desc === 'Ouverture manuelle ETH/USDT SHORT · contre le régime haussier · ouverte à ta demande'));
  ctx = mkCtx({ regime: 'volatile_bear', ctxRefuse: 'long' });
  assert.ok(run(ctx, 'openPosition("BTC/USDT","long")'), 'LONG en baissier ouvert');
  assert.ok(ctx.calls.toast.some(t => t.m === '⚠ BTC/USDT LONG ouvert contre le régime baissier · contexte perdant (bull·night·mid)'));
  ctx = mkCtx({ regime: 'bull' });
  assert.ok(run(ctx, 'openPosition("BTC/USDT","long")'), 'dans le sens du régime');
  assert.strictEqual(ctx.calls.toast.filter(t => t.l === 'warn').length, 0, 'aucun avis quand rien ne s\'y oppose');
  ctx = mkCtx({ regime: 'bull', S: { tradingMode: 'sim' } });
  assert.ok(run(ctx, 'openPosition("ETH/USDT","short")')); assert.deepStrictEqual(Array.from(run(ctx, '_manOpenWarnings("ETH/USDT","short")')), [], 'avis EV seulement (comme les refus d\'avant)');
  ctx = mkCtx({ capKO: true });
  assert.strictEqual(run(ctx, 'openPosition("BTC/USDT","long")'), null, 'refus capital : null');
  assert.ok(ctx.calls.toast.some(t => /Capital max atteint/.test(t.m)), 'raison dite');
  // les trois refus muets d'avant ont disparu de openPosition
  const op = codeStrict(fnSrc(s02, 'openPosition'));
  assert.strictEqual(/return;\s*\n/.test(op), false, 'aucun « return; » muet dans openPosition');
});

T('M1 · bouton LONG quand la fiche suggère SHORT : TP AU-DESSUS de l\'entrée, SL dessous ; la position tient ; ps.stake / levier rendus ; fiche fermée', () => {
  const ctx = mkCtx(); run(ctx, 'openManDetail("ETH/USDT")');   // décision commune −0,20 → SHORT suggéré
  const k = 'ETH_USDT';
  const b0 = DOM.els.pairDetailBody.children.map(c => c.innerHTML).join('\n');
  assert.ok(b0.includes('id="manIn_tpp_' + k + '"') && b0.includes('id="manIn_slp_' + k + '"') && b0.includes("TP (% depuis l'entrée)"), 'champs TP / SL en %');
  ctx.S.pairStates['ETH/USDT'].stake = 7; ctx.S.pairStates['ETH/USDT'].pairLeverage = 3;
  fieldsOf(ctx, 'ETH/USDT', { stake: 75.4, lev: 1, tpp: 0.6, slp: 0.45 });
  const pos = run(ctx, '_openManTrade("ETH/USDT","long")');
  assert.ok(pos && pos.side === 'long');
  assert.ok(Math.abs(pos.tp - 2702.19 * 1.006) < 1e-6 && Math.abs(pos.sl - 2702.19 * 0.9955) < 1e-6, 'tp ' + pos.tp + ' sl ' + pos.sl);
  assert.ok(pos.tp > pos.entryPrice && pos.sl < pos.entryPrice, 'du bon côté');
  assert.strictEqual(pos.stakeUsdt, 75.4);
  assert.strictEqual(ctx.S.pairStates['ETH/USDT'].stake, 7, 'mise du bot rendue'); assert.strictEqual(ctx.S.pairStates['ETH/USDT'].pairLeverage, 3, 'levier rendu');
  assert.strictEqual(DOM.els.pairDetailOverlay.classList.contains('open'), false, 'fiche fermée');
  assert.strictEqual(pos._manMaxLossPct, 2); assert.strictEqual(pos._manTimeoutMin, 60);
  assert.ok(ctx.calls.toast.some(t => t.m === '🎛️ ETH/USDT LONG ouvert · $75.4 · TP $2,718 · SL $2,690'), JSON.stringify(ctx.calls.toast));
  // SHORT : niveaux inversés ; SOL (dec 2) : plus d'arrondi au dollar
  const ctx2 = mkCtx(); run(ctx2, 'openManDetail("SOL/USDT")'); fieldsOf(ctx2, 'SOL/USDT', { stake: 60, lev: 1, tpp: 1.5, slp: 0.45 });
  const p2 = run(ctx2, '_openManTrade("SOL/USDT","short")');
  assert.ok(p2.tp < p2.entryPrice && p2.sl > p2.entryPrice);
  assert.ok(Math.abs(p2.tp - 121.63 * 0.985) < 1e-9, 'TP édité à la main appliqué : ' + p2.tp);
  assert.strictEqual(run(ctx2, '_manFmtPx("SOL/USDT", 119.80555)'), '119.81');
});

T('M2 · rien ne s\'ouvre → rien n\'est annoncé comme ouvert ; mise et levier rendus', () => {
  const ctx = mkCtx({ capKO: true }); run(ctx, 'openManDetail("BTC/USDT")'); fieldsOf(ctx, 'BTC/USDT', { stake: 80, lev: 2, tpp: 0.7, slp: 0.5 });
  assert.strictEqual(run(ctx, '_openManTrade("BTC/USDT","long")'), null);
  assert.ok(ctx.calls.toast.some(t => t.m === '⚠ BTC/USDT LONG non ouvert'));
  assert.strictEqual(ctx.calls.toast.some(t => /ouvert ·/.test(t.m)), false);
  assert.strictEqual(ctx.S.pairStates['BTC/USDT'].stake, 0); assert.strictEqual(ctx.S.pairStates['BTC/USDT'].pairLeverage, 1);
  assert.strictEqual(ctx.S.chainLog.some(c => /Trade MANUEL/.test(c.desc)), false);
});

T('P1 · fiche = décision commune (pas le LMSR seul), seuil appris et verdict, ATR réel, avis contraires AVANT le clic, rafraîchie', () => {
  const ctx = mkCtx({ th: 0.3 }); ctx.S.pairStates['ETH/USDT']._dc.ts = Date.now() - 120000;
  run(ctx, 'openManDetail("ETH/USDT")');
  const sys = DOM.els.manSys_ETH_USDT.innerHTML;
  assert.ok(/↓ SHORT/.test(sys) && /20 %/.test(sys) && /7 voix · il y a 2 min/.test(sys), sys.replace(/\s+/g, ' ').slice(0, 400));
  assert.ok(/30 %/.test(sys) && /Sous le seuil appris : les bots n'ouvriraient pas/.test(sys));
  assert.ok(/3\.15 %/.test(sys), 'ATR = atrAbs / prix');
  const body = DOM.els.pairDetailBody.children.map(c => c.innerHTML).join('\n');
  assert.ok(/↓ SHORT<span id="manStar_short_ETH_USDT"[^>]*> ★ système<\/span>/.test(body) && /↑ LONG<span id="manStar_long_ETH_USDT"[^>]*><\/span>/.test(body), 'le sens du système est marqué');
  assert.ok(body.includes('⚠ SHORT : contre le régime haussier'), 'avis contraire affiché avant le clic');
  assert.strictEqual(/TP \(\$\)|SL \(\$\)|Suggestion bot en temps réel|Conviction LMSR/.test(body), false, 'plus de libellés trompeurs');
  assert.deepStrictEqual(ctx.calls.intervals, [2000], 'bloc système rafraîchi toutes les 2 s');
  // rafraîchi : nouvelle décision commune → bloc, champs non modifiés et ★ suivent
  ['long', 'short'].forEach(sd => { const e = mkEl('manStar_' + sd + '_ETH_USDT'); DOM.els[e.id] = e; });
  fieldsOf(ctx, 'ETH/USDT', { tpp: 0.6, slp: 0.45 }); DOM.els.manIn_slp_ETH_USDT.dataset.edited = '1';
  ctx.S.pairStates['ETH/USDT']._dc = { C: 0.5, n: 9, ts: Date.now() };
  run(ctx, '_manRefreshTick("ETH/USDT", false)');
  assert.ok(/↑ LONG/.test(DOM.els.manSys_ETH_USDT.innerHTML) && /50 %/.test(DOM.els.manSys_ETH_USDT.innerHTML));
  assert.strictEqual(DOM.els.manStar_long_ETH_USDT.textContent, ' ★ système'); assert.strictEqual(DOM.els.manStar_short_ETH_USDT.textContent, '');
  assert.strictEqual(DOM.els.manIn_tpp_ETH_USDT.value, run(ctx, '_manPlan("ETH/USDT").lv.long.tp.toFixed(2)'), 'champ non modifié : suit le système');
  assert.strictEqual(DOM.els.manIn_slp_ETH_USDT.value, '0.45', 'champ modifié à la main : jamais écrasé');
  // le rafraîchissement s'arrête quand la fiche est fermée
  run(ctx, 'closePairDetail(); _manRefreshTick("ETH/USDT", false)');
  assert.deepStrictEqual(ctx.calls.cleared.length, 1);
  // marché fermé / au-dessus du seuil / sans décision commune
  const c2 = mkCtx({ th: Infinity }); run(c2, 'openManDetail("BTC/USDT")');
  assert.ok(/marché fermé/.test(DOM.els.manSys_BTC_USDT.innerHTML) && /les bots n'ouvrent pas/.test(DOM.els.manSys_BTC_USDT.innerHTML));
  const c3 = mkCtx({ th: 0.05 }); run(c3, 'openManDetail("BTC/USDT")');
  assert.ok(/✓ Au-dessus du seuil appris : les bots ouvriraient LONG/.test(DOM.els.manSys_BTC_USDT.innerHTML), 'C 0,08 + 2 signaux haussiers × 0,04 ≥ 0,05');
  const c4 = mkCtx(); run(c4, 'openManDetail("XRP/USDT")');
  assert.ok(/LMSR seul — décision commune pas encore calculée/.test(DOM.els.manSys_XRP_USDT.innerHTML) && /↑ LONG/.test(DOM.els.manSys_XRP_USDT.innerHTML));
});

T('P2 · formules identiques à 10f : TP / SL (tpPctE, _slNoise, slPctE, bonus technique) et part du capital libre (_stkBase)', () => {
  const ctx = mkCtx(); const pl = run(ctx, '_manPlan("ETH/USDT")');
  const lTp = fs.readFileSync(path.join(ROOT, 'js/10f-resolveur-cycle.js'), 'utf8');
  const tpLine = lTp.match(/\n\s*const tpPctE=([^;]+);/), noise = lTp.match(/\n\s*const _slNoise = ([^;]+);/), slLine = lTp.match(/\n\s*const slPctE\s+= ([^;]+);/);
  assert.ok(tpLine && noise && slLine, 'lignes de 10f introuvables : formule changée → resynchroniser 10h _manPlan');
  const f10 = (effectiveConviction, volCV) => vm.runInNewContext('const tp=' + tpLine[1] + '; const _slNoise=' + noise[1] + '; ({tp, sl:' + slLine[1].replace(/tpPctE/g, 'tp') + '})', { Math, effectiveConviction, volCV });
  // bonus technique de 10f : +0,04 par signal du sens, borné 0,25
  assert.ok(s10f.includes("Object.values(tech.signals||{}).forEach(s => { if(s?.signal === dir) techBonus += 0.04; });") && s10f.includes('techBonus = Math.min(0.25, techBonus);'));
  const eL = f10(Math.min(1, 0.2 + 0.08), 0.004), eS = f10(Math.min(1, 0.2 + 0.04), 0.004);
  assert.ok(Math.abs(pl.lv.long.tp - eL.tp) < 1e-12 && Math.abs(pl.lv.long.sl - eL.sl) < 1e-12, JSON.stringify([pl.lv.long, eL]));
  assert.ok(Math.abs(pl.lv.short.tp - eS.tp) < 1e-12 && Math.abs(pl.lv.short.sl - eS.sl) < 1e-12, JSON.stringify([pl.lv.short, eS]));
  const big = f10(0.9, 0.02); const c2 = mkCtx({ tech: () => ({ raw: { stddev: { cv: 0.02 } }, signals: {} }) }); c2.S.pairStates['BTC/USDT']._dc.C = 0.9;
  const p2 = run(c2, '_manPlan("BTC/USDT")'); assert.ok(Math.abs(p2.lv.long.tp - big.tp) < 1e-12 && Math.abs(p2.lv.short.sl - big.sl) < 1e-12);
  // mise : bloc _stkBase de 10f exécuté sur le même état
  const blk = s10f.slice(s10f.indexOf('    var _acc   = S.tradingAccount || 0;'), s10f.indexOf('    _stkBase = Math.max(_floor, _share);') + '    _stkBase = Math.max(_floor, _share);'.length);
  assert.ok(blk.length > 100 && blk.length < 1300, 'bloc _stkBase de 10f');   // [PAIRES VIVANTES · 10/10/2026] 900 → 1 300 : deux lignes de commentaire dans le bloc
  assert.ok(blk.includes('var _slots = _livePairs().filter(') && s10h.includes('const slots = _livePairs().filter('), 'emplacements = paires vivantes, des deux côtés (10f et 10h)');
  const st = baseS(); st.openPositions = [{ pair: 'SOL/USDT', stakeUsdt: 100 }];
  const ref = vm.runInNewContext(fnSrc(s02, '_livePairs') + '\nvar _stkBase;' + blk + '; _stkBase', { S: st, ps: st.pairStates['ETH/USDT'], PAIRS, Math, Object, Number });   // [PAIRES VIVANTES · 10/10/2026] le bloc de 10f lit 02 _livePairs
  const c3 = mkCtx({ S: { openPositions: [{ pair: 'SOL/USDT', stakeUsdt: 100 }] } });
  assert.strictEqual(run(c3, '_manPlan("ETH/USDT").stake'), Math.floor(ref * 10) / 10, 'mise = part libre des bots : ' + ref);
});

T('W1 · garde-fou des consignes : ferme VRAIMENT (closePosition(id, false)), « fermé » seulement si fermé, aucune consigne inventée', () => {
  const ctx = mkCtx(); const old = Date.now() - 2 * 3600e3;
  ctx.S.openPositions = [
    { id: 'm1', pair: 'ETH/USDT', side: 'short', auto: false, pnlUsdt: 0, _manOpenedAt: old, _manTimeoutMin: 60, _manMaxLossPct: 2 },
    { id: 'm2', pair: 'BTC/USDT', side: 'long', auto: false, pnlUsdt: -50, openedAt: old },          // hors fiche : pas de consignes
    { id: 'b1', pair: 'SOL/USDT', side: 'long', auto: true, pnlUsdt: -90, openedAt: old, _manTimeoutMin: 1 }];
  run(ctx, '_manConsignesWatchdog()');
  assert.deepStrictEqual(ctx.calls.close, [['m1', false]]);
  assert.deepStrictEqual(ctx.S.openPositions.map(p => p.id), ['m2', 'b1']);
  assert.ok(ctx.S.chainLog.some(c => c.desc === 'Garde-fou MAN · ETH/USDT SHORT fermé · Timeout atteint (120min ≥ 60min)'));
  // perte max en % du capital
  ctx.S.openPositions.push({ id: 'm3', pair: 'XRP/USDT', side: 'long', auto: false, pnlUsdt: -25, _manOpenedAt: Date.now(), _manTimeoutMin: 60, _manMaxLossPct: 2 });
  run(ctx, '_manConsignesWatchdog()'); assert.ok(!ctx.S.openPositions.some(p => p.id === 'm3'));
  assert.ok(ctx.S.chainLog.some(c => c.desc === 'Garde-fou MAN · XRP/USDT LONG fermé · Perte max dépassée (2.5% ≥ 2%)'));
  // fermeture qui n'aboutit pas : rien d'annoncé, dit une fois, 1 essai / 60 s
  const c2 = mkCtx({ closePosition: function () { c2.calls.close.push([].slice.call(arguments)); } });
  c2.S.openPositions = [{ id: 'm1', pair: 'ETH/USDT', side: 'short', auto: false, pnlUsdt: 0, _manOpenedAt: old, _manTimeoutMin: 60 }];
  run(c2, '_manConsignesWatchdog(); _manConsignesWatchdog();');
  assert.strictEqual(c2.calls.close.length, 1, 'un essai par minute');
  assert.strictEqual(c2.S.chainLog.some(c => / fermé · /.test(c.desc)), false, 'jamais « fermé » sans fermeture');
  assert.strictEqual(c2.S.chainLog.filter(c => /fermeture NON aboutie \(essai 1\)/.test(c.desc)).length, 1);
  assert.strictEqual(codeStrict(fnSrc(s09e, '_manConsignesWatchdog')).includes('closePosition(pos.id, true)'), false);
});

T('W2 · consignes de la fiche d\'une position : ce sont les siennes, les modifier s\'applique à elle', () => {
  const ctx = mkCtx();
  ctx.S.openPositions = [{ id: 'm1', pair: 'ETH/USDT', side: 'long', auto: false, entryPrice: 2700, tp: 2720, sl: 2690, stakeUsdt: 50, _manMaxLossPct: 3, _manTimeoutMin: 90 }];
  run(ctx, 'openManDetail("ETH/USDT")');
  const body = DOM.els.pairDetailBody.children.map(c => c.innerHTML).join('\n');
  assert.ok(/id="manCon_tout_ETH_USDT" value="90"/.test(body) && /id="manCon_loss_ETH_USDT" value="3"/.test(body));
  assert.ok(body.includes('Position active') && body.includes('$2,720') && body.includes('$2,690'), 'TP / SL de la position affichés');
  run(ctx, '_saveManConsigne("ETH/USDT","timeoutMin","240")');
  assert.strictEqual(ctx.S.openPositions[0]._manTimeoutMin, 240);
  // position manuelle sans consignes (ouverte avant go consignes, 06/10 — depuis, toute ouverture en porte) : dit, et un geste l'équipe
  ctx.S.openPositions = [{ id: 'm2', pair: 'BTC/USDT', side: 'long', auto: false, entryPrice: 85000, stakeUsdt: 50 }];
  run(ctx, 'openManDetail("BTC/USDT")');
  assert.ok(DOM.els.pairDetailBody.children.map(c => c.innerHTML).join('\n').includes('Position ouverte avant la mise à jour des consignes : aucune consigne ne la surveille encore'));
  run(ctx, '_saveManConsigne("BTC/USDT","maxLossPct","1.5")'); assert.strictEqual(ctx.S.openPositions[0]._manMaxLossPct, 1.5);
});

T('C1 · fermeture forcée : « fermée » seulement si la position a disparu ; la fiche ouverte est redessinée', () => {
  let ctx = mkCtx(); ctx.S.openPositions = [{ id: 'm1', pair: 'ETH/USDT', side: 'long', auto: false, pnlUsdt: 0, stakeUsdt: 50, entryPrice: 2700 }];
  run(ctx, 'openManDetail("ETH/USDT"); _pendingClosePair = "ETH/USDT"; _confirmForceClose();');
  assert.strictEqual(ctx.S.openPositions.length, 0);
  assert.ok(ctx.calls.toast.some(t => t.m === '✕ ETH/USDT LONG fermée') && ctx.S.chainLog.some(c => /fermée manuellement/.test(c.desc)));
  assert.ok(/🧠 Le système/.test(DOM.els.pairDetailBody.children.map(c => c.innerHTML).join('')) && !/Position active/.test(DOM.els.pairDetailBody.children.map(c => c.innerHTML).join('')), 'fiche redessinée sans la position');
  ctx = mkCtx({ closePosition: () => {} }); ctx.S.openPositions = [{ id: 'm1', pair: 'ETH/USDT', side: 'long', auto: false, pnlUsdt: 0 }];
  run(ctx, '_pendingClosePair = "ETH/USDT"; _confirmForceClose();');
  assert.ok(ctx.calls.toast.some(t => t.m === '⚠ ETH/USDT : fermeture non aboutie'));
  assert.strictEqual(ctx.S.chainLog.some(c => /fermée manuellement/.test(c.desc)), false);
});

T('B1 · briques MAN : même lecture que la fiche (décision commune, même mise), plus de seuils 0,55 / 0,45 posés à la main', () => {
  const ctx = mkCtx();
  ['BTC/USDT', 'ETH/USDT'].forEach(p => { const k = p.replace('/', '_'); ['manbrick_', 'mbpx_', 'mbsug_', 'mbpnl_', 'mbbadge_'].forEach(x => { DOM.els[x + k] = mkEl(x + k); }); });
  ctx.PAIRS = { 'BTC/USDT': PAIRS['BTC/USDT'], 'ETH/USDT': PAIRS['ETH/USDT'] }; run(ctx, 'PAIRS = window.PAIRS');
  run(ctx, 'updateManBricks()');
  const st = run(ctx, '_manPlan("ETH/USDT", true).stake');
  assert.ok(DOM.els.mbsug_ETH_USDT.innerHTML.includes('↓ SHORT</span> · mise $' + st.toFixed(0)), DOM.els.mbsug_ETH_USDT.innerHTML);
  assert.ok(DOM.els.mbsug_BTC_USDT.innerHTML.includes('↑ LONG'), 'C +0,08 → LONG (le LMSR seul aurait dit HOLD)');
  assert.ok(DOM.els.mbpnl_ETH_USDT.innerHTML.includes('Force 20% · commune'));
  assert.ok(codeStrict(fnSrc(s09f2, 'updateManBricks')).includes("_manPlan(pair, true)"), 'la brique lit _manPlan');
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
process.exit(fail ? 1 : 0);
