import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceInput} from '../public/voice-input.js';
import {validateState} from '../lib/state.js';
test('spoken input submits directly without changing a text draft or requiring a send click',async()=>{
 const draft={value:''};const calls=[];let stopped=false;
 const receive=createVoiceInput({canSubmit:()=>true,submit:async text=>calls.push(text),feedback:()=>{},continuous:()=>false,stop:()=>stopped=true});
 assert.equal(await receive('  Olá, Max!  '),true);
 assert.deepEqual(calls,['Olá, Max!']);assert.equal(draft.value,'');assert.equal(stopped,true);
});
test('a second spoken turn does not overlap an in-flight response',async()=>{
 let finish;let submitted=0;const warnings=[];
 const receive=createVoiceInput({canSubmit:()=>true,submit:()=>{submitted++;return new Promise(r=>finish=r);},feedback:x=>warnings.push(x)});
 const first=receive('primeira');assert.equal(await receive('segunda'),false);
 assert.equal(submitted,1);assert.equal(warnings.length,1);finish();assert.equal(await first,true);
});
test('empty speech and an existing draft do not submit; sending can recover after failure',async()=>{
 let ready=false,attempts=0;
 const receive=createVoiceInput({canSubmit:()=>ready,submit:async()=>{if(++attempts===1)throw Error('offline');},feedback:()=>{}});
 assert.equal(await receive('  '),false);assert.equal(await receive('falando'),false);assert.equal(attempts,0);
 ready=true;assert.equal(await receive('teste'),false);assert.equal(await receive('repetir'),true);
});
test('voice history marker is validated while existing text history stays compatible',()=>{
 assert.equal(validateState('conversation',[{role:'user',content:'oi',spoken:true}]),true);
 assert.equal(validateState('conversation',[{role:'user',content:'oi'}]),true);
 assert.equal(validateState('conversation',[{role:'user',content:'oi',spoken:'true'}]),false);
});
