import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const localVoiceAvailable = () => process.platform === 'win32';
export function speakLocal(text) {
  return new Promise((resolve,reject)=>{
    const binary=join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    const script=fileURLToPath(new URL('../scripts/speak-local.ps1',import.meta.url));
    const child=execFile(binary,['-NoProfile','-NonInteractive','-File',script],{windowsHide:true,timeout:60000,maxBuffer:16000000},(error,stdout)=>{
      if(error)return reject(new Error('Voz local indisponível.'));
      const wav=Buffer.from(stdout.trim(),'base64');
      if(wav.toString('ascii',0,4)!=='RIFF')return reject(new Error('Áudio local inválido.'));
      resolve(wav);
    });
    child.stdin.on('error',()=>{});
    child.stdin.end(JSON.stringify({text}));
  });
}
