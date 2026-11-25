import { VoiceGate, encodeWav } from './voice-gate.js';
export function createHearing({ status, onTranscript, onSpeech, playing, busy }) {
  let context, stream, node, source, controller, epoch=0, starting=false, gate;
  function stop(){
    epoch++; controller?.abort(); controller=undefined;
    node?.disconnect(); source?.disconnect(); stream?.getTracks().forEach(t=>t.stop());
    context?.close().catch(()=>{}); context=stream=node=source=gate=undefined;
    status('Microfone desativado.');
  }
  async function transcribe(frames,rate,current){
    if(controller || busy() || current!==epoch)return;
    const wav=encodeWav(frames,rate);
    let binary='';for(let i=0;i<wav.length;i+=8192)binary+=String.fromCharCode(...wav.subarray(i,i+8192));
    const active=new AbortController();controller=active;
    try{
      status('Microfone ativo · interpretando fala.');
      const response=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:btoa(binary)}),signal:active.signal});
      if(!response.ok)throw new Error('Transcrição indisponível');
      const result=await response.json();
      if(current===epoch&&typeof result.text==='string'&&result.text.trim())onTranscript(result.text.trim());
      if(current===epoch)status('Microfone ativo · escuta contínua.');
    }catch{if(current===epoch)status('Microfone ativo · transcrição indisponível.');}
    finally{if(controller===active)controller=undefined;}
  }
  async function start(){
    if(stream||starting)return;
    starting=true;const current=++epoch;
    try{
      const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
      if(current!==epoch){media.getTracks().forEach(t=>t.stop());return;}
      stream=media;
      for(const t of stream.getTracks())t.addEventListener('ended',stop,{once:true});
      context=new AudioContext({sampleRate:16000});
      await context.audioWorklet.addModule('/mic-worklet.js');
      if(current!==epoch)return;
      await context.resume();
      if(current!==epoch)return;
      const rate=context.sampleRate;
      gate=new VoiceGate({sampleRate:rate,onStart:onSpeech,onVoice:frames=>void transcribe(frames,rate,current)});
      source=context.createMediaStreamSource(stream);
      node=new AudioWorkletNode(context,'max-microphone');
      node.port.onmessage=event=>{if(current===epoch)gate.push(event.data,playing());};
      source.connect(node);node.connect(context.destination);
      status('Microfone ativo · escuta contínua.');
    }catch{if(current===epoch){stop();status('Não consegui abrir o microfone. Confira as permissões.');}}
    finally{starting=false;}
  }
  window.addEventListener('pagehide',stop);
  return {start,stop,active:()=>Boolean(stream||starting)};
}
