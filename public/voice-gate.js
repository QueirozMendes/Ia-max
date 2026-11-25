// Voice activity segmentation. Keeps a short pre-roll and discards silence.
export class VoiceGate {
  constructor({ sampleRate=16000, threshold=.018, silenceMs=700, minMs=300, maxMs=15000, onStart=()=>{}, onVoice=()=>{} }={}) {
    Object.assign(this,{sampleRate,threshold,silenceMs,minMs,maxMs,onStart,onVoice});
    this.reset();
  }
  reset() { this.pre=[]; this.frames=[]; this.active=false; this.hot=0; this.quiet=0; this.duration=0; this.voiced=0; this.noise=.004; }
  push(samples, playing=false) {
    const ms=samples.length/this.sampleRate*1000;
    const rms=Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/samples.length);
    const loud=rms>Math.max(this.threshold,this.noise*3.5,playing?.035:0);
    if (!this.active) {
      this.pre.push(samples.slice());
      while(this.pre.length>1 && this.pre.reduce((n,x)=>n+x.length,0)>this.sampleRate*.35) this.pre.shift();
      this.hot=loud?this.hot+ms:0;
      if(!loud && !playing) this.noise=.98*this.noise+.02*rms;
      if(this.hot>= (playing?240:160)) {
        this.active=true; this.frames=this.pre; this.pre=[]; this.duration=this.frames.reduce((n,x)=>n+x.length,0)/this.sampleRate*1000; this.voiced=this.hot; this.quiet=0; this.onStart();
      }
      return;
    }
    this.frames.push(samples.slice()); this.duration+=ms;
    if(loud){this.voiced+=ms;this.quiet=0;}else this.quiet+=ms;
    if(this.quiet>=this.silenceMs || this.duration>=this.maxMs) {
      const frames=this.frames, valid=this.voiced>=this.minMs;
      this.reset();
      if(valid)this.onVoice(frames);
    }
  }
}
export function encodeWav(frames,sampleRate=16000) {
  const count=frames.reduce((n,f)=>n+f.length,0), buffer=new ArrayBuffer(44+count*2), view=new DataView(buffer);
  const str=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
  str(0,'RIFF');view.setUint32(4,36+count*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,count*2,true);
  let offset=44;for(const f of frames)for(const x of f){view.setInt16(offset,Math.round(Math.max(-1,Math.min(1,x))*32767),true);offset+=2;}
  return new Uint8Array(buffer);
}
