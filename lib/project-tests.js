import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { createProjectReader } from './project-reader.js';
const run=promisify(execFile);
export function testEnvironment(env=process.env){
  const safe={};
  for(const name of ['PATH','Path','PATHEXT','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL'])if(env[name])safe[name]=env[name];
  return {...safe,ELECTRON_RUN_AS_NODE:'1',CI:'true'};
}
export async function runProjectTests({directory,paths,signal,executable=process.execPath}){
  if(!Array.isArray(paths)||!paths.length||paths.length>20||new Set(paths).size!==paths.length)throw Error('Selecione de 1 a 20 testes');
  const reader=await createProjectReader(directory);
  for(const path of paths){
    if(typeof path!=='string'||!/(?:^|\/)(?:[^/]+\.(?:test|spec)\.(?:js|mjs|cjs)|test\/[^/]+\.(?:js|mjs|cjs))$/.test(path))throw Error('Selecione arquivos de teste JavaScript');
    await reader.read(path);
  }
  if(signal?.aborted)throw Error('Cancelado');
  try{
    const result=await run(executable,['--test',...paths.map(path=>resolve(reader.root,path))],{cwd:reader.root,env:testEnvironment(),signal,timeout:120000,maxBuffer:512000,windowsHide:true});
    return {ok:true,output:(result.stdout+'\n'+result.stderr).slice(-20000)};
  }catch(error){
    if(signal?.aborted)throw Error('Teste cancelado');
    return {ok:false,output:String(error.stdout||'').concat('\n',String(error.stderr||''),'\n',error.killed?'Tempo limite atingido.':'Teste falhou ou não pôde iniciar.').slice(-20000)};
  }
}
