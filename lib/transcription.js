import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const python = fileURLToPath(new URL('../.runtime/hearing/Scripts/python.exe', import.meta.url));
const script = fileURLToPath(new URL('../scripts/transcribe.py', import.meta.url));
const model = fileURLToPath(new URL('../.runtime/whisper-base/model.bin', import.meta.url));
export const localHearingAvailable = () => existsSync(python) && existsSync(model);
export function transcribeLocal(bytes) {
  return new Promise((resolve, reject) => {
    const child = execFile(python, [script], { timeout: 90000, maxBuffer: 100000, windowsHide: true,
      env: {...process.env, HF_HUB_OFFLINE:'1'} }, (error, stdout) => {
      if (error) return reject(new Error('Transcrição local indisponível.'));
      try { resolve(JSON.parse(stdout).text.slice(0,10000)); } catch { reject(new Error('Resposta de transcrição inválida.')); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(bytes);
  });
}
