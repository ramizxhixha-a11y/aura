// banc-figures.js — [GO FIGURES · 26/10/2026] les figures de bougies lisent les VRAIES bougies (Rams 26/10 20:25 : « Corrige les figures »).
// Avant : 06 _detectPatterns ne lit que des clôtures (le « marteau » ne voit jamais de mèche), et l'écran « Patterns chartistes » lisait les prix des
// trades de la paire, ou une série INVENTÉE (sinus + hasard) sous moins de 4 trades, en écrivant « Basé sur les prix réels des trades ».
// Ce banc fait tourner le VRAI texte des fonctions de 06 en vm et ÉCHOUE sur le code d'avant (BANC_ROOT=<copie du commit 57d1864>), sauf D1 (la décision n'a pas bougé) :
//   F1 mèches : mêmes clôtures, mèche basse ou mèche haute → l'ancienne lecture rend la même chose (elle ne voit pas la mèche) ; la nouvelle voit
//      un marteau dans un cas seulement
//   F2 la bougie qui se forme est écartée : EV / RE (datée, ts + durée de la série > maintenant), école AA (sans date : la dernière suit le prix vivant) ;
//      une bougie close est lue ; clôture hors [bas, haut] (l'école en garde) : bas / haut élargis, pas de fausse mèche ; un trou → aucune figure
//   F3 englobante, double sommet confirmé / non confirmé, cassure (sans « consolidation » le même jour), tendance, doji, marché plat (ATR nul → rien,
//      pas de NaN) ; noms / sens / poids d'avant
//   F4 l'écran : vraies bougies closes, aucun tirage au hasard, plus de « prix réels des trades » ; trop peu de bougies → il le dit
//   D1 la DÉCISION n'a pas bougé : texte de _detectPatterns et de getTechSignals identique au commit 57d1864 (verdict de la porte : N'ENTRE PAS)
//   R  les règles de la porte n'ont pas bougé depuis leur écriture (sha-256 des 30 premières lignes de rejeu/porte_figures.js)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n     ')); } }
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
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const s06 = rd('js/06-v63-patterns-chartistes.js'), s08 = rd('js/08-learning-history-render.js');
const need = (src, n) => { const f = fnSrc(src, n); assert.ok(f, 'fonction absente : ' + n); return f; };

// le monde : le vrai texte des fonctions de 06, une horloge réglable, Math.random interdit
function monde(o) {
  o = o || {};
  const c = { S: o.S || { pairStates: {} }, PAIRS: o.PAIRS || {}, console, JSON, Number, Object, Array, String, isFinite, isNaN,
    Math: Object.assign(Object.create(Math), { random() { throw new Error('Math.random appelé : une figure ou l\'écran tire au hasard'); } }),
    REAL_CANDLE_INTERVALS: { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000 },
    _getActiveRealTimeframe: () => o.tf || '15m', document: { getElementById: id => (id === 'patternSection' ? (c.__el = { innerHTML: '' }) : null) } };
  c.Date = { now: () => (o.now != null ? o.now : 0) };
  c.window = c; vm.createContext(c);
  const fns = ['_detectPatterns', '_ptClosedSeries', '_detectCandlePatterns', '_ptClosedCandles', '_ptMiniChart', 'renderPatternSection'].map(n => fnSrc(s06, n)).filter(Boolean);
  const note = ['_PT_DECISION_NOTE', '_PT_MESURE_NOTE'].map(n => (s06.match(new RegExp('\\nconst ' + n + ' = [^\\n]*\\n')) || [''])[0]).join('');
  vm.runInContext("var _ptPair = 'BTC/USDT';\n" + note + fns.join('\n'), c);
  return c;
}
// bougies : k(o, h, l, c)
const k = (o, h, l, c, ts) => (ts == null ? { o, h, l, c, v: 1 } : { o, h, l, c, v: 1, ts });
// bougies de l'école (sans date) : la dernière du tableau suit le prix vivant et n'est pas lue → on ajoute cette bougie vivante après la série à lire
const vive = a => a.concat([k(a[a.length - 1].c, a[a.length - 1].c, a[a.length - 1].c, a[a.length - 1].c)]);
function baisse() {   // 7 bougies calmes autour de 100, puis 8 bougies de baisse d'un point chacune (vraie tendance baissière)
  const a = [];
  for (let i = 0; i < 7; i++) a.push(k(100, 100.3, 99.7, 100));
  for (let i = 0; i < 8; i++) a.push(k(100 - i, 100 - i + 0.2, 99 - i - 0.2, 99 - i));
  return a;   // dernière clôture : 92
}
const noms = r => r.map(p => p.name).sort().join(',');

T('F1 mêmes clôtures, mèche basse ou mèche haute : l\'ancienne lecture ne voit pas la différence, la nouvelle voit le marteau', () => {
  const c = monde();
  const bas = baisse().concat([k(92, 92.6, 89, 92.5)]);    // corps 0,5 ; mèche basse 3 ; mèche haute 0,1 → marteau
  const haut = baisse().concat([k(92, 95.5, 91.9, 92.5)]);  // même ouverture, même clôture ; mèche haute 3 → pas un marteau
  const old = a => JSON.stringify(c._detectPatterns(a.map(x => x.c)));
  assert.strictEqual(old(bas), old(haut), 'l\'ancienne lecture devrait être aveugle aux mèches');
  assert.ok(typeof c._detectCandlePatterns === 'function', '_detectCandlePatterns absente (code d\'avant)');
  const nb = noms(c._detectCandlePatterns(vive(bas))), nh = noms(c._detectCandlePatterns(vive(haut)));
  assert.ok(nb.includes('Marteau'), 'marteau non vu : ' + nb);
  assert.ok(!nh.includes('Marteau'), 'marteau vu sur une mèche HAUTE : ' + nh);
  // sans la baisse d'avant, la même bougie n'est pas un marteau (la figure demande une tendance)
  const plat = []; for (let i = 0; i < 15; i++) plat.push(k(92, 92.3, 91.7, 92));
  assert.ok(!noms(c._detectCandlePatterns(vive(plat.concat([k(92, 92.6, 89, 92.5)])))).includes('Marteau'), 'marteau sans tendance baissière');
});

T('F2 la bougie qui se forme est écartée, une bougie close est lue, un trou ne donne rien', () => {
  const M = 900000, t0 = 1761500000000 - (1761500000000 % M);
  const arr = baisse().concat([k(92, 92.6, 89, 92.5)]).map((x, i) => Object.assign(x, { ts: t0 + i * M }));
  arr._real = true;
  const last = arr[arr.length - 1].ts;
  // 1) la dernière (le marteau) est CLOSE une seconde après sa clôture → lue
  let c = monde({ now: last + M + 1000 });
  assert.ok(noms(c._detectCandlePatterns(arr)).includes('Marteau'), 'bougie close non lue');
  // 2) une bougie de plus, ouverte depuis 1 s (o = h = l = c, comme dans l'app) → écartée : même résultat qu'avant elle
  const forme = arr.slice(); forme._real = true; forme.push(k(92.5, 92.5, 92.5, 92.5, last + M));
  c = monde({ now: last + M + 1000 });
  assert.strictEqual(JSON.stringify(c._detectCandlePatterns(forme)), JSON.stringify(c._detectCandlePatterns(arr)), 'la bougie qui se forme a été lue');
  c.S.pairStates['BTC/USDT'] = { candles: forme };
  assert.strictEqual(c._ptClosedCandles('BTC/USDT').length, arr.length, 'l\'écran montre la bougie qui se forme');
  // 2b) même chose SANS la marque _real (perdue au rechargement JSON) : la date suffit
  const nu = JSON.parse(JSON.stringify(forme));
  assert.strictEqual(JSON.stringify(c._detectCandlePatterns(nu)), JSON.stringify(c._detectCandlePatterns(arr)), 'sans _real, la bougie qui se forme est lue');
  // 2c) la durée est celle de la série (bougies 15 min, pas de temps du mode réglé à 5 min) : la bougie ouverte depuis 6 min reste écartée
  const c5 = monde({ now: last + M + 6 * 60000, tf: '5m' });
  c5.S.pairStates['BTC/USDT'] = { candles: forme };
  assert.strictEqual(c5._ptClosedCandles('BTC/USDT').length, arr.length, 'durée prise au mode, pas à la série');
  // 3) bougies de l'école (sans date) : la dernière suit le prix vivant — jamais lue ; la série d'avant l'est
  c = monde();
  const ecole = baisse().concat([k(92, 92.6, 89, 92.5)]);
  assert.ok(!noms(c._detectCandlePatterns(ecole)).includes('Marteau'), 'la bougie vivante de l\'école a été lue');
  assert.ok(noms(c._detectCandlePatterns(vive(ecole))).includes('Marteau'), 'la bougie close de l\'école n\'est pas lue');
  // 3b) clôture réécrite au-dessus du haut (l'école : 02 blendRealPrices touche c, pas h) : le haut est au moins la clôture → aucune « mèche haute » négative
  const tordue = baisse().concat([k(92, 92.2, 89, 92.5)]);   // c 92,5 > h 92,2
  const vu = c._ptClosedSeries(vive(tordue));
  assert.strictEqual(vu[vu.length - 1].h, 92.5, 'haut non élargi à la clôture');
  assert.ok(vu.every(x => x.h >= Math.max(x.o, x.c) && x.l <= Math.min(x.o, x.c)), 'bougie lue hors [bas, haut]');
  // 4) un trou dans la fenêtre lue → aucune figure
  const trou = vive(baisse().concat([k(92, 92.6, 89, 92.5)])); trou[10]._gap = true;
  assert.deepStrictEqual(Array.from(c._detectCandlePatterns(trou)), [], 'figure lue sur une série trouée');
  // 5) trop court : rien
  assert.deepStrictEqual(Array.from(c._detectCandlePatterns(baisse().slice(0, 10))), []);
});

T('F3 englobante, double sommet (confirmé ou non), cassure, tendance, doji, marché plat ; noms / sens / poids d\'avant', () => {
  const c = monde();
  const F = a => c._detectCandlePatterns(vive(a));
  // englobante haussière : bougie baissière puis bougie haussière qui couvre son corps
  const e = []; for (let i = 0; i < 14; i++) e.push(k(100, 100.5, 99.5, 100));
  e.push(k(100, 100.2, 99.3, 99.5)); e.push(k(99.5, 100.6, 99.4, 100.4));
  assert.ok(noms(F(e)).includes('Englobante haussière'), noms(F(e)));
  // double sommet : deux hauts à 105, un creux à 102 entre eux, puis une clôture sous 102 → confirmé
  const dt = [];
  const seq = [[100, 101], [101, 103], [103, 105], [105, 104], [104, 103], [103, 102.2], [102.2, 103], [103, 104], [104, 105], [105, 104], [104, 103], [103, 102.5], [102.5, 102.2], [102.2, 101.6], [101.6, 101.2]];
  seq.forEach(([o, cl]) => dt.push(k(o, Math.max(o, cl) + 0.05, Math.min(o, cl) - 0.05, cl)));
  dt[2].h = 105.1; dt[8].h = 105.12;   // les deux sommets (≥ 3 bougies d'écart, à moins d'½ ATR l'un de l'autre)
  const r = F(dt);
  assert.ok(noms(r).includes('Double Top'), 'double sommet confirmé non vu : ' + noms(r));
  // même chose sans la clôture sous le creux : pas de double sommet (non confirmé)
  const nc = dt.slice(0, 14).concat([k(102.5, 103, 102.4, 102.9)]);
  assert.ok(!noms(F(nc)).includes('Double Top'), 'double sommet sans confirmation : ' + noms(F(nc)));
  // l'ancienne lecture voit un « double sommet » sur une simple montée lente avec un repli (tolérance de 2 %)
  // (dix clôtures qui montent de 0,05 puis six qui redescendent : un seul sommet, arrondi — l'ancienne y lit deux sommets à moins de 2 %)
  const lent = []; for (let i = 0; i < 10; i++) lent.push(100 + i * 0.05); for (let j = 0; j < 6; j++) lent.push(100.4 - j * 0.05);
  assert.ok(c._detectPatterns(lent).some(p => p.name === 'Double Top'), 'témoin : l\'ancienne lecture ne voit plus son faux double sommet');
  const lentK = lent.map((v, i) => k(i ? lent[i - 1] : v, Math.max(v, i ? lent[i - 1] : v) + 0.02, Math.min(v, i ? lent[i - 1] : v) - 0.02, v));
  assert.ok(!noms(F(lentK)).includes('Double Top'), 'la nouvelle lecture voit un double sommet sur un sommet unique : ' + noms(F(lentK)));
  // cassure : clôture au-dessus des 10 bougies d'avant
  const b = []; for (let i = 0; i < 15; i++) b.push(k(100, 100.5, 99.5, 100)); b.push(k(100, 101.2, 99.9, 101));
  assert.ok(noms(F(b)).includes('Breakout haussier'), noms(F(b)));
  assert.ok(!noms(F(b)).includes('Consolidation'), 'consolidation le jour de la cassure : ' + noms(F(b)));
  // tendance : 5 clôtures de suite plus hautes
  const t = []; for (let i = 0; i < 10; i++) t.push(k(100, 100.5, 99.5, 100)); for (let i = 0; i < 6; i++) t.push(k(100 + i * 0.1, 100 + i * 0.1 + 0.15, 100 + i * 0.1 - 0.05, 100 + (i + 1) * 0.1));
  assert.ok(noms(F(t)).includes('Tendance haussière'), noms(F(t)));
  // doji : corps ≤ 10 % du range
  const d = []; for (let i = 0; i < 15; i++) d.push(k(100, 100.5, 99.5, 100.2)); d.push(k(100, 100.8, 99.2, 100.05));
  assert.ok(noms(F(d)).includes('Doji'), noms(F(d)));
  // marché plat (o = h = l = c partout) : ATR nul → aucune figure, aucun NaN
  const f = []; for (let i = 0; i < 20; i++) f.push(k(5, 5, 5, 5));
  assert.deepStrictEqual(Array.from(F(f)), []);
  // noms, sens, poids : ceux d'avant
  const AV = { 'Doji': ['neu', 0.6], 'Marteau': ['bull', 0.72], 'Étoile filante': ['bear', 0.70], 'Double Top': ['bear', 0.78], 'Double Bottom': ['bull', 0.77],
    'Englobante haussière': ['bull', 0.74], 'Englobante baissière': ['bear', 0.73], 'Tendance haussière': ['bull', 0.65], 'Tendance baissière': ['bear', 0.65],
    'Consolidation': ['neu', 0.60], 'Breakout haussier': ['bull', 0.80], 'Breakdown baissier': ['bear', 0.79] };
  const src = fnSrc(s06, '_detectCandlePatterns'), vus = [...src.matchAll(/name:'([^']+)',icon:'[^']+',signal:'(\w+)',conf:([\d.]+)/g)];
  assert.strictEqual(vus.length, 12, 'figures : ' + vus.length);
  vus.forEach(([, nm, sg, cf]) => { assert.ok(AV[nm], 'figure inconnue : ' + nm); assert.strictEqual(sg, AV[nm][0], nm); assert.strictEqual(Number(cf), AV[nm][1], nm); });
});

T('F4 l\'écran : vraies bougies closes, aucun tirage au hasard, plus de « prix réels des trades »', () => {
  const ps = { candles: vive(baisse().concat([k(92, 92.6, 89, 92.5)])), price: 92.5, trades: [] };
  const c = monde({ S: { pairStates: { 'BTC/USDT': ps } }, PAIRS: { 'BTC/USDT': { dec: 2, color: '#fff' } } });
  c.renderPatternSection();   // Math.random lève : l'écran ne doit rien inventer
  const html = c.__el.innerHTML;
  assert.ok(!/prix réels des trades/.test(html), 'l\'écran se dit encore « basé sur les prix réels des trades »');
  assert.ok(/16 bougies closes · bougies de l'école/.test(html), 'nombre ou source des bougies closes absent');
  assert.ok(/ne prévoient pas le prix/.test(html), 'la mesure de la porte n\'est pas dite à l\'écran');
  assert.ok(/Marteau/.test(html), 'la figure lue n\'est pas affichée');
  assert.ok((html.match(/<line /g) || []).length === 16, 'mèches absentes du graphique');
  // une paire sans bougies (avant : série inventée) : l'écran le dit
  const c2 = monde({ S: { pairStates: { 'BTC/USDT': { candles: [], price: 50000, trades: [] } } }, PAIRS: { 'BTC/USDT': { dec: 2 } } });
  c2.renderPatternSection();
  assert.ok(/Pas assez de bougies closes \(0 sur 15\)/.test(c2.__el.innerHTML), 'pas de message honnête sans bougies');
  assert.ok(fnSrc(s06, '_ptPrices') === null, '_ptPrices (série inventée) encore là');
  // une série trouée : l'écran le dit
  const tr = vive(baisse().concat([k(92, 92.6, 89, 92.5)])); tr[12]._gap = true;
  const c3 = monde({ S: { pairStates: { 'BTC/USDT': { candles: tr, price: 92.5 } } }, PAIRS: { 'BTC/USDT': { dec: 2 } } });
  c3.renderPatternSection();
  assert.ok(/Un trou dans les 15 dernières bougies/.test(c3.__el.innerHTML), 'trou non dit à l\'écran');
});

T('D1 la DÉCISION n\'a pas bougé : _detectPatterns et getTechSignals identiques au commit 57d1864', () => {
  assert.strictEqual(h16(need(s06, '_detectPatterns')), '9eb7b970e59ea92a', '_detectPatterns a changé');
  assert.strictEqual(h16(need(s08, 'getTechSignals')), '0c8a8a273d52421d', 'getTechSignals a changé');
  assert.ok(/_detectPatterns\(closes\)/.test(need(s08, 'getTechSignals')) && !/_detectCandlePatterns/.test(need(s08, 'getTechSignals')), 'la décision lit les figures corrigées');
});

T('R les règles de la porte n\'ont pas bougé (sha-256 des 30 premières lignes de rejeu/porte_figures.js)', () => {
  const head = rd('rejeu/porte_figures.js').split('\n').slice(0, 30).join('\n') + '\n';
  assert.strictEqual(crypto.createHash('sha256').update(head).digest('hex'), '10d5d0a893816026b224367a7910db7f' + '7abb88545d71b8d541c221ac3db159ff');   // en deux morceaux : 44 chiffres hex d'affilée = « clé CoinStats » pour banc-p0b-newskey
});

console.log(`\n${fail ? '❌' : '✅'} ${pass}/${pass + fail} tests passés`);
process.exit(fail ? 1 : 0);
