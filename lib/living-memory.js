import { AREAS } from './brain.js';
const normalize=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
export function memorySuggestions(raw,notes){
 if(!Array.isArray(raw))return [];
 const result=[],seen=new Set();
 for(const item of raw.slice(0,3)){
  if(!item||!Object.hasOwn(AREAS,item.area)||typeof item.title!=='string'||typeof item.body!=='string')continue;
  const title=item.title.trim(),body=item.body.trim(),key=item.area+':'+normalize(title);
  if(!title||title.length>80||!body||body.length>1000||seen.has(key))continue;
  if(/(?:senha|password|api.?key|token|cpf|cart[aã]o de cr[eé]dito|chave privada)/i.test(title+' '+body))continue;
  const existing=notes.find(n=>n.useInChat&&n.area===item.area&&normalize(n.title)===normalize(title));
  if(existing&&normalize(existing.body)===normalize(body))continue;
  seen.add(key);
  result.push({area:item.area,title,body,existingId:existing?.id||null});
 }
 return result;
}
