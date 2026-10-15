// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '@resourcepackbuilder/core/project/factory';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { mutate, setProject } from '../store/project';
import { useSaveStore } from '../store/save';
import { createAutosave, type Autosave } from './autosave';
import type { ProjectRepository } from './projectRepository';

/** An in-memory repository that records every save; `failing` makes saves throw. */
function fakeRepository() {
  const saved: Project[] = [];
  const control = { failing: false };
  const unused = () => Promise.reject(new Error('not used in this test'));
  const repository: ProjectRepository = {
    available: true,
    save: async (project) => {
      if (control.failing) throw new Error('disk full');
      saved.push(project);
    },
    list: unused,
    load: unused,
    remove: unused,
    lastProjectId: unused,
    clearLastProjectId: unused,
    loadShareConfig: unused,
    saveShareConfig: unused,
    removeShare: unused,
    sharedProjectIds: unused,
    loadSyncState: unused,
    saveSyncState: unused,
    clientId: unused,
  };
  return { repository, saved, control };
}

let autosave: Autosave | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  setProject(null);
});

afterEach(() => {
  autosave?.dispose();
  autosave = null;
  setProject(null);
  vi.useRealTimers();
});

const rename = (name: string) =>
  mutate((draft) => {
    draft.name = name;
  });

describe('autosave', () => {
  it('saves shortly after a change', async () => {
    const { repository, saved } = fakeRepository();
    autosave = createAutosave({ repository, delayMs: 600 });
    setProject(createProject('A'));
    rename('A1');
    expect(useSaveStore.getState().status).toBe('saving');
    await vi.advanceTimersByTimeAsync(600);
    expect(saved.map((p) => p.name)).toEqual(['A1']);
    expect(useSaveStore.getState().status).toBe('saved');
  });

  it('saves the latest state of the project that changed when switching projects right after a change', async () => {
    const { repository, saved } = fakeRepository();
    autosave = createAutosave({ repository, delayMs: 600 });
    const a = createProject('A');
    setProject(a);
    rename('A changed');
    const b = createProject('B');
    setProject(b);
    await vi.advanceTimersByTimeAsync(0);
    expect(saved.find((p) => p.id === a.id)?.name).toBe('A changed');
    await vi.advanceTimersByTimeAsync(600);
    expect(saved.map((p) => p.id)).toContain(b.id);
    expect(saved.filter((p) => p.id === a.id).at(-1)?.name).toBe('A changed');
  });

  it('flush() saves pending changes at once', async () => {
    const { repository, saved } = fakeRepository();
    autosave = createAutosave({ repository, delayMs: 600 });
    setProject(createProject('A'));
    rename('A1');
    await autosave.flush();
    expect(saved.at(-1)?.name).toBe('A1');
  });

  it('does not save for a change that changes nothing', async () => {
    const { repository, saved } = fakeRepository();
    setProject(createProject('A'));
    autosave = createAutosave({ repository, delayMs: 600 });
    rename('A');
    await vi.advanceTimersByTimeAsync(1000);
    expect(saved).toEqual([]);
  });

  it('warns once per series of failures and again after a successful save', async () => {
    const { repository, control } = fakeRepository();
    autosave = createAutosave({ repository, delayMs: 10 });
    const failed = vi.fn();
    autosave.events.subscribe(failed);
    setProject(createProject('A'));
    control.failing = true;
    rename('1');
    await vi.advanceTimersByTimeAsync(10);
    rename('2');
    await vi.advanceTimersByTimeAsync(10);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(useSaveStore.getState().status).toBe('error');

    control.failing = false;
    rename('3');
    await vi.advanceTimersByTimeAsync(10);
    control.failing = true;
    rename('4');
    await vi.advanceTimersByTimeAsync(10);
    expect(failed).toHaveBeenCalledTimes(2);
  });

  it('stores the sync state together with the project', async () => {
    const { repository } = fakeRepository();
    const save = vi.spyOn(repository, 'save');
    const state = { clock: 3, versions: {}, files: {} };
    autosave = createAutosave({ repository, delayMs: 10, syncStateFor: () => state });
    setProject(createProject('A'));
    rename('A1');
    await vi.advanceTimersByTimeAsync(10);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'A1' }), state);
  });
});
