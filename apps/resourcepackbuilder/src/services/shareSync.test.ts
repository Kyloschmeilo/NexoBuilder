// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '@resourcepackbuilder/core/project';
import { DesktopError } from '@resourcepackbuilder/desktop-contract/errors';
import type { DesktopShareApi } from '../platform/desktopApi';
import { setProject } from '../store/project';
import type { Autosave } from './autosave';
import { memoryRepository } from './memoryRepository';
import { useShareStore } from './shareStore';
import { createShareSync, type ShareSync } from './shareSync';

const FOLDER = 'C:/Shared/Pack';

function fakeApi(list: DesktopShareApi['list']): DesktopShareApi {
  return {
    chooseFolder: async () => FOLDER,
    inspect: async () => ({ exists: true, empty: true, project: null, children: [] }),
    createSubfolder: async (parent) => parent,
    list: vi.fn(list),
    read: async () => null,
    write: async (_folder, path, content) => ({ path, mtimeMs: 1, size: content.length }),
    watch: vi.fn(async () => false),
    unwatch: vi.fn(async () => undefined),
    forget: vi.fn(async () => undefined),
    openFolder: async () => undefined,
    userName: async () => 'Alex',
    onChange: () => () => undefined,
  };
}

const autosave: Pick<Autosave, 'requestSave' | 'saveSyncState' | 'attachSyncState'> = {
  requestSave: () => undefined,
  saveSyncState: () => undefined,
  attachSyncState: () => () => undefined,
};

let share: ShareSync | null = null;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  share?.dispose();
  share = null;
  setProject(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function connectShared(list: DesktopShareApi['list']) {
  const { repository } = memoryRepository();
  const project = createProject('Pack');
  await repository.saveShareConfig(project.id, { folder: FOLDER, userName: 'Alex' });
  setProject(project);
  const api = fakeApi(list);
  share = createShareSync({ api, repository, autosave });
  await share.connect();
  return { api, repository, project };
}

describe('share sync', () => {
  it.each(['folderNotAllowed', 'invalidFile'] as const)('stops syncing when the folder refuses access (%s)', async (code) => {
    const { api } = await connectShared(() => Promise.reject(new DesktopError(code, { file: 'x' })));
    expect(useShareStore.getState()).toMatchObject({ status: 'error', error: expect.objectContaining({ code }) });
    const calls = vi.mocked(api.list).mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(vi.mocked(api.list).mock.calls.length).toBe(calls);
  });

  it('keeps polling while the folder is only unreachable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { api } = await connectShared(() => Promise.reject(new Error('ENOENT')));
    expect(useShareStore.getState().status).toBe('offline');
    const calls = vi.mocked(api.list).mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(vi.mocked(api.list).mock.calls.length).toBeGreaterThan(calls);
  });

  it('stays stopped when stopping while it is still connecting', async () => {
    const { repository } = memoryRepository();
    const project = createProject('Pack');
    await repository.saveShareConfig(project.id, { folder: FOLDER, userName: 'Alex' });
    setProject(project);
    const api = fakeApi(async () => []);
    share = createShareSync({ api, repository, autosave });
    // The connect started by the open project is still loading its settings
    await share.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await repository.loadShareConfig(project.id)).toBeNull();
    expect(useShareStore.getState().status).toBe('off');
    expect(api.forget).toHaveBeenCalledWith(FOLDER);
  });
});
