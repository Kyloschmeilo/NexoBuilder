/** Test helpers around the export. */
import type { MultiExportPlan } from '../src/export/selection';
import type { ExportPlan } from '../src/export/types';
import type { Project } from '../src/project/types';

/** A planned export of exactly one project, as planMultiExport would return it. */
export function singleExport(project: Project, plan: ExportPlan): MultiExportPlan {
  return { projects: [{ project, plan }], issues: plan.issues };
}
