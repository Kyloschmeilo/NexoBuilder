/** The pack targets of the export and the lookup by project. */
import type { PackTargetId, Project } from '@resourcepackbuilder/core/project';
import { NEXO_TARGET } from './nexo';
import type { PackTarget } from './types';

export * from './nexo';
export * from './types';

export const PACK_TARGET_IMPLS: Record<PackTargetId, PackTarget> = {
  nexo: NEXO_TARGET,
  // T8 replaces this with the CraftEngine target
  craftengine: NEXO_TARGET,
};

/** The pack target that exports `project`. */
export function packTargetFor(project: Pick<Project, 'target'>): PackTarget {
  return PACK_TARGET_IMPLS[project.target];
}
