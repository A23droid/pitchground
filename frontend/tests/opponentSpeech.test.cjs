/* Audio and provider doubles are confined to tests. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const javascript=ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../lib/opponentSpeech.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function setup({ok=true,detail='Voice unavailable',blocked=false,deferred=false}={}) {
  const instances=[],requests=[],revoked=[];
  let release;
  class Audio {
    constructor(url){this.url=url;instances.push(this);}
    async play(){if(blocked)throw Error('autoplay');}
    pause(){this.paused=true;}
    removeAttribute(){}
    load(){}
  }
  const module={exports:{}};
  const authFetch=async(path,options)=>{requests.push({path,options});if(deferred)await new Promise(r=>release=r);return {ok,json:async()=>({detail}),blob:async()=>({size:100,type:'audio/wav'})};};
  vm.runInNewContext(javascript,{module,exports:module.exports,require:()=>({authFetch}),AbortController,Audio,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:u=>revoked.push(u)}});
  const calls={starts:0,ends:0,errors:[]};
  return {...module.exports,instances,requests,revoked,release:()=>release(),calls,callbacks:{onStart:()=>calls.starts++,onEnd:()=>calls.ends++,onError:e=>calls.errors.push(e)}};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('authenticated synthesis uses the exact reply and language; completion follows audio events',async()=>{
  const s=setup();s.speakOpponent('मेरा तर्क।','Hindi',s.callbacks);await flush();
  assert.equal(s.requests[0].path,'/v1/debate/speech');assert.deepEqual(JSON.parse(s.requests[0].options.body),{text:'मेरा तर्क।',language:'Hindi'});
  assert.equal(s.calls.starts,0);s.instances[0].onplaying();assert.equal(s.calls.starts,1);
  s.instances[0].onended();assert.equal(s.calls.ends,1);assert.equal(s.revoked.length,1);
});
test('provider failure is visible without fabricated speech completion',async()=>{
  const s=setup({ok:false,detail:'Sarvam key rejected'});s.speakOpponent('Reply','English',s.callbacks);await flush();assert.match(s.calls.errors[0],/key rejected/);assert.equal(s.calls.ends,0);
});
test('autoplay rejection preserves cached audio for user initiated replay',async()=>{
  const s=setup({blocked:true});s.speakOpponent('Reply','English',s.callbacks);await flush();assert.match(s.calls.errors[0],/Press Play voice/);
  s.speakOpponent('Reply','English',s.callbacks);await flush();assert.equal(s.requests.length,1);
});
test('cancel aborts pending synthesis and prevents late playback',async()=>{
  const s=setup({deferred:true});const speech=s.speakOpponent('Reply','English',s.callbacks);speech.cancel();s.release();await flush();
  assert.equal(s.requests[0].options.signal.aborted,true);assert.equal(s.instances.length,0);assert.equal(s.calls.errors.length,0);
});
test('cancel pauses playback, releases audio URL and ignores late completion',async()=>{
  const s=setup();const speech=s.speakOpponent('Reply','English',s.callbacks);await flush();const end=s.instances[0].onended;speech.cancel();end();assert.equal(s.instances[0].paused,true);assert.equal(s.revoked.length,1);assert.equal(s.calls.ends,0);
});
test('replay reuses synthesized audio',async()=>{
  const s=setup();s.speakOpponent('Reply','Malayalam',s.callbacks);await flush();s.instances[0].onended();s.speakOpponent('Reply','Malayalam',s.callbacks);await flush();assert.equal(s.requests.length,1);assert.equal(s.instances.length,2);
});


test('starting another voice cancels the old one and recording can stop all playback',async()=>{
  const s=setup();let cancelled=0;
  s.speakOpponent('First reply','Hindi',{...s.callbacks,onCancel:()=>cancelled++});await flush();
  s.speakOpponent('Second reply','English',s.callbacks);await flush();
  assert.equal(cancelled,1);assert.equal(s.instances[0].paused,true);
  s.stopSpeechPlayback();assert.equal(s.instances[1].paused,true);
});
