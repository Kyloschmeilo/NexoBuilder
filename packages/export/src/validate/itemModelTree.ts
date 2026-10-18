/** Checks the item's own item model tree (core's validation) and reports its issues in the item's context. */
import { validateItemModelDefinition } from '@resourcepackbuilder/core/project';
import type { ItemExport } from '../types';

/** Reports the problems of the item's item model tree; `hasMainModel` says whether `@model` has a model to stand for. */
export function validateItemModelTree(itemExport: ItemExport, hasMainModel: boolean): void {
  const { project, item, report } = itemExport;
  if (!item.itemModel) return;
  const issues = validateItemModelDefinition(item.itemModel, { minecraftVersion: project.settings.minecraftVersion, hasMainModel });
  for (const issue of issues) report(issue.level, issue.code, issue.args, issue.context);
}
