const $=id=>document.getElementById(id);
const boot=$('max-boot'),list=$('boot-modules'),start=$('boot-start'),retry=$('boot-retry'),skip=$('boot-skip'),summary=$('boot-summary');
const checks=[['core','Max Core'],['memory','Memória central'],['brain','Second Brain'],['voice','Voz'],['hearing','Audição'],['vision','Visão'],['avatar','Avatar'],['developer','Developer']];
let generation=0,controller;
const rows=new Map();
for(const [id,label] of checks){const row=document.createElement('li'),name=document.createElement('span'),value=document.createElement('span');name.textContent=label;value.textContent='Aguardando';row.append(name,value);list.append(row);rows.set(id,value);}
function set(id,value,state='neutral'){const el=rows.get(id);el.textContent=value;el.dataset.state=state;}
async function get(path,signal){const res=await fetch(path,{signal,cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);return res.json();}
async function diagnose(){
 const run=++generation;controller?.abort();controller=new AbortController();const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(8000)]);
 retry.disabled=true;start.disabled=true;summary.textContent='Conectando ao seu Max Core…';for(const [id] of checks)set(id,'Verificando');
 const apply=(id,value,state)=>{if(run===generation)set(id,value,state);};
 const status=get('/api/status',signal).then(data=>{
   apply('core',data.configured?'Configurado · '+data.providerName:'Configuração pendente',data.configured?'ok':'warn');
   apply('voice',data.voiceConfigured?'Provedor configurado':window.speechSynthesis?'Voz do navegador':'Indisponível',data.voiceConfigured?'ok':'warn');
   apply('hearing',data.hearingAvailable&&navigator.mediaDevices?.getUserMedia?'Disponível · requer permissão':'Configuração pendente','warn');
   apply('vision',data.configured&&data.provider==='openai'?'Disponível · requer permissão':'Não configurada','warn');
   apply('developer',window.maxDeveloper?'Painel local disponível':'Somente no desktop','neutral');
   return true;
 }).catch(()=>{for(const id of ['core','voice','hearing','vision','developer'])apply(id,'Não verificado','warn');return false;});
 const memory=get('/api/memory',signal).then(()=>apply('memory','Acessível','ok')).catch(()=>apply('memory','Não verificada','warn'));
 const brain=get('/api/state/brain',signal).then(data=>apply('brain',data.items.length+' notas acessíveis','ok')).catch(()=>apply('brain','Não verificado','warn'));
 const avatar=get('/api/avatar-status',signal).then(data=>apply('avatar',data.live2d?'Live2D disponível':'Avatar clássico',data.live2d?'ok':'neutral')).catch(()=>apply('avatar','Não verificado','warn'));
 const [connected]=await Promise.all([status,memory,brain,avatar]);
 if(run!==generation)return;summary.textContent=connected?'Oi! Vamos começar?':'Não consegui confirmar a conexão. Confira o Max Core.';start.disabled=!connected;retry.disabled=false;
}
function close(greet=false){generation++;controller?.abort();boot.hidden=true;try{sessionStorage.setItem('max.boot.seen','1');}catch{}$('message').focus();if(greet&&!$('greet-max').disabled)$('greet-max').click();}
start.onclick=()=>close(true);skip.onclick=()=>close();retry.onclick=()=>void diagnose();
let seen=false;try{seen=sessionStorage.getItem('max.boot.seen')==='1';}catch{}
if(!seen){boot.hidden=false;void diagnose();}
