export async function askClaude({key,model,instructions,input,request=fetch}){
 if(!key||!model)throw Error('Configure ANTHROPIC_API_KEY e ANTHROPIC_MODEL.');
 const messages=input.map(({role,content})=>({role,content:typeof content==='string'?content:content.map(part=>part.type==='input_text'?{type:'text',text:part.text}:{type:'image',source:{type:'base64',media_type:'image/jpeg',data:part.image_url.split(',')[1]}})}));
 const response=await request('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'},signal:AbortSignal.timeout(90000),body:JSON.stringify({model,system:instructions,messages,max_tokens:4000})});
 if(!response.ok)return {error:response.status===401?'A chave do Claude foi recusada.':response.status===429?'Claude atingiu o limite de uso.':'Claude recusou a solicitação. Confira o modelo e os créditos.'};
 const result=await response.json();
 const answer=(result.content||[]).filter(p=>p.type==='text'&&typeof p.text==='string').map(p=>p.text).join('\n');
 return answer.trim()?{answer,incomplete:result.stop_reason==='max_tokens'}:{error:'Claude não retornou texto.'};
}
