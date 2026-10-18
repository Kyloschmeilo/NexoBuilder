/**
 * Nexo: models for which ResourcepackBuilder writes item model definitions (assets/<ns>/items/…) itself:
 * custom inventory icon, connectable furniture, placement, light and state models of furniture
 * as well as stack stages and face models of blocks. The matching values in the item configuration are returned too.
 * The item's own item model tree (`item.itemModel`) is written as its `ItemModel` (Nexo's ItemModel builder) and
 * replaces the generated main definition (inventory icon, connectable furniture).
 */
import { compareVersions, FEATURE_VERSIONS, formatResourceLocation } from '@resourcepackbuilder/minecraft';
import type { ConfigAddition } from '@resourcepackbuilder/core/nexo';
import {
  CONNECT_SLOTS,
  customBlockConfig,
  DIRECTIONAL_MODEL_SLOTS,
  directionalFace,
  directionalFaces,
  directionalModelPath,
  FURNITURE_MODEL_SLOTS,
  itemModelRootValues,
  resolveItemModelTokens,
  furnitureConfig,
  isStringBlock,
  PLACEMENT_SLOTS,
  STACK_MODELS,
  STACKABLE_PATH,
  stateDef,
  type StateSlot,
  type VariantDef,
  variantFrame,
  VARIANTS,
  type VariantSlot,
} from '@resourcepackbuilder/core/project';
import { parseRawYaml } from '@resourcepackbuilder/core/yaml';
import { getPath, isPlainObject } from '@resourcepackbuilder/utils';
import { itemModelDefinitionFile } from '../../paths';
import { validateItemModelTree } from '../../validate/itemModelTree';
import type { ItemExport } from '../../types';

export interface ItemModelsResult {
  /** Custom item model of the item (Components.item_model) */
  itemModel: string | null;
  config: ConfigAddition[];
}

type ItemModelNode = Record<string, unknown>;

const modelRef = (key: string): ItemModelNode => ({ type: 'minecraft:model', model: key });

const SLOT_DEFS = new Map<VariantSlot, VariantDef>([...VARIANTS, ...FURNITURE_MODEL_SLOTS, STACK_MODELS].map((def) => [def.slot, def]));

function defOf(slot: VariantSlot): VariantDef {
  return SLOT_DEFS.get(slot) ?? stateDef(slot.slice('state:'.length));
}

/** Options of {@link writeItemModels}. */
export interface ItemModelsOptions {
  /** The item's own item model tree replaces the main definition (inventory icon, connectable furniture) */
  treeReplacesMain?: boolean;
}

/**
 * @param modelKey key of the item's main model (null = it has none)
 * @param packVariants variant slots that Nexo builds in via Pack.<slot> (they stop working with an own item model)
 */
export function writeItemModels(
  itemExport: ItemExport,
  modelKey: string | null,
  packVariants: VariantSlot[],
  options: ItemModelsOptions = {},
): ItemModelsResult {
  const { project, item, writer, report } = itemExport;
  const ns = project.namespace;
  const result: ItemModelsResult = { itemModel: null, config: [] };
  const variants = item.variants ?? {};
  const has = (slot: VariantSlot) => (variants[slot]?.length ?? 0) > 0;
  const atLeast = (version: string) => compareVersions(project.settings.minecraftVersion, version) >= 0;
  const definitionBase = [...itemExport.folderSlugs, item.itemId].join('/');
  const writeDefinition = (path: string, model: ItemModelNode, extra: Record<string, unknown> = {}) => {
    writer.json(itemModelDefinitionFile(ns, path), { model, ...extra });
    return formatResourceLocation(ns, path);
  };
  /** Writes the first model of a slot as "<main model path>-<suffix>" and returns its key. */
  const writeSlot = (slot: VariantSlot, suffix: string): string | null => {
    const model = variants[slot]?.[0];
    return model ? itemExport.writeModel(model, `${itemExport.modelPath}-${suffix}`, variantFrame(defOf(slot), suffix)).key : null;
  };

  const stateSlots = Object.keys(variants)
    .filter((s): s is StateSlot => s.startsWith('state:'))
    .filter(has);
  const furnitureSlots = [
    ...CONNECT_SLOTS.map((c) => c.slot),
    ...PLACEMENT_SLOTS.map((p) => p.slot),
    'light_on' as const,
    ...stateSlots,
  ].filter(has);
  if (furnitureSlots.length === 0 && !has('gui_model') && !has('stack_models')) return result;
  if (!modelKey) {
    report('error', 'plan.extraModelsNeedMainModel');
    return result;
  }

  const furniture = furnitureConfig(item.config);
  if (furnitureSlots.length > 0 && !furniture) report('warning', 'plan.furnitureMechanicMissing');

  /* ------------------------------------------------ Main item model: connectable + inventory icon */
  let main: ItemModelNode | null = null;
  const replaced = options.treeReplacesMain ? mainDefinitionSlots(has, Boolean(furniture)) : [];
  if (replaced.length > 0) report('warning', 'plan.itemModelTreeReplacesGenerated', { slots: replaced.join(', ') });
  if (furniture && !options.treeReplacesMain) {
    const connect = CONNECT_SLOTS.flatMap((c) => {
      const key = has(c.slot) ? writeSlot(c.slot, c.state) : null;
      return key ? [{ state: c.state, key }] : [];
    });
    if (connect.length > 0) {
      if (!atLeast(FEATURE_VERSIONS.itemModelDefinitions))
        report('error', 'plan.connectableNeedsVersion', { version: FEATURE_VERSIONS.itemModelDefinitions });
      if (connect.length < CONNECT_SLOTS.length) {
        report('info', 'plan.connectableIncomplete', { missing: CONNECT_SLOTS.length - connect.length, total: CONNECT_SLOTS.length });
      }
      const userType = isPlainObject(furniture.connectable) ? furniture.connectable.type : undefined;
      if (userType && userType !== 'ITEM_MODEL') report('warning', 'plan.connectableTypeOverridden', { type: String(userType) });
      result.config.push({ path: ['Mechanics', 'furniture', 'connectable', 'type'], value: 'ITEM_MODEL' });
      main = {
        type: 'minecraft:select',
        property: 'minecraft:block_state',
        block_state_property: 'connectable',
        cases: connect.map((c) => ({ when: c.state, model: modelRef(c.key) })),
        fallback: modelRef(modelKey),
      };
    }
  }
  const guiKey = has('gui_model') && !options.treeReplacesMain ? writeSlot('gui_model', 'gui') : null;
  if (guiKey) {
    main = {
      type: 'minecraft:select',
      property: 'minecraft:display_context',
      cases: [{ when: 'gui', model: modelRef(guiKey) }],
      fallback: main ?? modelRef(modelKey),
    };
  }
  if (main) {
    if (!atLeast(FEATURE_VERSIONS.itemModelDefinitions))
      report('error', 'plan.guiModelNeedsVersion', { version: FEATURE_VERSIONS.itemModelDefinitions });
    if (packVariants.length > 0) report('warning', 'plan.guiModelDisablesVariants', { variants: packVariants.join(', ') });
    const oversized = getPath(item.config, ['Pack', 'oversized_in_gui']) === true ? { oversized_in_gui: true } : {};
    result.itemModel = writeDefinition(definitionBase, main, oversized);
  }

  /* ------------------------------------------------ Furniture: placement, light, states */
  if (isPlainObject(furniture)) {
    /** Writes the model of a furniture slot and its item model definition; returns the definition's key. */
    const furnitureModel = (slot: VariantSlot, suffix: string): string | null => {
      const key = writeSlot(slot, suffix);
      if (!key) return null;
      if (!atLeast(FEATURE_VERSIONS.furnitureItemModels)) {
        report('error', 'plan.furnitureModelsNeedVersion', { version: FEATURE_VERSIONS.furnitureItemModels }, [
          variantFrame(defOf(slot), suffix),
        ]);
      }
      return writeDefinition(`${definitionBase}-${suffix}`, modelRef(key));
    };
    for (const { slot, placement } of PLACEMENT_SLOTS) {
      const itemModel = has(slot) ? furnitureModel(slot, `placement_${placement}`) : null;
      if (itemModel)
        result.config.push({ path: ['Mechanics', 'furniture', 'placements', placement, 'item_model'], value: itemModel, ifMissing: true });
    }
    const lightModel = has('light_on') ? furnitureModel('light_on', 'light_on') : null;
    if (lightModel) {
      result.config.push({ path: ['Mechanics', 'furniture', 'lights', 'toggled_item_model'], value: lightModel, ifMissing: true });
      result.config.push({ path: ['Mechanics', 'furniture', 'lights', 'toggleable'], value: true, ifMissing: true });
    }
    const states = isPlainObject(furniture.states) ? furniture.states : {};
    for (const slot of stateSlots) {
      const name = slot.slice('state:'.length);
      const state = states[name];
      if (!isPlainObject(state)) {
        report('warning', 'plan.stateMissing', { state: name });
        continue;
      }
      const type = typeof state.type === 'string' ? state.type : undefined;
      if (type && type !== 'ITEM_MODEL' && type !== 'FURNITURE') {
        report('warning', 'plan.stateTypeUnused', { state: name, type });
        continue;
      }
      const itemModel = furnitureModel(slot, defOf(slot).suffix);
      if (!itemModel) continue;
      result.config.push({ path: ['Mechanics', 'furniture', 'states', name, 'type'], value: 'ITEM_MODEL', ifMissing: true });
      result.config.push({ path: ['Mechanics', 'furniture', 'states', name, 'item_model'], value: itemModel, ifMissing: true });
    }
  }

  /* ------------------------------------------------ Blocks: stack stages */
  if (has('stack_models')) {
    if (!customBlockConfig(item.config)) {
      report('warning', 'plan.customBlockMechanicMissing');
    } else {
      if (!isStringBlock(item.config)) report('warning', 'plan.stackableNeedsStringblock');
      const keys = (variants.stack_models ?? []).map((model, i) => {
        const suffix = `stack_${i + 1}`;
        return itemExport.writeModel(model, `${itemExport.modelPath}-${suffix}`, variantFrame(STACK_MODELS, suffix)).key;
      });
      result.config.push({ path: STACKABLE_PATH, value: keys.map((model) => ({ model })), ifMissing: true });
    }
  }
  return result;
}

/**
 * Writes the face models of a directional NoteBlock (variant slots `dir_<face>`) and returns the
 * `Mechanics.custom_block.directional.<face>_model` values that point at them. A value the user entered wins; a face
 * the block's directional type does not have is reported and not written.
 * @param modelKey key of the item's main model (null = it has none)
 */
export function writeDirectionalModels(itemExport: ItemExport, modelKey: string | null): ConfigAddition[] {
  const { item, report } = itemExport;
  const slots = DIRECTIONAL_MODEL_SLOTS.filter((def) => (item.variants?.[def.slot]?.length ?? 0) > 0);
  if (slots.length === 0) return [];
  if (!modelKey) {
    report('error', 'plan.extraModelsNeedMainModel');
    return [];
  }
  const faces = directionalFaces(item.config);
  if (faces.length === 0) {
    report('warning', 'plan.directionalMissing');
    return [];
  }
  const additions: ConfigAddition[] = [];
  for (const def of slots) {
    const face = directionalFace(def.slot);
    if (!face) continue;
    if (!faces.includes(face)) {
      report('warning', 'plan.directionalFaceUnused', { face }, [variantFrame(def)]);
      continue;
    }
    const model = item.variants?.[def.slot]?.[0];
    if (!model) continue;
    const key = itemExport.writeModel(model, `${itemExport.modelPath}-${def.suffix}`, variantFrame(def, def.suffix)).key;
    additions.push({ path: directionalModelPath(face), value: key, ifMissing: true });
  }
  return additions;
}

/** The slots the generated main definition would show (inventory icon, connectable furniture models). */
function mainDefinitionSlots(has: (slot: VariantSlot) => boolean, furniture: boolean): VariantSlot[] {
  const connect: VariantSlot[] = furniture ? CONNECT_SLOTS.map((c) => c.slot) : [];
  return (['gui_model', ...connect] as VariantSlot[]).filter(has);
}

/**
 * The item's own item model tree as its `ItemModel` (with `@model` resolved to the main model and the definition's
 * root keys next to the root node), after checking it. Null when the item has no tree, or when the additional YAML
 * sets `ItemModel` itself (which then wins).
 */
export function writeItemModelTree(itemExport: ItemExport, modelKey: string | null): ConfigAddition[] | null {
  const { item, report } = itemExport;
  const definition = item.itemModel;
  if (!definition) return null;
  if (parseRawYaml(item.rawYaml).value?.ItemModel !== undefined) {
    report('warning', 'plan.itemModelTreeOverriddenByRawYaml');
    return null;
  }
  validateItemModelTree(itemExport, modelKey !== null);
  const value = { ...resolveItemModelTokens(definition.model, modelKey), ...itemModelRootValues(definition) };
  return [{ path: ['ItemModel'], value }];
}
