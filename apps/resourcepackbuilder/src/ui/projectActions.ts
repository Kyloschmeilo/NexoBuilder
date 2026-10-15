/** Create, open, save and close projects. */
import { createProject } from '@resourcepackbuilder/core/project/factory';
import { slugify, uid } from '@resourcepackbuilder/core/util';
import {
  clearLastProjectId,
  deleteStoredProject,
  flushNow,
  listProjects,
  loadProject,
  parseProjectFile,
  PROJECT_FILE_EXTENSION,
  serializeProject,
} from '../state/persistence';
import { useStore } from '../state/store';
import { openSharedProject } from '../state/share';
import { errorMessage } from '../i18n/errors';
import { translator } from '../i18n/locale';
import { downloadBytes, pickFiles, readAsText } from '@resourcepackbuilder/ui';

export function startNewProject(name: string, namespace: string, minecraftVersion: string) {
  const project = createProject(name.trim() || translator('state')('defaults.newProjectName'), namespace.trim() || undefined, minecraftVersion);
  useStore.getState().setProject(project);
  useStore.getState().toast('success', translator('state')('project.created', { name: project.name }));
}

export async function openStoredProject(id: string) {
  await flushNow();
  const project = await loadProject(id);
  if (!project) {
    useStore.getState().toast('error', translator('state')('project.loadFailed'));
    return;
  }
  useStore.getState().setProject(project);
}

export async function closeProject() {
  await flushNow();
  await clearLastProjectId();
  useStore.getState().setProject(null);
}

export async function removeStoredProject(id: string) {
  await deleteStoredProject(id);
  if (useStore.getState().project?.id === id) useStore.getState().setProject(null);
}

export function saveProjectFile() {
  const project = useStore.getState().project;
  if (!project) return;
  downloadBytes(serializeProject(project), `${slugify(project.name, 'projekt')}${PROJECT_FILE_EXTENSION}`, 'application/json');
  useStore.getState().toast('success', translator('state')('project.fileSaved'));
}

export async function openProjectFile() {
  const [file] = await pickFiles(`${PROJECT_FILE_EXTENSION},.json`, false);
  if (!file) return;
  try {
    const project = parseProjectFile(await readAsText(file));
    const existing = await listProjects();
    if (existing.some((p) => p.id === project.id) && useStore.getState().project?.id !== project.id) {
      // Do not overwrite an existing project – open it as a copy
      project.id = uid('p_');
      project.name = translator('state')('defaults.importedName', { name: project.name });
    }
    await flushNow();
    useStore.getState().setProject(project);
    useStore.getState().toast('success', translator('state')('project.opened', { name: project.name }));
  } catch (err) {
    useStore.getState().toast('error', errorMessage(err));
  }
}

/** Opens a shared project from a folder (OneDrive, Google Drive, Dropbox …). */
export async function openSharedProjectFromFolder(): Promise<boolean> {
  try {
    const name = await openSharedProject();
    if (!name) return false;
    useStore.getState().toast('success', translator('state')('project.sharedOpened', { name }));
    return true;
  } catch (err) {
    useStore.getState().toast('error', errorMessage(err));
    return false;
  }
}
