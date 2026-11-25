import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceGate, encodeWav } from '../public/voice-gate.js';
test('silence does not emit speech',()=>{
  let count=0;const gate=new VoiceGate({onVoice:()=>count++});
  for(let i=0;i<100;i++)gate.push(new Float32Array(1024));
  assert.equal(count,0);
});
test('speech followed by silence emits one segment',()=>{
  let starts=0;const segments=[];
  const gate=new VoiceGate({onStart:()=>starts++,onVoice:frames=>segments.push(frames)});
  for(let i=0;i<7;i++)gate.push(new Float32Array(1024).fill(.12));
  for(let i=0;i<13;i++)gate.push(new Float32Array(1024));
  assert.equal(starts,1);assert.equal(segments.length,1);
});
test('WAV header and PCM length are valid',()=>{
  const wav=encodeWav([new Float32Array([0,.5,-.5,1])]);
  assert.equal(Buffer.from(wav.subarray(0,4)).toString(),'RIFF');
  assert.equal(wav.length,52);
  assert.equal(new DataView(wav.buffer).getUint32(40,true),8);
});
