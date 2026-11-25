import { validBrain } from './brain.js';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function validateState(kind, items) {
  if (!Array.isArray(items)) return false;
  if (kind === 'brain') return validBrain(items);
  if (kind === 'conversation') return items.length <= 100 && items.every(x =>
    x && ['user', 'assistant'].includes(x.role) && typeof x.content === 'string' && x.content.length <= 40000 &&
    (x.file === undefined || typeof x.file === 'string' && x.file.length <= 250) &&
    (x.sources === undefined || Array.isArray(x.sources) && x.sources.length <= 30 && x.sources.every(s => s && typeof s.url === 'string' && /^https?:\/\//i.test(s.url) && s.url.length <= 2000 && typeof s.title === 'string' && s.title.length <= 500)));
  if (kind === 'tasks') return items.length <= 500 && items.every(x => x && typeof x.id === 'string' && x.id.length <= 100 && typeof x.title === 'string' && x.title.length <= 240 && typeof x.done === 'boolean') && new Set(items.map(x => x.id)).size === items.length;
  return false;
}

export function createStateStore(directory, kind) {
  if (!['conversation', 'tasks', 'brain'].includes(kind)) throw new Error('Invalid state kind');
  const path = join(directory, kind + '.json');
  let queue = Promise.resolve();
  async function read() {
    try {
      const state = JSON.parse(await readFile(path, 'utf8'));
      if (!validateState(kind, state.items) || typeof state.revision !== 'string') throw new Error('Invalid stored state');
      return state;
    } catch (error) {
      if (error.code === 'ENOENT') return { items: [], revision: null };
      throw error;
    }
  }
  function save(items, revision) {
    const operation = queue.then(async () => {
      if (!validateState(kind, items)) throw new TypeError('Invalid state');
      const current = await read();
      if (revision !== current.revision) return { ...current, conflict: true };
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const state = { items, revision: randomUUID() };
      const temporary = path + '.' + state.revision + '.tmp';
      try {
        await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
        await rename(temporary, path);
      } finally { await unlink(temporary).catch(() => {}); }
      return state;
    });
    queue = operation.catch(() => {});
    return operation;
  }
  return { read, save };
}
