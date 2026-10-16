/** Creating, opening, closing, deleting and exchanging whole projects. */
import {
  createProject,
  type PackTargetId,
  parseProjectFile,
  type Project,
  PROJECT_FILE_EXTENSION,
  serializeProject,
} from '@resourcepackbuilder/core/project';
import { slugify, uid } from '@resourcepackbuilder/utils';
import { downloadBytes } from '@resourcepackbuilder/ui';
import type { AppServices } from '../services/bootstrap';
import { getProject, setProject } from '../store/project';

/** Switches to another project (or none); pending changes of the open one are saved first. */
async function switchProject({ autosave }: AppServices, project: Project | null): Promise<void> {
  await autosave.flush();
  setProject(project);
}

export async function createNewProject(
  services: AppServices,
  name: string,
  namespace: string,
  minecraftVersion: string,
  target: PackTargetId,
): Promise<Project> {
  const project = createProject(name, namespace || undefined, minecraftVersion, target);
  await switchProject(services, project);
  return project;
}

/** Opens a stored project; resolves with null if it could not be loaded. */
export async function openStoredProject(services: AppServices, id: string): Promise<Project | null> {
  await services.autosave.flush();
  const project = await services.repository.load(id);
  if (project) setProject(project);
  return project;
}

export async function closeProject(services: AppServices): Promise<void> {
  await switchProject(services, null);
  await services.repository.clearLastProjectId();
}

/** Deletes a stored project; an open one is closed first, so nothing writes its data again afterwards. */
export async function deleteStoredProject(services: AppServices, id: string): Promise<void> {
  if (getProject()?.id === id) {
    await switchProject(services, null);
    await services.share?.connect(); // waits until the shared folder is disconnected
  }
  await services.repository.remove(id);
}

/** Downloads the project as a project file. */
export function saveProjectFile(project: Project): void {
  downloadBytes(serializeProject(project), `${slugify(project.name, 'project')}${PROJECT_FILE_EXTENSION}`, 'application/json');
}

interface OpenProjectFileOptions {
  /** Asked when the file holds the open project: replace it with the file's version? */
  confirmReplace: (project: Project) => Promise<boolean>;
  /** Name for a copy, used when the file holds another stored project (which is then kept). */
  copyName: (name: string) => string;
}

/**
 * Opens the project in a project file's text; throws a CoreError for anything that is not a project file.
 * Resolves with the opened project, or null when the user kept the open one.
 */
export async function openProjectFile(
  services: AppServices,
  text: string,
  { confirmReplace, copyName }: OpenProjectFileOptions,
): Promise<Project | null> {
  const project = parseProjectFile(text);
  if (getProject()?.id === project.id) {
    if (!(await confirmReplace(project))) return null;
  } else if ((await services.repository.list()).some((p) => p.id === project.id)) {
    // Never overwrite another stored project – open the file as a copy
    project.id = uid('p_');
    project.name = copyName(project.name);
  }
  await switchProject(services, project);
  return project;
}

interface OpenSharedProjectOptions {
  /** Name shown to the others when neither a stored nor a system user name is known. */
  fallbackUserName: string;
  /**
   * Asked when a stored project has the shared project's id but is not the copy linked to this folder (e.g. the
   * folder was moved, or the local project was never shared): replace it with the shared one?
   */
  confirmReplace: (stored: Project) => Promise<boolean>;
}

/**
 * Opens a shared project from a folder the user picks (OneDrive, Google Drive, Dropbox …) and connects it.
 * The folder's content is untrusted: it never replaces another stored project without asking.
 * Resolves with the project, or null when cancelled.
 */
export async function openSharedProject(
  services: AppServices,
  { fallbackUserName, confirmReplace }: OpenSharedProjectOptions,
): Promise<Project | null> {
  const { share, repository } = services;
  if (!share) return null;
  const picked = await share.pickSharedProject();
  if (!picked) return null;
  const { folder, project: shared, state } = picked;
  await services.autosave.flush();
  const stored = await repository.load(shared.id);
  const existing = await repository.loadShareConfig(shared.id);
  // Opened from this folder before: reconnect the stored copy
  const linked = stored && existing?.folder === folder ? stored : null;
  if (linked) {
    setProject(linked);
  } else {
    if (stored && !(await confirmReplace(stored))) return null;
    if (getProject()?.id === shared.id) {
      await switchProject(services, null);
      await share.connect(); // waits until the old link is disconnected
    }
    const userName = existing?.userName || (await share.defaultUserName()) || fallbackUserName;
    await repository.save(shared, state);
    await repository.saveShareConfig(shared.id, { folder, userName });
    setProject(shared);
  }
  await share.connect();
  return linked ?? shared;
}
