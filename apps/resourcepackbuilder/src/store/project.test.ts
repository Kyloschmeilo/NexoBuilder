import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '@resourcepackbuilder/core/project/factory';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { applyRemote, mutate, redo, setProject, undo, useProjectStore } from './project';
import { select, useUiStore } from './ui';

function projectWithItem(): { project: Project; folderId: string; itemId: string } {
  const project = createProject('Test');
  const folder = createFolder('Swords', null);
  insertFolder(project, folder);
  const item = createItem({ displayName: 'Ruby', nexoId: 'ruby', folderId: folder.id, model: null });
  insertItem(project, item);
  return { project, folderId: folder.id, itemId: item.id };
}

const state = () => useProjectStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 1));
});

afterEach(() => {
  setProject(null);
  vi.useRealTimers();
});

describe('mutate', () => {
  it('ignores a recipe that changes nothing: no undo step, same project object', () => {
    const { project } = projectWithItem();
    setProject(project);
    mutate((draft) => {
      draft.name = 'Test';
    });
    expect(state().project).toBe(project);
    expect(state().past).toHaveLength(0);
  });

  it('records a change as one undo step and stamps updatedAt', () => {
    const { project } = projectWithItem();
    setProject(project);
    vi.setSystemTime(new Date(2026, 0, 2));
    mutate((draft) => {
      draft.name = 'Renamed';
    });
    expect(state().project?.name).toBe('Renamed');
    expect(state().project?.updatedAt).toBe(new Date(2026, 0, 2).getTime());
    expect(state().past).toEqual([project]);
    expect(state().future).toEqual([]);
  });

  it('merges changes with the same history key made in quick succession', () => {
    setProject(projectWithItem().project);
    mutate((draft) => void (draft.name = 'A'), 'name');
    vi.advanceTimersByTime(500);
    mutate((draft) => void (draft.name = 'AB'), 'name');
    expect(state().past).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    mutate((draft) => void (draft.name = 'ABC'), 'name');
    expect(state().past).toHaveLength(2);
  });

  it('does not merge changes with different keys', () => {
    setProject(projectWithItem().project);
    mutate((draft) => void (draft.name = 'A'), 'name');
    mutate((draft) => void (draft.namespace = 'a'), 'namespace');
    expect(state().past).toHaveLength(2);
  });
});

describe('undo and redo', () => {
  it('steps back and forth through the history', () => {
    setProject(projectWithItem().project);
    mutate((draft) => void (draft.name = 'A'));
    mutate((draft) => void (draft.name = 'B'));
    undo();
    expect(state().project?.name).toBe('A');
    undo();
    expect(state().project?.name).toBe('Test');
    redo();
    expect(state().project?.name).toBe('A');
    mutate((draft) => void (draft.name = 'C'));
    expect(state().future).toEqual([]);
  });

  it('clears a selection whose entry no longer exists and keeps one that does', () => {
    const { project, itemId } = projectWithItem();
    setProject(project);
    // The item is created after the first state, so undoing removes it
    mutate((draft) => {
      const folderId = draft.rootFolderIds[0];
      insertItem(draft, { ...draft.items[itemId], id: 'i_new', nexoId: 'emerald', folderId });
    });
    select({ kind: 'item', id: 'i_new' });
    undo();
    expect(useUiStore.getState().selection).toBeNull();

    select({ kind: 'item', id: itemId });
    redo();
    expect(useUiStore.getState().selection).toEqual({ kind: 'item', id: itemId });
  });

  it('repairs the selection after redo', () => {
    const { project, itemId } = projectWithItem();
    setProject(project);
    mutate((draft) => {
      delete draft.items[itemId];
    });
    undo();
    select({ kind: 'item', id: itemId });
    redo();
    expect(useUiStore.getState().selection).toBeNull();
  });

  it('keeps view selections', () => {
    setProject(projectWithItem().project);
    mutate((draft) => void (draft.name = 'A'));
    select({ kind: 'view', view: 'glyphs' });
    undo();
    expect(useUiStore.getState().selection).toEqual({ kind: 'view', view: 'glyphs' });
  });
});

describe('applyRemote', () => {
  it('changes project and history, so undo never brings back what others removed', () => {
    const { project, itemId } = projectWithItem();
    setProject(project);
    mutate((draft) => void (draft.name = 'Mine'));
    select({ kind: 'item', id: itemId });
    const removeItem = (p: Project): Project => {
      const items = { ...p.items };
      delete items[itemId];
      return { ...p, items };
    };
    applyRemote(removeItem);
    expect(state().project?.items[itemId]).toBeUndefined();
    expect(useUiStore.getState().selection).toBeNull();
    undo();
    expect(state().project?.name).toBe('Test');
    expect(state().project?.items[itemId]).toBeUndefined();
  });
});

describe('setProject', () => {
  it('starts a fresh history and expands every folder', () => {
    const { project, folderId } = projectWithItem();
    setProject(project);
    mutate((draft) => void (draft.name = 'A'));
    setProject(project);
    expect(state().past).toEqual([]);
    expect(useUiStore.getState().expanded).toEqual({ [folderId]: true });
    expect(useUiStore.getState().selection).toBeNull();
  });
});
