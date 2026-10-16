/** Test helpers around the export. */
import type { MultiExportPlan } from '../src/selection';
import type { ExportPlan } from '../src/types';
import type { Project } from '@resourcepackbuilder/core/project';

/** A planned export of exactly one project, as planMultiExport would return it. */
export function singleExport(project: Project, plan: ExportPlan): MultiExportPlan {
  return { projects: [{ project, plan }], issues: plan.issues };
}
