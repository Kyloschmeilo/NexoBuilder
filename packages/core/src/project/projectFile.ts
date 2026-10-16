/** The project file (.resourcepackbuilder.json) used for backups and passing projects on. */
import { z } from 'zod';
import { parseJson, plainObject, unwrapJson } from '@resourcepackbuilder/utils';
import { migrateProject } from './migrate';
import type { Project } from './types';

export const PROJECT_FILE_EXTENSION = '.resourcepackbuilder.json';
const APP_MARKER = 'ResourcepackBuilder';

/** The envelope of a project file; the project itself goes through the migration. */
const ProjectFileSchema = z.object({ app: z.literal(APP_MARKER), project: plainObject() });

export function serializeProject(project: Project): string {
  return JSON.stringify({ app: APP_MARKER, formatVersion: 1, project }, null, 1);
}

/** Reads a project file; throws a {@link CoreError} if it is not one. */
export function parseProjectFile(text: string): Project {
  const file = unwrapJson(parseJson(text, ProjectFileSchema, { syntax: 'project.invalidFile', shape: 'project.notProjectFile' }));
  return migrateProject(file.project);
}
