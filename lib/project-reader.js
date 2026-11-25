import { realpath, lstat, readFile, readdir } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
const extensions = new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.css','.html','.py','.php','.java','.go','.rs','.md','.json','.sql','.vue','.svelte','.cs']);
const blocked = /^(?:\.|node_modules$|vendor$|dist$|build$|coverage$|secrets?$|credentials?$|private$)/i;
export function allowedPath(name) {
  if(typeof name!=='string'||!name||name.length>240||isAbsolute(name)||/[\\:\x00-\x1f]/.test(name))return false;
  const parts=name.split('/');
  return parts.every(p=>p&&!blocked.test(p)&&p!=='..') && extensions.has(extname(name).toLowerCase()) && !/(?:secret|credential|password|token|private.?key|lock)/i.test(basename(name));
}
const digest = text=>createHash('sha256').update(text).digest('hex');
export async function createProjectReader(directory) {
  const root=await realpath(directory);
  if(!(await lstat(root)).isDirectory())throw Error('Pasta inválida');
  async function read(name) {
    if(!allowedPath(name))throw Error('Arquivo não permitido');
    let current=root;
    for(const part of name.split('/')){
      current=resolve(current,part);
      if((await lstat(current)).isSymbolicLink())throw Error('Links não permitidos');
    }
    const actual=await realpath(current), rel=relative(root,actual);
    if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('Fora do projeto');
    const info=await lstat(actual);
    if(!info.isFile()||info.size>64000)throw Error('Arquivo excede o limite');
    const text=await readFile(actual,'utf8');
    if(text.includes('\u0000')||text.length>64000)throw Error('Arquivo não textual');
    return {path:name,text,sha256:digest(text)};
  }
  async function list(){
    const files=[];let visited=0;
    async function walk(dir,prefix='',depth=0){
      if(depth>6||files.length>=200||visited>=1000)return;
      for(const entry of await readdir(dir,{withFileTypes:true})){
        if(++visited>1000||files.length>=200)break;
        if(blocked.test(entry.name)||entry.isSymbolicLink())continue;
        const name=prefix+entry.name;
        if(entry.isDirectory())await walk(resolve(dir,entry.name),name+'/',depth+1);
        else if(entry.isFile()&&allowedPath(name))files.push(name);
      }
    }
    await walk(root);return files.sort();
  }
  return {root,list,read};
}
export function validateProposal(proposal, files){
  if(!proposal||typeof proposal.summary!=='string'||!Array.isArray(proposal.changes)||proposal.changes.length>8)throw Error('Proposta inválida');
  const seen=new Set();
  for(const change of proposal.changes){
    const original=files.find(f=>f.path===change?.path);
    if(!original||seen.has(change.path)||change.sha256!==original.sha256||typeof change.text!=='string'||change.text.length>64000||change.text.includes('\u0000'))throw Error('Alteração inválida');
    seen.add(change.path);
  }
  return {summary:proposal.summary.slice(0,2000),changes:proposal.changes.map(c=>({path:c.path,sha256:c.sha256,text:c.text}))};
}
