/** Checks of a CraftEngine item config (the shared property checks run over CraftEngine's form) and of its block. */
import { createIssue, isPlainObject, type Issue } from '@resourcepackbuilder/utils';
import {
  autoStateOverruns,
  autoStateGroupOf,
  blockAppearances,
  blockPropertyTypes,
  blockStates,
  CE_BLOCK_MAX_TEXTURES,
  CE_MODEL_KEYS,
  CE_PROPERTIES,
  type CraftEngineBlockModel,
  missingBehaviorProperties,
  parseVariantKey,
  propertyValues,
  sharedBaseBlocks,
  stateAutoState,
  statesMap,
  statesTemplate,
  templateArguments,
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

/** A state or appearance: a known `auto_state` group or a fixed vanilla `state`. */
function validateState(itemExport: ItemExport, state: Record<string, unknown>, appearance: string | null): void {
  const { report } = itemExport;
  const auto = stateAutoState(state);
  if (state.auto_state === undefined && state.state === undefined) {
    if (appearance === null) report('error', 'ce.blockStateMissing');
    else report('error', 'ce.blockAppearanceStateMissing', { appearance });
  } else if (state.auto_state !== undefined && !(auto && autoStateGroupOf(auto.group))) {
    report('error', 'ce.blockAutoStateInvalid', { group: auto?.group ?? String(state.auto_state) });
  }
}

/**
 * Written-out states: complete properties, at least one appearance, and variants that name existing properties,
 * values and appearances.
 */
function validateStates(itemExport: ItemExport, states: Record<string, unknown>): void {
  const { report } = itemExport;
  const properties = statesMap(states, 'properties');
  const values = new Map(Object.entries(properties).map(([name, def]) => [name, propertyValues(def)]));
  for (const [property, list] of values) if (!list) report('error', 'ce.blockPropertyInvalid', { property });
  const appearances = statesMap(states, 'appearances');
  if (Object.keys(appearances).length === 0) report('error', 'ce.blockNoAppearance');
  for (const [variant, value] of Object.entries(statesMap(states, 'variants'))) {
    const pairs = parseVariantKey(variant);
    const known = pairs?.every(([name, v]) => values.get(name)?.includes(v) ?? false);
    if (!known) report('error', 'ce.blockVariantInvalid', { variant });
    const appearance = isPlainObject(value) ? value.appearance : undefined;
    if (appearance !== undefined && !Object.hasOwn(appearances, String(appearance))) {
      report('error', 'ce.blockVariantAppearanceMissing', { variant, appearance: String(appearance) });
    }
  }
}

/**
 * The block: its state (or each appearance of its states) with a known `auto_state` group and a model, the
 * properties its behaviors need, and the arguments a template cannot be filled with.
 */
export function validateCraftEngineBlock(
  itemExport: ItemExport,
  block: Record<string, unknown>,
  blockModel: CraftEngineBlockModel | null,
): void {
  const { report } = itemExport;
  const states = blockStates(block);
  const template = states && statesTemplate(states);
  if (!states) validateState(itemExport, isPlainObject(block.state) ? block.state : {}, null);
  else if (!template) {
    validateStates(itemExport, states);
    for (const [name, appearance] of blockAppearances(block)) validateState(itemExport, appearance, name);
  } else if (template === 'default:block_state/fence') {
    // The fence shows two items: both must be set, and those of this pack must exist
    const { project } = itemExport;
    const items = Object.values(project.items).map((item) => `${project.namespace}:${item.itemId}`);
    const args = templateArguments(states);
    for (const argument of ['fence_post_item', 'fence_side_item']) {
      const value = args[argument];
      if (!value) report('error', 'ce.blockTemplateArgumentMissing', { argument });
      else if (String(value).startsWith(`${project.namespace}:`) && !items.includes(String(value))) {
        report('warning', 'ce.blockFenceItemUnknown', { item: String(value) });
      }
    }
  }
  for (const { behavior, property, type } of missingBehaviorProperties(block, blockPropertyTypes(block))) {
    report('error', 'ce.blockBehaviorProperty', { behavior, property, type });
  }
  if (blockModel && !blockModel.model) report('error', 'ce.blockMissingModel');
  if (blockModel && blockModel.unusedTextures > 0) {
    report('warning', 'ce.blockExtraTextures', { max: CE_BLOCK_MAX_TEXTURES, count: blockModel.unusedTextures });
  }
}

/**
 * Project-wide block checks: one warning per `auto_state` group whose blocks need more vanilla states than the
 * group has, and per vanilla block that several blocks borrow through a template.
 */
export function blockProjectIssues(project: Project): Issue[] {
  return [
    ...autoStateOverruns(project).map(({ group, used, capacity }) =>
      createIssue('warning', 'ce.autoStateBudget', { group, used, capacity }),
    ),
    ...sharedBaseBlocks(project).map(({ block, blocks }) =>
      createIssue('warning', 'ce.blockBaseShared', { block, blocks: blocks.join(', ') }),
    ),
  ];
}
