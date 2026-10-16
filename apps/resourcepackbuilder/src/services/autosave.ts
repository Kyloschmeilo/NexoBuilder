/**
 * Saves the open project automatically shortly after every change. Pending saves are kept per project, so a change
 * made right before switching projects is saved for the project it belongs to; a switch saves it immediately.
 *
 * It is the one place that writes projects and sync states: a shared project's sync state is stored together with
 * the project, or – when only the sync state changed (e.g. after disconnecting) – on its own, in order with the
 * project saves.
 */
import type { SyncState } from '@resourcepackbuilder/core/sync/engine';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { useProjectStore } from '../store/project';
import { useSaveStore } from '../store/save';
import type { ProjectRepository } from './projectRepository';
import { createSerialTask } from './serialTask';
import { watchOpenProject } from './watchOpenProject';

export interface Autosave {
  /** Saves every pending change now. Call before switching projects. */
  flush(): Promise<void>;
  /** Saves the open project although it did not change (e.g. because its sync state changed). */
  requestSave(projectId: string): void;
  /** Stores the sync state of a project whose content is saved already. */
  saveSyncState(projectId: string, state: SyncState): void;
  /** Supplies the sync state stored together with each project (shared projects only); returns the detach function. */
  attachSyncState(syncStateFor: (projectId: string) => SyncState | null): () => void;
  dispose(): void;
}

interface AutosaveOptions {
  repository: ProjectRepository;
  delayMs?: number;
}

export function createAutosave({ repository, delayMs = 600 }: AutosaveOptions): Autosave {
  const pending = new Map<string, Project>();
  const pendingStates = new Map<string, SyncState>();
  let syncStateFor: (projectId: string) => SyncState | null = () => null;

  const save = createSerialTask(async () => {
    for (const id of new Set([...pending.keys(), ...pendingStates.keys()])) {
      const project = pending.get(id);
      const state = syncStateFor(id) ?? pendingStates.get(id);
      pending.delete(id);
      pendingStates.delete(id);
      try {
        if (project) await repository.save(project, state ?? undefined);
        else if (state) await repository.saveSyncState(id, state);
      } catch (err) {
        console.error('Autosave failed', err);
        useSaveStore.setState({ status: 'error', isFailing: true });
        return;
      }
    }
    useSaveStore.setState({ status: 'saved', isFailing: false });
  });

  const flush = () => (pending.size || pendingStates.size ? save.run() : save.idle());

  const remember = (project: Project) => {
    pending.set(project.id, project);
    useSaveStore.setState({ status: 'saving' });
  };

  const watcher = watchOpenProject({
    onChange: remember,
    onSwitch(project, previous) {
      if (project) remember(project);
      // What is pending for the previous project is saved right away; a first project waits like any change
      if (previous) void flush();
    },
    onSettled: () => void flush(),
    debounceMs: delayMs,
    onUnload: () => void flush(),
  });

  return {
    flush,
    requestSave(projectId) {
      const { project } = useProjectStore.getState();
      if (project?.id !== projectId) return;
      remember(project);
      void flush();
    },
    saveSyncState(projectId, state) {
      pendingStates.set(projectId, state);
      void flush();
    },
    attachSyncState(source) {
      syncStateFor = source;
      return () => {
        if (syncStateFor === source) syncStateFor = () => null;
      };
    },
    dispose() {
      watcher.dispose();
      void flush();
    },
  };
}
