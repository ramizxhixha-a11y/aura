// banc-phases-tick.js — 06/09/2026 — chronos par phase du tick (08) + suffixe LENT (00)
const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
const dir=fs.existsSync(path.join(__dirname,'js'))?__dirname:path.join(__dirname,'out');
const src08=fs.readFileSync(path.join(dir,'js/08-learning-history-render.js'),'utf8');
const src00=fs.readFileSync(path.join(dir,'js/00-backup-state.js'),'utf8');
let n=0, ok=0; function t(name,fn){ n++; try{ fn(); ok++; console.log('OK  '+name);}catch(e){ console.log('KO  '+name+' : '+e.message);} }

// --- 08 : structure statique
t('08 : 9 _phEnd + definition dans simTick', ()=>{
  const i=src08.indexOf('function simTick()'), j=src08.indexOf('\n}\n', src08.indexOf('S.perf.slowest'));
  const body=src08.slice(i,j);
  assert.strictEqual((body.match(/function _phEnd\(/g)||[]).length,1);
  assert.strictEqual((body.match(/_phEnd\('/g)||[]).length,9);
  assert.ok(body.indexOf('S.perf.slowest = { name: _phMax.name')>0);
});
t('08 : _phEnd defini avant le premier appel, derniere phase avant slowest', ()=>{
  const a=src08.indexOf('function _phEnd('), b=src08.indexOf("_phEnd('cycles"), c=src08.indexOf("_phEnd('rendus page"), d=src08.indexOf('S.perf.slowest =');
  assert.ok(a<b && c<d);
});
t('08 : logique bot inchangee (mot-cles sensibles absents des lignes ajoutees)', ()=>{
  const added=src08.split('\n').filter(l=>l.indexOf('_phEnd')>=0||l.indexOf('_phMax')>=0||l.indexOf('PHASES DU TICK')>=0||l.indexOf('conservee dans S.perf.slowest')>=0);
  assert.strictEqual(added.length,14);
  added.forEach(l=>{ assert.ok(!/tradingMode|botAutoMode|fitness|cycleTimer/.test(l), l); });
});
// --- 08 : mecanique _phEnd extraite et executee
t('08 : _phEnd retient la phase la plus lente', ()=>{
  const decl=src08.match(/  var _phLast = _perfStart, _phMax = [^\n]*\n  function _phEnd[^\n]*\n/)[0];
  let now=0; const ctx={performance:{now:()=>now}};
  vm.createContext(ctx);
  vm.runInContext('function run(){ var _perfStart=0;'+decl+' performance.now_=0; now_(); function now_(){} return function(name,adv){ globalThis.__adv(adv); _phEnd(name); return _phMax; } }', ctx);
  ctx.__adv=(d)=>{now+=d;};
  const step=vm.runInContext('run()',ctx);
  step('a',100); step('b',700); const r=step('c',50);
  assert.strictEqual(r.name,'b'); assert.strictEqual(r.ms,700);
});
// --- 00 : _report reel
function loadReport(S0){
  const i=src00.indexOf('    function _report(name, dur) {'), j=src00.indexOf('    function _wrapFn(');
  const code=src00.slice(i,j);
  const ctx={window:{},S:S0,Date:Date,Math:Math,String:String}; vm.createContext(ctx);
  vm.runInContext('var _now=function(){return 0};'+code+'; this._report=_report;',ctx);
  return ctx._report;
}
t('00 : LENT sans phase quand slowest absent', ()=>{
  const S={chainLog:[],perf:{}}; loadReport(S)('setInterval@x.js:1',1500);
  assert.strictEqual(S.chainLog[0].desc,'LENT: timer setInterval@x.js:1 1.5s');
});
t('00 : LENT sans phase quand slowest <= 300 ms', ()=>{
  const S={chainLog:[],perf:{slowest:{name:'rendus home',ms:300}}}; loadReport(S)('setInterval@x.js:1',1200);
  assert.strictEqual(S.chainLog[0].desc,'LENT: timer setInterval@x.js:1 1.2s');
});
t('00 : LENT avec phase quand slowest > 300 ms', ()=>{
  const S={chainLog:[],perf:{slowest:{name:'evolution',ms:1234}}}; loadReport(S)('setInterval@01-chrono-network.js:350',1500);
  assert.strictEqual(S.chainLog[0].desc,'LENT: timer setInterval@01-chrono-network.js:350 1.5s \u00B7 phase evolution 1.2s');
});
t('00 : rotation chainLog 100 conservee', ()=>{
  const S={chainLog:Array.from({length:100},(_,i)=>({d:i})),perf:{slowest:{name:'x',ms:900}}}; loadReport(S)('t',2000);
  assert.strictEqual(S.chainLog.length,100); assert.ok(/phase x 0.9s/.test(S.chainLog[99].desc));
});
console.log(ok+'/'+n); if(ok!==n) process.exit(1);
