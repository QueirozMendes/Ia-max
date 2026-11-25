import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessPolicy } from '../lib/access.js';
import { memorySuggestions } from '../lib/living-memory.js';
import { validBrain } from '../lib/brain.js';
test('remote access requires correct password and origin',()=>{
 const port=4173,remoteOrigin='https://max.example.ts.net',password='test-only-password-0123456789';
 const policy=createAccessPolicy({port,remoteOrigin,password});
 const authorization='Basic '+Buffer.from('max:'+password).toString('base64');
 assert.equal(policy.authorize({host:'max.example.ts.net'}).status,401);
 assert.equal(policy.authorize({host:'127.0.0.1:4173'}).status,401);
 assert.equal(policy.authorize({host:'max.example.ts.net',authorization}).origin,remoteOrigin);
 assert.equal(policy.authorize({host:'other.example',authorization}).status,403);
 assert.throws(()=>createAccessPolicy({port,remoteOrigin,password:'short'}));
});
test('living memory rejects duplicate and credential suggestions',()=>{
 const notes=[{id:'a',area:'aprendizado',title:'Python',body:'Estuda Python',useInChat:true,links:[]}];
 assert.equal(validBrain(notes),true);
 assert.deepEqual(memorySuggestions([{area:'aprendizado',title:'Python',body:'Estuda Python'},{area:'meta',title:'Senha',body:'teste'}],notes),[]);
 const result=memorySuggestions([{area:'aprendizado',title:'Python',body:'Estuda Python e SQL'}],notes);
 assert.equal(result[0].existingId,'a');
});
