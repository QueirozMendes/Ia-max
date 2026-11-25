class MaxMicrophone extends AudioWorkletProcessor {
  constructor(){super();this.buffer=new Float32Array(1024);this.index=0;}
  process(inputs,outputs){
    const input=inputs[0]?.[0];
    if(input)for(const sample of input){this.buffer[this.index++]=sample;if(this.index===this.buffer.length){this.port.postMessage(this.buffer,[this.buffer.buffer]);this.buffer=new Float32Array(1024);this.index=0;}}
    for(const output of outputs)for(const channel of output)channel.fill(0);
    return true;
  }
}
registerProcessor('max-microphone',MaxMicrophone);
