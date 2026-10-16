/** Test helpers around the export. */
import type { MultiExportPlan } from '../src/selection';
import type { ExportPlan } from '../src/types';
import type { Project } from '@resourcepackbuilder/core/project';

/** A planned export of exactly one project, as planMultiExport would return it. */
export function singleExport(project: Project, plan: ExportPlan): MultiExportPlan {
  return { projects: [{ project, plan }], issues: plan.issues };
}

/** A text file of the plan's plugin folder; fails the test when it is missing or binary. */
export function pluginText(plan: ExportPlan, path: string): string {
  const content = plan.pluginFiles.get(path);
  if (typeof content !== 'string') throw new Error(`No text file ${path} in the plugin files`);
  return content;
}
