const areas={meta:['Perfil','#8a90a6'],metas:['Metas','#fbbf24'],trabalho:['Carreira','#ff5547'],projetos:['Projetos','#8b7cff'],financas:['Finanças','#f7931a'],aprendizado:['Estudos','#2dd4ff'],saude:['Saúde','#10b981'],relacoes:['Relações','#ec4899']};
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
const panel=$('brain'), graph=$('brain-graph'), editor=$('brain-editor'), status=$('brain-status');
let notes=[],revision=null,selected=null,ready=false,busy=false,editing=false;
function svg(tag,attrs={},text){const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;}
function render(){
 const filter=$('brain-filter').value, shown=notes.filter(n=>!filter||n.area===filter);
 const visible=shown.slice(0,48), nodes=new Map(), canvas=svg('svg',{viewBox:'0 0 800 560',role:'group','aria-label':'Grafo de notas da Max'});
 const defs=svg('defs'),gradient=svg('radialGradient',{id:'brain-glow'});gradient.append(svg('stop',{offset:'0%','stop-color':'#c4a4ff','stop-opacity':'.8'}),svg('stop',{offset:'100%','stop-color':'#6c3dba','stop-opacity':'.2'}));defs.append(gradient);canvas.append(defs);
 const cx=400,cy=280;
 visible.forEach((n,i)=>{const ring=visible.length>18&&i>=18?1:0,count=ring?visible.length-18:Math.min(18,visible.length),j=ring?i-18:i,a=j*2*Math.PI/count-Math.PI/2;nodes.set(n.id,{x:cx+Math.cos(a)*(ring?345:245),y:cy+Math.sin(a)*(ring?235:170),n});});
 const edges=svg('g',{class:'brain-edges'});
 for(const {x,y,n} of nodes.values()){
  edges.append(svg('line',{x1:cx,y1:cy,x2:x,y2:y,stroke:areas[n.area][1],opacity:'.22'}));
  for(const id of n.links){const other=nodes.get(id);if(other)edges.append(svg('path',{d:'M'+x+' '+y+' Q'+cx+' '+cy+' '+other.x+' '+other.y,fill:'none',stroke:areas[n.area][1],class:'brain-edge'}));}
 }
 canvas.append(edges,svg('circle',{cx,cy,r:44,fill:'url(#brain-glow)',stroke:'#ba9ef4',class:'brain-core'}),svg('text',{x:cx,y:cy+5,'text-anchor':'middle',fill:'#fff','font-size':16},'MAX'));
 for(const {x,y,n} of nodes.values()){
  const group=svg('g',{tabindex:0,role:'button','aria-label':n.title,class:'brain-node'}),color=areas[n.area][1];
  group.append(svg('circle',{cx:x,cy:y,r:15+Math.min(n.links.length,8),fill:color,'fill-opacity':'.15',stroke:color,class:'brain-halo'}),svg('circle',{cx:x,cy:y,r:8,fill:color}),svg('text',{x,y:y+30,'text-anchor':'middle',fill:'#eee','font-size':12},n.title.slice(0,20)));
  group.addEventListener('click',()=>edit(n.id));group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();edit(n.id);}});canvas.append(group);
 }
 graph.replaceChildren(canvas);$('brain-count').textContent=notes.length+' notas · '+new Set(notes.map(n=>n.area)).size+' áreas'+(shown.length>48?' · grafo mostra 48; use o filtro ou a lista':'');
 const list=$('brain-list');list.replaceChildren(...shown.map(n=>{const b=document.createElement('button');b.type='button';b.textContent=areas[n.area][0]+' · '+n.title;b.addEventListener('click',()=>edit(n.id));return b;}));
}
function edit(id){
 const n=notes.find(n=>n.id===id);selected=n?.id||null;editing=true;editor.hidden=false;
 $('brain-title').value=n?.title||'';$('brain-area').value=n?.area||'meta';$('brain-body').value=n?.body||'';$('brain-context').checked=n?.useInChat||false;
 $('brain-links').replaceChildren(...notes.filter(x=>x.id!==selected).map(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=x.title;o.selected=Boolean(n?.links.includes(x.id));return o;}));
 $('brain-delete').hidden=!n;
}
function close(){editing=false;selected=null;editor.hidden=true;}
async function refresh(){if(busy||editing)return;try{const res=await fetch('/api/state/brain');if(!res.ok)throw Error();const data=await res.json();if(!editing&&!busy){notes=data.items;revision=data.revision;ready=true;render();status.textContent='Sincronizado com Max Core.';}}catch{status.textContent='Não foi possível sincronizar.';}}
async function save(next){
 if(!ready||busy)return;busy=true;
 try{const res=await fetch('/api/state/brain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:next,revision})});const data=await res.json();if(res.status===409){notes=data.items;revision=data.revision;close();render();status.textContent='Outro dispositivo alterou as notas. Revise e tente novamente.';return;}if(!res.ok)throw Error(data.error||'Não foi possível salvar');notes=data.items;revision=data.revision;close();render();status.textContent='Notas salvas no Max Core.';}catch(e){status.textContent=e.message;}finally{busy=false;}
}
for(const id of ['brain-filter','brain-area']){const el=$(id);for(const [key,[label]] of Object.entries(areas)){const o=document.createElement('option');o.value=key;o.textContent=label;el.append(o);}}
$('brain-filter').onchange=render;$('brain-add').onclick=()=>{if(ready&&!busy)edit(null);};$('brain-refresh').onclick=()=>{if(!editing)void refresh();};$('brain-cancel').onclick=close;
editor.onsubmit=e=>{e.preventDefault();const title=$('brain-title').value.trim(),body=$('brain-body').value.trim(),links=Array.from($('brain-links').selectedOptions,o=>o.value);if(!title||!body||links.length>20){status.textContent='Preencha título e conteúdo e selecione até 20 conexões.';return;}const n={id:selected||crypto.randomUUID(),area:$('brain-area').value,title,body,useInChat:$('brain-context').checked,links};void save(selected?notes.map(x=>x.id===selected?n:x):[...notes,n]);};
$('brain-delete').onclick=()=>{if(selected&&confirm('Excluir esta nota e suas conexões?'))void save(notes.filter(x=>x.id!==selected).map(x=>({...x,links:x.links.filter(id=>id!==selected)})));};
document.querySelector('[data-panel="brain"]').addEventListener('click',()=>void refresh());
setInterval(()=>{if(!panel.hidden&&!document.hidden)void refresh();},10000);
