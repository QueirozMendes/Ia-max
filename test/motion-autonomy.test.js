import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {resolveParameters} from '../public/live2d-parameters.js';
import {createIdleLearning,learningContext,learningSources} from '../lib/idle-learning.js';
test('Epsilon legacy mouth and body IDs resolve to real parameters instead of virtual missing IDs',()=>{
 const ids=['PARAM_MOUTH_OPEN_Y','PARAM_BODY_ANGLE_X','PARAM_BREATH'];
 const core={getParameterCount:()=>ids.length,getParameterIndex:id=>ids.includes(id)?ids.indexOf(id):ids.length};
 const mapped=resolveParameters(core);
 assert.equal(mapped.ParamMouthOpenY,'PARAM_MOUTH_OPEN_Y');assert.equal(mapped.ParamBodyAngleX,'PARAM_BODY_ANGLE_X');assert.equal(mapped.ParamBreath,'PARAM_BREATH');assert.equal(mapped.ParamAngleX,undefined);
});
test('modern model IDs remain supported and negative missing IDs are rejected',()=>{
 const core={getParameterCount:()=>1,getParameterIndex:id=>id==='ParamMouthOpenY'?0:-1};
 assert.equal(resolveParameters(core).ParamMouthOpenY,'ParamMouthOpenY');assert.equal(resolveParameters(core).ParamAngleX,undefined);
});
test('idle learning waits for inactivity, uses fixed public URLs, persists sourced notes and respects cooldown',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'max-idle-'));let seconds=0,requests=0;
 const agent=createIdleLearning({directory,idle:()=>seconds,locked:()=>false,request:async(url,opts)=>{
  requests++;assert.ok(learningSources.some(s=>s.url===url));assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,undefined);return {ok:true,text:async()=> 'JavaScript functions receive parameters.'};
 },summarize:async()=>({title:'Funções JavaScript',body:'Funções recebem parâmetros e retornam valores.'})});
 try{
  assert.equal((await agent.tick()).ran,false);assert.equal(requests,0);
  seconds=180;assert.equal((await agent.tick()).ran,true);assert.equal((await agent.tick()).ran,false);assert.equal(requests,1);
  const stored=await learningContext(directory,'JavaScript funções');assert.equal(stored.length,1);assert.equal(stored[0].source,learningSources[0].url);assert.equal(stored[0].reviewed,false);
  await agent.setEnabled(false);assert.equal((await agent.tick()).ran,false);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('returning to the computer cancels an in-progress study before the summary or persistence',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'max-idle-cancel-'));let seconds=180,summaries=0;
 const agent=createIdleLearning({directory,idle:()=>seconds,locked:()=>false,request:async()=>({ok:true,text:async()=>{seconds=0;return 'Public documentation';}}),summarize:async()=>{summaries++;return {title:'x',body:'y'};}});
 try{assert.equal((await agent.tick()).ran,false);assert.equal(summaries,0);assert.equal((await agent.status()).notes.length,0);}finally{await rm(directory,{recursive:true,force:true});}
});
test('locked desktop and current speech never trigger background reads',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'max-idle-lock-'));let isLocked=true,isBusy=false;
 const agent=createIdleLearning({directory,idle:()=>999,locked:()=>isLocked,busy:()=>isBusy,request:async()=>{throw Error('must not run');},summarize:async()=>{throw Error('must not run');}});
 try{assert.equal((await agent.tick()).ran,false);isLocked=false;isBusy=true;assert.equal((await agent.tick()).ran,false);}finally{await rm(directory,{recursive:true,force:true});}
});
