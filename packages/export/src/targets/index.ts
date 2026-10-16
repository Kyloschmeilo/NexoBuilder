/** The pack targets of the export and the lookup by project. */
import { getFolderSlugs, type PackTargetId, type Project } from '@resourcepackbuilder/core/project';
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

/** The config file of a folder's items as a server path (plugins/<plugin>/…); in "one file per item" mode with `itemPlaceholder` as file name. */
export function folderConfigPath(project: Project, folderId: string, itemPlaceholder = '<item_id>'): string {
  const { itemFile, layout } = packTargetFor(project);
  return `${layout.pluginDir}/${itemFile(project, getFolderSlugs(project, folderId), { itemId: itemPlaceholder })}`;
}
