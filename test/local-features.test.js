import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalVision} from '../lib/local-vision.js';
import {proposeLocally} from '../lib/local-developer.js';
const image='data:image/jpeg;base64,aGVsbG8=';
test('vision stays on loopback, uses CPU and unloads after a frame',async()=>{
 const calls=[];
 const vision=createLocalVision({request:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>url.endsWith('/api/tags')?{models:[{name:'moondream:1.8b',size:1700000000}]}:{message:{content:'A red square.'}}};
 }});
 assert.equal(await vision.describe(image),'A red square.');
 assert.ok(calls.every(c=>c.url.startsWith('http://127.0.0.1:11434/')));
 const body=JSON.parse(calls[1].options.body);
 assert.equal(body.options.num_gpu,0);assert.equal(body.keep_alive,0);
 assert.equal(body.messages[0].images[0],'aGVsbG8=');
});
test('vision refuses absent and cloud-only weights without inference',async()=>{
 let calls=0;
 const vision=createLocalVision({request:async()=>{calls++;return {ok:true,json:async()=>({models:[{name:'moondream:1.8b',size:1700000000,remote_host:'example.invalid'}]})};}});
 await assert.rejects(vision.describe(image),/ausente/);assert.equal(calls,1);
});
test('vision validates image before network access',async()=>{
 const vision=createLocalVision({request:()=>{throw Error('must not request');}});
 await assert.rejects(vision.describe('https://example.invalid/image'),/inválida/);
});
test('local developer rejects a truncated proposal',async()=>{
 await assert.rejects(proposeLocally({task:'fix',files:[],brain:{chat:async()=>({answer:'{}',incomplete:true})}}),/truncada/);
});
test('local developer respects cancellation before model access',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(proposeLocally({task:'fix',files:[],signal:controller.signal,brain:{chat:()=>{throw Error('must not request');}}}),/Cancelado/);
});
