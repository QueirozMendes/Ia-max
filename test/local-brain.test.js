import test from 'node:test';
import assert from 'node:assert/strict';
import { localConfig, createLocalBrain } from '../lib/local-brain.js';
const config=localConfig({});
const json=value=>({ok:true,json:async()=>value});
const model=name=>({name,size:5200000000});
test('local profile defaults and rejects cloud tags',()=>{
 assert.equal(config.model,'qwen3:8b');
 assert.equal(config.context,4096);
 assert.equal(localConfig({MAX_LOCAL_CONTEXT:'999999'}).context,4096);
 assert.throws(()=>localConfig({OLLAMA_MODEL:'qwen3:cloud'}));
});
test('local brain uses installed fallback and never sends request outside loopback',async()=>{
 const brain=createLocalBrain({port:11434,config,request:async(url,options)=>{
  assert.ok(url.startsWith('http://127.0.0.1:11434/'));
  assert.equal(options.redirect,'error');
  if(url.endsWith('/tags'))return json({models:[model(config.fallback)]});
  const body=JSON.parse(options.body);
  assert.equal(body.model,config.fallback);
  assert.equal(body.options.num_ctx,4096);
  assert.equal(body.think,false);
  assert.equal(body.messages[0].content,'Max');
  return json({message:{content:'Oi!'},done_reason:'stop'});
 }});
 assert.equal((await brain.status()).selected,config.fallback);
 assert.equal((await brain.chat({instructions:'Max',input:[{role:'user',content:'Oi'}]})).answer,'Oi!');
});
test('missing or cloud-only model does not invoke generation',async()=>{
 const brain=createLocalBrain({port:11434,config,request:async(url)=>{
  assert.ok(url.endsWith('/tags'));
  return json({models:[{...model(config.model),remote_model:'remote'}]});
 }});
 assert.equal((await brain.chat({instructions:'Max',input:[]})).status,503);
});
test('local inference rejects concurrent turns',async()=>{
 let release;
 const waiting=new Promise(resolve=>release=resolve);
 const brain=createLocalBrain({port:11434,config,request:async(url)=>{
  if(url.endsWith('/tags'))return json({models:[model(config.model)]});
  await waiting;return json({message:{content:'Oi'}});
 }});
 const first=brain.chat({instructions:'Max',input:[]});
 try{assert.equal((await brain.chat({instructions:'Max',input:[]})).status,429);}
 finally{release();await first;}
});
