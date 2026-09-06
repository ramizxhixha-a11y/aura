// banc-chrono-entrees.js — 06/09/2026 : extension chrono 00 (fetch / WebSocket / then)
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/js/00-backup-state.js','utf8');
const a=src.indexOf('(function _auraTimerChrono()'), b=src.indexOf('})();',a)+5;
const block=src.slice(a,b);
let n=0;const ok=m=>{n++;console.log('  ok',n,m)};
function mk(){
  function WS(){} let _h={};
  Object.defineProperty(WS.prototype,'onmessage',{configurable:true,set(f){_h.m=f},get(){return _h.m}});
  Object.defineProperty(WS.prototype,'onclose',{configurable:true,set(f){_h.c=f},get(){return _h.c}});
  const w={WebSocket:WS,Promise:Promise,Error:Error,String:String,Array:Array,Object:Object,Math:Math,Date:Date,JSON:JSON,
    performance:performance,setTimeout:(f,ms)=>{f();return 1},setInterval:(f,ms)=>1,requestAnimationFrame:f=>1,
    fetch:()=>Promise.resolve({status:200,json:()=>Promise.resolve({x:1})})};
  w.window=w; w.S={chainLog:[],perf:{}};
  const ctx=vm.createContext(w); vm.runInContext(block,ctx); return {w,ctx,h:_h};
}
const busy=ms=>{const t=Date.now();while(Date.now()-t<ms);};
(async()=>{
  // 1. syntaxe + wrappers poses
  let {w,h}=mk(); assert(w._auraTimerChronoOn); ok('bloc charge');
  assert(w.fetch.toString().indexOf('_oFetch')>=0); ok('fetch enveloppe');
  // 2. fetch -> marqueur 'fetch url' puis 'json url'
  const r=await w.fetch('https://api.binance.com/api/v3/klines?symbol=PEPEUSDT');
  assert.strictEqual(w._auraLastOp.name,'fetch api.binance.com/api/v3/klines'); ok('marqueur fetch sans query');
  const j=await r.json(); assert.deepStrictEqual(JSON.parse(JSON.stringify(j)),{x:1});
  assert.strictEqual(w._auraLastOp.name,'json api.binance.com/api/v3/klines'); ok('marqueur json + valeur intacte');
  // 3. fetch rejete propage
  await (mk().w.fetch)('x');
  ok('fetch chaine sans exception');
  // 4. WS onmessage lent -> LENT: ws.onmessage
  const ws=new w.WebSocket(); ws.onmessage=function(e){busy(1100);return 'r'};
  assert.strictEqual(h.m({}),'r');
  assert(w.S.chainLog.length===1 && /^LENT: ws\.onmessage@/.test(w.S.chainLog[0].desc), w.S.chainLog.map(x=>x.desc).join('|'));
  ok('ws.onmessage lent journalise : '+w.S.chainLog[0].desc);
  // 5. onclose=null tolere
  ws.onclose=null; assert.strictEqual(h.c,null); ok('onclose=null intact');
  // 6. then lent journalise avec site, valeur transmise
  const v=await Promise.resolve(5).then(x=>{busy(1050);return x*2});
  assert.strictEqual(v,10); assert.strictEqual(w.S.chainLog.length,2);
  assert(/^LENT: then@/.test(w.S.chainLog[1].desc)); ok('then lent journalise : '+w.S.chainLog[1].desc);
  // 7. then rapide : rien de plus ; rejet propage via then(undefined,fn)
  await Promise.resolve(1).then(x=>x); assert.strictEqual(w.S.chainLog.length,2);
  const e=await Promise.reject(new Error('boom')).then(undefined,er=>er.message); assert.strictEqual(e,'boom'); ok('then rapide silencieux, rejet propage');
  // 8. timers renommes 'timer ...' + phase
  w.S.perf.slowest={name:'evolution',ms:900};
  w.setTimeout(function(){busy(1050)},0);
  assert(/^LENT: timer setTimeout@.* \u00B7 phase evolution 0\.9s$/.test(w.S.chainLog[2].desc), w.S.chainLog[2].desc); ok('timer + phase : '+w.S.chainLog[2].desc);
  // 9. wrap absent sur WS sans setter (robustesse)
  const {w:w3}=mk(); assert(w3._auraTimerChronoOn); ok('reinstanciation isolee');
  console.log('banc-chrono-entrees '+n+'/'+n+' verts');
})().catch(e=>{console.error('ECHEC',e);process.exit(1)});
