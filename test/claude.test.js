import test from 'node:test';
import assert from 'node:assert/strict';
import { askClaude } from '../lib/claude.js';
test('Claude receives shared identity and converts photos',async()=>{
 const result=await askClaude({key:'test',model:'test-model',instructions:'Você é Max',input:[{role:'user',content:'Contexto'},{role:'user',content:[{type:'input_text',text:'Oi'},{type:'input_image',image_url:'data:image/jpeg;base64,YQ=='}]}],request:async(url,options)=>{
  assert.equal(url,'https://api.anthropic.com/v1/messages');
  assert.equal(options.headers['x-api-key'],'test');
  const body=JSON.parse(options.body);
  assert.equal(body.system,'Você é Max');
  assert.equal(body.messages[1].content[1].source.data,'YQ==');
  return {ok:true,json:async()=>({content:[{type:'text',text:'Oi!'},{type:'text',text:'Tudo bem?'}],stop_reason:'end_turn'})};
 }});
 assert.equal(result.answer,'Oi!\nTudo bem?');
 assert.equal(result.incomplete,false);
});
test('Claude rejects invalid credentials without exposing keys',async()=>{
 const result=await askClaude({key:'test',model:'test',instructions:'Max',input:[],request:async()=>({ok:false,status:401})});
 assert.match(result.error,/recusada/);
});
