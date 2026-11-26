const panel=document.getElementById('autonomy-panel');
if(window.maxAutonomy&&panel){
 panel.hidden=false;
 const toggle=document.getElementById('autonomy-enabled'),status=document.getElementById('autonomy-status'),list=document.getElementById('autonomy-notes');
 let lastEnabled;
 function render(data){
  toggle.checked=data.enabled;
  window.dispatchEvent(new CustomEvent('max:idle',{detail:{enabled:data.enabled,idleSeconds:data.idleSeconds}}));
  status.textContent=data.working?'Estudando uma fonte pública…':data.enabled?'Ativa: aprende após 2 minutos sem uso, até 3 estudos por dia. Pausa quando você volta.':'Autonomia pausada.';
  if(data.lastError)status.textContent+=' '+data.lastError;
  list.replaceChildren(...data.notes.map(note=>{
   const item=document.createElement('li'),title=document.createElement('strong'),body=document.createElement('p'),link=document.createElement('a');
   title.textContent=note.title;body.textContent=note.body;link.textContent='Fonte do estudo';link.href=note.source;link.target='_blank';link.rel='noopener noreferrer';item.append(title,body,link);return item;
  }));
  if(lastEnabled!==data.enabled){lastEnabled=data.enabled;window.dispatchEvent(new CustomEvent('max:autonomy',{detail:{enabled:data.enabled}}));}
 }
 toggle.onchange=async()=>{toggle.disabled=true;try{render(await window.maxAutonomy.setEnabled(toggle.checked));}catch{status.textContent='Não foi possível alterar a autonomia.';}finally{toggle.disabled=false;}};
 const refresh=()=>window.maxAutonomy.status().then(render).catch(()=>{status.textContent='Autonomia indisponível nesta sessão.';});
 void refresh();setInterval(refresh,10000);
}
