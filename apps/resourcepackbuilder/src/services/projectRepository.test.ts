import { beforeEach, describe, expect, it, vi } from 'vitest';

/** idb-keyval backed by a Map, so the repository's reads can be fed any stored value. */
const stored = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async (key: string) => stored.get(key),
  set: async (key: string, value: unknown) => void stored.set(key, value),
  setMany: async (entries: Array<[string, unknown]>) => entries.forEach(([key, value]) => stored.set(key, value)),
  del: async (key: string) => void stored.delete(key),
  delMany: async (keys: string[]) => keys.forEach((key) => stored.delete(key)),
  keys: async () => [...stored.keys()],
}));

const { createProjectRepository } = await import('./projectRepository');

describe('projectRepository reads', () => {
  beforeEach(() => {
    stored.clear();
    vi.stubGlobal('indexedDB', {});
  });

  it('reads damaged stored values as missing instead of trusting them', async () => {
    const repository = createProjectRepository();
    stored.set('index', [{ id: 'p_1', name: 'A', updatedAt: 2 }, null, { id: 5 }]);
    stored.set('last-project', 42);
    stored.set('share:p_1', { folder: 'C:/x' });
    stored.set('sync:p_1', 'broken');
    stored.set('client-id', { id: 'c_1' });
    stored.set('project:p_1', 'no project');

    expect(await repository.list()).toEqual([{ id: 'p_1', name: 'A', namespace: '', itemCount: 0, updatedAt: 2 }]);
    expect(await repository.lastProjectId()).toBeNull();
    expect(await repository.loadShareConfig('p_1')).toBeNull();
    expect(await repository.loadSyncState('p_1')).toBeNull();
    expect(await repository.load('p_1')).toBeNull();
    expect(await repository.clientId()).toMatch(/^c_/);
  });

  it('cleans up a partly damaged sync state', async () => {
    const repository = createProjectRepository();
    stored.set('sync:p_1', { clock: 3, versions: { project: { rev: 1, by: 'c', byName: 'A', hash: 'h' }, item: 1 }, files: null });
    expect(await repository.loadSyncState('p_1')).toEqual({
      clock: 3,
      versions: { project: { rev: 1, by: 'c', byName: 'A', hash: 'h' } },
      files: {},
    });
  });
});
