import { DEFAULT_PACK_NAME } from '../project/factory';
import type { Project } from '../project/types';
import { slugify } from '../text';

/** File name of the project's own Nexo files (glyphs/<name>.yml, recipes/<type>/<name>.yml, items/<name>/). */
export function projectFileName(project: Pick<Project, 'name'>): string {
  return slugify(project.name, DEFAULT_PACK_NAME);
}
