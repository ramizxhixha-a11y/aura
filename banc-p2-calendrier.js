// ▓▓▓ BANC D'ESSAI P2 · CALENDRIER ÉCONOMIQUE (06/09/2026) ▓▓▓
// À lancer à la RACINE du dépôt (node banc-p2-calendrier.js). Charge le VRAI fichier 10e2 livré
// dans un contexte node avec une horloge pilotée, puis rejoue le texte LIVRÉ des portes 10f,
// vérifie la place du veto dans 09c, la suppression du doublon dans 05 et l'ordre de chargement HTML.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let pass = 0, fail = 0;
function T(name, fn){ try { fn(); pass++; console.log('  ✅', name); } catch(e){ fail++; console.log('  ❌', name, '→', e.message); } }
const H = 3600000, MIN = 60000;

// ── contexte : horloge pilotée ────────────────────────────────────
let fakeNow = Date.UTC(2026, 8, 5, 12, 0, 0);
class FakeDate extends Date { static now(){ return fakeNow; } }
const ctx = { window: {}, console, Math, Object, String, Number, Array, JSON, Infinity, Date: FakeDate };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/10e2-calendrier-eco.js','utf8'), ctx, { filename: '10e2' });
function at(ts){ fakeNow = ts; vm.runInContext('_ecoCache.ts = 0; _ecoCache.events = null;', ctx); }
function ev(name, ts){ return ctx._getRecurringEvents().find(e => e.name === name && e.ts === ts); }

console.log('\n── A · 10e2 livré : dates officielles en UTC ──');
T('FOMC 16/09/2026 → 18:00 UTC (14:00 EDT)', () => { at(Date.UTC(2026,8,5)); assert.ok(ev('Décision taux Fed (FOMC)', Date.UTC(2026,8,16,18,0))); });
T('FOMC 09/12/2026 → 19:00 UTC (14:00 EST, après le 1er novembre)', () => { at(Date.UTC(2026,10,15)); assert.ok(ev('Décision taux Fed (FOMC)', Date.UTC(2026,11,9,19,0))); });
T('CPI 11/09/2026 → 12:30 UTC (08:30 EDT) — plus le « 2e mercredi » (9/09)', () => {
  at(Date.UTC(2026,8,5));
  assert.ok(ev('CPI USA (Inflation)', Date.UTC(2026,8,11,12,30)));
  assert.ok(!ctx._getRecurringEvents().some(e => e.name === 'CPI USA (Inflation)' && new Date(e.ts).getUTCDate() === 9));
});
T('CPI 10/11/2026 → 13:30 UTC (08:30 EST)', () => { at(Date.UTC(2026,10,1)); assert.ok(ev('CPI USA (Inflation)', Date.UTC(2026,10,10,13,30))); });
T('Deribit dernier vendredi de septembre = 25/09 08:00 UTC', () => { at(Date.UTC(2026,8,5)); assert.ok(ev('Expiration Options BTC/ETH (Deribit)', Date.UTC(2026,8,25,8,0))); });
T('OpEx 3e vendredi de septembre = 18/09 20:00 UTC (16:00 EDT), impact med', () => {
  at(Date.UTC(2026,8,5)); const e = ev('OpEx ETF Bitcoin (3e vendredi)', Date.UTC(2026,8,18,20,0));
  assert.ok(e); assert.strictEqual(e.impact, 'med');
});
T('Funding : prochain multiple de 8 h UTC, impact low', () => {
  at(Date.UTC(2026,8,5,12,0)); const e = ctx._getRecurringEvents().find(e => e.name === 'Funding Rate Binance');
  assert.strictEqual(e.ts, Date.UTC(2026,8,5,16,0)); assert.strictEqual(e.impact, 'low');
});
T('Halving : special:true (ignoré par la porte)', () => { const e = ctx._getRecurringEvents().find(e => e.name.startsWith('Halving')); assert.ok(e && e.special); });
T('champs attendus par renderCalSection (05) : ts/date/name/impact/category/desc/icon, triés par ts', () => {
  const l = ctx._getRecurringEvents();
  l.forEach(e => { ['ts','date','name','impact','category','desc','icon'].forEach(k => assert.ok(k in e, k)); assert.ok(e.date instanceof Date); });
  for (let i = 1; i < l.length; i++) assert.ok(l[i].ts >= l[i-1].ts);
});
T('visibilité : annonce passée depuis 1 h encore listée, depuis 3 h retirée', () => {
  const fomc = Date.UTC(2026,8,16,18,0);
  at(fomc + 1*H); assert.ok(ev('Décision taux Fed (FOMC)', fomc));
  at(fomc + 3*H); assert.ok(!ev('Décision taux Fed (FOMC)', fomc));
});
T('cache 60 s : même liste tant que l’horloge n’a pas avancé d’une minute', () => {
  at(Date.UTC(2026,8,5)); const a = ctx._getRecurringEvents(); fakeNow += 30000; assert.strictEqual(ctx._getRecurringEvents(), a);
  fakeNow += 61000; assert.notStrictEqual(ctx._getRecurringEvents(), a);
});

console.log('\n── B · 10e2 livré : porte _ecoGateForOpen ──');
const fomc = Date.UTC(2026,8,16,18,0);
T('3 h avant : neutre', () => { at(fomc - 3*H); const g = ctx._ecoGateForOpen(); assert.strictEqual(g.veto,false); assert.strictEqual(g.malus,0); assert.strictEqual(g.event,null); });
T('90 min avant : malus 0.10, pas de veto, minutes = +90', () => { at(fomc - 90*MIN); const g = ctx._ecoGateForOpen(); assert.strictEqual(g.veto,false); assert.strictEqual(g.malus,0.10); assert.strictEqual(g.minutes,90); });
T('30 min avant : veto', () => { at(fomc - 30*MIN); assert.strictEqual(ctx._ecoGateForOpen().veto, true); });
T('10 min avant : veto, minutes = +10', () => { at(fomc - 10*MIN); const g = ctx._ecoGateForOpen(); assert.strictEqual(g.veto,true); assert.strictEqual(g.minutes,10); });
T('à l’heure exacte : veto (d = 0)', () => { at(fomc); assert.strictEqual(ctx._ecoGateForOpen().veto, true); });
T('15 min après : malus, minutes = −15 (annonce passée)', () => { at(fomc + 15*MIN); const g = ctx._ecoGateForOpen(); assert.strictEqual(g.veto,false); assert.strictEqual(g.malus,0.10); assert.strictEqual(g.minutes,-15); });
T('2 h 01 après : neutre', () => { at(fomc + 121*MIN); assert.strictEqual(ctx._ecoGateForOpen().event, null); });
T('OpEx (impact med) à 10 min : ni veto ni malus', () => { at(Date.UTC(2026,8,18,20,0) - 10*MIN); assert.strictEqual(ctx._ecoGateForOpen().event, null); });
T('Deribit (impact high) à 10 min : veto', () => { at(Date.UTC(2026,8,25,8,0) - 10*MIN); assert.strictEqual(ctx._ecoGateForOpen().veto, true); });
T('CPI 11/09 à 12:00 UTC (30 min avant 12:30) : veto ; à 11:00 : malus ; à 10:00 (2 h 30 avant) : neutre', () => {
  at(Date.UTC(2026,8,11,12,0)); assert.strictEqual(ctx._ecoGateForOpen().veto, true);
  at(Date.UTC(2026,8,11,10,0)); assert.strictEqual(ctx._ecoGateForOpen().event, null);
  at(Date.UTC(2026,8,11,11,0)); const g = ctx._ecoGateForOpen(); assert.strictEqual(g.veto,false); assert.strictEqual(g.malus,0.10);
});

console.log('\n── C · 10f livré : portes avec malus (texte réel) ──');
const src10f = fs.readFileSync('js/10f-resolveur-cycle.js','utf8');
const gateTxt  = src10f.slice(src10f.indexOf("  const _mktReg ="), src10f.indexOf("  const dirGate"));
const floorTxt = src10f.slice(src10f.indexOf("  const _convFloor ="), src10f.indexOf("  if(_gainNet < _minNetGain"));
function gates(conv, regime, malus, corrBonus){
  const c = { S:{ _convBoost:0, openPositions:[] }, effectiveConviction:conv, ps:{ trades:[] }, pair:'BTC/USDT',
    detectMarketRegime:()=>regime, _corrGateForOpen:()=>({bonus:corrBonus||0, corr:null}), _ecoGateForOpen:()=>({malus:malus, veto:false}),
    finalSignalWithMem:0.5, _pairWatch:false, Math };
  vm.createContext(c);
  vm.runInContext(gateTxt + 'var __cg = convGate;', c);
  vm.runInContext(floorTxt.replace(/const /g,'var '), c);
  return { convGate: c.__cg, floor: c._convFloor, corrDecisive: c._corrDecisive };
}
T('CALM 0.35 · conv 0.40 · hors fenêtre → porte ouverte, plancher 0.30', () => { const g = gates(0.40,'calm',0,0); assert.strictEqual(g.convGate,true); assert.ok(Math.abs(g.floor-0.30)<1e-9); });
T('CALM 0.35 · conv 0.40 · malus 0.10 → porte 0.45 fermée, plancher 0.40', () => { const g = gates(0.40,'calm',0.10,0); assert.strictEqual(g.convGate,false); assert.ok(Math.abs(g.floor-0.40)<1e-9); });
T('CALM · conv 0.46 · malus 0.10 → passe (0.46 ≥ 0.45)', () => { assert.strictEqual(gates(0.46,'calm',0.10,0).convGate, true); });
T('normal 0.25 · conv 0.30 · malus 0.10 → porte 0.35 fermée', () => { assert.strictEqual(gates(0.30,'bull',0.10,0).convGate, false); });
T('volatil 0.18 · conv 0.28 · malus 0.10 → passe (0.28 ≥ 0.28), plancher 0.40 le retiendra', () => { const g = gates(0.28,'volatile',0.10,0); assert.strictEqual(g.convGate,true); assert.ok(Math.abs(g.floor-0.40)<1e-9); });
T('malus + bonus corr −0.03 se cumulent : CALM porte 0.42, plancher 0.37', () => { const g = gates(0.41,'calm',0.10,0.03); assert.strictEqual(g.convGate,false); assert.ok(Math.abs(g.floor-0.37)<1e-9); });
T('P1 intact : bonus décisif calculé avec le malus (0.43 passe grâce à −0.03 sur porte 0.45)', () => { const g = gates(0.43,'calm',0.10,0.03); assert.strictEqual(g.convGate,true); assert.strictEqual(g.corrDecisive,true); });
T('P1 intact hors fenêtre : CALM 0.33 + bonus −0.03 → passe, décisif', () => { const g = gates(0.33,'calm',0,0.03); assert.strictEqual(g.convGate,true); assert.strictEqual(g.corrDecisive,true); });

console.log('\n── D · 09c livré : veto dans l’entonnoir ──');
const src09c = fs.readFileSync('js/09c-auto-open.js','utf8');
T('veto ECO placé APRÈS le veto CORR et AVANT le Smart Sizer', () => {
  const iCorr = src09c.indexOf('const _cg = _corrGateForOpen(pair, side);');
  const iEco  = src09c.indexOf('const _eg = _ecoGateForOpen();');
  const iSizer= src09c.indexOf('// Smart Sizer applique le multiplicateur Kelly');
  assert.ok(iCorr > 0 && iEco > iCorr && iSizer > iEco);
});
T('veto ECO : brainLog événement ECO, journal 📅 anti-flood RAM, toast, return', () => {
  const blk = src09c.slice(src09c.indexOf('const _eg = _ecoGateForOpen();'), src09c.indexOf('// Smart Sizer applique'));
  assert.ok(blk.includes("event: 'ECO'")); assert.ok(blk.includes('_ecoVetoLogTs[pair]')); assert.ok(blk.includes("icon: '📅'"));
  assert.ok(blk.includes('showToast(')); assert.ok(/if \(_eg\.veto\) \{[\s\S]*return;\s*\}/.test(blk));
  assert.ok(src09c.includes('const _ecoVetoLogTs = {};'));
});
T('09c : un seul appel à _ecoGateForOpen, un seul à _corrGateForOpen', () => {
  assert.strictEqual((src09c.match(/_ecoGateForOpen\(/g)||[]).length, 1);
  assert.strictEqual((src09c.match(/_corrGateForOpen\(/g)||[]).length, 1);
});

console.log('\n── E · source unique : 05, 10e, HTML ──');
const src05 = fs.readFileSync('js/05-v37-19-indicateur-de-fatigue-bot.js','utf8');
const src10e = fs.readFileSync('js/10e-helpers-adaptatifs.js','utf8');
const html = fs.readFileSync('AURA8_v118.html','utf8');
T('05 ne définit plus _getRecurringEvents (ni fomcDates2026), mais l’appelle encore pour l’affichage', () => {
  assert.ok(!src05.includes('function _getRecurringEvents')); assert.ok(!src05.includes('fomcDates2026'));
  assert.ok(src05.includes('_getRecurringEvents()'));
});
T('_getRecurringEvents définie UNE seule fois dans tout js/ (10e2)', () => {
  const defs = fs.readdirSync('js').filter(f=>f.endsWith('.js') && f!=='10-fin-bloc-restauration-v93.js')
    .filter(f => fs.readFileSync('js/'+f,'utf8').includes('function _getRecurringEvents'));
  assert.deepStrictEqual(defs, ['10e2-calendrier-eco.js']);
});
T('10e non touché : aucune référence ECO', () => { assert.ok(!src10e.includes('_ecoGateForOpen')); assert.ok(!src10e.includes('ECO_')); });
T('HTML : 10e2 chargé juste après 10e et avant 10f, token 20260906a sur toutes les ressources + DOC_V', () => {
  const i1 = html.indexOf('js/10e-helpers-adaptatifs.js?v=20260906a'), i2 = html.indexOf('js/10e2-calendrier-eco.js?v=20260906a'), i3 = html.indexOf('js/10f-resolveur-cycle.js?v=20260906a');
  assert.ok(i1 > 0 && i2 > i1 && i3 > i2);
  assert.ok(!html.includes('20260905b')); assert.ok(html.includes("DOC_V = '20260906a'"));
  assert.strictEqual((html.match(/\?v=20260906a/g)||[]).length, 73);
});
T('10e2 : module ≤ 500 lignes, sans dépendance à S', () => {
  const src = fs.readFileSync('js/10e2-calendrier-eco.js','utf8');
  assert.ok(src.split('\n').length <= 500); assert.ok(!/\bS\./.test(src));
});

console.log(`\n${pass}/${pass+fail} tests passés${fail ? ' · ' + fail + ' ÉCHEC(S)' : ''}\n`);
process.exit(fail ? 1 : 0);
