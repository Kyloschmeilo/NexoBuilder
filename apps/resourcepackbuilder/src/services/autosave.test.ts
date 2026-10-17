// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '@resourcepackbuilder/core/project';
import { mutate, setProject } from '../store/project';
import { useSaveStore } from './autosaveStore';
import { createAutosave, type Autosave } from './autosave';
import { memoryRepository } from './memoryRepository';

let autosave: Autosave | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  setProject(null);
  useSaveStore.setState({ status: 'idle', isFailing: false });
});

afterEach(() => {
  autosave?.dispose();
  autosave = null;
  setProject(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const rename = (name: string) =>
  mutate((draft) => {
    draft.name = name;
  });

describe('autosave', () => {
  it('saves shortly after a change', async () => {
    const { repository, saved } = memoryRepository();
    autosave = createAutosave({ repository, delayMs: 600 });
    setProject(createProject('A'));
    rename('A1');
    expect(useSaveStore.getState().status).toBe('saving');
    await vi.advanceTimersByTimeAsync(600);
    expect(saved.map((p) => p.name)).toEqual(['A1']);
    expect(useSaveStore.getState().status).toBe('saved');
  });

  it('saves the latest state of the project that changed when switching projects right after a change', async () => {
    const { repository, saved } = memoryRepository();
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
    const { repository, saved } = memoryRepository();
    autosave = createAutosave({ repository, delayMs: 600 });
    setProject(createProject('A'));
    rename('A1');
    await autosave.flush();
    expect(saved.at(-1)?.name).toBe('A1');
  });

  it('does not save for a change that changes nothing', async () => {
    const { repository, saved } = memoryRepository();
    setProject(createProject('A'));
    autosave = createAutosave({ repository, delayMs: 600 });
    rename('A');
    await vi.advanceTimersByTimeAsync(1000);
    expect(saved).toEqual([]);
  });

  it('warns once per series of failures and again after a successful save', async () => {
    const { repository, control } = memoryRepository();
    autosave = createAutosave({ repository, delayMs: 10 });
    const failed = vi.fn();
    const unsubscribe = useSaveStore.subscribe((state, previous) => {
      if (state.isFailing && !previous.isFailing) failed();
    });
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
    unsubscribe();
  });

  it('keeps a change whose save failed and retries it with a growing delay', async () => {
    const { repository, control, saved } = memoryRepository();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const save = vi.spyOn(repository, 'save');
    autosave = createAutosave({ repository, delayMs: 10 });
    setProject(createProject('A'));
    control.failing = true;
    rename('A1');
    await vi.advanceTimersByTimeAsync(10);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(2);
    // The second retry waits twice as long
    await vi.advanceTimersByTimeAsync(1999);
    expect(save).toHaveBeenCalledTimes(2);
    control.failing = false;
    await vi.advanceTimersByTimeAsync(1);
    expect(saved.map((p) => p.name)).toEqual(['A1']);
    expect(useSaveStore.getState()).toMatchObject({ status: 'saved', isFailing: false });
    // Nothing left to retry
    await vi.advanceTimersByTimeAsync(60_000);
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('does not write a discarded project back when its retry comes', async () => {
    const { repository, control, saved } = memoryRepository();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    autosave = createAutosave({ repository, delayMs: 10 });
    const project = createProject('A');
    setProject(project);
    control.failing = true;
    rename('A1');
    await vi.advanceTimersByTimeAsync(10);
    control.failing = false;
    autosave.discard(project.id);
    setProject(null);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(saved).toEqual([]);
  });

  it('retries with the newest change, not the one that failed', async () => {
    const { repository, control, saved } = memoryRepository();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    autosave = createAutosave({ repository, delayMs: 10 });
    setProject(createProject('A'));
    control.failing = true;
    rename('A1');
    await vi.advanceTimersByTimeAsync(10);
    control.failing = false;
    rename('A2');
    await vi.advanceTimersByTimeAsync(2000);
    expect(saved.map((p) => p.name)).toEqual(['A2']);
  });

  it('stores the sync state together with the project', async () => {
    const { repository } = memoryRepository();
    const save = vi.spyOn(repository, 'save');
    const state = { clock: 3, versions: {}, files: {} };
    autosave = createAutosave({ repository, delayMs: 10 });
    autosave.attachSyncState(() => state);
    setProject(createProject('A'));
    rename('A1');
    await vi.advanceTimersByTimeAsync(10);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'A1' }), state);
  });

  it('stores a sync state on its own when only the sync state changed', async () => {
    const { repository, syncStates } = memoryRepository();
    const state = { clock: 5, versions: {}, files: {} };
    autosave = createAutosave({ repository, delayMs: 10 });
    autosave.saveSyncState('p_1', state);
    await autosave.flush();
    expect(syncStates.get('p_1')).toBe(state);
  });
});
