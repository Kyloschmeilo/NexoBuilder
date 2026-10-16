import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '@resourcepackbuilder/core/project';
import type { DesktopTestServerApi, TestServerConfigPatch, TestServerState } from '../platform/desktopApi';
import { setProject } from '../store/project';
import { useTestServerStore } from './testServerStore';
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
    const sync = await startService(
      fakeApi(() => Promise.resolve(['1.21.4', '1.21.10', '1.20.6'])),
      '1.21.4',
    );
    await sync.loadPaperVersions();
    expect(state().paperVersions).toEqual(['1.21.10', '1.21.4', '1.20.6']);
    expect(state().server?.config.paperVersion).toBe('1.21.4');
  });

  it('defaults to the newest version when Paper does not support the project version', async () => {
    const sync = await startService(
      fakeApi(() => Promise.resolve(['1.21.4', '1.21.10'])),
      '1.99',
    );
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

describe('give', () => {
  const running = (nexoJar: TestServerState['config']['nexoJar']): TestServerState => ({
    ...serverState(),
    status: 'running',
    config: { ...serverState().config, playerName: 'Steve', nexoJar },
  });

  async function startGiving(nexoJar: TestServerState['config']['nexoJar']) {
    const command = vi.fn(() => Promise.resolve(true));
    const api: DesktopTestServerApi = {
      ...fakeApi(() => Promise.resolve([])),
      command,
      sync: () => Promise.resolve({ written: 1, deleted: 0, skipped: 0, settingsChanged: false, reloaded: true, total: 1 }),
    };
    const sync = await startService(api, '1.21.4');
    useTestServerStore.setState({ server: running(nexoJar) });
    return { api: { command }, given: sync.give('fire_sword') };
  }

  it('waits until the pack build started by the reload has finished', async () => {
    const { api, given } = await startGiving({ file: 'Nexo-1.0.jar', name: 'Nexo', version: '1.0' });
    const server = () => state().server as TestServerState;
    // The desktop program marks the pack as building when it sends the reload, then ready when Nexo is done
    await vi.waitFor(() => expect(server().pack.status).toBe('idle'));
    useTestServerStore.setState({ server: { ...server(), pack: { status: 'building', message: null, at: Date.now() } } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(api.command).not.toHaveBeenCalled();
    useTestServerStore.setState({ server: { ...server(), pack: { status: 'ready', message: null, at: Date.now() } } });
    await expect(given).resolves.toBe('Steve');
    expect(api.command).toHaveBeenCalledWith(expect.stringContaining('fire_sword'));
  });

  it('gives right away when there is no Nexo pack to wait for', async () => {
    const { api, given } = await startGiving(null);
    await expect(given).resolves.toBe('Steve');
    expect(api.command).toHaveBeenCalledTimes(1);
  });
});
