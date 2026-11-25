import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allowedPath, createProjectReader, validateProposal } from '../lib/project-reader.js';
test('blocks traversal, hidden files and obvious secrets',()=>{
  for(const path of ['../main.js','.env','src/../../x.js','node_modules/a.js','src/private/key.js','config/token.json','C:/x.js','a\\b.js'])assert.equal(allowedPath(path),false,path);
  assert.equal(allowedPath('src/main.ts'),true);
});
test('reads eligible source and rejects mismatched proposal',async()=>{
  const root=await mkdtemp(join(tmpdir(),'max-project-'));
  try {
    await mkdir(join(root,'src'));
    await writeFile(join(root,'src','main.js'),'export const x=1;');
    await writeFile(join(root,'.env'),'SECRET=x');
    const reader=await createProjectReader(root);
    assert.deepEqual(await reader.list(),['src/main.js']);
    const file=await reader.read('src/main.js');
    assert.throws(()=>validateProposal({summary:'fix',changes:[{path:file.path,sha256:'bad',text:'x'}]},[file]));
    assert.equal(validateProposal({summary:'fix',changes:[{path:file.path,sha256:file.sha256,text:'export const x=2;'}]},[file]).changes.length,1);
    await assert.rejects(reader.read('.env'));
  } finally {await rm(root,{recursive:true,force:true});}
});
