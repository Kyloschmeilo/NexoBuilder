import { slugify } from '../text';
import type { Project } from '../project/types';

/** File name of the project's own Nexo files (glyphs/<name>.yml, recipes/<type>/<name>.yml, items/<name>/). */
export function projectFileName(project: Pick<Project, 'name'>): string {
  return slugify(project.name, 'resourcepackbuilder');
}
