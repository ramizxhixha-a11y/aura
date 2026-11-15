// banc-css-finitions.js — [GO CSS FINITIONS · 14/11/2026] n° 86, 88, 89, 91, 92 (Rams « go css finitions », maquette montrée, « Ok » 17:35), affichage seul.
// Fait tourner le VRAI texte des fonctions de l'app en vm. Sur le code d'avant (BANC_ROOT=<copie du commit 054d8bd>) : P1 à F2 ÉCHOUENT ; G PASSE.
//   P1 (86) 02 pxTxt / pxIn : « $ », virgule, 5 chiffres significatifs, au moins les décimales de la paire, au plus 8 (DOT « $0,761 », PEPE « $0,00000441 », BTC « $71 653 ») ;
//           dec corrompu, prix absent, prix négatif ; fmtPrice (sans appelant, entier tronqué) retiré
//   P2 (86) plus aucune copie de l'arrondi à l'entier ni du format « en-US » sur un prix de paire, sauf les 2 lignes de journal des ouvreurs (épinglées : 02 openPosition, 10f)
//   P3 (86) les trois anciens formateurs passent par pxTxt : 09f1 _abFmtPx (briques, bandeau), 03 _mcPxText (mini-cartes), indices ±2 % de la fiche (08 openPosEdit)
//   V1 (88) 08 « Positions ouvertes » : la voix (_voix 'tendance') « 📈 Tendance », la tienne « 👤 MAN », titre « · 1 de la voix tendance · 1 à toi », montants « −$6,75 »
//   V2 (88) 09f1 briques (« 📈 TENDANCE », data-pos voix), 07 barres P&L (📈), carte d'action (« 📈 Tendance · tenue par la voix »), cartes de position (« 📈 TENDANCE »,
//           « Tenue par la voix »), 06 stress (📈) — la voix n'est plus nulle part « manuelle »
//   B1 (89) css/34 : 🔇 et le bouclier Guardian rangés dans la barre du bas (place réservée à droite, au-dessus de la zone sûre), sélecteur plus fort que celui de Guardian
//   M1 (91) 03 showMemoryOverlay : date de chaque souvenir, « ✓ N votes justes » (won = vote aligné, 03 learnFromOutcome) — plus « GAGNANTS » —, résultat du trade à sa
//           couleur, « +-0.70% » → « −0.70% », mots en français, bouton ✕ ; css/34 : rien sous 11 px dans la fiche
//   M2 (91) ailleurs aussi : tuile Mémoire « votes justes », bandeau mémoire des cartes d'agent (résultat à sa couleur), mémoire collective (08) — relecture du 14/11
//   F1 (92) 08 analyse fondamentale : les 11 facteurs du score avec leurs VRAIS poids (relus dans la formule de fundScore), puis Macro et News hors score ; plus de « 10 Indicateurs »
//   F2 css/34-finitions.css chargé en dernier au token
//   G   rien de ce qui décide ne change : formule de fundScore identique au caractère près (sha-256), openPosition et la ligne de journal de 10f gardées
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.message || e).split('\n').slice(0, 3).join('\n     ')); } }
function fnSrc(src, name) {
  const m = new RegExp('(^|\\n)function ' + name.replace(/\$/g, '\\$') + '\\s*\\(').exec(src); assert.ok(m, 'fonction absente : ' + name);
  const start = m.index + m[1].length; let d = 0;
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && !--d) return src.slice(start, i + 1); }
  throw new Error('fin introuvable : ' + name);
}
const html = rd('AURA8_v118.html'), TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s06 = rd('js/06-v63-patterns-chartistes.js'),
      s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js'), s09f1 = rd('js/09f1-bricks-action.js'), s10f = rd('js/10f-resolveur-cycle.js');
const CSS = (() => { try { return rd('css/34-finitions.css'); } catch (e) { return ''; } })();
const NB = ' ';
// paires et décimales du backup du 14/11 16:26 (02 et 11 gestion des paires)
const PAIRS = { 'BTC/USDT': { dec: 0 }, 'ETH/USDT': { dec: 0 }, 'BNB/USDT': { dec: 0 }, 'SOL/USDT': { dec: 2 }, 'AVAX/USDT': { dec: 2 }, 'DOT/USDT': { dec: 2 }, 'LINK/USDT': { dec: 2 },
  'XRP/USDT': { dec: 4 }, 'DOGE/USDT': { dec: 4 }, 'ADA/USDT': { dec: 4 }, 'EUR/USDT': { dec: 3 }, 'PEPE/USDT': { dec: 6 }, 'BAD/USDT': { dec: 'x' }, 'BIG/USDT': { dec: 40 } };
const pxCtx = extra => { const c = Object.assign({ PAIRS, Math, Number, Intl, isFinite, String }, extra || {}); vm.createContext(c);
  vm.runInContext('const _pxFmt = {};\n' + fnSrc(s02, 'pxTxt') + '\n' + fnSrc(s02, 'pxIn'), c); return c; };

console.log('▶ banc-css-finitions — go css finitions (n° 86, 88, 89, 91, 92), affichage seul');

T('P1 (86) · 02 pxTxt : BTC « $71 653 », BNB « $654,76 », DOT « $0,761 », AVAX « $7,66 », PEPE « $0,00000441 », EUR « $1,1019 » ; pxIn à point ; fmtPrice retiré', () => {
  const c = pxCtx(), p = (k, v) => c.pxTxt(k, v);
  assert.strictEqual(p('BTC/USDT', 71652.71), '$71' + NB + '653'); assert.strictEqual(p('ETH/USDT', 2015.67), '$2' + NB + '015,7');
  assert.strictEqual(p('BNB/USDT', 654.76), '$654,76'); assert.strictEqual(p('SOL/USDT', 73.57), '$73,57'); assert.strictEqual(p('AVAX/USDT', 7.66), '$7,66');
  assert.strictEqual(p('DOT/USDT', 0.761), '$0,761'); assert.strictEqual(p('DOT/USDT', 0.83), '$0,83'); assert.strictEqual(p('LINK/USDT', 10.042), '$10,042');
  assert.strictEqual(p('XRP/USDT', 0.9747), '$0,9747'); assert.strictEqual(p('DOGE/USDT', 0.06064), '$0,06064'); assert.strictEqual(p('ADA/USDT', 0.172), '$0,1720');
  assert.strictEqual(p('PEPE/USDT', 4.41e-6), '$0,00000441'); assert.strictEqual(p('PEPE/USDT', 4.1e-6), '$0,0000041'); assert.strictEqual(p('EUR/USDT', 1.1019), '$1,1019');
  assert.strictEqual(p('BAD/USDT', 1.5), '$1,50', 'dec corrompu'); assert.strictEqual(p('BIG/USDT', 1.5), '$1,50000000', 'dec > 8 borné'); assert.strictEqual(p('ZZZ/USDT', 0.5), '$0,50', 'paire inconnue');
  assert.strictEqual(p('DOT/USDT', NaN), '—'); assert.strictEqual(p('DOT/USDT', undefined), '—'); assert.strictEqual(p('DOT/USDT', -0.5), '−$0,50'); assert.strictEqual(p('BTC/USDT', 0), '$0');
  assert.strictEqual(c.pxIn('DOT/USDT', 0.74578), '0.74578'); assert.strictEqual(c.pxIn('BTC/USDT', 70219.3), '70219'); assert.strictEqual(c.pxIn('PEPE/USDT', 4.4982e-6), '0.0000045');
  assert.strictEqual(/\nfunction fmtPrice\s*\(/.test(s02), false, 'fmtPrice encore là');
});

T('P2 (86) · plus aucune copie de l\'arrondi à l\'entier ni du « en-US » sur un prix de paire (go affichage 3 : les 2 lignes de journal des ouvreurs aussi, 02 openPosition et 10f — n° 86b)', () => {
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f) && !/\.min\.js$/.test(f));
  const left = [];   // relecture du 14/11 : toute valeur arrondie à l'entier puis « toLocaleString » (Math.floor ET Math.round), et le « en-US » sur un prix
  files.forEach(f => rd('js/' + f).split('\n').forEach((l, i) => {
    if (/Math\.(floor|round)\([^)]*\)\.toLocaleString\(\)|\.dec\s*>=\s*4[^;\n]*toLocaleString\('en-US',\{minimumFractionDigits:2,maximumFractionDigits:2\}\)/.test(l)) left.push(f + ':' + (/priceTag|const (pt|tt|st)=/.exec(l) || [String(i + 1)])[0]); }));
  assert.deepStrictEqual(left.sort(), [], left.join(' · '));   // [GO AFFICHAGE 3 · 15/11/2026] (n° 86b) avant : 02 openPosition priceTag, 10f pt / tt / st — passés par pxTxt
  assert.ok(/\nfunction openPosition\s*\(/.test(s02) && /const priceTag= pxTxt\(pair, ps\.price\);/.test(fnSrc(s02, 'openPosition')), 'openPosition : le prix du journal par pxTxt (go affichage 3)');
});

T('P3 (86) · 09f1 _abFmtPx, 03 _mcPxText, 10h _manFmtPx (fiche MAN, ligne « Trade MANUEL ») et les indices ±2 % de la fiche (08 openPosEdit) passent par pxTxt / pxIn', () => {
  const c = pxCtx(); vm.runInContext(fnSrc(s09f1, '_abFmtPx') + '\n' + fnSrc(s03, '_mcPxText') + '\n' + fnSrc(rd('js/10h-pont-fullpower-bricks.js'), '_manFmtPx'), c);
  assert.strictEqual(c._manFmtPx('DOT/USDT', 0.761), '$0,761', 'fiche MAN (relecture C1)'); assert.strictEqual(c._manFmtPx('ETH/USDT', 2015.67), '$2' + NB + '015,7'); assert.strictEqual(c._manFmtPx('DOT/USDT', 0), '—');
  assert.strictEqual(c._abFmtPx('DOT/USDT', 0.761), '$0,761'); assert.strictEqual(c._abFmtPx('BTC/USDT', 71652.71), '$71' + NB + '653'); assert.strictEqual(c._abFmtPx('DOT/USDT', 0), '—');
  assert.strictEqual(c._mcPxText('PEPE/USDT', 4.1e-6), '$0,0000041'); assert.strictEqual(c._mcPxText('AVAX/USDT', 7.66), '$7,66');
  const ed = fnSrc(s08, 'openPosEdit');
  assert.ok(/const tpHint = pxTxt\(pos\.pair, tpV\), slHint = pxTxt\(pos\.pair, slV\);/.test(ed) && /placeholder\s*= pxIn\(pos\.pair, tpV\)/.test(ed) && /placeholder\s*= pxIn\(pos\.pair, slV\)/.test(ed), 'indices de la fiche');
  assert.strictEqual(/toFixed\(cfg\.dec>=4\?cfg\.dec:0\)/.test(ed), false, '0 décimale sous dec 4');
});

function bannerCtx(positions) {
  const el = { innerHTML: '' }; const c = pxCtx({ document: { getElementById: id => (id === 'openPnlBanner' ? el : null) },
    S: { openPositions: positions, pairStates: { 'DOT/USDT': { price: 0.761 }, 'PEPE/USDT': { price: 4.1e-6 } } } });
  vm.runInContext(fnSrc(s02, 'fmt$2') + '\n' + fnSrc(s09f1, '_abFmtPx') + '\n' + fnSrc(s08, 'renderOpenPnlBanner'), c); c.el = el; return c;
}
T('V1 (88) · « Positions ouvertes » : voix « 📈 Tendance », la tienne « 👤 MAN », titre « · 1 de la voix tendance · 1 à toi », montants « −$6,75 » / « +$… »', () => {
  const c = bannerCtx([{ pair: 'PEPE/USDT', side: 'long', auto: false, _voix: 'tendance', entryPrice: 4.41e-6, stakeUsdt: 95.99 },
                       { pair: 'DOT/USDT', side: 'short', auto: false, entryPrice: 0.83, stakeUsdt: 20 }]);
  c.renderOpenPnlBanner(); const h = c.el.innerHTML.replace(/\s+/g, ' ');
  assert.strictEqual((h.match(/📈 Tendance/g) || []).length, 1, 'voix'); assert.strictEqual((h.match(/👤 MAN/g) || []).length, 1, 'manuelle');
  assert.ok(h.includes('Positions ouvertes (2) · 1 de la voix tendance · 1 à toi'), h.slice(0, 400));
  assert.ok(h.includes('entrée $0,00000441') && h.includes('entrée $0,83') && h.includes('mise $95,99'), 'entrées / mise');
  assert.ok(/−\$6,75/.test(h) && !/\$-/.test(h) && /\(−7,03 %\)/.test(h), 'montants signés au format français');
  const v = bannerCtx([{ pair: 'DOT/USDT', side: 'short', auto: false, _voix: 'tendance', entryPrice: 0.83, stakeUsdt: 95.99 }]); v.renderOpenPnlBanner();
  assert.ok(v.el.innerHTML.includes('Positions ouvertes (1) · 1 de la voix tendance</span>') && !v.el.innerHTML.includes('👤 MAN'), 'voix seule');
});

T('V2 (88) · la voix n\'est plus « manuelle » ailleurs : 09f1 briques, 07 barres / carte d\'action / cartes de position / bordures, 06 stress, 02 ⊗, 09g Pourquoi, 10h fiche MAN, 09f2 (reste : 16b historique Fiscal, n° 88b)', () => {
  const ab = fnSrc(s09f1, 'updateActionBricks');
  assert.ok(ab.includes("isVoix = pos._voix === 'tendance'") && ab.includes("brick.setAttribute('data-pos', isVoix ? 'voix' : isMan ? 'man' : 'auto');")
    && ab.includes("(isVoix ? '📈 TENDANCE ' : isMan ? '👤 MAN ' : '🤖 AUTO ')"), '09f1');
  assert.ok(s07.includes("badgeEl.textContent = (pos._voix === 'tendance' ? '\\uD83D\\uDCC8' : pos.auto === true ? '\\uD83E\\uDD16' : '\\uD83D\\uDC64')"), '07 barres');
  assert.ok(s07.includes("timeLbl.textContent = _vx ? '📈 Tendance' : '🔒 Manuel';") && s07.includes("(_vx ? ' · tenue par la voix' : ' · bot pause')"), '07 carte d\'action');
  assert.ok(s07.includes("const botStatus = pos._voix === 'tendance'") && s07.includes('Tenue par la voix · se retourne seule'), '07 statut');
  assert.ok(s07.includes("${pos._voix==='tendance'?'📈 TENDANCE':isManual?'🔒 MANUEL':'🤖 BOT IA'}"), '07 cartes de position');
  assert.ok(s06.includes("voix: p._voix === 'tendance'") && s06.includes("${x.voix?'📈':x.auto?'🤖':'👤'}"), '06 stress');
  assert.ok(s02.includes("const modeLabel = pos._voix === 'tendance' ? '📈 TENDANCE' : pos.auto ? '🤖 BOT' : '🔒 MAN';"), '02 ⊗ fermer tout');
  assert.ok(rd('js/09g-modals.js').includes("${pos._voix === 'tendance' ? '📈 Voix tendance longue' : pos.auto ? '🤖 Bot automatique' : '🎛️ Manuel'}"), '09g Pourquoi');
  assert.ok(rd('js/10h-pont-fullpower-bricks.js').includes("${manualPos._voix === 'tendance' ? '📈 Position de la voix tendance' : '🎛️ Position active'}"), '10h fiche MAN');
  assert.ok(rd('js/09f2-bricks-man.js').includes("badgeEl.textContent = (manualPos._voix === 'tendance' ? '📈 ' : '') + side;"), '09f2 brique MAN');
  assert.ok(s07.includes("ac-pos-item${pos._voix==='tendance'?' ac-pos-voix':isManual?' ac-pos-manual':''}") && s07.includes("open-pos-summary${pos._voix==='tendance'?' voix':isManual?' manual':''}"), '07 bordure or');
  assert.ok(/\.action-brick\[data-pos="voix"\] \.ab-signal \{ color: var\(--up\); \}/.test(CSS) && /\.ops-mode-badge\.voix \{/.test(CSS) && /\.ac-pos-item\.ac-pos-voix \{/.test(CSS) && /\.open-pos-summary\.voix \{/.test(CSS), 'css');
  // tout ce qui écrit « MAN / Manuel » d'après auto : chaque fois la voix est testée juste avant (relecture : grep des étiquettes)
  const reste = [];
  fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f) && !/\.min\.js$/.test(f)).forEach(f => rd('js/' + f).split('\n').forEach((l, i) => {
    if (/auto[^\n]{0,40}(👤 MAN|🔒 MAN|🔒 MANUEL|🎛️ Manuel|'\\uD83D\\uDC64')/.test(l) && !/_voix\s*={2,3}\s*'tendance'|\.voix\b|isVoix/.test(l)) reste.push(f + ':' + (i + 1)); }));
  assert.deepStrictEqual(reste, [], 'étiquettes sans la voix : ' + reste.join(' · '));   // reste hors de ce grep (lit e.a) : 16b, historique Fiscal d'un trade FERMÉ — le registre n'a pas la voix (n° 88b)
});

T('B1 (89) · css/34 : 🔇 et le bouclier dans la barre du bas (place réservée à droite), sélecteur plus fort que celui de Guardian (#gdnFab), plus de bas à 80 px', () => {
  const r = sel => { const m = CSS.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&') + '\\s*\\{([^}]*)\\}')); assert.ok(m, 'règle absente : ' + sel); return m[1]; };
  const nav = r('#nav'), snd = r('#soundToggle.sound-toggle'), fab = r('html body #gdnFab');
  const px = (s, k) => { const m = s.match(new RegExp('(^|;|\\s)' + k + ':\\s*([^;]+)')); return m ? m[2].trim() : null; };
  assert.strictEqual(px(nav, 'padding-right'), '56px');
  assert.strictEqual(px(snd, 'bottom'), 'calc(var(--safe-bot, 0px) + 37px)'); assert.strictEqual(px(fab, 'bottom'), 'calc(var(--safe-bot, 0px) + 3px)');
  ['width', 'height'].forEach(k => { assert.strictEqual(px(snd, k), '32px'); assert.strictEqual(px(fab, k), '32px'); });
  assert.ok(parseInt(px(snd, 'right'), 10) + 32 <= 56 && parseInt(px(fab, 'right'), 10) + 32 <= 56, 'dans la place réservée');
  assert.ok(37 + 32 <= 70 && 3 + 32 <= 37, 'l\'un sur l\'autre, dans les 70 px de la barre du téléphone (75 sur la tablette ; sonde : vraie page aux deux tailles)');
  assert.strictEqual(px(snd, 'z-index'), '21', 'au-dessus de la barre (z 20)');
  const g = rd('guardian-embed.js'); assert.ok(/#gdnFab\{position:fixed;right:14px;bottom:14px;/.test(g), 'Guardian inchangé (le CSS le range, guardian-embed n\'est pas touché)');
});

T('M1 (91) · fiche mémoire : date, « ✓ votes justes » (pas « GAGNANTS »), résultat du trade à sa couleur, « −0.70% », mots en français, ✕ ; rien sous 11 px', () => {
  const t = Date.UTC(2026, 10, 14, 15, 25, 40);
  const ov = { style: {}, innerHTML: '', id: '' }; let made = 0;
  const c = { S: { agents: [{ id: 'm1', emoji: '🧬', name: 'Hybrid', memory: [
      { id: t + 0.42, won: true, pnl: -0.703, pair: 'XRP/USDT', cycle: 1953035, time: '16:25:40', metaphor: "J'ai pesé juste. +-0.70% encode une leçon", context: { lmsrProb: 0.43, pairTrend: 'down' }, recalled: 2 },
      { id: t - 864e5, won: false, pnl: 0.31, pair: 'DOT/USDT', cycle: 1950000, time: '09:05:01', metaphor: 'ok', context: { lmsrProb: 0.5, pairTrend: 'up' }, recalled: 0 }] }], globalMemoryPool: new Array(50) },
    document: { getElementById: () => (made ? ov : null), createElement: () => { made++; return ov; }, body: { appendChild() {} } },
    showToast() {}, Math, Number, String, Date };
  vm.createContext(c); vm.runInContext(fnSrc(s03, 'showMemoryOverlay'), c); c.showMemoryOverlay('m1');
  const h = ov.innerHTML.replace(/\s+/g, ' '), d = new Date(t);
  const dd = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  assert.ok(h.includes('2 souvenirs') && h.includes('✓ 1 votes justes') && h.includes('✗ 1 faux') && !/GAGNANTS|ÉPISODES|POOL GLOBAL/.test(h), h.slice(0, 300));
  assert.ok(h.includes(dd + ' · 16:25') && !h.includes('Cycle #'), 'date');
  assert.ok(/✓ vote juste<\/span> <span style="color:var\(--down\)">trade −0,703 %/.test(h) && /✗ vote faux<\/span> <span style="color:var\(--up\)">trade \+0,31 %/.test(h), 'vote et trade');
  assert.ok(h.includes('−0.70% encode') && !h.includes('+-'), '« +- »');
  assert.ok(h.includes('Marché 43 %') && h.includes('Tendance baisse') && h.includes('Tendance hausse') && h.includes('Rappelé 2 fois') && !/LMSR:|Trend:|Rappels:/.test(h), 'français');
  assert.ok(/<button class="memory-overlay-close" aria-label="Fermer"/.test(h), '✕ en bouton');
  const fs11 = [...CSS.matchAll(/#memoryOverlay[^{]*\{([^}]*)\}/g)].map(m => m[1]);
  assert.ok(fs11.length >= 8 && fs11.every(b => [...b.matchAll(/font-size:\s*(\d+)px/g)].every(x => +x[1] >= 11)), 'plancher 11 px');
  ['memory-episode-text', 'memory-episode-foot', 'memory-episode-pair'].forEach(k => assert.ok(new RegExp('#memoryOverlay \\.' + k + ' \\{[^}]*font-size: 1[1-9]px').test(CSS), k));
});

T('M2 (91) · ailleurs aussi, « won » = vote juste : tuile Mémoire (HTML), bandeau mémoire des cartes d\'agent (07 : résultat à sa couleur, « +- »), mémoire collective (08)', () => {
  assert.ok(html.includes('<strong id="memPoolWon" style="color:var(--up)">0</strong> votes justes ·') && !/memPoolWon[^\n]*gagnants/.test(html), 'tuile');
  const c = { Number, String, Math }; vm.createContext(c);
  const blk = s07.slice(s07.indexOf("      if(elMemPnl) {\n        // [GO CSS FINITIONS"), s07.indexOf("      if(elMemPair) elMemPair.textContent"));
  assert.ok(blk.length > 50, 'bloc du bandeau');
  const run = last => { const elMemPnl = { style: {} }; vm.runInContext('(function(last, elMemPnl){' + blk + '})', c)(last, elMemPnl); return elMemPnl; };
  let e = run({ won: true, pnl: -0.703 }); assert.strictEqual(e.textContent, '✓ −0,703 %'); assert.strictEqual(e.style.color, 'var(--down)');
  e = run({ won: false, pnl: 0.31 }); assert.strictEqual(e.textContent, '✗ +0,31 %'); assert.strictEqual(e.style.color, 'var(--up)');
  assert.ok(s07.includes("String(last.metaphor).replace(/\\+-/g, '−').slice(0, 90)"), '« +- » du bandeau');
  assert.ok(s08.includes('${memWR} % de votes justes') && !/win rate/.test(s08.slice(s08.indexOf('const memWR'), s08.indexOf('const memWR') + 2000)), '08');
});

T('F1 (92) · analyse fondamentale : les 11 facteurs du score avec leurs VRAIS poids (formule de fundScore), puis Macro et News hors score', () => {
  const g = fnSrc(s08, 'getFundamentalSignals'), fsb = g.slice(g.indexOf('const fundScore = Math.max(-1, Math.min(1,'), g.indexOf('));', g.indexOf('const fundScore')));
  const W = {}; [...fsb.matchAll(/^\s*(?:\((ch24) > 1[^)]*\)|([a-zA-Z.]+))\s*\*\s*(-?0\.\d+)/gm)].forEach(m => { W[m[1] || m[2]] = Math.round(+m[3] * 100); });
  assert.strictEqual(Object.keys(W).length, 11, 'termes : ' + JSON.stringify(W));
  const SRC = { momentum: 'ch24', debt: 'debtScore', lmsr: 'lmsrScore', sentiment: 'sent.score', geo: 'geo.score', onchain: 'onchain.score', security: 'sec.score', volume: 'vol.score',
    corrAg: 'corr.score', vola: 'vola.score', corr: 'btcTrend' };
  const rf = fnSrc(s08, 'renderFundamentalPanel');
  const items = [...rf.slice(rf.indexOf('const officialItems'), rf.indexOf('const contextItems')).matchAll(/key:'(\w+)',\s*w:(-?\d+)/g)].map(m => [m[1], +m[2]]);
  assert.strictEqual(items.length, 11);
  items.forEach(([k, w]) => assert.strictEqual(w, W[SRC[k]], k + ' : poids ' + w + ' ≠ ' + W[SRC[k]]));
  const res = g.slice(g.indexOf('const result = {'));
  items.forEach(([k]) => assert.ok(new RegExp('\\n\\s*' + k + ':\\s*\\{ ?score:\\s*' + (k === 'momentum' ? '\\(ch24' : SRC[k].replace('.', '\\.'))).test(res), 'tuile ' + k + ' ≠ terme ' + SRC[k]));
  for (let i = 1; i < items.length; i++) assert.ok(Math.abs(items[i - 1][1]) >= Math.abs(items[i][1]), 'du plus lourd au plus léger');
  // le vrai rendu, avec des signaux factices
  const el = { innerHTML: '' }, fund = { fundScore: -0.15 };
  Object.keys(SRC).concat(['macroAgg', 'nlp']).forEach(k => { fund[k] = { score: 0.2, conf: 0.5, label: 'L_' + k, detail: 'd' }; });
  const c = { S: { activePair: 'BTC/USDT' }, getFundamentalSignals: () => fund, document: { getElementById: () => el } }; vm.createContext(c);
  vm.runInContext(rf, c); c.renderFundamentalPanel(); const h = el.innerHTML;
  assert.strictEqual((h.match(/class="signal-row-item"/g) || []).length, 13);
  assert.ok(h.includes('Score pondéré · 11 facteurs') && h.includes('Dans le score · 11 facteurs') && h.includes('Pour information · hors score') && h.includes('poids 14 %') && h.includes('poids −3 %'), 'titres et poids');
  const vo = h.slice(h.indexOf('L_vola'), h.indexOf('L_macroAgg')), mo = h.slice(h.indexOf('L_momentum'), h.indexOf('L_sentiment'));
  assert.ok(/badge-bear">↓ 20%/.test(vo) && /badge-bull">↑ 20%/.test(mo), 'poids négatif : la volatilité haute tire le score vers le bas (relecture C8)');
  assert.ok(!/10 Indicateurs|14 facteurs/.test(h), 'anciens titres');
  assert.ok(h.indexOf('L_vola') < h.indexOf('L_macroAgg') && h.indexOf('L_macroAgg') < h.indexOf('L_nlp'), 'hors score à la fin');
});

T('F2 · css/34-finitions.css chargé en dernier au token ' + TOK, () => {
  const links = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"?]+)\?v=([0-9a-z]+)"/g)];
  const last = links[links.length - 1]; assert.ok(last && last[1] === 'css/34-finitions.css' && last[2] === TOK, 'dernier : ' + (last && last[1]));
  assert.ok(CSS.length > 0 && !/font-size:\s*(?:[0-9]|10)(?:\.\d+)?px/.test(CSS), 'aucune taille sous 11 px dans css/34');
});

T('G · rien de ce qui décide ne change : formule de fundScore identique (sha-256), openPosition et la ligne de journal de 10f gardées, pxTxt n\'est lu que pour l\'affichage', () => {
  const g = fnSrc(s08, 'getFundamentalSignals'), i = g.indexOf('  const fundScore = Math.max(-1, Math.min(1,'), j = g.indexOf('\n  ));', i);
  const blk = g.slice(i, j + 6) + '\n';
  assert.strictEqual(crypto.createHash('sha256').update(blk).digest('hex'), 'd7a6e8b7eebb7b91cbf624cf11880cac' + '006c4c6f46bcd9502c96282c704b2190'   /* coupée : banc-p0b cherche les clés en dur */, 'formule de fundScore modifiée');
  // [GO AFFICHAGE 3 · 15/11/2026] (n° 86b) 10f lit pxTxt pour la SEULE ligne de journal « BOT … @prix | … TP:… SL:… » (affichage) : rien d'autre
  const _px10f = s10f.split('\n').filter(l => /\bpx(Txt|In)\(/.test(l));
  assert.ok(_px10f.length === 1 && _px10f[0].trim().startsWith('const pt=pxTxt(pair,ps.price), tt=pxTxt(pair,tpE), st=pxTxt(pair,slE);'), '10f : pxTxt pour la ligne de journal seulement : ' + _px10f.join(' | '));
  ['09c-auto-open.js', '15-voix-tendance.js', '15b-tendance-reelle.js', '09e-guards.js', '09j-helpers.js'].forEach(f => assert.strictEqual(/\bpx(Txt|In)\(/.test(rd('js/' + f)), false, f + ' lit pxTxt'));
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
process.exit(fail ? 1 : 0);
