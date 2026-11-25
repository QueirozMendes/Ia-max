import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseBrain, brainOptions } from '../lib/brain-router.js';
const keys={openai:true,claude:true,openrouter:true};
test('automatic routing never spends on ordinary or coding conversations',()=>{
 for(const coding of [false,true])assert.deepEqual(chooseBrain({mode:'auto',keys,coding,allowCloud:true}),{provider:'ollama',useCodex:false});
});
test('cloud must be enabled and explicitly selected',()=>{
 assert.ok(chooseBrain({mode:'auto',requested:'claude',keys}).error);
 assert.ok(chooseBrain({mode:'auto',search:true,keys,allowCloud:true}).error);
 assert.ok(chooseBrain({mode:'auto',image:true,keys,allowCloud:true}).error);
 assert.deepEqual(chooseBrain({mode:'auto',requested:'claude',keys,allowCloud:true}),{provider:'claude',useCodex:false});
 assert.deepEqual(chooseBrain({mode:'auto',requested:'codex',keys,allowCloud:true}),{provider:'openai',useCodex:true});
 assert.ok(chooseBrain({mode:'auto',requested:'codex',keys,allowCloud:true,image:true}).error);
 assert.ok(chooseBrain({mode:'auto',requested:'openai',allowCloud:true}).error);
});
test('only configured and authorized brains are offered',()=>{
 assert.deepEqual(brainOptions({keys}),['local']);
 assert.deepEqual(brainOptions({allowCloud:true,keys:{claude:true}}),['local','claude']);
});
