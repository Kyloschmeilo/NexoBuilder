/**
 * The open project with its undo history. Every change goes through `mutate` (called by commands only), so undo,
 * redo, autosave and sharing see the same steps.
 */
import { create } from 'zustand';
import { produce } from 'immer';
import type { Project } from '@resourcepackbuilder/core/project/types';

interface ProjectState {
  project: Project | null;
  past: Project[];
  future: Project[];
  /** Key of the last change; equal keys in quick succession are merged into one undo step */
  historyKey: string | null;
  historyTime: number;
  /** Counts `setProject` calls: a new value means another project (or a fresh copy of it) was opened */
  generation: number;
}

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1200;

export const useProjectStore = create<ProjectState>(() => ({
  project: null,
  past: [],
  future: [],
  historyKey: null,
  historyTime: 0,
  generation: 0,
}));

/** The open project; only for components rendered below the "project is open" branch of the shell. */
export function useOpenProject(): Project {
  const project = useProjectStore((s) => s.project);
  if (!project) throw new Error('useOpenProject() needs an open project');
  return project;
}

export function getProject(): Project | null {
  return useProjectStore.getState().project;
}

/** Replaces the open project (opening, closing, creating) and starts a fresh history (the UI state follows). */
export function setProject(project: Project | null): void {
  useProjectStore.setState((s) => ({ project, past: [], future: [], historyKey: null, historyTime: 0, generation: s.generation + 1 }));
}

/**
 * Changes the open project. A recipe that changes nothing creates no undo step and leaves the project untouched;
 * identical `historyKey`s within a short time are merged into one undo step (e.g. typing into a field).
 */
export function mutate(recipe: (draft: Project) => void, historyKey?: string): void {
  const { project, past, historyKey: lastKey, historyTime } = useProjectStore.getState();
  if (!project) return;
  const edited = produce(project, recipe);
  if (edited === project) return;
  const now = Date.now();
  const next = produce(edited, (draft) => {
    draft.updatedAt = now;
  });
  const shouldMerge = historyKey !== undefined && historyKey === lastKey && now - historyTime < COALESCE_MS;
  useProjectStore.setState({
    project: next,
    past: shouldMerge ? past : [...past, project].slice(-HISTORY_LIMIT),
    future: [],
    historyKey: historyKey ?? null,
    historyTime: now,
  });
}

export function undo(): void {
  const { project, past, future } = useProjectStore.getState();
  const previous = past.at(-1);
  if (!project || !previous) return;
  useProjectStore.setState({ project: previous, past: past.slice(0, -1), future: [project, ...future], historyKey: null });
}

export function redo(): void {
  const { project, past, future } = useProjectStore.getState();
  const [next, ...rest] = future;
  if (!project || !next) return;
  useProjectStore.setState({ project: next, past: [...past, project], future: rest, historyKey: null });
}

/**
 * Applies changes made by others (shared project). The history is transformed too, so undo only ever reverts own
 * changes and never brings back what others changed.
 */
export function applyRemote(transform: (project: Project) => Project): void {
  const { project, past, future } = useProjectStore.getState();
  if (!project) return;
  const next = transform(project);
  useProjectStore.setState({ project: next, past: past.map(transform), future: future.map(transform), historyKey: null });
}
