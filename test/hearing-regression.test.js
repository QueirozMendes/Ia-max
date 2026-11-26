import test from 'node:test';
import assert from 'node:assert/strict';
import {createHearing} from '../public/hearing.js';
test('microphone ignores playback, its echo tail and busy responses, then resumes speech',async()=>{
 let processor,time=0,playing=true,busy=false,starts=0,requests=0,stopped=0;
 const descriptors=Object.fromEntries(['window','navigator','AudioContext','AudioWorkletNode','fetch','performance'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const install=(key,value)=>Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
 const source={connect(){},disconnect(){}};
 const track={stop(){stopped++},addEventListener(){}};
 install('window',{addEventListener(){}});
 install('navigator',{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track]})}});
 install('performance',{now:()=>time});
 install('AudioContext',class{sampleRate=16000;audioWorklet={addModule:async()=>{}};resume=async()=>{};close=async()=>{};createMediaStreamSource=()=>source;destination={};});
 install('AudioWorkletNode',class{constructor(){processor=this;}port={};connect(){}disconnect(){}});
 install('fetch',async()=>{requests++;return{ok:true,json:async()=>({text:'Oi Max'})};});
 const transcripts=[];
 try{
  const hearing=createHearing({status(){},onTranscript:x=>transcripts.push(x),onSpeech:()=>starts++,playing:()=>playing,busy:()=>busy});
  await hearing.start();assert.equal(hearing.active(),true);
  const feed=(value,n=8)=>{for(let i=0;i<n;i++)processor.port.onmessage({data:new Float32Array(1600).fill(value)});};
  feed(.15);assert.equal(starts,0);
  playing=false;time=500;feed(.15);assert.equal(starts,0);
  busy=true;time=1200;feed(.15);assert.equal(starts,0);
  busy=false;time=2200;feed(.15);feed(0,9);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(starts,1);assert.equal(requests,1);assert.deepEqual(transcripts,['Oi Max']);
  hearing.stop();assert.equal(hearing.active(),false);assert.ok(stopped>0);
 }finally{for(const [key,value]of Object.entries(descriptors)){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
