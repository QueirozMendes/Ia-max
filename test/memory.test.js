import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMemoryStore, relevantMemory, MEMORY_LIMIT } from '../lib/memory.js';

test('memory survives reopening, rejects stale writes and supports clearing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'max-memory-'));
  try {
    const store = createMemoryStore(directory);
    assert.deepEqual(await store.read(), { memory: '', revision: null });
    const saved = await store.save('Projeto QRFlow', null);
    const reopened = createMemoryStore(directory);
    assert.deepEqual(await reopened.read(), saved);
    assert.equal((await store.save('stale', null)).conflict, true);
    await assert.rejects(store.save('x'.repeat(MEMORY_LIMIT + 1), saved.revision));
    const cleared = await reopened.save('', saved.revision);
    assert.equal(cleared.memory, '');
    assert.equal((await store.read()).memory, '');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('relevance prioritizes matching notes and limits context', () => {
  const notes = 'Projeto QRFlow\n' + 'x'.repeat(7000);
  const result = relevantMemory(notes, 'projeto QRFlow', 100);
  assert.match(result, /Projeto QRFlow/);
  assert.ok(result.length <= 100);
  assert.equal(relevantMemory('pequena memória', 'teste'), 'pequena memória');
});
