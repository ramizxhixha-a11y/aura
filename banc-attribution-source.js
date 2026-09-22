// banc-attribution-source.js — [ATTRIBUTION PAR SOURCE · 17/09/2026] VERSION 20260917f
// Phase 2 A2/A5 : le bus range ce que chaque SOURCE DE DONNÉES disait ; la clôture crédite chaque source du P&L réel
// de la position, selon ce qu'elle disait À L'OUVERTURE. LECTURE SEULE : aucune décision ne lit S.attribution.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s10i = rd('js/10i-intel-bus.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s02 = rd('js/02-state-init.js');
const J = v => JSON.parse(JSON.stringify(v));
function ctx(S) { const c = { S, Math, Number, Object, Array, JSON, Date, isFinite, String, window: {} }; vm.createContext(c); vm.runInContext(s10i, c); return c; }
const mkS = (mode) => ({ tradingMode: mode || 'paperReal', pairStates: { 'BTC/USDT': {} }, attribution: {} });
console.log('▶ banc-attribution-source');
T('D1 · _intelPublish RÉEL : agrège par source, pondère par le poids du siège, borne à ±1, anneau de 40, ps.intel = dernier état ; source sans siège absente', () => {
  const S = mkS(); const c = ctx(S);
  // FORME RÉELLE de ps.roster.votes (03) : des NOMBRES. Le test du 17/09 utilisait des objets inventés — il passait
  // alors que la production ne mesurait que « technique » (backup 19/09). Épinglé par S2 ci-dessous.
  c.votes = { flow_v1: 0.8, whale_v1: 0.4, nlp_v1: -1, sentiment_v2: 0.2, scalper_v2: 1 };
  c.weights = { flow_v1: { w: 3 }, whale_v1: { w: 1 } };
  const r = J(vm.runInContext("_intelPublish('BTC/USDT', votes, weights, 0.5)", c));
  assert.ok(Math.abs(r.flux - (0.8 * 3 + 0.4 * 1) / 4) < 1e-9, 'flux pondéré : ' + r.flux);
  assert.strictEqual(r.technique, 0.5); assert.strictEqual(r.news, -1); assert.strictEqual(r.prix, 0.2);
  assert.strictEqual(r.volume, undefined, 'volume_v1 absent des votes → pas de source');
  assert.strictEqual(r.fondamental, undefined); assert.strictEqual(Object.keys(r).length, 4);
  assert.ok(!('scalper_v2' in r), 'les conseillers ne sont pas des sources');
  assert.strictEqual(S.pairStates['BTC/USDT'].intelLog.length, 1);
  assert.deepStrictEqual(J(S.pairStates['BTC/USDT'].intel.s), r);
  for (let i = 0; i < 60; i++) vm.runInContext("_intelPublish('BTC/USDT', votes, weights, 0.5)", c);
  assert.strictEqual(S.pairStates['BTC/USDT'].intelLog.length, 40, 'anneau 40');
  c.votes2 = { flow_v1: 5 };
  assert.strictEqual(J(vm.runInContext("_intelPublish('BTC/USDT', votes2, null, NaN)", c)).flux, 1, 'borné à +1');
  c.votesObj = { flow_v1: { score: 0.8 }, whale_v1: { score: 0.4 } };   // forme objet tolérée par sécurité si 03 change un jour
  assert.ok(Math.abs(J(vm.runInContext("_intelPublish('BTC/USDT', votesObj, weights, NaN)", c)).flux - (0.8 * 3 + 0.4) / 4) < 1e-9, 'forme objet acceptée');
});
T('D2 · _intelRead : l\'état le plus proche de l\'horodatage demandé, rien au-delà de 15 min, dernier état sans horodatage', () => {
  const S = mkS(); const c = ctx(S); const now = Date.now();
  S.pairStates['BTC/USDT'].intelLog = [ { t: now - 3600000, s: { flux: -1 } }, { t: now - 600000, s: { flux: 0.5 } }, { t: now, s: { flux: 0.9 } } ];
  assert.strictEqual(J(vm.runInContext(`_intelRead('BTC/USDT', ${now - 660000})`, c)).flux, 0.5);
  assert.strictEqual(J(vm.runInContext(`_intelRead('BTC/USDT', ${now - 120000})`, c)).flux, 0.9);
  assert.strictEqual(vm.runInContext(`_intelRead('BTC/USDT', ${now - 7200000})`, c), null, 'trop vieux : rien');
  assert.strictEqual(J(vm.runInContext("_intelRead('BTC/USDT', null)", c)).flux, 0.9, 'ts null → dernier état (isFinite(null) est TRUE en JS : piège)');
  assert.strictEqual(J(vm.runInContext("_intelRead('BTC/USDT')", c)).flux, 0.9); assert.strictEqual(J(vm.runInContext("_intelRead('BTC/USDT', 0)", c)).flux, 0.9);
  assert.strictEqual(vm.runInContext("_intelRead('ETH/USDT', null)", c), null, 'paire inconnue');
});
T('D3 · _attributionRecord RÉEL : crédite les sources alignées, débite les autres, ignore les avis < 0,05, rien en AA, rien sans ouverture retrouvée', () => {
  const S = mkS(); const c = ctx(S); const t0 = Date.now() - 300000;
  S.pairStates['BTC/USDT'].intelLog = [{ t: t0, s: { flux: 0.6, news: -0.4, technique: 0.02, prix: -0.8 } }];
  c.pos = { pair: 'BTC/USDT', side: 'long', openedAt: t0 };
  assert.strictEqual(vm.runInContext('_attributionRecord(pos, 2)', c), 3, '3 sources créditées (technique sous le seuil)');
  const a = J(S.attribution);
  assert.deepStrictEqual(a.flux.paperReal, { n: 1, wins: 1, sumPnl: 2, sumAbs: 2 }, 'flux était long, trade gagnant');
  assert.deepStrictEqual(a.news.paperReal, { n: 1, wins: 0, sumPnl: -2, sumAbs: 2 }, 'news disait short : puni');
  assert.deepStrictEqual(a.prix.paperReal, { n: 1, wins: 0, sumPnl: -2, sumAbs: 2 });
  assert.strictEqual(a.technique, undefined, 'avis < 0,05 : ni crédité ni puni');
  vm.runInContext('_attributionRecord(pos, -1)', c);   // perte : flux (long) puni, news (short) récompensé
  assert.deepStrictEqual(J(S.attribution).flux.paperReal, { n: 2, wins: 1, sumPnl: 1, sumAbs: 3 });
  assert.deepStrictEqual(J(S.attribution).news.paperReal, { n: 2, wins: 1, sumPnl: -1, sumAbs: 3 });
  S.tradingMode = 'sim';
  assert.strictEqual(vm.runInContext('_attributionRecord(pos, 5)', c), 0, 'AA : rien (école ne note plus)');
  S.tradingMode = 'paperReal';
  c.pos2 = { pair: 'BTC/USDT', side: 'long', openedAt: t0 - 7200000 };
  assert.strictEqual(vm.runInContext('_attributionRecord(pos2, 3)', c), 0, 'ouverture non retrouvée : rien');
  assert.strictEqual(vm.runInContext('_attributionRecord(null, 3)', c), 0);
  c.pos3 = { pair: 'BTC/USDT', side: 'long' };   // sans horodatage d'ouverture : jamais attribué (pas au dernier état connu)
  assert.strictEqual(vm.runInContext('_attributionRecord(pos3, 9)', c), 0, 'position sans openedAt : rien');
  assert.strictEqual(vm.runInContext("_attributionRecord(pos, NaN)", c), 0);
  assert.strictEqual(J(S.attribution).flux.paperReal.n, 2, 'aucun enregistrement parasite');
});
T('D4 · _attributionSummary : trié par P&L moyen, taux de réussite, par mode ; short pris en compte (source négative alignée = gain)', () => {
  const S = mkS(); const c = ctx(S); const t0 = Date.now() - 60000;
  S.pairStates['BTC/USDT'].intelLog = [{ t: t0, s: { flux: -0.7, news: 0.6 } }];
  c.pos = { pair: 'BTC/USDT', side: 'short', openedAt: t0 };
  vm.runInContext('_attributionRecord(pos, 4)', c);   // short gagnant : flux (négatif) aligné → +4 ; news (positif) → −4
  const sum = J(vm.runInContext('_attributionSummary()', c));
  assert.deepStrictEqual(sum, [ { src: 'flux', n: 1, winRate: 100, avgPnl: 4, sumPnl: 4 }, { src: 'news', n: 1, winRate: 0, avgPnl: -4, sumPnl: -4 } ]);
  assert.deepStrictEqual(J(vm.runInContext("_attributionSummary('real')", c)), [], 'autre mode : vide');
});
T('S2 · FORME DES VOTES épinglée sur 03 : ps.roster.votes[id] est un nombre (scouts res.score, conseil ±|score|, gardiens −0,5/−0,2/+0,05) — le correctif du 19/09 tient tant que cette forme tient', () => {
  const c = codeStrict(s03);
  assert.ok(c.includes("if (res && typeof res.score === 'number') _votes[id] = _muted.has(id) ? 0 : res.score;"), 'scouts : nombre');
  assert.ok(c.includes("_votes[id] = _muted.has(id) ? 0 : (res.vote === 'long' ? magnitude : res.vote === 'short' ? -magnitude : 0);"), 'conseil : nombre');
  assert.ok(c.includes("_votes[id] = _muted.has(id) ? 0.05 : (res.status === 'veto' ? -0.5 : res.status === 'warn' ? -0.2 : 0.05);"), 'gardiens : nombre');
  assert.ok(codeStrict(s10i).includes("var sc = (typeof v === 'number') ? v : Number(v.score);"), '10i lit le nombre en premier');
});
T('S1 · LECTURE SEULE et branchements : 03 publie après le roster, 02 enregistre à la clôture (entonnoir unique), aucune décision ne lit S.attribution / ps.intel, persistance + manifest, script chargé', () => {
  const c03 = codeStrict(s03), c02 = codeStrict(s02);
  assert.ok(c03.includes("if (typeof _intelPublish === 'function') _intelPublish(pair, _votes, _weights, (getTechSignals(pair) || {}).atScore);"));
  assert.ok(c02.includes("if (typeof _attributionRecord === 'function') _attributionRecord(pos, realisedPct);"));
  assert.strictEqual((c02.match(/_attributionRecord\(/g) || []).length, 1, 'un seul point d\'enregistrement');
  // aucun fichier de décision ne LIT l'attribution ni le bus
  fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js') && f !== '10i-intel-bus.js').forEach(f => {
    const c = codeStrict(rd('js/' + f));
    assert.strictEqual(/S\.attribution\s*\[/.test(c) && f !== '09b1-build-snapshot.js' && f !== '09b2-save-load.js', false, f + ' lit S.attribution');
    if (f !== '11b-ecran-appris.js') assert.strictEqual(/_attributionSummary\(/.test(c), false, f + ' lit le résumé');   // [23/09] l'écran « appris » (11b) l'AFFICHE — lecture seule, prouvée par banc-ecran-appris
    assert.strictEqual(/ps\.intel\b|\.intelLog/.test(c), false, f + ' lit le bus');
  });
  const c1 = codeStrict(rd('js/09b1-build-snapshot.js')), c2 = codeStrict(rd('js/09b2-save-load.js'));
  assert.ok(c1.includes('attribution: S.attribution || {},') && c2.includes('S.attribution       = snap.attribution;'));
  const man = (c2.match(/window\._APPLYSNAP_MANIFEST = \[([^\]]*)\]/) || [])[1] || '';
  assert.ok(man.includes("'attribution'"), 'attribution dans le manifest : ' + man.slice(0, 120));
  const html = rd('AURA8_v118.html'), tok = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
  assert.ok(tok && html.includes('<script src="js/10i-intel-bus.js?v=' + tok + '"></script>'), '10i chargé au token courant');
  // [22/09] 10i LIT les positions (mémoire des chemins) mais n'en ouvre, n'en ferme ni n'en retire aucune : la décision d'horizon est exécutée par 10f
  assert.strictEqual(/closePosition\(|openPositions\.(push|splice|shift|pop|unshift)|openPositions\.length\s*=|openPositions\s*=[^=]/.test(codeStrict(s10i)), false, '10i n\'ouvre ni ne ferme rien');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
