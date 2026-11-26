import { VoiceGate, encodeWav } from './voice-gate.js';
export function createHearing({ status, onTranscript, onSpeech, playing, busy, acquire, label='Microfone' }) {
  let context, stream, node, source, controller, epoch=0, starting=false, gate, quietUntil=0;
  function stop(){
    epoch++; controller?.abort(); controller=undefined;
    node?.disconnect(); source?.disconnect(); stream?.getTracks().forEach(t=>t.stop());
    context?.close().catch(()=>{}); context=stream=node=source=gate=undefined;
    status(label+' desativado.');
  }
  async function transcribe(frames,rate,current){
    if(controller || busy() || current!==epoch)return;
    const wav=encodeWav(frames,rate);
    let binary='';for(let i=0;i<wav.length;i+=8192)binary+=String.fromCharCode(...wav.subarray(i,i+8192));
    const active=new AbortController();controller=active;
    try{
      status('Ouvi você · entendendo sua fala…');
      const response=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:btoa(binary)}),signal:active.signal});
      if(!response.ok)throw new Error('Não consegui entender a fala');
      const result=await response.json();
      if(current===epoch&&typeof result.text==='string'&&result.text.trim())onTranscript(result.text.trim());
      if(current===epoch)status(busy()?'Ouvi você · preparando sua resposta…':label+' ativo · escuta contínua.');
    }catch{if(current===epoch)status(label+' ativo · não consegui entender. Tente falar novamente.');}
    finally{if(controller===active)controller=undefined;}
  }
  async function start(){
    if(stream||starting)return;
    starting=true;const current=++epoch;
    try{
      const media=await (acquire?acquire():navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false}));
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
      node.port.onmessage=event=>{
        if(current!==epoch)return;
        // Half-duplex: never mistake Max's own loudspeaker output for a new user turn.
        if(playing()||busy()){quietUntil=performance.now()+900;gate.reset();return;}
        if(performance.now()<quietUntil||controller){gate.reset();return;}
        gate.push(event.data,false);
      };
      source.connect(node);node.connect(context.destination);
      status(label+' ativo · escuta contínua.');
    }catch(error){if(current===epoch){stop();status(error?.name==='NotAllowedError'?'Microfone bloqueado. Permita o acesso ao microfone nas configurações de privacidade do Windows.':'Não consegui abrir '+label.toLowerCase()+': '+(error?.message||'confira o dispositivo selecionado.'));}}
    finally{starting=false;}
  }
  window.addEventListener('pagehide',stop);
  return {start,stop,active:()=>Boolean(stream||starting)};
}
