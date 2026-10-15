/** The project file (.resourcepackbuilder.json) used for backups and passing projects on. */
import { CoreError } from '../issues';
import { isPlainObject } from '../object';
import { migrateProject } from './migrate';
import type { Project } from './types';

export const PROJECT_FILE_EXTENSION = '.resourcepackbuilder.json';
const APP_MARKER = 'ResourcepackBuilder';

export function serializeProject(project: Project): string {
  return JSON.stringify({ app: APP_MARKER, formatVersion: 1, project }, null, 1);
}

/** Reads a project file; throws a {@link CoreError} if it is not one. */
export function parseProjectFile(text: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new CoreError('project.invalidFile');
  }
  if (!isPlainObject(data) || data.app !== APP_MARKER || !isPlainObject(data.project)) {
    throw new CoreError('project.notProjectFile');
  }
  return migrateProject(data.project);
}
