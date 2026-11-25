export function chooseBrain({mode,requested,allowCloud=false,search=false,image=false,coding=false,keys={}}){
 if(mode!=='auto')return {provider:mode,useCodex:coding===true&&Boolean(keys.openai)};
 const target=requested||'local';
 if(!['local','openai','claude','codex','openrouter'].includes(target))return {error:'Inteligência inválida.'};
 if(target==='local'){
  if(search||image)return {error:'Pesquisa e fotos precisam de uma inteligência compatível escolhida explicitamente. A Max não enviará dados à nuvem automaticamente.'};
  return {provider:'ollama',useCodex:false};
 }
 if(!allowCloud)return {error:'Inteligências externas bloqueadas no Core.'};
 const provider=target==='codex'?'openai':target;
 if(!keys[provider])return {error:'Inteligência externa não configurada.'};
 if((search&&target!=='openai')||(image&&!['openai','claude'].includes(target)))return {error:'A inteligência escolhida não suporta esta função.'};
 return {provider,useCodex:target==='codex'};
}
export function brainOptions({allowCloud=false,keys={}}){
 return ['local',...(allowCloud?['openai','claude','codex','openrouter'].filter(p=>keys[p==='codex'?'openai':p]):[])];
}
