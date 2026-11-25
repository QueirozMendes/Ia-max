import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, lstat, realpath } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createProjectReader, validateProposal } from './project-reader.js';
const exec=promisify(execFile);
async function git(cwd,args){
  const env={...process.env,GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null'};
  for(const key of Object.keys(env))if(/^GIT_(DIR|WORK_TREE|INDEX_FILE|CONFIG_COUNT|CONFIG_KEY_|CONFIG_VALUE_|CONFIG_PARAMETERS|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)/.test(key))delete env[key];
  return (await exec('git',['-c','core.hooksPath='+ (process.platform==='win32'?'NUL':'/dev/null'),'-c','core.fsmonitor=false',...args],{cwd,env,timeout:30000,maxBuffer:2*1024*1024,windowsHide:true})).stdout.trim();
}
export async function applyInWorktree({root,workspace,proposal,approved=()=>false}){
  if(!approved())throw Error('Autorização necessária');
  const source=await createProjectReader(root);
  if(await realpath(await git(source.root,['rev-parse','--show-toplevel']))!==source.root)throw Error('Selecione a raiz do repositório Git');
  if(await git(source.root,['status','--porcelain','--untracked-files=normal']))throw Error('O projeto original precisa estar limpo');
  if(!proposal?.changes?.length)throw Error('Não há alterações');
  const originals=await Promise.all(proposal.changes.map(c=>source.read(c.path)));
  const checked=validateProposal(proposal,originals);
  const base=await git(source.root,['rev-parse','HEAD']);
  await mkdir(workspace,{recursive:true});
  const dir=await mkdtemp(join(workspace,'max-dev-'));
  const branch='max-dev/'+randomUUID();
  if(!approved())throw Error('Autorização revogada');
  await git(source.root,['worktree','add','-b',branch,dir,base]);
  const reader=await createProjectReader(dir);
  for(const change of checked.changes){
    if(!approved())throw Error('Autorização revogada; worktree preservada para revisão');
    const file=await reader.read(change.path);
    if(file.sha256!==change.sha256)throw Error('Arquivo alterado desde a análise');
    const target=resolve(dir,change.path), actual=await realpath(target), rel=relative(dir,actual);
    if(!rel||rel.startsWith('..')||isAbsolute(rel)||!(await lstat(target)).isFile())throw Error('Caminho inválido');
    await writeFile(target,change.text,{encoding:'utf8',flag:'w'});
  }
  const diff=await git(dir,['diff','--no-ext-diff','--no-textconv','--']);
  return {directory:dir,branch,base,diff};
}
export async function checkSyntax(directory,paths,approved=()=>false){
  const reader=await createProjectReader(directory),results=[];
  for(const path of paths){
    if(!approved())throw Error('Autorização revogada');
    if(!/\.(?:js|mjs|cjs)$/.test(path))continue;
    await reader.read(path);
    const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;
    try{
      await exec(process.execPath,['--check',resolve(directory,path)],{cwd:directory,env:{...env,ELECTRON_RUN_AS_NODE:'1'},timeout:15000,maxBuffer:65536,windowsHide:true});
      results.push({path,ok:true});
    }catch{results.push({path,ok:false});}
  }
  return results;
}
