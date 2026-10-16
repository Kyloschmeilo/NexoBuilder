/** Checks of a CraftEngine item config (the shared property checks run over CraftEngine's form) and of its block. */
import { createIssue, isPlainObject, type Issue } from '@resourcepackbuilder/utils';
import {
  autoStateOverruns,
  autoStateGroupOf,
  blockAutoState,
  CE_BLOCK_MAX_TEXTURES,
  CE_MODEL_KEYS,
  CE_PROPERTIES,
  type CraftEngineBlockModel,
} from '@resourcepackbuilder/core/craftEngine';
import type { Project } from '@resourcepackbuilder/core/project';
import { ITEM_ID_PATTERN } from '@resourcepackbuilder/minecraft';
import type { ItemExport } from '../../types';
import { validateProperties } from '../../validate/itemConfig';

/**
 * Item IDs of CraftEngine items. CraftEngine itself accepts `.`, `-` and `/` too, but the item ID names files and
 * folders of the export, and the editor writes only these characters, so the export accepts no more.
 */
export const CE_ITEM_ID_PATTERN = ITEM_ID_PATTERN;

/** A material as CraftEngine reads it: an item ID, optionally with a namespace ("diamond", "minecraft:diamond"). */
const CE_MATERIAL_PATTERN = /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/;

export function validateCraftEngineItem(itemExport: ItemExport, config: Record<string, unknown>): void {
  const { report } = itemExport;
  const material = config.material;
  if (typeof material !== 'string' || !CE_MATERIAL_PATTERN.test(material)) {
    report('error', 'ce.materialInvalid', { material: String(material) });
  }
  validateProperties(itemExport, CE_PROPERTIES);
  if (!CE_MODEL_KEYS.some((key) => config[key] !== undefined)) report('warning', 'ce.missingModel');
}

/** The block's state: a known `auto_state` group (or a fixed vanilla `state`) and a model to show. */
export function validateCraftEngineBlock(
  itemExport: ItemExport,
  block: Record<string, unknown>,
  blockModel: CraftEngineBlockModel | null,
): void {
  const { report } = itemExport;
  const state = isPlainObject(block.state) ? block.state : {};
  const auto = blockAutoState(block);
  if (state.auto_state === undefined && state.state === undefined) report('error', 'ce.blockStateMissing');
  else if (state.auto_state !== undefined && !(auto && autoStateGroupOf(auto.group))) {
    report('error', 'ce.blockAutoStateInvalid', { group: auto?.group ?? String(state.auto_state) });
  }
  if (blockModel && !blockModel.model) report('error', 'ce.blockMissingModel');
  if (blockModel && blockModel.unusedTextures > 0) {
    report('warning', 'ce.blockExtraTextures', { max: CE_BLOCK_MAX_TEXTURES, count: blockModel.unusedTextures });
  }
}

/** One warning per `auto_state` group whose blocks need more vanilla states than the group has. */
export function autoStateBudgetIssues(project: Project): Issue[] {
  return autoStateOverruns(project).map(({ group, used, capacity }) =>
    createIssue('warning', 'ce.autoStateBudget', { group, used, capacity }),
  );
}
