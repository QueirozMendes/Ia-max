const STOP=new Set('que para com por uma uns umas dos das nos nas como mais muito isso isto essa esse esta este meu minha meus minhas seu sua seus suas sobre entre pelo pela pelos pelas ser ter fazer estou esta estao foi sao nao sim voce agora ainda tambem quando onde qual quais quero pode deve vou tem tudo algo aqui hoje cada'.split(' '));
export function tokens(value){
 return new Set((String(value).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]).filter(w=>!STOP.has(w)));
}
function index(notes){
 const entries=notes.map(n=>({n,title:tokens(n.title),terms:tokens(n.title+' '+n.body)}));
 const df=new Map();
 for(const e of entries)for(const t of e.terms)df.set(t,(df.get(t)||0)+1);
 return {entries,weight:t=>1+Math.log((entries.length+1)/((df.get(t)||0)+1))};
}
export function rankNotes(notes,query){
 const {entries,weight}=index(notes.filter(n=>n.useInChat)),terms=tokens(query);
 const direct=new Map(),result=new Map();
 for(const e of entries){
  let score=0;
  for(const t of terms)if(e.terms.has(t))score+=weight(t)*(e.title.has(t)?2:1);
  if(score>0){direct.set(e.n.id,score);result.set(e.n.id,score);}
 }
 // One hop through confirmed links, never through private notes.
 for(const e of entries)for(const id of e.n.links){
  if(!entries.some(x=>x.n.id===id))continue;
  if(direct.has(id))result.set(e.n.id,Math.max(result.get(e.n.id)||0,direct.get(id)*.25));
  if(direct.has(e.n.id))result.set(id,Math.max(result.get(id)||0,direct.get(e.n.id)*.25));
 }
 return entries.filter(e=>result.has(e.n.id)).map(e=>({note:e.n,score:result.get(e.n.id),direct:direct.has(e.n.id)})).sort((a,b)=>b.score-a.score||a.note.id.localeCompare(b.note.id));
}
export function suggestLinks(notes,max=24){
 const {entries,weight}=index(notes);
 const candidates=[];
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const a=entries[i],b=entries[j];
  if(a.n.links.includes(b.n.id)||b.n.links.includes(a.n.id))continue;
  const common=[...a.terms].filter(t=>b.terms.has(t));
  if(common.length<2)continue;
  const overlap=common.reduce((sum,t)=>sum+weight(t),0);
  const total=new Set([...a.terms,...b.terms]).size;
  const score=overlap/Math.max(1,total);
  if(score<.15)continue;
  candidates.push({from:a.n.id,to:b.n.id,score,terms:common.sort((x,y)=>weight(y)-weight(x)).slice(0,4)});
 }
 return candidates.sort((a,b)=>b.score-a.score||a.from.localeCompare(b.from)||a.to.localeCompare(b.to)).slice(0,max);
}
