import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '@resourcepackbuilder/core/project/factory';
import type { DesktopTestServerApi, TestServerConfigPatch, TestServerState } from '../platform/desktopApi';
import { setProject } from '../store/project';
import { useTestServerStore } from '../store/testServer';
import { createTestServerSync, type TestServerSync } from './testServerSync';

function serverState(): TestServerState {
  return {
    status: 'stopped',
    message: null,
    progress: null,
    config: {
      paperVersion: null,
      ramGb: 2,
      port: 25565,
      packPort: 8082,
      playerName: '',
      eulaAccepted: false,
      autoUpdate: true,
      nexoJar: null,
    },
    installed: null,
    startedAt: null,
    lastSync: null,
    pack: { status: 'idle', message: null, at: null },
    serverDir: 'server',
    address: 'localhost',
  };
}

function fakeApi(versions: () => Promise<string[]>): DesktopTestServerApi {
  let state = serverState();
  return {
    getState: () => Promise.resolve({ ...state, log: [] }),
    setConfig: (patch: TestServerConfigPatch) => {
      state = { ...state, config: { ...state.config, ...patch } };
      return Promise.resolve(state);
    },
    versions: vi.fn(versions),
    chooseNexoJar: () => Promise.resolve(null),
    start: () => Promise.resolve(state),
    stop: () => Promise.resolve(state),
    command: () => Promise.resolve(true),
    reload: () => Promise.resolve(true),
    sync: () => Promise.reject(new Error('not used')),
    readSettings: () => Promise.resolve(null),
    openFolder: () => Promise.resolve(),
    clearLog: () => Promise.resolve(true),
    onEvent: () => () => undefined,
  };
}

let service: TestServerSync | null = null;

async function startService(api: DesktopTestServerApi, projectVersion: string): Promise<TestServerSync> {
  const project = createProject('Test');
  project.settings.minecraftVersion = projectVersion;
  setProject(project);
  service = createTestServerSync(api);
  await vi.waitFor(() => expect(useTestServerStore.getState().server).not.toBeNull());
  return service;
}

const state = () => useTestServerStore.getState();

afterEach(() => {
  service?.dispose();
  service = null;
  setProject(null);
  useTestServerStore.setState({ server: null, log: [], paperVersions: null, paperVersionsError: null });
});

describe('loadPaperVersions', () => {
  it('stores the versions newest first and defaults to the project version', async () => {
    const sync = await startService(fakeApi(() => Promise.resolve(['1.21.4', '1.21.10', '1.20.6'])), '1.21.4');
    await sync.loadPaperVersions();
    expect(state().paperVersions).toEqual(['1.21.10', '1.21.4', '1.20.6']);
    expect(state().server?.config.paperVersion).toBe('1.21.4');
  });

  it('defaults to the newest version when Paper does not support the project version', async () => {
    const sync = await startService(fakeApi(() => Promise.resolve(['1.21.4', '1.21.10'])), '1.99');
    await sync.loadPaperVersions();
    expect(state().server?.config.paperVersion).toBe('1.21.10');
  });

  it('loads once, records a failure and loads again after it', async () => {
    let attempt = 0;
    const api = fakeApi(() => (++attempt === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(['1.21.4'])));
    const sync = await startService(api, '1.21.4');
    await sync.loadPaperVersions();
    expect(state().paperVersionsError).toBeInstanceOf(Error);
    expect(state().paperVersions).toBeNull();
    await sync.loadPaperVersions();
    await sync.loadPaperVersions();
    expect(state().paperVersionsError).toBeNull();
    expect(state().paperVersions).toEqual(['1.21.4']);
    expect(api.versions).toHaveBeenCalledTimes(2);
  });
});
