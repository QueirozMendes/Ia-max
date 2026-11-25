import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
const run=promisify(execFile);
export const allowedApps=Object.freeze({notepad:'notepad.exe',calculator:'calc.exe',explorer:'explorer.exe'});
export function validateAction(action){
  if(!action || typeof action!=='object')return false;
  if(action.kind==='open-app')return Object.hasOwn(allowedApps,action.app);
  if(action.kind==='cursor-nudge')return true;
  return false;
}
export function createWindowsControl({root,idle,confirm,audit,available=()=>true}){
  let busy=false,lastNudge=0;
  return async function execute(action,{play=false}={}){
    if(process.platform!=='win32'||!validateAction(action)||busy||!available())return {ok:false,reason:'indisponível'};
    busy=true;
    try{
      if(action.kind==='cursor-nudge'){
        if(!play||idle()<20||Date.now()-lastNudge<600000)return {ok:false,reason:'cursor ocupado ou intervalo'};
      }else if(!await confirm(action))return {ok:false,reason:'cancelado'};
      if(!available()||(action.kind==='cursor-nudge'&&idle()<20))return {ok:false,reason:'pausado'};
      const powershell=join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
      const args=['-NoProfile','-NonInteractive','-File',join(root,'scripts','windows-control.ps1'),'-Action',action.kind];
      if(action.kind==='open-app')args.push('-App',action.app);
      const result=await run(powershell,args,{windowsHide:true,timeout:10000,maxBuffer:4096});
      if(action.kind==='cursor-nudge')lastNudge=Date.now();
      const ok=result.stdout.trim()==='OK';
      await audit({kind:action.kind,app:action.app,ok});
      return {ok};
    }catch{return {ok:false,reason:'falha na ação local'};}
    finally{busy=false;}
  };
}
