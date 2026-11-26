import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
const root=new URL('../.runtime/',import.meta.url);
const python=fileURLToPath(new URL('voice/Scripts/python.exe',root));
const model=fileURLToPath(new URL('kokoro/kokoro-v1.0.onnx',root));
const voices=fileURLToPath(new URL('kokoro/voices-v1.0.bin',root));
const ready=fileURLToPath(new URL('kokoro/ready.json',root));
export const kokoroAvailable=()=>[python,model,voices,ready].every(existsSync);
let worker, sequence=0;
const pending=new Map();
function start(){
 if(worker)return worker;
 const child=spawn(python,['-u',fileURLToPath(new URL('../scripts/speak-kokoro.py',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,HF_HUB_OFFLINE:'1',OMP_NUM_THREADS:'4'}});
 worker=child;
 child.stderr.on('data',()=>{});
 child.stdin.on('error',()=>{});
 const lines=createInterface({input:child.stdout});
 lines.on('line',line=>{
  let data;try{data=JSON.parse(line);}catch{return;}
  const item=pending.get(data.id);if(!item)return;
  pending.delete(data.id);clearTimeout(item.timer);
  if(data.error||typeof data.audio!=='string')return item.reject(new Error('Voz local indisponível.'));
  const bytes=Buffer.from(data.audio,'base64');
  if(bytes.toString('ascii',0,4)!=='RIFF')return item.reject(new Error('Áudio local inválido.'));
  item.resolve(bytes);
 });
 const failed=()=>{
  if(worker!==child)return;
  worker=undefined;lines.close();
  for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('Voz local interrompida.'));}pending.clear();
 };
 child.once('error',failed);child.once('exit',failed);
 return child;
}
process.once('exit',()=>worker?.kill());
export function speakKokoro(text){
 if(typeof text!=='string'||!text.trim()||text.length>2400)return Promise.reject(new Error('Texto inválido.'));
 if(!kokoroAvailable())return Promise.reject(new Error('Voz neural não instalada.'));
 if(pending.size>=2)return Promise.reject(new Error('Voz ocupada.'));
 const child=start(),id=++sequence;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Tempo de voz excedido.'));child.kill();},90000);
  pending.set(id,{resolve,reject,timer});
  child.stdin.write(JSON.stringify({id,text})+'\n');
 });
}
