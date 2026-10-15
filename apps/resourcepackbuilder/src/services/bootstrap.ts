/**
 * Starts everything the app runs in the background – once, before the UI renders – and stops it again.
 */
import { loadStoredLocale } from '../i18n/locale';
import { desktopApp, desktopShare, desktopTestServer } from '../platform/desktop';
import { setProject } from '../store/project';
import { createAutosave, type Autosave } from './autosave';
import { startDesktopLocaleSync } from './desktopLocaleSync';
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
  loadStoredLocale();
  const repository = createProjectRepository();
  await openLastProject(repository);

  const shareApi = desktopShare();
  const testServerApi = desktopTestServer();
  const appApi = desktopApp();

  // The autosave stores the sync state with the project; the share sync asks for a save when that state changes.
  const autosave: Autosave = createAutosave({ repository, syncStateFor: (projectId) => share?.syncStateFor(projectId) ?? null });
  const share = shareApi ? createShareSync({ api: shareApi, repository, onSyncStateChanged: (id) => autosave.requestSave(id) }) : null;
  const testServer = testServerApi ? createTestServerSync(testServerApi) : null;
  const stopLocaleSync = appApi ? startDesktopLocaleSync(appApi) : () => undefined;

  return {
    repository,
    autosave,
    share,
    testServer,
    dispose() {
      stopLocaleSync();
      testServer?.dispose();
      share?.dispose();
      autosave.dispose();
    },
  };
}
