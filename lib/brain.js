export const AREAS=Object.freeze({meta:'Perfil',metas:'Metas',trabalho:'Carreira',projetos:'Projetos',financas:'Finanças',aprendizado:'Estudos',saude:'Saúde',relacoes:'Relações'});
const words=text=>new Set(String(text).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]);
export function validBrain(notes){
 if(!Array.isArray(notes)||notes.length>250)return false;
 const ids=new Set();
 for(const n of notes){
  if(!n||typeof n.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(n.id)||ids.has(n.id)||!Object.hasOwn(AREAS,n.area)||typeof n.title!=='string'||!n.title.trim()||n.title.length>80||typeof n.body!=='string'||!n.body.trim()||n.body.length>2000||typeof n.useInChat!=='boolean'||!Array.isArray(n.links)||n.links.length>20||new Set(n.links).size!==n.links.length||!n.links.every(x=>typeof x==='string'&&x!==n.id))return false;
  ids.add(n.id);
 }
 return notes.every(n=>n.links.every(id=>ids.has(id)));
}
export function brainContext(notes,query,limit=4000){
 if(!validBrain(notes))return '';
 const terms=words(query);
 return notes.filter(n=>n.useInChat).map(n=>({n,score:[...words(n.title+' '+n.body)].filter(w=>terms.has(w)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12).map(({n})=>AREAS[n.area]+': '+n.title+' — '+n.body).join('\n').slice(0,limit);
}
