/**
 * Starts everything the app runs in the background – once, before the UI renders – and stops it again.
 */
import { createContext, useContext } from 'react';
import { useLocaleStore } from '../i18n/locale';
import { desktopApi } from '../platform/desktop';
import { setProject } from '../store/project';
import { followOpenProject } from '../store/ui';
import { createAutosave, type Autosave } from './autosave';
import { createProjectRepository, type ProjectRepository } from './projectRepository';
import { createShareSync, type ShareSync } from './shareSync';
import { createTestServerSync, type TestServerSync } from './testServerSync';

export interface AppServices {
  repository: ProjectRepository;
  autosave: Autosave;
  /** Only in the desktop program */
  share: ShareSync | null;
  /** Only in the desktop program */
  testServer: TestServerSync | null;
  dispose(): void;
}

async function openLastProject(repository: ProjectRepository): Promise<void> {
  try {
    const lastId = await repository.lastProjectId();
    const project = lastId ? await repository.load(lastId) : null;
    if (project) setProject(project);
  } catch (err) {
    console.warn('Could not load the last project', err);
  }
}

export async function bootstrap(): Promise<AppServices> {
  const stopFollowing = followOpenProject();
  const repository = createProjectRepository();
  await openLastProject(repository);

  const desktop = desktopApi();

  // The autosave stores the sync state with the project; the share sync asks for a save when that state changes.
  const autosave: Autosave = createAutosave({ repository, syncStateFor: (projectId) => share?.syncStateFor(projectId) ?? null });
  const share = desktop ? createShareSync({ api: desktop.share, repository, onSyncStateChanged: (id) => autosave.requestSave(id) }) : null;
  const testServer = desktop ? createTestServerSync(desktop.testServer) : null;

  // Keeps the desktop program's menus, native dialogs and test-server messages in the app's language
  let stopLocaleSync = () => {};
  if (desktop) {
    const applyLocale = () => void desktop.app.setLocale(useLocaleStore.getState().locale).catch(() => undefined);
    applyLocale();
    stopLocaleSync = useLocaleStore.subscribe((state, prev) => {
      if (state.locale !== prev.locale) applyLocale();
    });
  }

  return {
    repository,
    autosave,
    share,
    testServer,
    dispose() {
      stopFollowing();
      stopLocaleSync();
      testServer?.dispose();
      share?.dispose();
      autosave.dispose();
    },
  };
}

/** The running services, provided by the shell's root once `bootstrap()` finished. */
export const ServicesContext = createContext<AppServices | null>(null);

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices() must be used below the ServicesContext provider');
  return services;
}
