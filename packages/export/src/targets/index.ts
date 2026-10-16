/** The pack targets of the export and the lookup by project. */
import type { PackTargetId, Project } from '@resourcepackbuilder/core/project';
import { CRAFT_ENGINE_TARGET } from './craftEngine';
import { NEXO_TARGET } from './nexo';
import type { ExportPlan } from '../types';
import type { PackTarget } from './types';

export * from './craftEngine';
export * from './nexo';
export * from './types';

export const PACK_TARGET_IMPLS: Record<PackTargetId, PackTarget> = {
  nexo: NEXO_TARGET,
  craftengine: CRAFT_ENGINE_TARGET,
};

/** The pack target that exports `project`. */
export function packTargetFor(project: Pick<Project, 'target'>): PackTarget {
  return PACK_TARGET_IMPLS[project.target];
}

/** The pack target that built `plan`. */
export function packTargetOf(plan: Pick<ExportPlan, 'target'>): PackTarget {
  return PACK_TARGET_IMPLS[plan.target];
}
