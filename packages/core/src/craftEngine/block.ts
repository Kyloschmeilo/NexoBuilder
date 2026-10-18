/**
 * CraftEngine blocks: an item becomes a block when its config holds a block definition in `block` (state, settings,
 * loot). The export writes it under `blocks:` with the item's key and makes the item place it (`block_item`).
 */
import { compareVersions, isGeneratedItemParent, type JavaModelJson } from '@resourcepackbuilder/minecraft';
import { deepMerge, isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject, Item, Project } from '../project/types';
import { parseRawYaml } from '../yaml';
import { blockAppearances, blockStates, CE_STATE_TEMPLATES, statesTemplate, templateArguments } from './blockStates';

/**
 * The `auto_state` groups: the vanilla block states CraftEngine borrows for a block's look, with how many of them
 * its default `block_state_mappings` (internal/configuration/mappings.yml of the 26.9 jar) free up. Each group lists
 * the smaller groups whose states it contains (`solid` holds the note block and the three mushroom blocks); `extra`
 * are states that only newer Minecraft versions have (the note block instruments of 26.1); the counts are those of
 * 1.21.4, the oldest version the app exports for.
 * The group names (the canonical id first, then the other names CraftEngine accepts) and their vanilla blocks come
 * from the plugin's AutoStateGroup.
 */
export interface AutoStateGroup {
  id: string;
  /** Other names CraftEngine accepts for the group (AutoStateGroup.byId) */
  aliases?: string[];
  capacity: number;
  includes?: string[];
  extra?: { from: string; count: number };
}

export const CE_AUTO_STATE_GROUPS: AutoStateGroup[] = [
  {
    id: 'solid',
    capacity: 1289,
    includes: ['note_block', 'mushroom', 'mushroom_stem', 'red_mushroom_block', 'brown_mushroom_block'],
    extra: { from: '26.1', count: 200 },
  },
  { id: 'note_block', capacity: 1100, extra: { from: '26.1', count: 200 } },
  { id: 'mushroom', capacity: 189, includes: ['mushroom_stem', 'red_mushroom_block', 'brown_mushroom_block'] },
  { id: 'mushroom_stem', capacity: 63 },
  { id: 'red_mushroom_block', capacity: 63 },
  { id: 'brown_mushroom_block', capacity: 63 },
  { id: 'leaves', capacity: 117, includes: ['tintable_leaves', 'non_tintable_leaves'] },
  {
    id: 'waterlogged_leaves',
    capacity: 117,
    includes: ['waterlogged_tintable_leaves', 'waterlogged_non_tintable_leaves'],
  },
  { id: 'tintable_leaves', capacity: 65 },
  { id: 'waterlogged_tintable_leaves', capacity: 65 },
  { id: 'non_tintable_leaves', aliases: ['no_tint_leaves', 'leaves_no_tint'], capacity: 52 },
  {
    id: 'waterlogged_non_tintable_leaves',
    aliases: ['waterlogged_no_tint_leaves', 'waterlogged_leaves_no_tint'],
    capacity: 52,
  },
  { id: 'tripwire', capacity: 126, includes: ['lower_tripwire', 'higher_tripwire'] },
  { id: 'lower_tripwire', capacity: 63 },
  { id: 'higher_tripwire', capacity: 63 },
  { id: 'sapling', capacity: 8 },
  { id: 'pressure_plate', capacity: 28 },
  { id: 'cactus', capacity: 15 },
  { id: 'sugar_cane', capacity: 15 },
  { id: 'weeping_vines', aliases: ['weeping_vine'], capacity: 25 },
  { id: 'twisting_vines', aliases: ['twisting_vine'], capacity: 25 },
  { id: 'cave_vines', aliases: ['cave_vine'], capacity: 48 },
  { id: 'kelp', capacity: 25 },
  // The default mappings leave the chorus plant out (commented out in mappings.yml): it has no free states
  { id: 'chorus', capacity: 0 },
];

/** The canonical group ids (the editor offers these). */
export const CE_AUTO_STATE_GROUP_IDS = CE_AUTO_STATE_GROUPS.map((group) => group.id);

const GROUPS_BY_NAME = new Map(CE_AUTO_STATE_GROUPS.flatMap((group) => [group.id, ...(group.aliases ?? [])].map((name) => [name, group])));

/** The group of a canonical id or an alias (`cave_vine` is `cave_vines`), undefined for an unknown name. */
export function autoStateGroupOf(name: string): AutoStateGroup | undefined {
  return GROUPS_BY_NAME.get(name);
}

/** The group a new block uses: full-block collision from note blocks and mushroom blocks. */
export const CE_DEFAULT_AUTO_STATE = 'solid';

/** Free vanilla states of the group on the Minecraft version. */
export function autoStateCapacity(group: AutoStateGroup, minecraftVersion: string): number {
  const extra = group.extra && compareVersions(minecraftVersion, group.extra.from) >= 0 ? group.extra.count : 0;
  return group.capacity + extra;
}

/** The item's block definition, or null when the item is no block. */
export function craftEngineBlock(config: ConfigObject): Record<string, unknown> | null {
  const block = config.block;
  return isPlainObject(block) ? block : null;
}

export interface RawBlockOverlay {
  /** The additional YAML's `block:` mapping, null without one */
  block: Record<string, unknown> | null;
  /** The additional YAML has a `block:` that is no mapping (it is left out) */
  invalid: boolean;
}

/** The additional YAML's `block:`, the overlay of the item's block. */
export function rawBlockOverlay(rawYaml: string): RawBlockOverlay {
  const value = parseRawYaml(rawYaml).value?.block;
  if (value === undefined || value === null) return { block: null, invalid: false };
  return isPlainObject(value) ? { block: value, invalid: false } : { block: null, invalid: true };
}

/**
 * The block the export writes for the item, before it fills in models: the config's block with the additional
 * YAML's `block:` merged over it (the YAML wins); null when the item is no block.
 */
export function effectiveCraftEngineBlock(item: Pick<Item, 'config' | 'rawYaml'>): Record<string, unknown> | null {
  const block = craftEngineBlock(item.config);
  return block && mergeBlockOverlay(block, rawBlockOverlay(item.rawYaml).block);
}

/**
 * A block with the additional YAML's `block:` merged over it. CraftEngine reads `state` before `states`, so a block
 * keeps one of them: the one the YAML sets, else `states`.
 */
export function mergeBlockOverlay(block: Record<string, unknown>, raw: Record<string, unknown> | null): Record<string, unknown> {
  const merged = raw ? deepMerge(block, raw) : { ...block };
  if (merged.state !== undefined && merged.states !== undefined) {
    if (raw?.state !== undefined && raw.states === undefined) delete merged.states;
    else delete merged.state;
  }
  return merged;
}

/** A new block: a full block from the `solid` group that drops itself (CraftEngine's built-in loot template). */
export function newCraftEngineBlock(): ConfigObject {
  return { state: { auto_state: CE_DEFAULT_AUTO_STATE }, loot: { template: 'default:loot_table/self' } };
}

export interface BlockAutoState {
  /** The group name as written (a canonical id, an alias or an unknown name) */
  group: string;
  /** The id of a shared state (`{ type, id }`), null for the simple form */
  shared: string | null;
}

/** The `auto_state` of a state or appearance (simple form `solid`, shared form `{ type: solid, id: … }`), null without one. */
export function stateAutoState(state: unknown): BlockAutoState | null {
  const auto = isPlainObject(state) ? state.auto_state : undefined;
  if (typeof auto === 'string') return { group: auto, shared: null };
  if (isPlainObject(auto) && typeof auto.type === 'string') {
    return { group: auto.type, shared: auto.id === undefined ? null : String(auto.id) };
  }
  return null;
}

/** The `auto_state` of the block's single state; null when it has none (or several states). */
export function blockAutoState(block: Record<string, unknown>): BlockAutoState | null {
  return stateAutoState(block.state);
}

/**
 * Every `auto_state` the block takes: that of its single state, of each appearance of its states, or those of the
 * template its states come from (leaves take one state from a leaves group and one from its waterlogged twin).
 */
export function blockAutoStates(block: Record<string, unknown>): BlockAutoState[] {
  const states = blockStates(block);
  const template = states && statesTemplate(states);
  if (states && template) {
    const groups = CE_STATE_TEMPLATES[template]?.autoStates?.(templateArguments(states)) ?? [];
    return groups.map((group) => ({ group, shared: null }));
  }
  return blockAppearances(block).flatMap(([, appearance]) => stateAutoState(appearance) ?? []);
}

/**
 * How many vanilla states the project's blocks take from each `auto_state` group, by canonical id (aliases count for
 * their group): one per appearance, shared ids once. Unknown groups are left out (the export reports them).
 */
export function countAutoStates(project: Pick<Project, 'items'>): Map<string, number> {
  const counts = new Map<string, number>();
  const shared = new Set<string>();
  for (const item of Object.values(project.items) as Item[]) {
    const block = effectiveCraftEngineBlock(item);
    for (const auto of block ? blockAutoStates(block) : []) {
      const group = autoStateGroupOf(auto.group);
      if (!group) continue;
      if (auto.shared !== null) {
        const key = `${group.id}\u0000${auto.shared}`;
        if (shared.has(key)) continue;
        shared.add(key);
      }
      counts.set(group.id, (counts.get(group.id) ?? 0) + 1);
    }
  }
  return counts;
}

export interface AutoStateOverrun {
  group: string;
  used: number;
  capacity: number;
}

/**
 * The groups whose blocks need more states than the group has: a group's own blocks plus those of the groups it
 * contains share its states. CraftEngine's own packs and other packs on the server use states too, so this only
 * catches what the project alone cannot fit.
 */
export function autoStateOverruns(project: Pick<Project, 'items' | 'settings'>): AutoStateOverrun[] {
  const counts = countAutoStates(project);
  return CE_AUTO_STATE_GROUPS.flatMap((group) => {
    const used = [group.id, ...(group.includes ?? [])].reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
    const capacity = autoStateCapacity(group, project.settings.minecraftVersion);
    return used > capacity ? [{ group: group.id, used, capacity }] : [];
  });
}

const CUBE_FACES = ['down', 'up', 'north', 'south', 'west', 'east'];

/**
 * Parents CraftEngine generates a block model with, by the number of textures, with the slots in the order its
 * simplified block model readers fill them (CubeAll, CubeColumn, CubeBottomTop, Orientable, CubeFiveTextures, Cube).
 */
const PARENTS_BY_TEXTURE_COUNT: Array<{ parent: string; slots: string[] }> = [
  { parent: 'minecraft:block/cube_all', slots: ['all'] },
  { parent: 'minecraft:block/cube_column', slots: ['end', 'side'] },
  { parent: 'minecraft:block/cube_bottom_top', slots: ['bottom', 'side', 'top'] },
  { parent: 'minecraft:block/orientable', slots: ['bottom', 'front', 'side', 'top'] },
  { parent: 'minecraft:block/cube', slots: CUBE_FACES.slice(0, 5) },
  { parent: 'minecraft:block/cube', slots: CUBE_FACES },
];

/**
 * The texture slots of a generated model. The vanilla cube has no particle texture, so the north face is used; with
 * five textures, east takes the west texture (as CraftEngine does).
 */
function generatedTextures(slots: string[], textures: string[]): Record<string, string> {
  const result = Object.fromEntries(slots.map((slot, i) => [slot, textures[i]]));
  if (slots === PARENTS_BY_TEXTURE_COUNT[4].slots) result.east = result.west;
  if (slots.includes('north')) result.particle = result.north;
  return result;
}

/** A flat item model (item/generated …) without a shape of its own. */
const isFlatModel = (modelJson: JavaModelJson) => !modelJson.elements && isGeneratedItemParent(modelJson.parent ?? '');

/** The layer textures of a flat item model in layer order. */
function flatLayers(modelJson: JavaModelJson): string[] {
  return Object.entries(modelJson.textures ?? {})
    .filter(([key]) => /^layer\d+$/.test(key))
    .sort(([a], [b]) => Number(a.slice(5)) - Number(b.slice(5)))
    .map(([, texture]) => texture);
}

/**
 * The textures a block template is filled with: the layers of a flat model, or the textures a shaped model uses
 * (references to other slots like `#side` left out), each once.
 */
export function craftEngineBlockTextures(modelJson: JavaModelJson | null): string[] {
  if (!modelJson) return [];
  if (isFlatModel(modelJson)) return flatLayers(modelJson);
  return [...new Set(Object.values(modelJson.textures ?? {}).filter((texture) => !texture.startsWith('#')))];
}

/** The most textures a block generated from a flat item model uses. */
export const CE_BLOCK_MAX_TEXTURES = PARENTS_BY_TEXTURE_COUNT.length;

export interface CraftEngineBlockModel {
  /** The state's `model:` (null = the item has no model to show) */
  model: Record<string, unknown> | null;
  /** Textures of a flat model beyond CE_BLOCK_MAX_TEXTURES that the block leaves out */
  unusedTextures: number;
}

/**
 * The model of the block's state, from the item's main model:
 *  - a model with a shape of its own (a cube parent, elements, a Blockbench model) is used as it is;
 *  - a flat item model (item/generated …) has no block shape, so CraftEngine generates a cube from its layer textures:
 *    1 texture is cube_all, 2 are cube_column (end, side), 3 are cube_bottom_top (bottom, side, top), 4 are orientable
 *    (bottom, front, side, top), 5 and 6 a cube with one texture per face (down, up, north, south, west, east). The
 *    generated model goes to `<main model>-block`, next to the main model.
 */
export function craftEngineBlockModel(modelKey: string | null, modelJson: JavaModelJson | null, plant = false): CraftEngineBlockModel {
  if (!modelKey || !modelJson) return { model: null, unusedTextures: 0 };
  if (!isFlatModel(modelJson)) return { model: { path: modelKey }, unusedTextures: 0 };
  const layers = flatLayers(modelJson);
  if (layers.length === 0) return { model: { path: modelKey }, unusedTextures: 0 };
  // A plant (crop, sapling) shows its first texture on two crossed planes, as vanilla plants do
  if (plant) {
    return {
      model: { path: `${modelKey}-block`, generation: { parent: 'minecraft:block/cross', textures: { cross: layers[0] } } },
      unusedTextures: 0,
    };
  }
  const used = layers.slice(0, CE_BLOCK_MAX_TEXTURES);
  const { parent, slots } = PARENTS_BY_TEXTURE_COUNT[used.length - 1];
  const textures = generatedTextures(slots, used);
  return {
    model: { path: `${modelKey}-block`, generation: { parent, textures } },
    unusedTextures: layers.length - used.length,
  };
}
