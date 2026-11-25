import { rankNotes } from './neural.js';
export const AREAS=Object.freeze({meta:'Perfil',metas:'Metas',trabalho:'Carreira',projetos:'Projetos',financas:'Finanças',aprendizado:'Estudos',saude:'Saúde',relacoes:'Relações'});
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
 const lines=[];let remaining=limit;
 for(const {note:n} of rankNotes(notes,query).slice(0,12)){
  const line=AREAS[n.area]+': '+n.title+' — '+n.body;
  if(line.length+1>remaining)continue;
  lines.push(line);remaining-=line.length+1;
 }
 return lines.join('\n');
}
