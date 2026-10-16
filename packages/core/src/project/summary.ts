import type { PackTargetId } from './target';
import type { Project } from './types';

/** What a project list shows of a project without loading it. */
export interface ProjectSummary {
  id: string;
  name: string;
  namespace: string;
  target: PackTargetId;
  itemCount: number;
  updatedAt: number;
}

/** The index entry of a project. */
export function summarizeProject(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    namespace: project.namespace,
    target: project.target,
    itemCount: Object.keys(project.items).length,
    updatedAt: project.updatedAt,
  };
}
