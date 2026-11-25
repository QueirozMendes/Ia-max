const bounded=(value,fallback,min,max)=>{const n=Number(value);return value!==undefined&&value!==''&&Number.isInteger(n)&&n>=min&&n<=max?n:fallback;};
export function localConfig(env=process.env){
 const model=env.OLLAMA_MODEL||'qwen3:8b';
 const fallback=env.OLLAMA_FALLBACK_MODEL||'qwen3:4b';
 // Only local model tags; reject cloud tags and remote URLs.
 const valid=name=>typeof name==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.-]*(?:\/[a-zA-Z0-9_.-]+)?(?::[a-zA-Z0-9_.-]+)?$/.test(name)&&!/(?:^|[:-])cloud(?:$|[:-])/i.test(name);
 if(!valid(model)||!valid(fallback))throw Error('Use modelos Ollama locais, sem tags cloud.');
 return {model,fallback,context:bounded(env.MAX_LOCAL_CONTEXT,4096,2048,16384),threads:bounded(env.MAX_LOCAL_THREADS,8,1,64),keepAlive:bounded(env.MAX_LOCAL_KEEP_ALIVE,120,0,600),maxTokens:bounded(env.MAX_LOCAL_MAX_TOKENS,1024,256,4096)};
}
export function createLocalBrain({port,config,request=fetch}){
 const base='http://127.0.0.1:'+port;
 let busy=false;
 async function status(){
  try{
   const response=await request(base+'/api/tags',{signal:AbortSignal.timeout(2500),redirect:'error'});
   if(!response.ok)throw Error('HTTP');
   const result=await response.json();
   const models=Array.isArray(result.models)?result.models.filter(m=>m&&typeof m.name==='string'):null;
   if(!models)throw Error('Invalid tags');
   // Require locally stored model weights, not cloud-only entries.
   const installed=name=>models.some(m=>m.name===name&&!m.remote_model&&!m.remote_host&&Number(m.size)>100000000);
   const selected=installed(config.model)?config.model:installed(config.fallback)?config.fallback:null;
   return {reachable:true,ready:Boolean(selected),selected,preferred:config.model,fallback:config.fallback,busy,context:config.context,threads:config.threads};
  }catch{return {reachable:false,ready:false,selected:null,preferred:config.model,fallback:config.fallback,busy,context:config.context,threads:config.threads};}
 }
 async function chat({instructions,input,spoken=false}){
  if(busy)return {status:429,error:'A Max está processando outra conversa local.'};
  busy=true;
  try{
   const health=await status();
   if(!health.ready)return {status:503,error:health.reachable?'Baixe o modelo local '+config.model+' ou '+config.fallback+' no Ollama.':'Inicie o Ollama neste computador.'};
   const response=await request(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(240000),redirect:'error',body:JSON.stringify({model:health.selected,messages:[{role:'system',content:instructions},...input],stream:false,think:false,keep_alive:config.keepAlive,options:{num_ctx:config.context,num_thread:config.threads,num_predict:spoken?Math.min(384,config.maxTokens):config.maxTokens}})});
   if(!response.ok)return {status:502,error:'O Ollama não conseguiu executar o modelo local.'};
   const result=await response.json();
   const answer=result.message?.content;
   if(typeof answer!=='string'||!answer.trim())return {status:502,error:'O modelo local não retornou texto.'};
   return {answer,model:health.selected,incomplete:result.done_reason==='length'};
  }catch{return {status:502,error:'Falha na conexão local com Ollama. Nenhum provedor externo foi acionado.'};}
  finally{busy=false;}
 }
 return {status,chat};
}
