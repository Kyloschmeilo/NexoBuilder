import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '@resourcepackbuilder/core/project/factory';
import type { Project } from '@resourcepackbuilder/core/project/types';
import type { SyncState } from '@resourcepackbuilder/sync';
import type { Autosave } from '../services/autosave';
import type { AppServices } from '../services/bootstrap';
import { createEvents } from '../services/events';
import { memoryRepository } from '../services/memoryRepository';
import type { ProjectRepository } from '../services/projectRepository';
import type { SharedFolderProject, ShareSync } from '../services/shareSync';
import { getProject, setProject } from '../store/project';
import { openSharedProject } from './projects';

const FOLDER = 'C:/Shared/Pack';
const SYNC_STATE: SyncState = { clock: 1, versions: {}, files: {} };

function fakeServices(repository: ProjectRepository, picked: SharedFolderProject) {
  const connect = vi.fn(async () => undefined);
  const share: ShareSync = {
    pickSharedProject: async () => picked,
    connect,
    defaultUserName: async () => 'Alex',
    share: async () => null,
    stop: async () => undefined,
    setUserName: async () => undefined,
    syncNow: () => undefined,
    openFolder: () => undefined,
    events: createEvents(),
    dispose: () => undefined,
  };
  const autosave: Autosave = {
    flush: async () => undefined,
    requestSave: () => undefined,
    saveSyncState: () => undefined,
    attachSyncState: () => () => undefined,
    dispose: () => undefined,
  };
  const services: AppServices = { repository, autosave, share, testServer: null, dispose: () => undefined };
  return { services, connect };
}

function sharedProject(name: string): Project {
  const project = createProject(name);
  project.id = 'p_shared';
  return project;
}

afterEach(() => setProject(null));

describe('openSharedProject', () => {
  it('reconnects the stored copy that is linked to the folder', async () => {
    const { repository, projects, shares } = memoryRepository();
    const local = sharedProject('Local copy');
    projects.set(local.id, local);
    shares.set(local.id, { folder: FOLDER, userName: 'Sam' });
    const { services, connect } = fakeServices(repository, { folder: FOLDER, project: sharedProject('From folder'), state: SYNC_STATE });
    const confirmReplace = vi.fn(async () => true);

    const opened = await openSharedProject(services, { fallbackUserName: 'Unknown', confirmReplace });

    expect(opened).toBe(local);
    expect(getProject()).toBe(local);
    expect(confirmReplace).not.toHaveBeenCalled();
    expect(connect).toHaveBeenCalled();
  });

  it('stores and opens a project that is new on this computer', async () => {
    const { repository, projects, shares } = memoryRepository();
    const shared = sharedProject('From folder');
    const { services } = fakeServices(repository, { folder: FOLDER, project: shared, state: SYNC_STATE });

    const opened = await openSharedProject(services, { fallbackUserName: 'Unknown', confirmReplace: async () => false });

    expect(opened).toBe(shared);
    expect(projects.get(shared.id)).toBe(shared);
    expect(shares.get(shared.id)).toEqual({ folder: FOLDER, userName: 'Alex' });
  });

  it('leaves a conflicting local project untouched when replacing is declined', async () => {
    const { repository, projects, shares } = memoryRepository();
    const local = sharedProject('Mine');
    projects.set(local.id, local);
    const { services, connect } = fakeServices(repository, { folder: FOLDER, project: sharedProject('Foreign'), state: SYNC_STATE });
    const confirmReplace = vi.fn(async () => false);

    const opened = await openSharedProject(services, { fallbackUserName: 'Unknown', confirmReplace });

    expect(opened).toBeNull();
    expect(confirmReplace).toHaveBeenCalledWith(local);
    expect(projects.get(local.id)).toBe(local);
    expect(shares.has(local.id)).toBe(false);
    expect(connect).not.toHaveBeenCalled();
  });

  it('replaces a conflicting local project (also one linked to another folder) when confirmed', async () => {
    const { repository, projects, shares } = memoryRepository();
    const local = sharedProject('Mine');
    projects.set(local.id, local);
    shares.set(local.id, { folder: 'D:/Old/Place', userName: 'Sam' });
    setProject(local);
    const shared = sharedProject('Foreign');
    const { services } = fakeServices(repository, { folder: FOLDER, project: shared, state: SYNC_STATE });

    const opened = await openSharedProject(services, { fallbackUserName: 'Unknown', confirmReplace: async () => true });

    expect(opened).toBe(shared);
    expect(getProject()).toBe(shared);
    expect(projects.get(local.id)).toBe(shared);
    expect(shares.get(local.id)).toEqual({ folder: FOLDER, userName: 'Sam' });
  });
});
