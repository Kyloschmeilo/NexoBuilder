/** Files for the local test server: the project as it lies in the plugin folder of its target (e.g. plugins/Nexo/). */
import { type ExportPlan, type FileContent, pluginFolderEntries } from '@resourcepackbuilder/export';
import type { Project } from '@resourcepackbuilder/core/project';

export interface ServerFile {
  /** Path relative to the plugin folder (`ServerAdapter.pluginDir`) */
  path: string;
  data: FileContent;
}

/** All project files for the plugin folder (resource pack always as a folder, which syncs faster). */
export function pluginFolderFiles(project: Project, plan: ExportPlan): ServerFile[] {
  const entries = pluginFolderEntries({ projects: [{ project, plan }], issues: plan.issues }, { packAsFolder: true });
  const files: ServerFile[] = [];
  for (const [path, entry] of entries) if ('content' in entry) files.push({ path, data: entry.content });
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
