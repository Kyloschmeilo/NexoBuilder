import { afterEach, describe, expect, it, vi } from 'vitest';
import { createItem, createProject, type PackTargetId } from '@resourcepackbuilder/core/project';
import { AppError } from '../i18n/errors';
import type { DesktopTestServerApi, PluginJarInfo, TestServerConfigPatch, TestServerState } from '../platform/desktopApi';
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
      pluginJars: {},
    },
    target: null,
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
    choosePluginJar: () => Promise.resolve(null),
    downloadPlugin: () => Promise.reject(new Error('not used')),
    start: () => Promise.resolve(state),
    stop: () => Promise.resolve(state),
    command: () => Promise.resolve(true),
    reload: () => Promise.resolve(true),
    sync: () => Promise.reject(new Error('not used')),
    readPluginConfig: () => Promise.resolve(null),
    openFolder: () => Promise.resolve(),
    resetWorld: () => Promise.resolve(),
    clearLog: () => Promise.resolve(true),
    onEvent: () => () => undefined,
  };
}

let service: TestServerSync | null = null;

async function startService(api: DesktopTestServerApi, projectVersion: string, target?: PackTargetId): Promise<TestServerSync> {
  const project = createProject('Test', undefined, undefined, target);
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

const running = (nexoJar: PluginJarInfo | null, target: PackTargetId = 'nexo'): TestServerState => ({
  ...serverState(),
  status: 'running',
  target,
  config: { ...serverState().config, playerName: 'Steve', pluginJars: nexoJar ? { nexo: nexoJar } : {} },
});

describe('give', () => {
  async function startGiving(nexoJar: PluginJarInfo | null) {
    const command = vi.fn(() => Promise.resolve(true));
    const api: DesktopTestServerApi = {
      ...fakeApi(() => Promise.resolve([])),
      command,
      sync: () => Promise.resolve({ written: 1, deleted: 0, skipped: 0, settingsChanged: false, reloaded: true, total: 1 }),
    };
    const sync = await startService(api, '1.21.4');
    useTestServerStore.setState({ server: running(nexoJar) });
    return {
      api: { command },
      given: sync.give(createItem({ displayName: 'Fire sword', itemId: 'fire_sword', folderId: 'f', model: null })),
    };
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
    expect(api.command).toHaveBeenCalledWith('nexo give fire_sword 1 Steve');
  });

  it('gives right away when there is no Nexo pack to wait for', async () => {
    const { api, given } = await startGiving(null);
    await expect(given).resolves.toBe('Steve');
    expect(api.command).toHaveBeenCalledTimes(1);
  });
});

describe('a server that runs another target', () => {
  async function startMismatched() {
    const sync = vi.fn(() => Promise.reject(new Error('must not sync')));
    const command = vi.fn(() => Promise.resolve(true));
    const reload = vi.fn(() => Promise.resolve(true));
    const api: DesktopTestServerApi = { ...fakeApi(() => Promise.resolve([])), sync, command, reload };
    const service = await startService(api, '1.21.4', 'craftengine');
    useTestServerStore.setState({ server: running({ file: 'Nexo-1.0.jar', name: 'Nexo', version: '1.0' }, 'nexo') });
    return { service, api: { sync, command, reload } };
  }

  it('is not synced, and the transfer reports the wrong target', async () => {
    const { service, api } = await startMismatched();
    await expect(service.sync(true)).resolves.toBeNull();
    expect(api.sync).not.toHaveBeenCalled();
    expect(state().syncError).toBeInstanceOf(AppError);
    expect(state().syncError).toMatchObject({ code: 'errors.testServer.wrongTarget', args: { server: 'Nexo', project: 'CraftEngine' } });
  });

  it('refuses give and reload', async () => {
    const { service, api } = await startMismatched();
    await expect(service.give(createItem({ displayName: 'Ruby', itemId: 'ruby', folderId: 'f', model: null }))).rejects.toMatchObject({
      code: 'errors.testServer.wrongTarget',
    });
    await expect(service.reload()).rejects.toMatchObject({ code: 'errors.testServer.wrongTarget' });
    expect(api.command).not.toHaveBeenCalled();
    expect(api.reload).not.toHaveBeenCalled();
  });

  it("is synced into the project target's folder once stopped (the next start switches the plugin)", async () => {
    const sync = vi.fn(() => Promise.resolve({ written: 1, deleted: 0, skipped: 0, settingsChanged: false, reloaded: false, total: 1 }));
    const api: DesktopTestServerApi = { ...fakeApi(() => Promise.resolve([])), sync };
    const service = await startService(api, '1.21.4', 'craftengine');
    useTestServerStore.setState({ server: { ...serverState(), target: 'nexo' } });
    await service.sync(false);
    expect(sync).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ target: 'craftengine', reload: false }));
  });

  it("switches CraftEngine's attribute system on for a project that uses it", async () => {
    const sync = vi.fn((_files: unknown, _options: { settings?: string }) =>
      Promise.resolve({ written: 1, deleted: 0, skipped: 0, settingsChanged: true, reloaded: false, total: 1 }),
    );
    const api: DesktopTestServerApi = { ...fakeApi(() => Promise.resolve([])), sync };
    const service = await startService(api, '1.21.4', 'craftengine');
    await service.sync(false);
    expect(sync.mock.calls[0][1].settings).not.toContain('attribute:');
    const project = createProject('Test', undefined, undefined, 'craftengine');
    project.craftEngine = { attributes: { definitions: [{ id: 'might', base: 0 }] } };
    setProject(project);
    await service.sync(false);
    expect(sync.mock.calls[1][1].settings).toMatch(/attribute:\s+enable: true/);
  });
});

describe('the server log', () => {
  it('numbers each line once, so a line keeps its id while older lines are dropped', async () => {
    let emit: Parameters<DesktopTestServerApi['onEvent']>[0] = () => undefined;
    const api: DesktopTestServerApi = {
      ...fakeApi(() => Promise.resolve([])),
      onEvent: (listener) => {
        emit = listener;
        return () => undefined;
      },
    };
    await startService(api, '1.21.4');
    emit({ type: 'log', lines: [{ t: 1, kind: 'info', line: 'a' }] });
    const [first] = state().log;
    emit({ type: 'log', lines: [{ t: 2, kind: 'info', line: 'b' }] });
    expect(state().log.map((l) => l.line)).toEqual(['a', 'b']);
    expect(state().log[0].id).toBe(first.id);
    expect(state().log[1].id).not.toBe(first.id);
  });
});
