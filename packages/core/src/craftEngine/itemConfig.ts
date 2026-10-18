/**
 * Builds the CraftEngine item config (one entry under `items:`) from an item:
 *  1. clean up the structured config (remove empty fields, keep values without a property)
 *  2. add the automatic values (material, data.item_name, model or models)
 *  3. overlay the user's additional YAML, which wins
 * A block definition in `block` is no item key: it is returned as the block of the same key, and the item gets the
 * behavior that places it. The additional YAML's `block:` is the block's overlay (the same shape as the config,
 * where `block` holds the block); it is merged before the export fills in what the block leaves out (the models of
 * its states, the arguments of a state template), so what it sets wins too.
 * A furniture definition in `furniture` works the same way: it is returned as the furniture of the same key, the item
 * gets the `furniture_item` behavior (with the definition's placement rules), and the additional YAML's `furniture:`
 * is merged over it. An item is either a block or furniture: with both, the block is built and the furniture left out.
 * The config's `behavior` picks the kind of placement (and its keys) for the item's block or furniture, its
 * `behaviors` adds further behaviors after the placement (itemBehaviors.ts).
 * An item of an armor set gets `settings.equipment` (the set's equipment, see export/equipment); what the config sets
 * there wins, as Nexo's `Components.equippable` does.
 * The events of the item, its block and its furniture are written in the list form (events.ts), whatever form the
 * config or the additional YAML holds them in.
 */
import type { JavaModelJson } from '@resourcepackbuilder/minecraft';
import { deepClone, deepMerge, isPlainObject } from '@resourcepackbuilder/utils';
import type { Item, Project } from '../project/types';
import { itemMaterial, rawYamlMaterial } from '../project/item';
import { slotForMaterial, type ItemArmor } from '../project/armor';
import { cleanConfig } from '../form/prune';
import { parseRawYaml, type RawYamlError } from '../yaml';
import { CRAFT_ENGINE_FORM } from './form/schema';
import {
  craftEngineBlock,
  craftEngineBlockModel,
  mergeBlockOverlay,
  rawBlockOverlay,
  craftEngineBlockTextures,
  type CraftEngineBlockModel,
} from './block';
import { blockBehaviorForm, blockBehaviorType } from './blockBehaviors';
import { blockStates, CE_STATE_TEMPLATES, statesTemplate, templateArguments } from './blockStates';
import { buildRenderer, rendererElements, stateEntityCulling } from './blockRenderer';
import { withEventList } from './events';
import { buildCraftEngineFurniture, craftEngineFurniture } from './furniture';
import { extraBehaviors, type OwnPlacement, placementBehavior, writeBehaviors } from './itemBehaviors';
import { craftEngineItemName } from './lang';
import { craftEngineItemKey, ordered } from './yaml';

/** Order of the keys in the YAML (as in the CraftEngine docs); other keys follow in their own order. */
const TOP_LEVEL_ORDER = ['material', 'client_bound_material', 'data', 'model', 'models', 'settings', 'behavior', 'behaviors', 'events'];
/** Order of the keys of a block, of its states, of a state (or appearance) and of its model */
const BLOCK_ORDER = ['state', 'states', 'settings', 'behavior', 'behaviors', 'loot', 'events'];
const STATES_ORDER = ['id', 'template', 'arguments', 'merges', 'properties', 'appearances', 'variants'];
const STATE_ORDER = ['id', 'auto_state', 'state', 'model', 'models', 'transparent', 'entity_renderer'];
const MODEL_ORDER = ['path', 'x', 'y', 'z', 'uvlock', 'weight', 'generation'];
/** Keys of a state that give it its look (block/states.mdx, appearance keys); the generated model is added only without them */
const STATE_APPEARANCE_KEYS = ['model', 'models', 'texture', 'textures', 'blueprint', 'transparent'];

/**
 * The keys CraftEngine builds an item's look from (AbstractItemManager: `model(s)|texture(s)|blueprint|legacy_model`).
 * CraftEngine reads only the first of `model`/`models` it finds, so the raw YAML replaces the generated model
 * whenever it sets any of them.
 */
export const CE_MODEL_KEYS = ['model', 'models', 'texture', 'textures', 'blueprint', 'legacy_model'];

export interface CraftEngineBuildContext {
  project: Project;
  item: Item;
  /** "namespace:path" of the main model, or null if the item has none */
  modelKey: string | null;
  /** All models in CraftEngine's slot order for materials with several states (bow, crossbow …); written as `models:` */
  models?: string[] | null;
  /** The written main model, which a block's state shows */
  modelJson?: JavaModelJson | null;
  /** The item's usable armor set (null = none) */
  armor?: ItemArmor | null;
}

export interface CraftEngineBuildResult {
  config: Record<string, unknown>;
  /** The block the item places (its entry under `blocks:`), null if the item is no block */
  block: Record<string, unknown> | null;
  /** How the block's states got their model (null if the item is no block or its states set their look themselves) */
  blockModel: CraftEngineBlockModel | null;
  rawYamlError: RawYamlError | null;
  /** The additional YAML has a `block:` but the item is no block (it is left out) */
  rawBlockIgnored: boolean;
  /** The additional YAML's `block:` is no mapping (it is left out) */
  rawBlockInvalid: boolean;
  /** The furniture the item places (its entry under `furniture:`), null if the item is no furniture */
  furniture: Record<string, unknown> | null;
  /** The item is a block and furniture at once (the furniture is left out) */
  furnitureIgnored: boolean;
  /** The additional YAML has a `furniture:` but the item is no furniture (it is left out) */
  rawFurnitureIgnored: boolean;
  /** The placement type the config's `behavior` picks, when it does not fit the item's block or furniture (left out) */
  placementTypeIgnored: string | null;
  /** The additional YAML lists the item's behaviors itself (written in place of the form's extra behaviors) */
  rawBehaviorsOverride: boolean;
}

/**
 * The item's base material as CraftEngine gets it: the raw YAML's `material` if it sets one, otherwise the app's
 * material in lower case (e.g. "diamond_sword").
 */
export function craftEngineMaterial(item: Item): string {
  return rawYamlMaterial(item) ?? itemMaterial(item).toLowerCase();
}

const asList = (value: unknown): unknown[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

/** The textures of a model's `textures`/`texture` shorthand (a list or one texture), null without one. */
function modelTextures(model: Record<string, unknown>): unknown[] | null {
  const value = model.textures ?? model.texture;
  return value === undefined ? null : asList(value);
}

/**
 * A state or appearance with the item's model when it sets no look itself. A `model` with only a rotation
 * (`{ y: 90 }`, as a block facing the player has) gets the item's model path too. A `model` that names its textures
 * (CraftEngine builds the model from them) keeps them: one texture is its own model, several get the path `texturesPath`
 * to save the built model at. An entity renderer on a fixed vanilla `state` is its look (the jar's sofa draws on a
 * barrier); on an `auto_state` the block keeps the model below.
 */
function withModel(
  state: Record<string, unknown>,
  model: () => Record<string, unknown> | null,
  texturesPath: string | null,
): Record<string, unknown> {
  const result = { ...state };
  const textures = isPlainObject(result.model) && result.model.path === undefined ? modelTextures(result.model) : null;
  if (textures && isPlainObject(result.model)) {
    if (textures.length > 1 && texturesPath) result.model = ordered({ path: texturesPath, ...result.model }, MODEL_ORDER);
  } else if (result.auto_state === undefined && rendererElements(result).length > 0) {
    // A model with only a rotation (from an older "face the player") would re-skin the vanilla state: left out
    if (isPlainObject(result.model) && result.model.path === undefined) delete result.model;
  } else if (STATE_APPEARANCE_KEYS.every((key) => result[key] === undefined)) {
    const generated = model();
    if (generated) result.model = generated;
  } else if (isPlainObject(result.model) && result.model.path === undefined) {
    const generated = model();
    if (generated) result.model = ordered({ ...generated, ...result.model }, MODEL_ORDER);
  }
  return ordered(result, STATE_ORDER);
}

/** The bottom, side and top texture from 1 to 3 textures (the slot order of generated blocks: bottom/end, side, top). */
function slotTextures(textures: string[]) {
  const [first, second, third] = textures;
  return { bottom: first, side: second ?? first, top: third ?? first };
}

/**
 * The arguments the export fills a known template with from the item's model: the model paths it generates (next
 * to the main model: `<main>-slab`, `<main>-slab_top` …) and the textures.
 */
function templateFills(template: string, base: string, textures: string[], cube: Record<string, unknown> | null) {
  const slots = slotTextures(textures);
  const [first, second] = textures;
  switch (template) {
    case 'default:block_state/slab':
      return {
        slab_texture: slots.side,
        slab_texture_bottom: slots.bottom,
        slab_texture_side: slots.side,
        slab_texture_top: slots.top,
        slab_model: `${base}-slab`,
        planks_model: cube?.path ?? `${base}-block`,
      };
    case 'default:block_state/stairs':
      return {
        stairs_texture: slots.side,
        stairs_texture_bottom: slots.bottom,
        stairs_texture_side: slots.side,
        stairs_texture_top: slots.top,
        stairs_model: `${base}-stairs`,
      };
    case 'default:block_state/door':
      return { door_model: `${base}-door`, door_texture_bottom: first, door_texture_top: second ?? first };
    case 'default:block_state/trapdoor':
      return { trapdoor_model: `${base}-trapdoor`, trapdoor_texture: first };
    case 'default:block_state/fence_gate':
      return { fence_gate_model: `${base}-fence_gate`, fence_gate_texture: first };
    case 'default:block_state/leaves':
      return { leaves_model: `${base}-leaves`, leaves_texture: first };
    default:
      return null;
  }
}

const SLAB_TEMPLATE = 'default:block_state/slab';
/** Templates whose looks the export generates from the item's textures (the fence shows two items instead). */
const TEMPLATES_WITH_TEXTURES = new Set(
  ['slab', 'stairs', 'door', 'trapdoor', 'fence_gate', 'leaves'].map((name) => `default:block_state/${name}`),
);

/** The block of the item with the models of its states (or a template's arguments) from the main model. */
function buildBlock(source: Record<string, unknown>, context: CraftEngineBuildContext, rawBlock: Record<string, unknown> | null) {
  const merged = mergeBlockOverlay(source, rawBlock);
  const form = blockBehaviorForm(blockBehaviorType(merged));
  const modelJson = context.modelJson ?? null;
  let blockModel: CraftEngineBlockModel | null = null;
  // The first state that shows the generated model generates it; the others name its path only
  let generated = false;
  const model = () => {
    const main = (blockModel ??= craftEngineBlockModel(context.modelKey, modelJson, form?.plant)).model;
    if (!main) return null;
    const result = generated ? { path: main.path } : deepClone(main);
    generated = true;
    return result;
  };

  // A state's look: its model (the item's when it sets none) and its entity renderer, which shows the item by default
  const itemKey = craftEngineItemKey(context.project, context.item);
  // A model CraftEngine builds from an appearance's textures is saved next to the main model, named after the appearance
  // (an appearance named "block" would take the path of the model generated from the item's textures)
  const look = (state: Record<string, unknown>, name: string) =>
    buildRenderer(withModel(state, model, context.modelKey && `${context.modelKey}-${name === 'block' ? 'look_block' : name}`), itemKey);

  const states = blockStates(merged);
  const template = states && statesTemplate(states);
  if (states && template) {
    const textures = craftEngineBlockTextures(modelJson);
    const modelKey = textures.length > 0 ? context.modelKey : null;
    // A double slab is a full block: the main model when it has a shape, else a cube CraftEngine generates
    const cube = modelKey && template === SLAB_TEMPLATE ? model() : null;
    const fills = modelKey ? templateFills(template, modelKey, textures, cube) : null;
    if (!modelKey && TEMPLATES_WITH_TEXTURES.has(template)) blockModel = { model: null, unusedTextures: 0 };
    // The form's vanilla block is filled in too when the user removed it
    const base = CE_STATE_TEMPLATES[template]?.baseArgument;
    const presetArgs = form?.preset(itemKey).states?.arguments;
    const presetBase = base && isPlainObject(presetArgs) && presetArgs[base] !== undefined ? { [base]: presetArgs[base] } : {};
    const args = { ...presetBase, ...templateArguments(states) };
    // The arguments set in the config first (as the jar writes the vanilla block first), then the filled ones
    const next: Record<string, unknown> = { ...states, arguments: { ...args, ...(fills ?? {}), ...args } };
    if (cube?.generation && args.planks_model === undefined) {
      next.merges = deepMerge(
        { appearances: { 'type=double,waterlogged=false': { model: { generation: cube.generation } } } },
        isPlainObject(states.merges) ? states.merges : {},
      );
    }
    merged.states = ordered(next, STATES_ORDER);
  } else if (states) {
    const appearances = isPlainObject(states.appearances) ? states.appearances : {};
    const filled = Object.fromEntries(
      Object.entries(appearances).map(([name, value]) => [name, isPlainObject(value) ? look(value, name) : value]),
    );
    merged.states = ordered({ ...states, appearances: filled }, STATES_ORDER);
  } else {
    merged.state = look(isPlainObject(merged.state) ? merged.state : {}, 'state');
  }
  // The block's item, which the creative pick (middle click) gives; an item the settings name wins
  const settings = isPlainObject(merged.settings) ? merged.settings : {};
  merged.settings = { item: itemKey, ...settings };

  // Entity culling is read from the block itself (blockRenderer.ts)
  if (merged.entity_culling === undefined) {
    const culling = stateEntityCulling(merged);
    if (culling !== undefined) merged.entity_culling = deepClone(culling);
  }

  // CraftEngine reads one of `behavior` and `behaviors`: the form's behavior goes after the other ones
  // A behavior's type comes first (the form's keys may sit before it in the config)
  const typeFirst = (value: unknown) => (isPlainObject(value) ? ordered(value, ['type']) : value);
  if (merged.behavior !== undefined)
    merged.behavior = Array.isArray(merged.behavior) ? merged.behavior.map(typeFirst) : typeFirst(merged.behavior);
  if (merged.behaviors !== undefined)
    merged.behaviors = Array.isArray(merged.behaviors) ? merged.behaviors.map(typeFirst) : typeFirst(merged.behaviors);
  if (merged.behavior !== undefined && merged.behaviors !== undefined) {
    merged.behaviors = [...asList(merged.behaviors), ...asList(merged.behavior)];
    delete merged.behavior;
  }
  return { block: ordered(withEventList(merged), BLOCK_ORDER), blockModel: blockModel as CraftEngineBlockModel | null, form };
}

/**
 * Points `settings.equipment` at the item's armor set: its asset id and, when the material is no armor (which brings
 * its slot), the set's slot. Elytra wings on another material need the glider component.
 */
function addArmor(resolved: Record<string, unknown>, data: Record<string, unknown>, armor: ItemArmor, rawMaterial: string): void {
  // The raw YAML may name the material with its namespace (minecraft:elytra)
  const material = rawMaterial.toLowerCase().replace(/^minecraft:/, '');
  const settings = isPlainObject(resolved.settings) ? resolved.settings : {};
  const equipment = isPlainObject(settings.equipment) ? settings.equipment : {};
  const slot = slotForMaterial(material) ? undefined : (armor.slot ?? 'HEAD').toLowerCase();
  settings.equipment = { asset_id: armor.assetId, ...(slot && { slot }), ...equipment };
  resolved.settings = settings;
  if (armor.glider && material !== 'elytra') {
    const components = isPlainObject(data.components) ? data.components : {};
    if (components['minecraft:glider'] === undefined) data.components = { ...components, 'minecraft:glider': {} };
  }
}

/** A craft remainder with its `type` first, in the remainders of its recipe terms and its fallback too. */
function remainderTypeFirst(value: unknown): unknown {
  if (!isPlainObject(value)) return value;
  const result = ordered(value, ['type']);
  if (Array.isArray(result.terms)) {
    result.terms = result.terms.map((term) =>
      isPlainObject(term) && term.craft_remainder !== undefined
        ? { ...term, craft_remainder: remainderTypeFirst(term.craft_remainder) }
        : term,
    );
  }
  if (result.fallback !== undefined) result.fallback = remainderTypeFirst(result.fallback);
  return result;
}

/** Placement keys the furniture definition adds to the item's furniture behavior (`placementExtras`, when built). */
function furniturePlacementExtras(furniture: object): Record<string, unknown> | null {
  const extras = 'placementExtras' in furniture ? furniture.placementExtras : undefined;
  return isPlainObject(extras) ? extras : null;
}

/** The config with the events of the item, its block and its furniture in the list form (pruning keeps only lists). */
function withEventLists<T extends Record<string, unknown>>(config: T): T {
  const result: Record<string, unknown> = withEventList(config);
  for (const key of ['block', 'furniture']) if (isPlainObject(result[key])) result[key] = withEventList(result[key]);
  return result as T;
}

export function buildCraftEngineItem(context: CraftEngineBuildContext): CraftEngineBuildResult {
  const { project, item, modelKey, models } = context;
  const resolved: Record<string, unknown> = cleanConfig(CRAFT_ENGINE_FORM, withEventLists(deepClone(item.config)));

  if (isPlainObject(resolved.settings) && resolved.settings.craft_remainder !== undefined) {
    resolved.settings.craft_remainder = remainderTypeFirst(resolved.settings.craft_remainder);
  }

  const raw = parseRawYaml(item.rawYaml);
  const rawItem = raw.value ? { ...raw.value } : null;
  // The same overlay the auto_state budget and the base block check read (effectiveCraftEngineBlock)
  const rawBlockYaml = rawBlockOverlay(item.rawYaml);
  const rawBlock = rawBlockYaml.block;
  const rawFurniture = rawItem && isPlainObject(rawItem.furniture) ? rawItem.furniture : null;
  if (rawItem) {
    delete rawItem.block;
    delete rawItem.furniture;
  }

  // Whether the item is a block is decided on the item's own config (as isBlockItem does), not on the cleaned one
  const isBlock = craftEngineBlock(item.config) !== null;
  const built = isBlock ? buildBlock(isPlainObject(resolved.block) ? resolved.block : {}, context, rawBlock) : null;
  delete resolved.block;
  const itemKey = craftEngineItemKey(project, item);

  const isFurniture = craftEngineFurniture(item.config) !== null;
  const furnitureSource = isPlainObject(resolved.furniture) ? resolved.furniture : {};
  const furniture = isFurniture && !isBlock ? buildCraftEngineFurniture(furnitureSource, rawFurniture, itemKey) : null;
  delete resolved.furniture;

  // The behavior that places the item's block or furniture, then the extra behaviors
  const own: OwnPlacement | null = built
    ? { kind: 'block', key: itemKey, defaultType: built.form?.itemBehavior ?? 'block_item' }
    : furniture
      ? { kind: 'furniture', key: itemKey, rules: furniture.rules, extras: furniturePlacementExtras(furniture) }
      : null;
  const placement = placementBehavior(resolved.behavior, own);
  const extras = Array.isArray(resolved.behavior)
    ? [...resolved.behavior, ...extraBehaviors(resolved.behaviors)]
    : extraBehaviors(resolved.behaviors);
  const { raw: rawRest, rawListOverrides } = writeBehaviors(resolved, placement.behavior, extras, rawItem);

  // The managed paths are set below, whatever the config holds there
  delete resolved.material;
  const data = isPlainObject(resolved.data) ? resolved.data : {};
  delete data.item_name;
  const name = craftEngineItemName(project, item);
  const withName = name ? { item_name: name, ...data } : data;
  if (context.armor) addArmor(resolved, withName, context.armor, craftEngineMaterial(item));
  if (Object.keys(withName).length > 0) resolved.data = withName;
  else delete resolved.data;

  const rawSetsModel = rawRest !== null && CE_MODEL_KEYS.some((key) => rawRest[key] !== undefined);
  if (rawSetsModel) {
    delete resolved.model;
    delete resolved.models;
  } else if (models && models.length > 0) resolved.models = models;
  else if (modelKey) resolved.model = modelKey;
  const config = { material: itemMaterial(item).toLowerCase(), ...ordered(resolved, TOP_LEVEL_ORDER) };

  return {
    config: withEventList(rawRest ? deepMerge(config, rawRest) : config),
    block: built?.block ?? null,
    blockModel: built?.blockModel ?? null,
    rawYamlError: raw.error,
    rawBlockIgnored: rawBlock !== null && !isBlock,
    rawBlockInvalid: rawBlockYaml.invalid,
    furniture: furniture ? withEventList(furniture.furniture) : null,
    furnitureIgnored: isFurniture && isBlock,
    rawFurnitureIgnored: rawFurniture !== null && !isFurniture,
    placementTypeIgnored: placement.ignoredType,
    rawBehaviorsOverride: rawListOverrides,
  };
}
