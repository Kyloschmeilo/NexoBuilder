/**
 * Follows the open project for a background service: every change, a switch to another project (or none), a debounced
 * "changes settled" and the page being closed – the one subscription pattern autosave, share sync and test-server sync
 * share.
 */
import type { Project } from '@resourcepackbuilder/core/project/types';
import { useProjectStore } from '../store/project';

export interface WatchOpenProjectOptions {
  /** The open project changed (same project, new content). */
  onChange?: (project: Project) => void;
  /** Another project – or none – was opened. */
  onSwitch?: (project: Project | null, previous: Project | null) => void;
  /** `debounceMs` after the last change or switch, while a project is open. */
  onSettled?: (project: Project) => void;
  debounceMs?: number;
  /** The page is being closed (save what is pending now). */
  onUnload?: () => void;
}

export interface OpenProjectWatcher {
  /** Runs a pending `onSettled` now. */
  flush(): void;
  dispose(): void;
}

export function watchOpenProject({ onChange, onSwitch, onSettled, debounceMs = 0, onUnload }: WatchOpenProjectOptions): OpenProjectWatcher {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let isPending = false;

  const settle = () => {
    clearTimeout(timer);
    if (!isPending) return;
    isPending = false;
    const { project } = useProjectStore.getState();
    if (project) onSettled?.(project);
  };

  const unsubscribe = useProjectStore.subscribe(({ project }, { project: previous }) => {
    if (project === previous) return;
    if (project?.id !== previous?.id) onSwitch?.(project, previous);
    else if (project) onChange?.(project);
    if (project && onSettled) {
      isPending = true;
      clearTimeout(timer);
      timer = setTimeout(settle, debounceMs);
    }
  });

  const handleUnload = () => onUnload?.();
  if (onUnload) window.addEventListener('beforeunload', handleUnload);

  return {
    flush: settle,
    dispose() {
      unsubscribe();
      clearTimeout(timer);
      if (onUnload) window.removeEventListener('beforeunload', handleUnload);
    },
  };
}
