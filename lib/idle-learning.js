import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {rankNotes} from './neural.js';
export const learningSources=Object.freeze([
 {title:'Funções em JavaScript',url:'https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/javascript/guide/functions/index.md'},
 {title:'Promises em JavaScript',url:'https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/javascript/reference/global_objects/promise/index.md'},
 {title:'Uso de modelos locais',url:'https://raw.githubusercontent.com/ollama/ollama/main/README.md'}
]);
export async function learningContext(directory,query){
 try{
  const state=JSON.parse(await readFile(join(directory,'state.json'),'utf8'));
  const notes=(Array.isArray(state.notes)?state.notes:[]).filter(n=>n&&typeof n.title==='string'&&typeof n.body==='string'&&learningSources.some(s=>s.url===n.source)).slice(0,40).map(n=>({...n,id:String(n.id),links:[],useInChat:true}));
  return rankNotes(notes,query).slice(0,2).map(({note})=>({title:note.title.slice(0,100),summary:note.body.slice(0,1200),source:note.source,reviewed:false}));
 }catch{return [];}
}
export function createIdleLearning({directory,idle,locked,busy=()=>false,summarize,request=fetch,now=Date.now}){
 let state={enabled:true,lastAttempt:0,day:'',runs:0,nextSource:0,notes:[],lastError:''};
 let paused=false,working=false,controller,writeQueue=Promise.resolve();
 const path=join(directory,'state.json');
 const ready=readFile(path,'utf8').then(text=>{
  const data=JSON.parse(text);
  if(typeof data.enabled==='boolean')state.enabled=data.enabled;
  if(Number.isFinite(data.lastAttempt))state.lastAttempt=data.lastAttempt;
  if(typeof data.day==='string')state.day=data.day;
  if(Number.isInteger(data.runs)&&data.runs>=0)state.runs=data.runs;
  if(Number.isInteger(data.nextSource)&&data.nextSource>=0)state.nextSource=data.nextSource;
  if(Array.isArray(data.notes))state.notes=data.notes.filter(n=>n&&typeof n.title==='string'&&typeof n.body==='string'&&learningSources.some(s=>s.url===n.source)).slice(0,40);
 }).catch(error=>{if(error.code!=='ENOENT'){state.enabled=false;state.lastError='Configuração de autonomia precisa de revisão.';}});
 const permitted=()=>state.enabled&&!paused&&!locked()&&!busy()&&idle()>=120;
 function persist(){
  const text=JSON.stringify(state,null,2);
  writeQueue=writeQueue.catch(()=>{}).then(async()=>{
   await mkdir(directory,{recursive:true});const tmp=path+'.'+randomUUID()+'.tmp';
   try{await writeFile(tmp,text,{flag:'wx',mode:0o600});await rename(tmp,path);}finally{await unlink(tmp).catch(()=>{});}
  });return writeQueue;
 }
 async function status(){await ready;return {enabled:state.enabled&&!paused,paused,working,idleSeconds:Math.floor(idle()),minimumIdle:120,intervalMinutes:30,dailyLimit:3,runs:state.runs,lastError:state.lastError,notes:state.notes.slice(0,10)};}
 async function setEnabled(enabled){
  if(typeof enabled!=='boolean')throw Error('Estado inválido');await ready;
  state.enabled=enabled;paused=false;if(!enabled)controller?.abort();await persist();return status();
 }
 function pause(){paused=true;controller?.abort();}
 async function tick(){
  await ready;
  if(working||!permitted())return {ran:false};
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',dateStyle:'short'}).format(new Date(now()));
  if(state.day!==day){state.day=day;state.runs=0;}
  if(state.runs>=3||state.lastAttempt&&now()-state.lastAttempt<1800000)return {ran:false};
  working=true;state.lastAttempt=now();state.lastError='';
  const current=new AbortController();controller=current;
  const signal=AbortSignal.any([current.signal,AbortSignal.timeout(180000)]);
  const monitor=setInterval(()=>{if(!permitted())current.abort();},1000);
  const check=()=>{if(signal.aborted||!permitted())throw Error('paused');};
  try{
   check();const source=learningSources[state.nextSource%learningSources.length];
   const response=await request(source.url,{signal,redirect:'error',headers:{Accept:'text/plain'}});
   if(!response.ok)throw Error('source');const text=await response.text();
   if(text.length>512000)throw Error('size');check();
   const result=await summarize({source,text:text.slice(0,16000),signal});check();
   if(typeof result?.title!=='string'||typeof result.body!=='string'||!result.body.trim())throw Error('summary');
   const note={id:randomUUID(),title:result.title.slice(0,100),body:result.body.slice(0,3500),source:source.url,createdAt:new Date(now()).toISOString(),reviewed:false};
   state.notes=[note,...state.notes].slice(0,40);state.runs++;state.nextSource++;await persist();
   return {ran:true,note};
  }catch{
   state.lastError=signal.aborted||!permitted()?'Estudo pausado quando você voltou ou pausou a autonomia.':'Não foi possível concluir o estudo desta vez.';
   await persist();return {ran:false,paused:signal.aborted||!permitted()};
  }finally{clearInterval(monitor);if(controller===current)controller=undefined;working=false;}
 }
 return {status,setEnabled,pause,tick};
}
