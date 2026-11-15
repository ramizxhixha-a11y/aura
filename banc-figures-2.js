// banc-figures-2.js — [GO FIGURES 2 · 14/11/2026] la décision ne lit plus AUCUNE figure (Rams 14/11 19:31 « Go figure 2 », n° 74 du registre).
// Avant : 08 getTechSignals ajoutait la meilleure figure d'avant (06 _detectPatterns, clôtures seules) comme un signal (signals.pattern, poids = sa
// confiance) : elle parlait sur ~95 % des bougies, surtout un faux « Double Top / Bottom », sans talent. Retirée sur le verdict de rejeu/porte_figures_2.js.
// Ce banc fait tourner le VRAI texte de getTechSignals (08, avec ses indicateurs et les génomes de 03 / 02, extraits comme rejeu/talent.js) en vm
// et ÉCHOUE sur le code d'avant (BANC_ROOT=<copie du commit 7f7233a>), sauf G5 et R (gardes) :
//   G1 deux séries où l'ancienne lecture voit sa figure (faux Double Bottom ; Breakout haussier) : getTechSignals ne pose QUE les 10 indicateurs
//      (mm, mme, stoch, macd, boll, rsi, fib, ichi, sigma, adx — aucune autre clé, quel que soit son nom), et atScore = leur score pondéré
//   G2 getTechSignals ne cite plus aucune figure (ni _detectPatterns, ni _detectCandlePatterns)
//   G3 aucun script de l'app (HTML, scripts en ligne, native-bridge, Guardian) ne pose ni ne lit signals.pattern ; _detectPatterns n'a plus d'appelant ;
//      _detectCandlePatterns n'est appelée que par l'écran (06 renderPatternSection)
//   G4 l'écran « Patterns chartistes », rendu en vm (vrai texte de 06), affiche que la décision ne lit aucune figure
//   G5 (garde) _detectPatterns est gardée telle quelle pour les rejeux qui la mesurent (rejeu/talent.js --figures 1)
//   R  (garde) les règles de la porte n'ont pas bougé (sha-256 des 36 premières lignes de rejeu/porte_figures_2.js)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n     ')); } }
function between(s, a, b, incl) {
  const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error('ancre : ' + a.slice(0, 60));
  const j = s.indexOf(b, i + a.length); if (j < 0) throw new Error('ancre fin : ' + b.slice(0, 60));
  return s.slice(i, incl ? j + b.length : j);
}
const fnAt = (s, a) => between(s, a, '\n}\n', true);
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s06 = rd('js/06-v63-patterns-chartistes.js');
const s08 = rd('js/08-learning-history-render.js');
const GTS = fnAt(s08, 'function getTechSignals(pair) {').replace(/\/\/.*$/gm, '');   // le code de getTechSignals, sans ses commentaires

// le monde : le vrai texte (mêmes extraits que rejeu/talent.js), un génome de départ, aucun réseau
function monde(candles) {
  const CODE = [
    between(s02, 'const REAL_CANDLE_INTERVALS = {', '\n};', true),
    between(s02, 'var RC_HOLE_WIN = ', 'window._realCandlesStale = _realCandlesStale;', false),
    fnAt(s02, 'function _getActiveRealTimeframe() {'),
    between(s03, 'const GENOME_DEFAULTS = {', '// Archive la version courante (fitness de pointe atteinte)', false),
    between(s03, 'const PAIR_GENOME_DEFAULTS = {', '// Archive la version courante avec le P&L net', false),
    fnAt(s06, 'function _detectPatterns(prices) {'), fnAt(s06, 'function _ptClosedSeries(candles) {'), fnAt(s06, 'function _detectCandlePatterns(candles) {'),
    between(s08, 'function _closes(candles){', '\nconst _fundCache = {};', false)
  ].join('\n;\n');
  const S = { pairStates: { 'BTC/USDT': { candles, price: candles[candles.length - 1].c } }, realCandles: {}, tradingMode: 'paperReal', paperRealTimeframe: '15m', genome: {}, pairGenome: null };
  const c = { S, window: {}, Date, Math, JSON, Number, String, Array, Object, isFinite, isNaN, parseFloat, parseInt, console, PAIRS: { 'BTC/USDT': {} } };
  vm.createContext(c); require('./banc-fixtures/px-vm.js')(c, ROOT);   /* [GO AFFICHAGE 3 · 15/11/2026] aides d'affichage de 02 (pxTxt, _closeRowUsd : banc-fixtures/px-vm.js) */ vm.runInContext(CODE, c);
  return c;
}
// séries de 60 bougies 15 min (déterministes)
function vague() { const a = []; let p = 100; for (let i = 0; i < 60; i++) { const o = p; p = 100 + Math.sin(i / 3) * 0.4; a.push({ ts: i * 900000, o, h: Math.max(o, p) + 0.1, l: Math.min(o, p) - 0.1, c: p, v: 1 }); } return a; }
function montee() { const a = []; let p = 100; for (let i = 0; i < 60; i++) { const o = p; p = 100 * Math.pow(1.03, i); a.push({ ts: i * 900000, o, h: Math.max(o, p) * 1.001, l: Math.min(o, p) * 0.999, c: p, v: 1 }); } return a; }
const pondere = sig => { let s = 0, w = 0; Object.values(sig).forEach(x => { if (!x) return; s += (x.signal === 'bull' ? 1 : x.signal === 'bear' ? -1 : 0) * (x.weight || 1); w += x.weight || 1; }); return w > 0 ? s / w : 0; };

const INDIC = ['adx', 'boll', 'fib', 'ichi', 'macd', 'mm', 'mme', 'rsi', 'sigma', 'stoch'];   // les 10 indicateurs de getTechSignals (08), rien d'autre
[['vague', vague, 'Double Bottom'], ['montée', montee, 'Breakout haussier']].forEach(([nom, serie, fig], k) => {
  T(`G1${k ? 'b' : ''} série « ${nom} » : l\'ancienne lecture y voit « ${fig} » ; getTechSignals ne pose que les 10 indicateurs, atScore = leur score`, () => {
    const c = monde(serie());
    const vieilles = c._detectPatterns(c._closes(c.S.pairStates['BTC/USDT'].candles));
    assert.ok(vieilles.length && vieilles[0].signal !== 'neu' && vieilles[0].name === fig, 'témoin : l\'ancienne lecture ne voit plus « ' + fig + ' » : ' + JSON.stringify(vieilles[0]));
    const r = c.getTechSignals('BTC/USDT');
    assert.deepStrictEqual(Object.keys(r.signals).sort(), INDIC, 'clés de signals : ' + Object.keys(r.signals).sort().join(', '));
    assert.ok(Math.abs(r.atScore - pondere(r.signals)) < 1e-12, 'atScore ' + r.atScore + ' ≠ score des indicateurs ' + pondere(r.signals));
  });
});

T('G2 getTechSignals ne cite plus aucune figure', () => {
  assert.ok(!/_detectPatterns/.test(GTS), 'getTechSignals lit encore _detectPatterns');
  assert.ok(!/_detectCandlePatterns/.test(GTS), 'getTechSignals lit _detectCandlePatterns');
  assert.ok(!/signals\.pattern\s*=/.test(GTS), 'getTechSignals pose encore signals.pattern');
});

T('G3 aucun script ne pose ni ne lit signals.pattern ; aucune figure appelée hors de l\'écran', () => {
  const html = rd('AURA8_v118.html');
  const files = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(ROOT, f)));
  assert.ok(files.length > 40, 'scripts du HTML : ' + files.length);
  ['js/native-bridge.js', 'guardian-core.js', 'guardian-embed.js', 'guardian-config.js'].forEach(f => { if (fs.existsSync(path.join(ROOT, f)) && !files.includes(f)) files.push(f); });
  const hits = [];
  files.forEach(f => { const s = rd(f).split('\n'); s.forEach((l, i) => { const code = l.replace(/\/\/.*$/, ''); if (/signals\.pattern\b|signals\[['"]pattern['"]\]|\.signals\b[^;]*\bpattern\b/.test(code)) hits.push(f + ':' + (i + 1)); }); });
  const inl = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  if (/signals\.pattern\b/.test(inl.replace(/\/\/.*$/gm, ''))) hits.push('HTML (script en ligne)');
  assert.deepStrictEqual(hits, [], 'figure encore lue / posée : ' + hits.join(', '));
  // aucun appelant de _detectPatterns dans l'app (la fonction reste pour les rejeux)
  const callers = []; files.forEach(f => { rd(f).split('\n').forEach((l, i) => { const code = l.replace(/\/\/.*$/, ''); if (/_detectPatterns\s*\(/.test(code) && !/function _detectPatterns\s*\(/.test(code)) callers.push(f + ':' + (i + 1)); }); });
  assert.deepStrictEqual(callers, [], 'appelants de _detectPatterns : ' + callers.join(', '));
  // les figures corrigées : appelées par l'écran seul (06 renderPatternSection), jamais par un éclaireur, un conseil ou une porte
  const cdl = [];   // toute mention de _detectCandlePatterns, sauf sa définition et son export window
  files.forEach(f => { const src = rd(f); src.split('\n').forEach((l, i) => { const code = l.replace(/\/\/.*$/, ''); if (/_detectCandlePatterns/.test(code) && !/function _detectCandlePatterns\s*\(/.test(code) && !/^\s*window\._detectCandlePatterns = _detectCandlePatterns;\s*$/.test(code)) cdl.push(f + ':' + (i + 1)); }); });
  const ecran = (() => { const s = rd('js/06-v63-patterns-chartistes.js'), a = s.indexOf('function renderPatternSection()'), b = s.indexOf('\n}\n', a); const l0 = s.slice(0, a).split('\n').length, l1 = s.slice(0, b).split('\n').length; return [l0, l1]; })();
  const hors = cdl.filter(x => { const [f, n] = x.split(':'); return !(f === 'js/06-v63-patterns-chartistes.js' && +n >= ecran[0] && +n <= ecran[1]); });
  assert.deepStrictEqual(hors, [], 'figures corrigées appelées hors de l\'écran : ' + hors.join(', '));
  if (fs.existsSync(path.join(ROOT, 'aura-guardian.html'))) assert.ok(!/signals\.pattern|_detectPatterns\s*\(/.test(rd('aura-guardian.html').replace(/\/\/.*$/gm, '')), 'aura-guardian.html lit une figure');
});

T('G4 l\'écran « Patterns chartistes », rendu (vrai texte de 06), affiche que la décision ne lit aucune figure', () => {
  // le monde de l'écran : comme banc-figures.js F4 — une paire EV, 60 bougies 15 min datées et closes, la note et le rendu de 06 tels quels
  const cs = vague().map((x, i) => Object.assign({}, x, { ts: 1e12 + i * 900000 })), now = 1e12 + 61 * 900000;
  const c = { S: { pairStates: { 'BTC/USDT': { candles: cs, price: cs[cs.length - 1].c } } }, PAIRS: { 'BTC/USDT': { dec: 2 } }, console, JSON, Number, Object, Array, String, isFinite, isNaN, Math,
    REAL_CANDLE_INTERVALS: { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000 }, _getActiveRealTimeframe: () => '15m',
    Date: { now: () => now }, document: { getElementById: id => (id === 'patternSection' ? (c.__el = c.__el || { innerHTML: '' }) : null) } };
  c.window = c; vm.createContext(c); require('./banc-fixtures/px-vm.js')(c, ROOT);   /* [GO AFFICHAGE 3 · 15/11/2026] aides d'affichage de 02 (pxTxt, _closeRowUsd : banc-fixtures/px-vm.js) */
  const note = ['_PT_DECISION_NOTE', '_PT_MESURE_NOTE'].map(n => (s06.match(new RegExp('\\nconst ' + n + ' = [^\\n]*\\n')) || [''])[0]).join('');
  assert.ok(/_PT_DECISION_NOTE/.test(note), '_PT_DECISION_NOTE absente');
  const fns = ['function _ptClosedSeries(candles) {', 'function _detectCandlePatterns(candles) {', 'function _ptClosedCandles(pair) {', 'function _ptMiniChart(candles, w, h) {', 'function renderPatternSection() {'].map(a => fnAt(s06, a));
  vm.runInContext("var _ptPair = 'BTC/USDT';\n" + note + fns.join('\n'), c);
  c.renderPatternSection();
  const html = (c.__el && c.__el.innerHTML) || '';
  assert.ok(html.length > 200, 'écran vide');
  assert.ok(/La décision du bot ne lit aucune de ces figures/.test(html), 'la note n\'est pas affichée à l\'écran');
  assert.ok(!/lit encore les figures/.test(html), 'l\'écran dit encore que la décision lit des figures');
});

T('G5 (garde) _detectPatterns gardée telle quelle pour les rejeux (rejeu/talent.js --figures 1)', () => {
  assert.strictEqual(h16(fnAt(s06, 'function _detectPatterns(prices) {')), '1f7d8ab606e948e0', '_detectPatterns a changé : les rejeux de la porte ne mesurent plus la même chose');
});

T('R (garde) les règles de la porte n\'ont pas bougé (sha-256 des 36 premières lignes de rejeu/porte_figures_2.js)', () => {
  const head = rd('rejeu/porte_figures_2.js').split('\n').slice(0, 36).join('\n') + '\n';
  assert.strictEqual(crypto.createHash('sha256').update(head).digest('hex'), '3ca0d0e03989184982f9464050029c50' + 'c2421df6222735dbdd13d0a4605b034e');   // en deux morceaux (banc-p0b-newskey)
});

console.log(`\n${fail ? '❌' : '✅'} ${pass}/${pass + fail} tests passés`);
process.exit(fail ? 1 : 0);
