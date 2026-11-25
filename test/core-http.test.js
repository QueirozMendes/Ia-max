import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
async function portNumber(){
 const socket=createServer();
 socket.listen(0,'127.0.0.1');await once(socket,'listening');
 const port=socket.address().port;await new Promise((resolve,reject)=>socket.close(e=>e?reject(e):resolve()));return port;
}
test('Core HTTP, static modules, persistence and access controls',{timeout:40000},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'max-http-'));let child;
 try{
  for(const name of ['server.js','package.json','lib','public'])await cp(join(root,name),join(directory,name),{recursive:true});
  const port=await portNumber(),origin='http://127.0.0.1:'+port;
  const env={...process.env,PORT:String(port),MAX_PROVIDER:'openai',MAX_VOICE:'elevenlabs',OPENAI_API_KEY:'',ELEVENLABS_API_KEY:'',MAX_REMOTE_ORIGIN:'',MAX_REMOTE_PASSWORD:''};
  child=spawn(process.execPath,['server.js'],{cwd:directory,env,stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  const request=(path,options)=>fetch(origin+path,{...options,signal:AbortSignal.timeout(3000)});
  let ready=false;
  for(let i=0;i<100;i++){
   if(child.exitCode!==null)break;
   try{const r=await request('/api/status');if(r.ok){ready=true;break;}}catch{}
   await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(ready,output);
  const post=(path,body,from=origin)=>request(path,{method:'POST',headers:{Origin:from,'Content-Type':'application/json'},body:JSON.stringify(body)});
  for(const path of ['/','/app.js','/boot.js','/brain-ui.js','/mobile.js','/sw.js','/manifest.webmanifest','/avatar.js','/hearing.js','/companion.html']){
   const response=await request(path);assert.equal(response.status,200,path);assert.equal(response.headers.get('cache-control'),'no-store');await response.arrayBuffer();
  }
  assert.equal((await request('/.env')).status,404);
  const initial=await (await request('/api/memory')).json();assert.equal(initial.revision,null);
  assert.equal((await post('/api/memory',{memory:'teste',revision:null},'https://example.invalid')).status,403);
  const saved=await post('/api/memory',{memory:'teste',revision:null});assert.equal(saved.status,200);
  assert.equal((await post('/api/memory',{memory:'conflito',revision:null})).status,409);
  assert.equal((await (await request('/api/memory')).json()).memory,'teste');
  const note={id:'a',area:'projetos',title:'Python',body:'Automação de tarefas',links:[],useInChat:true};
  assert.equal((await post('/api/state/brain',{items:[note],revision:null})).status,200);
  assert.deepEqual((await (await request('/api/state/brain')).json()).items,[note]);
  assert.equal((await post('/api/state/brain',{items:[{...note,links:['missing']}],revision:null})).status,400);
  assert.equal((await request('/api/brain/links')).status,200);
  assert.equal((await post('/api/state/tasks',{items:[{id:'a',title:'Teste',done:false}],revision:null})).status,200);
  assert.equal((await post('/api/state/conversation',{items:[{role:'user',content:'Oi'}],revision:null})).status,200);
  assert.equal((await post('/api/memory/suggest',{message:'teste'})).status,503);
  assert.equal((await post('/api/voice',{text:'teste'})).status,503);
 }finally{
  if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}
  await rm(directory,{recursive:true,force:true});
 }
});
