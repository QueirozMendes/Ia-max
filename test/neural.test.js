import test from 'node:test';
import assert from 'node:assert/strict';
import { rankNotes,suggestLinks } from '../lib/neural.js';
import { brainContext } from '../lib/brain.js';
const note=(id,title,body,links=[],useInChat=true)=>({id,title,body,links,useInChat,area:'projetos'});
test('title matching and confirmed links recover authorized notes only',()=>{
 const notes=[note('a','Python','Automação de projetos',['b','c']),note('b','Objetivo','Aprender novas ferramentas'),note('c','Privado','Informação reservada',[],false),note('d','Outro','Assunto distinto')];
 assert.deepEqual(rankNotes(notes,'Python').map(x=>x.note.id),['a','b']);
 assert.doesNotMatch(brainContext(notes,'Python'),/reservada/);
});
test('stop words alone do not retrieve notes',()=>{
 assert.deepEqual(rankNotes([note('a','Quero','Isso para você')],'quero isso para voce'),[]);
});
test('suggestions require common terms and exclude existing connections',()=>{
 const a=note('a','Python','Automação de projetos');
 const b=note('b','Automação','Python para tarefas');
 assert.equal(suggestLinks([a,b]).length,1);
 assert.equal(suggestLinks([{...a,links:['b']},b]).length,0);
});
