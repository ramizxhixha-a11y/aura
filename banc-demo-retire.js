// banc-demo-retire.js — [GO DÉMO · 12/10/2026] VERSION 20261012a
// « go démo » (Rams, 12/10 22:51 : « on l'enlève complètement, le mode démo ne sert à rien » ; 23:05 : « oui » pour le Multi-compte).
// Le 11/10 à 18:33, la carte « Gestion de Crise » du Mode Démo (05, v51) a remplacé le compte EV de Rams (1 085,46 $, 342 trades) par 880,20 $ et
// 47 trades : elle écrivait dans le vrai état, et la sauvegarde de sortie (09b2) n'avait pas la garde de la sauvegarde périodique. Sonde du 12/10 : le
// bouton « + Nouveau compte » du Multi-compte (05, v50) remettait de même le compte affiché à 1 000 $, sans confirmation ni retour.
// Ce banc tient :
//   R · le RETRAIT : plus aucun texte du Mode Démo ni du Multi-compte dans ce que la page charge ; le panneau Outils n'appelle que des rendus qui existent ;
//       plus de régime forcé, plus de garde de sauvegarde à contourner.
// [GO NETTOYAGE · 18/10/2026] (ETAT G4 n° 22) la partie D (la RÉPARATION, js/18-reparation-demo.js, rejouée contre le témoin
// banc-fixtures/mode-demo-retire-20261012.js) est retirée avec le module, ses mutations et ses deux sondes : aucun des 3 portefeuilles ne porte plus
// l'empreinte (backup du 18/10 21:37, vraie fonction trace du module en vm — banc-nettoyage-mort.js). Avant : D1 à D12 ici, rejeu/demo_mutations.js,
// rejeu/sonde_demo.js, rejeu/sonde_demo_vie.js.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 60)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 60)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 60)); return s.slice(i, incl ? j + b.length : j); };
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
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
const html = rd('AURA8_v118.html'), TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const scripts = [...html.matchAll(/<script[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]), csss = [...html.matchAll(/<link[^>]*\bhref="([^"?]+\.css)(?:\?[^"]*)?"/g)].map(m => m[1]);
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'), s10c = rd('js/10c-profil-ab-contexte.js');
// [GO NETTOYAGE · 18/10/2026] (ETAT G4 n° 22) partie D retirée avec le module 18 — avant : F18 / s18 (le module), le monde d'essai (accesseurs, recalage,
// rotation, jugement, journal) et les tests D1 à D12. Le témoin reste lu par R1 (les mots cherchés existent bien dans le texte retiré).
const TEMOIN = rd('banc-fixtures/mode-demo-retire-20261012.js');
const J = o => JSON.parse(JSON.stringify(o));
console.log('▶ banc-demo-retire · token ' + TOK);
// ═══════════════ R · le retrait ═══════════════
T('R1 · plus AUCUN texte du Mode Démo ni du Multi-compte dans ce que la page charge (' + scripts.length + ' scripts, ' + csss.length + ' css, le HTML) — commentaires à part ; le témoin du banc n\'est pas chargé', () => {
  const MOTS = ['enterDemoMode', 'exitDemoMode', '_DEMO_PRESETS', 'renderDemoSection', '_demoMode', '_demoActive', '_demoBackup', '_demoSaveWarned', '_regimeOverride', 'demoBanner', 'demoSection', 'demo-preset', 'demoShimmer',
    'switchAccount', 'createAccount', 'renameAccount', 'deleteAccount', '_mcSaveCurrent', '_mcLoadSlots', '_mcSaveSlots', '_mcStripHeavy', '_MC_KEY', '_MC_EMOJIS', '_MC_LIGHT_FIELDS', 'renderMultiCompteSection', 'multiCompteSection', '_mcActiveSlot', 'aura_mc_slots', 'mc-add-btn', 'mc-account', 'mc-chip'];
  assert.ok(scripts.length >= 57 && csss.length >= 29);   // [GO NETTOYAGE · 18/10/2026] 57 : js/18-reparation-demo.js retiré — avant : >= 58
  scripts.forEach(f => { const c = codeStrict(rd(f)); MOTS.forEach(m => assert.ok(!c.includes(m), f + ' : reste « ' + m + ' »')); });
  csss.forEach(f => { const c = rd(f).replace(/\/\*[\s\S]*?\*\//g, ''); MOTS.concat(['.mc-', '.demo-', '#demoBanner']).forEach(m => assert.ok(!c.includes(m), f + ' : reste « ' + m + ' »')); });
  MOTS.forEach(m => assert.ok(!html.includes(m), 'HTML : reste « ' + m + ' »'));
  assert.ok(!scripts.some(f => f.includes('banc-fixtures')) && TEMOIN.includes('function enterDemoMode(presetKey) {') && TEMOIN.includes('crise: {'), 'le témoin garde le texte, hors de la page');
});
T('R2 · panneau Outils (07 _OUTILS_TABS RÉEL) : l\'onglet UI n\'a plus ni « Mode Démo » ni « Multi-compte » (16 sections) ; dans TOUS les onglets, chaque section appelle un rendu qui existe dans un script chargé', () => {
  const tabs = vm.runInNewContext('(' + between(s07, 'const _OUTILS_TABS = ', '\n};', false).replace('const _OUTILS_TABS = ', '') + '\n})');
  const ui = J(tabs.ui.sections.map(s => s.id));
  assert.deepStrictEqual(ui, ['nightModeSection', 'zenSection', 'badgesSection', 'avatarSection', 'cinemaSection', 'vacancesSection', 'compactWidgetSection', 'soundSection', 'citationSection', 'dashPublicSection', 'fundManagerSection', 'widgetSection', 'pipSection', 'aodSection', 'gsSection', 'apiSection']);
  const tout = scripts.map(f => rd(f)).join('\n'); let n = 0;
  const existe = f => new RegExp('(^|\\n)\\s*(async )?function ' + f + '\\s*\\(').test(tout) || tout.includes('window.' + f + ' = ');
  const absents = [];
  Object.keys(tabs).forEach(k => tabs[k].sections.forEach(s => { n++; [s.render, s.init].forEach(f => { if (f && !existe(f)) absents.push(k + ' · ' + s.id + ' → ' + f); }); assert.ok(s.render || s.init, 'section sans rendu ni init : ' + s.id); }));
  assert.deepStrictEqual(absents, [], 'section(s) du panneau Outils qui appellent une fonction absente : ' + absents.join(' ; '));
  assert.ok(n >= 60, n + ' sections');
});
T('R3 · detectMarketRegime RÉEL (02) : plus de régime forcé — S._regimeOverride posé ne change rien ; la fonction ne lit plus que le marché', () => {
  const src = fnSrc(s02, 'detectMarketRegime'); assert.ok(!codeStrict(src).includes('_regimeOverride'));
  const mk = v => ({ price: 100, pnl24h: v, candles: Array.from({ length: 20 }, (_, i) => ({ o: 100, h: 100, l: 100, c: 100 * (1 + 0.0001 * (i % 3)), v: 1 })) });
  const S = { pairStates: { A: mk(0.2), B: mk(0.3) } }, c = { S, Math, Object, Number, isFinite, isNaN, _livePairStates: () => Object.values(S.pairStates) }; vm.createContext(c); vm.runInContext(src, c);
  const r0 = vm.runInContext('detectMarketRegime()', c); assert.strictEqual(r0, 'calm');
  ['bear', 'bull', 'volatile'].forEach(f => { S._regimeOverride = f; assert.strictEqual(vm.runInContext('detectMarketRegime()', c), 'calm', 'forcé « ' + f + ' » : ignoré'); });
  delete S._regimeOverride; S.pairStates.A.pnl24h = -9; S.pairStates.B.pnl24h = -9; assert.strictEqual(vm.runInContext('detectMarketRegime()', c), 'bear', 'le marché, lui, se lit toujours');
});
T('R4 · sauvegarde (09b2) : saveState n\'a plus de garde de démo à contourner, _flushSyncOnExit non plus (plus rien à suspendre) ; _LIGHT_KEYS sans « _mcActiveSlot » ; 09b1 n\'écrit ni l\'un ni l\'autre', () => {
  const sv = codeStrict(fnSrc(s9b2, 'saveState')), fl = codeStrict(fnSrc(s9b2, '_flushSyncOnExit'));
  [sv, fl, codeStrict(s9b1)].forEach(c => ['_demoMode', 'Démo', 'démo', '_mcActiveSlot'].forEach(m => assert.ok(!c.includes(m), 'reste « ' + m + ' »')));
  assert.ok(sv.includes("if (typeof window !== 'undefined' && window._stateReady === false) {") && sv.includes('snap = buildSnapshot();') && fl.includes('const snap = buildSnapshot();'));
  const lk = between(s9b2, 'const _LIGHT_KEYS = [', '];', true); assert.ok(lk.includes("'tradingMode','botAutoMode',") && !codeStrict(lk).includes('_mc'));
  assert.strictEqual((lk.match(/\]/g) || []).length, 1, 'aucun crochet DANS la liste, même en commentaire : banc-p0b-newskey la lit jusqu\'au premier « ] » (revue du 13/10)');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
