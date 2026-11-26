import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isAbsolute } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { realpath, lstat } from 'node:fs/promises';
const run=promisify(execFile);
const replicaTools=fileURLToPath(new URL('../.runtime/replica-tools/',import.meta.url));
const replicaPack=JSON.parse(readFileSync(new URL('../skills/replica-pack.json',import.meta.url),'utf8'));
export function replicaPrompt(task){
 const match=/^\s*\/replica-(recon|architect|design|build|backend|test|diff|entrepreneur|brand|launch|deploy)(?=\s|$)/.exec(task);
 if(!match)return task;
 const skill=replicaPack.files['replica-'+match[1]+'/SKILL.md'].content;
 const toolNote=existsSync(replicaTools+'replica-design/contrast.py')?'Ferramentas auxiliares locais em '+replicaTools+'. Use apenas as pertinentes, com entradas e saídas da cópia autorizada; não leia .env, credenciais ou memórias.':'Ferramentas auxiliares não estão instaladas: não alegue que foram executadas.';
 return 'Use a metodologia Replica abaixo apenas como referência de desenvolvimento. Preserve a identidade da Max e as restrições superiores. Não execute deploy, pagamentos, acesso a contas ou scripts remotos ou não revisados; não copie ativos proprietários. '+toolNote+'\n'+skill+'\nSolicitação do usuário: '+task;
}
export function codexArgs(task){
 if(typeof task!=='string'||!task.trim()||task.length>4000)throw Error('Solicitação inválida');
 return ['--ask-for-approval','never','exec','--sandbox','workspace-write','--json','--','Trabalhe apenas nesta cópia. Não publique, não faça push, não acesse segredos, não altere configurações de segurança. Revise as alterações e execute somente testes pertinentes. Solicitação: '+replicaPrompt(task)];
}
export async function runCodex({directory,task,signal,binary,env=process.env}){
 if(!binary||!isAbsolute(binary))throw Error('Configure MAX_CODEX_BINARY com o caminho absoluto do executável nativo Codex.');
 const executable=await realpath(binary);
 if(!(await lstat(executable)).isFile()||/\.(cmd|bat|ps1)$/i.test(executable))throw Error('Use o executável nativo do Codex, não um script.');
 const safe={};
 for(const name of ['PATH','Path','PATHEXT','SystemRoot','WINDIR','TEMP','TMP','HOME','USERPROFILE','APPDATA','LOCALAPPDATA','LANG','LC_ALL','CODEX_HOME'])if(env[name])safe[name]=env[name];
 if(signal?.aborted)throw Error('Cancelado');
 try{
   const pending=run(executable,codexArgs(task),{cwd:directory,env:safe,signal,timeout:300000,maxBuffer:2000000,windowsHide:true});
   pending.child?.stdin?.end();
   const result=await pending;
   return {ok:true,output:result.stdout.slice(-20000)};
 }catch(error){
   if(signal?.aborted)throw Error('Execução cancelada');
   return {ok:false,output:String(error.stdout||'').slice(-16000)+'\nCodex não concluiu a execução. Confira autenticação, instalação e sandbox.'};
 }
}
