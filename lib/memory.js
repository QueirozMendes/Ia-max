import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const MEMORY_LIMIT = 60000;
export function relevantMemory(memory, query, limit = 6000) {
  if (typeof memory !== 'string') return '';
  if (memory.length <= limit) return memory;
  const words = value => new Set(value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
  const terms = words(query);
  const notes = memory.split('\n').map((text, index) => ({ text, index, score: [...words(text)].filter(word => terms.has(word)).length }));
  notes.sort((a, b) => b.score - a.score || b.index - a.index);
  let remaining = limit;
  const selected = [];
  for (const note of notes) {
    if (!note.text.trim() || remaining <= 0) continue;
    const text = note.text.slice(0, remaining);
    selected.push({ ...note, text });
    remaining -= text.length + 1;
  }
  return selected.sort((a, b) => a.index - b.index).map(note => note.text).join('\n');
}

export function createMemoryStore(directory) {
  const path = join(directory, 'memory.json');
  let queue = Promise.resolve();
  async function read() {
    try {
      const data = JSON.parse(await readFile(path, 'utf8'));
      if (typeof data.memory !== 'string' || data.memory.length > MEMORY_LIMIT || typeof data.revision !== 'string') throw new Error('Memória inválida');
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') return { memory: '', revision: null };
      throw error;
    }
  }
  function save(memory, revision) {
    const operation = queue.then(async () => {
      if (typeof memory !== 'string' || memory.length > MEMORY_LIMIT) throw new TypeError('Memória inválida');
      const current = await read();
      if (current.revision !== revision) return { conflict: true, ...current };
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const next = { memory, revision: randomUUID() };
      const temporary = path + '.' + next.revision + '.tmp';
      try {
        await writeFile(temporary, JSON.stringify(next), { mode: 0o600, flag: 'wx' });
        await rename(temporary, path);
      } finally {
        await unlink(temporary).catch(() => {});
      }
      return next;
    });
    queue = operation.catch(() => {});
    return operation;
  }
  return { read, save };
}
