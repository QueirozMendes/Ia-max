import {readFileSync} from 'node:fs';
export function privateAccess(){
 try {
  const data=JSON.parse(readFileSync(new URL('../.runtime/remote.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
  if(typeof data.origin!=='string'||typeof data.password!=='string')throw Error('Configuração privada inválida');
  return data;
 }catch(error){if(error.code==='ENOENT')return {};throw error;}
}
