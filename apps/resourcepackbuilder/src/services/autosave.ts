/**
 * Saves the open project automatically shortly after every change. Pending saves are kept per project, so a change
 * made right before switching projects is saved for the project it belongs to; a switch saves it immediately.
 */
import type { SyncState } from '@resourcepackbuilder/core/sync/engine';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { useProjectStore } from '../store/project';
import { useSaveStore } from '../store/save';
import { createEvents, type Events } from './events';
import type { ProjectRepository } from './projectRepository';
import { createSerialTask } from './serialTask';

export interface Autosave {
  /** Saves every pending change now. Call before switching projects. */
  flush(): Promise<void>;
  /** Saves the open project although it did not change (e.g. because its sync state changed). */
  requestSave(projectId: string): void;
  /** `failed` is emitted once per series of failed saves; a successful save re-arms it. */
  readonly events: Events<'failed'>;
  dispose(): void;
}

interface AutosaveOptions {
  repository: ProjectRepository;
  /** Sync state stored together with the project (shared projects only). */
  syncStateFor?: (projectId: string) => SyncState | null;
  delayMs?: number;
}

export function createAutosave({ repository, syncStateFor = () => null, delayMs = 600 }: AutosaveOptions): Autosave {
  const pending = new Map<string, Project>();
  const events = createEvents<'failed'>();
  let timer: number | undefined;
  let isFailing = false;

  const save = createSerialTask(async () => {
    for (const [id, project] of [...pending]) {
      pending.delete(id);
      try {
        await repository.save(project, syncStateFor(id) ?? undefined);
        isFailing = false;
      } catch (err) {
        console.error('Autosave failed', err);
        useSaveStore.setState({ status: 'error' });
        if (!isFailing) events.emit('failed');
        isFailing = true;
        return;
      }
    }
    useSaveStore.setState({ status: 'saved' });
  });

  const flush = () => {
    window.clearTimeout(timer);
    return pending.size ? save.run() : save.idle();
  };

  const schedule = (project: Project, immediately: boolean) => {
    pending.set(project.id, project);
    useSaveStore.setState({ status: 'saving' });
    window.clearTimeout(timer);
    if (immediately) void flush();
    else timer = window.setTimeout(() => void flush(), delayMs);
  };

  const unsubscribe = useProjectStore.subscribe(({ project }, { project: previous }) => {
    if (project === previous) return;
    const isProjectSwitch = previous !== null && previous.id !== project?.id;
    if (project) schedule(project, isProjectSwitch);
    else if (isProjectSwitch) void flush();
  });

  const handleUnload = () => void flush();
  window.addEventListener('beforeunload', handleUnload);

  return {
    flush,
    requestSave(projectId) {
      const { project } = useProjectStore.getState();
      if (project?.id === projectId) schedule(project, false);
    },
    events,
    dispose() {
      unsubscribe();
      window.removeEventListener('beforeunload', handleUnload);
      void flush();
    },
  };
}
