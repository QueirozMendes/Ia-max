import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
async function scan(dir){
 const result=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())result.push(...await scan(path));
  else if(entry.isFile()&&/\.(?:js|mjs|cjs)$/.test(path))result.push(path);
 }
 return result;
}
const files=['server.js',...(await Promise.all(['lib','public','desktop','scripts','test'].map(scan))).flat()];
let failures=0;
for(const path of files){
 const result=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});
 if(result.status!==0){console.error('Falha:',path);failures++;}
}
console.log(files.length+' arquivos verificados; '+failures+' falhas.');
process.exitCode=failures?1:0;
