/** Projekte anlegen, öffnen, speichern und schließen. */
import { createProject } from '@nexobuilder/core/project/factory';
import { slugify, uid } from '@nexobuilder/core/util';
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
import { downloadBytes, pickFiles, readAsText } from '@nexobuilder/ui';

export function startNewProject(name: string, namespace: string, minecraftVersion: string) {
  const project = createProject(name.trim() || 'Mein Pack', namespace.trim() || undefined, minecraftVersion);
  useStore.getState().setProject(project);
  useStore.getState().toast('success', `Projekt „${project.name}“ wurde angelegt.`);
}

export async function openStoredProject(id: string) {
  await flushNow();
  const project = await loadProject(id);
  if (!project) {
    useStore.getState().toast('error', 'Das Projekt konnte nicht geladen werden.');
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
  useStore.getState().toast('success', 'Projektdatei gespeichert.');
}

export async function openProjectFile() {
  const [file] = await pickFiles(`${PROJECT_FILE_EXTENSION},.json`, false);
  if (!file) return;
  try {
    const project = parseProjectFile(await readAsText(file));
    const existing = await listProjects();
    if (existing.some((p) => p.id === project.id) && useStore.getState().project?.id !== project.id) {
      // Bereits vorhandenes Projekt nicht überschreiben – als Kopie öffnen
      project.id = uid('p_');
      project.name = `${project.name} (importiert)`;
    }
    await flushNow();
    useStore.getState().setProject(project);
    useStore.getState().toast('success', `Projekt „${project.name}“ geöffnet.`);
  } catch (err) {
    useStore.getState().toast('error', (err as Error).message);
  }
}

/** Öffnet ein geteiltes Projekt aus einem Ordner (OneDrive, Google Drive, Dropbox …). */
export async function openSharedProjectFromFolder(): Promise<boolean> {
  try {
    const name = await openSharedProject();
    if (!name) return false;
    useStore.getState().toast('success', `Geteiltes Projekt „${name}“ geöffnet. Änderungen werden jetzt automatisch abgeglichen.`);
    return true;
  } catch (err) {
    useStore.getState().toast('error', (err as Error).message);
    return false;
  }
}
